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
  return updateSession(request);
}

export const config = {
  // كل الصفحات والأكشنات ما عدا الملفات الثابتة والوسائط
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/qr|api/uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|webmanifest)$).*)",
  ],
};
