"use server";

// ═══════════════════════════════════════════════════════════════
//  إدارة البرامج والأنشطة والمحاضرات (v4 — لا دفعات)
//  Activity (كورس/ورشة/فعالية) → Session (محاضرة/موعد = وحدة التسجيل)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { ACTIVITY_TYPES, ACTIVITY_PUBLISH, ACTIVITY_LEVELS, FORM_FIELD_TYPES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";

const typeValues = ACTIVITY_TYPES.map((t) => t.value as string);
const publishValues = ACTIVITY_PUBLISH.map((p) => p.value as string);
const levelValues = ACTIVITY_LEVELS.map((l) => l.value as string);
const fieldTypeValues = FORM_FIELD_TYPES.map((f) => f.value as string);
const CLOSING_MODE_VALUES = ["BY_DATE", "BY_CAPACITY", "EITHER", "MANUAL"];

function refreshAll(ids?: { activityId?: string; sessionId?: string }) {
  revalidatePath("/admin/activities");
  revalidatePath("/admin/programs");
  revalidatePath("/activities");
  revalidatePath("/");
  revalidatePath("/panel");
  if (ids?.activityId) revalidatePath(`/admin/activities/${ids.activityId}`);
  if (ids?.sessionId) {
    revalidatePath(`/sessions/${ids.sessionId}`);
    revalidatePath(`/admin/sessions/${ids.sessionId}`);
  }
}

const parseDate = parseDateInput;

// ─── البرامج ─────────────────────────────────────────────────

export type ProgramInput = {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  status?: string; // ACTIVE | ARCHIVED
};

export async function saveProgram(input: ProgramInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.PROGRAMS, "manage");
    const name = (input.name || "").trim();
    if (name.length < 2) return { ok: false, error: "اسم البرنامج قصير جدًا" };

    const data = {
      name,
      description: (input.description || "").trim() || null,
      icon: (input.icon || "").trim() || "✨",
      color: (input.color || "").trim() || "#c9a45c",
      order: Number.isInteger(input.order) ? (input.order as number) : 0,
      status: input.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    };

    if (input.id) {
      const existing = await db.program.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "البرنامج غير موجود" };
      await db.program.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "PROGRAM_UPDATED",
        entity: "PROGRAM",
        entityId: input.id,
        summary: `تعديل البرنامج «${name}»`,
        details: { before: { name: existing.name, icon: existing.icon, status: existing.status, order: existing.order, description: existing.description, color: existing.color } },
      });
      refreshAll();
      return { ok: true, id: input.id };
    }
    const program = await db.program.create({ data });
    await logAudit({
      actor: admin,
      action: "PROGRAM_CREATED",
      entity: "PROGRAM",
      entityId: program.id,
      summary: `إنشاء البرنامج «${name}»`,
    });
    refreshAll();
    return { ok: true, id: program.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteProgram(programId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.PROGRAMS, "manage");
    const program = await db.program.findUnique({
      where: { id: programId },
      include: { _count: { select: { activities: true } } },
    });
    if (!program) return { ok: false, error: "البرنامج غير موجود" };
    if (program._count.activities > 0) {
      return { ok: false, error: `لا يمكن حذف برنامج يضم ${program._count.activities} نشاطًا — أرشفه أو انقل الأنشطة أولًا` };
    }
    await db.program.delete({ where: { id: programId } });
    await logAudit({
      actor: admin,
      action: "PROGRAM_DELETED",
      entity: "PROGRAM",
      entityId: programId,
      summary: `حذف البرنامج «${program.name}» (بدون أنشطة)`,
      details: { before: { name: program.name, icon: program.icon, description: program.description, status: program.status, order: program.order } },
    });
    refreshAll();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── الأنشطة (الكيان الثابت) ────────────────────────────────

export type ActivityInput = {
  id?: string;
  type: string; // COURSE | WORKSHOP | EVENT
  programId?: string | null;
  title: string;
  teaser?: string;
  description: string;
  image?: string;
  presenter?: string;
  level?: string;
  publish: string; // DRAFT | PUBLISHED | ARCHIVED
};

export async function saveActivity(input: ActivityInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");

    const title = (input.title || "").trim();
    const description = (input.description || "").trim();
    if (title.length < 3) return { ok: false, error: "عنوان النشاط قصير جدًا" };
    if (description.length < 10) return { ok: false, error: "الوصف قصير جدًا — اكتب 10 أحرف على الأقل" };
    if (!typeValues.includes(input.type)) return { ok: false, error: "نوع النشاط غير صحيح" };
    if (!publishValues.includes(input.publish)) return { ok: false, error: "حالة نشر غير صحيحة" };
    if (input.level && !levelValues.includes(input.level)) return { ok: false, error: "المستوى غير صحيح" };
    if (input.programId) {
      const program = await db.program.findUnique({ where: { id: input.programId } });
      if (!program) return { ok: false, error: "البرنامج غير موجود" };
    }

    const data = {
      type: input.type,
      programId: input.programId || null,
      title,
      teaser: (input.teaser || "").trim() || null,
      description,
      image: (input.image || "").trim() || null,
      presenter: (input.presenter || "").trim() || null,
      level: (input.level || "").trim() || null,
      publish: input.publish,
    };

    if (input.id) {
      const existing = await db.activity.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "النشاط غير موجود" };
      await db.activity.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "ACTIVITY_UPDATED",
        entity: "ACTIVITY",
        entityId: input.id,
        summary: `تعديل النشاط «${title}»`,
        details: { before: { type: existing.type, programId: existing.programId, title: existing.title, teaser: existing.teaser, description: existing.description, image: existing.image, presenter: existing.presenter, level: existing.level, publish: existing.publish } },
      });
      refreshAll({ activityId: input.id });
      return { ok: true, id: input.id };
    }
    const activity = await db.activity.create({ data });
    await logAudit({
      actor: admin,
      action: "ACTIVITY_CREATED",
      entity: "ACTIVITY",
      entityId: activity.id,
      summary: `إنشاء ${input.type === "COURSE" ? "الكورس" : input.type === "EVENT" ? "الفعالية" : "الورشة"} «${title}»`,
    });
    refreshAll({ activityId: activity.id });
    return { ok: true, id: activity.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// حذف نشاط بلا تسجيلات على أي جلسة (المسودات)
export async function deleteActivity(activityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const activity = await db.activity.findUnique({
      where: { id: activityId },
      include: { sessions: { include: { _count: { select: { registrations: true } } } } },
    });
    if (!activity) return { ok: false, error: "النشاط غير موجود" };
    const totalRegs = activity.sessions.reduce((s, x) => s + x._count.registrations, 0);
    if (totalRegs > 0) {
      return { ok: false, error: "لا يمكن حذف نشاط عليه تسجيلات — أرشفه بدلاً من ذلك للحفاظ على التاريخ" };
    }
    // نسخة كاملة قبل الحذف — تتيح الاستعادة بالتراجع
    const sessionsBefore = activity.sessions.map((x) => ({
      order: x.order,
      title: x.title,
      location: x.location,
      seats: x.seats,
      startsAt: x.startsAt.toISOString(),
      endsAt: x.endsAt?.toISOString() ?? null,
      registrationOpensAt: x.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: x.registrationClosesAt?.toISOString() ?? null,
      closingMode: x.closingMode,
      registrationOpen: x.registrationOpen,
      allowGuests: x.allowGuests,
      qrToken: x.qrToken,
    }));
    const fields = (await db.formField.findMany({ where: { activityId } })).map((f) => ({
      label: f.label, type: f.type, options: f.options, required: f.required, order: f.order,
    }));
    await db.activity.delete({ where: { id: activityId } });
    await logAudit({
      actor: admin,
      action: "ACTIVITY_DELETED",
      entity: "ACTIVITY",
      entityId: activityId,
      summary: `حذف «${activity.title}» (بدون تسجيلات)`,
      details: {
        before: {
          type: activity.type, programId: activity.programId, title: activity.title, teaser: activity.teaser,
          description: activity.description, image: activity.image, presenter: activity.presenter,
          level: activity.level, publish: activity.publish,
        },
        sessions: sessionsBefore,
        fields,
      },
    });
    refreshAll();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── المحاضرات / مواعيد الورش (Session) ─────────────────────
// كل جلسة وحدة تسجيل مستقلة: مقاعدها ونافذة تسجيلها وعدّها التنازلي

export type SessionInput = {
  id?: string;
  activityId?: string; // مطلوب عند الإنشاء
  title?: string; // اختياري — يُشتق تلقائيًا (المحاضرة N / موعد الورشة)
  description?: string;
  image?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  presenter?: string;
  onlineUrl?: string;
  onlineLabel?: string;
  materialUrl?: string;
  materialLabel?: string;
  status?: string;
  // ── التسجيل (معاملة الورشة) ──
  seats?: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  closingMode?: string;
  registrationOpen?: boolean;
  allowGuests?: boolean;
  allowAdminOverride?: boolean;
  excelTemplateUrl?: string;
  excelTemplateName?: string;
};

export async function saveSession(input: SessionInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");

    const startsAt = parseDate(input.startsAt);
    if (!startsAt) return { ok: false, error: "حدد تاريخ ووقت الجلسة" };
    let endsAt = parseDate(input.endsAt);
    if (!endsAt) endsAt = new Date(startsAt.getTime() + 2 * 3600 * 1000);
    if (endsAt < startsAt) return { ok: false, error: "نهاية الجلسة قبل بدايتها" };

    const seats = Number(input.seats ?? 50);
    if (!Number.isInteger(seats) || seats < 1 || seats > 1000) return { ok: false, error: "عدد المقاعد غير منطقي (1-1000)" };
    if (input.closingMode && !CLOSING_MODE_VALUES.includes(input.closingMode)) return { ok: false, error: "وضع إغلاق غير صحيح" };
    if (input.status && !["SCHEDULED", "DONE", "CANCELLED"].includes(input.status)) {
      return { ok: false, error: "حالة جلسة غير صحيحة" };
    }

    const registrationOpensAt = parseDate(input.registrationOpensAt);
    const registrationClosesAt = parseDate(input.registrationClosesAt);
    if (registrationClosesAt && registrationOpensAt && registrationClosesAt < registrationOpensAt) {
      return { ok: false, error: "إغلاق التسجيل قبل فتحه — راجع المواعيد" };
    }
    // فتح التسجيل بعد بدء الجلسة نفسها غير منطقي — لكن نسمح به في التعديل للورش المستمرة
    if (registrationOpensAt && registrationOpensAt > endsAt) {
      return { ok: false, error: "فتح التسجيل بعد انتهاء الجلسة نفسها — غير منطقي" };
    }

    const title = (input.title || "").trim();

    const data = {
      title,
      description: (input.description || "").trim() || null,
      image: (input.image || "").trim() || null,
      startsAt,
      endsAt,
      location: (input.location || "").trim() || null,
      presenter: (input.presenter || "").trim() || null,
      onlineUrl: (input.onlineUrl || "").trim() || null,
      onlineLabel: (input.onlineLabel || "").trim() || null,
      materialUrl: (input.materialUrl || "").trim() || null,
      materialLabel: (input.materialLabel || "").trim() || null,
      status: input.status || "SCHEDULED",
      seats,
      registrationOpensAt,
      registrationClosesAt,
      closingMode: input.closingMode || "EITHER",
      registrationOpen: input.registrationOpen ?? true,
      allowGuests: input.allowGuests ?? true,
      allowAdminOverride: input.allowAdminOverride ?? true,
      excelTemplateUrl: (input.excelTemplateUrl || "").trim() || null,
      excelTemplateName: (input.excelTemplateName || "").trim() || null,
    };

    if (input.id) {
      const existing = await db.session.findUnique({ where: { id: input.id }, include: { activity: true } });
      if (!existing) return { ok: false, error: "الجلسة غير موجودة" };

      // تقليص المقاعد أقل من المسجلين؟
      const activeCount = await db.registration.count({ where: { sessionId: input.id, status: "REGISTERED" } });
      if (seats < activeCount) {
        return { ok: false, error: `لا يمكن تقليص المقاعد إلى ${seats} — يوجد ${activeCount} مسجلاً بالفعل` };
      }

      await db.session.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "SESSION_SAVED",
        entity: "SESSION",
        entityId: input.id,
        summary: `تعديل «${title || existing.title}» — «${existing.activity.title}»`,
        details: {
          activityId: existing.activityId,
          before: {
            title: existing.title, startsAt: existing.startsAt.toISOString(),
            endsAt: existing.endsAt?.toISOString() ?? null, status: existing.status,
            location: existing.location, seats: existing.seats,
            registrationOpensAt: existing.registrationOpensAt?.toISOString() ?? null,
            registrationClosesAt: existing.registrationClosesAt?.toISOString() ?? null,
            closingMode: existing.closingMode, registrationOpen: existing.registrationOpen,
          },
        },
      });
      refreshAll({ activityId: existing.activityId, sessionId: input.id });
      return { ok: true, id: input.id };
    }

    if (!input.activityId) return { ok: false, error: "حدد النشاط الذي تتبعه الجلسة" };
    const activity = await db.activity.findUnique({ where: { id: input.activityId } });
    if (!activity) return { ok: false, error: "النشاط غير موجود" };

    const order = (await db.session.count({ where: { activityId: activity.id } })) + 1;
    // عنوان تلقائي عند غيابه: كورس → «المحاضرة N» · غيره → عنوان النشاط نفسه
    const finalTitle = title || (activity.type === "COURSE" ? `المحاضرة ${order}` : activity.title);

    const session = await db.session.create({
      data: { ...data, title: finalTitle, activityId: activity.id, order },
    });
    await logAudit({
      actor: admin,
      action: "SESSION_SAVED",
      entity: "SESSION",
      entityId: session.id,
      summary: `إضافة «${finalTitle}» إلى «${activity.title}» — ${seats} مقعدًا`,
    });
    refreshAll({ activityId: activity.id, sessionId: session.id });
    return { ok: true, id: session.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// مفتاح سريع: فتح/غلق التسجيل لجلسة (وضع MANUAL أو إغلاق مبكر)
export async function toggleSessionRegistration(sessionId: string, open: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const session = await db.session.findUnique({ where: { id: sessionId }, include: { activity: true } });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    await db.session.update({ where: { id: sessionId }, data: { registrationOpen: open } });
    await logAudit({
      actor: admin,
      action: "SESSION_REGISTRATION_TOGGLED",
      entity: "SESSION",
      entityId: sessionId,
      summary: `${open ? "فتح" : "إغلاق"} التسجيل يدويًا — «${session.title}» (${session.activity.title})`,
      details: { before: { registrationOpen: session.registrationOpen, closingMode: session.closingMode } },
    });
    refreshAll({ activityId: session.activityId, sessionId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// حذف جلسة (محاضرة/موعد) — فقط بلا تسجيلات
export async function deleteSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const session = await db.session.findUnique({ where: { id: sessionId }, include: { activity: true } });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    const registrationsCount = await db.registration.count({ where: { sessionId } });
    const attendanceCount = await db.attendance.count({ where: { sessionId } });
    if (registrationsCount > 0 || attendanceCount > 0) {
      return { ok: false, error: "عليها تسجيلات أو حضور — غيّر حالتها إلى «ملغاة» بدلاً من الحذف" };
    }
    await db.session.delete({ where: { id: sessionId } });
    await logAudit({
      actor: admin,
      action: "SESSION_DELETED",
      entity: "SESSION",
      entityId: sessionId,
      summary: `حذف «${session.title}» من «${session.activity.title}» (بدون تسجيلات)`,
      details: {
        activityId: session.activityId,
        before: {
          order: session.order, title: session.title, description: session.description,
          startsAt: session.startsAt.toISOString(), endsAt: session.endsAt?.toISOString() ?? null,
          location: session.location, presenter: session.presenter, status: session.status,
          seats: session.seats,
          registrationOpensAt: session.registrationOpensAt?.toISOString() ?? null,
          registrationClosesAt: session.registrationClosesAt?.toISOString() ?? null,
          closingMode: session.closingMode, registrationOpen: session.registrationOpen,
          onlineUrl: session.onlineUrl, materialUrl: session.materialUrl,
        },
      },
    });
    refreshAll({ activityId: session.activityId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── أسئلة التسجيل الديناميكية (على مستوى النشاط — تُسأل مرة واحدة) ──

export type FormFieldInput = {
  id?: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  order: number;
};

export async function saveFormFields(activityId: string, fields: FormFieldInput[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const activity = await db.activity.findUnique({ where: { id: activityId } });
    if (!activity) return { ok: false, error: "النشاط غير موجود" };

    for (const f of fields) {
      const label = (f.label || "").trim();
      if (label.length < 2) return { ok: false, error: "نص السؤال قصير جدًا" };
      if (!fieldTypeValues.includes(f.type)) return { ok: false, error: "نوع سؤال غير صحيح" };
      if (["SELECT", "RADIO", "CHECKBOX"].includes(f.type)) {
        const opts = (f.options || []).map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return { ok: false, error: `السؤال «${label}» يحتاج خيارين على الأقل` };
      }
    }

    const before = await db.formField.findMany({ where: { activityId }, orderBy: { order: "asc" } });

    await db.$transaction([
      db.formField.deleteMany({ where: { activityId } }),
      ...fields.map((f, i) =>
        db.formField.create({
          data: {
            activityId,
            label: f.label.trim(),
            type: f.type,
            options: ["SELECT", "RADIO", "CHECKBOX"].includes(f.type)
              ? JSON.stringify((f.options || []).map((o) => o.trim()).filter(Boolean))
              : null,
            required: !!f.required,
            order: f.order ?? i,
          },
        })
      ),
    ]);

    await logAudit({
      actor: admin,
      action: "FORM_FIELDS_SAVED",
      entity: "ACTIVITY",
      entityId: activityId,
      summary: `حفظ أسئلة تسجيل «${activity.title}» (${fields.length} سؤال)`,
      details: {
        before: before.map((f) => ({ label: f.label, type: f.type, options: f.options, required: f.required, order: f.order })),
      },
    });
    refreshAll({ activityId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ═══════════════════════════════════════════════════════════════
//  v5: التنفيذات / الدفعات (Runs)
//  تكرار النشاط بمعزل عن بياناته الثابتة — الجلسات تُنشأ تحته
// ═══════════════════════════════════════════════════════════════

export type RunInput = {
  id?: string;
  activityId: string;
  title: string;
  description?: string;
  seats?: number | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  closingMode?: string;
  registrationOpen?: boolean;
  allowGuests?: boolean;
};

export async function saveRun(input: RunInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    if (!input.title?.trim()) return { ok: false, error: "عنوان التنفيذ مطلوب (مثال: دفعة سبتمبر)" };
    if (input.title.trim().length > 80) return { ok: false, error: "العنوان طويل جدًا" };
    if (input.seats !== null && input.seats !== undefined && (input.seats < 1 || input.seats > 10000)) {
      return { ok: false, error: "المقاعد بين 1 و10000" };
    }
    const activity = await db.activity.findUnique({ where: { id: input.activityId } });
    if (!activity) return { ok: false, error: "النشاط غير موجود" };

    const opens = parseDate(input.registrationOpensAt);
    const closes = parseDate(input.registrationClosesAt);
    if (opens && closes && closes <= opens) return { ok: false, error: "إغلاق التسجيل يجب أن يكون بعد فتحه" };

    const data = {
      activityId: input.activityId,
      title: input.title.trim(),
      description: input.description?.trim()?.slice(0, 2000) ?? null,
      seats: input.seats ?? null,
      registrationOpensAt: opens,
      registrationClosesAt: closes,
      closingMode: input.closingMode && ["BY_DATE", "BY_CAPACITY", "EITHER", "MANUAL"].includes(input.closingMode) ? input.closingMode : "EITHER",
      registrationOpen: input.registrationOpen ?? true,
      allowGuests: input.allowGuests ?? true,
    };

    if (input.id) {
      const existing = await db.run.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "التنفيذ غير موجود" };
      const updated = await db.run.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "RUN_UPDATED",
        entity: "RUN",
        entityId: updated.id,
        summary: `تعديل تنفيذ «${updated.title}» في نشاط «${activity.title}»`,
        before: { title: existing.title, seats: existing.seats },
        after: { title: updated.title, seats: updated.seats },
      });
      revalidatePath(`/admin/activities/${input.activityId}`);
      revalidatePath(`/admin/runs/${input.id}`);
      revalidatePath(`/activities/${input.activityId}`);
      return { ok: true, id: updated.id };
    }

    const maxOrder = await db.run.aggregate({
      where: { activityId: input.activityId },
      _max: { order: true },
    });
    const created = await db.run.create({
      data: { ...data, order: (maxOrder._max.order ?? 0) + 1 },
    });
    await logAudit({
      actor: admin,
      action: "RUN_CREATED",
      entity: "RUN",
      entityId: created.id,
      summary: `تنفيذ جديد «${created.title}» في نشاط «${activity.title}»`,
      after: { title: created.title, order: created.order },
    });
    revalidatePath(`/admin/activities/${input.activityId}`);
    revalidatePath(`/activities/${input.activityId}`);
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function deleteRun(runId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const run = await db.run.findUnique({
      where: { id: runId },
      include: {
        activity: { select: { id: true, title: true } },
        sessions: { select: { id: true, _count: { select: { registrations: true } } } },
      },
    });
    if (!run) return { ok: false, error: "التنفيذ غير موجود" };

    const totalRegs = run.sessions.reduce((sum, s) => sum + s._count.registrations, 0);
    if (totalRegs > 0) {
      return { ok: false, error: `لا يمكن حذف التنفيذ — عليه ${totalRegs} تسجيلًا. الصحيح: أرشف النشاط أو ألغِ التنفيذ` };
    }

    await db.run.delete({ where: { id: runId } });
    await logAudit({
      actor: admin,
      action: "RUN_DELETED",
      entity: "RUN",
      entityId: runId,
      summary: `حذف تنفيذ «${run.title}» من نشاط «${run.activity.title}»`,
      before: { title: run.title, sessions: run.sessions.length },
      reason: "حذف تنفيذ بلا تسجيلات",
    });
    revalidatePath(`/admin/activities/${run.activity.id}`);
    revalidatePath(`/activities/${run.activity.id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ربط جلسة بتنفيذ (أو فصلها)
export async function setSessionRun(sessionId: string, runId: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { activity: { select: { id: true, title: true } } },
    });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (runId) {
      const run = await db.run.findUnique({ where: { id: runId } });
      if (!run) return { ok: false, error: "التنفيذ غير موجود" };
      if (run.activityId !== session.activityId) return { ok: false, error: "لا يمكن ربط جلسة بتنفيذ من نشاط آخر" };
    }
    await db.session.update({ where: { id: sessionId }, data: { runId } });
    await logAudit({
      actor: admin,
      action: "SESSION_RUN_SET",
      entity: "SESSION",
      entityId: sessionId,
      summary: `ضبط تنفيذ الجلسة «${session.title}»`,
      before: { runId: session.runId },
      after: { runId },
    });
    revalidatePath(`/admin/activities/${session.activity.id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}
