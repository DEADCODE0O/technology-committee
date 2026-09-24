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
  searchParams?: Promise<{ returnTo?: string }> | { returnTo?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(isAdminRole(user.role) ? "/admin" : "/panel");

  const [codeConfig, sp] = await Promise.all([
    getStudentCodeConfig(),
    searchParams ? Promise.resolve(searchParams) : Promise.resolve({} as { returnTo?: string }),
  ]);
  const returnTo = typeof sp?.returnTo === "string" ? sp.returnTo : undefined;

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
            <span className="text-lg font-extrabold text-foreground">اللجنة التكنولوجية</span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold-deep dark:text-gold/70">TECHNOLOGY COMMITTEE</span>
          </span>
        </Link>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            انضم لمجتمع <span className="text-gold-gradient">يصنع الفرق</span>
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground font-medium">
            دقيقة واحدة تفصلك عن تجربة جامعية مختلفة — ورش، نقاط، إنجازات، ومواهبك
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2.5 rounded-2xl border border-gold/30 bg-gold/[0.06] p-3 shadow-xs">
            <GoogleButton returnTo={returnTo} label="إنشاء حساب بحساب Google" />
            <p className="mt-1 text-center text-[11px] leading-5 text-muted-foreground font-semibold">
              تسجيل دخول فوري وآمن بنقرة واحدة بحساب Google — وبعدها نطلب فقط بياناتك الدراسية الأساسية.
            </p>
          </div>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-extrabold text-muted-foreground">
              أو إنشاء حساب بالبريد الإلكتروني
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <RegisterWizard codeConfig={codeConfig} returnTo={returnTo} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500">
          <Link href="/privacy" className="hover:text-gold transition-colors">
            سياسة الخصوصية
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-gold transition-colors">
            شروط الاستخدام
          </Link>
          <span>•</span>
          <Link href="/data-deletion" className="hover:text-gold transition-colors">
            حذف البيانات
          </Link>
        </div>
      </div>
    </div>
  );
}
