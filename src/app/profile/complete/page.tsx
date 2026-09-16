import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCodeConfig } from "@/lib/platform";
import { CompleteProfileForm } from "@/components/platform/complete-profile-form";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  إكمال البيانات — لمستخدمي Google الجدد (بلا ملف طالب بعد)
// ═══════════════════════════════════════════════════════════════

export default async function CompleteProfilePage() {
  const [user, codeConfig] = await Promise.all([
    getCurrentUser(),
    getStudentCodeConfig(),
  ]);
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/admin");
  if (user.profile) redirect("/panel");

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl">
        <Link href="/welcome" className="mb-8 flex items-center justify-center gap-3" aria-label="اللجنة التكنولوجية">
          <Image src="/images/logo.png" alt="شعار اللجنة التكنولوجية" width={56} height={56} className="h-14 w-14" priority />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-zinc-100">اللجنة التكنولوجية</span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold/70">TECHNOLOGY COMMITTEE</span>
          </span>
        </Link>

        <CompleteProfileForm suggestedName={user.suggestedName || user.email.split("@")[0]} codeConfig={codeConfig} />
      </div>
    </div>
  );
}
