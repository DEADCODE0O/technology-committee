"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة إطارات التميز والمستويات الملكية — تصميم احترافي فائق السلاسة
//  • تنقل تفاعلي سهل بين الإطارات (أسهم مباشرة + سحب لمس + لوحة مفاتيح)
//  • وضعا عرض متطوران: شبكة كاملة للموبايل (Grid) + سلايدر متحرك (Carousel)
//  • معاينة فورية بدون فجوات بصرية وأزرار إجراء سريعة بمتناول اليد
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
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
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react";
import {
  AVATAR_FRAMES,
  isFrameUnlocked,
  TIER_CONFIG,
  type FrameTier,
  type AvatarFrame,
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

interface WardrobeItem {
  id: string | null;
  name: string;
  tier: FrameTier | "BASIC";
  requiredLevel: number;
  description: string;
  unlocked: boolean;
  isEquipped: boolean;
  rawFrame: AvatarFrame | null;
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
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "UNLOCKED" | "LOCKED" | "TIER_BRONZE" | "TIER_SILVER" | "TIER_GOLD" | "TIER_PLATINUM" | "TIER_DIAMOND" | "TIER_ROYAL"
  >("ALL");

  // وضع العرض: شبكة سريعة للموبايل (Grid) أو شريط متحرك (Carousel)
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");

  // مراجع السحب والتحريك
  const touchStartX = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // إعداد قائمة كافة الخيارات المتاحة (12 إطار مستوى + الوضع البسيط)
  const allOptions: WardrobeItem[] = useMemo(() => {
    const basicItem: WardrobeItem = {
      id: null,
      name: "الوضع البسيط",
      tier: "BASIC",
      requiredLevel: 1,
      description: "صورة دائرية نقية بدون أي إطار إضافي، مناسبة للبساطة التامة.",
      unlocked: true,
      isEquipped: currentFrameId === null,
      rawFrame: null,
    };

    const frameItems: WardrobeItem[] = AVATAR_FRAMES.map((f) => ({
      id: f.id,
      name: f.name,
      tier: f.tier,
      requiredLevel: f.requiredLevel,
      description: f.description,
      unlocked: isFrameUnlocked(f, user.level, true),
      isEquipped: currentFrameId === f.id,
      rawFrame: f,
    }));

    return [basicItem, ...frameItems];
  }, [currentFrameId, user.level]);

  // فلترة العناصر
  const filteredItems = useMemo(() => {
    return allOptions.filter((item) => {
      if (activeFilter === "UNLOCKED") return item.unlocked;
      if (activeFilter === "LOCKED") return !item.unlocked;
      if (activeFilter === "TIER_BRONZE") return item.tier === "BRONZE" || item.tier === "BASIC";
      if (activeFilter === "TIER_SILVER") return item.tier === "SILVER";
      if (activeFilter === "TIER_GOLD") return item.tier === "GOLD";
      if (activeFilter === "TIER_PLATINUM") return item.tier === "PLATINUM";
      if (activeFilter === "TIER_DIAMOND") return item.tier === "DIAMOND";
      if (activeFilter === "TIER_ROYAL")
        return item.tier === "MYTHIC" || item.tier === "COSMIC" || item.tier === "EXCLUSIVE";
      return true;
    });
  }, [allOptions, activeFilter]);

  // العنصر النشط المحدد للمعاينة
  const currentIndex = Math.max(
    0,
    filteredItems.findIndex((it) => it.id === previewFrameId)
  );
  const activeItem = filteredItems[currentIndex] || filteredItems[0] || allOptions[0];

  // التنقل السريع للتالي والسابق
  const goToNext = () => {
    if (filteredItems.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredItems.length;
    setPreviewFrameId(filteredItems[nextIdx].id);
  };

  const goToPrev = () => {
    if (filteredItems.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    setPreviewFrameId(filteredItems[prevIdx].id);
  };

  // دعم التنقل بأسهم لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToNext();
      } else if (e.key === "ArrowRight") {
        goToPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, filteredItems]);

  // دعم السحب باللمس على شاشات الموبايل
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    touchStartX.current = null;
    if (diff > 45) {
      goToPrev();
    } else if (diff < -45) {
      goToNext();
    }
  };

  // تحريك السلايدر أفقياً مع مراعاة اتجاه RTL
  const scrollCarousel = (direction: "forward" | "backward") => {
    if (carouselRef.current) {
      // في وضع RTL: التقدم للأمام يكون بالتحرك يساراً (سالب)، والرجوع للخلف يميناً (موجب)
      const scrollAmount = direction === "forward" ? -240 : 240;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // تجهيز إطار المستوى فورياً
  const handleEquipFrame = (frameId: string | null) => {
    startTransition(async () => {
      const res = await equipAvatarFrame(frameId);
      if (res.ok) {
        setCurrentFrameId(frameId);
        onFrameChanged?.(frameId);
        if (frameId) {
          const item = allOptions.find((it) => it.id === frameId);
          toast.success(`تم تجهيز «${item?.name ?? ""}» بنجاح! 👑`);
        } else {
          toast.success("تمت إزالة الإطار والعودة للوضع البسيط");
        }
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  const isEquipped = activeItem.id === currentFrameId;
  const isUnlocked = activeItem.unlocked;
  const tierCfg = activeItem.rawFrame ? TIER_CONFIG[activeItem.rawFrame.tier] : null;

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* ── 1. بطاقة المعاينة الملكية التفاعلية مع أزرار التنقل المباشرة ── */}
      <div
        className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-card via-card/95 to-card/85 p-4 sm:p-6 shadow-xl backdrop-blur-md select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* وهج لوني خلفي مطابق لرتبة الإطار المعروض */}
        <div
          className="pointer-events-none absolute -top-10 inset-x-0 h-44 opacity-25 blur-3xl transition-all duration-500"
          style={{
            backgroundColor: tierCfg?.color || "#c9a45c",
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-center text-center space-y-4">
          {/* قسم الأفاتار في المنتصف ومحاط بأزرار التنقل السريعة السابق / التالي */}
          <div className="w-full flex items-center justify-between gap-2 sm:gap-4 max-w-md">
            {/* زر السابق */}
            <button
              type="button"
              onClick={goToPrev}
              aria-label="الإطار السابق"
              title="الإطار السابق (السهم الأيمن)"
              className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/80 hover:bg-muted text-foreground transition-all active:scale-90 hover:border-gold/50 shadow-md cursor-pointer"
            >
              <ChevronRight className="h-6 w-6 text-gold" />
            </button>

            {/* الأفاتار المعروض بالمعاينة */}
            <div className="relative flex flex-col items-center group py-2">
              <div className="relative">
                <AvatarWithFrame
                  avatarUrl={user.avatarUrl}
                  name={user.fullName}
                  frameId={activeItem.id}
                  framesVisible={true}
                  size="2xl"
                  level={user.level}
                  showLevel={false}
                  className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
                />

                {isEquipped && (
                  <span className="absolute -bottom-1 -start-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg ring-2 ring-background">
                    ✓
                  </span>
                )}
                {!isUnlocked && (
                  <span className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-amber-400 text-xs font-black border border-amber-500/50 shadow-lg">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* مؤشر رقم الإطار الحالي */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-background/70 border border-border/80 px-2.5 py-0.5 text-[11px] font-black text-muted-foreground">
                <span>{currentIndex + 1}</span>
                <span className="text-zinc-600">/</span>
                <span>{filteredItems.length}</span>
              </div>
            </div>

            {/* زر التالي */}
            <button
              type="button"
              onClick={goToNext}
              aria-label="الإطار التالي"
              title="الإطار التالي (السهم الأيسر)"
              className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/80 hover:bg-muted text-foreground transition-all active:scale-90 hover:border-gold/50 shadow-md cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6 text-gold" />
            </button>
          </div>

          {/* تفاصيل الإطار المحدد */}
          <div className="space-y-1.5 max-w-lg">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-foreground">
                {activeItem.name}
              </h3>

              {tierCfg && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border shadow-xs ${tierCfg.badgeCls}`}
                >
                  {tierCfg.label} · Lvl {activeItem.requiredLevel}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {activeItem.description}
            </p>

            {/* حالة القفل أو التوفر */}
            {!isUnlocked && (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-xs font-bold text-amber-500 mt-1">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  يتطلب المستوى {activeItem.requiredLevel} (أنت في المستوى {user.level} — متبقي {Math.max(1, activeItem.requiredLevel - user.level)} مستويات)
                </span>
              </div>
            )}
          </div>

          {/* أزرار الإجراء السريع بمتناول اليد مباشرة تحت المعاينة */}
          <div className="pt-2 w-full max-w-sm flex items-center justify-center">
            {isEquipped ? (
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <div className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 py-2.5 px-4 text-xs font-black text-emerald-500 shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>الإطار المرتدى حالياً</span>
                </div>

                {currentFrameId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleEquipFrame(null)}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-500/30 bg-card hover:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-500 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="خلع الإطار والعودة للوضع البسيط"
                  >
                    <CircleOff className="h-4 w-4" />
                    <span>خلع الإطار</span>
                  </button>
                )}
              </div>
            ) : isUnlocked ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleEquipFrame(activeItem.id)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-deep hover:brightness-110 px-6 py-3 text-xs sm:text-sm font-black text-night transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                <span>ارتداء هذا الإطار فورياً 👑</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-muted/40 py-2.5 px-4 text-xs font-bold text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>إطار مقفل بالمستوى</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. شريط التحكم والأدوات: تبديل العرض (شبكة / شريط) + الفلاتر ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* أزرار الفلترة السريعة */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({allOptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("UNLOCKED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "UNLOCKED"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            مفتوحة لي ({allOptions.filter((it) => it.unlocked).length}) 🔓
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("LOCKED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "LOCKED"
                ? "bg-gold text-night shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            مقيدة بالمستوى ({allOptions.filter((it) => !it.unlocked).length}) 🔒
          </button>
        </div>

        {/* زر تبديل طريقة العرض (شبكة للموبايل / شريط متجول) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
          <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-card text-gold shadow-xs border border-gold/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض كل الإطارات في شبكة كاملة"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>شبكة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("carousel")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                viewMode === "carousel"
                  ? "bg-card text-gold shadow-xs border border-gold/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض الإطارات في شريط متحرك"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>شريط</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. العرض الأول: شبكة كاملة مريحة جداً للموبايل (Grid View) ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 pt-1">
          {filteredItems.map((item) => {
            const isEquippedCard = currentFrameId === item.id;
            const isSelectedCard = previewFrameId === item.id;
            const tier = item.rawFrame ? TIER_CONFIG[item.rawFrame.tier] : null;

            return (
              <button
                key={item.id ?? "basic"}
                type="button"
                onClick={() => setPreviewFrameId(item.id)}
                className={`relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer text-center group ${
                  isSelectedCard
                    ? "border-gold bg-gold/15 ring-2 ring-gold/40 shadow-lg scale-[1.02]"
                    : item.unlocked
                    ? "border-border/70 bg-card hover:bg-muted/60 hover:border-gold/40 shadow-xs"
                    : "border-border/40 bg-muted/20 opacity-65 hover:opacity-90"
                }`}
              >
                {/* شارة الارتداء أو القفل */}
                <div className="absolute top-1.5 start-1.5 z-20">
                  {isEquippedCard ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md ring-1 ring-background">
                      ✓
                    </span>
                  ) : !item.unlocked ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-amber-400 text-[10px] border border-amber-500/50 shadow-md">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>

                {/* الأفاتار مع الإطار */}
                <div className="relative my-1 flex items-center justify-center h-14 sm:h-16 w-14 sm:w-16">
                  {item.id === null ? (
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                      <CircleOff className="h-5 w-5" />
                    </div>
                  ) : (
                    <AvatarWithFrame
                      avatarUrl={user.avatarUrl}
                      name={user.fullName}
                      frameId={item.id}
                      framesVisible={true}
                      size="md"
                      level={user.level}
                    />
                  )}
                </div>

                {/* اسم الإطار ومستواه */}
                <div className="w-full space-y-0.5 mt-1">
                  <p className="text-[11px] sm:text-xs font-black text-foreground truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[9px] font-black border ${
                        tier?.badgeCls || "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {item.id === null ? "بدون إطار" : `Lv.${item.requiredLevel}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 4. العرض الثاني: شريط متجول أفقياً مع أسهم تصفح (Carousel View) ── */}
      {viewMode === "carousel" && (
        <div className="relative group">
          {/* سهم التمرير للأمام (جهة اليسار في واجهات RTL) */}
          <button
            type="button"
            onClick={() => scrollCarousel("forward")}
            className="hidden sm:flex absolute -end-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-card/95 border border-border shadow-lg text-foreground hover:text-gold hover:border-gold/50 cursor-pointer"
            aria-label="تمرير للأمام"
            title="تمرير للأمام"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* شريط الكروت */}
          <div
            ref={carouselRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar snap-x touch-pan-x"
          >
            {filteredItems.map((item) => {
              const isEquippedCard = currentFrameId === item.id;
              const isSelectedCard = previewFrameId === item.id;
              const tier = item.rawFrame ? TIER_CONFIG[item.rawFrame.tier] : null;

              return (
                <button
                  key={item.id ?? "basic"}
                  type="button"
                  onClick={() => setPreviewFrameId(item.id)}
                  className={`flex flex-col items-center justify-between shrink-0 w-24 sm:w-28 p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer snap-start text-center ${
                    isSelectedCard
                      ? "border-gold bg-gold/15 ring-2 ring-gold/40 shadow-lg scale-[1.02]"
                      : item.unlocked
                      ? "border-border/70 bg-card hover:bg-muted/60 hover:border-gold/40"
                      : "border-border/40 bg-muted/20 opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="relative my-1 flex items-center justify-center h-14 w-14">
                    {item.id === null ? (
                      <div className="h-11 w-11 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                        <CircleOff className="h-5 w-5" />
                      </div>
                    ) : (
                      <AvatarWithFrame
                        avatarUrl={user.avatarUrl}
                        name={user.fullName}
                        frameId={item.id}
                        framesVisible={true}
                        size="md"
                        level={user.level}
                      />
                    )}

                    {isEquippedCard ? (
                      <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow-md">
                        ✓
                      </span>
                    ) : !item.unlocked ? (
                      <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 text-amber-400 text-[9px] border border-amber-500/50 shadow-md">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </div>

                  <div className="w-full space-y-0.5 mt-1">
                    <p className="text-[11px] font-black text-foreground truncate">
                      {item.name}
                    </p>
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.2 text-[9px] font-black border ${
                        tier?.badgeCls || "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {item.id === null ? "بدون إطار" : `Lv.${item.requiredLevel}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* سهم التمرير للخلف (جهة اليمين في واجهات RTL) */}
          <button
            type="button"
            onClick={() => scrollCarousel("backward")}
            className="hidden sm:flex absolute -start-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-card/95 border border-border shadow-lg text-foreground hover:text-gold hover:border-gold/50 cursor-pointer"
            aria-label="تمرير للخلف"
            title="تمرير للخلف"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
