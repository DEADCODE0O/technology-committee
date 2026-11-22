import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ═══════════════════════════════════════════════════════════════
//  Middleware — تحديث جلسات Supabase Auth عند كل تنقّل
//  (النمط الرسمي لـ @supabase/ssr — يمنع انتهاء الجلسة بعد ساعة)
//  وضع التطوير المحلي (بدون مفاتيح): يمرر الطلب فورًا بلا أي عمل.
//
//  بوابة «أول زيارة» لـ / محسوبة في src/app/route.ts
//  (كوكي tc_seen يضبط مع التحويل — لا يجوز ضبطه هنا لأنه
//   يظهر للصفحة في نفس الطلب فتحوّل فورًا)
// ═══════════════════════════════════════════════════════════════

const EXTERNAL_HOST = (process.env.NEXT_PUBLIC_EXTERNAL_REG_HOST || "k9m4x2v8q7.vercel.app")
  .trim()
  .toLowerCase();

const RESERVED_PLATFORM_SEGMENTS = new Set([
  "activities",
  "admin",
  "api",
  "auth",
  "chat",
  "checkin",
  "community",
  "data-deletion",
  "friends",
  "leaderboard",
  "login",
  "messages",
  "notifications",
  "p",
  "panel",
  "privacy",
  "profile",
  "r",
  "register",
  "runs",
  "sessions",
  "settings",
  "surveys",
  "talents",
  "tasks",
  "terms",
  "welcome",
  "workshops",
]);

export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const reqHost = rawHost.split(":")[0].trim().toLowerCase();

  // عزل كامل لنطاق التسجيل الخارجي: يمنع الوصول لأي صفحة منصة أو مسار تخميني
  if (EXTERNAL_HOST && reqHost === EXTERNAL_HOST) {
    const pathname = request.nextUrl.pathname;
    const rMatch = pathname.match(/^\/r\/([A-Za-z0-9_-]{8,128})$/);
    if (rMatch) {
      return NextResponse.next();
    }
    const segMatch = pathname.match(/^\/([A-Za-z0-9_-]{12,128})$/);
    if (segMatch && !RESERVED_PLATFORM_SEGMENTS.has(segMatch[1].toLowerCase())) {
      const target = request.nextUrl.clone();
      target.pathname = `/r/${segMatch[1]}`;
      return NextResponse.rewrite(target);
    }
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/r";
    return NextResponse.rewrite(fallback);
  }

  // 1) تجاوز أي طلبات تحميل مسبق في الخلفية (Prefetch أو RSC navigation) لحماية Egress المصادقة تماماً
  const purpose =
    request.headers.get("purpose") ||
    request.headers.get("x-purpose") ||
    request.headers.get("next-router-prefetch");
  const isRsc = request.headers.get("rsc") === "1" || request.nextUrl.searchParams.has("_rsc");
  
  if (purpose === "prefetch" || purpose === "1" || isRsc) {
    return NextResponse.next();
  }

  // 2) استثناء مسارات API من تحديث الكوكيز في الـ Middleware
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  // كل الصفحات ما عدا الملفات الثابتة والوسائط وAPI
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|mp4|ico|txt|webmanifest)$).*)",
  ],
};
