"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, Rocket, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveRun, deleteRun, setSessionRun } from "@/actions/activities";
import { CLOSING_MODES } from "@/lib/activities";

// ═══════════════════════════════════════════════════════════════
//  مدير التنفيذات / الدفعات — تكرار النشاط بمواعيد مستقلة
//  الكورس: دفعات (سبتمبر/يناير) · الورشة: تنفيذات متكررة
//  الجلسات تُربط بالتنفيذ من هنا — نافذة التنفيذ تُرثها جلساته
// ═══════════════════════════════════════════════════════════════

export type AdminRun = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  seats: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  closingMode: string;
  registrationOpen: boolean;
  allowGuests: boolean;
  sessions: { id: string; title: string; startsAt: string; runId: string | null; registeredCount: number }[];
};

export function RunManager({
  activityId,
  runs,
  unlinkedSessions,
  activityWord,
  canManage,
}: {
  activityId: string;
  runs: AdminRun[];
  unlinkedSessions: AdminRun["sessions"];
  activityWord: string; // «دفعة» أو «تنفيذ»
  canManage: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seats, setSeats] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [closingMode, setClosingMode] = useState("EITHER");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, reset?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg(`✓ ${success}`);
        reset?.();
        router.refresh();
      } else {
        setMsg(res.error ?? "تعذر التنفيذ");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-zinc-100">
            <Rocket className="h-5 w-5 text-gold/80" /> {activityWord === "دفعة" ? "الدفعات" : "التنفيذات"} ({runs.length})
          </h2>
          <p className="mt-1 text-xs leading-6 text-zinc-500">
            كل {activityWord} تتكرر بمواعيد ومشاركين مستقلين — {activityWord === "دفعة" ? "الجلسات (المحاضرات) تنظم تحت كل دفعة" : "كل تكرار للورشة تنفيذ منفصل بسجله"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating((c) => !c)} className="h-10 rounded-xl bg-gold text-xs font-extrabold text-night hover:bg-gold-light">
            <Plus className="h-4 w-4" /> {activityWord} جديدة
          </Button>
        )}
      </div>

      {msg && <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm font-bold text-gold-light">{msg}</p>}

      {/* إنشاء */}
      {creating && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => saveRun({
                activityId, title,
                description: description || undefined,
                seats: seats ? Number(seats) : null,
                registrationOpensAt: opensAt || null,
                registrationClosesAt: closesAt || null,
                closingMode,
              }),
              `أُنشئت ${activityWord} «${title}»`,
              () => { setTitle(""); setDescription(""); setSeats(""); setOpensAt(""); setClosesAt(""); setCreating(false); }
            );
          }}
          className="grid gap-4 rounded-3xl border border-gold/25 bg-surface p-5 md:grid-cols-2"
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-extrabold">عنوان {activityWord} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={activityWord === "دفعة" ? "دفعة سبتمبر 2026" : "التنفيذ الثاني"} className="h-11 rounded-xl" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-extrabold">وصف (اختياري)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="ملاحظات عن هذه الدفعة..." className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">سعة مقاعد {activityWord} (اختياري — إجمالي)</Label>
            <Input type="number" dir="ltr" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="—" className="h-11 rounded-xl text-start" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">وضع الإغلاق (للجلسات غير المحددة)</Label>
            <select value={closingMode} onChange={(e) => setClosingMode(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm">
              {CLOSING_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">فتح تسجيل {activityWord} من</Label>
            <Input type="datetime-local" dir="ltr" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-11 rounded-xl text-start" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">إلى</Label>
            <Input type="datetime-local" dir="ltr" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-11 rounded-xl text-start" />
          </div>
          <Button type="submit" disabled={pending} className="h-11 rounded-xl bg-gold text-sm font-extrabold text-night md:col-span-2 md:w-fit md:px-8">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إنشاء
          </Button>
          <p className="text-[11px] leading-5 text-zinc-500 md:col-span-2">
            نافذة التسجيل هنا تُرثها الجلسات التي لم تحدد نافذتها الخاصة — بعد الإنشاء اربط الجلسات بهذه {activityWord} من قائمتها
          </p>
        </form>
      )}

      {/* قائمة التنفيذات */}
      {runs.length === 0 && !creating && (
        <div className="rounded-2xl border border-white/[0.06] bg-surface px-5 py-8 text-center text-sm text-zinc-500">
          لا {activityWord === "دفعة" ? "دفعات" : "تنفيذات"} بعد — الجلسات الحالية تعمل مستقلة
        </div>
      )}

      <div className="space-y-3">
        {runs.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/[0.07] bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-zinc-100">
                  {r.title}
                  {!r.registrationOpen && <span className="ms-2 rounded-lg bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">التسجيل مغلق</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />
                    {r.registrationOpensAt
                      ? `${new Intl.DateTimeFormat("ar-EG", { dateStyle: "short" }).format(new Date(r.registrationOpensAt))} → ${r.registrationClosesAt ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "short" }).format(new Date(r.registrationClosesAt)) : "مفتوح"}`
                      : "بلا نافذة تسجيل"}
                  </span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.sessions.length} جلسات · {r.sessions.reduce((s, x) => s + x.registeredCount, 0)} تسجيلًا</span>
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1.5">
                  <Link href={`/admin/runs/${r.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 text-xs font-bold text-zinc-300 hover:border-gold/30">
                    إدارة {activityWord}
                  </Link>
                  <Button onClick={() => confirm(`حذف «${r.title}»؟ (مسموح فقط بلا تسجيلات)`) && run(() => deleteRun(r.id), "حُذفت")} variant="ghost" className="h-9 w-9 rounded-lg p-0 text-red-300" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* جلسات التنفيذ */}
            {r.sessions.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
                {r.sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
                    <Link href={`/admin/sessions/${s.id}`} className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-200 hover:text-gold-light">
                      {s.title} · {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(new Date(s.startsAt))}
                    </Link>
                    {canManage && (
                      <button onClick={() => run(() => setSessionRun(s.id, null), "فُصلت الجلسة عن التنفيذ")} className="shrink-0 text-[10px] font-bold text-zinc-600 hover:text-red-300" title="فصل عن التنفيذ">
                        فصل
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* جلسات غير مرتبطة */}
        {unlinkedSessions.length > 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.1] p-4">
            <p className="mb-2 text-[11px] font-extrabold text-zinc-400">جلسات غير مرتبطة بأي {activityWord}:</p>
            <ul className="space-y-1.5">
              {unlinkedSessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
                  <Link href={`/admin/sessions/${s.id}`} className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-300">
                    {s.title} · {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short" }).format(new Date(s.startsAt))}
                  </Link>
                  {canManage && runs.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && run(() => setSessionRun(s.id, e.target.value), "رُبطت الجلسة")}
                      className="h-8 shrink-0 rounded-lg border border-white/10 bg-white/[0.02] px-2 text-[11px]"
                    >
                      <option value="">ربط بـ...</option>
                      {runs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
