import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { getCurrentUser } from "@/lib/auth";

// غلاف موحد لصفحات المنصة العامة — نفس هوية الموقع
export async function SitePageShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-background">
      <Navbar
        user={
          user
            ? {
                name: user.profile?.fullName ?? user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
                avatarFrameId: user.avatarFrameId,
              }
            : null
        }
      />

      <main className="flex-1 pt-24 lg:pt-28">
        {/* رأس الصفحة */}
        <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-64 opacity-60" aria-hidden="true" />
          <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" aria-label="مسار التنقل">
            <Link href="/welcome" className="transition-colors hover:text-gold-light">
              الرئيسية
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-gold-deep dark:text-gold/80">{title}</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            <span className="text-gold-gradient">{title}</span>
          </h1>
          {subtitle && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{subtitle}</p>}
        </section>

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">{children}</div>
      </main>

      <Footer />
    </div>
  );
}

// شعار الصفحات الفارغة الأنيق
export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gold/25 bg-card/60 px-6 py-16 text-center dark:bg-surface/50">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 bg-gold/[0.06] text-gold-deep dark:text-gold/70">
        {icon}
      </div>
      <p className="text-lg font-bold text-foreground">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{hint}</p>}
    </div>
  );
}

// لوغو مائي للبطاقات الفارغة
export function CommitteeMark() {
  return <Image src="/images/logo.png" alt="" width={28} height={28} className="h-7 w-7 opacity-60" />;
}
