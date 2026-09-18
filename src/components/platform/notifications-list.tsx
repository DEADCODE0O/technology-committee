"use client";

// ═══════════════════════════════════════════════════════════════
//  مركز الإشعارات — قائمة الطالب الكاملة
//  قسم «مهم» مثبت أولًا + كل الإشعارات + مقروء/غير مقروء + CTA
//  الإشعار يبقى هنا للأبد — الطالب يرجع للرابط أو الرسالة وقتما شاء
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck, Loader2, Pin, Image as ImageIcon, Link2 } from "lucide-react";
import { studentMarkAllRead, studentMarkNotificationRead } from "@/actions/notifications";
import { CtaLink } from "@/components/platform/cta-link";
import { NOTIFICATION_TYPE_ICONS, NOTIFICATION_TYPE_LABELS, LINK_TYPE_LABELS } from "@/lib/constants";
import { parseNotificationButtons, resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";

export type CenterNotification = {
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
  createdAt: string;
  readAt: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `قبل ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function Card({ n, onRead }: { n: CenterNotification; onRead: (id: string) => void }) {
  const isImportant = n.pinned || n.type === "IMPORTANT";
  const unread = !n.readAt;
  const btns = parseNotificationButtons(n.buttons, n);
  const imgSrc = n.imageUrl ? resolveImageSrc(n.imageUrl) : null;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border p-4 transition-colors",
        isImportant
          ? "border-gold/40 bg-gradient-to-l from-gold/[0.10] to-transparent"
          : unread
            ? "border-white/[0.10] bg-white/[0.03]"
            : "border-white/[0.06] bg-white/[0.015]",
      ].join(" ")}
    >
      {unread && !isImportant && <div className="absolute inset-y-0 right-0 w-1 bg-gold/70" />}
      {isImportant && <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-gold-light to-gold" />}

      <div className="flex items-start gap-3 pe-1.5">
        <span className="mt-0.5 shrink-0 text-xl leading-none">{NOTIFICATION_TYPE_ICONS[n.type] ?? "🔔"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-extrabold ${unread ? "text-zinc-100" : "text-zinc-300"}`}>{n.title}</p>
            {isImportant && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold-light">
                <Pin className="h-3 w-3" /> مهم
              </span>
            )}
            {n.type && n.type !== "INFO" && n.type !== "IMPORTANT" && NOTIFICATION_TYPE_LABELS[n.type] && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[10px] font-bold text-gold-light/90">
                {NOTIFICATION_TYPE_LABELS[n.type].split(" — ")[0].split(" / ")[0]}
              </span>
            )}
            {btns.length > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                <Link2 className="h-3 w-3" /> {btns.length} أزرار
              </span>
            )}
            {imgSrc && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                <ImageIcon className="h-3 w-3" /> صورة
              </span>
            )}
            {btns.length === 1 && btns[0].linkType && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                {LINK_TYPE_LABELS[btns[0].linkType] ?? "رابط"}
              </span>
            )}
          </div>

          {n.body && <p className="mt-1.5 text-[13px] leading-6 text-zinc-400">{n.body}</p>}

          {imgSrc && (
            <div className="mt-2.5 overflow-hidden rounded-xl border border-white/[0.08]">
              <SmartImg src={imgSrc} alt="" className="max-h-56 w-full object-cover" />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {btns.map((b, i) => (
              <CtaLink key={i} label={b.label} url={b.url} linkType={b.linkType} newTab={b.newTab} onClick={() => onRead(n.id)} />
            ))}
            <span className="text-[11px] text-zinc-500">{timeAgo(n.createdAt)}</span>
            {unread && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold-light">جديد</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsList({ notifications }: { notifications: CenterNotification[] }) {
  const [pending, startTransition] = useTransition();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const effective = notifications.map((n) => ({
    ...n,
    readAt: n.readAt || (readIds.has(n.id) ? new Date().toISOString() : null),
  }));

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((p) => new Set(p).add(id));
    void startTransition(async () => {
      await studentMarkNotificationRead(id);
    });
  };

  const markAll = () => {
    const unreadIds = effective.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setReadIds((p) => new Set([...p, ...unreadIds]));
    startTransition(async () => {
      const res = await studentMarkAllRead(unreadIds);
      if (res.ok) toast.success("تم تعليم الكل كمقروء");
      else toast.error(res.error || "تعذر التعليم");
    });
  };

  const important = effective.filter((n) => n.pinned || n.type === "IMPORTANT");
  const others = effective.filter((n) => !(n.pinned || n.type === "IMPORTANT"));
  const unreadCount = effective.filter((n) => !n.readAt).length;

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
        <p className="text-2xl">🔔</p>
        <p className="mt-2 text-sm font-bold text-zinc-300">لا توجد إشعارات حاليًا</p>
        <p className="mt-1 text-xs text-zinc-500">كل إعلانات اللجنة ومهامك وروابط الجروبات ستظهر هنا</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-400">
            {unreadCount} إشعار غير مقروء
          </p>
          <button
            onClick={markAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gold/25 bg-gold/[0.08] px-3 py-1.5 text-xs font-bold text-gold-light transition-colors hover:bg-gold/20"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            تعليم الكل كمقروء
          </button>
        </div>
      )}

      {important.length > 0 && (
        <section>
          <h3 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-gold-light">
            <Pin className="h-4 w-4" /> مهم — دائمًا هنا
          </h3>
          <div className="space-y-3">
            {important.map((n) => (
              <Card key={n.id} n={n} onRead={markRead} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-extrabold text-zinc-300">كل الإشعارات</h3>
          <div className="space-y-3">
            {others.map((n) => (
              <Card key={n.id} n={n} onRead={markRead} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
