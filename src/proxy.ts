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

export async function proxy(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|webmanifest)$).*)",
  ],
};
