import Link from "next/link";
import {
  Users, FolderKanban, Clock, CheckCircle2, Zap, TrendingUp, ArrowLeft,
  CalendarDays, Sparkles, Hourglass,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  لوحة تحكم الإدارة — نظرة شاملة سريعة
// ═══════════════════════════════════════════════════════════════

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    studentsCount,
    programsCount,
    activeSessions,
    upcomingSessions,
    todayCheckins,
    totalPointsAgg,
    recentAudit,
    upcomingList,
    weeklyRegistrations,
    newStudentsThisWeek,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.program.count({ where: { status: "ACTIVE" } }),
    db.session.count({ where: { startsAt: { lte: new Date() }, OR: [{ endsAt: { gte: new Date() } }, { endsAt: null }] } }),
    db.session.count({ where: { startsAt: { gte: new Date() } } }),
    db.attendance.count({ where: { present: true, markedAt: { gte: todayStart } } }),
    db.pointEvent.aggregate({ _sum: { points: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.session.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) }, activity: { publish: "PUBLISHED" } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        activity: { select: { title: true, type: true } },
        registrations: { where: { status: "REGISTERED" }, select: { id: true } },
      },
    }),
    db.registration.count({ where: { createdAt: { gte: weekAgo } } }),
    db.studentProfile.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* الترحيب */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-50">أهلاً بك في مركز التحكم</h1>
          <p className="mt-1 text-sm text-zinc-500">نظرة سريعة على نبض المنصة الآن</p>
        </div>
        <Link
          href="/admin/activities/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night transition-all hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.5)]"
        >
          + نشاط جديد
        </Link>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={<Users className="h-5 w-5" />} label="إجمالي الطلاب" value={studentsCount} href="/admin/students" />
        <StatCard icon={<Sparkles className="h-5 w-5" />} label="تنفيذات جارية" value={activeSessions} href="/admin/activities" gold />
        <StatCard icon={<Hourglass className="h-5 w-5" />} label="جلسات قادمة" value={upcomingSessions} href="/admin/activities" />
        <StatCard icon={<FolderKanban className="h-5 w-5" />} label="البرامج" value={programsCount} href="/admin/programs" />
        <StatCard icon={<Zap className="h-5 w-5" />} label="حضور اليوم" value={todayCheckins} />
      </div>

      {/* مؤشرات الأسبوع */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MiniTrend
          icon={<TrendingUp className="h-4 w-4" />}
          label="تسجيلات جديدة هذا الأسبوع"
          value={weeklyRegistrations}
          hint="طلاب حجزوا مقاعد في الورش"
        />
        <MiniTrend
          icon={<Users className="h-4 w-4" />}
          label="طلاب انضموا هذا الأسبوع"
          value={newStudentsThisWeek}
          hint="حسابات جديدة على المنصة"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* أقرب التنفيذات */}
        <section className="rounded-3xl border border-white/[0.06] bg-surface p-5" aria-labelledby="upcoming-admin">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="upcoming-admin" className="flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <CalendarDays className="h-5 w-5 text-gold/80" />
              أقرب الجلسات
            </h2>
            <Link href="/admin/activities" className="text-xs font-bold text-gold-light hover:text-gold">
              كل الأنشطة ←
            </Link>
          </div>
          {upcomingList.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-8 text-center text-sm text-zinc-500">
              مفيش جلسات مجدولة — ابدأ بإنشاء نشاط وإضافة محاضراته
            </p>
          ) : (
            <ul className="space-y-2.5">
              {upcomingList.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/sessions/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-gold/25"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-200">{r.activity.title} — {r.title}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(r.startsAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${
                      r.startsAt <= new Date()
                        ? "border border-gold/30 bg-gold/[0.1] text-gold-light"
                        : "border border-white/10 bg-white/[0.03] text-zinc-400"
                    }`}>
                      {r.startsAt <= new Date() ? "جارٍ" : "قادم"} · {r.registrations.length}/{r.seats}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* آخر العمليات */}
        <section className="rounded-3xl border border-white/[0.06] bg-surface p-5" aria-labelledby="audit-admin">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="audit-admin" className="flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <Clock className="h-5 w-5 text-gold/80" />
              آخر العمليات
            </h2>
            <Link href="/admin/audit" className="text-xs font-bold text-gold-light hover:text-gold">
              السجل الكامل ←
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-8 text-center text-sm text-zinc-500">
              السجل لسه فاضي — أول عملية هتظهر هنا
            </p>
          ) : (
            <ul className="space-y-2">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl bg-white/[0.02] px-3.5 py-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-6 text-zinc-300">{a.summary}</p>
                    <p className="text-[10px] text-zinc-600" dir="auto">
                      {a.actorEmail ?? "النظام"} · {timeAgoAr(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, href, gold,
}: { icon: React.ReactNode; label: string; value: number; href?: string; gold?: boolean }) {
  const inner = (
    <div className={`h-full rounded-3xl border p-5 transition-all ${gold ? "border-gold/25 bg-gold/[0.04]" : "border-white/[0.06] bg-surface"} ${href ? "hover:-translate-y-0.5 hover:border-gold/30" : ""}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${gold ? "border-gold/30 bg-gold/[0.1] text-gold" : "border-white/10 bg-white/[0.03] text-zinc-300"}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-zinc-50">{value.toLocaleString("ar-EG")}</p>
      <p className="mt-0.5 text-xs font-bold text-zinc-500">{label}</p>
      {href && <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-gold/70">التفاصيل <ArrowLeft className="h-3 w-3" /></p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function MiniTrend({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-white/[0.06] bg-surface px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08] text-gold">{icon}</span>
      <div>
        <p className="text-xl font-extrabold text-zinc-50">{value.toLocaleString("ar-EG")}</p>
        <p className="text-xs font-bold text-zinc-400">{label}</p>
        <p className="text-[10px] text-zinc-600">{hint}</p>
      </div>
    </div>
  );
}

function timeAgoAr(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "قبل لحظات";
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
  return `قبل ${Math.floor(diff / 86400)} يوم`;
}
