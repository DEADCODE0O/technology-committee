// ═══════════════════════════════════════════════════════════════
//  وضع المصادقة — كشف إعداد Supabase
//  آمن للاستخدام في أي سياق (Edge Middleware / Client / Server):
//  يقرأ متغيرات NEXT_PUBLIC العامة فقط، ولا يستورد أي شيء.
//
//  - مفاتيح Supabase مضبوطة؟ → Supabase Auth هو النظام الرسمي
//    (بريد + كلمة سر، Google OAuth، استعادة كلمة السر، الجلسات)
//  - غير مضبوطة؟ → وضع التطوير المحلي (bcrypt + JWT) —
//    للمعاينة والتطوير فقط، ولا يُستخدم في الإنتاج أبدًا.
// ═══════════════════════════════════════════════════════════════

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** مفتاح الخدمة (service_role) — سيرفر فقط، لا يصل للمتصفح أبدًا */
export function supabaseServiceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/** رابط المشروع العام (بدون شرطة ختامية) */
export function supabaseProjectUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? url.replace(/\/$/, "") : null;
}
