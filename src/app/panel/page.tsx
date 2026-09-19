import Link from "next/link";
import {
  Sparkles, Trophy, Medal, CalendarDays, CheckCircle2, XCircle,
  Star, ArrowLeft, Zap, History, Palette, ClipboardList, Presentation,
  Radio, Compass, Users, Flame, TrendingUp, Send, MessageSquare, MessageCircle,
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
import { recordDailyActivity } from "@/lib/streak";
import { getSocialCounters } from "@/actions/messaging";
import { getStudentFeed } from "@/actions/student-posts";

export const dynamic = "force-dynamic";

function fmtShort(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const profile = user.profile ?? {
    id: "temp",
    fullName: user.displayName || user.email.split("@")[0] || "طالب",
    grade: "FIRST",
    section: "IS",
    gender: "MALE",
    phone: "",
    phoneVerified: false,
    studentCode: null,
    discoverySource: null,
    joinReasons: null,
  };

  const [
    streakData,
    progress,
    rank,
    myRegs,
    myBadges,
    myTalents,
    notifications,
    talentsSectionVisible,
    socialCounters,
    studentFeed,
  ] = await Promise.all([
    recordDailyActivity(user.id).catch(() => ({ currentStreak: 1, longestStreak: 1, isNewDay: false, bonusPointsEarned: 0 })),
    getStudentProgress(user.id).catch(() => ({ xp: 0, level: 1, nextLevel: 2, progressToNext: 0, seasonXp: 0, seasonName: null, streakWeeks: 0, attendedCount: 0, tasksCompleted: 0, questsCompleted: 0 })),
    getStudentRank(user.id).catch(() => 1),
    db.registration.findMany({
      where: { userId: user.id, status: { in: ["REGISTERED", "WAITLISTED"] } },
      include: {
        session: { include: { activity: { include: { program: true } } } },
        attendance: true,
      },
      orderBy: { session: { startsAt: "asc" } },
    }).catch(() => []),
    db.studentBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }).catch(() => []),
    db.talent.findMany({ where: { userId: user.id } }).catch(() => []),
    getStudentNotifications(user).catch(() => ({ notifications: [], unreadCount: 0, pinnedBanner: null, pinnedBanners: [], pendingImportant: 0 })),
    getTalentsSectionVisible().catch(() => true),
    getSocialCounters(user.id).catch(() => ({ unreadMessagesCount: 0, pendingFriendRequestsCount: 0, totalSocialAlerts: 0 })),
    getStudentFeed({ limit: 3 }).catch(() => []),
  ]);

  // ── مهامي المفتوحة (بانتظار التسليم أو أُعيدت للتعديل) ──
  const membership = await db.teamMember.findFirst({ where: { userId: user.id } }).catch(() => null);
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
  }).catch(() => []);
  const openTasks = myAssignments.filter((a) => !a.submission || a.submission.status === "RETURNED");

  // ── أحدث منشورات المجتمع (العامة فقط كتيزر) ──
  const latestPosts = await db.communityPost.findMany({
    where: { status: "PUBLISHED", target: null },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: { id: true, type: true, title: true, createdAt: true },
  }).catch(() => []);

  // طلبات البيانات المفتوحة الموجهة لهذا الطالب + حالة إجابته
  const openRequests = await db.dataRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  const requestIds = openRequests.map((r) => r.id);
  const [myResponses, myStudentData] = await Promise.all([
    db.dataResponse.findMany({
      where: { userId: user.id, requestId: { in: requestIds } },
      select: { requestId: true },
    }).catch(() => []),
    db.studentData.findMany({ where: { userId: user.id }, select: { key: true, value: true } }).catch(() => []),
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
        isTargeted: (await findTargetedStudentIds(parseTarget(r.target)).catch((): string[] => [])).includes(user.id),
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
  }).catch(() => []);
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

  const firstName = (profile.fullName || "يا بطل").trim().split(" ")[0] || "طالب";

  return (
    <StudentShell
      user={{
        name: user.displayName || profile.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
        level: progress.level,
      }}
      active="dashboard"
      pendingCount={pendingRequests.length}
      unreadCount={notifications.unreadCount}
      openTaskCount={openTasks.length}
      unreadMessagesCount={socialCounters.totalSocialAlerts}
    >
      <div className="space-y-6">
        {/* ── بنرات الإشعارات المهمة والترحيبية المثبتة ── */}
        {notifications.pinnedBanners && notifications.pinnedBanners.length > 0 ? (
          <div className="space-y-3">
            {notifications.pinnedBanners.map((banner) => (
              <NotificationBanner key={banner.id} notification={banner} />
            ))}
          </div>
        ) : notifications.pinnedBanner ? (
          <div>
            <NotificationBanner notification={notifications.pinnedBanner} />
          </div>
        ) : null}

        {/* ── الترحيب + التقدم في سطر واحد ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-surface p-6 sm:p-7">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-50" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-zinc-500">مرحبًا {firstName} 👋</p>
              <h1 className="mt-1 text-2xl font-extrabold text-zinc-50">دي منصتك — استكشف الورش · تواصل · شارك في المجتمع</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-extrabold">
                <span className="flex items-center gap-1.5 rounded-xl bg-gold/[0.1] px-3 py-1.5 text-gold">
                  <Trophy className="h-3.5 w-3.5" /> المستوى {progress.level} · {progress.xp} XP
                </span>
                {streakData.currentStreak > 0 ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 px-3 py-1.5 text-orange-400 font-black shadow-sm">
                    <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400 animate-pulse" /> {streakData.currentStreak} {streakData.currentStreak === 1 ? "يوم استمرارية" : "أيام متتالية"}
                  </span>
                ) : progress.streakWeeks > 0 ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-3 py-1.5 text-orange-300">
                    <Flame className="h-3.5 w-3.5" /> {progress.streakWeeks} أسبوعًا متتاليًا
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> #{rank}
                </span>
                {progress.seasonName && (
                  <span className="rounded-xl bg-white/[0.03] px-3 py-1.5 text-zinc-500">{progress.seasonName}</span>
                )}
              </div>
            </div>
            <Link href="/activities" className="inline-flex h-11 items-center gap-2 rounded-xl border border-gold/40 bg-gold px-5 text-sm font-extrabold text-night transition-transform hover:scale-105 shadow-md">
              <Compass className="h-4 w-4" />
              استكشف كل الورش والكورسات
            </Link>
          </div>
        </section>

        {/* ── 1. استكشف: الورش والكورسات المفتوحة للتسجيل الآن (في صلب الصفحة الرئيسية) ── */}
        <section aria-labelledby="discover-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="discover-section" className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <Compass className="h-5 w-5 text-gold animate-spin-slow" />
              الورش والكورسات المفتوحة للتسجيل
            </h2>
            <Link href="/activities" className="text-xs font-bold text-gold hover:underline">
              عرض كل الورش والمواعيد ←
            </Link>
          </div>

          {discoverable.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card/60 p-6 text-center space-y-2">
              <p className="text-sm font-bold text-foreground">لا توجد ورش جديدة قيد التسجيل في هذه اللحظة</p>
              <p className="text-xs text-muted-foreground">تُعلن الورش والكورسات الجديدة تباعًا — يمكنك تصفح سجل الورش السابقة أو مراجعة برامج اللجنة.</p>
              <div className="pt-2">
                <Link href="/activities" className="inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/20">
                  دليل الأنشطة والورش الكامل
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {discoverable.map(({ session: s }) => {
                const seatsLeft = s.seats - s._count.registrations;
                const closingSoon = s.registrationClosesAt
                  ? (s.registrationClosesAt.getTime() - now.getTime()) / 3600000 < 24
                  : false;
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="group flex flex-col justify-between rounded-3xl border border-border bg-card/80 p-5 transition-all hover:border-gold/50 hover:bg-gold/[0.04] shadow-sm hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                          <span>{ACTIVITY_TYPE_ICONS[s.activity.type]}</span>
                          {ACTIVITY_TYPE_LABELS[s.activity.type]}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          seatsLeft <= 5 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}>
                          {seatsLeft <= 5 ? "🔥" : "🟢"} {seatsLeft > 0 ? `${seatsLeft} مقاعد متاحة` : "قائمة انتظار"}
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm sm:text-base font-black text-foreground group-hover:text-gold transition-colors">
                        {s.activity.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.title} · {fmtShort(s.startsAt)} · {s.location ?? "المكان يُعلن قريبًا"}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      {closingSoon && s.registrationClosesAt ? (
                        <Countdown to={s.registrationClosesAt.toISOString()} prefix="يقفل بعد" compact tone="success" autoUrgent={true} />
                      ) : (
                        <span className="text-[11px] font-bold text-gold">التسجيل متاح الآن</span>
                      )}
                      <span className="text-xs font-black text-gold group-hover:translate-x-[-2px] transition-transform">
                        سجّل الآن ←
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 2. المنظومة الاجتماعية والدردشة والمجتمع التفاعلي ── */}
        <section className="space-y-3" aria-labelledby="social-hub">
          <div className="flex items-center justify-between">
            <h2 id="social-hub" className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <MessageSquare className="h-5 w-5 text-gold" />
              مجتمع وتواصل الطلاب
            </h2>
            <Link href="/community" className="text-xs font-bold text-gold hover:underline">
              دخول المجتمع الكامل ←
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/messages"
              className="group flex items-center justify-between rounded-3xl border border-border bg-card/70 p-4 transition-all hover:border-gold/50 hover:bg-gold/[0.04] shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-inner group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-6 w-6" />
                  {socialCounters.unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-white px-1 text-[9px] font-black animate-pulse shadow-sm">
                      {socialCounters.unreadMessagesCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-foreground">الرسائل والمحادثات</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    محادثات الزملاء وشاتات الفرق
                  </p>
                </div>
              </div>
              {socialCounters.pendingFriendRequestsCount > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-black">
                  {socialCounters.pendingFriendRequestsCount} طلب صداقة
                </span>
              )}
            </Link>

            <Link
              href="/community"
              className="group flex items-center justify-between rounded-3xl border border-border bg-card/70 p-4 transition-all hover:border-gold/50 hover:bg-gold/[0.04] shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-inner group-hover:scale-105 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-foreground">منشورات ومناقشات المجتمع</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    شارك أفكارك وتفاعل مع إعلانات الطلاب
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-2xl bg-gold/15 text-gold border border-gold/30 px-3 py-1 text-[11px] font-black group-hover:bg-gold group-hover:text-night transition-colors">
                أنشئ منشوراً
              </span>
            </Link>
          </div>

          {/* خلاصة سريعة لأحدث منشورات الطلاب مع التفاعل */}
          {studentFeed.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                <span>أحدث ما نُشر في المجتمع 💬</span>
                <Link href="/community" className="text-gold hover:underline">
                  تفاعل مع الجميع ←
                </Link>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {studentFeed.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community#post-${post.id}`}
                    className="group rounded-2xl border border-border bg-card/50 p-3.5 transition-all hover:border-gold/40 hover:bg-gold/[0.02]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-black">
                        {post.author.name[0] || "ط"}
                      </span>
                      <span className="truncate text-xs font-bold text-foreground">
                        {post.author.name}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {post.body}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>❤️ {post.reactionsSummary.total} تفاعل</span>
                      <span>💬 {post.comments.length} تعليق</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
