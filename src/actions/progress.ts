"use server";

// ═══════════════════════════════════════════════════════════════
//  نظام التقدم — إدارة المواسم والإنجازات والمكافآت
//  والطلاب المميزين (كل شيء بضوابط صلاحيات وسجل تدقيق)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { QUEST_KINDS, REWARD_TYPES, FEATURED_KINDS } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";

function refreshAll() {
  revalidatePath("/leaderboard");
  revalidatePath("/panel");
  revalidatePath("/profile");
  revalidatePath("/admin/seasons");
  revalidatePath("/welcome");
}

// ─── المواسم ───────────────────────────────────────────────

export async function saveSeason(input: {
  id?: string;
  name: string;
  startAt: string;
  endAt?: string | null;
  status?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    if (!input.name?.trim()) return { ok: false, error: "اسم الموسم مطلوب" };
    const start = parseDateInput(input.startAt);
    if (!start) return { ok: false, error: "تاريخ البداية غير صالح" };
    const end = parseDateInput(input.endAt);
    if (end && end <= start) return { ok: false, error: "نهاية الموسم يجب أن تكون بعد بدايته" };

    const data = {
      name: input.name.trim().slice(0, 80),
      startAt: start,
      endAt: end,
      status: input.status && ["UPCOMING", "ACTIVE", "ENDED"].includes(input.status) ? input.status : "ACTIVE",
    };

    // موسم واحد نشط فقط — تفعيل موسم ينهي السابق
    if (data.status === "ACTIVE" && !input.id) {
      const active = await db.season.findFirst({ where: { status: "ACTIVE" } });
      if (active) {
        await db.season.update({
          where: { id: active.id },
          data: { status: "ENDED", endAt: new Date() },
        });
      }
    }

    if (input.id) {
      const existing = await db.season.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "الموسم غير موجود" };
      const updated = await db.season.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "SEASON_UPDATED",
        entity: "SEASON",
        entityId: updated.id,
        summary: `تعديل موسم: ${updated.name}`,
        before: { name: existing.name, status: existing.status },
        after: { name: updated.name, status: updated.status },
      });
      refreshAll();
      return { ok: true, id: updated.id };
    }

    const created = await db.season.create({ data });
    await logAudit({
      actor: admin,
      action: "SEASON_CREATED",
      entity: "SEASON",
      entityId: created.id,
      summary: `إنشاء موسم: ${created.name}`,
      after: { name: created.name, startAt: created.startAt },
    });
    refreshAll();
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function endSeason(seasonId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const season = await db.season.findUnique({ where: { id: seasonId } });
    if (!season) return { ok: false, error: "الموسم غير موجود" };
    await db.season.update({ where: { id: seasonId }, data: { status: "ENDED", endAt: new Date() } });
    await logAudit({
      actor: admin,
      action: "SEASON_ENDED",
      entity: "SEASON",
      entityId: seasonId,
      summary: `إنهاء موسم: ${season.name}`,
      before: { status: season.status },
      after: { status: "ENDED" },
    });
    refreshAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── الإنجازات / التحديات (Quests) ──────────────────────────

export async function saveQuest(input: {
  id?: string;
  title: string;
  description?: string;
  kind: string;
  targetCount: number;
  xpReward: number;
  icon?: string;
  seasonId?: string | null;
  active?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    if (!input.title?.trim()) return { ok: false, error: "عنوان الإنجاز مطلوب" };
    if (!QUEST_KINDS.some((k) => k.value === input.kind)) return { ok: false, error: "نوع الإنجاز غير صحيح" };
    if (input.targetCount < 1 || input.targetCount > 100) return { ok: false, error: "الهدف بين 1 و100" };
    if (input.xpReward < 1 || input.xpReward > 1000) return { ok: false, error: "مكافأة XP بين 1 و1000" };

    const data = {
      title: input.title.trim().slice(0, 100),
      description: input.description?.trim()?.slice(0, 500) ?? null,
      kind: input.kind,
      targetCount: Math.round(input.targetCount),
      xpReward: Math.round(input.xpReward),
      icon: (input.icon || "🎯").slice(0, 4),
      seasonId: input.seasonId || null,
      active: input.active ?? true,
    };

    if (input.id) {
      const existing = await db.quest.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "الإنجاز غير موجود" };
      const updated = await db.quest.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "QUEST_UPDATED",
        entity: "QUEST",
        entityId: updated.id,
        summary: `تعديل إنجاز: ${updated.title}`,
        before: { title: existing.title, targetCount: existing.targetCount },
        after: { title: updated.title, targetCount: updated.targetCount },
      });
      refreshAll();
      return { ok: true, id: updated.id };
    }

    const maxOrder = await db.quest.aggregate({ _max: { order: true } });
    const created = await db.quest.create({ data: { ...data, order: (maxOrder._max.order ?? 0) + 1 } });
    await logAudit({
      actor: admin,
      action: "QUEST_CREATED",
      entity: "QUEST",
      entityId: created.id,
      summary: `إنشاء إنجاز: ${created.title}`,
      after: { title: created.title, kind: created.kind },
    });
    refreshAll();
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function deleteQuest(questId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest) return { ok: false, error: "الإنجاز غير موجود" };
    await db.quest.delete({ where: { id: questId } });
    await logAudit({
      actor: admin,
      action: "QUEST_DELETED",
      entity: "QUEST",
      entityId: questId,
      summary: `حذف إنجاز: ${quest.title}`,
      before: { title: quest.title },
    });
    refreshAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── المكافآت ──────────────────────────────────────────────

export async function saveReward(input: {
  id?: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    if (!input.title?.trim()) return { ok: false, error: "عنوان المكافأة مطلوب" };
    if (!REWARD_TYPES.some((r) => r.value === input.type)) return { ok: false, error: "نوع المكافأة غير صحيح" };

    const data = {
      type: input.type,
      title: input.title.trim().slice(0, 100),
      description: input.description?.trim()?.slice(0, 500) ?? null,
      icon: (input.icon || REWARD_TYPES.find((r) => r.value === input.type)?.icon || "🎁").slice(0, 4),
    };

    if (input.id) {
      const existing = await db.reward.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "المكافأة غير موجودة" };
      const updated = await db.reward.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "REWARD_UPDATED",
        entity: "REWARD",
        entityId: updated.id,
        summary: `تعديل مكافأة: ${updated.title}`,
      });
      refreshAll();
      return { ok: true, id: updated.id };
    }
    const created = await db.reward.create({ data });
    await logAudit({
      actor: admin,
      action: "REWARD_CREATED",
      entity: "REWARD",
      entityId: created.id,
      summary: `إنشاء مكافأة: ${created.title}`,
    });
    refreshAll();
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function grantReward(input: {
  rewardId: string;
  userId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    const [reward, student] = await Promise.all([
      db.reward.findUnique({ where: { id: input.rewardId } }),
      db.user.findUnique({ where: { id: input.userId }, include: { profile: true } }),
    ]);
    if (!reward) return { ok: false, error: "المكافأة غير موجودة" };
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    const existing = await db.studentReward.findUnique({
      where: { userId_rewardId: { userId: input.userId, rewardId: input.rewardId } },
    });
    if (existing && !existing.revokedAt) return { ok: false, error: "هذه المكافأة ممنوحة بالفعل لهذا الطالب" };

    await db.studentReward.upsert({
      where: { userId_rewardId: { userId: input.userId, rewardId: input.rewardId } },
      create: {
        userId: input.userId,
        rewardId: input.rewardId,
        note: input.note?.trim()?.slice(0, 300) ?? null,
        awardedById: admin.id,
      },
      update: { revokedAt: null, awardedAt: new Date(), awardedById: admin.id, note: input.note?.trim() ?? null },
    });

    // إشعار الطالب
    const { createNotificationForUsers } = await import("@/lib/notifications");
    await createNotificationForUsers({
      type: "ANNOUNCEMENT",
      title: `حصلت على ${reward.icon} ${reward.title}`,
      body: reward.description ?? "مكافأة جديدة من اللجنة — ألف مبروك!",
      target: { userIds: [input.userId] } as never,
      createdById: admin.id,
    });

    await logAudit({
      actor: admin,
      action: "REWARD_GRANTED",
      entity: "REWARD",
      entityId: input.rewardId,
      summary: `منح «${reward.title}» إلى ${student.profile?.fullName ?? student.email}`,
    });
    refreshAll();
    revalidatePath(`/admin/students/${input.userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function revokeReward(studentRewardId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    const record = await db.studentReward.findUnique({
      where: { id: studentRewardId },
      include: { reward: true, user: { include: { profile: true } } },
    });
    if (!record) return { ok: false, error: "السجل غير موجود" };
    if (record.revokedAt) return { ok: false, error: "مكافأة مسحوبة بالفعل" };

    await db.studentReward.update({ where: { id: studentRewardId }, data: { revokedAt: new Date() } });
    await logAudit({
      actor: admin,
      action: "REWARD_REVOKED",
      entity: "REWARD",
      entityId: record.rewardId,
      summary: `سحب «${record.reward.title}» من ${record.user.profile?.fullName ?? record.user.email}`,
      reason: reason ?? null,
    });
    refreshAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── الطلاب المميزون ───────────────────────────────────────

export async function setStudentFeatured(input: {
  userId: string;
  featured: boolean;
  kind?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({
      where: { id: input.userId },
      include: { profile: true },
    });
    if (!student?.profile) return { ok: false, error: "الطالب أو ملفه غير موجود" };

    if (input.featured && input.kind && !FEATURED_KINDS.some((f) => f.value === input.kind)) {
      return { ok: false, error: "نوع التمييز غير صحيح" };
    }

    await db.studentProfile.update({
      where: { userId: input.userId },
      data: {
        featured: input.featured,
        featuredKind: input.featured ? input.kind ?? "TOP_STUDENT" : null,
        featuredNote: input.featured ? input.note?.trim()?.slice(0, 160) ?? null : null,
      },
    });
    await logAudit({
      actor: admin,
      action: input.featured ? "STUDENT_FEATURED" : "STUDENT_UNFEATURED",
      entity: "STUDENT",
      entityId: input.userId,
      summary: `${input.featured ? "تمييز" : "إلغاء تمييز"} الطالب ${student.profile.fullName}`,
      after: { kind: input.kind, note: input.note ?? null },
    });
    refreshAll();
    revalidatePath(`/admin/students/${input.userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}
