"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة إطارات التميز والمستويات الملكية — تصميم محمول فائق الفخامة (VIP Showcase)
//  معاينة رئيسية كبيرة وواضحة + بطاقات رحبة ومريحة للمس بدون نصوص مقصوصة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Lock,
  CircleOff,
  Crown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  AVATAR_FRAMES,
  getAvatarFrame,
  isFrameUnlocked,
  TIER_CONFIG,
} from "@/lib/avatar-frames";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { equipAvatarFrame } from "@/actions/profile";

interface FrameWardrobeInlineProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
  };
  onFrameChanged?: (frameId: string | null) => void;
  className?: string;
  compact?: boolean;
}

export function FrameWardrobeInline({
  user,
  onFrameChanged,
  className = "",
}: FrameWardrobeInlineProps) {
  const [isPending, startTransition] = useTransition();
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNLOCKED" | "LOCKED">("ALL");

  const selectedFrame = getAvatarFrame(previewFrameId);
  const isSelectedFrameUnlocked = selectedFrame
    ? isFrameUnlocked(selectedFrame, user.level, true)
    : true;
  const isFrameEquipped = previewFrameId === currentFrameId;

  // تجهيز إطار المستوى فورياً
  const handleEquipFrame = (frameId: string | null) => {
    startTransition(async () => {
      const res = await equipAvatarFrame(frameId);
      if (res.ok) {
        setCurrentFrameId(frameId);
        onFrameChanged?.(frameId);
        if (frameId) {
          const frame = getAvatarFrame(frameId);
          toast.success(`تم تجهيز «${frame?.name ?? ""}» بنجاح! 👑`);
        } else {
          toast.success("تمت إزالة الإطار والعودة للوضع البسيط");
        }
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  // فلترة قائمة الإطارات
  const filteredFrames = useMemo(() => {
    return AVATAR_FRAMES.filter((f) => {
      const unlocked = isFrameUnlocked(f, user.level, true);
      if (activeFilter === "UNLOCKED") return unlocked;
      if (activeFilter === "LOCKED") return !unlocked;
      return true;
    });
  }, [activeFilter, user.level]);

  const tierCfg = selectedFrame ? TIER_CONFIG[selectedFrame.tier] : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── 1. بطاقة المعاينة الملكية الكبرى (Hero Showcase) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-card via-card/90 to-card/70 p-4 sm:p-6 shadow-xl backdrop-blur-md">
        {/* وهج لوني خلفي مطابق لرتبة الإطار */}
        <div
          className="pointer-events-none absolute -top-12 inset-x-0 h-40 opacity-35 blur-3xl transition-all duration-500"
          style={{
            backgroundColor: tierCfg?.color || "#c9a45c",
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-start">
          {/* الأفاتار المكبر مع الإطار البارز */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <div className="relative group">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                name={user.fullName}
                frameId={previewFrameId}
                framesVisible={true}
                size="2xl"
                level={user.level}
                showLevel
                className="drop-shadow-[0_10px_25px_rgba(0,0,0,0.4)]"
              />
              {isFrameEquipped && (
                <span className="absolute -bottom-1 -start-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg ring-2 ring-background">
                  ✓
                </span>
              )}
            </div>

            <div className="space-y-1.5 min-w-0 max-w-sm">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  {selectedFrame ? selectedFrame.name : "الوضع البسيط الدائري"}
                </h3>

                {selectedFrame && tierCfg && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border shadow-xs ${tierCfg.badgeCls}`}
                  >
                    {tierCfg.label} · Lvl {selectedFrame.requiredLevel}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedFrame
                  ? selectedFrame.description
                  : "صورة دائرية نقية بدون أي إطارات إضافية، مناسبة للبساطة التامة."}
              </p>

              {selectedFrame && !isSelectedFrameUnlocked && (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-xs font-bold text-amber-500 mt-1">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    يتطلب الوصول إلى المستوى {selectedFrame.requiredLevel} (أنت في المستوى {user.level})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* أزرار الإجراء السريعة بحجم لمس مريح للموبايل */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            {isFrameEquipped ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-black text-emerald-500 shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>الإطار المرتدى حالياً</span>
                </div>

                {currentFrameId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleEquipFrame(null)}
                    className="flex items-center gap-1.5 rounded-2xl border border-border bg-card hover:bg-muted/80 px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                    title="خلع الإطار والعودة للوضع البسيط"
                  >
                    <CircleOff className="h-4 w-4" />
                    <span className="hidden xs:inline">خلع الإطار</span>
                  </button>
                )}
              </div>
            ) : isSelectedFrameUnlocked ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleEquipFrame(previewFrameId)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gold hover:bg-gold-light px-5 py-2.5 text-xs font-black text-night transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                <span>ارتداء هذا الإطار 👑</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-xs font-bold text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>إطار مقفل حالياً</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. شريط التصفية السريعة للإطارات ── */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({AVATAR_FRAMES.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("UNLOCKED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "UNLOCKED"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            مفتوحة لي 🔓
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("LOCKED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "LOCKED"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            مقيدة بالمستوى 🔒
          </button>
        </div>

        <span className="text-[11px] font-bold text-muted-foreground shrink-0 hidden sm:inline">
          مستواك الحالي: <strong className="text-gold font-black">{user.level}</strong>
        </span>
      </div>

      {/* ── 3. معرض البطاقات الرحبة بأسلوب الكروت الفاخرة (Touch-Friendly Carousel / Grid) ── */}
      <div className="relative">
        <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar snap-x touch-pan-x">
          {/* بطاقة الوضع البسيط (بدون إطار) */}
          {activeFilter !== "LOCKED" && (
            <button
              type="button"
              onClick={() => setPreviewFrameId(null)}
              className={`flex flex-col items-center justify-between shrink-0 w-28 sm:w-32 p-3 rounded-2xl border transition-all cursor-pointer snap-start text-center ${
                previewFrameId === null
                  ? "border-gold bg-gold/15 ring-2 ring-gold/40 shadow-lg scale-[1.02]"
                  : "border-border/70 bg-card/60 hover:bg-muted/50"
              }`}
            >
              <div className="relative my-2 flex items-center justify-center h-16 w-16 rounded-full bg-muted/40">
                <CircleOff className="h-8 w-8 text-muted-foreground" />
                {currentFrameId === null && (
                  <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow">
                    ✓
                  </span>
                )}
              </div>

              <div className="w-full space-y-0.5">
                <p className="text-xs font-black text-foreground truncate">
                  الوضع البسيط
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  بدون إطار
                </span>
              </div>
            </button>
          )}

          {/* بطاقات الإطارات الرحبة */}
          {filteredFrames.map((frame) => {
            const unlocked = isFrameUnlocked(frame, user.level, true);
            const isEquipped = currentFrameId === frame.id;
            const isSelected = previewFrameId === frame.id;
            const tier = TIER_CONFIG[frame.tier];

            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => setPreviewFrameId(frame.id)}
                className={`flex flex-col items-center justify-between shrink-0 w-28 sm:w-32 p-3 rounded-2xl border transition-all cursor-pointer snap-start text-center group ${
                  isSelected
                    ? "border-gold bg-gold/15 ring-2 ring-gold/40 shadow-lg scale-[1.02]"
                    : unlocked
                    ? "border-border/70 bg-card/60 hover:bg-muted/50 hover:border-gold/40"
                    : "border-border/30 bg-muted/20 opacity-60 hover:opacity-85"
                }`}
              >
                {/* الأفاتار بحجم رحب (size="md" أو container مريح 56px) مع الإطار */}
                <div className="relative my-1 flex items-center justify-center">
                  <AvatarWithFrame
                    avatarUrl={user.avatarUrl}
                    name={user.fullName}
                    frameId={frame.id}
                    framesVisible={true}
                    size="lg"
                    level={user.level}
                  />

                  {/* شارة الارتداء أو القفل */}
                  {isEquipped ? (
                    <span className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md">
                      ✓
                    </span>
                  ) : !unlocked ? (
                    <span className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-amber-400 text-[10px] border border-amber-500/50 shadow-md">
                      <Lock className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>

                {/* الاسم الكامل بدون قص ورقم المستوى */}
                <div className="w-full space-y-1 mt-2">
                  <p className="text-xs font-black text-foreground line-clamp-2 leading-tight min-h-[32px] flex items-center justify-center">
                    {frame.name}
                  </p>

                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[9px] font-black border ${
                        tier?.badgeCls || "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      Lv.{frame.requiredLevel}
                    </span>
                    {!unlocked && (
                      <span className="text-[9px] text-amber-500 font-bold">
                        مقفل
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
