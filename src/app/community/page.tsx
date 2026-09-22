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
        const found = parsedLinks.find((l: any) => l.label === "DATA_REQUEST" || l.label === "SURVEY");
        if (found?.url) surveyIds.push(found.url);
      } catch {}
      if (p.links) {
        const cuidMatch = p.links.match(/c[a-z0-9]{24}/g);
        if (cuidMatch) cuidMatch.forEach((id) => surveyIds.push(id));
      }
    }
  });

  const surveyDataMap = new Map<string, any>();
  const surveyByTitleMap = new Map<string, any>();

  // جلب جميع الاستبيانات المفتوحة أو المحددة بالمعرف لضمان عدم ضياع أي استبيان
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

    const surveyObj = {
      surveyId: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      deadline: s.deadline ? s.deadline.toISOString() : null,
      totalVotes,
      hasVoted: !!userResp,
      questions,
    };

    surveyDataMap.set(s.id, surveyObj);
    if (s.title) {
      surveyByTitleMap.set(s.title.trim().toLowerCase(), surveyObj);
    }
  });

  const formattedCommitteePosts = visible.map((p) => {
    const authorPoints = p.createdBy?.pointEvents?.reduce((acc, e) => acc + e.points, 0) ?? 0;
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

      // 2. محاولة استخراج أي معرّف CUID من الروابط
      if (!surveyData && p.links) {
        const cuidMatch = p.links.match(/c[a-z0-9]{24}/g);
        if (cuidMatch) {
          for (const cid of cuidMatch) {
            if (surveyDataMap.has(cid)) {
              surveyData = surveyDataMap.get(cid);
              break;
            }
          }
        }
      }

      // 3. محاولة المطابقة التامة بالعنوان
      if (!surveyData && p.title) {
        const normTitle = p.title.trim().toLowerCase();
        if (surveyByTitleMap.has(normTitle)) {
          surveyData = surveyByTitleMap.get(normTitle);
        }
      }

      // 4. محاولة المطابقة الجزئية بالعنوان
      if (!surveyData && p.title) {
        const normTitle = p.title.trim().toLowerCase();
        for (const [titleKey, data] of surveyByTitleMap.entries()) {
          if (normTitle.includes(titleKey) || titleKey.includes(normTitle)) {
            surveyData = data;
            break;
          }
        }
      }

      // 5. إذا كان المنشور استبياناً رسمياً ولم يرتبط بعد، نأخذ أحدث استبيان متاح
      if (!surveyData && p.type === "SURVEY" && surveyDataMap.size > 0) {
        surveyData = Array.from(surveyDataMap.values())[0];
      }
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
