"use client";

// ═══════════════════════════════════════════════════════════════
//  دليل مستويات القلوب — تصميم محمول فائق السلاسة (Mobile-First)
//  مسار رتب أفقي مدمج بنمط الإنجازات والألعاب — شريط تمرير سريع بإصبعك
// ═══════════════════════════════════════════════════════════════

import {
  getCharmTier,
  getNextCharmTier,
  CHARM_TIERS,
} from "@/lib/charm-hearts";
import { VectorCharmHeart } from "@/components/ui/vector-charm-heart";
import { Heart, Lock, CheckCircle2 } from "lucide-react";

interface CharmHeartsGuideInlineProps {
  level: number;
  points?: number;
  className?: string;
}

export function CharmHeartsGuideInline({
  level = 0,
  points,
  className = "",
}: CharmHeartsGuideInlineProps) {
  const safeLevel = Math.max(0, Math.min(12, level));
  const currentTier = getCharmTier(safeLevel);
  const effectivePoints = typeof points === "number" ? points : currentTier.pointsRequired;
  const nextTier = getNextCharmTier(currentTier.level);
  const pointsToNext = nextTier ? Math.max(0, nextTier.pointsRequired - effectivePoints) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.round(
          ((effectivePoints - currentTier.pointsRequired) /
            Math.max(1, nextTier.pointsRequired - currentTier.pointsRequired)) *
            100
        )
      )
    : 100;

  return (
    <section
      id="charm-hearts-guide"
      className={`space-y-3.5 scroll-mt-20 ${className}`}
      aria-labelledby="charm-hearts-heading"
    >
      {/* ── 1. بطاقة مستواك الحالي ومؤشر الهدف القادم (مدمجة وخفيفة جداً) ── */}
      <div
        className="rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        style={{
          background: `radial-gradient(circle at top right, ${currentTier.heartColor}18 0%, rgba(24, 24, 27, 0.04) 100%)`,
          borderColor: `${currentTier.heartColor}45`,
        }}
      >
        {/* القلب والمستوى */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shrink-0 p-1.5 bg-card/70"
            style={{
              borderColor: currentTier.heartColor,
              boxShadow: `0 0 14px ${currentTier.glowColor}`,
            }}
          >
            <VectorCharmHeart level={currentTier.level} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-muted border border-border text-foreground">
                المستوى {currentTier.level}
              </span>
              <span className="text-xs font-black text-gold">
                {effectivePoints} نقطة
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground mt-0.5">
              {currentTier.title}
            </h4>
          </div>
        </div>

        {/* شريط التقدم نحو المستوى القادم */}
        {nextTier ? (
          <div className="bg-card/70 px-3 py-2 rounded-xl border border-border/60 min-w-[200px] sm:self-auto self-stretch">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-muted-foreground">الهدف: <strong className="text-rose-500">{nextTier.title}</strong></span>
              <span className="text-gold font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: currentTier.heartColor,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block text-left mt-0.5">
              متبقي {pointsToNext} نقطة
            </span>
          </div>
        ) : (
          <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
            أعلى رتبة تفاعلية 👑
          </span>
        )}
      </div>

      {/* ── 2. مسار الرتب الأفقي السلس (مرر بإصبعك لرؤية جميع المستويات من 0 إلى 12) ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5 text-[11px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-500" />
            مرر بإصبعك لرؤية جميع مستويات القلوب الـ 13:
          </span>
          <span>من المستوى 0 إلى 12</span>
        </div>

        {/* شريط البطاقات الأفقية خفيفة الوزن */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar snap-x touch-pan-x">
          {CHARM_TIERS.map((t) => {
            const isCurrent = t.level === currentTier.level;
            const isUnlocked = level >= t.level;

            return (
              <div
                key={t.level}
                className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border shrink-0 w-[84px] h-[106px] text-center snap-start transition-all ${
                  isCurrent
                    ? "bg-gold/15 border-gold ring-2 ring-gold/40 shadow-xs scale-[1.02]"
                    : isUnlocked
                    ? "bg-card/70 border-border/70"
                    : "bg-muted/15 border-border/30 opacity-55"
                }`}
              >
                {/* رأس البطاقة: الشارة أو القفل */}
                <div className="w-full flex items-center justify-between text-[9px] font-extrabold text-muted-foreground">
                  <span>Lvl {t.level}</span>
                  {isCurrent ? (
                    <span className="text-gold font-black">★</span>
                  ) : isUnlocked ? (
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>

                {/* أيقونة القلب الفيكتور المصغرة */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border p-1 shadow-xs my-0.5"
                  style={{
                    backgroundColor: `${t.heartColor}15`,
                    borderColor: `${t.heartColor}40`,
                  }}
                >
                  <VectorCharmHeart level={t.level} />
                </div>

                {/* اللقب والنقاط */}
                <div className="w-full">
                  <span className="text-[10px] font-black text-foreground block truncate">
                    {t.title}
                  </span>
                  <span className="text-[9px] font-bold text-gold block">
                    {t.pointsRequired} ن
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
