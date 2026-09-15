"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Laptop,
  Shapes,
  Palette,
  Scissors,
  Mic,
  Star,
  Bus,
  PartyPopper,
  Trophy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { offerings, experienceSection, siteConfig } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { useLanguage } from "@/lib/i18n/context";

const iconMap: Record<string, LucideIcon> = {
  laptop: Laptop,
  shapes: Shapes,
  palette: Palette,
  scissors: Scissors,
  mic: Mic,
  star: Star,
  bus: Bus,
  party: PartyPopper,
  trophy: Trophy,
  sparkles: Sparkles,
};

export function Offerings() {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="experience" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <SectionHeading
          label={t("offerings.label") || experienceSection.label}
          title={
            <>
              {t("offerings.titleBefore") || experienceSection.titleBefore}{" "}
              <span className="text-gold-gradient">{t("offerings.titleGold") || experienceSection.titleGold}</span>
            </>
          }
          description={t("offerings.description") || experienceSection.description}
        />

        {/* مجالات وتجارب متنوعة + مساحة «مجالات أخرى» (تتوسع لشريط كامل على الشاشات الكبيرة) */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-4 lg:grid-cols-3">
          {offerings.map((item, i) => {
            const Icon = iconMap[item.icon] ?? Laptop;
            const isOther = item.isOther === true;
            const itemTitle = t(`offerings.${item.icon}.title`) || item.title;
            const itemDesc = t(`offerings.${item.icon}.desc`) || item.description;

            return (
              <motion.div
                key={item.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: 0.06 * (i % 3),
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className={
                  isOther
                    ? // بطاقة "برامج أخرى" — حدود ذهبية متقطعة تميزها كبوابة للمزيد
                      "flex flex-col rounded-2xl border border-dashed border-gold/40 bg-gold/[0.06] p-4 text-center transition-colors duration-300 hover:border-gold/60 hover:bg-gold/[0.1] sm:p-5 lg:col-span-3 lg:flex-row lg:items-center lg:justify-center lg:gap-4 lg:py-6 lg:text-start"
                    : "group rounded-2xl border border-border bg-card p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg sm:p-6"
                }
              >
                <span
                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.08] text-gold-deep dark:text-gold-light sm:h-12 sm:w-12 ${
                    isOther
                      ? "lg:mx-0"
                      : "transition-all duration-300 group-hover:border-gold/50 group-hover:shadow-[0_0_24px_-6px_rgba(201,164,92,0.45)]"
                  }`}
                >
                  <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={1.8} />
                </span>
                <h3
                  className={`mt-3.5 text-sm font-extrabold sm:mt-4 sm:text-base ${
                    isOther ? "text-gold-deep dark:text-gold-light lg:mt-0" : "text-foreground"
                  }`}
                >
                  {itemTitle}
                </h3>
                <p
                  className={`mt-1.5 text-[11px] leading-relaxed sm:text-xs sm:leading-relaxed ${
                    isOther ? "text-muted-foreground lg:mt-0" : "text-muted-foreground"
                  }`}
                >
                  {itemDesc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
