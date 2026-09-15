// قواعد التحقق المشتركة بين التسجيل والضيف والإدارة.

export const ARABIC_NAME_RE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/u;
export const EGYPTIAN_PHONE_RE = /^01[0125][0-9]{8}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeArabicName(value: string): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function isValidArabicFullName(value: string): boolean {
  const name = normalizeArabicName(value);
  if (!name || !ARABIC_NAME_RE.test(name)) return false;
  const words = name.split(" ").filter((w) => w.length >= 2);
  return words.length >= 3;
}

export function normalizePhone(value: string): string {
  return (value || "").replace(/[\s-]/g, "");
}

export function isValidStudentCode(value: string, pattern = "^[0-9]{5,15}$"): boolean {
  if (!value) return false;
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return /^[0-9]{5,15}$/.test(value);
  }
}

// ─── كود الطالب الجامعي — صيغة 2023108888 ───────────────────
//  أول 4 أرقام: سنة الدفعة (سنة الالتحاق بالجامعة)
//  رقمان بعدها: شهر التقديم (01–12)
//  آخر 4 أرقام: رقم متغير خاص بكل طالب
//  الكود مختلف من طالب لآخر ومن فرقة لأخرى — لا يوجد كود موحد.

/** سنة الالتحاق المتوقعة لكل فرقة في العام الجامعي الحالي */
export function expectedEnrollmentYear(grade: string, now: Date = new Date()): number | null {
  // العام الجامعي المصري يبدأ تجهيزاته من يوليو — سبتمبر 2026 ⇒ عام 2026/2027
  const startYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  switch (grade) {
    case "FIRST": return startYear;      // الفرقة الأولى: التحقت هذا العام
    case "SECOND": return startYear - 1;
    case "THIRD": return startYear - 2;
    case "FOURTH": return startYear - 3; // الفرقة الرابعة حاليًا: التحقت 2023
    default: return null; // فرق أخرى: لا نفرض سنة محددة
  }
}

/** التحقق من كود الطالب وفق الصيغة الرسمية — يعيد خطأً عربيًا واضحًا */
export function validateStudentCodeFormat(code: string, grade: string): { ok: boolean; error?: string } {
  if (!/^[0-9]{10}$/.test(code)) {
    return { ok: false, error: "كود الطالب 10 أرقام: سنة الدفعة (4) + شهر التقديم (2) + رقمك الجامعي (4) — مثال: 2023108888" };
  }
  const year = Number(code.slice(0, 4));
  const month = Number(code.slice(4, 6));
  if (month < 1 || month > 12) {
    return { ok: false, error: "رقم الشهر داخل الكود غير صحيح — يجب أن يكون بين 01 و 12" };
  }
  const expected = expectedEnrollmentYear(grade);
  if (expected !== null && year !== expected) {
    return { ok: false, error: `سنة الدفعة داخل الكود (${year}) لا تطابق فرقتك الحالية — الفرقة المتوقعة لسنة ${expected}` };
  }
  return { ok: true };
}

/** نص توضيحي موحد لصيغة الكود (يظهر للطلاب في كل الأماكن) */
export const STUDENT_CODE_HINT = "كود الطالب الجامعي كما في بطاقتك — 10 أرقام: سنة الدفعة + شهر التقديم + رقمك — مثال: 2023108888";

export function makeDataKey(label: string): string {
  return normalizeArabicName(label)
    .toLocaleLowerCase("ar")
    .replace(/[؟?!.,،:؛]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || `field_${Math.random().toString(36).slice(2, 10)}`;
}

/** التحقق من أمان مسار إعادة التوجيه لمنع ثغرات Open Redirect */
export function safeRedirectUrl(rawUrl?: string | null, fallback = "/panel"): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim();
  if ((trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) || trimmed === "/") {
    return trimmed;
  }
  return fallback;
}
