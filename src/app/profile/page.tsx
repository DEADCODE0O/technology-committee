import Link from "next/link";
import { GraduationCap, Crown, Settings, Quote } from "lucide-react";
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
import { ProfileTabs } from "@/components/profile/profile-tabs";
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
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        {/* ── 1. بطاقة الهوية الاجتماعية والاسم والبايو (Mobile-First Hero) ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card/85 dark:bg-card/70 p-5 sm:p-7 shadow-xl backdrop-blur-md">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-35" aria-hidden="true" />
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-start w-full sm:w-auto">
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
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
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

                {/* البايو (Bio) بأسلوب اقتباس أنيق وموجز على الهاتف */}
                {userRow?.bio ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-border/80 bg-muted/40 px-3.5 py-2 text-xs leading-relaxed text-foreground max-w-lg shadow-inner mx-auto sm:mx-0">
                    <Quote className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                    <p className="line-clamp-3 sm:line-clamp-none">{userRow.bio}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    لا توجد نبذة تعريفية مضافة بعد.
                  </p>
                )}

                {/* البيانات الأكاديمية والترتيب */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/[0.08] px-2.5 py-0.5 text-[11px] font-extrabold text-gold-deep dark:text-gold-light">
                    <Crown className="h-3 w-3" />
                    {accountFlair.rankTitle} · المستوى {progress.level}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    <GraduationCap className="h-3 w-3 text-gold" />
                    {GRADE_LABELS[profile.grade] ?? "—"} · {SECTION_LABELS[profile.section] ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    الترتيب: #{rank}
                  </span>
                </div>
              </div>
            </div>

            {/* زر تعديل الملف الشخصي والإعدادات */}
            <div className="shrink-0 w-full sm:w-auto">
              <Link
                href="/settings"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card hover:bg-muted px-4 py-2.5 text-xs font-black text-foreground hover:border-gold/50 transition-all shadow-sm"
              >
                <Settings className="h-3.5 w-3.5 text-gold" />
                تعديل الملف والإعدادات
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. التبويبات التفاعلية الذكية المخصصة للهاتف (ProfileTabs) ── */}
        <ProfileTabs
          progress={progress}
          badges={badges}
          rewards={rewards}
          activeQuests={activeQuests}
          attendedList={attendedList}
          teamMembership={teamMembership}
          heartsVisible={heartsVisible}
        />
      </div>
    </StudentShell>
  );
}
