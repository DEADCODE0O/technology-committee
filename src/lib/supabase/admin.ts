import "server-only";

// ═══════════════════════════════════════════════════════════════
//  عميل Supabase بمفتاح الخدمة (service_role) — للسيرفر فقط
//  ⚠️ ممنوع منعا باتًا استخدامه في Client Components أو تمريره
//     للمتصفح بأي شكل — هذا المفتاح يتجاوز RLS تمامًا.
//  يستخدم فقط للعمليات الإدارية الموثقة:
//    • إعادة تعيين كلمة سر مستخدم (admin.updateUserById)
//    • تعديل بريد مستخدم
// ═══════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseProjectUrl, supabaseServiceKey } from "./config";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = supabaseProjectUrl();
  const key = supabaseServiceKey();
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cached;
}
