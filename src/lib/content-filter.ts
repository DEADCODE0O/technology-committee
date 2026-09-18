import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════
// فلتر الكلمات المحظورة والمحتوى غير اللائق
// كاش في الذاكرة لتفادي استهلاك قاعدة بيانات Supabase المجانية
// ═══════════════════════════════════════════════════════════════

const BASE_BANNED_WORDS = [
  // كلمات مسيئة عامة بالعربية ومصطلحات السب والشتم
  "شتم",
  "سب",
  "لعن",
  "حقير",
  "سافل",
  "قذر",
  "كلب",
  "حمار",
  "غبي",
  "متخلف",
  "زبالة",
  "منحط",
  "وسخ",
  "واطي",
  "ابن الكلب",
  "يا كلب",
  "يا حمار",
  "قواد",
  "عرص",
  "شرموط",
  "منيوك",
  "كس",
  "طيز",
  "زب",
  "نيك",
  "متناك",
  // English common profanities
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "bastard",
  "cunt",
  "porn",
  "nude",
  "sex",
];

let cachedDbWords: Set<string> | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 دقائق

async function getBannedWords(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedDbWords && now - lastCacheUpdate < CACHE_TTL_MS) {
    return cachedDbWords;
  }

  const set = new Set(BASE_BANNED_WORDS.map((w) => w.toLowerCase()));
  try {
    const rows = await db.bannedWord.findMany({ select: { word: true } });
    for (const r of rows) {
      set.add(r.word.toLowerCase());
    }
    cachedDbWords = set;
    lastCacheUpdate = now;
  } catch (err) {
    console.warn("Failed to load custom banned words:", err);
  }
  return set;
}

/**
 * تنظيف الحروف لتجاوز محاولات التحايل (مثل: ك.ل.ب أو ك ل ب أو التشكيل)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // إزالة التشكيل العربي
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // إزالة التطويل
    .replace(/\u0640/g, "")
    // توحيد الهمزات والألف والياء
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/**
 * فحص هل النص يحتوي على كلمات محظورة
 */
export async function containsBannedWords(text: string): Promise<{ contains: boolean; matchedWord?: string }> {
  if (!text) return { contains: false };
  const normalized = normalizeText(text);
  const wordsSet = await getBannedWords();

  for (const banned of wordsSet) {
    const normBanned = normalizeText(banned);
    // فحص ككلمة كاملة أو مقطعية
    const regex = new RegExp(`(^|\\s|[^\\w\\u0600-\\u06FF])${normBanned}($|\\s|[^\\w\\u0600-\\u06FF])`, "i");
    if (regex.test(normalized)) {
      return { contains: true, matchedWord: banned };
    }
  }

  return { contains: false };
}

/**
 * استبدال الكلمات المحظورة بنجوم (***)
 */
export async function maskBannedWords(text: string): Promise<string> {
  if (!text) return "";
  let result = text;
  const wordsSet = await getBannedWords();

  for (const banned of wordsSet) {
    const regex = new RegExp(banned, "gi");
    result = result.replace(regex, (match) => "*".repeat(match.length));
  }

  return result;
}

