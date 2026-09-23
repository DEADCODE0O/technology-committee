import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./config";

// ═══════════════════════════════════════════════════════════════
//  تحديث جلسة Supabase في الـ Middleware (النمط الرسمي لـ @supabase/ssr)
//  - يحدّث التوكنات قبل انتهائها في كل تنقّل
//  - لا يفرض أي تحويل — حرس الصفحات (requireStudent/requireAdmin)
//    هي التي تقرر التوجيه
//  - بدون مفاتيح Supabase → يمرر الطلب كما هو (وضع التطوير المحلي)
// ═══════════════════════════════════════════════════════════════

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }


  let response = NextResponse.next({ request });

  // فحص الكوكيز: إذا لم يكن هناك أي كوكي جلسة خاص بـ Supabase، لا تتصل بالسيرفر أبداً (0 بايت Egress للزوار)
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some((c) => c.name.startsWith("sb-") || c.name.includes("auth-token"));
  if (!hasAuthCookie) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // تحديث الجلسة إن كانت قريبة من الانتهاء
  try {
    await supabase.auth.getUser();
  } catch {
    // تجاهل أي خطأ بهدوء دون التأثير على التصفح
  }

  return response;
}
