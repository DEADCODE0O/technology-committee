import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LOGIN_ERROR_MESSAGES } from "@/lib/constants";
import { LoginForm } from "@/components/platform/login-form";
import { PublicSiteSideLink } from "@/components/platform/public-site-side-link";
import { isAdminRole } from "@/lib/permissions";
import { AuthThemeCorner } from "@/components/platform/auth-theme-corner";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; notice?: string }>;
}) {
  // مسجل بالفعل؟ لوجهته مباشرة
  const user = await getCurrentUser();
  if (user) redirect(isAdminRole(user.role) ? "/admin" : "/panel");

  const { returnTo, error, notice } = await searchParams;

  // رسالة خطأ من رجوع Google (لو فشل الدخول)
  const initialError = error ? LOGIN_ERROR_MESSAGES[error] : undefined;
  // رسائل إشعار (تفعيل البريد / كلمة السر الجديدة)
  const NOTICES: Record<string, string> = {
    confirm_email: "تم إنشاء حسابك — افتح بريدك واضغط رابط التفعيل ثم سجّل الدخول",
    password_updated: "تم تغيير كلمة السر بنجاح — سجّل دخولك بالكلمة الجديدة",
  };
  const noticeMsg = notice ? NOTICES[notice] : undefined;

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <AuthThemeCorner />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden="true" />
      <PublicSiteSideLink />

      <div className="relative z-10 w-full max-w-md">
        {/* الشعار */}
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
              <Sparkles className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-extrabold text-zinc-50">أهلاً بعودتك</h1>
            <p className="mt-1.5 text-sm text-zinc-500">سجّل دخولك وكمّل مشوارك معانا</p>
          </div>

          <LoginForm returnTo={returnTo} initialError={initialError} notice={noticeMsg} googleEnabled={isSupabaseConfigured()} />

          <p className="mt-6 text-center text-sm text-zinc-500">
            أول مرة معنا؟{" "}
            <Link
              href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}
              className="font-bold text-gold-deep dark:text-gold-light transition-colors hover:text-gold"
            >
              أنشئ حسابك الآن
              <ArrowLeft className="ms-1 inline h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
