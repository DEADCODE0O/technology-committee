"use server";

// ═══════════════════════════════════════════════════════════════
//  الحضور — منفصل تمامًا عن التسجيل
//  يدوي (checkboxes) أو QR (مسح الطالب للكود)
//  v4: التسجيل والحضور على مستوى الجلسة (محاضرة/موعد ورشة)
//  + منح/عكس نقاط الحضور تلقائيًا (مرة واحدة لكل جلسة)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { getSessionState } from "@/lib/activities";

// منح نقاط حضور إن كانت القاعدة مفعّلة ولم تُمنح من قبل (مرة واحدة لكل جلسة)
async function awardAttendancePoints(sessionId: string, userId: string, adminId: string): Promise<string | null> {
  const rule = await db.pointRule.findUnique({ where: { action: "WORKSHOP_ATTENDANCE" } });
  if (!rule || !rule.active || rule.points <= 0) return null;

  const dup = await db.pointEvent.findFirst({
    where: { userId, sessionId, ruleAction: "WORKSHOP_ATTENDANCE" },
  });
  if (dup) return null;

  const { stampSeasonId, evaluateQuests } = await import("@/lib/progress");
  const seasonId = await stampSeasonId();
  const event = await db.pointEvent.create({
    data: {
      userId,
      points: rule.points,
      reason: "حضور جلسة",
      ruleAction: rule.action,
      sessionId,
      seasonId,
      createdById: adminId,
    },
  });
  // تقييم الإنجازات فور منح نقاط الحضور
  await evaluateQuests(userId, "ATTEND", "ATTENDANCE").catch(() => {});
  return event.id;
}

// إلغاء نقاط الحضور عند التراجع — قرار الحضور ليس نهائيًا
async function reverseAttendancePoints(sessionId: string, userId: string): Promise<string | null> {
  const event = await db.pointEvent.findFirst({
    where: { userId, sessionId, ruleAction: "WORKSHOP_ATTENDANCE" },
  });
  if (!event) return null;
  await db.pointEvent.delete({ where: { id: event.id } });
  return event.id;
}

function refresh(sessionId: string, activityId?: string) {
  if (activityId) revalidatePath(`/admin/activities/${activityId}`);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/panel");
  revalidatePath("/leaderboard");
}

// ─── تحديد حضور يدوي (حضر / لم يحضر) — لجلسة محددة ──────────

export async function setAttendance(
  registrationId: string,
  present: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: {
        session: { include: { activity: true } },
        attendance: true,
      },
    });
    if (!reg) return { ok: false, error: "التسجيل غير موجود" };
    if (reg.status !== "REGISTERED") return { ok: false, error: "الحضور يُسجل للمسجلين فقط (وليس قائمة الانتظار أو الملغيين)" };

    // الحضور يُسجل أثناء الجلسة أو بعد انتهائها (وليس قبل بدايتها)
    if (getSessionState(reg.session) === "UPCOMING") {
      return { ok: false, error: "الحضور يُسجل أثناء الجلسة أو بعد انتهائها — الجلسة لم تبدأ بعد" };
    }

    const existing = reg.attendance.find((a) => a.sessionId === reg.sessionId) ?? null;
    if (existing) {
      await db.attendance.update({
        where: { id: existing.id },
        data: { present, method: "MANUAL", markedById: admin.id, markedAt: new Date() },
      });
    } else {
      await db.attendance.create({
        data: {
          registrationId,
          sessionId: reg.sessionId,
          present,
          method: "MANUAL",
          markedById: admin.id,
          markedAt: new Date(),
        },
      });
    }

    // نقاط الحضور: تُمنح عند الحضور وتُعكس عند الغياب
    let pointEventId: string | null = null;
    let reversedPointEventId: string | null = null;
    if (reg.userId) {
      if (present) {
        pointEventId = await awardAttendancePoints(reg.sessionId, reg.userId, admin.id);
      } else {
        reversedPointEventId = await reverseAttendancePoints(reg.sessionId, reg.userId);
      }
    }

    await logAudit({
      actor: admin,
      action: "ATTENDANCE_SET",
      entity: "REGISTRATION",
      entityId: registrationId,
      summary: `${present ? "حضور" : "غياب"} ${reg.fullName} — «${reg.session.activity.title}» / ${reg.session.title}${reversedPointEventId ? " (مع عكس نقاط الحضور)" : ""}`,
      details: {
        userId: reg.userId,
        sessionId: reg.sessionId,
        before: existing ? { present: existing.present, method: existing.method } : null,
        pointEventId,
        reversedPointEventId,
      },
    });

    refresh(reg.sessionId, reg.session.activityId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تسجيل حضور جماعي (كل المسجلين في الجلسة حاضرين) ─────────

export async function markAllPresent(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const session = await db.session.findUnique({ where: { id: sessionId }, include: { activity: true } });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (getSessionState(session) === "UPCOMING") return { ok: false, error: "الجلسة لم تبدأ بعد" };

    const regs = await db.registration.findMany({
      where: { sessionId, status: "REGISTERED" },
      include: { attendance: true },
    });

    const flips: { registrationId: string; userId: string | null; pointEventId: string | null }[] = [];
    for (const reg of regs) {
      const existing = reg.attendance.find((a) => a.sessionId === sessionId) ?? null;
      const wasPresent = existing?.present ?? false;
      if (existing) {
        if (!existing.present) {
          await db.attendance.update({
            where: { id: existing.id },
            data: { present: true, method: "MANUAL", markedById: admin.id, markedAt: new Date() },
          });
        }
      } else {
        await db.attendance.create({
          data: { registrationId: reg.id, sessionId, present: true, method: "MANUAL", markedById: admin.id, markedAt: new Date() },
        });
      }
      const pointEventId = reg.userId ? await awardAttendancePoints(sessionId, reg.userId, admin.id) : null;
      if (!wasPresent) flips.push({ registrationId: reg.id, userId: reg.userId, pointEventId });
    }

    await logAudit({
      actor: admin,
      action: "ATTENDANCE_ALL_PRESENT",
      entity: "SESSION",
      entityId: sessionId,
      summary: `تحديد حضور الجميع في «${session.activity.title}» / ${session.title} (${regs.length} طالبًا)`,
      details: { sessionId, flips },
    });

    refresh(sessionId, session.activityId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── QR Check-in — الطالب يمسح كود الجلسة ────────────────────

export async function qrCheckIn(
  qrToken: string
): Promise<{ ok: boolean; error?: string; activityTitle?: string; sessionTitle?: string }> {
  try {
    const user = await requireStudentAction();

    const session = await db.session.findUnique({
      where: { qrToken },
      include: { activity: true },
    });
    if (!session) return { ok: false, error: "رابط الحضور غير صحيح" };
    if (session.status === "CANCELLED") return { ok: false, error: "هذه الجلسة ملغاة" };
    if (getSessionState(session) === "UPCOMING") {
      return { ok: false, error: "كود الحضور يعمل أثناء الجلسة أو بعده — الجلسة لم تبدأ بعد" };
    }

    const reg = await db.registration.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
    });
    if (!reg || reg.status !== "REGISTERED") {
      return { ok: false, error: "أنت غير مسجل في هذه الجلسة — سجّل أولًا من صفحة النشاط" };
    }

    const existing = await db.attendance.findFirst({
      where: { registrationId: reg.id, sessionId: session.id },
    });
    if (existing?.present) {
      return { ok: true, activityTitle: session.activity.title, sessionTitle: session.title };
    }
    if (existing) {
      await db.attendance.update({
        where: { id: existing.id },
        data: { present: true, method: "QR", markedAt: new Date() },
      });
    } else {
      await db.attendance.create({
        data: { registrationId: reg.id, sessionId: session.id, present: true, method: "QR", markedAt: new Date() },
      });
    }

    // نقاط الحضور مرة واحدة لكل جلسة
    const rule = await db.pointRule.findUnique({ where: { action: "WORKSHOP_ATTENDANCE" } });
    if (rule && rule.active && rule.points > 0 && reg.userId) {
      const dup = await db.pointEvent.findFirst({
        where: { userId: reg.userId, sessionId: session.id, ruleAction: "WORKSHOP_ATTENDANCE" },
      });
      if (!dup) {
        await db.pointEvent.create({
          data: {
            userId: reg.userId,
            points: rule.points,
            reason: "حضور جلسة (QR)",
            ruleAction: rule.action,
            sessionId: session.id,
            createdById: reg.userId,
          },
        });
      }
    }

    await logAudit({
      action: "QR_CHECKIN",
      entity: "REGISTRATION",
      entityId: reg.id,
      summary: `${reg.fullName} سجل حضوره بـ QR في «${session.activity.title}» / ${session.title}`,
      details: { sessionId: session.id },
    });

    refresh(session.id, session.activityId);
    return { ok: true, activityTitle: session.activity.title, sessionTitle: session.title };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ═══════════════════════════════════════════════════════════════
//  v5: كشف النادي (Club Manifest) + البوابة
//  طالب دخل النادي وغير مسجل؟ → أضِفه عند البوابة (GATE_ADDED)
//  ثم سجّل حضوره — لا تُفقد البيانات التاريخية أبدًا
// ═══════════════════════════════════════════════════════════════

export async function gateAddToSession(input: {
  sessionId: string;
  fullName: string;
  phone?: string;
  grade?: string;
  section?: string;
  gender?: string;
  studentCode?: string;
  userId?: string | null;
}): Promise<{ ok: boolean; registrationId?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const session = await db.session.findUnique({
      where: { id: input.sessionId },
      include: { activity: true },
    });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (!input.fullName?.trim()) return { ok: false, error: "اسم الطالب مطلوب" };
    if (input.phone && !/^01\d{9}$/.test(input.phone.trim())) return { ok: false, error: "رقم الهاتف غير صالح (01xxxxxxxxx)" };

    const validGrades = ["FIRST", "SECOND", "THIRD", "FOURTH"];
    const validSections = ["IS", "COMMERCIAL", "TOURISM", "LANGS"];
    const validGenders = ["MALE", "FEMALE"];

    // مكرر؟ (نفس الهاتف أو نفس الحساب في نفس الجلسة)
    if (input.userId) {
      const dup = await db.registration.findFirst({
        where: { sessionId: input.sessionId, userId: input.userId },
      });
      if (dup) return { ok: false, error: "هذا الطالب مسجل بالفعل في الجلسة" };
    } else if (input.phone) {
      const dup = await db.registration.findFirst({
        where: { sessionId: input.sessionId, phone: input.phone.trim() },
      });
      if (dup) return { ok: false, error: "هذا الهاتف مسجل بالفعل في الجلسة" };
    }

    const reg = await db.registration.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId ?? null,
        fullName: input.fullName.trim().slice(0, 120),
        phone: input.phone?.trim() ?? null,
        grade: input.grade && validGrades.includes(input.grade) ? input.grade : null,
        section: input.section && validSections.includes(input.section) ? input.section : null,
        gender: input.gender && validGenders.includes(input.gender) ? input.gender : null,
        studentCode: input.studentCode?.trim() ?? null,
        source: "GATE_ADDED",
        status: "REGISTERED",
        inManifest: true, // إضافة البوابة تعني دخوله الفعلي — يُدرج في الكشف فورًا
      },
    });
    await logAudit({
      actor: admin,
      action: "GATE_REGISTRATION_ADDED",
      entity: "SESSION",
      entityId: input.sessionId,
      summary: `إضافة عند البوابة: ${reg.fullName} إلى «${session.activity.title} — ${session.title}»`,
      after: { name: reg.fullName, phone: reg.phone },
    });
    revalidatePath(`/admin/sessions/${input.sessionId}`);
    revalidatePath(`/admin/activities/${session.activityId}`);
    return { ok: true, registrationId: reg.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// حضور/غياب من البوابة — تسجيل حضور فوري لإضافة البوابة أو المسجلين
export async function gateMarkAttendance(
  registrationId: string,
  status: "PRESENT" | "LATE" | "ABSENT",
  lateMinutes?: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const reg = await db.registration.findUnique({
      where: { id: registrationId },
      include: { session: { include: { activity: true } }, attendance: true },
    });
    if (!reg) return { ok: false, error: "التسجيل غير موجود" };

    const present = status !== "ABSENT";
    const data = {
      present,
      status: present ? status : null,
      lateMinutes: status === "LATE" ? Math.max(1, Math.min(240, lateMinutes ?? 1)) : null,
      method: "GATE" as const,
      markedById: admin.id,
      markedAt: new Date(),
    };

    const existing = reg.attendance.find((a) => a.sessionId === reg.sessionId);
    if (existing) {
      await db.attendance.update({ where: { id: existing.id }, data });
    } else {
      await db.attendance.create({
        data: { registrationId, sessionId: reg.sessionId, ...data },
      }
      );
    }

    // نقاط الحضور عند الحضور — وعكسها عند الغياب (مرة واحدة لكل جلسة)
    // الضيف بلا حساب لا يُمنح نقاطًا (لا ملف له)
    if (present && reg.userId) {
      await awardAttendancePoints(reg.sessionId, reg.userId, admin.id);
    } else if (!present && reg.userId) {
      await reverseAttendancePoints(reg.sessionId, reg.userId);
    }

    await logAudit({
      actor: admin,
      action: "GATE_ATTENDANCE_SET",
      entity: "SESSION",
      entityId: reg.sessionId,
      summary: `حضور بوابة: ${reg.fullName} — ${status === "PRESENT" ? "حاضر" : status === "LATE" ? `متأخر ${lateMinutes ?? 1} د` : "غائب"}`,
    });
    revalidatePath(`/admin/sessions/${reg.sessionId}`);
    revalidatePath(`/admin/activities/${reg.session.activityId}`);
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

// ضبط حالة «مُدرج في الكشف» — قبل إرسال كشف النادي
export async function setManifestInclusion(registrationIds: string[], inManifest: boolean): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    if (registrationIds.length === 0) return { ok: false, error: "لم تختر مشاركين" };
    for (const id of registrationIds.slice(0, 500)) {
      await db.registration.update({ where: { id }, data: { inManifest } });
    }
    await logAudit({
      actor: admin,
      action: "MANIFEST_UPDATED",
      entity: "REGISTRATION",
      summary: `${inManifest ? "إدراج" : "إزالة"} ${registrationIds.length} مشاركًا ${inManifest ? "في" : "من"} كشف النادي`,
    });
    revalidatePath("/admin");
    return { ok: true, count: registrationIds.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}
