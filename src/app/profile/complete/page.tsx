import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCodeConfig } from "@/lib/platform";
import { CompleteProfileForm } from "@/components/platform/complete-profile-form";
import { PublicSiteSideLink } from "@/components/platform/public-site-side-link";
import { AuthThemeCorner } from "@/components/platform/auth-theme-corner";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  إكمال البيانات — لمستخدمي Google الجدد (مطابق لصفحة التسجيل)
// ═══════════════════════════════════════════════════════════════

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }> | { returnTo?: string };
}) {
  const [user, codeConfig, sp] = await Promise.all([
    getCurrentUser(),
    getStudentCodeConfig(),
    searchParams ? Promise.resolve(searchParams) : Promise.resolve({} as { returnTo?: string }),
  ]);

  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/admin");
  if (user.profile) redirect("/panel");

  const returnTo = typeof sp?.returnTo === "string" ? sp.returnTo : undefined;

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <AuthThemeCorner />
      <PublicSiteSideLink />
      {/* طبقة التوهج */}
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
            إكمال بيانات حسابك <span className="text-gold-gradient">في اللجنة</span>
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground font-medium">
            دقيقة واحدة تفصلك عن تجربة جامعية مختلفة — ورش، نقاط، إنجازات، ومواهبك
          </p>
        </div>

        <CompleteProfileForm
          userEmail={user.email}
          suggestedName={user.suggestedName || user.email.split("@")[0]}
          avatarUrl={user.avatarUrl}
          codeConfig={codeConfig}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
