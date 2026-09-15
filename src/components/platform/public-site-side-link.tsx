"use client";

import Link from "next/link";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

// ═══════════════════════════════════════════════════════════════
//  الرابط الجانبي «الموقع العام» — تبويب رأسي صغير بحجم إصبع
//  على حافة الشاشة في صفحات الدخول والتسجيل
//  يفتح الموقع التعريفي الدائم /welcome
// ═══════════════════════════════════════════════════════════════

export function PublicSiteSideLink() {
  const { locale } = useLanguage();
  const isEn = locale === "en";

  return (
    <Link
      href="/welcome"
      aria-label={isEn ? "Public Site — About Committee & Activities" : "الموقع العام — تعريف اللجنة والأنشطة"}
      title={isEn ? "Public Site" : "الموقع العام"}
      className="fixed end-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-s-2xl border border-s-0 border-gold/30 bg-surface/90 px-1.5 py-5 text-[11px] font-extrabold text-gold-light shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:bg-gold/15 hover:border-gold/50"
    >
      <Globe className="h-4 w-4" />
      <span className="tracking-wide [writing-mode:vertical-rl]">{isEn ? "Public Site" : "الموقع العام"}</span>
    </Link>
  );
}
