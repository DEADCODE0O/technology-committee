import type { NextConfig } from "next";

// ═══════════════════════════════════════════════════════════════
//  إعدادات الإنتاج — المنصة تعمل على Vercel (Supabase Postgres)
//  ولا يجوز تجاهل أخطاء TypeScript في الإنتاج إطلاقًا
// ═══════════════════════════════════════════════════════════════

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  // الإنتاج يجب أن يفشل البناء عند وجود أخطاء TypeScript — لا تجاهل
  typescript: {
    ignoreBuildErrors: false,
  },
  // كشف المشاكل مبكرًا (تأثيرات مزدوجة / حالة غير نقية) — قياس React الرسمي
  reactStrictMode: true,
  // رؤوس أمنية موحدة لكل الاستجابات
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // بروكسي المعاينة يمرر طلبات Server Actions بعنوان داخلي (x-forwarded-host)
      // مختلف عن عنوان Origin الذي يرسله المتصفح — Next يرفضها حمايةً من CSRF.
      // نسمح بنطاقات المعاينة المعروفة فتعمل كل الإجراءات (دخول/تسجيل/حجز).
      // على Vercel هذا الإعداد غير ضروري لكنه آمن ولا يؤثر إطلاقًا.
      allowedOrigins: [
        "*.space-z.ai",
        "*.vercel.app",
        "localhost:3000",
        "localhost:81",
        "127.0.0.1:3000",
      ],
    },
  },
  images: {
    // صور الورش: Supabase Storage أو روابط https خارجية فقط
    // (http يسبب Mixed Content في الإنتاج ويُرفض)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

export default nextConfig;
