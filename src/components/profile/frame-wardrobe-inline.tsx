"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة إطارات التميز والمستويات — عرض طبيعي ومباشر داخل الصفحة
//  بدون أي نوافذ منبثقة أو شاشات معتمة — تفاعل فوري وسلس
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Lock,
  CircleOff,
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
  const [filter, setFilter] = useState<"ALL" | "UNLOCKED" | "LEVELS">("ALL");

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
          toast.success(`تم تجهيز إطار «${frame?.name ?? ""}» بنجاح! 👑`);
        } else {
          toast.success("تمت إزالة الإطار والعودة للوضع الدائري البسيط");
        }
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  const filteredFrames = AVATAR_FRAMES.filter((frame) => {
    if (filter === "UNLOCKED") {
      return isFrameUnlocked(frame, user.level, true);
    }
    return true;
  });

  return (
    <div className={`space-y-5 ${className}`}>
      {/* ── العنوان والشرح ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              خزانة إطارات التميز والرتب
              <span className="text-[11px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/30">
                مستواك: {user.level}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              إطارات هندسية راقية تُميز صورتك في المجتمع والشات وتُفتح بارتفاع مستواك.
            </p>
          </div>
        </div>

        {/* فلاتر العرض السريعة */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === "ALL"
                ? "bg-gold text-night font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({AVATAR_FRAMES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNLOCKED")}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === "UNLOCKED"
                ? "bg-gold text-night font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            المتاحة لك
          </button>
        </div>
      </div>

      {/* ── بطاقة المعاينة التفاعلية المباشرة ── */}
      <div className="rounded-2xl border border-gold/30 bg-gold/[0.04] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 dark:border-gold/25 dark:bg-gold/[0.03]">
        <div className="flex items-center gap-4 text-center sm:text-start flex-col sm:flex-row">
          <AvatarWithFrame
            avatarUrl={user.avatarUrl}
            name={user.fullName}
            frameId={previewFrameId}
            framesVisible={true}
            size="xl"
            level={user.level}
            showLevel
          />
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-base font-black text-foreground">
                {selectedFrame ? selectedFrame.name : "الوضع الدائري البسيط (بدون إطار)"}
              </h4>
              {selectedFrame && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                    TIER_CONFIG[selectedFrame.tier]?.badgeCls || "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {TIER_CONFIG[selectedFrame.tier]?.label || selectedFrame.tier}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-5 max-w-sm">
              {selectedFrame
                ? selectedFrame.description
                : "صورتك معروضة بحواف دائرية بسيطة بدون أي إطار إضافي."}
            </p>
            {selectedFrame && !isSelectedFrameUnlocked && (
              <p className="mt-1.5 text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center justify-center sm:justify-start gap-1">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {selectedFrame.unlockHint}
              </p>
            )}
          </div>
        </div>

        {/* أزرار التجهيز والإلغاء المباشرة */}
        <div className="flex flex-row sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 justify-center">
          {isFrameEquipped ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-500 dark:text-emerald-400 shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
              <span>مُرتدى حالياً ✓</span>
            </div>
          ) : isSelectedFrameUnlocked ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleEquipFrame(previewFrameId)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2 text-xs font-black text-night hover:bg-gold/90 transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>ارتداء هذا الإطار</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-bold text-muted-foreground cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>يتطلب المستوى {selectedFrame?.requiredLevel}</span>
            </button>
          )}

          {currentFrameId && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleEquipFrame(null)}
              className="flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
              title="إلغاء الإطار والعودة للوضع الدائري البسيط"
            >
              <CircleOff className="h-3.5 w-3.5" />
              <span>إزالة الإطار</span>
            </button>
          )}
        </div>
      </div>

      {/* ── شبكة الإطارات الطبيعية المباشرة ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">
          انقر على أي إطار لمعاينته وارتدائه فوراً:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto custom-scrollbar p-1">
          {/* خيار بدون إطار */}
          <button
            type="button"
            onClick={() => setPreviewFrameId(null)}
            className={`group relative flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all cursor-pointer ${
              previewFrameId === null
                ? "border-gold bg-gold/10 ring-2 ring-gold/40 shadow-sm"
                : "border-border bg-card/60 hover:border-border/80 hover:bg-muted/40"
            }`}
          >
            <div className="relative mb-2">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                name={user.fullName}
                frameId={null}
                framesVisible={false}
                size="md"
                level={user.level}
              />
              {currentFrameId === null && (
                <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow">
                  ✓
                </span>
              )}
            </div>
            <span className="text-xs font-extrabold text-foreground">بدون إطار</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">الوضع الدائري البسيط</span>
          </button>

          {/* قائمة جميع إطارات المستويات */}
          {filteredFrames.map((frame) => {
            const unlocked = isFrameUnlocked(frame, user.level, true);
            const isEquipped = currentFrameId === frame.id;
            const isPreviewed = previewFrameId === frame.id;
            const tierStyle = TIER_CONFIG[frame.tier] || {
              badgeCls: "bg-zinc-800 text-zinc-300",
              label: frame.tier,
            };

            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => setPreviewFrameId(frame.id)}
                className={`group relative flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all cursor-pointer ${
                  isPreviewed
                    ? "border-gold bg-gold/10 ring-2 ring-gold/40 shadow-sm"
                    : unlocked
                    ? "border-border bg-card/60 hover:border-gold/50 hover:bg-muted/40"
                    : "border-border/40 bg-muted/15 opacity-65 hover:opacity-90"
                }`}
              >
                {/* شارة المستوى المطلوب */}
                <span
                  className={`absolute top-2 start-2 rounded-full px-1.5 py-0.5 text-[9px] font-black border ${tierStyle.badgeCls}`}
                >
                  Lvl {frame.requiredLevel}
                </span>

                {/* مؤشر القفل أو التجهيز */}
                {isEquipped ? (
                  <span className="absolute top-2 end-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow" title="مُرتدى حالياً">
                    ✓
                  </span>
                ) : !unlocked ? (
                  <span className="absolute top-2 end-2 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-[10px]" title={frame.unlockHint}>
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                ) : null}

                {/* المعاينة المصغرة */}
                <div className="relative my-2">
                  <AvatarWithFrame
                    avatarUrl={user.avatarUrl}
                    name={user.fullName}
                    frameId={frame.id}
                    framesVisible={true}
                    size="md"
                    level={user.level}
                  />
                </div>

                <span className="text-xs font-extrabold text-foreground line-clamp-1">
                  {frame.name}
                </span>

                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {unlocked ? tierStyle.label : `يتطلب مستوى ${frame.requiredLevel}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
