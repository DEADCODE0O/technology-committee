import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./config";
import { extractAccessTokenFromCookies, isTokenValidAndFresh } from "./token-utils";

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

  // 1) فحص الكوكيز: إذا لم يكن هناك أي كوكي جلسة خاص بـ Supabase، لا تتصل بالسيرفر أبداً (0 بايت Egress للزوار)
  const allCookies = request.cookies.getAll();
  const token = extractAccessTokenFromCookies(allCookies);
  if (!token) {
    return response;
  }

  // 2) فحص صلاحية التوكن محلياً (Zero-Auth-Egress):
  // إذا كان التوكن سليمًا ومتبقٍ على انتهائه أكثر من 5 دقائق (300 ثانية)،
  // لا نتصل بسيرفر Supabase Auth إطلاقاً، وتمر العملية فوراً بـ 0 بايت Egress!
  if (isTokenValidAndFresh(token, 300)) {
    return response;
  }

  // 3) فقط عندما يتبقى أقل من 5 دقائق على انتهاء التوكن نقوم بتجديد الجلسة
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

  try {
    await supabase.auth.getUser();
  } catch {
    // تجاهل أي خطأ بهدوء دون التأثير على التصفح
  }

  return response;
}
