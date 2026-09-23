"use server";

// ═══════════════════════════════════════════════════════════════
//  الفرق — إنشاء/تعديل · أعضاء (قائد/عضو) · نقاط · إنجازات
//  الترتيب مجموع أحداث النقاط — كل تغيير في سجل العمليات
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";

function refreshTeams(teamId?: string) {
  revalidatePath("/admin/teams");
  revalidatePath("/leaderboard");
  if (teamId) revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/panel");
}

// ─── إنشاء / تعديل فريق ────────────────────────────────────

export async function saveTeam(input: {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    if (!input.name?.trim()) return { ok: false, error: "اسم الفريق مطلوب" };
    if (input.name.trim().length > 60) return { ok: false, error: "اسم الفريق طويل جدًا" };
    if (input.color && !/^#[0-9a-fA-F]{6}$/.test(input.color)) return { ok: false, error: "لون غير صالح" };

    const data = {
      name: input.name.trim(),
      description: input.description?.trim()?.slice(0, 400) ?? null,
      color: input.color || "#c9a45c",
      icon: (input.icon || "🛡️").slice(0, 4),
    };

    if (input.id) {
      const existing = await db.team.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "الفريق غير موجود" };
      const updated = await db.team.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "TEAM_UPDATED",
        entity: "TEAM",
        entityId: updated.id,
        summary: `تعديل فريق: ${updated.name}`,
        before: { name: existing.name },
        after: { name: updated.name },
      });
      refreshTeams(updated.id);
      return { ok: true, id: updated.id };
    }
    const created = await db.team.create({ data });
    // إنشاء غرفة شات تلقائية للفريق
    await db.chatRoom.create({
      data: {
        name: `شات فريق ${created.name}`,
        type: "TEAM",
        teamId: created.id,
        icon: created.icon || "🛡️",
        description: `المحادثة والتنسيق الداخلي لأعضاء فريق ${created.name}`,
      },
    });
    await logAudit({
      actor: admin,
      action: "TEAM_CREATED",
      entity: "TEAM",
      entityId: created.id,
      summary: `إنشاء فريق: ${created.name}`,
    });
    refreshTeams(created.id);
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function deleteTeam(teamId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const team = await db.team.findUnique({ where: { id: teamId }, include: { _count: { select: { members: true, assignments: true } } } });
    if (!team) return { ok: false, error: "الفريق غير موجود" };
    if (team._count.assignments > 0) return { ok: false, error: "لا يمكن حذف فريق له مهام جماعية — أعد تعيينها أولًا" };
    await db.team.delete({ where: { id: teamId } });
    await logAudit({
      actor: admin,
      action: "TEAM_DELETED",
      entity: "TEAM",
      entityId: teamId,
      summary: `حذف فريق: ${team.name}`,
      before: { name: team.name, members: team._count.members },
    });
    refreshTeams();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── الأعضاء ───────────────────────────────────────────────

export async function setTeamMember(input: {
  teamId: string;
  userId: string;
  role: "MEMBER" | "LEADER";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const [team, student] = await Promise.all([
      db.team.findUnique({ where: { id: input.teamId } }),
      db.user.findUnique({ where: { id: input.userId }, include: { profile: true } }),
    ]);
    if (!team) return { ok: false, error: "الفريق غير موجود" };
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    // قائد واحد: ترقية عضو لقائد تحطّم قيادة السابق
    if (input.role === "LEADER") {
      await db.teamMember.updateMany({ where: { teamId: input.teamId, role: "LEADER" }, data: { role: "MEMBER" } });
    }
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      create: { teamId: input.teamId, userId: input.userId, role: input.role },
      update: { role: input.role },
    });
    await logAudit({
      actor: admin,
      action: "TEAM_MEMBER_SET",
      entity: "TEAM",
      entityId: input.teamId,
      summary: `تعيين ${student.profile?.fullName ?? student.email} ${input.role === "LEADER" ? "قائدًا" : "عضوًا"} في «${team.name}»`,
    });
    refreshTeams(input.teamId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const member = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { team: true, user: { include: { profile: true } } },
    });
    if (!member) return { ok: false, error: "العضوية غير موجودة" };
    await db.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    await logAudit({
      actor: admin,
      action: "TEAM_MEMBER_REMOVED",
      entity: "TEAM",
      entityId: teamId,
      summary: `إزالة ${member.user.profile?.fullName ?? member.user.email} من «${member.team.name}»`,
    });
    refreshTeams(teamId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── نقاط الفريق ──────────────────────────────────────────

export async function addTeamPoints(input: {
  teamId: string;
  points: number;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    if (!input.reason?.trim()) return { ok: false, error: "سبب النقاط إلزامي" };
    if (!Number.isInteger(input.points) || input.points === 0 || Math.abs(input.points) > 1000) {
      return { ok: false, error: "النقاط عدد صحيح بين ±1000 وبغير صفر" };
    }
    const team = await db.team.findUnique({ where: { id: input.teamId } });
    if (!team) return { ok: false, error: "الفريق غير موجود" };

    await db.teamPointEvent.create({
      data: {
        teamId: input.teamId,
        points: input.points,
        reason: input.reason.trim().slice(0, 300),
        createdById: admin.id,
      },
    });
    await logAudit({
      actor: admin,
      action: "TEAM_POINTS_ADDED",
      entity: "TEAM",
      entityId: input.teamId,
      summary: `${input.points > 0 ? "+" : ""}${input.points} نقطة لفريق «${team.name}»: ${input.reason}`,
    });
    refreshTeams(input.teamId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ─── إنجازات الفريق ───────────────────────────────────────

export async function addTeamAchievement(input: {
  teamId: string;
  title: string;
  description?: string;
  icon?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    if (!input.title?.trim()) return { ok: false, error: "عنوان الإنجاز مطلوب" };
    const team = await db.team.findUnique({ where: { id: input.teamId } });
    if (!team) return { ok: false, error: "الفريق غير موجود" };
    await db.teamAchievement.create({
      data: {
        teamId: input.teamId,
        title: input.title.trim().slice(0, 120),
        description: input.description?.trim()?.slice(0, 400) ?? null,
        icon: (input.icon || "🏆").slice(0, 4),
        awardedById: admin.id,
      },
    });
    await logAudit({
      actor: admin,
      action: "TEAM_ACHIEVEMENT_ADDED",
      entity: "TEAM",
      entityId: input.teamId,
      summary: `إنجاز جديد لفريق «${team.name}»: ${input.title}`,
    });
    refreshTeams(input.teamId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// الطالب: الانضمام مفتوح أم لا؟ نتركه للإدارة (تعيين يدوي)
// — الطالب يرى فريقه فقط في لوحته
export async function getMyTeam(): Promise<{ ok: boolean; team?: unknown; error?: string }> {
  try {
    const user = await requireStudentAction();
    const membership = await db.teamMember.findFirst({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
            achievements: { orderBy: { awardedAt: "desc" } },
          },
        },
      },
    });
    return { ok: true, team: membership?.team ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر جلب الفريق" };
  }
}

// ─── إدارة فرق الورش والمحاضرات ────────────────────────────

export async function createSessionTeam(input: {
  sessionId: string;
  activityId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
  memberUserIds: string[];
  leaderUserId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    if (!input.sessionId) return { ok: false, error: "معرف الجلسة مطلوب" };
    if (!input.name?.trim()) return { ok: false, error: "اسم الفريق مطلوب" };

    let activityId = input.activityId;
    if (!activityId) {
      const sess = await db.session.findUnique({ where: { id: input.sessionId }, select: { activityId: true } });
      activityId = sess?.activityId;
    }

    const team = await db.team.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        color: input.color || "#c9a45c",
        icon: (input.icon || "🛡️").slice(0, 4),
        sessionId: input.sessionId,
        activityId: activityId || null,
        whatsappUrl: input.whatsappUrl?.trim() || null,
        telegramUrl: input.telegramUrl?.trim() || null,
      },
    });

    if (input.memberUserIds && input.memberUserIds.length > 0) {
      const membersData = input.memberUserIds.map((userId) => ({
        teamId: team.id,
        userId,
        role: input.leaderUserId === userId ? "LEADER" : "MEMBER",
      }));
      await db.teamMember.createMany({
        data: membersData,
        skipDuplicates: true,
      });
    }

    await logAudit({
      actor: admin,
      action: "TEAM_CREATED",
      entity: "TEAM",
      entityId: team.id,
      summary: `إنشاء فريق «${team.name}» في الجلسة`,
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    if (activityId) revalidatePath(`/admin/activities/${activityId}`);
    revalidatePath("/panel");

    return { ok: true, id: team.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function updateSessionTeam(input: {
  teamId: string;
  sessionId: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const team = await db.team.findUnique({ where: { id: input.teamId } });
    if (!team) return { ok: false, error: "الفريق غير موجود" };

    await db.team.update({
      where: { id: input.teamId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.color ? { color: input.color } : {}),
        ...(input.icon ? { icon: input.icon.slice(0, 4) } : {}),
        ...(input.whatsappUrl !== undefined ? { whatsappUrl: input.whatsappUrl.trim() || null } : {}),
        ...(input.telegramUrl !== undefined ? { telegramUrl: input.telegramUrl.trim() || null } : {}),
      },
    });

    await logAudit({
      actor: admin,
      action: "TEAM_UPDATED",
      entity: "TEAM",
      entityId: team.id,
      summary: `تحديث بيانات ورابط فريق «${team.name}»`,
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function deleteSessionTeam(input: {
  teamId: string;
  sessionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const team = await db.team.findUnique({ where: { id: input.teamId } });
    if (!team) return { ok: false, error: "الفريق غير موجود" };

    await db.team.delete({ where: { id: input.teamId } });

    await logAudit({
      actor: admin,
      action: "TEAM_DELETED",
      entity: "TEAM",
      entityId: input.teamId,
      summary: `حذف فريق «${team.name}» من الجلسة`,
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function addSessionTeamMember(input: {
  teamId: string;
  sessionId: string;
  userId: string;
  role?: "MEMBER" | "LEADER";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      create: { teamId: input.teamId, userId: input.userId, role: input.role || "MEMBER" },
      update: { role: input.role || "MEMBER" },
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function removeSessionTeamMember(input: {
  teamId: string;
  sessionId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    await db.teamMember.delete({
      where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function setSessionTeamLeader(input: {
  teamId: string;
  sessionId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    await db.teamMember.updateMany({
      where: { teamId: input.teamId, role: "LEADER" },
      data: { role: "MEMBER" },
    });
    await db.teamMember.update({
      where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      data: { role: "LEADER" },
    });

    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/sessions/${input.sessionId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}
