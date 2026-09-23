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

// ─── إدارة إنذارات الغياب وعقوبة الـ 3 غيابات ─────────────────
async function handleAbsenceStrikes(userId: string, sessionTitle: string, adminId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { unexcusedAbsences: true, absenceWarnings: true, attendanceRestricted: true },
    });
    if (!user) return;

    const newAbsences = user.unexcusedAbsences + 1;
    const newWarnings = user.absenceWarnings + 1;
    const isNowRestricted = newAbsences >= 3;

    await db.user.update({
      where: { id: userId },
      data: {
        unexcusedAbsences: newAbsences,
        absenceWarnings: newWarnings,
        attendanceRestricted: isNowRestricted ? true : user.attendanceRestricted,
      },
    });

    const { createNotificationForUsers } = await import("@/lib/notifications");
    const { DEFAULT_TARGET } = await import("@/lib/targeting");

    if (newAbsences === 1) {
      await createNotificationForUsers({
        type: "IMPORTANT",
        title: "إنذار غياب أول ⚠️",
        body: `تم تسجيل غيابك عن ورشة «${sessionTitle}». يرجى العلم بأن تكرار الغياب (3 مرات) بدون عذر مسبق يؤدي إلى تقييد حسابك وتحويلك لقائمة الانتظار في الورش القادمة لإتاحة الفرصة للطلاب الملتزمين.`,
        target: { ...DEFAULT_TARGET, userIds: [userId] },
        createdById: adminId,
        pinned: true,
      });
    } else if (newAbsences === 2) {
      await createNotificationForUsers({
        type: "IMPORTANT",
        title: "إنذار غياب ثانٍ ⚠️⚠️",
        body: `لقد تم تسجيل الغياب الثاني لك عن الورش (آخرها: «${sessionTitle}»). نلفت انتباهك إلى أنه في حال الغياب لمرة ثالثة سيتم تقييد حسابك تلقائياً ونقلك لقائمة الانتظار في جميع الورش القادمة.`,
        target: { ...DEFAULT_TARGET, userIds: [userId] },
        createdById: adminId,
        pinned: true,
      });
    } else if (newAbsences >= 3) {
      await createNotificationForUsers({
        type: "IMPORTANT",
        title: "تنبيه هام: تقييد أولوية التسجيل 🚫",
        body: `لقد بلغت غياباتك 3 ورش (آخرها: «${sessionTitle}»). نظراً لعدم الالتزام، تم تقييد أولوية حسابك وتحويلك لقائمة الانتظار في جميع الورش القادمة لإعطاء الأولوية للطلاب الأكثر نشاطاً والتزاماً. يمكنك مراجعة الإدارة في حال وجود عذر قهري.`,
        target: { ...DEFAULT_TARGET, userIds: [userId] },
        createdById: adminId,
        pinned: true,
      });
    }
  } catch (err) {
    console.error("handleAbsenceStrikes error:", err);
  }
}

async function handleAbsenceUndo(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { unexcusedAbsences: true, attendanceRestricted: true },
    });
    if (!user || user.unexcusedAbsences <= 0) return;

    const newAbsences = Math.max(0, user.unexcusedAbsences - 1);
    const shouldUnrestrict = newAbsences < 3;

    await db.user.update({
      where: { id: userId },
      data: {
        unexcusedAbsences: newAbsences,
        attendanceRestricted: shouldUnrestrict ? false : user.attendanceRestricted,
      },
    });
  } catch (err) {
    console.error("handleAbsenceUndo error:", err);
  }
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
    const wasPresent = existing ? existing.present : null;

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

    // إدارة إنذارات الغياب وتقييد الأولوية
    if (reg.userId) {
      const sessionTitle = `${reg.session.activity.title} — ${reg.session.title}`;
      if (present === false && wasPresent !== false) {
        await handleAbsenceStrikes(reg.userId, sessionTitle, admin.id);
      } else if (present === true && wasPresent === false) {
        await handleAbsenceUndo(reg.userId);
      }
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

// ─── تسجيل الباقي غياب (دون المساس بمن حضر بالباركود أو يدوياً) ──
export async function markRestAbsent(sessionId: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const session = await db.session.findUnique({ where: { id: sessionId }, include: { activity: true } });
    if (!session) return { ok: false, error: "الجلسة غير موجودة" };
    if (getSessionState(session) === "UPCOMING") return { ok: false, error: "الجلسة لم تبدأ بعد" };

    const regs = await db.registration.findMany({
      where: { sessionId, status: "REGISTERED" },
      include: { attendance: true },
    });

    let markedCount = 0;
    const sessionTitle = `${session.activity.title} — ${session.title}`;

    for (const reg of regs) {
      const existing = reg.attendance.find((a) => a.sessionId === sessionId) ?? null;
      // الطالب حاضر بالفعل (سواء بـ QR أو يدوي) — نحافظ على حضوره تماماً دون أي مساس!
      if (existing?.present === true) {
        continue;
      }

      // إذا كان قد سُجل غائبًا بالفعل من قبل، لا نكرر الإنذار
      if (existing && existing.present === false) {
        continue;
      }

      if (existing) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { present: false, method: "MANUAL", markedById: admin.id, markedAt: new Date() },
        });
      } else {
        await db.attendance.create({
          data: {
            registrationId: reg.id,
            sessionId,
            present: false,
            method: "MANUAL",
            markedById: admin.id,
            markedAt: new Date(),
          },
        });
      }

      markedCount++;

      // تطبيق نظام الـ 3 غيابات والإنذارات وعكس أي نقاط
      if (reg.userId) {
        await handleAbsenceStrikes(reg.userId, sessionTitle, admin.id);
        await reverseAttendancePoints(sessionId, reg.userId);
      }
    }

    await logAudit({
      actor: admin,
      action: "ATTENDANCE_REST_ABSENT",
      entity: "SESSION",
      entityId: sessionId,
      summary: `تسجيل الباقي غياب (${markedCount} طالبًا) في «${session.activity.title}» / ${session.title} مع الحفاظ على الحاضرين بالباركود`,
      details: { sessionId, markedCount },
    });

    refresh(sessionId, session.activityId);
    return { ok: true, count: markedCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── تصفير غيابات الطالب ورفع التقييد (قبول عذر إداري) ───────────
export async function resetAbsences(
  userId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.ATTENDANCE, "manage");
    const user = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) return { ok: false, error: "المستخدم غير موجود" };

    await db.user.update({
      where: { id: userId },
      data: {
        unexcusedAbsences: 0,
        attendanceRestricted: false,
        absenceWarnings: 0,
      },
    });

    const { createNotificationForUsers } = await import("@/lib/notifications");
    const { DEFAULT_TARGET } = await import("@/lib/targeting");

    await createNotificationForUsers({
      type: "IMPORTANT",
      title: "قبول العذر ورفع تقييد الحضور ✨",
      body: reason
        ? `تم قبول عذرك (${reason}) وإعادة تفعيل أولوية التسجيل لك في الورش القادمة. نتمنى لك التوفيق والالتزام دائماً!`
        : `تم قبول عذرك ورفع تقييد الحضور عن حسابك بنجاح، واستعادة أولوية التسجيل في الورش. نتمنى لك دوام الالتزام!`,
      target: { ...DEFAULT_TARGET, userIds: [userId] },
      createdById: admin.id,
      pinned: true,
    });

    await logAudit({
      actor: admin,
      action: "ABSENCES_RESET",
      entity: "USER",
      entityId: userId,
      summary: `تصفير غيابات ورفع تقييد الحضور عن ${user.profile?.fullName ?? user.email}${reason ? ` (السبب: ${reason})` : ""}`,
      details: { userId, reason },
    });

    revalidatePath("/panel");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── QR Check-in — الطالب يمسح كود الجلسة ────────────────────

export async function qrCheckIn(
  qrToken: string
): Promise<{ ok: boolean; error?: string; activityTitle?: string; sessionTitle?: string; sessionId?: string }> {
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
      return { ok: true, activityTitle: session.activity.title, sessionTitle: session.title, sessionId: session.id };
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
    return { ok: true, activityTitle: session.activity.title, sessionTitle: session.title, sessionId: session.id };
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
