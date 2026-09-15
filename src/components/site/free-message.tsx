"use client";

import { Reveal } from "./reveal";
import { useLanguage } from "@/lib/i18n/context";

/**
 * رسالة المجانية — بيان بصري راقٍ بأن كل البرامج مجانية للطلاب
 */
export function FreeMessage() {
  const { t } = useLanguage();

  return (
    <section className="relative py-14 sm:py-20" aria-label={t("freeMessage.badge") || "جميع البرامج مجانية للطلاب"}>
      <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card px-6 py-12 text-center shadow-lg dark:border-gold/15 dark:bg-gradient-to-b dark:from-gold/[0.06] dark:via-surface dark:to-surface sm:px-12 sm:py-16">
            {/* إضاءات ذهبية داخلية */}
            <div
              aria-hidden="true"
              className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gold/[0.1] blur-[80px]"
            />
            {/* زوايا ذهبية رفيعة */}
            <span
              aria-hidden="true"
              className="absolute end-5 top-5 h-6 w-6 rounded-ee-lg border-b border-e border-gold/40"
            />
            <span
              aria-hidden="true"
              className="absolute start-5 top-5 h-6 w-6 rounded-es-lg border-b border-s border-gold/40"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-5 end-5 h-6 w-6 rounded-se-lg border-t border-e border-gold/40"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-5 start-5 h-6 w-6 rounded-ss-lg border-t border-s border-gold/40"
            />

            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/[0.08] dark:bg-night/60 px-4 py-1.5 font-latin text-[10px] font-semibold tracking-[0.32em] text-gold-deep dark:text-gold-light sm:text-xs">
                {t("freeMessage.badge") || "100% FREE FOR STUDENTS"}
              </span>

              <h3 className="mt-6 text-3xl font-black leading-snug text-foreground sm:text-4xl lg:text-5xl lg:leading-snug">
                {t("freeMessage.titlePrefix")}{" "}
                <span className="text-gold-gradient">{t("freeMessage.titleHighlight")}</span>{" "}
                {t("freeMessage.titleSuffix")}
              </h3>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-loose text-muted-foreground sm:text-base sm:leading-loose">
                {t("freeMessage.description")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
