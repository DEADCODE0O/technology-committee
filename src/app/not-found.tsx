import Link from "next/link";
import Image from "next/image";
import { Compass, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md text-center">
        <Image
          src="/images/logo.png"
          alt="شعار اللجنة التكنولوجية"
          width={64}
          height={64}
          className="mx-auto h-16 w-16"
        />
        <span className="mx-auto mt-6 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold shadow-lg shadow-gold/10">
          <Compass className="h-8 w-8 animate-pulse" />
        </span>
        <div className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gold-light to-gold font-mono">
          404
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-zinc-50">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-7 text-zinc-400">
          عذرًا، يبدو أن الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقله أو حذفه.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <Link
            href="/welcome"
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
          <Link
            href="/activities"
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-zinc-200 transition-colors hover:border-gold/40 hover:bg-white/[0.08]"
          >
            <Sparkles className="h-4 w-4 text-gold" />
            استكشف الورش
          </Link>
        </div>
      </div>
    </div>
  );
}
