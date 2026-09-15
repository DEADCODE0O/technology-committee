import Link from "next/link";
import { Users, Pin, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudent } from "@/lib/auth";
import { getStudentNotifications } from "@/lib/notifications";
import { StudentShell } from "@/components/student/student-shell";
import { PostEngagement } from "@/components/community/post-engagement";
import { MediaFrame, PostImage } from "@/components/community/media-frame";
import { parseExternalLinks } from "@/lib/tasks";
import { planMedia } from "@/lib/media";
import { parseTarget, findTargetedStudentIds } from "@/lib/targeting";
import { COMMUNITY_POST_TYPE_ICONS, COMMUNITY_POST_TYPE_LABELS, ROLE_LABELS, levelFromPoints } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";
import { isAdminRole } from "@/lib/permissions";
import { getStudentProgress } from "@/lib/progress";
import { getCharmHeartsVisible } from "@/lib/platform";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { LeveledName } from "@/components/ui/leveled-name";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مجتمع اللجنة التكنولوجية",
  description: "آخر الأخبار والإنجازات واللقطات المميزة من أنشطة اللجنة التكنولوجية",
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
  // الطالب أو الزائر — المجتمع مفتوح للعرض، التفاعل للطلاب
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
  if (isStudent) {
    const student = await requireStudent();
    const progress = await getStudentProgress(student.id);
    shellUser = {
      name: student.profile?.fullName ?? student.email,
      email: student.email,
      avatarUrl: student.avatarUrl,
      avatarFrameId: student.avatarFrameId,
      level: progress.level,
    };
    unreadCount = (await getStudentNotifications(student)).unreadCount;
  }

  // جلب شارات الطالب الحالي (أعلى 3)
  let myBadges: { id: string; name: string; icon: string }[] = [];
  if (isStudent && user) {
    const studentUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        badges: {
          take: 3,
          orderBy: { awardedAt: "desc" },
          include: {
            badge: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });
    myBadges = studentUser?.badges.map((b) => ({
      id: b.badge.id,
      name: b.badge.name,
      icon: b.badge.icon,
    })) ?? [];
  }

async function getCommunityPosts() {
  try {
    return await db.communityPost.findMany({
      where: { status: "PUBLISHED" },
      include: {
        createdBy: {
          select: {
            role: true,
            avatarUrl: true,
            avatarFrameId: true,
            profile: { select: { fullName: true } },
            pointEvents: { select: { points: true } },
          },
        },
        reactions: { select: { userId: true } },
        comments: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              include: {
                profile: { select: { fullName: true } },
                pointEvents: { select: { points: true } },
                badges: {
                  take: 3,
                  orderBy: { awardedAt: "desc" },
                  include: {
                    badge: {
                      select: {
                        id: true,
                        name: true,
                        icon: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 60,
    });
  } catch (err) {
    console.error("CommunityPage posts fetch error:", err);
    return [];
  }
}

  const posts = await getCommunityPosts();
  const heartsVisible = await getCharmHeartsVisible();

  // فلترة الاستهداف: الزائر يرى العام فقط · الطالب يرى ما يخصه
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

  const content = (
    <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
            <Users className="h-6 w-6 text-gold" />
            مجتمع اللجنة التكنولوجية
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            أخبار وإعلانات ولقطات وإنجازات الأنشطة — مساحة للتواصل والتفاعل
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.06] bg-surface p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-3 text-sm font-extrabold text-zinc-300">لا توجد منشورات حالياً</p>
            <p className="mt-1 text-xs text-zinc-500">ترقّب التحديثات والإعلانات القادمة هنا</p>
          </div>
        ) : null}

        {visible.map((p) => {
          const liked = isStudent && user ? p.reactions.some((r) => r.userId === user.id) : false;
          const links = parseExternalLinks(p.links);
          const media = p.mediaUrl ? planMedia(p.mediaUrl) : null;
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
          // تعليقاتي قيد المراجعة على هذا المنشور
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

          const authorPoints = p.createdBy.pointEvents.reduce((acc, e) => acc + e.points, 0);
          const authorLevel = levelFromPoints(authorPoints);
          const authorName = p.createdBy.profile?.fullName ?? "إدارة اللجنة التكنولوجية";
          const isManagementAuthor = !p.createdBy.profile?.fullName;

        return (
          <article key={p.id} className="rounded-3xl border border-white/[0.07] bg-surface p-5 sm:p-6">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AvatarWithFrame
                  name={authorName}
                  avatarUrl={p.createdBy.avatarUrl}
                  frameId={p.createdBy.avatarFrameId}
                  size="sm"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isManagementAuthor ? (
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{authorName}</span>
                    ) : (
                      <LeveledName name={authorName} level={authorLevel} size="xs" showLevelChip={false} />
                    )}
                    <span className="rounded-md bg-gold/[0.1] dark:bg-gold/[0.12] border border-gold/30 px-1.5 py-0.2 text-[9px] font-extrabold text-gold-deep dark:text-gold-light">
                      {ROLE_LABELS[p.createdBy.role] ?? "إدارة"}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-500 block mt-0.5">
                    {timeAgo(p.createdAt)} · {COMMUNITY_POST_TYPE_LABELS[p.type]}
                  </span>
                </div>
              </div>
              {p.pinned && (
                <span className="flex items-center gap-1 rounded-lg bg-gold/[0.1] px-2 py-1 text-[10px] font-extrabold text-gold">
                  <Pin className="h-3 w-3" /> مثبت
                </span>
              )}
            </header>

            <h2 className="mt-3 text-lg font-extrabold leading-8 text-zinc-100">{p.title}</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-8 text-zinc-300">{p.body}</p>

            {p.imageUrl && <div className="mt-4"><PostImage url={p.imageUrl} alt={p.title} /></div>}
            {media && <div className="mt-4"><MediaFrame plan={media} title={p.title} /></div>}

            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map((l, i) => (
                  <a
                    key={i}
                    href={safeExternalUrl(l.url)}
                    target={l.newTab === false ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-2 text-xs font-extrabold text-gold-light transition-colors hover:bg-gold/[0.12]"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}

            <PostEngagement
              postId={p.id}
              initialLiked={liked}
              likeCount={p.reactions.length}
              commentCount={p.comments.length}
              locked={p.lockedComments}
              autoApproveComments={p.autoApproveComments}
              canComment={isStudent}
              comments={allComments}
              currentUserLevel={shellUser.level}
              currentUserAvatarUrl={shellUser.avatarUrl}
              currentUserFrameId={shellUser.avatarFrameId}
              currentUserBadges={myBadges}
              heartsVisible={heartsVisible}
            />
          </article>
        );
      })}

      {!isStudent && visible.length > 0 && (
        <p className="flex items-center justify-center gap-2 pt-2 text-xs font-bold text-zinc-500">
          <Lock className="h-3.5 w-3.5" />
          <Link href="/login" className="text-gold/80 hover:underline">سجّل دخولك</Link>
          للتفاعل والتعليق
        </p>
      )}
    </div>
  );

  if (!isStudent) {
    return content;
  }

  return (
    <StudentShell user={shellUser} active="community" unreadCount={unreadCount}>
      {content}
    </StudentShell>
  );
}
