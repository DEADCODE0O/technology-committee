"use server";

// ═══════════════════════════════════════════════════════════════
//  النقاط / الشارات / المواهب / الطلاب / الإعدادات — عمليات الإدارة
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { purgeCacheTag } from "@/lib/cache/data-cache";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { requireActionUser, getCurrentUser, hashPassword, verifyPassword, getSecret } from "@/lib/auth";
import { rateLimit, waitMessage } from "@/lib/rate-limit";
import { logAudit, saveStudentCodeConfig, getStudentCodeConfig } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { DEFAULT_POINT_RULES, DEFAULT_BADGES } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";
import {
  saveTalentsSectionVisible,
  getTalentsSectionVisible,
  saveAvatarFramesVisible,
  getAvatarFramesVisible,
  saveBadgesVisible,
  getBadgesVisible,
  saveCharmHeartsVisible,
  getCharmHeartsVisible,
} from "@/lib/platform";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { saveSiteTheme, type SiteThemeConfig } from "@/lib/site-themes";

// ─── النقاط ──────────────────────────────────────────────────

export async function upsertPointRule(
  action: string,
  label: string,
  points: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const pts = Number(points);
    if (!action) return { ok: false, error: "رمز القاعدة مطلوب" };
    if ((label || "").trim().length < 2) return { ok: false, error: "اسم القاعدة قصير جدًا" };
    if (!Number.isInteger(pts) || pts < 0 || pts > 1000) return { ok: false, error: "قيمة النقاط غير منطقية (0-1000)" };

    const rule = await db.pointRule.findUnique({ where: { action } });
    await db.pointRule.upsert({
      where: { action },
      create: { action, label: label.trim(), points: pts },
      update: { label: label.trim(), points: pts },
    });

    await logAudit({
      actor: admin,
      action: "POINT_RULE_SAVED",
      entity: "POINT_RULE",
      entityId: action,
      summary: `قاعدة النقاط «${label.trim()}» = ${pts} نقطة`,
      details: rule ? { before: { label: rule.label, points: rule.points, active: rule.active } } : { created: true },
    });
    revalidatePath("/admin/points");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function togglePointRule(action: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const rule = await db.pointRule.findUnique({ where: { action } });
    if (!rule) return { ok: false, error: "القاعدة غير موجودة" };
    await db.pointRule.update({ where: { action }, data: { active: !rule.active } });
    await logAudit({
      actor: admin,
      action: "POINT_RULE_TOGGLED",
      entity: "POINT_RULE",
      entityId: action,
      summary: `${rule.active ? "تعطيل" : "تفعيل"} قاعدة «${rule.label}»`,
      details: { before: { active: rule.active } },
    });
    revalidatePath("/admin/points");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// إضافة/خصم نقاط يدوي — السبب إلزامي دائمًا
export async function addPointEvent(
  userId: string,
  points: number,
  reason: string,
  sessionId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const pts = Number(points);
    const why = (reason || "").trim();
    if (!Number.isInteger(pts) || pts === 0) return { ok: false, error: "أدخل قيمة نقاط صحيحة (≠ 0)" };
    if (why.length < 3) return { ok: false, error: "سبب النقاط إلزامي — اكتب سببًا واضحًا" };

    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    const event = await db.pointEvent.create({
      data: {
        userId,
        points: pts,
        reason: why,
        sessionId: sessionId || null,
        createdById: admin.id,
      },
    });

    await logAudit({
      actor: admin,
      action: "POINTS_ADDED",
      entity: "POINT_EVENT",
      entityId: event.id,
      summary: `${pts > 0 ? "إضافة" : "خصم"} ${Math.abs(pts)} نقطة ${student.profile?.fullName ?? student.email} — ${why}`,
      details: { userId, points: pts, reason: why, sessionId: sessionId || null },
    });

    purgeCacheTag("leaderboard");
    purgeCacheTag(`user-${userId}`);
    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// حذف حدث نقاط؟ لا نحذف — نعكسه بحدث معاكس (Audit-safe)
export async function reversePointEvent(eventId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const why = (reason || "").trim();
    if (why.length < 3) return { ok: false, error: "اكتب سبب عكس النقاط" };

    const event = await db.pointEvent.findUnique({ where: { id: eventId } });
    if (!event) return { ok: false, error: "الحدث غير موجود" };

    const reverse = await db.pointEvent.create({
      data: {
        userId: event.userId,
        points: -event.points,
        reason: `عكس حدث سابق: ${why}`,
        sessionId: event.sessionId,
        createdById: admin.id,
      },
    });

    await logAudit({
      actor: admin,
      action: "POINTS_REVERSED",
      entity: "POINT_EVENT",
      entityId: eventId,
      summary: `عكس ${event.points} نقطة — ${why}`,
      details: { reverseEventId: reverse.id, userId: event.userId, points: event.points },
    });
    purgeCacheTag("leaderboard");
    purgeCacheTag(`user-${event.userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/panel");
    revalidatePath(`/admin/students/${event.userId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── الشارات ─────────────────────────────────────────────────

export async function upsertBadge(
  id: string | undefined,
  name: string,
  description: string,
  icon: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    if ((name || "").trim().length < 2) return { ok: false, error: "اسم الشارة قصير جدًا" };
    if ((description || "").trim().length < 5) return { ok: false, error: "اكتب وصفًا للشارة" };

    if (id) {
      const before = await db.badge.findUnique({ where: { id } });
      await db.badge.update({ where: { id }, data: { name: name.trim(), description: description.trim(), icon: icon || "🏆" } });
      await logAudit({
        actor: admin,
        action: "BADGE_SAVED",
        entity: "BADGE",
        entityId: id,
        summary: `حفظ شارة «${name.trim()}»`,
        details: before ? { before: { name: before.name, description: before.description, icon: before.icon, active: before.active } } : undefined,
      });
    } else {
      const badge = await db.badge.create({ data: { name: name.trim(), description: description.trim(), icon: icon || "🏆" } });
      await logAudit({
        actor: admin,
        action: "BADGE_SAVED",
        entity: "BADGE",
        entityId: badge.id,
        summary: `إنشاء شارة «${name.trim()}»`,
      });
    }
    revalidatePath("/admin/badges");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function awardBadge(userId: string, badgeId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const badge = await db.badge.findUnique({ where: { id: badgeId } });
    if (!student || !badge) return { ok: false, error: "طالب أو شارة غير موجودة" };

    const exists = await db.studentBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (exists) return { ok: false, error: "الشارة ممنوحة بالفعل" };

    await db.studentBadge.create({ data: { userId, badgeId, awardedById: admin.id } });
    await logAudit({
      actor: admin,
      action: "BADGE_AWARDED",
      entity: "STUDENT",
      entityId: userId,
      summary: `منح شارة «${badge.name}» إلى ${student.profile?.fullName ?? student.email}`,
      details: { userId, badgeId, badgeName: badge.name },
    });
    revalidatePath(`/admin/students/${userId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function revokeBadge(userId: string, badgeId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.BADGES, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const badge = await db.badge.findUnique({ where: { id: badgeId } });
    if (!student || !badge) return { ok: false, error: "طالب أو شارة غير موجودة" };

    await db.studentBadge.delete({ where: { userId_badgeId: { userId, badgeId } } });
    await logAudit({
      actor: admin,
      action: "BADGE_REVOKED",
      entity: "STUDENT",
      entityId: userId,
      summary: `سحب شارة «${badge.name}» من ${student.profile?.fullName ?? student.email}`,
      details: { userId, badgeId, badgeName: badge.name, awardedById: null },
    });
    revalidatePath(`/admin/students/${userId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── المواهب ─────────────────────────────────────────────────

export async function setTalentStatus(talentId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.TALENTS, "manage");
    if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) return { ok: false, error: "حالة غير صحيحة" };
    const talent = await db.talent.findUnique({ where: { id: talentId }, include: { user: { include: { profile: true } } } });
    if (!talent) return { ok: false, error: "الموهبة غير موجودة" };

    await db.talent.update({ where: { id: talentId }, data: { status, featured: status === "VERIFIED" ? talent.featured : false } });
    await logAudit({
      actor: admin,
      action: "TALENT_STATUS",
      entity: "TALENT",
      entityId: talentId,
      summary: `موهبة ${talent.user?.profile?.fullName ?? talent.personName ?? ""}: الحالة → ${status}`,
      details: { before: { status: talent.status, featured: talent.featured } },
    });
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function toggleTalentFeatured(talentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.TALENTS, "manage");
    const talent = await db.talent.findUnique({ where: { id: talentId }, include: { user: { include: { profile: true } } } });
    if (!talent) return { ok: false, error: "الموهبة غير موجودة" };
    if (talent.status !== "VERIFIED" && !talent.featured) {
      return { ok: false, error: "وثّق الموهبة أولًا قبل تمييزها" };
    }

    await db.talent.update({ where: { id: talentId }, data: { featured: !talent.featured } });
    await logAudit({
      actor: admin,
      action: "TALENT_FEATURED",
      entity: "TALENT",
      entityId: talentId,
      summary: `${talent.featured ? "إلغاء تمييز" : "تمييز"} موهبة ${talent.user?.profile?.fullName ?? talent.personName ?? ""}`,
      details: { before: { featured: talent.featured } },
    });
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── المواهب: الإدارة هي التي تضيف وتعدل وتحذف ───────────────

export type TalentAdminInput = {
  id?: string;
  userId?: string; // طالب مسجل (اختياري)
  personName?: string; // اسم حر عندما لا يوجد حساب
  personGrade?: string;
  personSection?: string;
  category: string;
  name: string;
  customName?: string;
  description?: string;
  portfolioUrl?: string;
  imageUrl?: string; // رابط درايف «أي شخص لديه الرابط» أو أي رابط أو رابط رفع على السيرفر
  featured?: boolean;
};

function validateTalentInput(input: TalentAdminInput): { ok: boolean; error?: string } {
  if (!["PERFORMING", "SPORTS", "OTHER"].includes(input.category)) return { ok: false, error: "تصنيف الموهبة غير صحيح" };
  if (!input.name) return { ok: false, error: "اختر الموهبة" };
  if (input.name === "OTHER" && (input.customName || "").trim().length < 2) return { ok: false, error: "اكتب اسم الموهبة" };
  if (!input.userId && (input.personName || "").trim().length < 3) return { ok: false, error: "اختر طالبًا مسجلًا أو اكتب الاسم الحر (3 أحرف على الأقل)" };
  if (input.portfolioUrl && /^javascript:/i.test(input.portfolioUrl.trim())) return { ok: false, error: "رابط غير صالح" };
  if (input.imageUrl && /^javascript:/i.test(input.imageUrl.trim())) return { ok: false, error: "رابط الصورة غير صالح" };
  return { ok: true };
}

function talentInputData(input: TalentAdminInput) {
  return {
    userId: input.userId || null,
    personName: (input.personName || "").trim() || null,
    personGrade: (input.personGrade || "").trim() || null,
    personSection: (input.personSection || "").trim() || null,
    category: input.category,
    name: input.name,
    customName: input.name === "OTHER" ? (input.customName || "").trim() || null : null,
    description: (input.description || "").trim() || null,
    portfolioUrl: input.portfolioUrl?.trim() ? safeExternalUrl(input.portfolioUrl.trim()) : null,
    imageUrl: input.imageUrl?.trim() ? safeExternalUrl(input.imageUrl.trim()) : null,
    // مواهب الإدارة تُنشأ موثقة مباشرة — الظهور العام يقرره «تمييز»
    status: "VERIFIED",
    featured: !!input.featured,
  };
}

export async function createTalentAdmin(input: TalentAdminInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.TALENTS, "manage");
    const check = validateTalentInput(input);
    if (!check.ok) return { ok: false, error: check.error };

    if (input.userId) {
      const student = await db.user.findUnique({ where: { id: input.userId }, include: { profile: true } });
      if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };
    }

    const talent = await db.talent.create({ data: talentInputData(input) });
    await logAudit({
      actor: admin,
      action: "TALENT_CREATED",
      entity: "TALENT",
      entityId: talent.id,
      summary: `إضافة موهبة «${input.name === "OTHER" ? input.customName : input.category}» لـ ${input.userId ? "طالب مسجل" : (input.personName || "").trim()}`,
      details: { before: null, talent: talentInputData(input) },
    });
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    revalidatePath("/welcome");
    return { ok: true, id: talent.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function updateTalentAdmin(input: TalentAdminInput & { id: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.TALENTS, "manage");
    const check = validateTalentInput(input);
    if (!check.ok) return { ok: false, error: check.error };

    const existing = await db.talent.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, error: "الموهبة غير موجودة" };

    await db.talent.update({ where: { id: input.id }, data: talentInputData(input) });
    await logAudit({
      actor: admin,
      action: "TALENT_UPDATED",
      entity: "TALENT",
      entityId: input.id,
      summary: `تعديل موهبة (تصنيف: ${input.category})`,
      details: { before: { category: existing.category, name: existing.name, imageUrl: existing.imageUrl, featured: existing.featured }, after: talentInputData(input) },
    });
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    revalidatePath("/welcome");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteTalentAdmin(talentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.TALENTS, "manage");
    const existing = await db.talent.findUnique({ where: { id: talentId } });
    if (!existing) return { ok: false, error: "الموهبة غير موجودة" };

    await db.talent.delete({ where: { id: talentId } });
    await logAudit({
      actor: admin,
      action: "TALENT_DELETED",
      entity: "TALENT",
      entityId: talentId,
      summary: `حذف موهبة «${existing.name === "OTHER" ? existing.customName ?? "أخرى" : existing.name}»`,
      details: { before: { category: existing.category, name: existing.name, userId: existing.userId, imageUrl: existing.imageUrl } },
    });
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    revalidatePath("/welcome");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// إظهار/إخفاء قسم المواهب كله (من الإعدادات)
export async function setTalentsSectionVisibleAction(visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    await saveTalentsSectionVisible(!!visible);
    await logAudit({
      actor: admin,
      action: "SETTINGS_TALENTS_SECTION",
      entity: "SETTINGS",
      entityId: "talents_section",
      summary: visible ? "تفعيل قسم المواهب للطلاب" : "إخفاء قسم المواهب عن الطلاب",
      details: { before: null, visible: !!visible },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/talents");
    revalidatePath("/talents");
    revalidatePath("/welcome");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function getTalentsSectionVisibleAction(): Promise<{ ok: boolean; visible: boolean }> {
  return { ok: true, visible: await getTalentsSectionVisible() };
}

// ─── التحكم في ظهور إطارات الصور الرمزية على مستوى المنصة ────
export async function setAvatarFramesVisibleAction(visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    await saveAvatarFramesVisible(!!visible);
    await logAudit({
      actor: admin,
      action: "SETTINGS_AVATAR_FRAMES_VISIBLE",
      entity: "SETTINGS",
      entityId: "avatar_frames_visible",
      summary: visible ? "تفعيل ظهور إطارات الصور الرمزية على المنصة" : "إخفاء إطارات الصور الرمزية عن المنصة",
      details: { visible: !!visible },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    revalidatePath("/community");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function getAvatarFramesVisibleAction(): Promise<{ ok: boolean; visible: boolean }> {
  return { ok: true, visible: await getAvatarFramesVisible() };
}

// ─── التحكم في ظهور الأوسمة على مستوى المنصة ─────────────────
export async function setBadgesVisibleAction(visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    await saveBadgesVisible(!!visible);
    await logAudit({
      actor: admin,
      action: "SETTINGS_BADGES_VISIBLE",
      entity: "SETTINGS",
      entityId: "badges_visible",
      summary: visible ? "تفعيل ظهور الأوسمة على المنصة" : "إخفاء الأوسمة عن المنصة",
      details: { visible: !!visible },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── التحكم في ظهور قلوب التفاعل والمستويات على مستوى المنصة ─
export async function setCharmHeartsVisibleAction(visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    await saveCharmHeartsVisible(!!visible);
    await logAudit({
      actor: admin,
      action: "SETTINGS_HEARTS_VISIBLE",
      entity: "SETTINGS",
      entityId: "hearts_visible",
      summary: visible ? "تفعيل ظهور قلوب التفاعل والمستويات على المنصة" : "إخفاء قلوب التفاعل عن المنصة",
      details: { visible: !!visible },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/profile");
    revalidatePath("/community");
    revalidatePath("/leaderboard");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── إدارة الطلاب ────────────────────────────────────────────

export async function toggleStudentStatus(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };
    if (student.status === "SUSPENDED" && student.email === admin.email) {
      return { ok: false, error: "لا يمكنك تعليق حسابك" };
    }

    const next = student.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await db.user.update({ where: { id: userId }, data: { status: next } });

    if (next === "ACTIVE" && isSupabaseConfigured()) {
      const supaAdmin = getSupabaseAdmin();
      if (supaAdmin) {
        await supaAdmin.auth.admin.updateUserById(userId, { email_confirm: true }).catch(() => {});
      }
    }

    await logAudit({
      actor: admin,
      action: "STUDENT_STATUS",
      entity: "STUDENT",
      entityId: userId,
      summary: `${next === "SUSPENDED" ? "تعليق" : "تنشيط"} حساب ${student.profile?.fullName ?? student.email}`,
      details: { userId, before: student.status },
    });
    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${userId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تفعيل حساب الطالب يدويًا ومباشرة من الإدارة ───────────────
export async function verifyStudentDirectlyAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    await db.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    if (isSupabaseConfigured()) {
      const supaAdmin = getSupabaseAdmin();
      if (supaAdmin) {
        await supaAdmin.auth.admin.updateUserById(userId, { email_confirm: true }).catch(() => {});
      }
    }

    await logAudit({
      actor: admin,
      action: "MANUAL_STUDENT_VERIFY",
      entity: "STUDENT",
      entityId: userId,
      summary: `تفعيل يدوي مباشر لحساب الطالب ${student.profile?.fullName ?? student.email}`,
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${userId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── إعادة إرسال رمز الـ OTP للطالب من الإدارة ───────────────
export async function resendStudentOtpAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({ where: { id: userId } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    if (!isSupabaseConfigured()) {
      return { ok: true };
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "خدمة المصادقة غير متصلة" };

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: student.email,
    });

    if (error) {
      return { ok: false, error: error.message || "تعذر إعادة إرسال الرمز" };
    }

    await logAudit({
      actor: admin,
      action: "RESEND_STUDENT_OTP",
      entity: "STUDENT",
      entityId: userId,
      summary: `إعادة إرسال رمز OTP للطالب ${student.email}`,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── محاكاة حساب الطالب والدخول المباشر (Impersonation) ─────────
export async function impersonateStudentAction(userId: string): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!student || student.role !== "STUDENT") {
      return { ok: false, error: "الطالب غير موجود" };
    }
    if (student.status === "SUSPENDED") {
      return { ok: false, error: "لا يمكن محاكاة حساب طالب معلق" };
    }

    const token = await new SignJWT({
      adminId: admin.id,
      targetUserId: student.id,
      adminEmail: admin.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // ساعتان للمعاينة
      .sign(getSecret());

    const store = await cookies();
    store.set("tc_impersonate", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60,
    });

    await logAudit({
      actor: admin,
      action: "ADMIN_IMPERSONATE_STUDENT",
      entity: "STUDENT",
      entityId: student.id,
      summary: `بدء جلسة معاينة لحساب الطالب: ${student.profile?.fullName ?? student.email}`,
      details: { studentId: student.id, studentEmail: student.email },
    });

    revalidatePath("/", "layout");
    return { ok: true, redirectTo: "/panel" };
  } catch (err) {
    console.error("impersonateStudentAction error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function stopImpersonationAction(): Promise<{ ok: boolean; redirectTo?: string }> {
  try {
    const store = await cookies();
    store.delete("tc_impersonate");
    revalidatePath("/", "layout");
    return { ok: true, redirectTo: "/admin/students" };
  } catch (err) {
    console.error("stopImpersonationAction error:", err);
    return { ok: false };
  }
}

// إعادة تعيين كلمة سر طالب — كلمة مؤقتة تظهر مرة واحدة أو مخصصة
export async function resetStudentPassword(
  userId: string,
  customPassword?: string
): Promise<{ ok: boolean; error?: string; tempPassword?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    const cleanCustom = (customPassword || "").trim();
    if (cleanCustom && cleanCustom.length < 8) {
      return { ok: false, error: "كلمة السر المخصصة يجب أن تكون 8 أحرف على الأقل" };
    }

    const finalPassword = cleanCustom || `TC${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}!`;

    if (isSupabaseConfigured()) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) return { ok: false, error: "مفتاح Supabase الإداري غير مضبوط على السيرفر" };
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: finalPassword,
        email_confirm: true,
      });
      if (error) {
        console.error("updateUserById error in resetStudentPassword:", error);
        return { ok: false, error: "تعذر تحديث كلمة السر في Supabase Auth: " + error.message };
      }
      await db.user.update({
        where: { id: userId },
        data: {
          passwordHash: null,
          provider: student.provider === "FACEBOOK" ? "EMAIL" : student.provider,
        },
      });
    } else {
      await db.user.update({
        where: { id: userId },
        data: {
          passwordHash: await hashPassword(finalPassword),
          provider: student.provider === "FACEBOOK" ? "EMAIL" : student.provider,
        },
      });
    }

    await logAudit({
      actor: admin,
      action: "PASSWORD_RESET",
      entity: "STUDENT",
      entityId: userId,
      summary: `تعيين كلمة سر جديدة للطالب ${student.profile?.fullName ?? student.email}`,
    });
    revalidatePath(`/admin/students/${userId}`);
    revalidatePath("/admin/students");
    return { ok: true, tempPassword: finalPassword };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// تغيير كلمة السر الخاصة (للطالب نفسه)
// مستخدم Google بلا كلمة سر؟ — يحدد كلمة سر جديدة مباشرة
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.status === "SUSPENDED") return { ok: false, error: "حسابك معلق — تواصل مع إدارة اللجنة" };

    // حماية من تخمين كلمة السر الحالية (5 محاولات لكل 15 دقيقة)
    const limit = rateLimit(`change-pw:${user.id}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return { ok: false, error: waitMessage(limit.retryAfterSec) };

    if ((newPassword || "").length < 8) return { ok: false, error: "كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل" };

    const full = await db.user.findUnique({ where: { id: user.id } });
    if (!full) return { ok: false, error: "الحساب غير موجود" };

    // ══ وضع Supabase: كلمة السر تُدار في Supabase Auth — لا تُخزن محليًا ══
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { ok: false, error: "تعذر التحديث — حاول مرة أخرى" };

      // مستخدم Google لم يعيّن كلمة سر بعد؟ يعيّنها أول مرة بلا تحقق من الحالية
      // (لا توجد كلمة حالية أصلًا) — وإلا نتحقق من الحالية عبر دخول تحقّقي
      if (full.passwordHash || full.provider !== "GOOGLE") {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user?.email) {
          return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
        }
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: authData.user.email,
          password: currentPassword || "",
        });
        if (verifyErr) return { ok: false, error: "كلمة السر الحالية غير صحيحة" };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const msg = error.message ?? "";
        if (/same password/i.test(msg)) {
          return { ok: false, error: "الكلمة الجديدة مطابقة للقديمة — اختر كلمة مختلفة" };
        }
        console.error("changeMyPassword supabase error:", error);
        return { ok: false, error: "تعذر تحديث كلمة السر — حاول مرة أخرى" };
      }

      // إشارة محلية: صار لديه كلمة سر (حسابات Google تصبح قابلة للدخول بالبريد)
      await db.user.update({
        where: { id: full.id },
        data: full.provider === "GOOGLE" ? { provider: "EMAIL" } : {},
      });

      await logAudit({
        actor: user,
        action: "PASSWORD_CHANGED",
        entity: "USER",
        entityId: user.id,
        summary: "المستخدم غيّر كلمة سره (Supabase Auth)",
      });
      return { ok: true };
    }

    // ══ وضع التطوير المحلي: bcrypt محلي ══
    // لديه كلمة سر؟ — نتحقق من الحالية. مستخدم Google جديد؟ — يعيّن أولًا بدون تحقق
    if (full.passwordHash) {
      const valid = await verifyPassword(currentPassword || "", full.passwordHash);
      if (!valid) return { ok: false, error: "كلمة السر الحالية غير صحيحة" };
    }

    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await logAudit({
      actor: user,
      action: "PASSWORD_CHANGED",
      entity: "USER",
      entityId: user.id,
      summary: "المستخدم غيّر كلمة سره",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── الإعدادات ───────────────────────────────────────────────

export async function saveStudentCodeSettings(requiredGrades: string[], pattern: string, hint: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    const current = await getStudentCodeConfig();
    await saveStudentCodeConfig({
      requiredGrades: requiredGrades.filter((g) => ["FIRST", "SECOND", "THIRD", "FOURTH"].includes(g)),
      pattern: (pattern || current.pattern).trim(),
      hint: (hint || current.hint).trim(),
    });
    await logAudit({
      actor: admin,
      action: "SETTINGS_SAVED",
      entity: "SETTING",
      entityId: "student_code",
      summary: `تحديث إعدادات كود الطالب — مطلوب للفرق: ${requiredGrades.length ? requiredGrades.join(", ") : "لا شيء (معطل)"}`,
      details: {
        before: current,
        after: { requiredGrades, pattern, hint },
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/register");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تهيئة البيانات الافتراضية (قواعد النقاط والشارات) ───────

export async function ensureDefaults(): Promise<void> {
  const rulesCount = await db.pointRule.count();
  if (rulesCount === 0) {
    await db.pointRule.createMany({ data: DEFAULT_POINT_RULES.map((r) => ({ ...r, active: true })) });
  }
  const badgesCount = await db.badge.count();
  if (badgesCount === 0) {
    await db.badge.createMany({ data: DEFAULT_BADGES });
  }
}

// ─── إدارة ثيمات ومناسبات المنصة ─────────────────────────────

export async function updateSiteThemeSettings(
  config: Partial<SiteThemeConfig>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.SETTINGS, "manage");
    const updated = await saveSiteTheme(config);
    await logAudit({
      actor: admin,
      action: "SITE_THEME_UPDATED",
      entity: "SETTING",
      entityId: "site_theme",
      summary: `تحديث ثيم المنصة إلى: «${updated.themeId}»`,
      details: updated,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── حذف حساب طالب نهائياً من المنصة وسيرفر Supabase ─────────
export async function deleteStudentPermanently(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    if (!userId) return { ok: false, error: "معرّف الطالب مطلوب" };
    if (admin.id === userId) return { ok: false, error: "لا يمكنك حذف حسابك الحالي" };

    // البحث عن المستخدم بمرونة (عبر الـ ID أو البريد الإلكتروني)
    let targetUser = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId.includes("@") ? userId.trim().toLowerCase() : undefined },
          { googleId: userId },
        ].filter(Boolean) as any,
      },
      include: { profile: true },
    });

    // إذا لم يُعثر عليه في قاعدة بيانات التطبيق، نتحقق من سيرفر Supabase Auth
    if (!targetUser && isSupabaseConfigured()) {
      const supaAdmin = getSupabaseAdmin();
      if (supaAdmin) {
        const { data: supaUser } = await supaAdmin.auth.admin.getUserById(userId).catch(() => ({ data: null }));
        const emailToFind = supaUser?.user?.email;
        if (emailToFind) {
          const userByEmail = await db.user.findUnique({
            where: { email: emailToFind.toLowerCase() },
            include: { profile: true },
          });
          if (userByEmail) {
            targetUser = userByEmail;
          } else {
            // موجود فقط في Supabase Auth وليس له صف في Prisma — نحذفه فوراً لتنظيف السيرفر
            await supaAdmin.auth.admin.deleteUser(userId);
            return { ok: true };
          }
        }
      }
    }

    if (!targetUser) return { ok: false, error: "الحساب غير موجود بالفعل" };
    if (targetUser.role !== "STUDENT") {
      return { ok: false, error: "يمكن فقط حذف حسابات الطلاب عبر هذه الخاصية" };
    }

    const dbUserId = targetUser.id;
    const studentName = targetUser.profile?.fullName || targetUser.email;

    // 1. حذف المستخدم من Supabase Auth
    if (isSupabaseConfigured()) {
      const supaAdmin = getSupabaseAdmin();
      if (supaAdmin) {
        await supaAdmin.auth.admin.deleteUser(dbUserId).catch(() => {});
      }
    }

    // 2. تنظيف جميع العلاقات والسجلات الـ 31 المرتبطة بالطالب داخل معاملة ذرية لضمان سلامة القيود
    await db.$transaction(async (tx) => {
      // الحضور والتسجيلات
      await tx.attendance.deleteMany({ where: { registration: { userId: dbUserId } } });
      await tx.attendance.updateMany({ where: { markedById: dbUserId }, data: { markedById: null } });
      await tx.registration.deleteMany({ where: { userId: dbUserId } });

      // النقاط والشارات والمكافآت
      await tx.pointEvent.deleteMany({ where: { OR: [{ userId: dbUserId }, { createdById: dbUserId }] } });
      await tx.studentBadge.deleteMany({ where: { userId: dbUserId } });
      await tx.studentReward.deleteMany({ where: { OR: [{ userId: dbUserId }, { awardedById: dbUserId }] } });

      // طلبات البيانات والردود
      await tx.studentData.deleteMany({ where: { userId: dbUserId } });
      await tx.dataResponse.deleteMany({ where: { userId: dbUserId } });
      await tx.dataRequest.deleteMany({ where: { createdById: dbUserId } });

      // الإشعارات وقراءاتها (الحل الجذري لخطأ Notification_createdById_fkey)
      await tx.notificationRead.deleteMany({ where: { userId: dbUserId } });
      await tx.notification.deleteMany({ where: { createdById: dbUserId } });

      // المهام والتقييمات
      await tx.taskSubmission.deleteMany({ where: { assignment: { userId: dbUserId } } });
      await tx.taskSubmission.updateMany({ where: { evaluatedById: dbUserId }, data: { evaluatedById: null } });
      await tx.taskAssignment.deleteMany({ where: { userId: dbUserId } });
      await tx.task.deleteMany({ where: { createdById: dbUserId } });

      // الفرق والمغامرات
      await tx.teamPointEvent.deleteMany({ where: { createdById: dbUserId } });
      await tx.teamMember.deleteMany({ where: { userId: dbUserId } });
      await tx.questProgress.deleteMany({ where: { userId: dbUserId } });

      // المجتمع والتفاعلات
      await tx.comment.deleteMany({ where: { userId: dbUserId } });
      await tx.postReaction.deleteMany({ where: { userId: dbUserId } });
      await tx.communityPost.deleteMany({ where: { createdById: dbUserId } });

      // المنظومة الاجتماعية الكاملة (الصداقات، الرسائل، الشات، المنشورات، البلاغات)
      await tx.friendship.deleteMany({ where: { OR: [{ senderId: dbUserId }, { receiverId: dbUserId }] } });
      await tx.directMessage.deleteMany({ where: { OR: [{ senderId: dbUserId }, { receiverId: dbUserId }] } });
      await tx.chatMessage.deleteMany({ where: { userId: dbUserId } });
      await tx.dailyStreak.deleteMany({ where: { userId: dbUserId } });
      await tx.studentPostReaction.deleteMany({ where: { userId: dbUserId } });
      await tx.studentPost.deleteMany({ where: { userId: dbUserId } });
      await tx.report.deleteMany({ where: { OR: [{ reporterId: dbUserId }, { entityId: dbUserId }] } });

      // الأصول والمواهب والملف الشخصي
      await tx.mediaAsset.deleteMany({ where: { createdById: dbUserId } });
      await tx.driveAsset.deleteMany({ where: { createdById: dbUserId } });
      await tx.talent.deleteMany({ where: { userId: dbUserId } });
      await tx.studentProfile.deleteMany({ where: { userId: dbUserId } });

      // وأخيراً: حذف المستخدم
      await tx.user.delete({ where: { id: dbUserId } });
    });

    await logAudit({
      actor: admin,
      action: "STUDENT_DELETED_PERMANENTLY",
      entity: "STUDENT",
      entityId: dbUserId,
      summary: `حذف حساب الطالب نهائياً من المنصة وسيرفر Supabase: «${studentName}» (${targetUser.email})`,
      details: { email: targetUser.email, name: studentName },
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${dbUserId}`);
    return { ok: true };
  } catch (err) {
    console.error("deleteStudentPermanently error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "حدث خطأ أثناء حذف الحساب" };
  }
}

// ─── إحصائيات وعينات تصدير جهات اتصال الطلاب للهاتف ───────────
export async function getContactsExportStatsAction(): Promise<{
  ok: boolean;
  error?: string;
  stats?: {
    totalStudents: number;
    totalWithPhone: number;
    maleCount: number;
    femaleCount: number;
    activeCount: number;
    pendingCount: number;
    samples: {
      id: string;
      fullName: string;
      phone: string;
      grade: string | null;
      section: string | null;
      gender: string | null;
      email: string;
      status: string;
    }[];
  };
}> {
  try {
    await requireActionUser(MODULES.STUDENTS, "manage");

    const [totalStudents, totalWithPhone, maleCount, femaleCount, activeCount, pendingCount, sampleMales, sampleFemales] = await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "STUDENT", profile: { phone: { not: "" } } } }),
      db.user.count({ where: { role: "STUDENT", profile: { phone: { not: "" }, gender: "MALE" } } }),
      db.user.count({ where: { role: "STUDENT", profile: { phone: { not: "" }, gender: "FEMALE" } } }),
      db.user.count({ where: { role: "STUDENT", status: "ACTIVE", profile: { phone: { not: "" } } } }),
      db.user.count({ where: { role: "STUDENT", status: "PENDING_VERIFICATION", profile: { phone: { not: "" } } } }),
      db.user.findMany({
        where: { role: "STUDENT", profile: { phone: { not: "" }, gender: "MALE" } },
        take: 2,
        select: {
          id: true,
          email: true,
          status: true,
          profile: { select: { fullName: true, phone: true, grade: true, section: true, gender: true } },
        },
      }),
      db.user.findMany({
        where: { role: "STUDENT", profile: { phone: { not: "" }, gender: "FEMALE" } },
        take: 2,
        select: {
          id: true,
          email: true,
          status: true,
          profile: { select: { fullName: true, phone: true, grade: true, section: true, gender: true } },
        },
      }),
    ]);

    const samples = [...sampleMales, ...sampleFemales].map((s) => ({
      id: s.id,
      fullName: s.profile?.fullName || s.email,
      phone: s.profile?.phone || "",
      grade: s.profile?.grade || null,
      section: s.profile?.section || null,
      gender: s.profile?.gender || null,
      email: s.email,
      status: s.status,
    }));

    return {
      ok: true,
      stats: {
        totalStudents,
        totalWithPhone,
        maleCount,
        femaleCount,
        activeCount,
        pendingCount,
        samples,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}



