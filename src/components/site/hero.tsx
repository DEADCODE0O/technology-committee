"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LogIn, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useLanguage } from "@/lib/i18n/context";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
});

export function Hero() {
  const { t, locale } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const anim = (delay: number) =>
    prefersReducedMotion ? { initial: false, animate: undefined } : fadeUp(delay);

  const isEn = locale === "en";

  return (
    <section
      id="home"
      className="relative flex min-h-svh items-center justify-center overflow-hidden"
    >
      {/* ── الخلفية السينمائية — صورة حقيقية من أنشطة اللجنة (Bokeh مموهة مسبقًا) ── */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={siteConfig.hero.background}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* تعتيم متكيف: داكن سينمائي ليلًا / حجاب عاجي حريري نهارًا */}
        <div className="hero-scrim absolute inset-0" />
        {/* إضاءة ذهبية خفيفة تلوّن الصورة بهوية اللجنة */}
        <div className="gold-glow-bg absolute inset-0 opacity-80" />
        {/* Vignette سينمائي يُبرز المركز ويُنعش الأطراف */}
        <div className="hero-vignette absolute inset-0" />
        {/* دمج أعلى القسم مع شريط التنقل */}
        <div className="hero-top-blend absolute inset-x-0 top-0 h-28" />
        {/* دمج أسفل القسم مع بقية الصفحة بسلاسة */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pb-24 pt-28 text-center sm:px-6 lg:pt-32">
        {/* الشعار الرسمي */}
        <motion.div {...anim(0)} className="relative">
          {/* هالة متكيفة تُبرز الشعار فوق الصورة: زجاج داكن ليلًا / وميض عاجي نهارًا */}
          <div
            aria-hidden="true"
            className="hero-logo-halo absolute inset-0 -z-20 scale-[1.5] rounded-full blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 scale-[1.35] rounded-full bg-gold/[0.1] blur-2xl"
          />
          <Image
            src={siteConfig.logo}
            alt={isEn ? "Official Logo of Technology Committee" : "الشعار الرسمي للجنة التكنولوجية"}
            width={256}
            height={256}
            priority
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 640px) 112px, 176px"
            className="h-28 w-28 object-contain sm:h-36 sm:w-36 lg:h-44 lg:w-44"
          />
        </motion.div>

        {/* الاسم */}
        <motion.h1 {...anim(0.12)} className="mt-9 sm:mt-11">
          <span className="block text-2xl font-bold text-foreground/90 drop-shadow-none dark:text-zinc-200 sm:text-3xl">
            {isEn ? "TECHNOLOGY" : siteConfig.nameFirstPart}
          </span>
          {/* leading-[1.95] ≥ امتداد خط Cairo (1.874em) — يمنع مسح ذيل الياء والنقاط مع تدرج النص الذهبي،
              والهوامش السالبة تحافظ على نفس المسافات البصرية السابقة */}
          <span className="text-gold-gradient mt-[calc(0.25rem_-_0.4em)] -mb-[0.4em] block text-6xl font-black leading-[1.95] sm:text-7xl lg:text-8xl">
            {isEn ? "COMMITTEE" : siteConfig.nameSecondPart}
          </span>
        </motion.h1>

        <motion.p
          {...anim(0.22)}
          className="mt-4 font-latin text-[10px] font-medium tracking-[0.42em] text-gold-deep dark:text-gold/75 sm:text-xs sm:tracking-[0.5em]"
        >
          {isEn ? "اللجنة التكنولوجية — اتحاد الطلاب" : siteConfig.nameEn}
        </motion.p>

        {/* العبارة الرئيسية */}
        <motion.p
          {...anim(0.32)}
          className="mt-7 max-w-xl text-xl font-extrabold leading-[1.6] text-foreground drop-shadow-sm dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-2xl sm:leading-[1.6] lg:text-3xl lg:leading-[1.6]"
        >
          {t("welcome.heroTitlePrefix")}{" "}
          <span className="text-gold-deep dark:text-gold-light">{t("welcome.heroTitleHighlight")}</span>
        </motion.p>

        {/* شارة المجانية */}
        <motion.div {...anim(0.42)}>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/70 px-5 py-1.5 text-xs font-bold text-gold-deep shadow-[0_2px_12px_rgba(32,29,25,0.06)] backdrop-blur-md dark:bg-night/60 dark:text-gold-pale dark:shadow-none sm:text-sm">
            <span aria-hidden="true" className="text-sm text-gold">
              ✦
            </span>
            {t("welcome.statsFree")}
          </span>
        </motion.div>

        {/* الأزرار — تصفح الفعاليات كزر رئيسي وتسجيل الدخول */}
        <motion.div
          {...anim(0.52)}
          className="mt-8 flex w-full flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <a
            href="#offerings"
            className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-gold-light to-gold px-8 py-3.5 text-base font-extrabold text-night shadow-[0_12px_40px_-10px_rgba(201,164,92,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-10px_rgba(201,164,92,0.75)] active:translate-y-0"
          >
            <Sparkles className="h-4 w-4 text-night" />
            {isEn ? "Explore Activities & Programs" : "تصفح الفعاليات والأنشطة"}
            <ChevronDown className="h-4 w-4 text-night animate-bounce" />
          </a>

          <Link
            href="/login"
            className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-gold/40 bg-white/60 px-8 py-3.5 text-base font-bold text-foreground shadow-[0_2px_14px_rgba(32,29,25,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:text-gold-deep active:translate-y-0 dark:border-gold/40 dark:bg-gold/[0.08] dark:text-gold-light dark:shadow-none dark:hover:border-gold/70 dark:hover:bg-gold/[0.16]"
          >
            <LogIn className="h-5 w-5" />
            {t("welcome.loginCta")}
          </Link>
        </motion.div>
      </div>

      {/* مؤشر التمرير */}
      <motion.a
        href="#offerings"
        aria-label={isEn ? "Scroll down" : "انتقل للأسفل"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-muted-foreground transition-colors hover:text-gold dark:text-zinc-400 sm:block"
      >
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </motion.a>
    </section>
  );
}
