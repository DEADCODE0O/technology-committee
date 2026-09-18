import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════
// إدارة أسماء المستخدمين (@handle)
// ═══════════════════════════════════════════════════════════════

const ARABIC_TO_LATIN: Record<string, string> = {
  أ: "a",
  إ: "e",
  آ: "a",
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "g",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "k",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  ى: "a",
  ة: "a",
  ء: "",
  ئ: "e",
  ؤ: "o",
};

/**
 * تنظيف والتحقق من صلاحية اسم المستخدم
 * القواعد: 3 إلى 20 حرفاً، أحرف إنجليزية صغيرة، أرقام، _ ، .
 */
export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 20);
}

export function isValidUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valid: false, error: "اسم المستخدم يجب ألا يقل عن 3 أحرف" };
  }
  if (username.length > 20) {
    return { valid: false, error: "اسم المستخدم يجب ألا يتجاوز 20 حرفاً" };
  }
  if (!/^[a-z0-9][a-z0-9_.]*[a-z0-9]$/.test(username)) {
    return {
      valid: false,
      error: "اسم المستخدم يجب أن يبدأ وينتهي بحرف أو رقم، ويحتوي فقط على أحرف إنجليزية وأرقام ونقطة أو _",
    };
  }
  const reserved = [
    "admin",
    "root",
    "moderator",
    "tech",
    "committee",
    "support",
    "help",
    "system",
    "bot",
    "api",
    "login",
    "register",
    "panel",
    "community",
    "leaderboard",
    "messages",
    "friends",
    "chat",
    "feed",
  ];
  if (reserved.includes(username)) {
    return { valid: false, error: "اسم المستخدم هذا محجوز لإدارة المنصة" };
  }
  return { valid: true };
}

/**
 * تحويل الاسم العربي إلى اسم مستخدم مبدئي
 */
export function arabicNameToUsernameBase(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  const romanizedParts = parts.map((part) => {
    let roman = "";
    for (const char of part) {
      roman += ARABIC_TO_LATIN[char] ?? "";
    }
    return roman.replace(/[^a-z0-9]/g, "");
  });

  const base = romanizedParts.filter(Boolean).join(".");
  return base.length >= 3 ? base.slice(0, 15) : "student";
}

/**
 * التحقق من توفر اسم المستخدم
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const clean = sanitizeUsername(username);
  if (!clean) return false;

  const existing = await db.user.findUnique({
    where: { username: clean },
    select: { id: true },
  });

  if (!existing) return true;
  return excludeUserId ? existing.id === excludeUserId : false;
}

/**
 * توليد اسم مستخدم فريد ومتاح بناءً على الاسم الكامل للطالب
 */
export async function generateUniqueUsername(fullName: string, userId?: string): Promise<string> {
  const base = arabicNameToUsernameBase(fullName);
  let candidate = base;

  if (await isUsernameAvailable(candidate, userId)) {
    return candidate;
  }

  // تجربة إضافة أرقام عشوائية
  for (let i = 1; i <= 50; i++) {
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    candidate = `${base.slice(0, 16)}.${randomSuffix}`;
    if (await isUsernameAvailable(candidate, userId)) {
      return candidate;
    }
  }

  return `student.${Date.now().toString().slice(-4)}`;
}

