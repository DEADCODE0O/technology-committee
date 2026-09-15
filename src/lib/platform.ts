// ═══════════════════════════════════════════════════════════════
//  سجل العمليات (Audit Log) + إعدادات النظام + مساعدات النقاط
// ═══════════════════════════════════════════════════════════════

import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { levelFromPoints } from "@/lib/constants";

// ─── سجل العمليات ────────────────────────────────────────────
export async function logAudit(params: {
  actor?: SessionUser | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  details?: unknown;
  // ── v5: مركز التدقيق ──
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  correlationId?: string | null;
  success?: boolean;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actor?.id ?? null,
        actorEmail: params.actor?.email ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        summary: params.summary,
        details: params.details ? JSON.stringify(params.details) : null,
        before: params.before ? JSON.stringify(params.before) : null,
        after: params.after ? JSON.stringify(params.after) : null,
        reason: params.reason ?? null,
        correlationId: params.correlationId ?? null,
        success: params.success ?? true,
      },
    });
  } catch (err) {
    // سجل العمليات لا يوقف العمل أبدًا — نسجل الخطأ فقط
    console.error("AuditLog error:", err);
  }
}

// ─── الإعدادات (مفتاح/قيمة JSON مع قيم افتراضية) ─────────────

export type StudentCodeConfig = {
  requiredGrades: string[]; // ["SECOND","THIRD"] مثلاً — فارغة = معطل تمامًا
  pattern: string; // نمط الكود المرجعي مثل "2023105689"
  hint: string; // نص توضيحي يظهر للطالب
};

const DEFAULT_STUDENT_CODE: StudentCodeConfig = {
  requiredGrades: [], // معطل افتراضيًا — قرار المستخدم
  pattern: "^[0-9]{10}$", // صيغة 2023108888 — سنة دفعة + شهر + رقم متغير
  hint: "كود الطالب الجامعي — 10 أرقام: سنة الدفعة + شهر التقديم + رقمك — مثال: 2023108888",
};

export async function getStudentCodeConfig(): Promise<StudentCodeConfig> {
  try {
    const row = await db.setting.findUnique({ where: { key: "student_code" } });
    if (!row) return DEFAULT_STUDENT_CODE;
    const parsed = JSON.parse(row.value) as Partial<StudentCodeConfig>;
    return { ...DEFAULT_STUDENT_CODE, ...parsed };
  } catch {
    return DEFAULT_STUDENT_CODE;
  }
}

export async function saveStudentCodeConfig(config: StudentCodeConfig): Promise<void> {
  await db.setting.upsert({
    where: { key: "student_code" },
    create: { key: "student_code", value: JSON.stringify(config) },
    update: { value: JSON.stringify(config) },
  });
}

// ─── قسم المواهب (إظهار/إخفاء من الإعدادات) ──────────────────

const DEFAULT_TALENTS_SECTION = { visible: false }; // مخفي افتراضيًا — تُفعّله الإدارة من الإعدادات بعد إضافة مواهب

export async function getTalentsSectionVisible(): Promise<boolean> {
  try {
    const row = await db.setting.findUnique({ where: { key: "talents_section" } });
    if (!row) return DEFAULT_TALENTS_SECTION.visible;
    const parsed = JSON.parse(row.value) as { visible?: boolean };
    return typeof parsed.visible === "boolean" ? parsed.visible : DEFAULT_TALENTS_SECTION.visible;
  } catch {
    return DEFAULT_TALENTS_SECTION.visible;
  }
}

export async function saveTalentsSectionVisible(visible: boolean): Promise<void> {
  await db.setting.upsert({
    where: { key: "talents_section" },
    create: { key: "talents_section", value: JSON.stringify({ visible }) },
    update: { value: JSON.stringify({ visible }) },
  });
}

// ─── إطارات الصور الرمزية (إظهار/إخفاء على المنصة) ─────────
const DEFAULT_AVATAR_FRAMES_SETTING = { visible: true };

export async function getAvatarFramesVisible(): Promise<boolean> {
  try {
    const row = await db.setting.findUnique({ where: { key: "avatar_frames_visible" } });
    if (!row) return DEFAULT_AVATAR_FRAMES_SETTING.visible;
    const parsed = JSON.parse(row.value) as { visible?: boolean };
    return typeof parsed.visible === "boolean" ? parsed.visible : DEFAULT_AVATAR_FRAMES_SETTING.visible;
  } catch {
    return DEFAULT_AVATAR_FRAMES_SETTING.visible;
  }
}

export async function saveAvatarFramesVisible(visible: boolean): Promise<void> {
  await db.setting.upsert({
    where: { key: "avatar_frames_visible" },
    create: { key: "avatar_frames_visible", value: JSON.stringify({ visible }) },
    update: { value: JSON.stringify({ visible }) },
  });
}

// ─── الأوسمة والشارات (دائمة ومفعلة دائماً بناء على رغبة المستخدم) ──
export async function getBadgesVisible(): Promise<boolean> {
  return true;
}

export async function saveBadgesVisible(visible: boolean): Promise<void> {
  await db.setting.upsert({
    where: { key: "badges_visible" },
    create: { key: "badges_visible", value: JSON.stringify({ visible }) },
    update: { value: JSON.stringify({ visible }) },
  });
}

// ─── قلوب التفاعل والمستويات (إظهار/إخفاء على المنصة) ─────────
const DEFAULT_HEARTS_SETTING = { visible: true };

export async function getCharmHeartsVisible(): Promise<boolean> {
  try {
    const row = await db.setting.findUnique({ where: { key: "hearts_visible" } });
    if (!row) return DEFAULT_HEARTS_SETTING.visible;
    const parsed = JSON.parse(row.value) as { visible?: boolean };
    return typeof parsed.visible === "boolean" ? parsed.visible : DEFAULT_HEARTS_SETTING.visible;
  } catch {
    return DEFAULT_HEARTS_SETTING.visible;
  }
}

export async function saveCharmHeartsVisible(visible: boolean): Promise<void> {
  await db.setting.upsert({
    where: { key: "hearts_visible" },
    create: { key: "hearts_visible", value: JSON.stringify({ visible }) },
    update: { value: JSON.stringify({ visible }) },
  });
}

// ─── النقاط ──────────────────────────────────────────────────
export async function getStudentTotalPoints(userId: string): Promise<number> {
  try {
    const agg = await db.pointEvent.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  } catch {
    return 0;
  }
}

export async function getStudentLevel(userId: string): Promise<{ points: number; level: number }> {
  const points = await getStudentTotalPoints(userId);
  return { points, level: levelFromPoints(points) };
}

// ترتيب الطالب = 1 + عدد الطلاب الأعلى منه نقاطًا
export async function getStudentRank(userId: string): Promise<number> {
  try {
    const grouped = await db.pointEvent.groupBy({
      by: ["userId"],
      _sum: { points: true },
    });
    const myTotal = grouped.find((g) => g.userId === userId)?._sum.points ?? 0;
    const higher = grouped.filter((g) => (g._sum.points ?? 0) > myTotal).length;
    return higher + 1;
  } catch {
    return 1;
  }
}

export type LeaderboardEntry = {
  userId: string;
  fullName: string;
  grade: string;
  section: string;
  points: number;
  level: number;
  avatarUrl: string | null;
  avatarFrameId: string | null;
};

// لوحة المتصدرين — مجموعة كاملة
export async function getLeaderboard(
  from?: Date,
  limit = 50,
  seasonId?: string | null
): Promise<LeaderboardEntry[]> {
  try {
    const where: { createdAt?: { gte: Date }; seasonId?: string | null } = {};
    if (from) where.createdAt = { gte: from };
    if (seasonId !== undefined) where.seasonId = seasonId;
    const grouped = await db.pointEvent.groupBy({
      by: ["userId"],
      _sum: { points: true },
      where: Object.keys(where).length ? where : undefined,
      orderBy: { _sum: { points: "desc" } },
      take: limit,
    });
    if (grouped.length === 0) return [];
    const users = await db.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) }, role: "STUDENT", status: "ACTIVE" },
      include: { profile: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return grouped
      .map((g) => {
        const u = map.get(g.userId);
        if (!u) return null;
        const pts = g._sum.points ?? 0;
        return {
          userId: u.id,
          fullName: u.profile?.fullName ?? u.email,
          grade: u.profile?.grade ?? "",
          section: u.profile?.section ?? "",
          points: pts,
          level: levelFromPoints(pts),
          avatarUrl: u.avatarUrl ?? null,
          avatarFrameId: u.avatarFrameId ?? null,
        };
      })
      .filter(Boolean) as LeaderboardEntry[];
  } catch {
    return [];
  }
}
