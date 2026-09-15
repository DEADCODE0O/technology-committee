"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { useLanguage } from "@/lib/i18n/context";

type Span = "big" | "wide" | "tall" | "normal";

// خريطة أحجام البلاطات — الهاتف أولًا ثم الشاشات الكبيرة
const spanClasses: Record<Span, string> = {
  big: "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
  wide: "col-span-2 md:col-span-2",
  tall: "col-span-2 md:col-span-1 md:row-span-2",
  normal: "col-span-1 md:col-span-1",
};

export function Gallery() {
  const { locale } = useLanguage();
  const isEn = locale === "en";
  const items = siteConfig.gallery;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const isOpen = activeIndex !== null;

  const next = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % items.length));
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  }, [items.length]);

  const close = useCallback(() => setActiveIndex(null), []);

  // لوحة المفاتيح + قفل التمرير + التركيز على زر الإغلاق
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // في الاتجاه من اليمين لليسار: السهم الأيسر = التالي، الأيمن = السابق
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close, next, prev]);

  // السحب بالإصبع على الهاتف
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -60) next();
    else if (delta > 60) prev();
    touchStartX.current = null;
  };

  return (
    <section id="gallery" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <SectionHeading
          label={isEn ? "GALLERY" : "المعرض"}
          title={
            <>
              {isEn ? "From Our " : "من "}<span className="text-gold-gradient">{isEn ? "Journey" : "رحلتنا"}</span>
            </>
          }
          description={isEn ? "Moments and memories from committee activities, workshops, and gatherings." : "لحظات من أنشطة وفعاليات وتجارب اللجنة."}
        />

        {/* شبكة Bento */}
        <div className="mt-12 grid auto-rows-[38vw] grid-flow-row-dense grid-cols-2 gap-2.5 sm:mt-16 sm:auto-rows-[220px] sm:gap-3 md:auto-rows-[172px] md:grid-cols-4 lg:auto-rows-[200px]">
          {items.map((item, i) => (
            <motion.button
              key={item.src}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={isEn ? `Enlarge image: ${item.caption}` : `تكبير الصورة: ${item.caption}`}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.05 * (i % 4), ease: "easeOut" }}
              className={`group relative overflow-hidden rounded-xl border border-white/[0.07] transition-colors duration-300 hover:border-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:rounded-2xl ${spanClasses[item.span as Span] ?? ""}`}
            >
              <Image
                src={item.src}
                alt={item.caption}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
              {/* طبقة داكنة خفيفة تزداد عند اللمس/التحويم */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              />
              {/* أيقونة التكبير — شاشات كبيرة فقط */}
              <span
                aria-hidden="true"
                className="absolute end-3 top-3 hidden h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-night/50 text-zinc-200 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 md:flex"
              >
                <ZoomIn className="h-4 w-4" />
              </span>
              <span className="absolute inset-x-0 bottom-0 p-3 text-start text-[11px] font-bold text-white drop-shadow-md sm:p-4 sm:text-xs">
                {item.caption}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox احترافي */}
      <AnimatePresence>
        {isOpen && activeIndex !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`صورة: ${items[activeIndex].caption}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="fixed inset-0 z-[100] flex flex-col bg-night/95 backdrop-blur-xl"
          >
            {/* الشريط العلوي */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-latin text-xs font-semibold tracking-widest text-zinc-300">
                {activeIndex + 1} / {items.length}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label={isEn ? "Close gallery" : "إغلاق المعرض"}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors hover:border-gold/40 hover:text-gold-light"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* الصورة */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative h-full w-full max-w-6xl"
                >
                  <Image
                    src={items[activeIndex].src}
                    alt={items[activeIndex].caption}
                    fill
                    sizes="92vw"
                    quality={90}
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* السابق */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label={isEn ? "Previous image" : "الصورة السابقة"}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-night/70 text-zinc-200 backdrop-blur-sm transition-all hover:border-gold/40 hover:text-gold-light sm:right-5"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* التالي */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label={isEn ? "Next image" : "الصورة التالية"}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-night/70 text-zinc-200 backdrop-blur-sm transition-all hover:border-gold/40 hover:text-gold-light sm:left-5"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            {/* التعليق */}
            <div className="relative z-10 px-6 pb-6 pt-2 text-center sm:pb-8">
              <p className="text-sm font-bold text-white sm:text-base">
                {items[activeIndex].caption}
              </p>
              <p className="mt-1.5 font-latin text-[10px] font-medium tracking-[0.3em] text-gold/50">
                TECHNOLOGY COMMITTEE
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
