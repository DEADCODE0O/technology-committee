import Link from "next/link";
import {
  GraduationCap, Crown, Trophy, CheckCircle2, Send, Flame,
  Sparkles, Swords, CalendarDays, Settings, Quote, MessageSquare,
  PenSquare, Heart, Shield, ArrowUpRight,
} from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentShell } from "@/components/student/student-shell";
import { getStudentProgress } from "@/lib/progress";
import { getStudentRank, getAvatarFramesVisible, getCharmHeartsVisible } from "@/lib/platform";
import { getStudentNotifications } from "@/lib/notifications";
import { getSocialCounters } from "@/actions/messaging";
import { UserCharmHeart } from "@/components/ui/user-charm-heart";
import { LeveledName } from "@/components/ui/leveled-name";
import { getAccountFlair } from "@/lib/account-style";
import { ProfileAvatarInteractive } from "@/components/profile/profile-avatar-interactive";
import { GRADE_LABELS, SECTION_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الملف الشخصي للطالب | مجتمع اللجنة التكنولوجية",
  description: "ملف الطالب الشخصي والإنجازات والتقدمات والمنشورات",
};

export default async function ProfilePage() {
  const user = await requireStudent();
  const profile = user.profile!;

  const [
    userRow,
    progress,
    rank,
    badges,
    rewards,
    questRows,
    teamMembership,
    attendedHistory,
    avatarFramesVisible,
    heartsVisible,
    notifications,
    socialCounters,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        avatarUrl: true,
        avatarFrameId: true,
        provider: true,
        displayName: true,
        username: true,
        bio: true,
      },
    }),
    getStudentProgress(user.id),
    getStudentRank(user.id),
    db.studentBadge.findMany({ where: { userId: user.id }, include: { badge: true }, orderBy: { awardedAt: "desc" } }),
    db.studentReward.findMany({
      where: { userId: user.id, revokedAt: null },
      include: { reward: true },
      orderBy: { awardedAt: "desc" },
    }),
    db.questProgress.findMany({
      where: { userId: user.id },
      include: { quest: true },
    }),
    db.teamMember.findFirst({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
            achievements: { orderBy: { awardedAt: "desc" }, take: 3 },
          },
        },
      },
    }),
    db.registration.findMany({
      where: { userId: user.id },
      include: {
        attendance: true,
        session: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            activity: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getAvatarFramesVisible(),
    getCharmHeartsVisible(),
    getStudentNotifications(user),
    getSocialCounters(user.id),
  ]);

  const activeQuests = questRows.filter((q) => q.quest.active);
  const attendedList = attendedHistory.filter((r) => r.attendance.some((a: { present: boolean }) => a.present));
  const accountFlair = getAccountFlair(progress.level);

  return (
    <StudentShell
      user={{
        name: profile.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: userRow?.avatarFrameId,
        level: progress.level,
      }}
      active="profile"
      unreadCount={notifications.unreadCount}
      unreadMessagesCount={socialCounters.totalSocialAlerts}
    >
      <div className="space-y-7 max-w-4xl mx-auto">
        {/* ── 1. بطاقة الهوية الاجتماعية والاسم والبايو ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card/80 dark:bg-card/60 p-6 sm:p-8 shadow-xl backdrop-blur-md">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40" aria-hidden="true" />
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-start">
              {/* الصورة الشخصية التفاعلية مع إطار التميز وأيقونة الكاميرا */}
              <div className="shrink-0">
                <ProfileAvatarInteractive
                  user={{
                    fullName: profile.fullName,
                    avatarUrl: user.avatarUrl,
                    accountAvatarUrl: user.avatarUrl,
                    avatarFrameId: userRow?.avatarFrameId,
                    level: progress.level,
                    points: progress.xp,
                    provider: userRow?.provider || user.provider || "EMAIL",
                  }}
                  framesVisible={avatarFramesVisible}
                />
              </div>

              {/* الاسم واليوزرنيم والبايو والألقاب */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <LeveledName
                      name={userRow?.displayName || profile.fullName || "طالب"}
                      level={progress.level}
                      size="lg"
                      showLevelChip={false}
                      truncate={false}
                    />
                    <UserCharmHeart
                      level={progress.level}
                      points={progress.xp}
                      size="md"
                      showTitle
                      visible={heartsVisible}
                    />
                  </h1>

                  {userRow?.username && (
                    <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-black text-gold border border-gold/30 dir-ltr">
                      @{userRow.username}
                    </span>
                  )}
                </div>

                {/* البايو (Bio) بأسلوب اقتباس أنيق وواضح */}
                {userRow?.bio ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs sm:text-sm leading-relaxed text-foreground max-w-lg shadow-inner">
                    <Quote className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    <p>{userRow.bio}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    لا توجد نبذة تعريفية مضافة بعد.
                  </p>
                )}

                {/* البيانات الأكاديمية والترتيب */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.08] px-3 py-1 text-[11px] font-extrabold text-gold-deep dark:text-gold-light">
                    <Crown className="h-3.5 w-3.5" />
                    {accountFlair.rankTitle} · المستوى {progress.level}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-gold" />
                    {GRADE_LABELS[profile.grade] ?? "—"} · {SECTION_LABELS[profile.section] ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">
                    الترتيب العام: #{rank}
                  </span>
                </div>
              </div>
            </div>

            {/* زر تعديل الملف الشخصي (يوجه لصفحة الإعدادات) */}
            <div className="shrink-0">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card hover:bg-muted px-4 py-2.5 text-xs font-black text-foreground hover:border-gold/50 transition-all shadow-sm"
              >
                <Settings className="h-4 w-4 text-gold" />
                تعديل الملف الشخصي والإعدادات
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. التطورات والتقدمات وأي شيء جديد ومهم ── */}
        <section className="space-y-6" aria-labelledby="sec-progress">
          {/* رحلتي ومستوى التقدم وشبكة الإحصائيات */}
          <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-card/80 dark:bg-card/60 p-6 sm:p-7 shadow-sm">
            <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40" aria-hidden="true" />
            <div className="relative">
              <h2 id="sec-progress" className="flex items-center gap-2 text-base sm:text-lg font-black text-foreground">
                <Trophy className="h-5 w-5 text-gold" /> رحلتي وتطوراتي الأكاديمية
                {progress.seasonName && (
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                    {progress.seasonName}
                  </span>
                )}
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Trophy, label: "XP كلي", value: `${progress.xp}`, sub: `المستوى ${progress.level}`, highlight: true },
                  { icon: CheckCircle2, label: "حضور الأنشطة", value: `${progress.attendedCount}`, sub: "نشاطاً", highlight: false },
                  { icon: Send, label: "مهام مُنجزة", value: `${progress.tasksCompleted}`, sub: "مهمة", highlight: false },
                  { icon: Flame, label: "استمرارية الحضور", value: `${progress.streakWeeks}`, sub: "أسبوعاً", highlight: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 ${
                      s.highlight
                        ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-sm"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <s.icon className={`mx-auto h-5 w-5 ${s.highlight ? "text-emerald-500" : "text-gold"}`} />
                    <p className={`mt-1.5 text-xl font-black ${s.highlight ? "text-emerald-500" : "text-foreground"}`}>
                      {s.value}
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {s.label} · {s.sub}
                    </p>
                  </div>
                ))}
              </div>

              {progress.nextLevel && (
                <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold">
                    <span className="text-foreground">المستوى الحالي: {progress.level}</span>
                    <span className="text-muted-foreground">المستوى القادم: {progress.nextLevel} (باقي {100 - progress.progressToNext}%)</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-gold-light to-gold transition-all duration-500"
                      style={{ width: `${progress.progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الشارات والمكافآت المكتسبة */}
          {(badges.length > 0 || rewards.length > 0) && (
            <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-black text-foreground">
                <Sparkles className="h-5 w-5 text-gold" /> شاراتي ومكافآتي المكتسبة
              </h3>
              <div className="flex flex-wrap gap-3">
                {badges.map((b) => (
                  <div
                    key={b.badgeId}
                    className="flex items-center gap-2.5 rounded-2xl border border-gold/25 bg-gold/[0.08] px-4 py-3 shadow-sm"
                    title={b.badge.description}
                  >
                    <span className="text-2xl">{b.badge.icon}</span>
                    <div>
                      <p className="text-xs font-black text-gold-deep dark:text-gold-light">{b.badge.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{b.badge.description}</p>
                    </div>
                  </div>
                ))}
                {rewards.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 shadow-sm"
                    title={r.reward.description ?? ""}
                  >
                    <span className="text-2xl">{r.reward.icon}</span>
                    <div>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{r.reward.title}</p>
                      {r.reward.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{r.reward.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* التحديات النشطة */}
          {activeQuests.length > 0 && (
            <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-black text-foreground">
                <Flame className="h-5 w-5 text-gold" /> التحديات والمهام النشطة
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeQuests.map((q) => {
                  const done = !!q.completedAt;
                  const pct = Math.min(100, Math.round((q.count / q.quest.targetCount) * 100));
                  return (
                    <div
                      key={q.questId}
                      className={`rounded-2xl border p-4 transition-all ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-foreground">
                          {q.quest.icon} {q.quest.title}
                        </p>
                        <span
                          className={`shrink-0 text-[11px] font-black ${
                            done ? "text-emerald-500" : "text-muted-foreground"
                          }`}
                        >
                          {done ? "اكتمل ✓" : `${q.count}/${q.quest.targetCount}`}
                        </span>
                      </div>
                      {!done && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      {q.quest.xpReward > 0 && (
                        <p className="mt-2 text-[10px] font-bold text-gold">+{q.quest.xpReward} XP مكافأة</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الفريق والإنجازات المشتركة */}
          {teamMembership && (
            <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-black text-foreground">
                <Swords className="h-5 w-5 text-gold" /> فريقي
              </h3>
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                <span className="text-3xl">{teamMembership.team.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-foreground">{teamMembership.team.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {teamMembership.role === "LEADER" ? "قائد الفريق · " : ""}{teamMembership.team._count.members} أعضاء
                  </p>
                </div>
                {teamMembership.team.achievements.length > 0 && (
                  <div className="hidden shrink-0 gap-1.5 sm:flex">
                    {teamMembership.team.achievements.map((a) => (
                      <span key={a.id} title={a.title} className="text-xl">{a.icon}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الأنشطة التي تم حضورها حديثاً */}
          {attendedList.length > 0 && (
            <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-black text-foreground">
                <CalendarDays className="h-5 w-5 text-gold" /> أنشطة وورش حضرتها مؤخراً
              </h3>
              <ul className="space-y-2">
                {attendedList.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/sessions/${r.session.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 transition-colors hover:border-gold/40 hover:bg-muted/40"
                    >
                      <span className="min-w-0 truncate text-xs sm:text-sm font-bold text-foreground">
                        {r.session.activity.title} — {r.session.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(r.session.startsAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── 3. سجل مشاركاتي في الورش والكورسات 🧭 ── */}
        <section className="space-y-4 pt-2" aria-labelledby="sec-student-workshops">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h2 id="sec-student-workshops" className="text-base sm:text-lg font-black text-foreground">
                  سجل مشاركاتي في الورش والكورسات ({attendedHistory.length}) 🧭
                </h2>
                <p className="text-xs text-muted-foreground">
                  كافة الجلسات والورش التدريبية التي قمت بالتسجيل فيها وحضورها
                </p>
              </div>
            </div>

            <Link
              href="/activities"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gold/15 border border-gold/30 px-3.5 py-2 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-sm shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              استكشف الورش المتاحة
            </Link>
          </div>

          {/* قائمة الورش والجلسات الخاصة بالطالب */}
          {attendedHistory.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attendedHistory.map((reg) => {
                const isAttended = reg.attendance?.some((a: { present: boolean }) => a.present);
                const isPast = new Date(reg.session.startsAt) < new Date();

                return (
                  <div
                    key={reg.id}
                    className="flex flex-col justify-between rounded-3xl border border-border bg-card/80 p-5 shadow-sm space-y-3 hover:border-gold/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full bg-gold/10 border border-gold/25 px-2.5 py-0.5 text-[10px] font-black text-gold">
                          {reg.session.activity.title}
                        </span>

                        {isAttended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            تم الحضور ✓
                          </span>
                        ) : reg.status === "WAITLISTED" ? (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                            قائمة الانتظار
                          </span>
                        ) : isPast ? (
                          <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">
                            انتهت
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-black text-blue-600 dark:text-blue-400">
                            مسجل ⏳
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-foreground line-clamp-1">
                        {reg.session.title}
                      </h3>

                      <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gold shrink-0" />
                        {new Intl.DateTimeFormat("ar-EG", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(reg.session.startsAt))}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <Link
                        href={`/sessions/${reg.session.id}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-gold hover:underline"
                      >
                        تفاصيل الجلسة
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>

                      <span className="text-[10px] text-muted-foreground">
                        رقم التسجيل: #{reg.id.slice(-5)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CalendarDays className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-sm font-black text-foreground">لم تسجل في أي ورش أو كورسات بعد</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                استكشف الورش والجلسات التدريبية المتاحة الآن، بادر بحجز مقعدك لتطوير مهاراتك التقنية وجمع النقاط والشارات!
              </p>
              <div className="pt-2">
                <Link
                  href="/activities"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md"
                >
                  <Sparkles className="h-4 w-4" />
                  استكشف الورش والكورسات المتاحة 🧭
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
