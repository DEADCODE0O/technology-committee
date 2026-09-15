// ═══════════════════════════════════════════════════════════════
//  محرك الاستهداف الموحد (Audience Builder) — v5
//  واحد لكل شيء: طلبات البيانات · النقاط الجماعية · المهام
//  · الإشعارات · منشورات المجتمع · معاينة «N طالبًا سيستلمون»
//  الفلترة كلها سيرفر-side — الواجهة لا تعدّ أحجام الجمهور
// ═══════════════════════════════════════════════════════════════

import "server-only";
import { db } from "@/lib/db";

export type StudentTarget = {
  grades: string[]; // ["FIRST","SECOND",...] فارغة = الكل
  sections: string[]; // ["IS","COMMERCIAL",...] فارغة = الكل
  genders: string[]; // ["MALE","FEMALE"] فارغة = الكل
  attendance: "ANY" | "ATTENDED" | "NOT_ATTENDED";
  talent: "ANY" | "HAS" | "VERIFIED" | "NONE";
  minPoints: number | null; // حد أدنى من النقاط (المتفوقون)
  userIds: string[]; // تحديد طلاب بعينهم — يتقاطع مع باقي الشروط
  sessionId: string | null; // نطاق الجلسة (محاضرة/موعد)
  // ── v5: نطاقات أوسع ──
  runId: string | null; // مشاركو التنفيذ/الدفعة
  activityId: string | null; // المشاركون في نشاط (كل تنفيذاته)
  programId: string | null; // المشاركون في برنامج
  teamId: string | null; // أعضاء فريق
  // وضع العضوية داخل النطاق المحدد (جلسة/تنفيذ/نشاط)
  scope: "REGISTERED" | "ATTENDED";
};

export const DEFAULT_TARGET: StudentTarget = {
  grades: [],
  sections: [],
  genders: [],
  attendance: "ANY",
  talent: "ANY",
  minPoints: null,
  userIds: [],
  sessionId: null,
  runId: null,
  activityId: null,
  programId: null,
  teamId: null,
  scope: "REGISTERED",
};

const VALID_GRADES = ["FIRST", "SECOND", "THIRD", "FOURTH"];
const VALID_SECTIONS = ["IS", "COMMERCIAL", "TOURISM", "LANGS"];
const VALID_GENDERS = ["MALE", "FEMALE"];

// قراءة الفلتر من JSON بأمان (قيم غير صحيحة تُهمل)
export function parseTarget(raw: string | null | undefined): StudentTarget {
  if (!raw) return { ...DEFAULT_TARGET };
  try {
    const p = JSON.parse(raw) as Partial<StudentTarget>;
    const clean: StudentTarget = {
      grades: Array.isArray(p.grades) ? p.grades.filter((g) => VALID_GRADES.includes(g)) : [],
      sections: Array.isArray(p.sections) ? p.sections.filter((s) => VALID_SECTIONS.includes(s)) : [],
      genders: Array.isArray(p.genders) ? p.genders.filter((g) => VALID_GENDERS.includes(g)) : [],
      attendance: p.attendance === "ATTENDED" || p.attendance === "NOT_ATTENDED" ? p.attendance : "ANY",
      talent: ["HAS", "VERIFIED", "NONE"].includes(p.talent as string) ? (p.talent as StudentTarget["talent"]) : "ANY",
      minPoints: typeof p.minPoints === "number" && p.minPoints > 0 ? p.minPoints : null,
      userIds: Array.isArray(p.userIds) ? p.userIds.filter((u) => typeof u === "string") : [],
      sessionId: typeof p.sessionId === "string" && p.sessionId ? p.sessionId : null,
      runId: typeof p.runId === "string" && p.runId ? p.runId : null,
      activityId: typeof p.activityId === "string" && p.activityId ? p.activityId : null,
      programId: typeof p.programId === "string" && p.programId ? p.programId : null,
      teamId: typeof p.teamId === "string" && p.teamId ? p.teamId : null,
      scope: p.scope === "ATTENDED" ? "ATTENDED" : "REGISTERED",
    };
    return clean;
  } catch {
    return { ...DEFAULT_TARGET };
  }
}

// هل الفلتر «الكل» فعلًا؟ (لعرض ملخص نصي وللتخطي السريع)
export function isTargetEveryone(target: StudentTarget): boolean {
  return (
    target.grades.length === 0 &&
    target.sections.length === 0 &&
    target.genders.length === 0 &&
    target.attendance === "ANY" &&
    target.talent === "ANY" &&
    (target.minPoints === null || target.minPoints <= 0) &&
    target.userIds.length === 0 &&
    !target.sessionId &&
    !target.runId &&
    !target.activityId &&
    !target.programId &&
    !target.teamId
  );
}

// البحث عن معرفات الطلاب المستهدفين — كل الفلترة سيرفر-side
export async function findTargetedStudentIds(target: StudentTarget): Promise<string[]> {
  // 1) الفلتر الأساسي: حساب نشط + بيانات الملف
  const where: Record<string, unknown> = { role: "STUDENT" };
  const profileCond: Record<string, unknown> = {};
  if (target.grades.length) profileCond.grade = { in: target.grades };
  if (target.sections.length) profileCond.section = { in: target.sections };
  if (target.genders.length) profileCond.gender = { in: target.genders };
  if (Object.keys(profileCond).length) where.profile = { is: profileCond };
  if (target.userIds.length) where.id = { in: target.userIds };

  const base = await db.user.findMany({ where, select: { id: true } });
  let ids = base.map((u) => u.id);
  if (ids.length === 0) return [];

  // 2) نطاق النشاط: من شارك في أي جلسة من جلسات النشاط/البرنامج
  if (target.activityId || target.programId) {
    const sessions = await db.session.findMany({
      where: {
        activityId: target.activityId ?? undefined,
        activity: target.programId ? { programId: target.programId } : undefined,
      },
      select: { id: true },
    });
    const sessionIds = new Set(sessions.map((s) => s.id));
    if (sessionIds.size === 0) return [];
    const regs = await db.registration.findMany({
      where: { status: { in: ["REGISTERED", "WAITLISTED"] } },
      select: { sessionId: true, userId: true, attendance: true },
    });
    const inScope = new Set(
      regs
        .filter((r) => sessionIds.has(r.sessionId))
        .filter((r) =>
          target.scope === "ATTENDED"
            ? r.attendance.some((a) => a.present)
            : true
        )
        .map((r) => r.userId)
        .filter(Boolean)
    );
    ids = ids.filter((id) => inScope.has(id));
    if (ids.length === 0) return [];
  }

  // 3) نطاق التنفيذ/الدفعة
  if (target.runId) {
    const sessions = await db.session.findMany({
      where: { runId: target.runId },
      select: { id: true },
    });
    const sessionIds = new Set(sessions.map((s) => s.id));
    if (sessionIds.size === 0) return [];
    const regs = await db.registration.findMany({
      where: { sessionId: { in: [...sessionIds] }, status: { in: ["REGISTERED", "WAITLISTED"] } },
      include: { attendance: { where: { present: true } } },
    });
    const inScope = new Set(
      regs
        .filter((r) => (target.scope === "ATTENDED" ? r.attendance.length > 0 : true))
        .map((r) => r.userId)
        .filter(Boolean)
    );
    ids = ids.filter((id) => inScope.has(id));
    if (ids.length === 0) return [];
  }

  // 4) نطاق الجلسة: المسجلون/الحاضرون في محاضرة/موعد معين
  if (target.sessionId) {
    const regs = await db.registration.findMany({
      where: { sessionId: target.sessionId, status: { in: ["REGISTERED", "WAITLISTED"] } },
      include: { attendance: { where: { present: true } } },
    });
    const inSession = new Set(
      regs
        .filter((r) =>
          target.scope === "ATTENDED"
            ? r.attendance.length > 0
            : true
        )
        .map((r) => r.userId)
        .filter(Boolean)
    );
    ids = ids.filter((id) => inSession.has(id));
    if (ids.length === 0) return [];
  }

  // 5) نطاق الفريق
  if (target.teamId) {
    const members = await db.teamMember.findMany({
      where: { teamId: target.teamId },
      select: { userId: true },
    });
    const inTeam = new Set(members.map((m) => m.userId));
    ids = ids.filter((id) => inTeam.has(id));
    if (ids.length === 0) return [];
  }

  // 6) فلتر الحضور العام (حضروا / لم يحضروا أي نشاط)
  if (target.attendance !== "ANY") {
    const attendanceRows = await db.attendance.findMany({
      where: { present: true },
      select: { registration: { select: { userId: true } } },
    });
    const attended = new Set(attendanceRows.map((a) => a.registration.userId).filter(Boolean));
    ids = ids.filter((id) => (target.attendance === "ATTENDED" ? attended.has(id) : !attended.has(id)));
  }

  // 7) فلتر المواهب (لديه / موثقة / بدون)
  if (target.talent !== "ANY") {
    const talents = await db.talent.findMany({ select: { userId: true, status: true } });
    const hasAny = new Set(talents.map((t) => t.userId));
    const verified = new Set(talents.filter((t) => t.status === "VERIFIED").map((t) => t.userId));
    ids = ids.filter((id) => {
      if (target.talent === "HAS") return hasAny.has(id);
      if (target.talent === "VERIFIED") return verified.has(id);
      return !hasAny.has(id); // NONE
    });
  }

  // 8) المتفوقون: حد أدنى من النقاط
  if (target.minPoints !== null && target.minPoints > 0) {
    const grouped = await db.pointEvent.groupBy({ by: ["userId"], _sum: { points: true } });
    const sums = new Map(grouped.map((g) => [g.userId, g._sum.points ?? 0]));
    const min = target.minPoints;
    ids = ids.filter((id) => (sums.get(id) ?? 0) >= min);
  }

  return ids;
}

// وصف عربي مختصر للفلتر (يظهر في القوائم والسجلات)
export function describeTarget(
  target: StudentTarget,
  labels: {
    grade: Record<string, string>;
    section: Record<string, string>;
    gender: Record<string, string>;
  }
): string {
  if (isTargetEveryone(target)) return "كل الطلاب";
  const parts: string[] = [];
  if (target.userIds.length > 0) parts.push(`${target.userIds.length} طالبًا محددًا`);
  if (target.sessionId) parts.push(target.scope === "ATTENDED" ? "حضور الجلسة" : "مشاركو الجلسة");
  if (target.runId) parts.push(target.scope === "ATTENDED" ? "حضور التنفيذ" : "مشاركو التنفيذ");
  if (target.activityId) parts.push("مشاركو النشاط");
  if (target.programId) parts.push("مشاركو البرنامج");
  if (target.teamId) parts.push("أعضاء الفريق");
  if (target.grades.length) parts.push(target.grades.map((g) => labels.grade[g] ?? g).join(" / "));
  if (target.sections.length) parts.push(target.sections.map((s) => labels.section[s] ?? s).join(" / "));
  if (target.genders.length) parts.push(target.genders.map((g) => labels.gender[g] ?? g).join(" / "));
  if (target.attendance === "ATTENDED") parts.push("الحاضرون");
  if (target.attendance === "NOT_ATTENDED") parts.push("غير الحاضرين");
  if (target.talent === "HAS") parts.push("لديهم مواهب");
  if (target.talent === "VERIFIED") parts.push("المواهب الموثقة");
  if (target.talent === "NONE") parts.push("بدون مواهب");
  if (target.minPoints) parts.push(`نقاط ≥ ${target.minPoints}`);
  return parts.join(" · ") || "كل الطلاب";
}
