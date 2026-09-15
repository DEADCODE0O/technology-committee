"use client";

// ═══════════════════════════════════════════════════════════════
//  Error Boundary — أي خطأ غير متوقع يظهر بهوية عربية مهذبة
//  بدل الصفحة الإنجليزية الافتراضية
// ═══════════════════════════════════════════════════════════════

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md text-center">
        <Image src="/images/logo.png" alt="شعار اللجنة التكنولوجية" width={64} height={64} className="mx-auto h-16 w-16" />
        <span className="mx-auto mt-6 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-extrabold text-zinc-50">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm leading-7 text-zinc-500">
          اعتذرًا — ظهر خلل مؤقت أثناء تحميل الصفحة. جرّب التحديث مرة أخرى،
          ولو استمر الخطأ تواصل مع إدارة اللجنة.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            onClick={reset}
            className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
          >
            <RotateCcw className="h-5 w-5" />
            إعادة المحاولة
          </Button>
          <Link
            href="/welcome"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-zinc-300 transition-colors hover:border-gold/30"
          >
            <Home className="h-5 w-5" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
