"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { maskBannedWords } from "@/lib/content-filter";
import { levelFromPoints } from "@/lib/constants";

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

export interface StudentPostFeedItem {
  id: string;
  body: string;
  imageUrl: string | null;
  category: string;
  lockedComments: boolean;
  pinned: boolean;
  likes: number;
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    name: string;
    avatarUrl: string | null;
    avatarFrameId: string | null;
    role: string;
    level: number;
  };
  reactionsSummary: {
    counts: Record<ReactionType, number>;
    myReaction: ReactionType | null;
    total: number;
  };
  comments: {
    id: string;
    body: string;
    createdAt: string;
    author: {
      id: string;
      username: string | null;
      name: string;
      avatarUrl: string | null;
      avatarFrameId: string | null;
      level: number;
    };
    replies: {
      id: string;
      body: string;
      createdAt: string;
      author: {
        id: string;
        username: string | null;
        name: string;
        avatarUrl: string | null;
        avatarFrameId: string | null;
        level: number;
      };
    }[];
  }[];
  isOwner: boolean;
}

/**
 * جلب خلاصة منشورات الطلاب التفاعلية (Feed)
 */
export async function getStudentFeed(options?: {
  category?: string;
  limit?: number;
}): Promise<StudentPostFeedItem[]> {
  try {
    const user = await getCurrentUser();
    const currentUserId = user?.id;

    const posts = await db.studentPost.findMany({
      where: {
        status: { in: ["APPROVED", "PUBLISHED"] },
        ...(options?.category && options.category !== "ALL" ? { category: options.category } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarFrameId: true,
            role: true,
            profile: { select: { fullName: true } },
            pointEvents: { select: { points: true } },
          },
        },
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                avatarFrameId: true,
                profile: { select: { fullName: true } },
                pointEvents: { select: { points: true } },
              },
            },
            replies: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    avatarFrameId: true,
                    profile: { select: { fullName: true } },
                    pointEvents: { select: { points: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
      take: options?.limit || 30,
    });

    return posts.map((post) => {
      const authorPoints = post.user.pointEvents.reduce((acc, e) => acc + e.points, 0);

      // حساب التفاعلات الـ 6
      const counts: Record<ReactionType, number> = {
        LIKE: 0,
        LOVE: 0,
        HAHA: 0,
        WOW: 0,
        SAD: 0,
        ANGRY: 0,
      };

      let myReaction: ReactionType | null = null;
      for (const r of post.reactions) {
        const type = (r.type as ReactionType) || "LIKE";
        counts[type] = (counts[type] || 0) + 1;
        if (currentUserId && r.userId === currentUserId) {
          myReaction = type;
        }
      }

      return {
        id: post.id,
        body: post.body,
        imageUrl: post.imageUrl,
        category: post.category,
        lockedComments: post.lockedComments,
        pinned: post.pinned,
        likes: post.reactions.length,
        createdAt: post.createdAt.toISOString(),
        author: {
          id: post.user.id,
          username: post.user.username,
          name: post.user.displayName || post.user.profile?.fullName || "طالب",
          avatarUrl: post.user.avatarUrl,
          avatarFrameId: post.user.avatarFrameId,
          role: post.user.role,
          level: levelFromPoints(authorPoints),
        },
        reactionsSummary: {
          counts,
          myReaction,
          total: post.reactions.length,
        },
        comments: post.comments.map((c) => {
          const cPoints = c.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
          return {
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            author: {
              id: c.user.id,
              username: c.user.username,
              name: c.user.displayName || c.user.profile?.fullName || "طالب",
              avatarUrl: c.user.avatarUrl,
              avatarFrameId: c.user.avatarFrameId,
              level: levelFromPoints(cPoints),
            },
            replies: c.replies.map((r) => {
              const rPoints = r.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
              return {
                id: r.id,
                body: r.body,
                createdAt: r.createdAt.toISOString(),
                author: {
                  id: r.user.id,
                  username: r.user.username,
                  name: r.user.displayName || r.user.profile?.fullName || "طالب",
                  avatarUrl: r.user.avatarUrl,
                  avatarFrameId: r.user.avatarFrameId,
                  level: levelFromPoints(rPoints),
                },
              };
            }),
          };
        }),
        isOwner: currentUserId === post.userId,
      };
    });
  } catch (err) {
    console.error("getStudentFeed error:", err);
    return [];
  }
}

/**
 * إنشاء منشور طالب جديد مع فلترة الكلمات ونشر فوري
 */
export async function createStudentPost(input: {
  body: string;
  imageUrl?: string;
  category?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = input.body?.trim();
    if (!text) return { ok: false, error: "نص المنشور لا يمكن أن يكون فارغاً" };
    if (text.length > 2000) return { ok: false, error: "المنشور طويل جداً (الحد الأقصى 2000 حرف)" };

    // Rate limit: منشور كل دقيقتين
    const rl = rateLimit(`post:${user.id}`, 3, 2 * 60 * 1000);
    if (!rl.ok) {
      return { ok: false, error: `هدئ سرعتك — يمكنك النشر بعد ${rl.retryAfterSec} ثانية` };
    }

    const cleanBody = await maskBannedWords(text);

    await db.studentPost.create({
      data: {
        userId: user.id,
        body: cleanBody,
        imageUrl: input.imageUrl?.trim() || null,
        category: input.category || "GENERAL",
        status: "APPROVED",
      },
    });

    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر نشر المنشور" };
  }
}

/**
 * التفاعل مع منشور (إعجاب، حب، هاها، واو، حزين، غاضب)
 */
export async function reactToStudentPost(
  postId: string,
  type: ReactionType
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();

    const existing = await db.studentPostReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      if (existing.type === type) {
        // إزالة التفاعل بالنقر مرة أخرى
        await db.studentPostReaction.delete({
          where: { postId_userId: { postId, userId: user.id } },
        });
      } else {
        // تغيير نوع التفاعل
        await db.studentPostReaction.update({
          where: { postId_userId: { postId, userId: user.id } },
          data: { type },
        });
      }
    } else {
      // تفاعل جديد
      await db.studentPostReaction.create({
        data: {
          postId,
          userId: user.id,
          type,
        },
      });
    }

    // تحديث كاش الإعجابات
    const totalCount = await db.studentPostReaction.count({ where: { postId } });
    await db.studentPost.update({
      where: { id: postId },
      data: { likes: totalCount },
    });

    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تسجيل التفاعل" };
  }
}

/**
 * تعليق أو رد على تعليق في منشور طالب
 */
export async function commentOnStudentPost(
  postId: string,
  rawBody: string,
  parentId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = rawBody?.trim();
    if (!text) return { ok: false, error: "التعليق فارغ" };
    if (text.length > 500) return { ok: false, error: "التعليق طويل جداً (الحد الأقصى 500 حرف)" };

    const post = await db.studentPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };

    if (post.lockedComments && post.userId !== user.id && user.role !== "SUPER_ADMIN") {
      return { ok: false, error: "قام صاحب المنشور بقفل التعليقات" };
    }

    const cleanBody = await maskBannedWords(text);

    await db.studentPostComment.create({
      data: {
        postId,
        userId: user.id,
        body: cleanBody,
        parentId: parentId || null,
      },
    });

    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر نشر التعليق" };
  }
}

/**
 * حذف منشور طالب
 */
export async function deleteStudentPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const post = await db.studentPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };

    const isOwner = post.userId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { ok: false, error: "غير مصرح لك بحذف هذا المنشور" };
    }

    await db.studentPost.delete({ where: { id: postId } });
    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حذف المنشور" };
  }
}

/**
 * حذف تعليق (صاحب التعليق، صاحب المنشور، أو الأدمن)
 */
export async function deleteStudentPostComment(commentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const comment = await db.studentPostComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) return { ok: false, error: "التعليق غير موجود" };

    const isCommentOwner = comment.userId === user.id;
    const isPostOwner = comment.post.userId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    if (!isCommentOwner && !isPostOwner && !isAdmin) {
      return { ok: false, error: "غير مصرح لك بحذف هذا التعليق" };
    }

    await db.studentPostComment.delete({ where: { id: commentId } });
    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حذف التعليق" };
  }
}

/**
 * قفل أو فتح التعليقات (صاحب المنشور أو الأدمن)
 */
export async function toggleLockStudentPostComments(postId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const post = await db.studentPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };

    const isOwner = post.userId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { ok: false, error: "غير مصرح لك بتعديل إعدادات التعليقات" };
    }

    await db.studentPost.update({
      where: { id: postId },
      data: { lockedComments: !post.lockedComments },
    });

    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر قفل التعليقات" };
  }
}

/**
 * تثبيت المنشور (أدمن فقط)
 */
export async function togglePinStudentPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return { ok: false, error: "الصلاحية مخصصة للمشرفين فقط" };
    }

    const post = await db.studentPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };

    await db.studentPost.update({
      where: { id: postId },
      data: { pinned: !post.pinned },
    });

    revalidatePath("/community");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تثبيت المنشور" };
  }
}
