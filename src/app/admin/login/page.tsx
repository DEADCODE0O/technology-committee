import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // أدمن مسجل؟ للوحة مباشرة
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* خلفية إدارية أنيقة — توهج ذهبي متكيف مع المظهر */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,164,92,0.12), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(201,164,92,0.06), transparent)",
        }}
        aria-hidden="true"
      />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.08]">
            <Image src="/images/logo.png" alt="شعار اللجنة" width={36} height={36} className="h-9 w-9" />
          </div>
          <div>
            <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold text-foreground">
              <ShieldCheck className="h-5 w-5 text-gold" />
              نظام إدارة اللجنة
            </h1>
            <p className="mt-1 font-latin text-[9px] font-medium tracking-[0.3em] text-gold-deep dark:text-gold/60">ADMIN CONTROL CENTER</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-[0_1px_2px_rgba(32,29,25,0.04),0_24px_60px_-18px_rgba(32,29,25,0.18)] backdrop-blur-xl dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] sm:p-7">
          <p className="mb-5 text-center text-sm text-muted-foreground">دخول مخصص للإدارة فقط — الطلاب من <Link href="/login" className="font-bold text-gold-deep hover:text-gold dark:text-gold/80 dark:hover:text-gold">بوابة الطلاب</Link></p>
          <AdminLoginForm />
        </div>

        <p className="mt-6 text-center text-[11px] leading-6 text-muted-foreground/80">
          كل عمليات الإدارة مسجلة في سجل العمليات (Audit Log)
        </p>
      </div>
    </div>
  );
}
