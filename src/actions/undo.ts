"use server";

// ═══════════════════════════════════════════════════════════════
//  نظام التراجع — التراجع عن أي عملية إدارية من سجل العمليات
//  كل عملية إدارية تخزن «نسخة ما قبل التنفيذ» في سجل العمليات،
//  وهنا نعيد الحالة كما كانت: تعديلات، نقاط، حالات، صلاحيات…
//  التراجع نفسه يُسجّل (ACTION_UNDONE) — التاريخ لا يُمسح أبدًا.
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, saveStudentCodeConfig } from "@/lib/platform";
import { UNDOABLE_ACTIONS } from "@/lib/undo-registry";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId?: string | null;
  summary: string;
  details: string | null;
};

type Details = Record<string, unknown>;

function parseDetails(raw: string | null): Details {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Details;
  } catch {
    return {};
  }
}

// ─── منع التراجع المزدوج ─────────────────────────────────────

async function alreadyUndone(auditId: string): Promise<boolean> {
  const undo = await db.auditLog.findFirst({
    where: { action: "ACTION_UNDONE", entityId: auditId },
    select: { id: true },
  });
  return !!undo;
}

async function refreshAll() {
  for (const p of [
    "/",
    "/activities",
    "/notifications",
    "/leaderboard",
    "/talents",
    "/panel",
    "/profile",
    "/admin",
    "/admin/activities",
    "/admin/programs",
    "/admin/students",
    "/admin/points",
    "/admin/badges",
    "/admin/talents",
    "/admin/admins",
    "/admin/audit",
    "/admin/data-requests",
    "/admin/notifications",
    "/admin/drive",
    "/admin/settings",
  ]) {
    revalidatePath(p);
  }
}

// ─── البرامج ─────────────────────────────────────────────────

async function undoProgramSaved(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as { name: string; description: string | null; icon: string; color: string; status: string; order: number } | undefined;
  if (!id) throw new Error("معرف البرنامج مفقود");
  if (!before) {
    // برنامج جديد → التراجع = حذفه إن لم يضم أنشطة
    const used = await db.activity.count({ where: { programId: id } });
    if (used > 0) throw new Error("البرنامج يضم أنشطة — لا يمكن حذفه بالتراجع");
    await db.program.delete({ where: { id } });
    return;
  }
  const exists = await db.program.findUnique({ where: { id } });
  if (!exists) throw new Error("البرنامج غير موجود الآن");
  await db.program.update({
    where: { id },
    data: { name: before.name, description: before.description, icon: before.icon, color: before.color, status: before.status, order: before.order },
  });
}

async function undoProgramDeleted(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as { name: string; description: string | null; icon: string; color: string; status: string; order: number } | undefined;
  if (!before) throw new Error("لا توجد نسخة محفوظة للبرنامج المحذوف");
  await db.program.create({
    data: {
      id: log.entityId ?? undefined,
      name: before.name, description: before.description, icon: before.icon,
      color: before.color ?? "#c9a45c", status: before.status ?? "ACTIVE", order: before.order ?? 0,
    },
  });
}

// ─── الأنشطة ─────────────────────────────────────────────────

async function undoActivitySaved(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as Record<string, unknown> | undefined;
  if (!id || !before) throw new Error("لا توجد نسخة سابقة محفوظة لهذه العملية");
  const exists = await db.activity.findUnique({ where: { id } });
  if (!exists) throw new Error("النشاط غير موجود الآن");

  await db.activity.update({
    where: { id },
    data: {
      type: (before.type as string) ?? exists.type,
      programId: (before.programId as string | null) ?? null,
      title: before.title as string,
      teaser: (before.teaser as string | null) ?? null,
      description: before.description as string,
      image: (before.image as string | null) ?? null,
      presenter: (before.presenter as string | null) ?? null,
      level: (before.level as string | null) ?? null,
      publish: (before.publish as string) ?? exists.publish,
    },
  });
}

async function undoActivityCreated(log: AuditRow): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف النشاط مفقود");
  const sessions = await db.session.findMany({ where: { activityId: id }, include: { _count: { select: { registrations: true } } } });
  const totalRegs = sessions.reduce((s, x) => s + x._count.registrations, 0);
  if (totalRegs > 0) {
    throw new Error("أصبح على النشاط تسجيلات — لا يمكن حذفه بالتراجع؛ أرشفه بدلًا من ذلك");
  }
  await db.activity.delete({ where: { id } });
}

async function undoActivityDeleted(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as Record<string, unknown> | undefined;
  const sessions = (d.sessions as Record<string, unknown>[] | undefined) ?? [];
  const fields = (d.fields as { label: string; type: string; options: string | null; required: boolean; order: number }[] | undefined) ?? [];
  if (!before) throw new Error("لا توجد نسخة محفوظة للنشاط المحذوف");

  const activity = await db.activity.create({
    data: {
      id: log.entityId ?? undefined,
      type: (before.type as string) ?? "WORKSHOP",
      programId: (before.programId as string | null) ?? null,
      title: before.title as string,
      teaser: (before.teaser as string | null) ?? null,
      description: before.description as string,
      image: (before.image as string | null) ?? null,
      presenter: (before.presenter as string | null) ?? null,
      level: (before.level as string | null) ?? null,
      publish: (before.publish as string) ?? "DRAFT",
    },
  });
  // استعادة الجلسات (محاضرات/مواعيد الورش)
  for (const [i, x] of sessions.entries()) {
    await db.session.create({
      data: {
        activityId: activity.id,
        order: (x.order as number) ?? i + 1,
        title: (x.title as string) ?? "جلسة",
        location: (x.location as string | null) ?? null,
        seats: (x.seats as number) ?? 50,
        startsAt: new Date((x.startsAt as string) ?? Date.now()),
        endsAt: x.endsAt ? new Date(x.endsAt as string) : null,
        registrationOpensAt: x.registrationOpensAt ? new Date(x.registrationOpensAt as string) : null,
        registrationClosesAt: x.registrationClosesAt ? new Date(x.registrationClosesAt as string) : null,
        closingMode: (x.closingMode as string) ?? "EITHER",
        registrationOpen: (x.registrationOpen as boolean) ?? true,
        allowGuests: (x.allowGuests as boolean) ?? true,
        qrToken: (x.qrToken as string | null) ?? undefined,
      },
    });
  }
  // أسئلة التسجيل على مستوى النشاط
  if (fields.length > 0) {
    await db.formField.createMany({
      data: fields.map((f) => ({
        activityId: activity.id, label: f.label, type: f.type, options: f.options, required: f.required, order: f.order,
      })),
    });
  }
}

// ─── الجلسات (محاضرة/موعد ورشة) ──────────────────────────────

async function undoSessionUpdated(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as Record<string, unknown> | undefined;
  const id = log.entityId;
  if (!id) throw new Error("معرف الجلسة مفقود");
  const exists = await db.session.findUnique({ where: { id } });
  if (!exists) throw new Error("الجلسة غير موجودة الآن — لا يمكن التراجع");
  if (!before) {
    // كانت جلسة جديدة → التراجع = حذفها إن لم يسجل عليها أحد
    const regs = await db.registration.count({ where: { sessionId: id } });
    if (regs > 0) throw new Error("أصبح على الجلسة تسجيلات — لا يمكن حذفها بالتراجع");
    await db.session.delete({ where: { id } });
    return;
  }

  await db.session.update({
    where: { id },
    data: {
      title: (before.title as string) ?? exists.title,
      startsAt: before.startsAt ? new Date(before.startsAt as string) : exists.startsAt,
      endsAt: before.endsAt ? new Date(before.endsAt as string) : (before.endsAt === null ? null : exists.endsAt),
      location: (before.location as string | null) ?? null,
      seats: (before.seats as number) ?? exists.seats,
      registrationOpensAt: before.registrationOpensAt ? new Date(before.registrationOpensAt as string) : null,
      registrationClosesAt: before.registrationClosesAt ? new Date(before.registrationClosesAt as string) : null,
      closingMode: (before.closingMode as string) ?? "EITHER",
      registrationOpen: (before.registrationOpen as boolean) ?? true,
      status: (before.status as string) ?? "SCHEDULED",
    },
  });
}

async function undoSessionRegistrationToggled(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as { registrationOpen: boolean } | undefined;
  const id = log.entityId;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const exists = await db.session.findUnique({ where: { id } });
  if (!exists) throw new Error("الجلسة غير موجودة الآن");
  await db.session.update({ where: { id }, data: { registrationOpen: before.registrationOpen } });
}

// ─── المحاضرات ───────────────────────────────────────────────

async function undoSessionSaved(log: AuditRow, d: Details): Promise<void> {
  return undoSessionUpdated(log, d);
}

async function undoSessionDeleted(log: AuditRow, d: Details): Promise<void> {
  const activityId = (d.activityId as string | undefined) ?? undefined;
  const before = d.before as Record<string, unknown> | undefined;
  if (!before) throw new Error("لا توجد نسخة محفوظة للجلسة المحذوفة");
  if (!activityId) throw new Error("معرف النشاط الأصلي مفقود");
  const activity = await db.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new Error("النشاط الأصلي غير موجود الآن");
  await db.session.create({
    data: {
      id: log.entityId ?? undefined,
      activityId,
      order: (before.order as number) ?? 1,
      title: (before.title as string) ?? "جلسة",
      description: (before.description as string | null) ?? null,
      startsAt: new Date((before.startsAt as string) ?? Date.now()),
      endsAt: before.endsAt ? new Date(before.endsAt as string) : null,
      location: (before.location as string | null) ?? null,
      presenter: (before.presenter as string | null) ?? null,
      onlineUrl: (before.onlineUrl as string | null) ?? null,
      onlineLabel: (before.onlineLabel as string | null) ?? null,
      materialUrl: (before.materialUrl as string | null) ?? null,
      materialLabel: (before.materialLabel as string | null) ?? null,
      status: (before.status as string) ?? "SCHEDULED",
      seats: (before.seats as number) ?? 50,
      registrationOpensAt: before.registrationOpensAt ? new Date(before.registrationOpensAt as string) : null,
      registrationClosesAt: before.registrationClosesAt ? new Date(before.registrationClosesAt as string) : null,
      closingMode: (before.closingMode as string) ?? "EITHER",
      registrationOpen: (before.registrationOpen as boolean) ?? true,
      qrToken: (before.qrToken as string | null) ?? undefined,
    },
  });
}

// ─── أسئلة التسجيل (لكل تنفيذ) ───────────────────────────────

async function undoFormFields(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = (d.before as { label: string; type: string; options: string | null; required: boolean; order: number }[] | undefined) ?? [];
  if (!id) throw new Error("معرف النشاط مفقود");
  const exists = await db.activity.findUnique({ where: { id } });
  if (!exists) throw new Error("النشاط غير موجود الآن");

  await db.$transaction([
    db.formField.deleteMany({ where: { activityId: id } }),
    ...before.map((f) =>
      db.formField.create({
        data: { activityId: id, label: f.label, type: f.type, options: f.options, required: f.required, order: f.order },
      })
    ),
  ]);
}

// ─── الإشعارات ───────────────────────────────────────────────

async function undoNotificationSent(log: AuditRow): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف الإشعار مفقود");
  const exists = await db.notification.findUnique({ where: { id } });
  if (!exists) return;
  await db.notification.delete({ where: { id } }); // القراءات تُحذف معه
}

async function undoNotificationDeleted(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as Record<string, unknown> | undefined;
  if (!before) throw new Error("لا توجد نسخة محفوظة للإشعار المحذوف");
  await db.notification.create({
    data: {
      id: log.entityId ?? undefined,
      type: (before.type as string) ?? "INFO",
      pinned: (before.pinned as boolean) ?? false,
      title: before.title as string,
      body: (before.body as string | null) ?? null,
      ctaLabel: (before.ctaLabel as string | null) ?? null,
      ctaUrl: (before.ctaUrl as string | null) ?? null,
      ctaNewTab: (before.ctaNewTab as boolean) ?? true,
      linkType: (before.linkType as string | null) ?? null,
      target: (before.target as string) ?? "{}",
      createdById: (before.createdById as string) ?? log.actorId!,
      expiresAt: before.expiresAt ? new Date(before.expiresAt as string) : null,
    },
  });
}

// ─── مرفقات درايف ────────────────────────────────────────────

async function undoDriveAssetSaved(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as Record<string, unknown> | undefined;
  if (!id) throw new Error("معرف المرفق مفقود");
  if (!before) {
    await db.driveAsset.delete({ where: { id } }).catch(() => undefined);
    return;
  }
  const exists = await db.driveAsset.findUnique({ where: { id } });
  if (!exists) throw new Error("المرفق غير موجود الآن");
  await db.driveAsset.update({
    where: { id },
    data: { title: before.title as string, url: before.url as string, kind: before.kind as string, note: (before.note as string | null) ?? null },
  });
}

async function undoDriveAssetDeleted(log: AuditRow, d: Details): Promise<void> {
  const before = d.before as Record<string, unknown> | undefined;
  if (!before) throw new Error("لا توجد نسخة محفوظة للمرفق المحذوف");
  await db.driveAsset.create({
    data: {
      id: log.entityId ?? undefined,
      title: before.title as string,
      url: before.url as string,
      kind: (before.kind as string) ?? "FILE",
      note: (before.note as string | null) ?? null,
      createdById: (before.createdById as string) ?? log.actorId!,
    },
  });
}

// ─── النقاط ──────────────────────────────────────────────────

async function undoPointsAdded(log: AuditRow, _d: Details, undoActorId: string): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف حدث النقاط مفقود");
  const event = await db.pointEvent.findUnique({ where: { id } });
  if (!event) return;

  await db.pointEvent.create({
    data: {
      userId: event.userId,
      points: -event.points,
      reason: `تراجع إداري عن: ${event.reason}`,
      sessionId: event.sessionId,
      ruleAction: event.ruleAction,
      createdById: undoActorId,
    },
  });
}

async function undoPointsReversed(_log: AuditRow, d: Details): Promise<void> {
  const reverseId = d.reverseEventId as string | undefined;
  if (!reverseId) throw new Error("معرف حدث العكس مفقود من السجل");
  const exists = await db.pointEvent.findUnique({ where: { id: reverseId } });
  if (!exists) return;
  await db.pointEvent.delete({ where: { id: reverseId } });
}

async function undoPointsBulk(_log: AuditRow, d: Details, undoActorId: string): Promise<void> {
  const eventIds = (d.eventIds as string[] | undefined) ?? [];
  if (eventIds.length === 0) throw new Error("معرفات أحداث النقاط غير مسجلة لهذه العملية (قديمة)");
  const events = await db.pointEvent.findMany({ where: { id: { in: eventIds } } });
  if (events.length === 0) return;

  const byUser = new Map<string, number>();
  for (const e of events) byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + e.points);
  await db.pointEvent.createMany({
    data: [...byUser.entries()].map(([userId, pts]) => ({
      userId,
      points: -pts,
      reason: `تراجع إداري جماعي عن: ${d.reason as string}`,
      createdById: undoActorId,
    })),
  });
}

async function undoPointEventDeleted(log: AuditRow, d: Details): Promise<void> {
  const e = d.event as Record<string, unknown> | undefined;
  if (!e) throw new Error("نسخة الحدث المحذوف غير محفوظة (عملية قديمة)");
  await db.pointEvent.create({
    data: {
      id: log.entityId ?? undefined,
      userId: e.userId as string,
      points: e.points as number,
      reason: e.reason as string,
      ruleAction: (e.ruleAction as string | null) ?? null,
      sessionId: (e.sessionId as string | null) ?? null,
      createdById: e.createdById as string,
      createdAt: new Date(e.createdAt as string),
    },
  });
}

async function undoPointRuleSaved(log: AuditRow, d: Details): Promise<void> {
  const action = log.entityId;
  const before = d.before as { label: string; points: number; active: boolean } | undefined;
  if (!action) throw new Error("رمز القاعدة مفقود");
  if (!before) {
    const used = await db.pointEvent.count({ where: { ruleAction: action } });
    if (used > 0) throw new Error("القاعدة مستخدمة في أحداث نقاط — عطّلها بدل حذفها");
    await db.pointRule.delete({ where: { action } });
    return;
  }
  await db.pointRule.update({
    where: { action },
    data: { label: before.label, points: before.points, active: before.active },
  });
}

async function undoPointRuleToggled(log: AuditRow, d: Details): Promise<void> {
  const action = log.entityId;
  const before = d.before as { active: boolean } | undefined;
  if (!action || !before) throw new Error("بيانات العملية ناقصة");
  await db.pointRule.update({ where: { action }, data: { active: before.active } });
}

// ─── الشارات ─────────────────────────────────────────────────

async function undoBadgeSaved(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف الشارة مفقود");
  const before = d.before as { name: string; description: string; icon: string; active: boolean } | undefined;
  if (!before) {
    const awarded = await db.studentBadge.count({ where: { badgeId: id } });
    if (awarded > 0) throw new Error("الشارة ممنوحة لطلاب — لا يمكن حذفها بالتراجع");
    await db.badge.delete({ where: { id } });
    return;
  }
  await db.badge.update({
    where: { id },
    data: { name: before.name, description: before.description, icon: before.icon, active: before.active },
  });
}

async function undoBadgeAwarded(log: AuditRow, d: Details): Promise<void> {
  const userId = (d.userId as string | undefined) ?? log.entityId;
  const badgeId = d.badgeId as string | undefined;
  if (!userId || !badgeId) throw new Error("بيانات المنح ناقصة");
  const exists = await db.studentBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });
  if (!exists) return;
  await db.studentBadge.delete({ where: { userId_badgeId: { userId, badgeId } } });
}

async function undoBadgeRevoked(log: AuditRow, d: Details, undoActorId: string): Promise<void> {
  const userId = (d.userId as string | undefined) ?? log.entityId;
  const badgeId = d.badgeId as string | undefined;
  if (!userId || !badgeId) throw new Error("بيانات السحب ناقصة");
  const exists = await db.studentBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });
  if (exists) return;
  await db.studentBadge.create({ data: { userId, badgeId, awardedById: undoActorId } });
}

// ─── المواهب والطلاب والمشرفون ───────────────────────────────

async function undoTalentStatus(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as { status: string; featured: boolean } | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const exists = await db.talent.findUnique({ where: { id } });
  if (!exists) throw new Error("الموهبة غير موجودة الآن");
  await db.talent.update({ where: { id }, data: { status: before.status, featured: before.featured } });
}

async function undoTalentFeatured(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as { featured: boolean } | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  await db.talent.update({ where: { id }, data: { featured: before.featured } });
}

async function undoStudentStatus(log: AuditRow, d: Details): Promise<void> {
  const id = (d.userId as string | undefined) ?? log.entityId;
  const before = d.before as string | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const exists = await db.user.findUnique({ where: { id } });
  if (!exists) throw new Error("الحساب غير موجود الآن");
  await db.user.update({ where: { id }, data: { status: before } });
}

async function undoStudentUpdated(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as
    | { email: string; fullName: string; phone: string; grade: string; section: string; gender: string; studentCode: string | null }
    | null
    | undefined;
  if (!id) throw new Error("معرف الطالب مفقود");
  if (!before) throw new Error("لا توجد نسخة سابقة محفوظة لهذه العملية");
  const student = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!student) throw new Error("الطالب غير موجود الآن");

  if (before.email && before.email !== student.email) {
    const taken = await db.user.findUnique({ where: { email: before.email } });
    if (taken && taken.id !== id) throw new Error("البريد القديم مستخدم الآن بحساب آخر");
    await db.user.update({ where: { id }, data: { email: before.email } });
  }
  if (student.profile) {
    await db.studentProfile.update({
      where: { userId: id },
      data: {
        fullName: before.fullName,
        phone: before.phone,
        grade: before.grade,
        section: before.section,
        gender: before.gender,
        studentCode: before.studentCode,
      },
    });
  }
}

async function undoStaffRole(log: AuditRow, d: Details, admin: { role: string }): Promise<void> {
  const id = log.entityId;
  const before = d.before as { role: string; customPermissions: string | null } | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  if (before.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new Error("لا يمكنك استعادة دور المدير الأعلى إلا بواسطة المدير الأعلى نفسه");
  }
  const exists = await db.user.findUnique({ where: { id } });
  if (!exists) throw new Error("الحساب غير موجود الآن");
  await db.user.update({
    where: { id },
    data: { role: before.role, customPermissions: before.customPermissions },
  });
}

// ─── الحضور والتسجيل ─────────────────────────────────────────

async function undoAttendanceSet(log: AuditRow, d: Details): Promise<void> {
  const regId = log.entityId;
  const sessionId = (d.sessionId as string | null | undefined) ?? null;
  const before = d.before as { present: boolean; method: string | null } | null | undefined;
  if (!regId) throw new Error("معرف التسجيل مفقود");
  const reg = await db.registration.findUnique({ where: { id: regId } });
  if (!reg) throw new Error("التسجيل غير موجود الآن");

  const existing = await db.attendance.findFirst({ where: { registrationId: regId, sessionId } });
  if (existing) {
    if (before === null || before === undefined) {
      await db.attendance.delete({ where: { id: existing.id } });
    } else {
      await db.attendance.update({
        where: { id: existing.id },
        data: { present: before.present, method: before.method },
      });
    }
  } else if (before) {
    await db.attendance.create({ data: { registrationId: regId, sessionId, present: before.present, method: before.method } });
  }

  const pointEventId = d.pointEventId as string | null | undefined;
  if (pointEventId) {
    const exists = await db.pointEvent.findUnique({ where: { id: pointEventId } });
    if (exists) await db.pointEvent.delete({ where: { id: pointEventId } });
  }
  const reversedPointEventId = d.reversedPointEventId as string | null | undefined;
  if (reversedPointEventId) {
    // كان عكس نقاط بالغياب → نعيد الحدث؟ لا يمكن إعادته بالنسخة — نتركه موثقًا في السجل
  }
}

async function undoAttendanceAllPresent(log: AuditRow, d: Details): Promise<void> {
  const flips = (d.flips as { registrationId: string; pointEventId: string | null }[] | undefined) ?? [];
  const sessionId = (d.sessionId as string | null | undefined) ?? null;
  if (flips.length === 0) throw new Error("لا توجد نسخة محفوظة لهذه العملية");
  for (const f of flips) {
    const att = await db.attendance.findFirst({ where: { registrationId: f.registrationId, sessionId } });
    if (att) {
      await db.attendance.update({
        where: { id: att.id },
        data: { present: false, method: "MANUAL", markedAt: null },
      });
    }
    if (f.pointEventId) {
      const exists = await db.pointEvent.findUnique({ where: { id: f.pointEventId } });
      if (exists) await db.pointEvent.delete({ where: { id: f.pointEventId } });
    }
  }
}

async function undoManualRegistration(log: AuditRow): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف التسجيل مفقود");
  const exists = await db.registration.findUnique({ where: { id } });
  if (!exists) return;
  await db.registration.delete({ where: { id } });
}

async function undoAdminCancelled(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as { status: string; waitlistOrder: number | null } | undefined;
  const promoted = d.promoted as { id: string; waitlistOrder: number | null } | null | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const reg = await db.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("التسجيل غير موجود الآن");

  await db.registration.update({
    where: { id },
    data: { status: before.status, waitlistOrder: before.waitlistOrder },
  });
  if (promoted) {
    const p = await db.registration.findUnique({ where: { id: promoted.id } });
    if (p && p.status === "REGISTERED") {
      await db.registration.update({
        where: { id: promoted.id },
        data: { status: "WAITLISTED", waitlistOrder: promoted.waitlistOrder },
      });
    }
  }
}

async function undoAdminPromoted(log: AuditRow, d: Details): Promise<void> {
  const id = log.entityId;
  const before = d.before as { status: string; waitlistOrder: number | null } | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const reg = await db.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("التسجيل غير موجود الآن");
  await db.registration.update({
    where: { id },
    data: { status: before.status, waitlistOrder: before.waitlistOrder },
  });
}

// ─── طلبات البيانات والإعدادات ───────────────────────────────

async function undoDataRequestCreated(log: AuditRow): Promise<void> {
  const id = log.entityId;
  if (!id) throw new Error("معرف الطلب مفقود");
  const exists = await db.dataRequest.findUnique({ where: { id } });
  if (!exists) return;
  await db.dataRequest.delete({ where: { id } });
}

async function undoDataRequestStatus(log: AuditRow, d: Details): Promise<void> {
  const id = (d.id as string | undefined) ?? log.entityId;
  const before = d.before as string | undefined;
  if (!id || !before) throw new Error("بيانات العملية ناقصة");
  const exists = await db.dataRequest.findUnique({ where: { id } });
  if (!exists) throw new Error("الطلب غير موجود الآن");
  await db.dataRequest.update({ where: { id }, data: { status: before } });
}

async function undoSettingsSaved(d: Details): Promise<void> {
  const before = d.before as { requiredGrades: string[]; pattern: string; hint: string } | undefined;
  if (!before) throw new Error("لا توجد نسخة سابقة للإعدادات");
  await saveStudentCodeConfig(before);
}

// ─── العملية الرئيسية ────────────────────────────────────────

export async function undoAuditAction(
  auditId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await getCurrentUser();
    if (!admin) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN") {
      return { ok: false, error: "التراجع عن العمليات متاح للمديرين فقط" };
    }
    const why = (reason || "").trim();
    if (why.length < 3) return { ok: false, error: "اكتب سبب التراجع (يُوثَّق في السجل)" };

    const log = await db.auditLog.findUnique({ where: { id: auditId } });
    if (!log) return { ok: false, error: "العملية غير موجودة في السجل" };
    if (!UNDOABLE_ACTIONS.has(log.action)) {
      return { ok: false, error: "هذا النوع من العمليات غير قابل للتراجع" };
    }
    if (await alreadyUndone(auditId)) {
      return { ok: false, error: "تم التراجع عن هذه العملية بالفعل" };
    }

    const d = parseDetails(log.details);
    const row: AuditRow = {
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      actorId: log.actorId,
      summary: log.summary,
      details: log.details,
    };

    switch (log.action) {
      // البرامج
      case "PROGRAM_CREATED":
      case "PROGRAM_UPDATED": await undoProgramSaved(row, d); break;
      case "PROGRAM_DELETED": await undoProgramDeleted(row, d); break;
      // الأنشطة
      case "ACTIVITY_CREATED": await undoActivityCreated(row); break;
      case "ACTIVITY_UPDATED": await undoActivitySaved(row, d); break;
      case "ACTIVITY_DELETED": await undoActivityDeleted(row, d); break;
      // التنفيذات
      case "RUN_CREATED": await undoSessionUpdated(row, d); break; // توافق سجلات قديمة
      case "RUN_UPDATED": await undoSessionUpdated(row, d); break; // توافق سجلات قديمة
      // المحاضرات
      case "SESSION_SAVED": await undoSessionSaved(row, d); break;
      case "SESSION_DELETED": await undoSessionDeleted(row, d); break;
      // أسئلة التسجيل
      case "FORM_FIELDS_SAVED": await undoFormFields(row, d); break;
      // الإشعارات
      case "NOTIFICATION_SENT": await undoNotificationSent(row); break;
      case "NOTIFICATION_DELETED": await undoNotificationDeleted(row, d); break;
      // مرفقات درايف
      case "DRIVE_ASSET_CREATED":
      case "DRIVE_ASSET_UPDATED": await undoDriveAssetSaved(row, d); break;
      case "DRIVE_ASSET_DELETED": await undoDriveAssetDeleted(row, d); break;
      // النقاط
      case "POINTS_ADDED": await undoPointsAdded(row, d, admin.id); break;
      case "POINTS_REVERSED": await undoPointsReversed(row, d); break;
      case "POINTS_BULK": await undoPointsBulk(row, d, admin.id); break;
      case "POINT_EVENT_DELETED": await undoPointEventDeleted(row, d); break;
      case "POINT_RULE_SAVED": await undoPointRuleSaved(row, d); break;
      case "POINT_RULE_TOGGLED": await undoPointRuleToggled(row, d); break;
      // الشارات
      case "BADGE_SAVED": await undoBadgeSaved(row, d); break;
      case "BADGE_AWARDED": await undoBadgeAwarded(row, d); break;
      case "BADGE_REVOKED": await undoBadgeRevoked(row, d, admin.id); break;
      // المواهب والطلاب
      case "TALENT_STATUS": await undoTalentStatus(row, d); break;
      case "TALENT_FEATURED": await undoTalentFeatured(row, d); break;
      case "STUDENT_STATUS": await undoStudentStatus(row, d); break;
      case "STUDENT_UPDATED": await undoStudentUpdated(row, d); break;
      case "STAFF_ROLE_SET":
      case "STAFF_DEMOTED": await undoStaffRole(row, d, admin); break;
      // الحضور والتسجيل
      case "ATTENDANCE_SET": await undoAttendanceSet(row, d); break;
      case "ATTENDANCE_ALL_PRESENT": await undoAttendanceAllPresent(row, d); break;
      case "MANUAL_REGISTRATION": await undoManualRegistration(row); break;
      case "ADMIN_CANCELLED_REGISTRATION": await undoAdminCancelled(row, d); break;
      case "ADMIN_PROMOTED_REGISTRATION": await undoAdminPromoted(row, d); break;
      // طلبات البيانات والإعدادات
      case "DATA_REQUEST_CREATED": await undoDataRequestCreated(row); break;
      case "DATA_REQUEST_STATUS": await undoDataRequestStatus(row, d); break;
      case "SETTINGS_SAVED": await undoSettingsSaved(d); break;
      default:
        return { ok: false, error: "هذا النوع من العمليات غير قابل للتراجع" };
    }

    await logAudit({
      actor: admin,
      action: "ACTION_UNDONE",
      entity: "AUDIT_LOG",
      entityId: auditId,
      summary: `تراجع عن «${log.summary}» — ${why}`,
      details: { originalAction: log.action, reason: why },
    });

    await refreshAll();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء التراجع" };
  }
}
