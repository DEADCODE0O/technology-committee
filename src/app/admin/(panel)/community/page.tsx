import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { CommunityManager } from "@/components/admin/community-manager";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage() {
  const user = await requireAdmin(MODULES.NEWS, "view");
  const canManage = canUser(user, MODULES.NEWS, "manage");

  const posts = await db.communityPost.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      reactions: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { include: { profile: { select: { fullName: true } } } } },
      },
    },
  });

  return (
    <CommunityManager
      canManage={canManage}
      posts={posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        status: p.status,
        pinned: p.pinned,
        lockedComments: p.lockedComments,
        autoApproveComments: p.autoApproveComments,
        imageUrl: p.imageUrl,
        mediaUrl: p.mediaUrl,
        likes: p.reactions.length,
        createdAt: p.createdAt.toISOString(),
        comments: p.comments.map((c) => ({
          id: c.id,
          author: c.user.profile?.fullName ?? c.user.email,
          body: c.body,
          status: c.status,
          parentId: c.parentId,
          createdAt: c.createdAt.toISOString(),
          postId: p.id,
        })),
      }))}
    />
  );
}
