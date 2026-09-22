import Link from "next/link";
import { Users, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudent } from "@/lib/auth";
import { getStudentNotifications } from "@/lib/notifications";
import { StudentShell } from "@/components/student/student-shell";
import { parseExternalLinks } from "@/lib/tasks";
import { planMedia } from "@/lib/media";
import { parseTarget, findTargetedStudentIds } from "@/lib/targeting";
import { levelFromPoints } from "@/lib/constants";
import { getStudentProgress } from "@/lib/progress";
import { getCharmHeartsVisible } from "@/lib/platform";
import { getStudentFeed } from "@/actions/student-posts";
import { getSocialCounters } from "@/actions/messaging";
import { CommunityFeedView } from "@/components/community/community-feed-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مجتمع اللجنة التكنولوجية",
  description: "آخر الأخبار والإنجازات والمنشورات التفاعلية لطلاب اللجنة التكنولوجية",
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

export default async function CommunityPage() {
  const user = await getCurrentUser();
  const isStudent = !!user && user.role === "STUDENT";

  let shellUser: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level?: number;
  } = { name: "", email: "" };
  let unreadCount = 0;
  let unreadMessagesCount = 0;

  if (isStudent) {
    const student = await requireStudent();
    const [progress, notifs, socialCounters] = await Promise.all([
      getStudentProgress(student.id).catch(() => ({ level: 1 })),
      getStudentNotifications(student).catch(() => ({ unreadCount: 0 })),
      getSocialCounters(student.id).catch(() => ({ totalSocialAlerts: 0 })),
    ]);
    shellUser = {
      name: student.profile?.fullName ?? student.email,
      email: student.email,
      avatarUrl: student.avatarUrl,
      avatarFrameId: student.avatarFrameId,
      level: progress.level,
    };
    unreadCount = notifs.unreadCount;
    unreadMessagesCount = socialCounters.totalSocialAlerts;
  }

  // أوسمة الطالب الحالي
  const myBadges =
    isStudent && user
      ? (
          await db.studentBadge.findMany({
            where: { userId: user.id },
            include: { badge: true },
          })
        ).map((b) => ({
          id: b.badge.id,
          name: b.badge.name,
          icon: b.badge.icon,
        }))
      : [];

  const [posts, studentPosts, heartsVisible] = await Promise.all([
    db.communityPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
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
    }),
    getStudentFeed(),
    getCharmHeartsVisible(),
  ]);

  // فلترة الاستهداف للمنشورات الرسمية
  let visible = posts;
  if (isStudent && user) {
    const filtered: typeof posts = [];
    for (const p of posts) {
      if (!p.target) {
        filtered.push(p);
        continue;
      }
      const ids = await findTargetedStudentIds(parseTarget(p.target));
      if (ids.includes(user.id)) filtered.push(p);
    }
    visible = filtered;
  } else {
    visible = posts.filter((p) => !p.target);
  }

  // جلب تعليقات الطالب الحالية التي لا تزال PENDING
  const myPendingComments =
    isStudent && user
      ? await db.comment.findMany({
          where: { userId: user.id, status: "PENDING" },
          orderBy: { createdAt: "asc" },
        })
      : [];
  const myPendingByPost = new Map<string, typeof myPendingComments>();
  for (const c of myPendingComments) {
    const list = myPendingByPost.get(c.postId) ?? [];
    list.push(c);
    myPendingByPost.set(c.postId, list);
  }

  // استخراج الاستبيانات المرتبطة بالمنشورات إن وُجدت
  const surveyIds: string[] = [];
  posts.forEach((p) => {
    if (p.type === "SURVEY" || (p.links && p.links.includes("DATA_REQUEST"))) {
      try {
        const parsedLinks = JSON.parse(p.links || "[]");
        const found = parsedLinks.find((l: any) => l.label === "DATA_REQUEST");
        if (found?.url) surveyIds.push(found.url);
      } catch {}
    }
  });

  const surveyDataMap = new Map<string, any>();
  if (surveyIds.length > 0) {
    const surveys = await db.dataRequest.findMany({
      where: { id: { in: surveyIds } },
      include: {
        responses: {
          select: {
            userId: true,
            answers: true,
          },
        },
      },
    });

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

      const questions = fields.map((f) => {
        const qId = f.id;
        const qType = f.type || "POLL_SINGLE";
        const options: string[] = f.options || [];

        const optionCounts: Record<string, number> = {};
        options.forEach((o) => (optionCounts[o] = 0));

        let ratingSum = 0;
        let ratingCount = 0;

        s.responses.forEach((resp) => {
          let ans: Record<string, any> = {};
          try {
            ans = JSON.parse(resp.answers);
          } catch {}
          const val = ans[qId];
          if (val === undefined || val === null || val === "") return;

          if (qType === "POLL_SINGLE") {
            const strVal = String(val).trim();
            optionCounts[strVal] = (optionCounts[strVal] || 0) + 1;
          } else if (qType === "POLL_MULTI") {
            const arr = Array.isArray(val) ? val : [val];
            arr.forEach((item: string) => {
              const strItem = String(item).trim();
              optionCounts[strItem] = (optionCounts[strItem] || 0) + 1;
            });
          } else if (qType === "RATING") {
            const num = Number(val);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              ratingSum += num;
              ratingCount++;
            }
          }
        });

        const optionsStats = options.map((opt) => ({
          option: opt,
          count: optionCounts[opt] || 0,
          percentage: totalVotes > 0 ? Math.round(((optionCounts[opt] || 0) / totalVotes) * 100) : 0,
        }));

        return {
          id: qId,
          type: qType,
          question: f.label || f.question || "سؤال",
          description: f.description,
          options,
          optionsStats,
          averageRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : undefined,
          userAnswer: userAnswers[qId],
        };
      });

      surveyDataMap.set(s.id, {
        surveyId: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        deadline: s.deadline ? s.deadline.toISOString() : null,
        totalVotes,
        hasVoted: !!userResp,
        questions,
      });
    });
  }

  const formattedCommitteePosts = visible.map((p) => {
    const authorPoints = p.createdBy?.pointEvents?.reduce((acc, e) => acc + e.points, 0) ?? 0;
    const authorLevel = levelFromPoints(authorPoints);

    let surveyData = null;
    if (p.type === "SURVEY" || (p.links && p.links.includes("DATA_REQUEST"))) {
      try {
        const parsed = JSON.parse(p.links || "[]");
        const found = parsed.find((l: any) => l.label === "DATA_REQUEST");
        if (found?.url) {
          surveyData = surveyDataMap.get(found.url) || null;
        }
      } catch {}
    }

    const commentsForStudent = p.comments.map((c) => {
      const commentUserPoints = c.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
      return {
        id: c.id,
        author: c.user.profile?.fullName ?? "طالب",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        mine: c.userId === user?.id,
        pending: false,
        parentId: c.parentId,
        avatarUrl: c.user.avatarUrl,
        avatarFrameId: c.user.avatarFrameId,
        level: levelFromPoints(commentUserPoints),
        badges: c.user.badges.map((b) => ({
          id: b.badge.id,
          name: b.badge.name,
          icon: b.badge.icon,
        })),
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
        avatarUrl: user?.avatarUrl,
        avatarFrameId: user?.avatarFrameId,
        level: shellUser.level,
        badges: myBadges,
      })),
    ];

    return {
      id: p.id,
      type: p.type,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      media: p.mediaUrl ? planMedia(p.mediaUrl) : null,
      links: parseExternalLinks(p.links),
      pinned: p.pinned,
      lockedComments: p.lockedComments,
      autoApproveComments: p.autoApproveComments,
      likesCount: p.reactions.length,
      liked: isStudent && user ? p.reactions.some((r) => r.userId === user.id) : false,
      formattedDate: timeAgo(p.createdAt),
      createdBy: p.createdBy,
      creatorLevel: authorLevel,
      commentsForStudent: allComments,
      surveyData,
    };
  });

  const content = (
    <CommunityFeedView
      studentPosts={studentPosts}
      committeePosts={formattedCommitteePosts}
      currentUserId={user?.id}
      currentUserRole={user?.role}
      isStudent={isStudent}
      heartsVisible={heartsVisible}
    />
  );

  if (!isStudent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {content}
        <p className="flex items-center justify-center gap-2 pt-6 text-xs font-bold text-zinc-500">
          <Lock className="h-3.5 w-3.5" />
          <Link href="/login" className="text-gold hover:underline">سجّل دخولك</Link>
          للتفاعل والتعليق والمشاركة في المجتمع
        </p>
      </div>
    );
  }

  return (
    <StudentShell
      user={shellUser}
      active="community"
      unreadCount={unreadCount}
      unreadMessagesCount={unreadMessagesCount}
    >
      {content}
    </StudentShell>
  );
}
