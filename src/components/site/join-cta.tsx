"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { siteConfig, joinSection } from "@/config/site";
import { Reveal } from "./reveal";
import { useLanguage } from "@/lib/i18n/context";

export function JoinCta() {
  const { t } = useLanguage();

  const titleBefore = t("joinCta.titleBefore") || joinSection.titleBefore;
  const titleGold = t("joinCta.titleGold") || joinSection.titleGold;
  const textBefore = t("joinCta.textBefore") || joinSection.textBefore;
  const textHighlight = t("joinCta.textHighlight") || joinSection.textHighlight;
  const textAfter = t("joinCta.textAfter") || joinSection.textAfter;
  const buttonText = t("joinCta.button") || siteConfig.joinLabel;

  return (
    <section id="join" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-card px-6 py-14 text-center shadow-xl sm:px-12 sm:py-20">
            {/* توهجات ذهبية */}
            <div
              aria-hidden="true"
              className="absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gold/[0.12] blur-[90px]"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-32 left-1/4 h-48 w-72 rounded-full bg-gold/[0.07] blur-[80px]"
            />

            <div className="relative">
              <span aria-hidden="true" className="text-2xl text-gold">
                ✦
              </span>
              <h2 className="mt-5 text-3xl font-black leading-snug text-foreground sm:text-4xl lg:text-5xl lg:leading-snug">
                {titleBefore}{" "}
                <span className="text-gold-gradient">{titleGold}</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-loose text-muted-foreground sm:text-base sm:leading-loose">
                {textBefore}{" "}
                <span className="font-extrabold text-gold-deep dark:text-gold-light">{textHighlight}</span>{" "}
                {textAfter}
              </p>
              <Link
                href={siteConfig.joinUrl}
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-light to-gold px-10 py-4 text-base font-extrabold text-night shadow-[0_15px_50px_-12px_rgba(201,164,92,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-12px_rgba(201,164,92,0.85)] active:translate-y-0 sm:px-12 sm:text-lg"
              >
                {buttonText}
                <ArrowLeft className="h-5 w-5 rtl:rotate-0 ltr:rotate-180 transition-transform" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
