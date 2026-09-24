import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, ACTIVITY_PUBLISH_LABELS, ACTIVITY_LEVEL_LABELS } from "@/lib/constants";
import { getSessionState } from "@/lib/activities";
import { formatCairoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; program?: string }> | { type?: string; program?: string };
}) {
  const user = await requireAdmin();
  const canManage = canUser(user, MODULES.WORKSHOPS, "manage");
  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};

  const [activities, programs] = await Promise.all([
    db.activity.findMany({
      where: {
        ...(sp.type ? { type: sp.type } : {}),
        ...(sp.program ? { programId: sp.program } : {}),
      },
      include: {
        program: { select: { name: true, icon: true } },
        sessions: {
          orderBy: { startsAt: "desc" },
          include: { registrations: { where: { status: "REGISTERED" }, select: { id: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.program.findMany({ where: { status: "ACTIVE" }, orderBy: { order: "asc" }, select: { id: true, name: true, icon: true } }),
  ]);

  const now = new Date();
  const TABS = [
    { key: "", label: "الكل" },
    { key: "COURSE", label: "🎓 الكورسات" },
    { key: "WORKSHOP", label: "🛠️ الورش" },
    { key: "EVENT", label: "🎪 الفعاليات" },
    { key: "DRAFT", label: "✏️ المسودات" },
  ];
  const qs = (t: string, program?: string) => {
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    if (program) params.set("program", program);
    const s = params.toString();
    return s ? `/admin/activities?${s}` : "/admin/activities";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-50">الأنشطة</h1>
          <p className="mt-1 text-sm text-zinc-500">
            الكورس يضم محاضراته · الورشة لها موعدها — كل جلسة وحدة تسجيل مستقلة بمقاعدها وعدّها التنازلي
          </p>
        </div>
        {canManage && (
          <Link href="/admin/activities/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night transition-all hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.5)]">
            + نشاط جديد
          </Link>
        )}
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={qs(t.key, sp.program)}
            className={`inline-flex h-9 items-center rounded-xl px-4 text-xs font-extrabold transition-colors ${
              (sp.type ?? "") === t.key
                ? "border border-gold/40 bg-gold/[0.12] text-gold-light"
                : "border border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
            }`}>
            {t.label}
          </Link>
        ))}
        {programs.length > 0 && (
          <>
            <span className="mx-1 text-zinc-700">|</span>
            <Link href={qs(sp.type ?? "")} className={`inline-flex h-9 items-center rounded-xl px-3 text-xs font-bold ${!sp.program ? "border border-gold/40 bg-gold/[0.12] text-gold-light" : "border border-white/[0.07] text-zinc-400"}`}>
              كل البرامج
            </Link>
            {programs.map((p) => (
              <Link key={p.id} href={qs(sp.type ?? "", p.id)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${sp.program === p.id ? "border border-gold/40 bg-gold/[0.12] text-gold-light" : "border border-white/[0.07] text-zinc-400"}`}>
                {p.icon} {p.name}
              </Link>
            ))}
          </>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-14 text-center">
          <p className="text-sm font-bold text-zinc-300">لا توجد أنشطة في هذا التصنيف</p>
          {canManage && <p className="mt-1 text-xs text-zinc-500">ابدأ بإنشاء النشاط ثم أضف محاضراته أو مواعيده بنوافذ تسجيلها</p>}
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => {
            const totalRegs = a.sessions.reduce((s, x) => s + x.registrations.length, 0);
            const nextSession = a.sessions
              .filter((x) => getSessionState(x, now) !== "COMPLETED")
              .sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime())[0];
            const sessionLabel = a.type === "COURSE" ? (a.sessions.length === 1 ? "محاضرة" : "محاضرات") : (a.sessions.length === 1 ? "موعد" : "مواعيد");
            return (
              <li key={a.id} className="rounded-3xl border border-white/[0.07] bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg">{ACTIVITY_TYPE_ICONS[a.type]}</span>
                      <Link href={`/admin/activities/${a.id}`} className="text-base font-extrabold text-zinc-100 hover:text-gold-light">
                        {a.title}
                      </Link>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        a.publish === "PUBLISHED" ? "border border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300"
                        : a.publish === "DRAFT" ? "border border-white/10 bg-white/[0.03] text-zinc-400"
                        : "border border-white/10 bg-white/[0.02] text-zinc-500"
                      }`}>
                        {ACTIVITY_PUBLISH_LABELS[a.publish]?.split(" — ")[0] ?? a.publish}
                      </span>
                      {a.level && <span className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-bold text-zinc-500">{ACTIVITY_LEVEL_LABELS[a.level]}</span>}
                      {a.program && <span className="rounded-full border border-gold/20 bg-gold/[0.05] px-2.5 py-0.5 text-[10px] font-bold text-gold-light">{a.program.icon} {a.program.name}</span>}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500">{a.teaser ?? a.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                      <span>{a.sessions.length} {sessionLabel}</span>
                      <span>{totalRegs} تسجيلًا إجمالًا</span>
                      {nextSession && (
                        <span className="text-gold/80">
                          أقرب {a.type === "COURSE" ? "محاضرة" : "موعد"}: {nextSession.title} —{" "}
                          {formatCairoDate(nextSession.startsAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/admin/activities/${a.id}`}
                    className="inline-flex h-10 shrink-0 items-center rounded-xl border border-gold/30 bg-gold/[0.08] px-4 text-xs font-extrabold text-gold-light transition-colors hover:bg-gold/[0.16]">
                    إدارة
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
