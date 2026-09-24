import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { OtpVerifyForm } from "@/components/platform/otp-verify-form";
import { PublicSiteSideLink } from "@/components/platform/public-site-side-link";
import { AuthThemeCorner } from "@/components/platform/auth-theme-corner";

export const dynamic = "force-dynamic";

export default async function RegisterVerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string; returnTo?: string; notice?: string }> | { email?: string; returnTo?: string; notice?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(isAdminRole(user.role) ? "/admin" : "/panel");
  }

  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};
  const email = typeof sp.email === "string" ? sp.email : undefined;
  const returnTo = typeof sp.returnTo === "string" ? sp.returnTo : undefined;
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;

  // إذا لم يكن هناك بريد محدد، العودة لصفحة التسجيل
  if (!email) {
    redirect("/register");
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <AuthThemeCorner />
      <div
        className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        aria-hidden="true"
      />
      <PublicSiteSideLink />

      <div className="relative z-10 w-full max-w-md">
        {/* الشعار */}
        <Link
          href="/welcome"
          className="mb-8 flex items-center justify-center gap-3"
          aria-label="اللجنة التكنولوجية"
        >
          <Image
            src="/images/logo.png"
            alt="شعار اللجنة التكنولوجية"
            width={56}
            height={56}
            className="h-14 w-14"
            priority
          />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-zinc-100">اللجنة التكنولوجية</span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold/70">
              TECHNOLOGY COMMITTEE
            </span>
          </span>
        </Link>

        <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold shadow-[0_0_20px_rgba(201,164,92,0.15)]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-extrabold text-zinc-50">تأكيد البريد الإلكتروني</h1>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-zinc-400">
              أدخل رمز التحقق (OTP) المكون من 6 أرقام المرسل إلى بريدك لإكمال تفعيل حسابك.
            </p>
          </div>

          <OtpVerifyForm email={email} returnTo={returnTo} notice={notice} />
        </div>
      </div>
    </div>
  );
}
