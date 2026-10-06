import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ═══════════════════════════════════════════════════════════════
//  Middleware — وضع إغلاق المنصة للطلاب وتوجيههم لصفحة الاعتذار الرسمية
//  • أي طالب أو زائر يدخل المنصة يتم توجيهه مباشرة إلى /closed
//  • استثناء مسارات الإدارة (/admin) حتى يتمكن المشرف من متابعة العمليات
//  • استثناء الملفات الثابتة والوسائط
// ═══════════════════════════════════════════════════════════════

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1) استثناء الملفات الثابتة والصور
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2) صفحة إغلاق المنصة
  if (pathname === "/closed") {
    return NextResponse.next();
  }

  // 3) استثناء مسارات الإدارة وتسجيل دخول الإدارة
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminLogin =
    pathname === "/login" &&
    (request.nextUrl.searchParams.has("admin") ||
      request.nextUrl.searchParams.get("returnTo")?.startsWith("/admin"));

  if (isAdminPath || isAdminLogin) {
    return updateSession(request);
  }

  // 4) استثناء مسارات API الخاصة بالمصادقة أو الإدارة
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 5) أي مسار آخر (طالب / زائر / ورش / جلسات / ترحيب) → تحويل فوري لصفحة الإغلاق
  const closedUrl = request.nextUrl.clone();
  closedUrl.pathname = "/closed";
  closedUrl.search = "";
  const response = NextResponse.redirect(closedUrl, { status: 307 });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  // كل الصفحات ما عدا الملفات الثابتة والوسائط
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|webmanifest)$).*)",
  ],
};

