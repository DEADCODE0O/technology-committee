import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCodeConfig } from "@/lib/platform";
import { RegisterWizard } from "@/components/platform/register-wizard";
import { PublicSiteSideLink } from "@/components/platform/public-site-side-link";
import { GoogleButton } from "@/components/platform/google-button";
import { isAdminRole } from "@/lib/permissions";
import { AuthThemeCorner } from "@/components/platform/auth-theme-corner";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(isAdminRole(user.role) ? "/admin" : "/panel");

  const [codeConfig, { returnTo }] = await Promise.all([getStudentCodeConfig(), searchParams]);

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <AuthThemeCorner />
      <PublicSiteSideLink />
      {/* طبقة التوهج — قصّها هنا حتى لا يمنع overflow قاعدة sticky لأزرار المعالج */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="gold-glow-bg absolute inset-x-0 top-0 h-72 opacity-70" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* الشعار */}
        <Link href="/welcome" className="mb-8 flex items-center justify-center gap-3" aria-label="اللجنة التكنولوجية">
          <Image src="/images/logo.png" alt="شعار اللجنة التكنولوجية" width={56} height={56} className="h-14 w-14" priority />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-zinc-100">اللجنة التكنولوجية</span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold/70">TECHNOLOGY COMMITTEE</span>
          </span>
        </Link>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-zinc-50 sm:text-3xl">
            انضم لمجتمع <span className="text-gold-gradient">يصنع الفرق</span>
          </h1>
          <p className="mt-2 text-sm leading-7 text-zinc-500">
            دقيقة واحدة تفصلك عن تجربة جامعية مختلفة — ورش، نقاط، إنجازات، ومواهبك
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3">
            <GoogleButton returnTo={returnTo} label="إنشاء حساب بحساب Google" />
            <p className="mt-2 text-center text-[11px] leading-5 text-zinc-500">
              تسجيل دخول سريع وآمن بنقرة واحدة — وبعدها نطلب فقط بياناتك الدراسية الأساسية.
            </p>
          </div>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-xs font-bold text-zinc-500">
              أو إنشاء حساب بالبريد الإلكتروني
            </span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
          <RegisterWizard codeConfig={codeConfig} returnTo={returnTo} />
        </div>
      </div>
    </div>
  );
}
