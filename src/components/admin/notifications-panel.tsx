"use client";

// ═══════════════════════════════════════════════════════════════
//  لوحة إدارة الإشعارات — إنشاء / تعديل / حذف في مكان واحد
//  الضغط على «تعديل» يفتح المُرسل محمّلًا ببيانات الإشعار
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, XCircle, Image as ImageIcon, Link2, Pin } from "lucide-react";
import { NotificationComposer, type ComposerInitial } from "@/components/admin/notification-composer";
import { getNotificationForEdit, deleteNotification } from "@/actions/notifications";
import { NOTIFICATION_TYPE_ICONS } from "@/lib/constants";
import { parseNotificationButtons } from "@/lib/links";

export type AdminNotificationItem = {
  id: string;
  type: string;
  pinned: boolean;
  title: string;
  body: string | null;
  buttons: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaNewTab: boolean;
  linkType: string | null;
  target: string;
  targetDesc: string; // محسوب على السيرفر (المكتبة server-only)
  expiresAt: string | null;
  createdAt: string;
  readCount: number;
};

export function NotificationsPanel({
  canManage,
  notifications,
  runs,
  driveAssets,
}: {
  canManage: boolean;
  notifications: AdminNotificationItem[];
  runs: { id: string; label: string }[];
  driveAssets: { id: string; title: string; url: string }[];
}) {
  const router = useRouter();
  // حالة التعديل: الإشعار الجاري تعديله + قيمه المحمّلة
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<ComposerInitial | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const startEdit = (id: string) => {
    setLoadingEdit(id);
    startDelete(async () => {
      try {
        const res = await getNotificationForEdit(id);
        if (res.ok && res.notification) {
          const t = res.notification.target as Record<string, unknown>;
          setEditInitial({
            type: res.notification.type,
            pinned: res.notification.pinned,
            title: res.notification.title,
            body: res.notification.body ?? "",
            buttons: res.notification.buttons ?? [],
            imageUrl: res.notification.imageUrl ?? "",
            ctaLabel: res.notification.ctaLabel ?? "",
            ctaUrl: res.notification.ctaUrl ?? "",
            ctaNewTab: res.notification.ctaNewTab ?? true,
            expiresAt: res.notification.expiresAt ?? "",
            grades: Array.isArray(t.grades) ? (t.grades as string[]) : [],
            sections: Array.isArray(t.sections) ? (t.sections as string[]) : [],
            genders: Array.isArray(t.genders) ? (t.genders as string[]) : [],
            sessionId: (t.sessionId as string | null) ?? null,
            talent: (t.talent as string) ?? "ANY",
            attendance: (t.attendance as string) ?? "ANY",
          });
          setEditId(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          toast.error(res.error || "تعذر تحميل الإشعار");
        }
      } finally {
        setLoadingEdit(null);
      }
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditInitial(null);
  };

  const doDelete = (id: string, title: string) => {
    if (!confirm(`حذف الإشعار «${title}»؟ سيختفي من الطلاب نهائيًا.`)) return;
    startDelete(async () => {
      const res = await deleteNotification(id);
      if (res.ok) {
        toast.success("تم حذف الإشعار ✓");
        if (editId === id) cancelEdit();
        router.refresh();
      } else toast.error(res.error || "تعذر الحذف");
    });
  };

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* المُرسل / المُعدّل */}
      <div className="min-w-0">
        {canManage ? (
          <NotificationComposer
            key={editId ?? "new"}
            runs={runs}
            driveAssets={driveAssets}
            notificationId={editId ?? undefined}
            initial={editInitial ?? undefined}
            onDone={cancelEdit}
          />
        ) : (
          <p className="rounded-3xl border border-white/[0.07] bg-surface p-6 text-center text-sm text-zinc-500">صلاحية العرض فقط</p>
        )}
      </div>

      {/* السجل */}
      <div className="min-w-0 space-y-3">
        <h2 className="text-base font-extrabold text-zinc-100">الإشعارات المرسلة ({notifications.length})</h2>
        {notifications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center text-sm text-zinc-500">
            لم تُرسل إشعارات بعد
          </p>
        ) : (
          <ul className="space-y-2.5">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  editId === n.id
                    ? "border-sky-400/40 bg-sky-400/[0.06]"
                    : n.pinned || n.type === "IMPORTANT"
                      ? "border-gold/30 bg-gold/[0.05]"
                      : "border-white/[0.07] bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-bold text-zinc-100">
                    <span className="me-1.5">{NOTIFICATION_TYPE_ICONS[n.type] ?? "🔔"}</span>
                    {n.title}
                  </p>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => (editId === n.id ? cancelEdit() : startEdit(n.id))}
                        disabled={loadingEdit === n.id || deleting}
                        title={editId === n.id ? "إلغاء التعديل" : "تعديل"}
                        className={`rounded-lg border p-1.5 transition-colors disabled:opacity-50 ${
                          editId === n.id
                            ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                            : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-sky-300"
                        }`}
                      >
                        {loadingEdit === n.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : editId === n.id ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Pencil className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => doDelete(n.id, n.title)}
                        disabled={deleting || loadingEdit === n.id}
                        title="حذف"
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-zinc-500 transition-colors hover:text-red-300 disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
                {n.body && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-zinc-500">{n.body}</p>}
                {n.imageUrl && (
                  <img src={n.imageUrl} alt="" className="mt-2 h-16 w-28 rounded-lg border border-white/[0.08] object-cover" />
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-600">
                  <span>👥 {n.targetDesc}</span>
                  <span>👁 {n.readCount} قراءة</span>
                  {(() => {
                    const btns = parseNotificationButtons(n.buttons, n);
                    return btns.length > 0 ? (
                      <span className="text-gold/70">
                        <Link2 className="me-0.5 inline h-3 w-3" />
                        {btns.map((b) => b.label).join(" · ")}
                      </span>
                    ) : null;
                  })()}
                  {n.imageUrl && <span className="text-gold/70"><ImageIcon className="me-0.5 inline h-3 w-3" /> صورة</span>}
                  {n.pinned && <span className="text-gold-light"><Pin className="me-0.5 inline h-3 w-3" /> مثبت</span>}
                  {n.expiresAt && <span title="ينتهي">⏳ {fmtDate(n.expiresAt)}</span>}
                  <span>{fmtDate(n.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/drive" className="block rounded-2xl border border-gold/20 bg-gold/[0.05] p-4 text-center text-xs font-bold text-gold-light hover:bg-gold/[0.1]">
          📁 مكتبة روابط جوجل درايف — أضف روابط تستخدمها في الإشعارات ←
        </Link>
      </div>
    </div>
  );
}
