"use client";

// ═══════════════════════════════════════════════════════════════
//  زر «الدخول / التسجيل بـ Facebook» — عبر Supabase Auth الرسمي
//  (Facebook OAuth يُدار عبر Supabase:
//   Supabase Dashboard → Authentication → Providers → Facebook)
// ═══════════════════════════════════════════════════════════════

import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function FacebookButton({
  label = "تسجيل الدخول بحساب Facebook",
  returnTo,
}: {
  /** مسار داخلي اختياري يعود إليه الطالب بعد Facebook OAuth. */
  returnTo?: string;
  label?: string;
}) {
  // ميزة الدخول عبر Facebook معطلة ومخفية مؤقتاً لحين استكمال التحقق من تطبيق فيسبوك
  return null;
}
