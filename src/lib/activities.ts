// ═══════════════════════════════════════════════════════════════
//  منطق الأنشطة والجلسات — الحالة مشتقة من التواريخ دائمًا
//  الواجهة تعرض العد التنازلي، والسيرفر هو الحكم النهائي
//  (أي محاولة تسجيل بعد الإغلاق تُرفض هنا حتى لو الصفحة مفتوحة)
//  v4: لا دفعات — كل محاضرة/موعد وحدة تسجيل مستقلة
// ═══════════════════════════════════════════════════════════════

export type SessionState = "UPCOMING" | "ONGOING" | "COMPLETED";

export type SessionLike = {
  startsAt: Date | string;
  endsAt: Date | string | null;
};

export function toDateSafe(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const obj = d instanceof Date ? d : new Date(d);
  return isNaN(obj.getTime()) ? null : obj;
}

export function toRequiredDateSafe(d: Date | string | null | undefined): Date {
  if (!d) return new Date();
  const obj = d instanceof Date ? d : new Date(d);
  return isNaN(obj.getTime()) ? new Date() : obj;
}

// حالة الجلسة من التواريخ — لا تخزين يدوي إطلاقًا
export function getSessionState(session: SessionLike, now: Date = new Date()): SessionState {
  const startsAt = toRequiredDateSafe(session.startsAt);
  const endsAt = toDateSafe(session.endsAt);
  const end = endsAt ?? new Date(startsAt.getTime() + 2 * 3600 * 1000);
  const nowMs = now.getTime();
  if (nowMs < startsAt.getTime()) return "UPCOMING";
  if (nowMs > end.getTime()) return "COMPLETED";
  return "ONGOING";
}

export const SESSION_STATE_LABELS: Record<SessionState, string> = {
  UPCOMING: "قادم",
  ONGOING: "جارٍ الآن",
  COMPLETED: "منتهٍ",
};

// تسمية الجلسة حسب نوع النشاط:
// كورس → «المحاضرة الأولى/الثانية...» · ورشة/فعالية → «موعد الورشة/الفعالية» أو عنوان الجلسة
export function sessionDisplayName(
  session: { title: string; order: number },
  activityType: string
): string {
  if (session.title?.trim()) return session.title.trim();
  if (activityType === "COURSE") {
    const arabic = ["", "الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
    return `المحاضرة ${arabic[session.order] ?? session.order}`;
  }
  return activityType === "EVENT" ? "موعد الفعالية" : "موعد الورشة";
}

// ─── نافذة التسجيل ────────────────────────────────────────────
// وضع الإغلاق: BY_DATE (التاريخ فقط) | BY_CAPACITY (العدد فقط)
// | EITHER (أيهما أول) | MANUAL (مفتاح يدوي فقط)

export type ClosingMode = "BY_DATE" | "BY_CAPACITY" | "EITHER" | "MANUAL";

export const CLOSING_MODES: { value: ClosingMode; label: string; hint: string }[] = [
  { value: "BY_DATE", label: "عند انتهاء موعد التسجيل", hint: "يُغلق تلقائيًا في التاريخ المحدد مهما كان العدد" },
  { value: "BY_CAPACITY", label: "عند اكتمال العدد", hint: "يُغلق عند امتلاء المقاعد — التاريخ غير معتمد" },
  { value: "EITHER", label: "التاريخ أو اكتمال العدد — أيهما أول", hint: "الأكثر شيوعًا: من يسبق يُغلق التسجيل" },
  { value: "MANUAL", label: "يدويًا — أغلقه بنفسي", hint: "مفتاح «التسجيل مفتوح» في يدك وحدك" },
];

export const CLOSING_MODE_LABELS: Record<string, string> = Object.fromEntries(
  CLOSING_MODES.map((m) => [m.value, m.label])
);

export type RegistrationGate = {
  session: {
    registrationOpensAt: Date | string | null;
    registrationClosesAt: Date | string | null;
    startsAt: Date | string;
    endsAt: Date | string | null;
    closingMode: string;
    registrationOpen: boolean;
  };
  registeredCount: number;
  seats: number;
};

export type RegistrationDecision =
  | { open: true; reason: "OK" }
  | { open: false; reason: "NOT_YET_OPEN" | "CLOSED_MANUAL" | "CLOSED_DATE" | "FULL" | "SESSION_ENDED"; message: string };

const MESSAGES: Record<string, string> = {
  NOT_YET_OPEN: "التسجيل لم يُفتح بعد",
  CLOSED_MANUAL: "التسجيل مغلق حاليًا",
  CLOSED_DATE: "انتهى موعد التسجيل",
  FULL: "اكتمل العدد — قائمة الانتظار متاحة",
  SESSION_ENDED: "انتهت هذه المحاضرة بالفعل",
};

// القرار الرسمي للسيرفر — يستخدمه التسجيل (عضو/ضيف) والواجهة معًا
export function decideRegistration(gate: RegistrationGate, now: Date = new Date()): RegistrationDecision {
  const { session } = gate;
  const state = getSessionState(session, now);

  // الجلسة انتهت → لا تسجيل نهائيًا
  if (state === "COMPLETED") return { open: false, reason: "SESSION_ENDED", message: MESSAGES.SESSION_ENDED };

  // المفتاح اليدوي مغلق → مغلق دائمًا
  if (!session.registrationOpen) return { open: false, reason: "CLOSED_MANUAL", message: MESSAGES.CLOSED_MANUAL };

  const mode = session.closingMode as ClosingMode;
  const opensAt = toDateSafe(session.registrationOpensAt);
  const closesAt = toDateSafe(session.registrationClosesAt);
  const nowMs = now.getTime();

  const notYetOpen = opensAt !== null && nowMs < opensAt.getTime();
  const dateClosed = closesAt !== null && nowMs > closesAt.getTime();
  const full = gate.registeredCount >= gate.seats;

  // فتح لاحق؟ (كل الأوضاع تحترم موعد الفتح إن وُجد)
  if (notYetOpen) return { open: false, reason: "NOT_YET_OPEN", message: MESSAGES.NOT_YET_OPEN };

  if (mode === "BY_DATE") {
    if (dateClosed) return { open: false, reason: "CLOSED_DATE", message: MESSAGES.CLOSED_DATE };
    return { open: true, reason: "OK" };
  }
  if (mode === "BY_CAPACITY") {
    if (full) return { open: false, reason: "FULL", message: MESSAGES.FULL };
    return { open: true, reason: "OK" };
  }
  if (mode === "MANUAL") {
    // المفتاح اليدوي فقط هو الحكم — لكن الجلسة المنتهية تمنع دائمًا (أعلاه)
    return { open: true, reason: "OK" };
  }
  // EITHER
  if (dateClosed) return { open: false, reason: "CLOSED_DATE", message: MESSAGES.CLOSED_DATE };
  if (full) return { open: false, reason: "FULL", message: MESSAGES.FULL };
  return { open: true, reason: "OK" };
}

// هل يجوز للطالب الانضمام لقائمة الانتظار؟ (حتى لو العدد مكتمل — ما لم يغلق التاريخ)
export function waitlistAvailable(gate: RegistrationGate, now: Date = new Date()): boolean {
  const d = decideRegistration(gate, now);
  if (d.reason === "SESSION_ENDED" || d.reason === "NOT_YET_OPEN" || d.reason === "CLOSED_MANUAL") return false;
  if (d.reason === "CLOSED_DATE") return false;
  return true; // FULL أو OK — قائمة الانتظار متاحة
}

// ─── دورة عرض الجلسة للطالب ──────────────────────────────────
// أي عدّ ينازلي يظهر للطالب: فتح التسجيل ← إغلاق التسجيل ← بدء الجلسة

export type SessionDisplayPhase =
  | { phase: "TEASER"; countdownTo?: Date; label: string } // تشويق — التفاصيل لم تُكشف
  | { phase: "BEFORE_REGISTRATION"; countdownTo: Date; label: string } // عداد حتى فتح التسجيل
  | { phase: "REGISTRATION_OPEN"; countdownTo?: Date; label: string } // التسجيل مفتوح (+عداد إغلاق إن وجد)
  | { phase: "WAITLIST"; label: string } // ممتلئ — قائمة انتظار
  | { phase: "CLOSED"; label: string } // مغلق بأي سبب
  | { phase: "BEFORE_START"; countdownTo: Date; label: string } // التسجيل انتهى — عداد حتى البدء
  | { phase: "ONGOING"; label: string }
  | { phase: "COMPLETED"; label: string };

export function getSessionDisplayPhase(
  gate: RegistrationGate,
  now: Date = new Date(),
  teaser?: string | null
): SessionDisplayPhase {
  const decision = decideRegistration(gate, now);
  const state = getSessionState(gate.session, now);

  if (state === "COMPLETED") return { phase: "COMPLETED", label: "انتهت" };
  if (state === "ONGOING") return { phase: "ONGOING", label: "جارية الآن" };

  const opensAt = toDateSafe(gate.session.registrationOpensAt);
  const closesAt = toDateSafe(gate.session.registrationClosesAt);
  const startsAt = toRequiredDateSafe(gate.session.startsAt);
  const nowMs = now.getTime();

  // قادمة (UPCOMING)
  if (teaser && decision.reason === "NOT_YET_OPEN") {
    return { phase: "TEASER", label: "تفاصيل قريبًا — تابعنا" };
  }
  if (decision.reason === "NOT_YET_OPEN" && opensAt) {
    return { phase: "BEFORE_REGISTRATION", countdownTo: opensAt, label: "التسجيل يُفتح بعد" };
  }
  if (decision.open) {
    if (closesAt && closesAt.getTime() > nowMs) {
      return { phase: "REGISTRATION_OPEN", countdownTo: closesAt, label: "التسجيل يقفل بعد" };
    }
    return { phase: "REGISTRATION_OPEN", label: "التسجيل مفتوح الآن" };
  }
  if (decision.reason === "FULL") {
    return { phase: "WAITLIST", label: "اكتمل العدد — قائمة الانتظار متاحة" };
  }
  // مغلق بالتاريخ أو يدويًا → عدّ تنازلي حتى بدء الجلسة إن كانت قادمة
  return { phase: "BEFORE_START", countdownTo: startsAt, label: "يبدأ بعد" };
}

// عنوان النشاط + جلسته في سطر واحد (للسجلات والقوائم)
export function activitySessionTitle(
  activity: { title: string; type: string },
  session: { title: string; order: number }
): string {
  return `${activity.title} — ${sessionDisplayName(session, activity.type)}`;
}
