// ═══════════════════════════════════════════════════════════════
//  عميل Supabase للمتصفح — Client Components فقط
//  (زر الدخول بـ Google / أي تفاعل مباشر مع الجلسة)
//  يعيد null عند عدم ضبط المفاتيح — لا يكسر الواجهة أبدًا.
// ═══════════════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!cached) cached = createBrowserClient(url, key);
  return cached;
}
