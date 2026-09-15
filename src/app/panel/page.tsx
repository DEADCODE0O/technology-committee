import Link from "next/link";
import {
  Sparkles, Trophy, Medal, CalendarDays, CheckCircle2, XCircle,
  Star, ArrowLeft, Zap, History, Palette, ClipboardList, Presentation,
  Radio, Compass, Users, Flame, TrendingUp, Send,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { getStudentRank } from "@/lib/platform";
import { findTargetedStudentIds, parseTarget } from "@/lib/targeting";
import {
  levelFromPoints, nextLevelProgress, TALENT_STATUS_LABELS, talentLabel,
  REGISTRATION_STATUS_LABELS, ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS,
} from "@/lib/constants";
import { makeDataKey } from "@/lib/validation";
import { StudentShell } from "@/components/student/student-shell";
import { NotificationBanner } from "@/components/platform/notification-banner";
import { Countdown } from "@/components/platform/countdown";
import { getTalentsSectionVisible } from "@/lib/platform";
import { getStudentNotifications } from "@/lib/notifications";
import { getSessionState, decideRegistration } from "@/lib/activities";
import { getStudentProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

function fmtShort(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const profile = user.profile!;

  const [progress, rank, myRegs, myBadges, myTalents, notifications, talentsSectionVisible] = await Promise.all([
    getStudentProgress(user.id),
    getStudentRank(user.id),
    db.registration.findMany({
      where: { userId: user.id, status: { in: ["REGISTERED", "WAITLISTED"] } },
      include: {
        session: { include: { activity: { include: { program: true } } } },
        attendance: true,
      },
      orderBy: { session: { startsAt: "asc" } },
    }),
    db.studentBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
    db.talent.findMany({ where: { userId: user.id } }),
    getStudentNotifications(user),
    getTalentsSectionVisible(),
  ]);

  // ── مهامي المفتوحة (بانتظار التسليم أو أُعيدت للتعديل) ──
  const membership = await db.teamMember.findFirst({ where: { userId: user.id } });
  const myAssignments = await db.taskAssignment.findMany({
    where: {
      OR: [{ userId: user.id }, ...(membership ? [{ teamId: membership.teamId }] : [])],
      task: { status: "PUBLISHED" },
    },
    include: {
      task: { select: { id: true, title: true, dueAt: true, xpReward: true } },
      submission: { select: { id: true, status: true } },
    },
    orderBy: { task: { dueAt: "asc" } },
    take: 5,
  });
  const openTasks = myAssignments.filter((a) => !a.submission || a.submission.status === "RETURNED");

  // ── أحدث منشورات المجتمع (العامة فقط كتيزر) ──
  const latestPosts = await db.communityPost.findMany({
    where: { status: "PUBLISHED", target: null },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: { id: true, type: true, title: true, createdAt: true },
  });

  // طلبات البيانات المفتوحة الموجهة لهذا الطالب + حالة إجابته
  const openRequests = await db.dataRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  const requestIds = openRequests.map((r) => r.id);
  const [myResponses, myStudentData] = await Promise.all([
    db.dataResponse.findMany({
      where: { userId: user.id, requestId: { in: requestIds } },
      select: { requestId: true },
    }),
    db.studentData.findMany({ where: { userId: user.id }, select: { key: true, value: true } }),
  ]);
  const myResponseMap = new Map(myResponses.map((r) => [r.requestId, true]));
  const savedKeys = new Set(myStudentData.map((d) => d.key));

  const requestDataComplete = (r: typeof openRequests[number]) => {
    if (myResponseMap.has(r.id)) return true;
    try {
      const fields = JSON.parse(r.fields) as Array<{ id: string; key?: string; label: string }>;
      if (fields.length === 0) return true;
      return fields.every((f) => savedKeys.has(f.key || makeDataKey(f.label)));
    } catch {
      return false;
    }
  };
  const targetedRequests = (
    await Promise.all(
      openRequests.map(async (r) => ({
        request: r,
        isTargeted: (await findTargetedStudentIds(parseTarget(r.target))).includes(user.id),
      }))
    )
  ).filter((x) => x.isTargeted);
  const now = new Date();
  const visibleRequests = targetedRequests
    .map((x) => ({
      id: x.request.id,
      title: x.request.title,
      deadline: x.request.deadline,
      answered: requestDataComplete(x.request),
    }))
    .filter((r) => !r.deadline || new Date(r.deadline) >= now);
  const pendingRequests = visibleRequests.filter((r) => !r.answered);

  // تقسيم التسجيلات حسب حالة الجلسة (كل تسجيل لجلسة محددة)
  const regsWithMeta = myRegs.map((r) => {
    const state = getSessionState(r.session, now);
    const attended = r.attendance.some((a) => a.present);
    return { ...r, state, attended };
  });
  const liveRegs = regsWithMeta.filter((r) => r.state === "ONGOING");
  const upcomingRegs = regsWithMeta.filter((r) => r.state === "UPCOMING");
  const pastRegs = regsWithMeta.filter((r) => r.state === "COMPLETED");
  const nextReg = upcomingRegs[0] ?? null;

  // «اكتشف»: جلسات مفتوح تسجيلها الآن (أقرب إغلاقًا أولًا)
  const discoverSessions = await db.session.findMany({
    where: {
      status: "SCHEDULED",
      activity: { publish: "PUBLISHED" },
      startsAt: { gt: now },
    },
    include: {
      activity: { select: { id: true, title: true, type: true, image: true, level: true } },
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
    orderBy: { registrationClosesAt: "asc" },
    take: 12,
  });
  const discoverable = discoverSessions
    .filter((s) => !myRegs.some((r) => r.sessionId === s.id))
    .map((s) => {
      const decision = decideRegistration(
        {
          session: {
            registrationOpensAt: s.registrationOpensAt,
            registrationClosesAt: s.registrationClosesAt,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            closingMode: s.closingMode,
            registrationOpen: s.registrationOpen,
          },
          registeredCount: s._count.registrations,
          seats: s.seats,
        },
        now
      );
      return { session: s, open: decision.open };
    })
    .filter((x) => x.open)
    .slice(0, 4);

  const firstName = profile.fullName.split(" ")[0];

  return (
    <StudentShell
      user={{ name: profile.fullName, email: user.email }}
      active="dashboard"
      pendingCount={pendingRequests.length}
      unreadCount={notifications.unreadCount}
      openTaskCount={openTasks.length}
    >
      <div className="space-y-6">
        {/* ── بنر الإشعار المهم المثبت ── */}
        {notifications.pinnedBanner && (
          <div>
            <NotificationBanner notification={notifications.pinnedBanner} />
          </div>
        )}

        {/* ── الترحيب + التقدم في سطر واحد ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-surface p-6 sm:p-7">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-50" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-zinc-500">مرحبًا {firstName} 👋</p>
              <h1 className="mt-1 text-2xl font-extrabold text-zinc-50">دي منصتك — اكتشف · شارك · أنجز</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-extrabold">
                <span className="flex items-center gap-1.5 rounded-xl bg-gold/[0.1] px-3 py-1.5 text-gold">
                  <Trophy className="h-3.5 w-3.5" /> المستوى {progress.level} · {progress.xp} XP
                </span>
                {progress.streakWeeks > 0 && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-3 py-1.5 text-orange-300">
                    <Flame className="h-3.5 w-3.5" /> {progress.streakWeeks} أسبوعًا متتاليًا
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> #{rank}
                </span>
                {progress.seasonName && (
                  <span className="rounded-xl bg-white/[0.03] px-3 py-1.5 text-zinc-500">{progress.seasonName}</span>
                )}
              </div>
            </div>
            <Link href="/leaderboard" className="inline-flex h-11 items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] px-5 text-sm font-extrabold text-gold-light transition-colors hover:bg-gold/[0.12]">
              رحلتي الكاملة
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── NOW: الجاري الآن ── */}
        {liveRegs.length > 0 && (
          <section aria-labelledby="now-section">
            <h2 id="now-section" className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-red-300">
              <Radio className="h-4 w-4 animate-pulse" /> جارٍ الآن — الحضور متاح
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {liveRegs.map((r) => (
                <Link
                  key={r.id}
                  href={`/sessions/${r.session.id}`}
                  className="group rounded-2xl border border-red-400/30 bg-red-500/[0.05] p-4 transition-colors hover:border-red-400/50"
                >
                  <p className="text-sm font-extrabold text-zinc-100">{r.session.activity.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {r.session.title} · {r.session.location ?? "المكان يُعلن قريبًا"}
                  </p>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-red-300">
                    <Radio className="h-3.5 w-3.5 animate-pulse" /> ادخل وسجّل حضورك
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CONTINUE: أكمل من حيث توقفت ── */}
        {(nextReg || pendingRequests.length > 0 || openTasks.length > 0) && (
          <section className="rounded-3xl border border-gold/25 bg-gold/[0.05] p-5 sm:p-6" aria-labelledby="continue">
            <h2 id="continue" className="mb-4 flex items-center gap-2 text-base font-extrabold text-gold-light">
              <Zap className="h-5 w-5" />
              أكمل من حيث توقفت
            </h2>
            <div className="space-y-3">
              {openTasks.slice(0, 2).map((a) => {
                const overdue = a.task.dueAt ? now > a.task.dueAt : false;
                return (
                  <Link
                    key={a.id}
                    href={`/tasks/${a.task.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4 transition-colors hover:border-gold/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-100">
                        <ClipboardList className="me-1.5 inline h-4 w-4 text-gold" />
                        {a.task.title}
                      </p>
                      {a.task.dueAt && (
                        <p className={`mt-1 text-xs ${overdue ? "text-red-300" : "text-zinc-400"}`}>
                          {overdue ? "تجاوزت الموعد — سلّم فورًا" : `آخر موعد ${fmtShort(a.task.dueAt)}`}
                        </p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-light to-gold px-3 py-1.5 text-[11px] font-extrabold text-night">
                      <Send className="h-3 w-3" /> سلّم الآن
                    </span>
                  </Link>
                );
              })}
              {nextReg && (
                <Link
                  href={`/sessions/${nextReg.session.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4 transition-colors hover:border-gold/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-100">
                      <Presentation className="me-1.5 inline h-4 w-4 text-gold" />
                      {nextReg.session.activity.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {nextReg.session.title} · {nextReg.session.location ?? "المكان يُعلن قريبًا"}
                    </p>
                  </div>
                  <Countdown to={nextReg.session.startsAt.toISOString()} prefix="تبدأ بعد" className="text-xs font-extrabold text-gold-light" />
                </Link>
              )}
              {pendingRequests.slice(0, 2).map((r) => (
                <Link
                  key={r.id}
                  href={`/panel/requests/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4 transition-colors hover:border-gold/50"
                >
                  <p className="min-w-0 truncate text-sm font-bold text-zinc-100">
                    <ClipboardList className="me-1.5 inline h-4 w-4 text-gold" />
                    {r.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-gradient-to-b from-gold-light to-gold px-3 py-1.5 text-[11px] font-extrabold text-night">
                    أجب الآن
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── DISCOVER: مفتوح للتسجيل الآن ── */}
        <section aria-labelledby="discover-section">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="discover-section" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gold">
              <Compass className="h-4 w-4" /> اكتشف — التسجيل مفتوح
            </h2>
            <Link href="/activities" className="text-xs font-extrabold text-zinc-400 hover:text-gold-light">الكل ←</Link>
          </div>
          {discoverable.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-surface px-5 py-6 text-center text-sm text-zinc-500">
              مفيش تسجيلات مفتوحة حاليًا — تابعنا، الأنشطة الجديدة بتُعلن أولًا بأول
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {discoverable.map(({ session: s }) => {
                const seatsLeft = s.seats - s._count.registrations;
                const closingSoon = s.registrationClosesAt
                  ? (s.registrationClosesAt.getTime() - now.getTime()) / 3600000 < 24
                  : false;
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="group rounded-2xl border border-white/[0.07] bg-surface p-4 transition-all hover:border-gold/30 hover:bg-gold/[0.03]"
                  >
                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-zinc-500">
                      <span>{ACTIVITY_TYPE_ICONS[s.activity.type]}</span>
                      {ACTIVITY_TYPE_LABELS[s.activity.type]}
                    </p>
                    <p className="mt-1.5 truncate text-sm font-extrabold text-zinc-100 group-hover:text-gold-light">
                      {s.activity.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{fmtShort(s.startsAt)} · {s.location ?? "المكان قريبًا"}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                        seatsLeft <= 5 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}>
                        {seatsLeft <= 5 ? "🔥" : "🟢"} {seatsLeft > 0 ? `${seatsLeft} مقاعد متاحة` : "قائمة انتظار"}
                      </span>
                      {closingSoon && s.registrationClosesAt && (
                        <Countdown to={s.registrationClosesAt.toISOString()} prefix="يقفل بعد" compact tone="success" autoUrgent={true} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── COMMUNITY: أحدث اللحظات ── */}
        {latestPosts.length > 0 && (
          <section aria-labelledby="community-teaser">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="community-teaser" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
                <Users className="h-4 w-4 text-gold/70" /> من المجتمع
              </h2>
              <Link href="/community" className="text-xs font-extrabold text-zinc-400 hover:text-gold-light">تابع ←</Link>
            </div>
            <div className="space-y-2.5">
              {latestPosts.map((p) => (
                <Link
                  key={p.id}
                  href="/community"
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface px-4 py-3.5 transition-colors hover:border-gold/25"
                >
                  <span className="text-lg">{p.type === "ACHIEVEMENT" ? "🏆" : p.type === "ANNOUNCEMENT" ? "📢" : p.type === "HIGHLIGHT" ? "✨" : "📰"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-200">{p.title}</span>
                  <span className="shrink-0 text-[11px] text-zinc-600">{fmtShort(p.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── PROGRESS مختصر: رحلتك ── */}
        <section aria-labelledby="progress-section" className="rounded-3xl border border-white/[0.06] bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 id="progress-section" className="flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <Trophy className="h-5 w-5 text-gold/80" /> رحلتك هذا الموسم
            </h2>
            <Link href="/profile" className="text-xs font-extrabold text-zinc-400 hover:text-gold-light">ملفي الكامل ←</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CheckCircle2, label: "حضور", value: progress.attendedCount, tone: "text-emerald-300" },
              { icon: Send, label: "مهام مُنجزة", value: progress.tasksCompleted, tone: "text-gold" },
              { icon: Sparkles, label: "إنجازات", value: progress.questsCompleted, tone: "text-zinc-200" },
              { icon: Medal, label: "شارات", value: myBadges.length, tone: "text-gold-light" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.03] p-3.5 text-center">
                <s.icon className={`mx-auto h-5 w-5 ${s.tone}`} />
                <p className="mt-1.5 text-xl font-extrabold text-zinc-100">{s.value}</p>
                <p className="text-[11px] font-bold text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
          {progress.nextLevel && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-400">المستوى {progress.level}</span>
                <span className="text-zinc-500">المستوى {progress.nextLevel}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-gold-light to-gold transition-all"
                  style={{ width: `${progress.progressToNext}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── طلبات اللجنة ── */}
        {visibleRequests.length > 0 && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5 sm:p-6" aria-labelledby="my-requests">
            <h2 id="my-requests" className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <ClipboardList className="h-5 w-5 text-gold/80" />
              طلبات اللجنة
            </h2>
            <ul className="space-y-2.5">
              {visibleRequests.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/panel/requests/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-gold/25"
                  >
                    <span className="min-w-0 truncate text-sm font-bold text-zinc-200">{r.title}</span>
                    {r.answered ? (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> تم التسليم
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-gold/90 px-3 py-1 text-[11px] font-extrabold text-night">أجب الآن</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── تسجيلاتي القادمة ── */}
        {upcomingRegs.length > 1 && (
          <section aria-labelledby="upcoming-section">
            <h2 id="upcoming-section" className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
              <CalendarDays className="h-4 w-4 text-gold/70" /> أنشطتي القادمة
            </h2>
            <ul className="space-y-2.5">
              {upcomingRegs.slice(1, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/sessions/${r.session.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-surface px-4 py-3.5 transition-colors hover:border-gold/25"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-200">{r.session.activity.title} — {r.session.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{fmtShort(r.session.startsAt)} · {REGISTRATION_STATUS_LABELS[r.status]}</p>
                    </div>
                    {r.status === "WAITLISTED" && (
                      <span className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-extrabold text-amber-300">قائمة انتظار</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── الماضي والمواهب (مختصر) ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/profile"
            className="group rounded-2xl border border-white/[0.06] bg-surface p-4 transition-colors hover:border-gold/25"
          >
            <p className="flex items-center gap-2 text-sm font-extrabold text-zinc-200">
              <History className="h-4 w-4 text-gold/70" /> سجل مشاركاتي
            </p>
            <p className="mt-1.5 text-xs leading-6 text-zinc-500">
              {pastRegs.length > 0
                ? `${attendedCount(pastRegs)} حضورًا من ${pastRegs.length} نشاطًا`
                : "تاريخك سيبني نفسه مع أول نشاط"}
            </p>
          </Link>
          {talentsSectionVisible && (
            <Link
              href="/talents"
              className="group rounded-2xl border border-white/[0.06] bg-surface p-4 transition-colors hover:border-gold/25"
            >
              <p className="flex items-center gap-2 text-sm font-extrabold text-zinc-200">
                <Palette className="h-4 w-4 text-gold/70" /> مواهب زميلائي
              </p>
              <p className="mt-1.5 text-xs leading-6 text-zinc-500">
                {myTalents.length > 0
                  ? `مواهبك: ${myTalents.map((t) => `${talentLabel(t.category, t.name, t.customName)} (${TALENT_STATUS_LABELS[t.status]})`).join(" · ")}`
                  : "اكتشف مواهب الطلاب المميزة"}
              </p>
            </Link>
          )}
        </div>
      </div>
    </StudentShell>
  );
}

function attendedCount(regs: { attended: boolean }[]): number {
  return regs.filter((r) => r.attended).length;
}

void Sparkles;
void Star;
void XCircle;
