import "server-only";

// ═══════════════════════════════════════════════════════════════
//  محدد المعدل (Rate Limiter) — حماية من التخمين والاندفاع
//  نافذة منزلقة في الذاكرة لكل مثيل خادم:
//  على Vercel Hobby (مثيل واحد دائمًا) الحماية كاملة،
//  ومع تعدد المثيلات تبقى طبقة دفاع فعّالة (كل مثيل يعدّ بشكل مستقل)
//  دون الحاجة لخدمة خارجية (Redis) تحفظ مجانية الاستضافة.
// ═══════════════════════════════════════════════════════════════

type Bucket = { hits: number[]; };

const globalForRateLimit = globalThis as unknown as {
  __tcRateBuckets: Map<string, Bucket> | undefined;
};

const buckets: Map<string, Bucket> =
  globalForRateLimit.__tcRateBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__tcRateBuckets = buckets;

export type RateResult = {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
};

/** تحقق من السماح بمحاولة جديدة — يسجل المحاولة فورًا عند السماح */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };

  // تنظيف النافذة
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // تنظيف دوري خفيف — لا تتراكم المفاتيح القديمة في الذاكرة
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterSec: 0, remaining: limit - bucket.hits.length };
}

/** إلغاء العد بعد نجاح الدخول — لا نعاقب من دخل بنجاح */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** عنوان IP من رؤوس البروكسي (Vercel/المعاينة) — للحد العام لكل IP */
export function clientIp(h: { get(name: string): string | null }): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

/** صياغة مدة الانتظار بالعربية */
export function waitMessage(sec: number): string {
  if (sec >= 60) {
    const m = Math.ceil(sec / 60);
    return `محاولات كثيرة — انتظر ${m} دقيقة ثم حاول مجددًا`;
  }
  return `محاولات كثيرة — انتظر ${sec} ثانية ثم حاول مجددًا`;
}
