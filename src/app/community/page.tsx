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

  const formattedCommitteePosts = visible.map((p) => {
    const authorPoints = p.createdBy?.pointEvents?.reduce((acc, e) => acc + e.points, 0) ?? 0;
    const authorLevel = levelFromPoints(authorPoints);

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
