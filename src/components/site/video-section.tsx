"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { useLanguage } from "@/lib/i18n/context";

/** تحويل رابط يوتيوب إلى رابط تشغيل مدمج */
function getYouTubeEmbed(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` : null;
}

/**
 * قسم الفيديو التعريفي — عرض سينمائي احترافي
 * ── لإضافة فيديو جديد مستقبلًا: ضع الرابط في siteConfig.video.url فقط ──
 * (يدعم روابط يوتيوب وملفات mp4 المباشرة، ويُحمَّل الفيديو فقط عند الضغط على تشغيل)
 */
export function VideoSection() {
  const { url, title, description, poster, soonLabel, duration } = siteConfig.video;
  const [playing, setPlaying] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useLanguage();
  const isEn = locale === "en";

  const youtubeEmbed = url ? getYouTubeEmbed(url) : null;
  const isDirectVideo = url ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) : false;
  const hasVideo = Boolean(youtubeEmbed || isDirectVideo);

  return (
    <section id="video" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <SectionHeading
          label={isEn ? "PROMO VIDEO" : "الفيديو التعريفي"}
          title={isEn ? "Discover the Committee Experience" : title}
          description={isEn ? "A comprehensive overview of our vision, activities, and community." : description}
        />

        <Reveal className="mt-12 sm:mt-16" delay={0.1}>
          <div className="relative mx-auto max-w-5xl">
            {/* إطار ذهبي خلفي مزاح — لمسة Premium */}
            <div
              aria-hidden="true"
              className="absolute -bottom-4 left-4 right-4 -z-10 h-full rounded-2xl border border-gold/20 sm:-bottom-5 sm:left-6 sm:right-6 sm:rounded-3xl"
            />

            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-[0_45px_100px_-30px_rgba(0,0,0,0.9)] sm:rounded-3xl">
              {/* ── حالة ما قبل التشغيل: Poster سينمائي ── */}
              {!playing && (
                <>
                  <Image
                    src={poster}
                    alt={isEn ? "Promo Video Poster" : `ملصق الفيديو التعريفي — ${title}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-cover"
                  />
                  {/* تدرجات تعتيم احترافية — موحدة وثابتة في الوضعين */}
                  <div aria-hidden="true" className="absolute inset-0 bg-night/35" />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-night/85 via-transparent to-night/25"
                  />

                  {/* الشريط العلوي */}
                  <div className="absolute start-4 top-4 z-10 flex items-center gap-2 sm:start-5 sm:top-5">
                    <span className="rounded-full bg-night/75 px-3.5 py-1.5 text-[11px] font-bold text-zinc-100 backdrop-blur-md sm:text-xs">
                      {isEn ? "TECHNOLOGY COMMITTEE" : "اللجنة التكنولوجية"}
                    </span>
                    {hasVideo && (
                      <span className="hidden rounded-full border border-gold/50 bg-night/80 px-3 py-1.5 font-latin text-[10px] font-semibold tracking-[0.22em] text-gold-light backdrop-blur-md sm:inline-block">
                        PROMO
                      </span>
                    )}
                  </div>

                  {/* زر التشغيل الذهبي — حلقة مضيئة مزدوجة موحدة في الوضعين */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <motion.button
                      type="button"
                      onClick={() => hasVideo && setPlaying(true)}
                      aria-label={hasVideo ? (isEn ? "Play promo video" : "تشغيل الفيديو التعريفي") : (isEn ? "Coming Soon" : soonLabel)}
                      whileHover={
                        hasVideo && !prefersReducedMotion ? { scale: 1.06 } : undefined
                      }
                      whileTap={hasVideo ? { scale: 0.97 } : undefined}
                      className={`group relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${
                        hasVideo ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      {/* هالة ناعمة موحدة */}
                      <span
                        aria-hidden="true"
                        className="absolute -inset-2 rounded-full bg-white/10 opacity-70 backdrop-blur-[2px] transition-opacity group-hover:opacity-100"
                      />
                      {hasVideo && !prefersReducedMotion && (
                        <span
                          aria-hidden="true"
                          className="animate-ping-soft absolute inset-0 rounded-full border border-gold/50"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-gold-light to-gold text-night shadow-[0_10px_35px_-8px_rgba(201,164,92,0.9),inset_0_1px_0_rgba(255,255,255,0.45)] ring-4 ring-white/15"
                      >
                        <Play
                          className="h-6 w-6 -translate-x-[1px] fill-current sm:h-8 sm:w-8"
                          aria-hidden="true"
                        />
                      </span>
                    </motion.button>
                    <span className="mt-5 rounded-full bg-night/75 px-4 py-1.5 text-xs font-bold text-zinc-100 backdrop-blur-md sm:text-sm">
                      {hasVideo ? (isEn ? "Watch Video" : "شاهد الفيديو") : (isEn ? "Coming Soon" : soonLabel)}
                    </span>
                  </div>

                  {/* شارة المدة — مثل المنصات الاحترافية */}
                  {hasVideo && duration && (
                    <span
                      dir="ltr"
                      className="absolute bottom-4 end-4 z-10 rounded-md bg-night/80 px-2.5 py-1 font-latin text-[11px] font-semibold tracking-wider text-zinc-100 backdrop-blur-md sm:bottom-5 sm:end-5 sm:text-xs"
                    >
                      {duration}
                    </span>
                  )}
                </>
              )}

              {/* ── حالة التشغيل: يُحمَّل الفيديو عند الضغط فقط ── */}
              {playing && hasVideo ? (
                youtubeEmbed ? (
                  <iframe
                    src={youtubeEmbed}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 z-20 h-full w-full"
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    autoPlay
                    playsInline
                    preload="none"
                    poster={poster}
                    className="absolute inset-0 z-20 h-full w-full bg-black"
                  >
                    متصفحك لا يدعم تشغيل الفيديو.
                  </video>
                )
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
