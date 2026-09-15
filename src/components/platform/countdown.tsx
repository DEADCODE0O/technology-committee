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
      ? "border-rose-300/70 dark:border-rose-500/40 bg-gradient-to-b from-rose-50 via-white to-white dark:from-rose-950/30 dark:via-night/90 dark:to-night/90 shadow-[0_14px_35px_-12px_rgba(190,18,60,0.18)] dark:shadow-[0_0_35px_rgba(244,63,94,0.18)]"
      : isSuccess
      ? "border-emerald-300/70 dark:border-emerald-500/40 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/25 dark:via-night/90 dark:to-night/90 shadow-[0_14px_35px_-12px_rgba(5,120,85,0.16)] dark:shadow-[0_0_35px_rgba(16,185,129,0.15)]"
      : "border-gold/40 dark:border-gold/35 bg-gradient-to-b from-[#fbf7ec] via-white to-white dark:from-gold/[0.08] dark:via-night/90 dark:to-night/90 shadow-[0_14px_35px_-12px_rgba(150,113,31,0.2)] dark:shadow-[0_0_35px_rgba(201,164,92,0.15)]";

    const digitBoxTheme = isUrgent
      ? "border-rose-200 dark:border-rose-500/30 bg-gradient-to-b from-white to-rose-50 text-rose-600 dark:bg-black/60 dark:text-rose-300 dark:[text-shadow:0_0_15px_rgba(244,63,94,0.45)]"
      : isSuccess
      ? "border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-b from-white to-emerald-50 text-emerald-600 dark:bg-black/60 dark:text-emerald-300 dark:[text-shadow:0_0_15px_rgba(16,185,129,0.45)]"
      : "border-gold/30 dark:border-gold/30 bg-gradient-to-b from-white to-[#faf5e6] text-gold-deep dark:bg-black/60 dark:text-gold-pale dark:[text-shadow:0_0_15px_rgba(201,164,92,0.35)]";

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
              <Clock className="h-4 w-4 text-gold" />
            )}
            <span className={`text-xs font-black tracking-wide ${isUrgent ? "text-rose-600 dark:text-rose-300" : isSuccess ? "text-emerald-700 dark:text-emerald-300" : "text-gold-deep dark:text-gold-light"}`}>
              {badgeLabel}
            </span>
          </div>

          <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
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
        <div className="mt-3.5 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] pt-3 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
            <Zap className={`h-3.5 w-3.5 ${isUrgent ? "text-rose-500 dark:text-rose-400" : "text-gold"}`} />
            {subtitle || "المقاعد محدودة وتُحجز بأسبقية التسجيل"}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-500">ينتهي تلقائياً</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 2) نمط الشارة المتوهجة (Pill Badge) — لبطاقات الورش واللوائح
  // ═══════════════════════════════════════════════════════════════
  if (activeVariant === "pill") {
    const pillTheme = isUrgent
      ? "border-rose-300/80 dark:border-rose-500/40 bg-gradient-to-r from-rose-50 to-rose-100 text-rose-600 dark:from-rose-950/40 dark:via-red-900/30 dark:to-rose-950/40 dark:text-rose-300 shadow-[0_4px_14px_-4px_rgba(190,18,60,0.25)] dark:shadow-[0_0_20px_rgba(244,63,94,0.22)]"
      : isSuccess
      ? "border-emerald-300/80 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-950/40 dark:via-teal-900/30 dark:to-emerald-950/40 dark:text-emerald-300 shadow-[0_4px_14px_-4px_rgba(5,120,85,0.25)] dark:shadow-[0_0_20px_rgba(16,185,129,0.18)]"
      : "border-gold/45 dark:border-gold/30 bg-gradient-to-r from-[#faf5e6] to-[#f5edda] text-gold-deep dark:from-gold/[0.12] dark:via-gold/[0.05] dark:to-gold/[0.12] dark:text-gold-light shadow-[0_4px_14px_-4px_rgba(150,113,31,0.22)] dark:shadow-[0_0_20px_rgba(201,164,92,0.15)]";

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
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        )}

        {prefix && <span className="text-zinc-700 dark:text-zinc-300 font-bold">{prefix}:</span>}
        <span className="font-mono tracking-wider">{formattedTime}</span>
      </span>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 3) نمط السطر المطور (Inline High-Impact) — افتراضي أنيق
  // ═══════════════════════════════════════════════════════════════
  const inlineTheme = isUrgent
    ? "border-rose-300/70 dark:border-rose-500/40 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300 shadow-[0_3px_10px_-3px_rgba(190,18,60,0.2)] dark:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
    : isSuccess
    ? "border-emerald-300/70 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300 shadow-[0_3px_10px_-3px_rgba(5,120,85,0.2)] dark:shadow-[0_0_15px_rgba(16,185,129,0.18)]"
    : "border-gold/40 dark:border-gold/30 bg-[#faf5e6] text-gold-deep dark:bg-gold/[0.08] dark:text-gold-light shadow-[0_3px_10px_-3px_rgba(150,113,31,0.18)] dark:shadow-[0_0_15px_rgba(201,164,92,0.12)]";

  const clockText = d > 0 ? `${d} يوم · ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs font-extrabold tabular-nums tracking-wide transition-all ${inlineTheme} ${className ?? ""}`}
      suppressHydrationWarning
    >
      {isUrgent ? (
        <Flame className="h-3.5 w-3.5 animate-pulse text-rose-500 dark:text-rose-400" />
      ) : isSuccess ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      ) : (
        <Clock className="h-3 w-3 text-gold" />
      )}

      {prefix ? <span className="opacity-90">{prefix}:</span> : null}
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
      <span className="mt-0.5 text-[11px] font-extrabold tracking-wide text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <span className="text-[8px] font-latin font-bold tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
        {sublabel}
      </span>
    </div>
  );
}
