"use client";

// ═══════════════════════════════════════════════════════════════
//  لوحة الحضور — لجلسة واحدة (محاضرة/موعد ورشة)
//  تحديد يدوي (حضر/غاب) + الجميع حاضر + QR خاص بالجلسة
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, QrCode, Users2, CheckCircle2, XCircle, Printer, RefreshCw, UserX } from "lucide-react";
import { setAttendance, markAllPresent, markRestAbsent } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GRADE_LABELS } from "@/lib/constants";

export type AttendanceRowData = {
  registrationId: string;
  fullName: string;
  grade: string | null;
  source: string;
  present: boolean | null;
  method: string | null;
};

export function AttendanceBoard({
  sessionId,
  sessionTitle,
  sessionToken,
  sessionState,
  rows,
  canManage,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionToken: string;
  sessionState: "UPCOMING" | "ONGOING" | "COMPLETED";
  rows: AttendanceRowData[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsManualRefreshing(true);
    router.refresh();
    setTimeout(() => setIsManualRefreshing(false), 800);
  };

  // رابط الحضور العام — يُبنى من نافذة المتصفح نفسها لأن خلف البروكسي
  // ترويسات الخادم الداخلية لا تعكس العنوان العام الذي يفتحه الطلاب
  const publicOrigin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => null
  );
  const publicCheckinUrl = publicOrigin ? `${publicOrigin}/checkin/${sessionToken}` : null;

  // تحديث دوري (معطّل افتراضياً لحفظ Egress، ولا يعمل إذا كانت الصفحة في الخلفية)
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      router.refresh();
    }, 20000);
    return () => clearInterval(t);
  }, [autoRefresh, router]);

  const presentCount = rows.filter((r) => r.present === true).length;
  const absentCount = rows.filter((r) => r.present === false).length;
  const pendingCount = rows.filter((r) => r.present === null).length;

  const mark = (row: AttendanceRowData, present: boolean) => {
    setBusyId(row.registrationId);
    setAttendance(row.registrationId, present)
      .then((res) => {
        if (res.ok) {
          toast.success(`${row.fullName}: ${present ? "حاضر ✓" : "غائب"}`);
          router.refresh();
        } else toast.error(res.error || "تعذر التحديد");
      })
      .finally(() => setBusyId(null));
  };

  return (
    <div className="space-y-4">
      {/* ── كود QR الخاص بالجلسة ── */}
      {publicCheckinUrl && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/20 bg-surface p-4">
          <div className="rounded-xl bg-white p-2">
            <img src={`/api/qr?data=${encodeURIComponent(publicCheckinUrl)}&size=180`} alt={`QR — ${sessionTitle}`} width={180} height={180} className="h-auto w-[150px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-gold-light">
              <QrCode className="h-4 w-4" /> كود حضور «{sessionTitle}»
            </p>
            <p className="mt-1 text-xs text-zinc-500">اعرضه للطلاب عند الدخول — مسحه يسجل حضورهم تلقائيًا ويضيف نقاطهم</p>
            <p className="mt-2 break-all rounded-lg bg-white/[0.03] px-2 py-1.5 text-[10px] text-zinc-500" dir="ltr">{publicCheckinUrl}</p>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="mt-2 rounded-lg border-white/15 text-xs text-zinc-300">
              <Printer className="h-3.5 w-3.5" /> طباعة
            </Button>
          </div>
        </div>
      )}

      {/* ── الإحصائيات + التحديث التلقائي ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-center">
            <p className="text-xl font-extrabold text-gold-light">{presentCount}</p>
            <p className="text-[11px] font-bold text-zinc-400">حاضر</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-center">
            <p className="text-xl font-extrabold text-red-300/80">{absentCount}</p>
            <p className="text-[11px] font-bold text-zinc-400">غائب</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center">
            <p className="text-xl font-extrabold text-zinc-300">{pendingCount}</p>
            <p className="text-[11px] font-bold text-zinc-400">لم يُحدد</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="h-8 rounded-lg border-white/10 text-xs text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ml-1 ${isManualRefreshing ? "animate-spin text-gold" : ""}`} />
            تحديث القائمة
          </Button>
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer">
            <RefreshCw className={`h-3 w-3 ${autoRefresh ? "animate-spin text-gold" : ""}`} />
            تلقائي (20ث)
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </label>
        </div>
      </div>

      {canManage && rows.length > 0 && sessionState !== "UPCOMING" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            onClick={() => {
              if (!confirm(`تحديد الجميع المسجلين كحاضرين في «${sessionTitle}»؟ النقاط هتتضاف تلقائيًا لمن لم تُمنح له.`)) return;
              startTransition(async () => {
                const res = await markAllPresent(sessionId);
                if (res.ok) { toast.success("تم تحديد حضور الجميع"); router.refresh(); }
                else toast.error(res.error || "تعذر التحديد");
              });
            }}
            disabled={pending}
            variant="outline"
            className="h-11 w-full rounded-xl border-gold/40 bg-gold/[0.08] text-sm font-extrabold text-gold-light hover:bg-gold/[0.15]"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
            تحديد الجميع كحاضرين
          </Button>

          <Button
            onClick={() => {
              if (!confirm(`هل أنت متأكد من تسجيل الباقي (${pendingCount} طالبًا) كغائبين؟\n\n✓ لن يتم المساس بالطلاب الذين سجلوا حضورهم بالباركود أو يدوياً.\n✓ سيتم إرسال إنذار غياب وتطبيق قواعد الالتزام على الغائبين.`)) return;
              startTransition(async () => {
                const res = await markRestAbsent(sessionId);
                if (res.ok) {
                  toast.success(`تم تسجيل ${res.count ?? 0} طالبًا كغائبين بنجاح دون المساس بالحاضرين`);
                  router.refresh();
                } else toast.error(res.error || "تعذر تسجيل الغياب");
              });
            }}
            disabled={pending || pendingCount === 0}
            variant="outline"
            className="h-11 w-full rounded-xl border-red-500/30 bg-red-500/[0.06] text-sm font-extrabold text-red-300 hover:bg-red-500/[0.12] disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            تسجيل الباقي غياب ({pendingCount})
          </Button>
        </div>
      )}

      {sessionState === "UPCOMING" && (
        <p className="rounded-2xl border border-gold/15 bg-gold/[0.03] px-4 py-3 text-center text-xs text-zinc-400">
          الحضور يُفتح عند بداية الجلسة أو بعدها — الآن يمكنك تجهيز الأسئلة والكشف
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center text-sm text-zinc-500">
          مفيش مسجلين في هذه الجلسة لسه
        </p>
      ) : (
        <ul className="max-h-[560px] space-y-2 overflow-y-auto pl-1" style={{ scrollbarWidth: "thin" }}>
          {rows.map((r) => (
            <li
              key={r.registrationId}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                r.present === true
                  ? "border-gold/30 bg-gold/[0.06]"
                  : r.present === false
                    ? "border-red-500/15 bg-red-500/[0.03]"
                    : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{r.fullName}</p>
                <p className="text-[11px] text-zinc-500">
                  {GRADE_LABELS[r.grade ?? ""] ?? "—"}
                  {r.present === true && r.method === "QR" && <span className="ms-1.5 text-gold/70">· حضور ذاتي QR</span>}
                </p>
              </div>

              {busyId === r.registrationId ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-gold" />
              ) : r.present === true ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.12] px-3.5 py-1.5 text-xs font-extrabold text-gold-light">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    حضر
                  </span>
                  {canManage && (
                    <button onClick={() => mark(r, false)} title="تراجع — تحديد غائب"
                      className="rounded-full border border-red-500/20 bg-red-500/[0.04] p-2 text-red-300/80 transition-colors hover:bg-red-500/10">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : r.present === false ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/[0.06] px-3.5 py-1.5 text-xs font-extrabold text-red-300">
                    <XCircle className="h-3.5 w-3.5" />
                    غائب
                  </span>
                  {canManage && (
                    <button onClick={() => mark(r, true)} title="تحديد حاضر"
                      className="rounded-full border border-gold/25 bg-gold/[0.06] p-2 text-gold-light transition-colors hover:bg-gold/[0.15]">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : canManage ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => mark(r, true)}
                    className="rounded-full border border-gold/30 bg-gold/[0.08] px-3.5 py-1.5 text-xs font-extrabold text-gold-light transition-colors hover:bg-gold/[0.16]">
                    حضر
                  </button>
                  <button onClick={() => mark(r, false)}
                    className="rounded-full border border-red-500/20 bg-red-500/[0.04] px-3.5 py-1.5 text-xs font-extrabold text-red-300/90 transition-colors hover:bg-red-500/10">
                    غاب
                  </button>
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-zinc-500">لم يُحدد</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
