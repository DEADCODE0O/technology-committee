"use client";

// ═══════════════════════════════════════════════════════════════
//  دليل مستويات التفاعل والتكريم (القلوب) — عرض طبيعي ومباشر
//  بدون أي نوافذ منبثقة — يوضح تدرج الرتب والنقاط والقلوب
// ═══════════════════════════════════════════════════════════════

import {
  getCharmTier,
  getNextCharmTier,
  CHARM_TIERS,
} from "@/lib/charm-hearts";
import { VectorCharmHeart } from "@/components/ui/vector-charm-heart";
import { Sparkles, Heart, Trophy, ArrowLeft } from "lucide-react";

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
      className={`space-y-5 scroll-mt-20 ${className}`}
      aria-labelledby="charm-hearts-heading"
    >
      {/* ── رأس القسم ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-xs">
            <Heart className="h-5 w-5 fill-rose-500/30" />
          </div>
          <div>
            <h3 id="charm-hearts-heading" className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              مستويات التفاعل والتكريم (القلوب 💖)
              <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                قلب المستوى {currentTier.level}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              كلما زادت مشاركاتك وحضورك في الأنشطة والورش ارتقى مستوى قلبك وتميز حسابك.
            </p>
          </div>
        </div>
      </div>

      {/* ── بطاقة مستواك الحالي ومؤشر التقدم نحو القلب التالي ── */}
      <div
        className="rounded-2xl border p-4 sm:p-5 relative overflow-hidden transition-all shadow-sm"
        style={{
          background: `radial-gradient(circle at top right, ${currentTier.heartColor}18 0%, rgba(24, 24, 27, 0.05) 100%)`,
          borderColor: `${currentTier.heartColor}45`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-lg shrink-0 p-2 relative bg-card/60"
              style={{
                borderColor: currentTier.heartColor,
                boxShadow: `0 0 16px ${currentTier.glowColor}`,
              }}
            >
              <VectorCharmHeart level={currentTier.level} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground">
                  المستوى {currentTier.level}
                </span>
                <span className="text-xs font-black text-gold">
                  {effectivePoints} نقطة
                </span>
              </div>
              <h4 className="text-base font-black text-foreground mt-1">
                {currentTier.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentTier.level === 12
                  ? "أعلى مستوى تكريمي في مجتمع اللجنة التكنولوجية!"
                  : `قلب رمزي يُعرض بجوار اسمك في الملف والمنشورات ولوحة المتصدرين.`}
              </p>
            </div>
          </div>

          {/* شريط التقدم نحو المستوى القادم */}
          {nextTier && (
            <div className="sm:text-left shrink-0 bg-card/80 p-3 rounded-xl border border-border/60 min-w-[210px]">
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-foreground">
                <span className="text-[11px] text-muted-foreground">الهدف التالي:</span>
                <span className="text-rose-500 font-extrabold">{nextTier.title}</span>
              </div>
              <div className="mt-1 flex items-center justify-between sm:justify-end gap-2 text-[11px] font-bold text-muted-foreground">
                <span>متبقي: {pointsToNext} نقطة</span>
                <span className="text-gold font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: currentTier.heartColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── شبكة مستويات القلوب الـ 13 الطبيعية المباشرة ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">
          تدرج جميع الرتب والقلوب التكريمية (من المستوى 0 إلى 12):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {CHARM_TIERS.map((t) => {
            const isCurrent = t.level === currentTier.level;
            const isUnlocked = level >= t.level;

            return (
              <div
                key={t.level}
                className={`relative flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-gold/15 border-gold shadow-sm ring-2 ring-gold/40 scale-[1.01]"
                    : isUnlocked
                    ? "bg-card/70 border-border/80 hover:border-gold/30 hover:bg-muted/30"
                    : "bg-muted/15 border-border/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border p-1 shadow-xs"
                    style={{
                      backgroundColor: `${t.heartColor}15`,
                      borderColor: `${t.heartColor}40`,
                    }}
                  >
                    <VectorCharmHeart level={t.level} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-foreground truncate">
                        {t.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-gold text-night px-1.5 py-0.2 rounded font-black shrink-0">
                          أنت هنا
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      المستوى {t.level}
                    </span>
                  </div>
                </div>

                <div className="text-left shrink-0 pe-1">
                  <span className="text-[11px] font-black text-gold block">
                    {t.pointsRequired}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">
                    نقطة
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
