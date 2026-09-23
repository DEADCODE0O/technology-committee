"use server";

// ═══════════════════════════════════════════════════════════════
//  التسجيل في الجلسات (محاضرة/موعد ورشة): أعضاء / يدوي / ضيوف
//  + قائمة الانتظار — السيرفر هو الحكم في نوافذ التسجيل والسعة
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireStudentAction, requireActionUser, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES, isAdminRole } from "@/lib/permissions";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";
import { isValidArabicFullName, normalizePhone } from "@/lib/validation";
import { decideRegistration, waitlistAvailable, getSessionState } from "@/lib/activities";

function refresh(sessionId: string, activityId?: string) {
  revalidatePath(`/sessions/${sessionId}`);
  if (activityId) revalidatePath(`/activities/${activityId}`);
  revalidatePath("/panel");
  revalidatePath("/activities");
  if (activityId) revalidatePath(`/admin/activities/${activityId}`);
}

async function countRegistered(sessionId: string): Promise<number> {
  return db.registration.count({ where: { sessionId, status: "REGISTERED" } });
}

// ترقية أول قائمة الانتظار عند توفر مقعد — مع إعطاء الأولوية للطلاب الملتزمين غير المقيدين
async function promoteFromWaitlist(
  sessionId: string,
  adminId?: string
): Promise<{ id: string; waitlistOrder: number | null } | null> {
  const promoted = await db.$transaction(async (tx) => {
    // قفل حصري على صف الجلسة لمنع ترقية متزامنة مكررة
    await tx.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) return null;
    const registered = await tx.registration.count({ where: { sessionId, status: "REGISTERED" } });
    if (registered >= session.seats) return null;

    // الأولوية الأولى: الطلاب الملتزمون الذين لم يُقيد حضورهم
    let next = await tx.registration.findFirst({
      where: {
        sessionId,
        status: "WAITLISTED",
        OR: [
          { user: null },
          { user: { attendanceRestricted: false } },
        ],
      },
      orderBy: [{ waitlistOrder: "asc" }, { createdAt: "asc" }],
    });

    // في حال عدم وجود طلاب ملتزمين في الانتظار، يتم ترقية الباقين
    if (!next) {
      next = await tx.registration.findFirst({
        where: { sessionId, status: "WAITLISTED" },
        orderBy: [{ waitlistOrder: "asc" }, { createdAt: "asc" }],
      });
    }

    if (!next) return null;

    await tx.registration.update({
      where: { id: next.id },
      data: { status: "REGISTERED", waitlistOrder: null },
    });

    return { id: next.id, waitlistOrder: next.waitlistOrder, fullName: next.fullName };
  });

  if (promoted && adminId) {
    await logAudit({
      action: "WAITLIST_PROMOTED",
      entity: "REGISTRATION",
      entityId: promoted.id,
      summary: `ترقية من قائمة الانتظار: ${promoted.fullName}`,
    });
  }

  return promoted ? { id: promoted.id, waitlistOrder: promoted.waitlistOrder } : null;
}

// ─── تسجيل عضو (طالب لديه حساب) ─────────────────────────────

export async function registerToSession(
  sessionId: string,
  answers: Record<string, string | string[]>
): Promise<{ ok: boolean; error?: string; waitlisted?: boolean; restrictedNotice?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "سجّل دخولك أولًا" };
    if (!user.profile) return { ok: false, error: "أكمل بيانات حسابك أولًا قبل التسجيل" };
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { activity: { include: { formFields: { orderBy: { order: "asc" } } } } },
    });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (session.activity.publish !== "PUBLISHED") return { ok: false, error: "هذا النشاط غير متاح حاليًا" };

    // تحقق من الأسئلة الإلزامية (أسئلة النشاط — تُسأل مرة واحدة)
    for (const field of session.activity.formFields) {
      if (field.required) {
        const val = answers[field.id];
        const empty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
        if (empty) return { ok: false, error: `السؤال «${field.label}» إلزامي` };
      }
    }

    const adminBypass = isAdminRole(user.role) && session.allowAdminOverride;
    const isAttendanceRestricted = user.attendanceRestricted || (user.unexcusedAbsences ?? 0) >= 3;

    const txResult = await db.$transaction(async (tx) => {
      // قفل حصري على صف الجلسة لمنع أي سباق تزامني (Race Condition) عند امتلاء المقاعد
      await tx.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      const registered = await tx.registration.count({ where: { sessionId, status: "REGISTERED" } });

      const decision = decideRegistration({
        session: {
          registrationOpensAt: session.registrationOpensAt,
          registrationClosesAt: session.registrationClosesAt,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          closingMode: session.closingMode,
          registrationOpen: session.registrationOpen,
        },
        registeredCount: registered,
        seats: session.seats,
      });

      if (!decision.open && !adminBypass) {
        if (decision.reason === "FULL" && waitlistAvailable({
          session: {
            registrationOpensAt: session.registrationOpensAt,
            registrationClosesAt: session.registrationClosesAt,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            closingMode: session.closingMode,
            registrationOpen: session.registrationOpen,
          },
          registeredCount: registered,
          seats: session.seats,
        })) {
          // السعة مكتملة والتاريخ لم يغلق → قائمة انتظار (نكمل بالأسفل)
        } else {
          return { ok: false as const, error: decision.message };
        }
      }

      // تسجيل سابق؟
      const existing = await tx.registration.findUnique({
        where: { sessionId_userId: { sessionId, userId: user.id } },
      });
      if (existing && existing.status !== "CANCELLED") {
        return {
          ok: false as const,
          error: existing.status === "WAITLISTED" ? "أنت بالفعل في قائمة الانتظار" : "أنت مسجل بالفعل في هذه الجلسة",
        };
      }

      const willWaitlist = !adminBypass && (registered >= session.seats || isAttendanceRestricted);
      const waitlistOrder = willWaitlist
        ? (await tx.registration.count({ where: { sessionId, status: "WAITLISTED" } })) + 1
        : null;

      const data = {
        sessionId,
        userId: user.id,
        fullName: user.profile?.fullName ?? user.email,
        phone: user.profile?.phone ?? null,
        email: user.email,
        grade: user.profile?.grade ?? null,
        section: user.profile?.section ?? null,
        gender: user.profile?.gender ?? null,
        studentCode: user.profile?.studentCode ?? null,
        answers: Object.keys(answers).length ? JSON.stringify(answers) : null,
        source: "ACCOUNT",
        status: willWaitlist ? "WAITLISTED" : "REGISTERED",
        waitlistOrder,
      };

      if (existing) {
        await tx.registration.update({ where: { id: existing.id }, data });
      } else {
        await tx.registration.create({ data });
      }

      return {
        ok: true as const,
        isNew: !existing,
        willWaitlist,
        registered,
        fullName: data.fullName,
      };
    });

    if (!txResult.ok) {
      return { ok: false, error: txResult.error };
    }

    if (txResult.isNew) {
      // تقييم الإنجازات المتعلقة بالمشاركة (فعاليات/مسابقات)
      try {
        const { evaluateQuests } = await import("@/lib/progress");
        await evaluateQuests(user.id, "JOIN_EVENT", "REGISTRATION");
      } catch {}
    }

    await logAudit({
      action: txResult.willWaitlist ? "WAITLIST_JOINED" : "SESSION_REGISTERED",
      entity: "REGISTRATION",
      entityId: sessionId,
      summary: `${txResult.fullName} — ${txResult.willWaitlist ? (isAttendanceRestricted ? "انضم لقائمة الانتظار (تقييد بسبب 3 غيابات)" : "انضم لقائمة انتظار") : "سجل في"} «${session.activity.title} — ${session.title}»`,
    });

    refresh(sessionId, session.activityId);
    return {
      ok: true,
      waitlisted: txResult.willWaitlist,
      restrictedNotice:
        txResult.willWaitlist && isAttendanceRestricted && txResult.registered < session.seats
          ? "نظراً لوجود 3 غيابات سابقة في الورش بدون عذر، تم نقلك لقائمة الانتظار تلقائياً لإعطاء الأولوية للطلاب الملتزمين."
          : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── إلغاء تسجيل عضو ────────────────────────────────────────

export async function cancelRegistration(registrationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: { session: { include: { activity: true } } },
    });
    if (!reg || reg.userId !== user.id) return { ok: false, error: "التسجيل غير موجود" };
    if (reg.status === "CANCELLED") return { ok: false, error: "التسجيل ملغي بالفعل" };
    if (getSessionState(reg.session) === "COMPLETED") {
      return { ok: false, error: "لا يمكن الإلغاء بعد انتهاء الجلسة" };
    }

    await db.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED", waitlistOrder: null },
    });

    await promoteFromWaitlist(reg.sessionId);

    await logAudit({
      action: "REGISTRATION_CANCELLED",
      entity: "REGISTRATION",
      entityId: registrationId,
      summary: `${reg.fullName} ألغى تسجيله في «${reg.session.activity.title} — ${reg.session.title}»`,
    });

    refresh(reg.sessionId, reg.session.activityId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تسجيل يدوي من الإدارة (Manual — بدون إنشاء حساب) ───────

export type ManualRegistrationInput = {
  sessionId: string;
  fullName: string;
  phone: string;
  email?: string;
  grade?: string;
  section?: string;
  gender?: string;
  studentCode?: string;
  answers?: Record<string, string | string[]>;
};

export async function addManualRegistration(
  input: ManualRegistrationInput
): Promise<{ ok: boolean; error?: string; waitlisted?: boolean }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");

    const fullName = (input.fullName || "").trim().replace(/\s+/g, " ");
    if (!isValidArabicFullName(fullName)) {
      return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };
    }
    const phone = normalizePhone(input.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم هاتف غير صحيح — مثال: 01012345678" };
    if (!["FIRST", "SECOND", "THIRD", "FOURTH"].includes(input.grade || "")) return { ok: false, error: "الفرقة مطلوبة" };
    if (!["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(input.section || "")) return { ok: false, error: "الشعبة مطلوبة" };
    if (!["MALE", "FEMALE"].includes(input.gender || "")) return { ok: false, error: "الجنس مطلوب" };

    const session = await db.session.findUnique({ where: { id: input.sessionId }, include: { activity: true } });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };

    const txResult = await db.$transaction(async (tx) => {
      // قفل حصري على صف الجلسة
      await tx.session.update({
        where: { id: input.sessionId },
        data: { updatedAt: new Date() },
      });

      // منع التكرار: نفس الهاتف بنفس الجلسة
      const dup = await tx.registration.findFirst({
        where: { sessionId: input.sessionId, phone, status: { not: "CANCELLED" } },
      });
      if (dup) return { ok: false as const, error: "هذا الرقم مسجل بالفعل في هذه الجلسة" };

      const registered = await tx.registration.count({ where: { sessionId: input.sessionId, status: "REGISTERED" } });

      // الإضافة اليدوية تتجاوز العدد ووقت الإغلاق — فقط إذا كان التجاوز مفعّلًا لهذه الجلسة
      if (!session.allowAdminOverride) {
        const decision = decideRegistration({
          session: {
            registrationOpensAt: session.registrationOpensAt,
            registrationClosesAt: session.registrationClosesAt,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            closingMode: session.closingMode,
            registrationOpen: session.registrationOpen,
          },
          registeredCount: registered,
          seats: session.seats,
        });
        if (!decision.open) return { ok: false as const, error: `التجاوز الإداري معطّل لهذه الجلسة (${decision.message})` };
      }

      const overCapacity = registered >= session.seats;

      const reg = await tx.registration.create({
        data: {
          sessionId: input.sessionId,
          userId: null,
          fullName,
          phone,
          email: (input.email || "").trim() || null,
          grade: input.grade || null,
          section: input.section || null,
          gender: input.gender || null,
          studentCode: (input.studentCode || "").trim() || null,
          answers: input.answers && Object.keys(input.answers).length ? JSON.stringify(input.answers) : null,
          source: "MANUAL",
          status: "REGISTERED",
          waitlistOrder: null,
        },
      });

      return { ok: true as const, reg, overCapacity, registered };
    });

    if (!txResult.ok) {
      return { ok: false, error: txResult.error };
    }

    await logAudit({
      actor: admin,
      action: "MANUAL_REGISTRATION",
      entity: "REGISTRATION",
      entityId: txResult.reg.id,
      summary: `تسجيل يدوي: ${fullName} في «${session.activity.title} — ${session.title}»${txResult.overCapacity ? " — بتجاوز العدد المتاح" : ""}`,
      details: { sessionId: input.sessionId, overCapacity: txResult.overCapacity, registeredBefore: txResult.registered, seats: session.seats },
    });

    refresh(input.sessionId, session.activityId);
    return { ok: true, waitlisted: false };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تسجيل ضيف (بدون حساب) — يتطلب تفعيل الضيوف ────────────

export type GuestRegistrationInput = {
  sessionId: string;
  fullName: string;
  phone: string;
  email?: string;
  grade?: string;
  section?: string;
  gender?: string;
  answers?: Record<string, string | string[]>;
};

export async function guestRegisterToSession(
  input: GuestRegistrationInput
): Promise<{ ok: boolean; error?: string; waitlisted?: boolean }> {
  try {
    const ip = clientIp(await headers());
    const ipLimit = rateLimit(`guest:ip:${ip}`, 10, 60 * 60 * 1000);
    if (!ipLimit.ok) return { ok: false, error: waitMessage(ipLimit.retryAfterSec) };

    const session = await db.session.findUnique({
      where: { id: input.sessionId },
      include: { activity: { include: { formFields: { orderBy: { order: "asc" } } } } },
    });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (session.activity.publish !== "PUBLISHED") return { ok: false, error: "هذا النشاط غير متاح حاليًا" };
    if (!session.allowGuests) return { ok: false, error: "هذه الجلسة للأعضاء المسجلين فقط" };

    // لو مسجل دخوله كعضو — سجّل بحسابك بدل ضيف
    const user = await getCurrentUser();
    if (user) {
      if (user.role === "STUDENT") {
        return { ok: false, error: "أنت عضو لدينا — سجّل بحسابك من نموذج العضو أعلاه" };
      }
      return { ok: false, error: "أنت داخل بحساب — استخدم نموذج التسجيل بحسابك" };
    }

    const fullName = (input.fullName || "").trim().replace(/\s+/g, " ");
    if (!isValidArabicFullName(fullName)) {
      return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };
    }
    const phone = normalizePhone(input.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم هاتف غير صحيح — مثال: 01012345678" };
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { ok: false, error: "بريد إلكتروني غير صحيح" };
    }
    if (!input.grade || !["FIRST", "SECOND", "THIRD", "FOURTH"].includes(input.grade)) {
      return { ok: false, error: "الفرقة مطلوبة — اختر فرقتك" };
    }
    if (!input.section || !["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(input.section)) {
      return { ok: false, error: "الشعبة مطلوبة — اختر شعبتك" };
    }
    if (!input.gender || !["MALE", "FEMALE"].includes(input.gender)) {
      return { ok: false, error: "الجنس مطلوب — اختره" };
    }

    const answers = input.answers ?? {};
    for (const field of session.activity.formFields) {
      if (field.required) {
        const val = answers[field.id];
        const empty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
        if (empty) return { ok: false, error: `السؤال «${field.label}» إلزامي` };
      }
    }

    const txResult = await db.$transaction(async (tx) => {
      // قفل حصري على صف الجلسة لمنع السباق التزامني عند وصول تسجيلات متعددة في نفس اللحظة
      await tx.session.update({
        where: { id: input.sessionId },
        data: { updatedAt: new Date() },
      });

      const registered = await tx.registration.count({ where: { sessionId: input.sessionId, status: "REGISTERED" } });

      const gate = {
        session: {
          registrationOpensAt: session.registrationOpensAt,
          registrationClosesAt: session.registrationClosesAt,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          closingMode: session.closingMode,
          registrationOpen: session.registrationOpen,
        },
        registeredCount: registered,
        seats: session.seats,
      };
      const decision = decideRegistration(gate);
      const canWaitlist = decision.reason === "FULL" && waitlistAvailable(gate);
      if (!decision.open && !canWaitlist) return { ok: false as const, error: decision.message };

      const dup = await tx.registration.findFirst({
        where: { sessionId: input.sessionId, phone, status: { not: "CANCELLED" } },
      });
      if (dup) return { ok: false as const, error: "هذا الرقم مسجل بالفعل في هذه الجلسة" };

      const isFull = registered >= session.seats;
      const waitlistOrder = isFull
        ? (await tx.registration.count({ where: { sessionId: input.sessionId, status: "WAITLISTED" } })) + 1
        : null;

      const reg = await tx.registration.create({
        data: {
          sessionId: input.sessionId,
          userId: null,
          fullName,
          phone,
          email: (input.email || "").trim() || null,
          grade: input.grade || null,
          section: input.section || null,
          gender: input.gender || null,
          studentCode: null,
          answers: Object.keys(answers).length ? JSON.stringify(answers) : null,
          source: "GUEST",
          status: isFull ? "WAITLISTED" : "REGISTERED",
          waitlistOrder,
        },
      });

      return { ok: true as const, reg, isFull };
    });

    if (!txResult.ok) {
      return { ok: false, error: txResult.error };
    }

    await logAudit({
      action: "GUEST_REGISTERED",
      entity: "REGISTRATION",
      entityId: txResult.reg.id,
      summary: `تسجيل ضيف: ${fullName} (${phone}) في «${session.activity.title} — ${session.title}»${txResult.isFull ? " — قائمة انتظار" : ""}`,
      details: {
        sessionId: input.sessionId,
        status: txResult.reg.status,
        waitlistOrder: txResult.reg.waitlistOrder,
      },
    });

    refresh(input.sessionId, session.activityId);
    return { ok: true, waitlisted: txResult.isFull };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── إدارة: إلغاء تسجيل طالب (من الأدمن) ────────────────────

export async function adminCancelRegistration(registrationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: { session: { include: { activity: true } } },
    });
    if (!reg) return { ok: false, error: "التسجيل غير موجود" };

    await db.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED", waitlistOrder: null },
    });
    const promoted = await promoteFromWaitlist(reg.sessionId, admin.id);

    await logAudit({
      actor: admin,
      action: "ADMIN_CANCELLED_REGISTRATION",
      entity: "REGISTRATION",
      entityId: registrationId,
      summary: `الإدارة ألغت تسجيل ${reg.fullName} في «${reg.session.activity.title} — ${reg.session.title}»`,
      details: {
        sessionId: reg.sessionId,
        before: { status: reg.status, waitlistOrder: reg.waitlistOrder },
        promoted: promoted ? { id: promoted.id, waitlistOrder: promoted.waitlistOrder } : null,
      },
    });

    refresh(reg.sessionId, reg.session.activityId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── ترقية يدوية من قائمة الانتظار ──────────────────────────
// قرار الإدارة: الترقية مسموحة دائمًا حتى لو تجاوزت العدد المتاح

export async function adminPromoteRegistration(registrationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.WORKSHOPS, "manage");
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: { session: { include: { activity: true } } },
    });
    if (!reg) return { ok: false, error: "التسجيل غير موجود" };
    if (reg.status !== "WAITLISTED") return { ok: false, error: "هذا التسجيل ليس في قائمة الانتظار" };

    const registered = await countRegistered(reg.sessionId);
    const overCapacity = registered >= reg.session.seats;

    await db.registration.update({
      where: { id: registrationId },
      data: { status: "REGISTERED", waitlistOrder: null },
    });

    await logAudit({
      actor: admin,
      action: "ADMIN_PROMOTED_REGISTRATION",
      entity: "REGISTRATION",
      entityId: registrationId,
      summary: `ترقية ${reg.fullName} من قائمة انتظار «${reg.session.activity.title} — ${reg.session.title}»${overCapacity ? " — بتجاوز العدد المتاح" : ""}`,
      details: {
        sessionId: reg.sessionId,
        before: { status: reg.status, waitlistOrder: reg.waitlistOrder },
        overCapacity,
        registeredBefore: registered,
        seats: reg.session.seats,
      },
    });

    refresh(reg.sessionId, reg.session.activityId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
