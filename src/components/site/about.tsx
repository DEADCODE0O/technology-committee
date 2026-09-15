"use client";

import Image from "next/image";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { useLanguage } from "@/lib/i18n/context";

export function About() {
  const { about } = siteConfig;
  const { t } = useLanguage();

  const label = t("about.label") || about.label;
  const title = t("about.title") || about.title;
  const description = t("about.description") || about.description;
  const caption = t("about.caption") || about.imageCaption;

  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* الصورة */}
          <Reveal className="order-1 md:order-2">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -bottom-4 -left-4 h-full w-full rounded-2xl border border-gold/25 sm:-bottom-5 sm:-left-5"
              />
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)]">
                <Image
                  src={about.image}
                  alt={caption}
                  width={1080}
                  height={810}
                  sizes="(max-width: 768px) 100vw, 540px"
                  className="h-auto w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-transparent"
                />
                <span className="absolute bottom-3.5 start-4 text-[11px] font-bold text-white drop-shadow-sm sm:text-xs">
                  {caption}
                </span>
              </div>
            </div>
          </Reveal>

          {/* النص */}
          <div className="order-2 md:order-1">
            <SectionHeading
              align="start"
              label={label}
              title={title}
            />
            <Reveal delay={0.15}>
              <p className="mt-6 text-sm leading-loose text-muted-foreground sm:text-base sm:leading-loose md:leading-loose">
                {description}
              </p>
              <div className="gold-hairline mt-8 w-28" aria-hidden="true" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
