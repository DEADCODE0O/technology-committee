"use server";

// ═══════════════════════════════════════════════════════════════
//  المجتمع — منشورات اللجنة (الناشر الأساسي) + تفاعلات الطلاب
//  + تعليقات بإشراف: تعليق الطالب يدخل PENDING ويعتمده المشرف
//  · تعليقات المشرفين تُعتمد فورًا · حد معدل يمنع السبام
//  · إخفاء/قفل/تثبيت/حذف — كل شيء في سجل العمليات
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES, isAdminRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { parseExternalLinks } from "@/lib/tasks";
import { COMMUNITY_POST_TYPES } from "@/lib/constants";

const COMMENT_LIMIT = 5; // 5 تعليقات في الساعة لكل طالب
const COMMENT_WINDOW = 60 * 60 * 1000;

function refreshCommunity(postId?: string) {
  revalidatePath("/community");
  revalidatePath("/panel");
  revalidatePath("/admin/community");
  if (postId) revalidatePath(`/community#${postId}`);
}

// ─── إنشاء / تعديل منشور (إدارة فقط — اللجنة هي الناشر) ──────

export type PostInput = {
  id?: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  links?: { label: string; url: string; newTab?: boolean }[];
  pinned?: boolean;
  lockedComments?: boolean;
  autoApproveComments?: boolean;
  targetRaw?: string; // JSON جمهور — فارغ = الجميع
};

export async function saveCommunityPost(input: PostInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.NEWS, "manage");
    if (!input.title?.trim()) return { ok: false, error: "عنوان المنشور مطلوب" };
    if (input.title.trim().length > 140) return { ok: false, error: "العنوان طويل جدًا (الحد 140)" };
    if (!input.body?.trim()) return { ok: false, error: "نص المنشور مطلوب" };
    if (!COMMUNITY_POST_TYPES.some((t) => t.value === input.type)) return { ok: false, error: "نوع المنشور غير صحيح" };
    if (input.imageUrl && !/^(https?:\/\/|\/api\/uploads\/|\/)/.test(input.imageUrl)) {
      return { ok: false, error: "رابط الصورة غير صالح" };
    }

    // تحقق من جمهور صالح (JSON) إن وُجد
    let targetRaw: string | null = null;
    if (input.targetRaw?.trim()) {
      try {
        const parsed = JSON.parse(input.targetRaw);
        if (typeof parsed !== "object") throw new Error();
        targetRaw = JSON.stringify(parsed);
      } catch {
        return { ok: false, error: "فلتر الجمهور غير صالح" };
      }
    }

    const data = {
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim().slice(0, 8000),
      imageUrl: input.imageUrl?.trim() || null,
      mediaUrl: input.mediaUrl?.trim() || null,
      links: input.links?.length ? JSON.stringify(parseExternalLinks(JSON.stringify(input.links))) : null,
      pinned: input.pinned ?? false,
      lockedComments: input.lockedComments ?? false,
      autoApproveComments: input.autoApproveComments ?? false,
      target: targetRaw,
    };

    if (input.id) {
      const existing = await db.communityPost.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "المنشور غير موجود" };
      const updated = await db.communityPost.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "COMMUNITY_POST_UPDATED",
        entity: "COMMUNITY_POST",
        entityId: updated.id,
        summary: `تعديل منشور: ${updated.title}`,
        before: { title: existing.title, status: existing.status },
        after: { title: updated.title, status: updated.status },
      });
      refreshCommunity(updated.id);
      return { ok: true, id: updated.id };
    }

    const created = await db.communityPost.create({
      data: { ...data, status: "PUBLISHED", createdById: admin.id },
    });
    await logAudit({
      actor: admin,
      action: "COMMUNITY_POST_CREATED",
      entity: "COMMUNITY_POST",
      entityId: created.id,
      summary: `منشور جديد (${created.type}): ${created.title}`,
      after: { title: created.title, pinned: created.pinned },
    });
    refreshCommunity(created.id);
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── إخفاء / إظهار / تثبيت / قفل التعليقات ───────────────────

export async function setCommunityPostState(
  postId: string,
  change: { hidden?: boolean; pinned?: boolean; locked?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.NEWS, "manage");
    const post = await db.communityPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };

    const data: Record<string, unknown> = {};
    if (typeof change.hidden === "boolean") data.status = change.hidden ? "HIDDEN" : "PUBLISHED";
    if (typeof change.pinned === "boolean") data.pinned = change.pinned;
    if (typeof change.locked === "boolean") data.lockedComments = change.locked;

    const updated = await db.communityPost.update({ where: { id: postId }, data });
    await logAudit({
      actor: admin,
      action: "COMMUNITY_POST_STATE",
      entity: "COMMUNITY_POST",
      entityId: postId,
      summary: `تغيير حالة منشور «${updated.title}»`,
      before: { status: post.status, pinned: post.pinned, locked: post.lockedComments },
      after: { status: updated.status, pinned: updated.pinned, locked: updated.lockedComments },
    });
    refreshCommunity(postId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function deleteCommunityPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.NEWS, "manage");
    const post = await db.communityPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };
    await db.communityPost.delete({ where: { id: postId } });
    await logAudit({
      actor: admin,
      action: "COMMUNITY_POST_DELETED",
      entity: "COMMUNITY_POST",
      entityId: postId,
      summary: `حذف منشور: ${post.title}`,
      before: { title: post.title, type: post.type },
      reason: "حذف بواسطة الإدارة",
    });
    refreshCommunity();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── تفاعل الطالب (قلب) ────────────────────────────────────

export async function togglePostReaction(postId: string): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const post = await db.communityPost.findUnique({ where: { id: postId }, select: { id: true, status: true } });
    if (!post || post.status !== "PUBLISHED") return { ok: false, error: "المنشور غير متاح" };

    const existing = await db.postReaction.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });
    if (existing) {
      await db.postReaction.delete({ where: { postId_userId: { postId, userId: user.id } } });
      revalidatePath("/community");
      return { ok: true, liked: false };
    }
    // حد معدل التفاعل: 60/ساعة (ضد السبام الآلي)
    const rl = rateLimit(`react:${user.id}`, 60, 60 * 1000);
    if (!rl.ok) return { ok: false, error: "استرح قليلًا ثم تفاعل من جديد" };
    await db.postReaction.create({ data: { postId, userId: user.id } });
    revalidatePath("/community");
    return { ok: true, liked: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── تعليق الطالب أو المشرف (مع دعم الردود الشجرية) ─────────

export async function addComment(
  postId: string,
  body: string,
  parentId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.status === "SUSPENDED") return { ok: false, error: "حسابك معلق — تواصل مع إدارة اللجنة" };
    const text = body?.trim();
    if (!text) return { ok: false, error: "اكتب تعليقًا أولًا" };
    if (text.length > 1000) return { ok: false, error: "التعليق طويل جدًا (الحد 1000 حرف)" };

    const post = await db.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.status !== "PUBLISHED") return { ok: false, error: "المنشور غير متاح" };
    if (post.lockedComments) return { ok: false, error: "التعليقات مقفلة على هذا المنشور" };

    // إذا كان رداً، نتأكد من وجود التعليق الأب وانتمائه لنفس المنشور
    if (parentId) {
      const parentComment = await db.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.postId !== postId) {
        return { ok: false, error: "التعليق الأصلي الذي تحاول الرد عليه غير موجود" };
      }
    }

    // مضاد السبام: نافذة منزلقة لكل طالب
    const rl = rateLimit(`comment:${user.id}`, COMMENT_LIMIT, COMMENT_WINDOW);
    if (!rl.ok) {
      return { ok: false, error: `أرسلت تعليقات كثيرة — حاول بعد ${rl.retryAfterSec} ثانية` };
    }

    // تعليقات الإدارة أو المنشورات ذات الاعتماد التلقائي تُعتمد فورًا — غير ذلك ينتظر المراجعة
    const isAdmin = isAdminRole(user.role);
    const shouldApprove = isAdmin || post.autoApproveComments;

    await db.comment.create({
      data: {
        postId,
        userId: user.id,
        parentId: parentId || null,
        body: text,
        status: shouldApprove ? "APPROVED" : "PENDING",
        moderatedById: shouldApprove && isAdmin ? user.id : null,
        moderatedAt: shouldApprove ? new Date() : null,
      },
    });
    refreshCommunity(postId);
    if (isAdmin) revalidatePath("/admin/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── تعديل تعليق (للمشرف أو كاتب التعليق نفسه) ───────────────

export async function editComment(commentId: string, newBody: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.status === "SUSPENDED") return { ok: false, error: "حسابك معلق — تواصل مع إدارة اللجنة" };
    const text = newBody?.trim();
    if (!text) return { ok: false, error: "نص التعليق مطلوب" };
    if (text.length > 1000) return { ok: false, error: "التعليق طويل جدًا (الحد 1000 حرف)" };

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { id: true, title: true } } },
    });
    if (!comment) return { ok: false, error: "التعليق غير موجود" };

    const isAdmin = isAdminRole(user.role);
    const isAuthor = comment.userId === user.id;

    if (!isAdmin && !isAuthor) {
      return { ok: false, error: "غير مصرح لك بتعديل هذا التعليق" };
    }

    const updated = await db.comment.update({
      where: { id: commentId },
      data: {
        body: text,
        ...(isAdmin && !isAuthor ? { moderatedById: user.id, moderatedAt: new Date() } : {}),
      },
    });

    if (isAdmin && !isAuthor) {
      await logAudit({
        actor: user,
        action: "COMMENT_EDITED",
        entity: "COMMUNITY_POST",
        entityId: comment.postId,
        summary: `تعديل تعليق إشرافيًا على «${comment.post.title}»`,
        before: { body: comment.body },
        after: { body: updated.body },
      });
    }

    refreshCommunity(comment.postId);
    if (isAdmin) revalidatePath("/admin/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── حذف تعليقي ────────────────────────────────────────────

export async function deleteMyComment(commentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.status === "SUSPENDED") return { ok: false, error: "حسابك معلق — تواصل مع إدارة اللجنة" };
    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) return { ok: false, error: "التعليق غير موجود" };
    const isAdmin = isAdminRole(user.role);
    if (comment.userId !== user.id && !isAdmin) return { ok: false, error: "يمكنك حذف تعليقاتك فقط" };
    await db.comment.delete({ where: { id: commentId } });
    refreshCommunity(comment.postId);
    if (isAdmin) revalidatePath("/admin/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── إشراف التعليقات: اعتماد / إخفاء / حذف ─────────────────

export async function moderateComment(
  commentId: string,
  action: "APPROVE" | "HIDE" | "DELETE"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.NEWS, "manage");
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { title: true } } },
    });
    if (!comment) return { ok: false, error: "التعليق غير موجود" };

    if (action === "DELETE") {
      await db.comment.delete({ where: { id: commentId } });
    } else {
      await db.comment.update({
        where: { id: commentId },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "HIDDEN",
          moderatedById: admin.id,
          moderatedAt: new Date(),
        },
      });
    }
    await logAudit({
      actor: admin,
      action: `COMMENT_${action}D`,
      entity: "COMMUNITY_POST",
      entityId: comment.postId,
      summary: `${action === "APPROVE" ? "اعتماد" : action === "HIDE" ? "إخفاء" : "حذف"} تعليق على «${comment.post.title}»`,
      reason: action === "HIDE" ? "إشراف المحتوى" : null,
    });
    revalidatePath("/community");
    revalidatePath("/admin/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// بيانات منشور للتعديل
export async function getCommunityPostForEdit(postId: string): Promise<{ ok: boolean; post?: unknown; error?: string }> {
  try {
    await requireActionUser(MODULES.NEWS, "view");
    const post = await db.communityPost.findUnique({ where: { id: postId } });
    if (!post) return { ok: false, error: "المنشور غير موجود" };
    return { ok: true, post: { ...post, links: JSON.parse(post.links || "[]") } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر تحميل المنشور" };
  }
}

// المستخدم الحالي (لعرض حالة تفاعله)
export async function getMyReactionState(postIds: string[]): Promise<{ ok: boolean; liked?: Record<string, boolean>; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: true, liked: {} };
    const rows = await db.postReaction.findMany({
      where: { userId: user.id, postId: { in: postIds } },
      select: { postId: true },
    });
    const liked: Record<string, boolean> = {};
    for (const r of rows) liked[r.postId] = true;
    return { ok: true, liked };
  } catch {
    return { ok: true, liked: {} };
  }
}
