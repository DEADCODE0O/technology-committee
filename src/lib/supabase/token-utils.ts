import { decodeJwt } from "jose";

/**
 * ═══════════════════════════════════════════════════════════════
 *  أدوات فحص توكن Supabase محلياً بدون Egress (Zero-Egress Auth)
 *  • تفحص الـ JWT وصلاحيته محلياً دون إجراء مكالمات شبكة لـ Supabase
 *  • تمنع ملايين الاستدعاءات غير الضرورية لـ /auth/v1/user
 * ═══════════════════════════════════════════════════════════════
 */

export interface DecodedSupabaseToken {
  sub: string;
  email?: string;
  exp?: number;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export function extractAccessTokenFromCookies(
  cookies: { name: string; value: string }[]
): string | null {
  // فحص كوكيز Supabase الرسمية (sb-<ref>-auth-token أو sb-<ref>-auth-token.0)
  const authCookies = cookies.filter(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );
  if (!authCookies.length) return null;

  // ترتيب الكوكيز في حال كانت مجزأة (chunked: .0, .1)
  authCookies.sort((a, b) => a.name.localeCompare(b.name));
  const combinedValue = authCookies.map((c) => c.value).join("");

  try {
    let raw = combinedValue;
    if (raw.startsWith("base64-")) {
      if (typeof atob === "function") {
        raw = atob(raw.slice(7));
      } else {
        raw = Buffer.from(raw.slice(7), "base64").toString("utf-8");
      }
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    // محاولة قراءة التوكن الصريح (header.payload.signature)
    for (const c of authCookies) {
      if (c.value.split(".").length === 3) {
        return c.value;
      }
    }
  }
  return null;
}

export function decodeSupabaseToken(accessToken: string): DecodedSupabaseToken | null {
  try {
    const claims = decodeJwt(accessToken);
    if (!claims.sub) return null;
    return {
      sub: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      exp: claims.exp,
      user_metadata: (claims.user_metadata as Record<string, unknown>) || undefined,
      app_metadata: (claims.app_metadata as Record<string, unknown>) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * فحص ما إذا كان التوكن سليم وغير منتهٍ ولم يقترب من الانتهاء
 * (افتراضياً: باقي أكثر من 5 دقائق = سليم تماماً ولا داعي لتجديده)
 */
export function isTokenValidAndFresh(accessToken: string, minRemainingSeconds = 300): boolean {
  try {
    const claims = decodeJwt(accessToken);
    if (!claims.exp) return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const remaining = claims.exp - nowSeconds;
    return remaining > minRemainingSeconds;
  } catch {
    return false;
  }
}
