"use server";

// ═══════════════════════════════════════════════════════════════
//  العمليات الجديدة:
//  1) إدارة المشرفين: ترقية طالب → مشرف بصلاحيات مخصصة / تنزيل / تعليق
//  2) تعديل كامل بيانات الطالب: الملف + البريد + كلمة السر
//  3) طلبات البيانات: إنشاء/إغلاق/حذف + استجابة الطالب
//  4) النقاط: حذف حدث + منح جماعي لمجموعة مستهدفة
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction, hashPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/platform";
import { MODULES, EDITABLE_MODULES, type CustomPerms } from "@/lib/permissions";
import { ADMIN_ROLES } from "@/lib/constants";
import { findTargetedStudentIds, parseTarget, type StudentTarget } from "@/lib/targeting";
import { makeDataKey, normalizeArabicName, isValidArabicFullName, normalizePhone } from "@/lib/validation";

const VALID_FIELD_TYPES = ["TEXT", "LONGTEXT", "NUMBER", "PHONE", "EMAIL", "SELECT", "RADIO", "CHECKBOX", "DATE", "TIME", "FILE"];

// ═══════════════════════════════════════════════════════════════
//  1) إدارة المشرفين — صلاحيات دقيقة لكل مشرف
// ═══════════════════════════════════════════════════════════════

// ترقية طالب إلى مشرف / تحديث دور وصلاحيات مشرف قائم
export async function setStaffRole(
  userId: string,
  role: string,
  customPermissions: Record<string, string | boolean> | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ADMINS, "manage");
    if (!ADMIN_ROLES.includes(role)) return { ok: false, error: "دور غير صحيح" };
    if (userId === admin.id) return { ok: false, error: "لا يمكنك تعديل دورك بنفسك" };

    const target = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!target) return { ok: false, error: "الحساب غير موجود" };

    // المدير الأعلى فقط من يمنح أو يعدل دور المدير الأعلى
    if (role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
      return { ok: false, error: "فقط المدير الأعلى يمكنه منح دور المدير الأعلى" };
    }
    if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
      return { ok: false, error: "لا يمكنك تعديل حساب المدير الأعلى" };
    }

    // تنظيف الصلاحيات المخصصة: قيم صحيحة فقط على وحدات معروفة
    let permsJson: string | null = null;
    if (customPermissions) {
      const clean: CustomPerms = {};
      for (const m of EDITABLE_MODULES) {
        const v = customPermissions[m.key];
        if (v === "manage" || v === "view" || v === false) clean[m.key] = v;
      }
      if (Object.keys(clean).length > 0) permsJson = JSON.stringify(clean);
    }

    await db.user.update({
      where: { id: userId },
      data: { role, customPermissions: permsJson },
    });

    await logAudit({
      actor: admin,
      action: "STAFF_ROLE_SET",
      entity: "USER",
      entityId: userId,
      summary: `تعيين ${(target.profile?.fullName ?? target.email)} مشرفًا (${role})${permsJson ? " بصلاحيات مخصصة" : ""}`,
      details: {
        role,
        customPermissions: customPermissions ?? null,
        before: { role: target.role, customPermissions: target.customPermissions },
      },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// تنزيل مشرف إلى طالب عادي
export async function demoteToStudent(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ADMINS, "manage");
    if (userId === admin.id) return { ok: false, error: "لا يمكنك تنزيل نفسك — اطلبها من المدير الأعلى" };

    const target = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!target) return { ok: false, error: "الحساب غير موجود" };
    if (target.role === "STUDENT") return { ok: false, error: "هذا حساب طالب بالفعل" };
    if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
      return { ok: false, error: "لا يمكنك تنزيل المدير الأعلى" };
    }

    await db.user.update({
      where: { id: userId },
      data: { role: "STUDENT", customPermissions: null },
    });

    await logAudit({
      actor: admin,
      action: "STAFF_DEMOTED",
      entity: "USER",
      entityId: userId,
      summary: `تنزيل ${target.profile?.fullName ?? target.email} إلى طالب`,
      details: { before: { role: target.role, customPermissions: target.customPermissions } },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// تعليق / تنشيط حساب مشرف
export async function toggleStaffStatus(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ADMINS, "manage");
    if (userId === admin.id) return { ok: false, error: "لا يمكنك تعليق حسابك" };

    const target = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!target || target.role === "STUDENT") return { ok: false, error: "الحساب غير موجود أو ليس مشرفًا" };

    const next = target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await db.user.update({ where: { id: userId }, data: { status: next } });

    await logAudit({
      actor: admin,
      action: "STAFF_STATUS",
      entity: "USER",
      entityId: userId,
      summary: `${next === "SUSPENDED" ? "تعليق" : "تنشيط"} حساب المشرف ${target.profile?.fullName ?? target.email}`,
    });

    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// إعادة تعيين كلمة سر مشرف — كلمة مؤقتة تظهر مرة واحدة
export async function resetStaffPassword(userId: string): Promise<{ ok: boolean; error?: string; tempPassword?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ADMINS, "manage");
    const target = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!target || target.role === "STUDENT") return { ok: false, error: "الحساب غير موجود" };

    const temp = `TC${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;

    // ══ وضع Supabase: كلمة السر تُدار في Supabase Auth (Admin API) ══
    if (isSupabaseConfigured()) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return { ok: false, error: "تعذر التنفيذ — متغير SUPABASE_SERVICE_ROLE_KEY غير مضبوط على السيرفر" };
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: temp });
      if (error) {
        console.error("resetStaffPassword supabase error:", error);
        return { ok: false, error: "تعذر تحديث كلمة السر في نظام المصادقة — تأكد أن الحساب منشأ عبر المنصة" };
      }
    } else {
      // ══ وضع التطوير المحلي: bcrypt ══
      await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(temp) } });
    }

    await logAudit({
      actor: admin,
      action: "PASSWORD_RESET",
      entity: "USER",
      entityId: userId,
      summary: `إعادة تعيين كلمة سر المشرف ${target.profile?.fullName ?? target.email}`,
    });
    return { ok: true, tempPassword: temp };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ═══════════════════════════════════════════════════════════════
//  2) تعديل كامل بيانات الطالب — حتى البريد وكلمة السر
// ═══════════════════════════════════════════════════════════════

export type StudentEditInput = {
  fullName: string;
  grade: string;
  section: string;
  gender: string;
  phone: string;
  studentCode?: string;
  email?: string; // جديد — تعديل البريد
  newPassword?: string; // جديد — تعيين كلمة سر جديدة
};

export async function updateStudentFull(userId: string, input: StudentEditInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.STUDENTS, "manage");
    const student = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "الطالب غير موجود" };

    const fullName = normalizeArabicName(input.fullName || "");
    if (!isValidArabicFullName(fullName)) {
      return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };
    }
    const phone = normalizePhone(input.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم هاتف غير صحيح — مثال: 01012345678" };
    if (!["FIRST", "SECOND", "THIRD", "FOURTH"].includes(input.grade)) return { ok: false, error: "الفرقة مطلوبة" };
    if (!["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(input.section)) return { ok: false, error: "الشعبة مطلوبة" };
    if (!["MALE", "FEMALE"].includes(input.gender)) return { ok: false, error: "اختر الجنس" };

    // تعديل البريد؟
    let newEmail: string | undefined;
    if (input.email !== undefined && input.email !== student.email) {
      const email = (input.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "بريد إلكتروني غير صحيح" };
      const taken = await db.user.findUnique({ where: { email } });
      if (taken && taken.id !== userId) return { ok: false, error: "هذا البريد مستخدم بحساب آخر" };
      newEmail = email;
    }

    // كلمة سر جديدة؟
    let newPassword: string | undefined;
    if (input.newPassword) {
      if (input.newPassword.length < 8) return { ok: false, error: "كلمة السر الجديدة: 8 أحرف على الأقل" };
      newPassword = input.newPassword;
    }

    // تحديث الحساب
    const userData: Record<string, unknown> = {};
    if (newEmail) userData.email = newEmail;

    // ══ وضع Supabase: البريد وكلمة السر في Supabase Auth (Admin API) ══
    if (isSupabaseConfigured()) {
      const supabaseAdmin = getSupabaseAdmin();
      if (newPassword || (newEmail && supabaseAdmin)) {
        if (!supabaseAdmin) {
          return { ok: false, error: "تعذر التنفيذ — متغير SUPABASE_SERVICE_ROLE_KEY غير مضبوط على السيرفر" };
        }
        const update: { password?: string; email?: string } = {};
        if (newPassword) update.password = newPassword;
        if (newEmail) update.email = newEmail;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, update);
        if (error) {
          console.error("updateStudentFull supabase error:", error);
          return { ok: false, error: "تعذر تحديث بيانات الدخول في نظام المصادقة — تأكد أن الحساب منشأ عبر المنصة" };
        }
      }
    } else {
      // ══ وضع التطوير المحلي: bcrypt محلي ══
      if (newPassword) userData.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(userData).length > 0) {
      await db.user.update({ where: { id: userId }, data: userData });
    }

    // تحديث الملف
    const profileData = {
      fullName,
      phone,
      grade: input.grade,
      section: input.section,
      gender: input.gender,
      phoneVerified: true,
      studentCode: (input.studentCode || "").trim() || null,
    };
    if (student.profile) {
      await db.studentProfile.update({ where: { userId }, data: profileData });
    } else {
      await db.studentProfile.create({ data: { userId, ...profileData } });
    }

    await logAudit({
      actor: admin,
      action: "STUDENT_UPDATED",
      entity: "STUDENT",
      entityId: userId,
      summary: `تعديل بيانات ${fullName}${newEmail ? ` — بريد جديد: ${newEmail}` : ""}${newPassword ? " + كلمة سر جديدة" : ""}`,
      details: {
        before: student.profile
          ? {
              email: student.email,
              fullName: student.profile.fullName,
              phone: student.profile.phone,
              grade: student.profile.grade,
              section: student.profile.section,
              gender: student.profile.gender,
              studentCode: student.profile.studentCode,
            }
          : null,
        after: { ...profileData, email: newEmail ?? student.email },
        emailChanged: !!newEmail,
        passwordChanged: !!newPassword,
      },
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${userId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ═══════════════════════════════════════════════════════════════
//  3) طلبات البيانات — نماذج مخصصة موجهة لمجموعات
// ═══════════════════════════════════════════════════════════════

export type DataRequestFieldInput = {
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
};

export async function createDataRequest(input: {
  title: string;
  description?: string;
  fields: DataRequestFieldInput[];
  target: StudentTarget;
  deadline?: string; // ISO أو فارغ
  mandatory?: boolean; // إلزامي: يمنع الطالب من استخدام المنصة حتى يجيب
  reusePreviousAnswers?: boolean; // افتراضيًا: لا نعيد سؤال الطالب عن معلومة محفوظة
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");
    const title = (input.title || "").trim();
    if (title.length < 3) return { ok: false, error: "عنوان الطلب قصير جدًا" };

    const fields = (input.fields || []).filter((f) => (f.label || "").trim().length > 0);
    if (fields.length === 0) return { ok: false, error: "أضف سؤالاً واحدًا على الأقل" };
    for (const f of fields) {
      if (!VALID_FIELD_TYPES.includes(f.type)) return { ok: false, error: `نوع سؤال غير صحيح: ${f.type}` };
      if (["SELECT", "RADIO", "CHECKBOX"].includes(f.type) && (f.options ?? []).filter((o) => o.trim()).length < 2) {
        return { ok: false, error: `السؤال «${f.label}» يحتاج خيارين على الأقل` };
      }
    }

    let deadline: Date | null = null;
    if (input.deadline) {
      const d = new Date(input.deadline);
      if (!isNaN(d.getTime())) deadline = d;
    }

    // تنظيف الفلتر
    const target = parseTarget(JSON.stringify(input.target ?? {}));

    const created = await db.dataRequest.create({
      data: {
        title,
        description: (input.description || "").trim() || null,
        fields: JSON.stringify(fields.map((f, i) => ({
          id: `f${i + 1}`,
          key: makeDataKey(f.label),
          label: f.label.trim(),
          type: f.type,
          options: ["SELECT", "RADIO", "CHECKBOX"].includes(f.type) ? (f.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
          required: !!f.required,
        }))),
        target: JSON.stringify(target),
        deadline,
        mandatory: !!input.mandatory,
        reusePreviousAnswers: input.reusePreviousAnswers !== false,
        createdById: admin.id,
      },
    });

    const matched = await findTargetedStudentIds(target);

    await logAudit({
      actor: admin,
      action: "DATA_REQUEST_CREATED",
      entity: "DATA_REQUEST",
      entityId: created.id,
      summary: `طلب بيانات «${title}»${input.mandatory ? " (إلزامي)" : ""} — موجه لـ ${matched.length} طالبًا`,
      details: { target, fieldsCount: fields.length, mandatory: !!input.mandatory },
    });

    revalidatePath("/admin/data-requests");
    revalidatePath("/panel");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function toggleDataRequestStatus(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");
    const req = await db.dataRequest.findUnique({ where: { id } });
    if (!req) return { ok: false, error: "الطلب غير موجود" };

    const next = req.status === "OPEN" ? "CLOSED" : "OPEN";
    await db.dataRequest.update({ where: { id }, data: { status: next } });

    await logAudit({
      actor: admin,
      action: "DATA_REQUEST_STATUS",
      entity: "DATA_REQUEST",
      entityId: id,
      summary: `${next === "OPEN" ? "فتح" : "إغلاق"} طلب البيانات «${req.title}»`,
      details: { id, before: req.status },
    });

    revalidatePath("/admin/data-requests");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteDataRequest(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");
    const req = await db.dataRequest.findUnique({ where: { id }, include: { _count: { select: { responses: true } } } });
    if (!req) return { ok: false, error: "الطلب غير موجود" };

    await db.dataRequest.delete({ where: { id } }); // الاستجابات تُحذف تلقائيًا (Cascade)

    await logAudit({
      actor: admin,
      action: "DATA_REQUEST_DELETED",
      entity: "DATA_REQUEST",
      entityId: id,
      summary: `حذف طلب البيانات «${req.title}» (${req._count.responses} استجابة)`,
    });

    revalidatePath("/admin/data-requests");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// استجابة الطالب على طلب بيانات (إرسال أول مرة أو تعديل)
export async function submitDataResponse(
  requestId: string,
  answers: Record<string, string | string[]>
): Promise<{ ok: boolean; error?: string }> {
  try {
    // إجابة الطلب نفسها هي وسيلة فتح البوابة — تتجاوز فحص الإلزامية
    const user = await requireStudentAction({ skipRequiredGate: true });
    const req = await db.dataRequest.findUnique({ where: { id: requestId } });
    if (!req) return { ok: false, error: "الطلب غير موجود" };
    if (req.status !== "OPEN") return { ok: false, error: "هذا الطلب مغلق الآن" };
    if (req.deadline && new Date(req.deadline) < new Date()) {
      return { ok: false, error: "انتهى الموعد النهائي لهذا الطلب" };
    }

    // التحقق من الأسئلة الإلزامية
    let fields: { id: string; label: string; required?: boolean }[] = [];
    try {
      fields = JSON.parse(req.fields);
    } catch {
      fields = [];
    }
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) return { ok: false, error: `السؤال «${f.label}» إلزامي` };
      }
    }

    await db.dataResponse.upsert({
      where: { requestId_userId: { requestId, userId: user.id } },
      create: { requestId, userId: user.id, answers: JSON.stringify(answers) },
      update: { answers: JSON.stringify(answers), updatedAt: new Date() },
    });

    // حفظ إجابات الأسئلة على ملف الطالب دائمًا — أي معلومة يدخلها
    // الطالب مرة واحدة لا يُسأل عنها مجددًا في أي طلب لاحق.
    for (const f of fields as Array<{ id: string; key?: string; label: string; type?: string }>) {
      const value = answers[f.id];
      const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) continue;
      await db.studentData.upsert({
        where: { userId_key: { userId: user.id, key: f.key || makeDataKey(f.label) } },
        create: {
          userId: user.id,
          key: f.key || makeDataKey(f.label),
          label: f.label,
          type: f.type || "TEXT",
          value: JSON.stringify(value),
          sourceRequestId: req.id,
        },
        update: {
          label: f.label,
          type: f.type || "TEXT",
          value: JSON.stringify(value),
          sourceRequestId: req.id,
          updatedAt: new Date(),
        },
      });
    }

    await logAudit({
      actor: user,
      action: "DATA_RESPONSE_SUBMITTED",
      entity: "DATA_REQUEST",
      entityId: requestId,
      summary: `الطالب ${user.profile?.fullName ?? user.email} أجاب على «${req.title}»`,
    });

    revalidatePath("/panel");
    revalidatePath("/panel/required");
    revalidatePath(`/panel/requests/${requestId}`);
    revalidatePath("/admin/data-requests");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ═══════════════════════════════════════════════════════════════
//  4) النقاط — حذف حدث + منح جماعي
// ═══════════════════════════════════════════════════════════════

// حذف حدث نقاط نهائيًا (بسبب موثق في سجل العمليات)
export async function deletePointEvent(eventId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const why = (reason || "").trim();
    if (why.length < 3) return { ok: false, error: "اكتب سبب الحذف" };

    const event = await db.pointEvent.findUnique({ where: { id: eventId }, include: { user: { include: { profile: true } } } });
    if (!event) return { ok: false, error: "الحدث غير موجود" };

    await db.pointEvent.delete({ where: { id: eventId } });

    await logAudit({
      actor: admin,
      action: "POINT_EVENT_DELETED",
      entity: "POINT_EVENT",
      entityId: eventId,
      summary: `حذف ${event.points} نقطة من ${event.user.profile?.fullName ?? event.user.email} — ${why}`,
      details: {
        removed: event.points,
        reason: why,
        originalReason: event.reason,
        // نسخة كاملة للحدث — تتيح استعادته بالتراجع
        event: {
          userId: event.userId,
          points: event.points,
          reason: event.reason,
          ruleAction: event.ruleAction,
          sessionId: event.sessionId,
          createdById: event.createdById,
          createdAt: event.createdAt.toISOString(),
        },
      },
    });

    revalidatePath("/admin/points");
    revalidatePath("/leaderboard");
    revalidatePath(`/admin/students/${event.userId}`);
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// منح/خصم نقاط جماعي لمجموعة مستهدفة (فرقة/شعبة/جنس/حضور/مواهب/متفوقين/محددين)
export async function bulkAwardPoints(
  target: StudentTarget,
  points: number,
  reason: string
): Promise<{ ok: boolean; error?: string; count?: number }> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");
    const pts = Number(points);
    const why = (reason || "").trim();
    if (!Number.isInteger(pts) || pts === 0) return { ok: false, error: "أدخل قيمة نقاط صحيحة (≠ 0)" };
    if (Math.abs(pts) > 1000) return { ok: false, error: "الحد الأقصى للعملية الجماعية: 1000 نقطة" };
    if (why.length < 3) return { ok: false, error: "سبب النقاط إلزامي — اكتب سببًا واضحًا" };

    const ids = await findTargetedStudentIds(parseTarget(JSON.stringify(target ?? {})));
    if (ids.length === 0) return { ok: false, error: "لا يوجد طلاب مطابقون لهذا الاستهداف" };

    const startedAt = new Date();
    await db.pointEvent.createMany({
      data: ids.map((userId) => ({
        userId,
        points: pts,
        reason: why,
        createdById: admin.id,
      })),
    });

    // معرفات الأحداث المنشأة — تتيح التراجع الدقيق عن العملية الجماعية
    const createdEvents = await db.pointEvent.findMany({
      where: {
        userId: { in: ids },
        points: pts,
        reason: why,
        createdById: admin.id,
        createdAt: { gte: startedAt },
      },
      select: { id: true },
    });

    await logAudit({
      actor: admin,
      action: "POINTS_BULK",
      entity: "POINT_EVENT",
      summary: `${pts > 0 ? "منح" : "خصم"} ${Math.abs(pts)} نقطة لـ ${ids.length} طالبًا — ${why}`,
      details: {
        target,
        points: pts,
        reason: why,
        count: ids.length,
        eventIds: createdEvents.map((e) => e.id),
      },
    });

    revalidatePath("/admin/points");
    revalidatePath("/admin/students");
    revalidatePath("/leaderboard");
    revalidatePath("/panel");
    return { ok: true, count: ids.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
