import "server-only";

// ═══════════════════════════════════════════════════════════════
//  عميل Supabase للسيرفر — Server Components / Actions / Routes
//  يدير الجلسة عبر كوكيز @supabase/ssr (النمط الرسمي).
//  يعيد null عند عدم ضبط المفاتيح (وضع التطوير المحلي).
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./config";

export type SupabaseServer = ReturnType<ReturnType<typeof createServerClient>>;

export async function createSupabaseServerClient(): Promise<SupabaseServer | null> {
  if (!isSupabaseConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // استدعاء من Server Component (قراءة فقط) —
          // تحديث الجلسة يتكفل به الـ Middleware
        }
      },
    },
  });
}
