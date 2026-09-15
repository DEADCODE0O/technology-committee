"use server";

// ═══════════════════════════════════════════════════════════════
//  محرك المهام (Task Engine) — v5
//  • إنشاء/تعديل مهمة بجمهور (Audience Builder الموحد)
//  • النشر يُجمّد لقطة المستلمين في TaskAssignment — لا فلترة حية
//  • التوزيع العشوائي حتمي (seed = taskId) — لا إعادة قرعة بالتحديث
//  • تسليم طالب (نص/ملف/رابط) + مهمة جماعية للفريق
//  • تقييم الأدمن مرة واحدة: درجة + XP + نقاط + إشعار
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { parseTarget, findTargetedStudentIds, isTargetEveryone, type StudentTarget } from "@/lib/targeting";
import { parseTaskPool } from "@/lib/tasks";
import { stampSeasonId, evaluateQuests } from "@/lib/progress";
import { TASK_SUBMISSION_TYPES, TASK_DISTRIBUTIONS } from "@/lib/constants";

// توزيع حتمي بذر ثابت (taskId) — نفس النتيجة مهما أعيد الحساب
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (Math.imul(h, 48271) + 11) % 2147483647;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function refreshTaskPaths(taskId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/panel");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/admin/tasks");
  if (taskId) revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath("/leaderboard");
}

// ─── معاينة الجمهور: «47 طالبًا سيستلمون هذه المهمة» ──────────

export async function previewTaskAudience(targetRaw: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "view");
    void admin;
    const target = parseTarget(targetRaw);
    const ids = await findTargetedStudentIds(target);
    return { ok: true, count: ids.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر حساب الجمهور" };
  }
}

// ─── إنشاء / تعديل مهمة ─────────────────────────────────────

export type TaskInput = {
  id?: string;
  title: string;
  description: string;
  submissionType: string;
  distribution: string;
  pool: { title: string; description?: string }[];
  links: { label: string; url: string; newTab?: boolean }[];
  target: StudentTarget;
  seasonId?: string | null;
  programId?: string | null;
  activityId?: string | null;
  runId?: string | null;
  sessionId?: string | null;
  dueAt?: string | null;
  xpReward?: number;
  pointsReward?: number;
};

function validateTaskInput(input: TaskInput): string | null {
  if (!input.title?.trim()) return "عنوان المهمة مطلوب";
  if (input.title.trim().length > 120) return "عنوان المهمة طويل جدًا (الحد 120 حرفًا)";
  if (!input.description?.trim()) return "وصف المهمة مطلوب";
  if (!TASK_SUBMISSION_TYPES.some((t) => t.value === input.submissionType)) return "طريقة تسليم غير صحيحة";
  if (!TASK_DISTRIBUTIONS.some((d) => d.value === input.distribution)) return "طريقة توزيع غير صحيحة";
  const needsPool = ["RANDOM_TASK_PER_STUDENT", "BALANCED_RANDOM", "TASK_POOL"].includes(input.distribution);
  if (needsPool) {
    const pool = (input.pool ?? []).filter((p) => p.title?.trim());
    if (pool.length < 2) return "التوزيع العشوائي يحتاج بديلين على الأقل في مجموعة المهام";
    if (pool.length > 20) return "عدد البدائل كبير جدًا (الحد 20)";
  }
  if ((input.xpReward ?? 0) < 0 || (input.xpReward ?? 0) > 1000) return "مكافأة XP بين 0 و1000";
  if ((input.pointsReward ?? 0) < 0 || (input.pointsReward ?? 0) > 1000) return "مكافأة النقاط بين 0 و1000";
  if (input.dueAt) {
    const due = new Date(input.dueAt);
    if (isNaN(due.getTime())) return "موعد التسليم غير صالح";
  }
  return null;
}

export async function saveTask(input: TaskInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const err = validateTaskInput(input);
    if (err) return { ok: false, error: err };

    const data = {
      title: input.title.trim(),
      description: input.description.trim(),
      submissionType: input.submissionType,
      distribution: input.distribution,
      pool: input.pool?.length ? JSON.stringify(input.pool.filter((p) => p.title?.trim())) : null,
      links: input.links?.length ? JSON.stringify(input.links.filter((l) => l.label && l.url)) : null,
      target: JSON.stringify(input.target),
      seasonId: input.seasonId || null,
      programId: input.programId || null,
      activityId: input.activityId || null,
      runId: input.runId || null,
      sessionId: input.sessionId || null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      xpReward: input.xpReward ?? 0,
      pointsReward: input.pointsReward ?? 0,
    };

    if (input.id) {
      const existing = await db.task.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "المهمة غير موجودة" };
      
      const updated = await db.task.update({ where: { id: input.id }, data });

      // إذا كانت المهمة منشورة بالفعل، نتحقق إن كان هناك طلاب جدد يطابقون الاستهداف لإضافتهم
      if (existing.status === "PUBLISHED" && data.submissionType !== "GROUP") {
        try {
          const target = parseTarget(data.target);
          const studentIds = await findTargetedStudentIds(target);
          if (studentIds.length > 0) {
            const existingAssignments = await db.taskAssignment.findMany({
              where: { taskId: input.id },
              select: { userId: true },
            });
            const assignedUserIds = new Set(existingAssignments.map((a) => a.userId).filter(Boolean));
            const missingUserIds = studentIds.filter((uid) => !assignedUserIds.has(uid));
            if (missingUserIds.length > 0) {
              await db.taskAssignment.createMany({
                data: missingUserIds.map((userId) => ({
                  taskId: input.id!,
                  userId,
                  variantIndex: 0,
                })),
              });
            }
          }
        } catch {
          // استمرار في حال حدوث خطأ جانبي بتعيين الجدد
        }
      }

      await logAudit({
        actor: admin,
        action: "TASK_UPDATED",
        entity: "TASK",
        entityId: updated.id,
        summary: `تعديل مهمة (${updated.status === "PUBLISHED" ? "منشورة" : "مسودة"}): ${updated.title}`,
        before: { title: existing.title, dueAt: existing.dueAt, distribution: existing.distribution },
        after: { title: updated.title, dueAt: updated.dueAt, distribution: updated.distribution },
      });
      refreshTaskPaths(updated.id);
      return { ok: true, id: updated.id };
    }

    const created = await db.task.create({
      data: { ...data, status: "DRAFT", createdById: admin.id },
    });
    await logAudit({
      actor: admin,
      action: "TASK_CREATED",
      entity: "TASK",
      entityId: created.id,
      summary: `إنشاء مهمة (مسودة): ${created.title}`,
      after: { title: created.title, distribution: created.distribution },
    });
    refreshTaskPaths(created.id);
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── النشر: تقييم الجمهور + تجميد اللقطة + التوزيع الحتمي ────

export async function publishTask(taskId: string): Promise<{ ok: boolean; assigned?: number; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { ok: false, error: "المهمة غير موجودة" };
    if (task.status !== "DRAFT") return { ok: false, error: "المهمة منشورة بالفعل" };

    const target = parseTarget(task.target);
    const studentIds = await findTargetedStudentIds(target);
    if (studentIds.length === 0) {
      return { ok: false, error: "الجمهور المستهدف فارغ — راجع فلترة الاستهداف" };
    }

    const pool = parseTaskPool(task.pool);
    const needsPool = ["RANDOM_TASK_PER_STUDENT", "BALANCED_RANDOM", "TASK_POOL"].includes(task.distribution);

    // مهمة جماعية؟ الفرق المستهدفة لا تنشأ هنا — الجماعية تعمل على مستوى الفريق المستهدف
    if (task.submissionType === "GROUP") {
      if (!target.teamId) return { ok: false, error: "المهمة الجماعية تتطلب استهداف فريق محدد" };
      const team = await db.team.findUnique({
        where: { id: target.teamId },
        include: { members: true },
      });
      if (!team || team.members.length === 0) return { ok: false, error: "الفريق المستهدف فارغ" };
      await db.$transaction([
        db.taskAssignment.create({
          data: { taskId: task.id, teamId: team.id, variantIndex: 0 },
        }),
        db.task.update({
          where: { id: task.id },
          data: { status: "PUBLISHED", publishedAt: new Date(), seasonId: task.seasonId ?? (await stampSeasonId()) },
        }),
      ]);
      await logAudit({
        actor: admin,
        action: "TASK_PUBLISHED",
        entity: "TASK",
        entityId: task.id,
        summary: `نشر مهمة جماعية «${task.title}» لفريق «${team.name}»`,
        after: { team: team.name, members: team.members.length },
      });
      refreshTaskPaths(task.id);
      return { ok: true, assigned: team.members.length };
    }

    if (needsPool && pool.length < 2) {
      return { ok: false, error: "التوزيع العشوائي يتطلب بديلين على الأقل — عدّل المهمة أولًا" };
    }

    // حساب نسخة كل طالب (حتمية — لا تتغير بتحديث الصفحة أبدًا)
    const variantsFor = (userId: string): number => {
      if (task.distribution === "RANDOM_TASK_PER_STUDENT") {
        const shuffled = seededShuffle(studentIds, `${task.id}::${userId}`);
        return Math.abs(shuffled.indexOf(userId)) % pool.length;
      }
      if (task.distribution === "BALANCED_RANDOM") {
        // توزيع متوازن: نفس الترتيب الحتمي لكن بقسمة بالتساوي
        const shuffled = seededShuffle(studentIds, task.id);
        return shuffled.indexOf(userId) % pool.length;
      }
      return 0; // ONE_TASK_FOR_EVERYONE / TASK_POOL (يختار عند التسليم)
    };

    await db.$transaction(async (tx) => {
      // SQLite لا يدعم skipDuplicates — الفحص المسبق للحالة يمنع التكرار
      await tx.taskAssignment.createMany({
        data: studentIds.map((userId) => ({
          taskId: task.id,
          userId,
          variantIndex: variantsFor(userId),
        })),
      });
      await tx.task.update({
        where: { id: task.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), seasonId: task.seasonId ?? (await stampSeasonId()) },
      });
    });

    await logAudit({
      actor: admin,
      action: "TASK_PUBLISHED",
      entity: "TASK",
      entityId: task.id,
      summary: `نشر مهمة «${task.title}» إلى ${studentIds.length} طالبًا`,
      after: { recipients: studentIds.length, distribution: task.distribution },
      correlationId: randomUUID(),
    });
    refreshTaskPaths(task.id);
    return { ok: true, assigned: studentIds.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء النشر" };
  }
}

// ─── إغلاق المهمة ───────────────────────────────────────────

export async function closeTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { ok: false, error: "المهمة غير موجودة" };
    if (task.status !== "PUBLISHED") return { ok: false, error: "المهمة ليست منشورة" };
    await db.task.update({ where: { id: taskId }, data: { status: "CLOSED" } });
    await logAudit({
      actor: admin,
      action: "TASK_CLOSED",
      entity: "TASK",
      entityId: task.id,
      summary: `إغلاق مهمة: ${task.title}`,
    });
    refreshTaskPaths(task.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── تسليم الطالب (فردي أو باسم الفريق) ─────────────────────

export type SubmissionInput = {
  taskId: string;
  text?: string;
  fileUrl?: string;
  linkUrl?: string;
  variantIndex?: number;
};

export async function submitTask(input: SubmissionInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const task = await db.task.findUnique({ where: { id: input.taskId } });
    if (!task) return { ok: false, error: "المهمة غير موجودة" };
    if (task.status !== "PUBLISHED") return { ok: false, error: "المهمة غير مفتوحة للتسليم" };

    // البحث عن التكليف: فردي أو جماعي (عضو الفريق يسلم باسم فريقه)
    const membership = await db.teamMember.findFirst({ where: { userId: user.id } });
    const assignment = await db.taskAssignment.findFirst({
      where: {
        taskId: task.id,
        OR: [{ userId: user.id }, ...(membership ? [{ teamId: membership.teamId }] : [])],
      },
      include: { submission: true, team: true },
    });
    if (!assignment) return { ok: false, error: "هذه المهمة غير موجهة إليك" };
    if (assignment.submission && assignment.submission.status === "EVALUATED") {
      return { ok: false, error: "تم تقييم تسليمك بالفعل — لا يمكن التسليم مرة أخرى" };
    }

    // التحقق من المحتوى حسب نوع التسليم
    const type = task.submissionType;
    const hasText = !!(input.text?.trim());
    const hasFile = !!(input.fileUrl?.trim());
    const hasLink = !!(input.linkUrl?.trim());
    if ((type === "TEXT" || type === "TEXT_AND_FILE" || type === "TEXT_AND_LINK") && !hasText)
      return { ok: false, error: "النص مطلوب لهذه المهمة" };
    if ((type === "FILE" || type === "TEXT_AND_FILE") && !hasFile && !hasLink)
      return { ok: false, error: "يرجى إرفاق رابط جوجل درايف أو رفع ملف للتسليم" };
    if ((type === "LINK" || type === "TEXT_AND_LINK") && !hasLink && !hasFile)
      return { ok: false, error: "رابط مطلوب لهذه المهمة" };
    if (input.linkUrl && !/^https?:\/\//i.test(input.linkUrl.trim()))
      return { ok: false, error: "الرابط يجب أن يبدأ بـ http أو https" };

    // TASK_POOL: الطالب يختار بديلًا واحدًا
    let chosen = input.variantIndex ?? null;
    if (task.distribution === "TASK_POOL") {
      const pool = parseTaskPool(task.pool);
      if (chosen === null || chosen < 0 || chosen >= pool.length) {
        return { ok: false, error: "اختر أحد بدائل المهمة قبل التسليم" };
      }
    }

    const late = task.dueAt ? new Date() > task.dueAt : false;
    const data = {
      text: hasText ? input.text!.trim().slice(0, 5000) : null,
      fileUrl: hasFile ? input.fileUrl!.trim() : null,
      linkUrl: hasLink ? input.linkUrl!.trim() : null,
      variantIndex: chosen,
      late,
      status: "SUBMITTED" as const,
    };

    if (assignment.submission) {
      // إعادة تسليم (قبل التقييم أو أُعيدت للتعديل)
      await db.taskSubmission.update({ where: { assignmentId: assignment.id }, data: { ...data, updatedAt: new Date() } });
    } else {
      await db.taskSubmission.create({ data: { assignmentId: assignment.id, ...data } });
      await db.taskAssignment.update({ where: { id: assignment.id }, data: { status: "SUBMITTED" } });
    }

    await logAudit({
      actor: user,
      action: "TASK_SUBMITTED",
      entity: "TASK",
      entityId: task.id,
      summary: `تسليم مهمة «${task.title}»${assignment.team ? ` باسم فريق «${assignment.team.name}»` : ""}${late ? " (متأخرًا)" : ""}`,
    });
    refreshTaskPaths(task.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── تقييم الأدمن (مرة واحدة) ───────────────────────────────

export async function evaluateSubmission(
  submissionId: string,
  evaluation: { score: number; feedback?: string; awardXp?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const submission = await db.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { task: true, user: true, team: true } } },
    });
    if (!submission) return { ok: false, error: "التسليم غير موجود" };
    if (submission.status === "EVALUATED") return { ok: false, error: "تم تقييم هذا التسليم بالفعل" };

    const score = Math.max(0, Math.min(100, Math.round(evaluation.score)));
    const task = submission.assignment.task;

    // منح XP/النقاط مرة واحدة — بنسبة الدرجة (تقريبًا)
    const grantXp = evaluation.awardXp !== false;
    const ratio = score / 100;
    const xp = grantXp ? Math.round((task.xpReward || 0) * ratio) : 0;
    const points = grantXp ? Math.round((task.pointsReward || 0) * ratio) : 0;

    const recipient = submission.assignment.user; // الجماعية: النقاط لكل أعضاء الفريق
    const seasonId = task.seasonId ?? (await stampSeasonId());

    await db.$transaction(async (tx) => {
      await tx.taskSubmission.update({
        where: { id: submission.id },
        data: {
          status: "EVALUATED",
          score,
          feedback: evaluation.feedback?.trim()?.slice(0, 2000) ?? null,
          xpAwarded: xp,
          pointsAwarded: points,
          evaluatedById: admin.id,
          evaluatedAt: new Date(),
        },
      });
      await tx.taskAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: "EVALUATED" },
      });

      if (points > 0 && (recipient || submission.assignment.team)) {
        const teamId = submission.assignment.teamId;
        const targets = teamId
          ? (await tx.teamMember.findMany({ where: { teamId } })).map((m) => m.userId)
          : [recipient!.id];
        for (const userId of targets) {
          // مضاد التكرار: نقاط التقييم مرتبطة بالتسليم نفسه
          const dup = await tx.pointEvent.findFirst({
            where: { userId, ruleAction: `TASK_SUB_${submission.id}` },
          });
          if (!dup) {
            await tx.pointEvent.create({
              data: {
                userId,
                points,
                reason: `مهمة: ${task.title}`,
                ruleAction: `TASK_SUB_${submission.id}`,
                sessionId: task.sessionId,
                seasonId,
                createdById: admin.id,
              },
            });
          }
        }
      }
    });

    // إشعار صاحب التسليم
    if (recipient) {
      const { createNotificationForUsers } = await import("@/lib/notifications");
      await createNotificationForUsers({
        type: "TASK",
        title: `تقييم مهمة: ${task.title}`,
        body: `درجتك: ${score}/100${xp > 0 ? ` · +${xp} XP` : ""}${evaluation.feedback ? `\n${evaluation.feedback}` : ""}`,
        target: { ...parseTarget("{}"), userIds: [recipient.id] },
        createdById: admin.id,
      });
      // تقييم الإنجازات
      await evaluateQuests(recipient.id, "TASK_DONE", "TASK");
    }

    await logAudit({
      actor: admin,
      action: "TASK_EVALUATED",
      entity: "TASK",
      entityId: task.id,
      summary: `تقييم تسليم «${task.title}» بدرجة ${score}/100`,
      after: { score, xp, points, submissionId },
    });
    refreshTaskPaths(task.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── إعادة التسليم للتعديل ──────────────────────────────────

export async function returnSubmission(submissionId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const submission = await db.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { task: true, user: true } } },
    });
    if (!submission) return { ok: false, error: "التسليم غير موجود" };
    if (submission.status === "EVALUATED") return { ok: false, error: "لا يمكن إعادة تسليم مُقيَّم — تواصل مع المسؤول" };

    await db.taskSubmission.update({
      where: { id: submissionId },
      data: { status: "RETURNED" },
    });
    await db.taskAssignment.update({
      where: { id: submission.assignmentId },
      data: { status: "ASSIGNED" },
    });

    if (submission.assignment.user) {
      const { createNotificationForUsers } = await import("@/lib/notifications");
      await createNotificationForUsers({
        type: "TASK",
        title: `أُعيدت مهمة «${submission.assignment.task.title}» للتعديل`,
        body: reason?.trim() || "راجع ملاحظات المشرف وعدّل تسليمك ثم أرسله مرة أخرى",
        target: { ...parseTarget("{}"), userIds: [submission.assignment.user.id] },
        createdById: admin.id,
      });
    }

    await logAudit({
      actor: admin,
      action: "TASK_RETURNED",
      entity: "TASK",
      entityId: submission.assignment.taskId,
      summary: `إعادة تسليم «${submission.assignment.task.title}» للتعديل`,
      reason: reason ?? null,
    });
    refreshTaskPaths(submission.assignment.taskId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── حذف مسودة ─────────────────────────────────────────────

export async function deleteTaskDraft(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const task = await db.task.findUnique({ where: { id: taskId }, include: { assignments: true } });
    if (!task) return { ok: false, error: "المهمة غير موجودة" };
    if (task.status !== "DRAFT") return { ok: false, error: "يمكن حذف المسودات فقط — المنشور يُغلق ولا يُحذف" };
    await db.task.delete({ where: { id: taskId } });
    await logAudit({
      actor: admin,
      action: "TASK_DELETED",
      entity: "TASK",
      entityId: taskId,
      summary: `حذف مسودة مهمة: ${task.title}`,
      before: { title: task.title },
      reason: "حذف مسودة",
    });
    refreshTaskPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// بيانات جاهزة لمحرر المهمة (وضع التعديل)
export async function getTaskForEdit(taskId: string): Promise<{ ok: boolean; task?: unknown; error?: string }> {
  try {
    await requireActionUser(MODULES.WORKSHOPS, "view");
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { ok: false, error: "المهمة غير موجودة" };
    return {
      ok: true,
      task: {
        ...task,
        pool: parseTaskPool(task.pool),
        links: JSON.parse(task.links || "[]"),
        target: parseTarget(task.target),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر تحميل المهمة" };
  }
}

void isTargetEveryone;
