import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/platform/reset-password-form";
import { AuthThemeCorner } from "@/components/platform/auth-theme-corner";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  /auth/reset-password — تعيين كلمة سر جديدة بعد فتح رابط الإيميل
//  1) ?code= موجود → استبداله بجلسة استعادة ثم تنظيف الرابط
//  2) جلسة نشطة → نموذج الكلمة الجديدة
//  3) لا جلسة ولا كود → عودة لصفحة الاستعادة
// ═══════════════════════════════════════════════════════════════

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string }> | { code?: string };
}) {
  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};
  const code = typeof sp.code === "string" ? sp.code : undefined;

  // 1) استبدال كود الاستعادة بجلسة (ثم إزالة الكود من الرابط)
  if (code && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code).catch((err: unknown) => {
        console.error("reset exchange error:", err);
      });
    }
    redirect("/auth/reset-password");
  }

  // 2) يجب أن تكون جلسة الاستعادة نشطة
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/forgot-password?notice=expired");
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <AuthThemeCorner />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/welcome" className="mb-8 flex items-center justify-center gap-3" aria-label="اللجنة التكنولوجية">
          <Image src="/images/logo.png" alt="شعار اللجنة التكنولوجية" width={56} height={56} className="h-14 w-14" priority />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-zinc-100">اللجنة التكنولوجية</span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold/70">TECHNOLOGY COMMITTEE</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold">
              <KeyRound className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-extrabold text-zinc-50">كلمة سر جديدة</h1>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              اختر كلمة سر قوية لحسابك — 8 أحرف على الأقل
            </p>
          </div>

          <ResetPasswordForm email={user.email} />

          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/login" className="font-bold text-gold-light transition-colors hover:text-gold">
              إلغاء والعودة لتسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
