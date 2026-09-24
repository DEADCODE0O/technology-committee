import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSupabaseAppUser, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";

// ═══════════════════════════════════════════════════════════════
//  GET /auth/callback — عودة Supabase Auth بعد الدخول بـ Google
//  (Supabase يدير OAuth كاملًا مع Google — PKCE)
//  1) استبدال الكود بجلسة (كوكيز httpOnly عبر @supabase/ssr)
//  2) ربط الهوية بحساب التطبيق (UUID / googleId / البريد)
//  3) التوجيه: أدمن؟ مرفوض (أمان) · معلق؟ مرفوض ·
//     بلا ملف طالب؟ إكمال البيانات · وإلا لوحة الطالب
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedReturnTo = url.searchParams.get("returnTo") || "/panel";
  const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/panel";
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if (oauthError) {
    console.warn("OAuth callback received error:", oauthError);
    return fail("oauth_failed");
  }
  if (!code) return fail("oauth_failed");

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return fail("oauth_failed");

    // 1) استبدال الكود بجلسة (PKCE — verifier في الكوكيز)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("auth callback exchange error:", exchangeError);
      return fail("oauth_failed");
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return fail("oauth_failed");

    const isFacebook =
      authUser.app_metadata?.provider === "facebook" ||
      Boolean(authUser.identities?.some((id: { provider?: string }) => id.provider?.toLowerCase() === "facebook"));

    // 2) ربط الهوية بحساب التطبيق (مع إنشاء صف جديد عند أول دخول)
    const appUser = await resolveSupabaseAppUser(authUser);
    if (!appUser) return fail(isFacebook ? "facebook_failed" : "google_failed");

    // حسابات الإدارة لا تدخل بـ Google أو Facebook — أمان إضافي
    if (isAdminRole(appUser.role)) {
      await supabase.auth.signOut().catch(() => {});
      return fail(isFacebook ? "facebook_admin" : "google_admin");
    }
    if (appUser.status === "SUSPENDED") {
      await supabase.auth.signOut().catch(() => {});
      return fail(isFacebook ? "facebook_suspended" : "google_suspended");
    }

    // إنشاء جلسة محلية متطابقة للضمان
    await createSession(appUser.id);

    // 3) التوجيه — مستخدم جديد بلا ملف؟ إكمال البيانات
    const profile = await db.studentProfile.findUnique({ where: { userId: appUser.id } });
    const safeTarget = (!isAdminRole(appUser.role) && returnTo.startsWith("/admin")) ? "/panel" : returnTo;
    const target = profile ? safeTarget : "/profile/complete";
    return NextResponse.redirect(new URL(target, req.url));
  } catch (err) {
    console.error("auth callback error:", err);
    return fail("oauth_failed");
  }
}
