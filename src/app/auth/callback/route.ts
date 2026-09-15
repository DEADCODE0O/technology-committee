import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSupabaseAppUser } from "@/lib/auth";
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

  if (oauthError) return fail("google_failed");
  if (!code) return fail("google_failed");

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return fail("google_failed");

    // 1) استبدال الكود بجلسة (PKCE — verifier في الكوكيز)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("auth callback exchange error:", exchangeError);
      return fail("google_failed");
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return fail("google_failed");

    // 2) ربط الهوية بحساب التطبيق (مع إنشاء صف جديد عند أول دخول)
    const appUser = await resolveSupabaseAppUser(authUser);
    if (!appUser) return fail("google_failed");

    // حسابات الإدارة لا تدخل بـ Google — أمان إضافي
    if (isAdminRole(appUser.role)) {
      await supabase.auth.signOut().catch(() => {});
      return fail("google_admin");
    }
    if (appUser.status === "SUSPENDED") {
      await supabase.auth.signOut().catch(() => {});
      return fail("google_suspended");
    }

    // 3) التوجيه — مستخدم Google جديد بلا ملف؟ إكمال البيانات
    const profile = await db.studentProfile.findUnique({ where: { userId: appUser.id } });
    const target = profile ? returnTo : "/profile/complete";
    return NextResponse.redirect(new URL(target, req.url));
  } catch (err) {
    console.error("auth callback error:", err);
    return fail("google_failed");
  }
}
