import Link from "next/link";
import {
  Compass, Flame, Sparkles, MessageCircle, ArrowLeft,
  GraduationCap, CalendarDays, CheckCircle2, ChevronLeft,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { StudentShell } from "@/components/student/student-shell";
import { NotificationBanner } from "@/components/platform/notification-banner";
import { getStudentBadges } from "@/lib/student-badges";
import { getStudentProgress } from "@/lib/progress";
import { recordDailyActivity } from "@/lib/streak";
import { getStudentFeed } from "@/actions/student-posts";
import { getCharmHeartsVisible } from "@/lib/platform";
import { parseTarget, findTargetedStudentIds } from "@/lib/targeting";
import { planMedia } from "@/lib/media";
import { parseExternalLinks } from "@/lib/tasks";
import { levelFromPoints } from "@/lib/constants";
import { CommunityFeedView } from "@/components/community/community-feed-view";
import { LeveledName } from "@/components/ui/leveled-name";
import { normalizeEndorsement } from "@/lib/endorsements";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الرئيسية | مجتمع اللجنة التكنولوجية",
  description: "المنصة الطلابية التفاعلية للتسجيل في الورش والكورسات والتواصل والمشاركة في مجتمع اللجنة التكنولوجية",
};

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long" }).format(d);
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
    badges,
    studentFeed,
    committeePostsRaw,
    heartsVisible,
    openActivitiesCount,
    myBadges,
  ] = await Promise.all([
    recordDailyActivity(user.id).catch(() => ({ currentStreak: 1, longestStreak: 1, isNewDay: false, bonusPointsEarned: 0 })),
    getStudentProgress(user.id).catch(() => ({ xp: 0, level: 1, nextLevel: 2, progressToNext: 0, seasonXp: 0, seasonName: null, streakWeeks: 0, attendedCount: 0, tasksCompleted: 0, questsCompleted: 0 })),
    getStudentBadges(user),
    getStudentFeed().catch(() => []),
    db.communityPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
            avatarUrl: true,
            avatarFrameId: true,
            displayName: true,
            profile: { select: { fullName: true } },
            pointEvents: { select: { points: true } },
          },
        },
        reactions: true,
        comments: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                avatarUrl: true,
                avatarFrameId: true,
                profile: { select: { fullName: true } },
                pointEvents: { select: { points: true } },
                badges: { include: { badge: true } },
              },
            },
          },
        },
      },
    }).catch(() => []),
    getCharmHeartsVisible().catch(() => true),
    db.activity.count({ where: { publish: "PUBLISHED" } }).catch(() => 0),
    db.studentBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
    }).then((list) => list.map((b) => ({ id: b.badge.id, name: b.badge.name, icon: b.badge.icon }))).catch(() => []),
  ]);

  // تصفية المنشورات الرسمية المستهدفة للطالب
  let visibleCommitteePosts: any[] = committeePostsRaw;
  const filtered: any[] = [];
  for (const p of committeePostsRaw) {
    if (!p.target) {
      filtered.push(p);
      continue;
    }
    const ids = await findTargetedStudentIds(parseTarget(p.target)).catch((): string[] => []);
    if (ids.includes(user.id)) filtered.push(p);
  }
  visibleCommitteePosts = filtered;

  // تعليقات الطالب قيد الانتظار
  const myPendingComments = await db.comment.findMany({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  const myPendingByPost = new Map<string, typeof myPendingComments>();
  for (const c of myPendingComments) {
    const list = myPendingByPost.get(c.postId) ?? [];
    list.push(c);
    myPendingByPost.set(c.postId, list);
  }

  // استخراج الاستبيانات المرتبطة بالمنشورات إن وُجدت
  const surveyIds: string[] = [];
  visibleCommitteePosts.forEach((p) => {
    if (p.type === "SURVEY" || (p.links && p.links.includes("DATA_REQUEST"))) {
      try {
        const parsedLinks = JSON.parse(p.links || "[]");
        const found = parsedLinks.find((l: any) => l.label === "DATA_REQUEST" || l.label === "SURVEY");
        if (found?.url) surveyIds.push(found.url);
      } catch {}
      if (p.links) {
        const cuidMatch = p.links.match(/c[a-z0-9]{24}/g);
        if (cuidMatch) cuidMatch.forEach((id: string) => surveyIds.push(id));
      }
    }
  });

  const surveyDataMap = new Map<string, any>();
  const surveyByTitleMap = new Map<string, any>();

  const surveys = await db.dataRequest.findMany({
    where: {
      OR: [
        { id: { in: surveyIds.length > 0 ? surveyIds : ["__NONE__"] } },
        { status: "OPEN" },
      ],
    },
    include: {
      responses: {
        select: {
          userId: true,
          answers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  }).catch(() => []);

  surveys.forEach((s) => {
    let fields: any[] = [];
    try {
      fields = JSON.parse(s.fields);
    } catch {
      fields = [];
    }

    const totalVotes = s.responses.length;
    const userResp = user ? s.responses.find((r) => r.userId === user.id) : null;
    let userAnswers: Record<string, any> = {};
    if (userResp?.answers) {
      try {
        userAnswers = JSON.parse(userResp.answers);
      } catch {}
    }

    const questions = fields.map((f, idx) => {
      const qId = f.id || `q_${idx + 1}`;
      const qType = f.type || "POLL_SINGLE";
      const options: string[] = Array.isArray(f.options) ? f.options : [];
      const allowOther = !!f.allowOther;

      const optionCounts: Record<string, number> = {};
      options.forEach((o) => (optionCounts[o] = 0));
      if (allowOther) optionCounts["أخرى"] = 0;

      let ratingSum = 0;
      let ratingCount = 0;

      s.responses.forEach((resp) => {
        let ans: Record<string, any> = {};
        try {
          ans = JSON.parse(resp.answers);
        } catch {}
        const val = ans[qId];
        if (val === undefined || val === null || val === "") return;

        const recordVote = (v: string) => {
          const str = String(v).trim();
          if (str.startsWith("أخرى:") || str.startsWith("__OTHER__:") || str === "أخرى") {
            optionCounts["أخرى"] = (optionCounts["أخرى"] || 0) + 1;
          } else if (optionCounts[str] !== undefined) {
            optionCounts[str] = (optionCounts[str] || 0) + 1;
          } else {
            optionCounts[str] = (optionCounts[str] || 0) + 1;
          }
        };

        if (qType === "POLL_SINGLE") {
          recordVote(val);
        } else if (qType === "POLL_MULTI") {
          const arr = Array.isArray(val) ? val : [val];
          arr.forEach(recordVote);
        } else if (qType === "RATING") {
          const num = Number(val);
          if (!isNaN(num) && num >= 1 && num <= 5) {
            ratingSum += num;
            ratingCount++;
          }
        }
      });

      const allOptionsToDisplay = [...options];
      if (allowOther && !allOptionsToDisplay.includes("أخرى")) {
        allOptionsToDisplay.push("أخرى");
      }

      const optionsStats = allOptionsToDisplay.map((opt) => ({
        option: opt,
        count: optionCounts[opt] || 0,
        percentage: totalVotes > 0 ? Math.round(((optionCounts[opt] || 0) / totalVotes) * 100) : 0,
        isOther: opt === "أخرى",
      }));

      return {
        id: qId,
        type: qType,
        question: f.label || f.question || "سؤال",
        description: f.description,
        options,
        allowOther,
        optionsStats,
        averageRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : undefined,
        userAnswer: userAnswers[qId],
      };
    });

    let xpReward = 0;
    try {
      const parsedTarget = JSON.parse(s.target || "{}");
      xpReward = typeof parsedTarget.xpReward === "number" ? Math.max(0, parsedTarget.xpReward) : 0;
    } catch {}

    const surveyObj = {
      surveyId: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      deadline: s.deadline ? s.deadline.toISOString() : null,
      totalVotes,
      hasVoted: !!userResp,
      xpReward,
      questions,
    };

    surveyDataMap.set(s.id, surveyObj);
    if (s.title) {
      surveyByTitleMap.set(s.title.trim().toLowerCase(), surveyObj);
    }
  });

  const formattedCommitteePosts = visibleCommitteePosts.map((p: any) => {
    const authorPoints = p.createdBy?.pointEvents?.reduce((acc: number, e: { points: number }) => acc + e.points, 0) ?? 0;
    const authorLevel = levelFromPoints(authorPoints);

    let surveyData = null;
    if (p.type === "SURVEY" || (p.links && p.links.includes("DATA_REQUEST"))) {
      // 1. محاولة المطابقة المباشرة عبر معرّف الرابط
      try {
        const parsed = JSON.parse(p.links || "[]");
        const found = parsed.find((l: any) => l.label === "DATA_REQUEST" || l.label === "SURVEY");
        if (found?.url && surveyDataMap.has(found.url)) {
          surveyData = surveyDataMap.get(found.url);
        }
      } catch {}

      // 2. محاولة البحث عن CUID داخل نص الروابط
      if (!surveyData && p.links) {
        const matches = p.links.match(/c[a-z0-9]{24}/g);
        if (matches) {
          for (const m of matches) {
            if (surveyDataMap.has(m)) {
              surveyData = surveyDataMap.get(m);
              break;
            }
          }
        }
      }

      // 3. محاولة المطابقة الدقيقة بعنوان الاستبيان
      if (!surveyData && p.title) {
        const normalizedTitle = p.title.trim().toLowerCase();
        if (surveyByTitleMap.has(normalizedTitle)) {
          surveyData = surveyByTitleMap.get(normalizedTitle);
        }
      }

      // 4. محاولة المطابقة التقريبية بالكلمات المفتاحية
      if (!surveyData && p.title) {
        for (const [titleKey, sData] of surveyByTitleMap.entries()) {
          if (titleKey.includes(p.title.trim().toLowerCase()) || p.title.trim().toLowerCase().includes(titleKey)) {
            surveyData = sData;
            break;
          }
        }
      }

      // 5. استخدام أحدث استبيان متاح تلقائيًا
      if (!surveyData && surveyDataMap.size > 0) {
        surveyData = Array.from(surveyDataMap.values())[0];
      }
    }

    const commentsForStudent = (p.comments || []).map((c: any) => {
      const commentUserPoints = c.user?.pointEvents?.reduce((acc: number, e: { points: number }) => acc + e.points, 0) ?? 0;
      return {
        id: c.id,
        author: c.user?.profile?.fullName ?? "طالب",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        mine: c.userId === user.id,
        pending: false,
        parentId: c.parentId,
        avatarUrl: c.user?.avatarUrl,
        avatarFrameId: c.user?.avatarFrameId,
        level: levelFromPoints(commentUserPoints),
        badges: c.user?.badges?.map((b: any) => ({
          id: b.badge.id,
          name: b.badge.name,
          icon: b.badge.icon,
        })) ?? [],
      };
    });

    const myPending = myPendingByPost.get(p.id) ?? [];
    const allComments = [
      ...commentsForStudent,
      ...myPending.map((c) => ({
        id: c.id,
        author: "أنت",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        mine: true,
        pending: true,
        parentId: c.parentId,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
        level: progress.level,
        badges: myBadges,
      })),
    ];

    // حساب إحصاءات التقديرات الخمسة
    const reactionCounts: Record<string, number> = {
      ROCKET: 0,
      IDEA: 0,
      APPLAUSE: 0,
      ENERGY: 0,
      GEM: 0,
    };
    let myReactionKind: string | null = null;
    for (const r of (p.reactions || [])) {
      const norm = normalizeEndorsement(r.kind);
      reactionCounts[norm] = (reactionCounts[norm] || 0) + 1;
      if (r.userId === user.id) {
        myReactionKind = norm;
      }
    }

    return {
      id: p.id,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      type: p.type,
      pinned: p.pinned,
      createdAt: p.createdAt.toISOString(),
      author: p.createdBy ? (p.createdBy.displayName || p.createdBy.email.split("@")[0]) : "اللجنة التكنولوجية",
      authorRole: p.createdBy?.role,
      authorAvatar: p.createdBy?.avatarUrl,
      authorFrameId: p.createdBy?.avatarFrameId,
      authorLevel,
      reactionCounts,
      myReactionKind,
      reactionsCount: p.reactions?.length ?? 0,
      commentsCount: allComments.length,
      commentsForStudent: allComments,
      surveyData,
    };
  });

  return (
    <StudentShell
      user={{
        name: profile.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
        level: progress.level,
      }}
      active="dashboard"
      pendingCount={badges.pendingCount}
      unreadCount={badges.unreadCount}
      openTaskCount={badges.openTaskCount}
      unreadMessagesCount={badges.unreadMessagesCount}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* إعلانات مهمة مثبتة إن وجدت */}
        {badges.pinnedBanners.length > 0 && (
          <div className="space-y-2">
            {badges.pinnedBanners.map((banner) => (
              <NotificationBanner key={banner.id} notification={banner} />
            ))}
          </div>
        )}

        {/* ── الشريط الترحيبي الذكي والروابط الأساسية ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card/80 dark:bg-card/60 p-5 sm:p-6 shadow-md backdrop-blur-md">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-30" aria-hidden="true" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-start">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm font-bold text-muted-foreground">أهلاً بك،</span>
                  <LeveledName
                    name={user.displayName || profile.fullName || "طالبنا المتميز"}
                    level={progress.level}
                    size="md"
                    showLevelChip={true}
                  />
                  {streakData.currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-black text-amber-500">
                      <Flame className="h-3.5 w-3.5 fill-amber-500" />
                      {streakData.currentStreak} يوم حماسة
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  مجتمعك الطلابي التفاعلي — تواصل مع زملائك، شارك منشوراتك، وقدّم في الورش والكورسات.
                </p>
              </div>
            </div>

            {/* بطاقات الإجراءات السريعة في الصدارة */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              {/* بطاقة استكشف الورش والكورسات */}
              <Link
                href="/activities"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold to-gold-light px-4 py-2.5 text-xs font-black text-night hover:brightness-105 transition-all shadow-md group"
              >
                <Compass className="h-4 w-4 transition-transform group-hover:rotate-45" />
                <span>استكشف الورش والكورسات ({openActivitiesCount})</span>
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              </Link>

              {/* بطاقة الرسائل السريعة */}
              <Link
                href="/messages"
                className="relative inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:border-gold/50 hover:bg-muted transition-all shadow-sm"
                title="الرسائل والمحادثات"
              >
                <MessageCircle className="h-4 w-4 text-gold" />
                <span className="hidden sm:inline">الرسائل</span>
                {badges.unreadMessagesCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white animate-pulse">
                    {badges.unreadMessagesCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </section>

        {/* ── محتوى المجتمع التفاعلي بالكامل (القلب النابض للمنصة) ── */}
        <section className="space-y-4">
          <CommunityFeedView
            studentPosts={studentFeed}
            committeePosts={formattedCommitteePosts}
            currentUserId={user.id}
            currentUserRole={user.role}
            isStudent={true}
            heartsVisible={heartsVisible}
          />
        </section>
      </div>
    </StudentShell>
  );
}
