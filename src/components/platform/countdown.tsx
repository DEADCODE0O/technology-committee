"use client";

// ═══════════════════════════════════════════════════════════════
//  العد التنازلي الحي والتسويقي الفاخر (Marketing Countdown Timer)
//  مصمم لتحفيز الطلاب وتشجيع الانضمام السريع (FOMO / Urgency Engine)
//  - خيارات عرض متعددة: blocks (صناديق رقمية سينمائية) | banner | pill | inline
//  - ألوان متفاعلة ديناميكيًا:
//    • urgent (< 24 ساعة): أحمر قرمزي متوهج مع أيقونة لهب ونبض مستمر
//    • success: أخضر زمردي متلألئ يعلن فتح التسجيل
//    • gold: الهوية الملكية الرسمية
//  - تصميم مزدوج كامل: كل نمط له هوية نهارية فاخرة (أسطح عاجية
//    مرتفعة بظلال ناعمة) وهوية ليلية سينمائية (توهج داكن) — بلا
//    أي ألوان داكنة صلبة تظهر في وضع النهار
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { Flame, Clock, Zap, CheckCircle2 } from "lucide-react";

export type Tone = "gold" | "success" | "urgent" | "calm";
export type CountdownVariant = "blocks" | "banner" | "pill" | "inline";

type Props = {
  to: string; // ISO string
  prefix?: string; // «يبدأ بعد» / «التسجيل يقفل بعد»
  className?: string;
  onEnd?: () => void;
  compact?: boolean; // نسخة مختصرة على هيئة Pill Badge
  variant?: CountdownVariant;
  tone?: Tone;
  /** true = لون الـtone يتكيف تلقائيًا مع قرب الموعد (يغلب urgent عند <24 ساعة) */
  autoUrgent?: boolean;
  /** رسالة تسويقية إضافية أسفل العداد */
  subtitle?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, totalSeconds: total };
}

export function Countdown({
  to,
  prefix,
  className,
  onEnd,
  compact = false,
  variant,
  tone = "gold",
  autoUrgent = true,
  subtitle,
}: Props) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    // أول قيمة عبر rAF (غير متزامنة) ثم نبضة كل ثانية — نمط متوافق مع قواعد react-hooks
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  const ended = now !== null && now >= target;
  useEffect(() => {
    if (ended && !endedRef.current) {
      endedRef.current = true;
      onEnd?.();
    }
  }, [ended, onEnd]);

  // نمط العرض الفعلي: لو compact=true ولم يُحدد variant نستخدم pill
  const activeVariant: CountdownVariant = variant ?? (compact ? "pill" : "inline");

  if (now === null) {
    if (activeVariant === "blocks" || activeVariant === "banner") {
      return (
        <div className="flex items-center justify-center gap-2.5 py-4 animate-pulse" suppressHydrationWarning>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex h-16 w-14 flex-col items-center justify-center rounded-2xl border border-black/[0.06] dark:border-white/10 bg-black/[0.03] dark:bg-black/40">
              <span className="text-xl font-black text-zinc-400 dark:text-zinc-500">--</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-600">...</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <span className={className ?? "tabular-nums tracking-wide text-zinc-500 dark:text-zinc-400"} suppressHydrationWarning>
        {prefix ? `${prefix} ` : ""}00:00:00
      </span>
    );
  }

  if (ended) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-400 ${className ?? ""}`}>
        <Clock className="h-3.5 w-3.5" />
        {prefix ? "انتهى وقت التسجيل" : "انتهى الموعد"}
      </span>
    );
  }

  const remaining = target - now;
  const { d, h, m, s } = parts(remaining);

  // تحديد الطابع اللوني بحسب الوقت المتبقي
  const isLess24h = remaining < 24 * 3600 * 1000;
  const isLess3h = remaining < 3 * 3600 * 1000;
  const effectiveTone: Tone =
    autoUrgent && isLess24h && remaining > 0 && (tone === "success" || tone === "gold" || tone === "urgent")
      ? "urgent"
      : tone;

  const isUrgent = effectiveTone === "urgent";
  const isSuccess = effectiveTone === "success";

  // ═══════════════════════════════════════════════════════════════
  // 1) نمط الصناديق الرقمية الفاخرة (Blocks / Banner) — لصفحة الورشة
  //    نهاري: بطاقة عاجية مرتفعة بحواف ملونة ناعمة وظلال هوائية
  //    ليلي: التوهج السينمائي الأصلي
  // ═══════════════════════════════════════════════════════════════
  if (activeVariant === "blocks" || activeVariant === "banner") {
    const cardTheme = isUrgent
      ? "border-rose-300/80 dark:border-rose-500/40 bg-gradient-to-b from-rose-50 via-white to-white dark:from-rose-950/40 dark:via-night/95 dark:to-night/95 shadow-[0_14px_35px_-12px_rgba(190,18,60,0.18)] dark:shadow-[0_0_35px_rgba(244,63,94,0.18)]"
      : isSuccess
      ? "border-emerald-300/80 dark:border-emerald-500/40 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/35 dark:via-night/95 dark:to-night/95 shadow-[0_14px_35px_-12px_rgba(5,120,85,0.16)] dark:shadow-[0_0_35px_rgba(16,185,129,0.15)]"
      : "border-amber-300/80 dark:border-gold/35 bg-gradient-to-b from-amber-50/60 via-white to-white dark:from-gold/[0.1] dark:via-night/95 dark:to-night/95 shadow-[0_14px_35px_-12px_rgba(150,113,31,0.2)] dark:shadow-[0_0_35px_rgba(201,164,92,0.15)]";

    const digitBoxTheme = isUrgent
      ? "border-rose-300 bg-white text-rose-700 dark:border-rose-500/40 dark:bg-zinc-900/90 dark:text-rose-300 dark:[text-shadow:0_0_15px_rgba(244,63,94,0.5)] shadow-sm"
      : isSuccess
      ? "border-emerald-300 bg-white text-emerald-800 dark:border-emerald-500/40 dark:bg-zinc-900/90 dark:text-emerald-300 dark:[text-shadow:0_0_15px_rgba(16,185,129,0.5)] shadow-sm"
      : "border-amber-300 bg-white text-amber-900 dark:border-gold/40 dark:bg-zinc-900/90 dark:text-amber-200 dark:[text-shadow:0_0_15px_rgba(201,164,92,0.5)] shadow-sm";

    const badgeLabel = isLess3h
      ? "🔥 فرصة أخيرة — يغلق التسجيل بعد قليل!"
      : isUrgent
      ? "⚡ ينتهي التسجيل قريباً — لا تفوّت المقعد!"
      : isSuccess
      ? "🟢 التسجيل مفتوح الآن — بادر بحجز مقعدك"
      : prefix || "الوقت المتبقي";

    return (
      <div className={`rounded-3xl border p-4 sm:p-5 ${cardTheme} ${className ?? ""}`} suppressHydrationWarning>
        {/* شارة التنبيه والتشويق التسويقي */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isUrgent ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <Flame className="h-4 w-4 animate-bounce" />
              </span>
            ) : isSuccess ? (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <Clock className="h-4 w-4 text-amber-700 dark:text-gold" />
            )}
            <span className={`text-xs font-black tracking-wide ${isUrgent ? "text-rose-700 dark:text-rose-300" : isSuccess ? "text-emerald-800 dark:text-emerald-300" : "text-amber-900 dark:text-gold-light"}`}>
              {badgeLabel}
            </span>
          </div>

          <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
            عدّاد حي لحظي
          </span>
        </div>

        {/* الصناديق الرقمية الأربعة */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3" dir="ltr">
          <DigitBlock value={d} label="أيام" sublabel="DAYS" boxTheme={digitBoxTheme} />
          <DigitBlock value={h} label="ساعات" sublabel="HOURS" boxTheme={digitBoxTheme} />
          <DigitBlock value={m} label="دقائق" sublabel="MINS" boxTheme={digitBoxTheme} />
          <DigitBlock value={s} label="ثواني" sublabel="SECS" boxTheme={digitBoxTheme} pulse={true} />
        </div>

        {/* سطر الدعم التسويقي */}
        <div className="mt-3.5 flex items-center justify-between border-t border-black/[0.08] dark:border-white/[0.08] pt-3 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <Zap className={`h-3.5 w-3.5 ${isUrgent ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-gold"}`} />
            {subtitle || "المقاعد محدودة وتُحجز بأسبقية التسجيل"}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">ينتهي تلقائياً</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 2) نمط الشارة المتوهجة (Pill Badge) — لبطاقات الورش واللوائح
  // ═══════════════════════════════════════════════════════════════
  if (activeVariant === "pill") {
    const pillTheme = isUrgent
      ? "border-rose-400 dark:border-rose-500/40 bg-rose-100/90 text-rose-800 dark:from-rose-950/60 dark:to-rose-950/60 dark:bg-rose-950/60 dark:text-rose-300 shadow-sm"
      : isSuccess
      ? "border-emerald-400 dark:border-emerald-500/40 bg-emerald-100/90 text-emerald-800 dark:from-emerald-950/60 dark:to-emerald-950/60 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm"
      : "border-amber-400/80 dark:border-gold/40 bg-amber-100/90 text-amber-950 dark:bg-gold/15 dark:text-amber-200 shadow-sm";

    const formattedTime = d > 0 ? `${d}ي ${pad(h)}س ${pad(m)}د ${pad(s)}ث` : `${pad(h)}:${pad(m)}:${pad(s)}`;

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black tabular-nums transition-all ${pillTheme} ${className ?? ""}`}
        suppressHydrationWarning
      >
        {isUrgent ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        ) : isSuccess ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-gold" />
        )}

        {prefix && <span className="font-bold text-zinc-900 dark:text-zinc-100">{prefix}:</span>}
        <span className="font-mono tracking-wider">{formattedTime}</span>
      </span>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 3) نمط السطر المطور (Inline High-Impact) — افتراضي أنيق
  // ═══════════════════════════════════════════════════════════════
  const inlineTheme = isUrgent
    ? "border-rose-400 dark:border-rose-500/40 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 shadow-sm"
    : isSuccess
    ? "border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-sm"
    : "border-amber-400/80 dark:border-gold/30 bg-amber-50 text-amber-950 dark:bg-gold/[0.12] dark:text-amber-200 shadow-sm";

  const clockText = d > 0 ? `${d} يوم · ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs font-extrabold tabular-nums tracking-wide transition-all ${inlineTheme} ${className ?? ""}`}
      suppressHydrationWarning
    >
      {isUrgent ? (
        <Flame className="h-3.5 w-3.5 animate-pulse text-rose-600 dark:text-rose-400" />
      ) : isSuccess ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <Clock className="h-3 w-3 text-amber-700 dark:text-gold" />
      )}

      {prefix ? <span className="opacity-90 font-bold">{prefix}:</span> : null}
      <span className="font-mono tracking-wider">{clockText}</span>
    </span>
  );
}

// ── عنصر الصندوق الرقمي المصغر ──
function DigitBlock({
  value,
  label,
  sublabel,
  boxTheme,
  pulse = false,
}: {
  value: number;
  label: string;
  sublabel: string;
  boxTheme: string;
  pulse?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border p-2 sm:p-3 transition-transform ${boxTheme}`}>
      <span className={`font-mono text-2xl sm:text-3xl font-black tracking-wider ${pulse ? "animate-pulse" : ""}`}>
        {pad(value)}
      </span>
      <span className="mt-0.5 text-[11px] font-black tracking-wide text-zinc-900 dark:text-zinc-100">
        {label}
      </span>
      <span className="text-[8px] font-latin font-black tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
        {sublabel}
      </span>
    </div>
  );
}
