"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة إطارات التميز والمستويات — تصميم محمول فائق السلاسة (Mobile-First)
//  شريط تمرير أفقي بنمط قصص انستجرام وفلاتر واتساب — بدون أي تعقيد رأسي
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
  compact?: boolean;
}

export function FrameWardrobeInline({
  user,
  onFrameChanged,
  className = "",
  compact = false,
}: FrameWardrobeInlineProps) {
  const [isPending, startTransition] = useTransition();
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );

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

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* ── 1. بطاقة المعاينة والإجراء السريعة (شريط مدمج وخفيف جداً على الموبايل) ── */}
      <div className="rounded-2xl border border-gold/30 bg-gold/[0.04] p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
        {/* المعاينة والتفاصيل */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <AvatarWithFrame
              avatarUrl={user.avatarUrl}
              name={user.fullName}
              frameId={previewFrameId}
              framesVisible={true}
              size="md"
              level={user.level}
              showLevel
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                {selectedFrame ? selectedFrame.name : "الوضع البسيط"}
              </span>
              {selectedFrame && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[9px] font-black border shrink-0 ${
                    TIER_CONFIG[selectedFrame.tier]?.badgeCls || "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  Lvl {selectedFrame.requiredLevel}
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {selectedFrame ? selectedFrame.description : "صورة دائرية نقية بدون إطارات."}
            </p>

            {selectedFrame && !isSelectedFrameUnlocked && (
              <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-0.5">
                <Lock className="h-3 w-3 shrink-0" />
                <span>{selectedFrame.unlockHint}</span>
              </p>
            )}
          </div>
        </div>

        {/* أزرار الإجراء السريعة */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isFrameEquipped ? (
            <div className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">مُرتدى</span>
            </div>
          ) : isSelectedFrameUnlocked ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleEquipFrame(previewFrameId)}
              className="flex items-center gap-1 rounded-xl bg-gold px-3 py-1.5 text-xs font-black text-night hover:bg-gold/90 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>ارتداء</span>
            </button>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
              🔒 مغلق
            </span>
          )}

          {currentFrameId && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleEquipFrame(null)}
              className="p-1.5 rounded-xl border border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-all"
              title="إزالة الإطار والعودة للوضع البسيط"
            >
              <CircleOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. شريط التمرير الأفقي السلس للإطارات (مثل ستوري انستجرام وفلاتر الكاميرا) ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5 text-[11px] font-bold text-muted-foreground">
          <span>مرر بإصبعك أفقيًا لاختيار الإطار:</span>
          <span>مستواك: {user.level}</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 custom-scrollbar snap-x touch-pan-x">
          {/* خيار بدون إطار */}
          <button
            type="button"
            onClick={() => setPreviewFrameId(null)}
            className={`flex flex-col items-center shrink-0 p-1.5 rounded-2xl transition-all cursor-pointer snap-start focus:outline-none ${
              previewFrameId === null
                ? "ring-2 ring-gold bg-gold/10 scale-105"
                : "border border-border/60 bg-card/60 hover:bg-muted/40"
            }`}
          >
            <div className="relative h-12 w-12 flex items-center justify-center rounded-xl bg-muted/30">
              <CircleOff className="h-6 w-6 text-muted-foreground" />
              {currentFrameId === null && (
                <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow">
                  ✓
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-foreground mt-1">بسيط</span>
          </button>

          {/* دوائر الإطارات الأفقية */}
          {AVATAR_FRAMES.map((frame) => {
            const unlocked = isFrameUnlocked(frame, user.level, true);
            const isEquipped = currentFrameId === frame.id;
            const isPreviewed = previewFrameId === frame.id;

            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => setPreviewFrameId(frame.id)}
                className={`flex flex-col items-center shrink-0 p-1.5 rounded-2xl transition-all cursor-pointer snap-start focus:outline-none ${
                  isPreviewed
                    ? "ring-2 ring-gold bg-gold/10 scale-105"
                    : unlocked
                    ? "border border-border/60 bg-card/60 hover:bg-muted/40"
                    : "border border-border/30 bg-muted/15 opacity-60"
                }`}
                title={`${frame.name} (المستوى ${frame.requiredLevel})`}
              >
                <div className="relative h-12 w-12 flex items-center justify-center">
                  <AvatarWithFrame
                    avatarUrl={user.avatarUrl}
                    name={user.fullName}
                    frameId={frame.id}
                    framesVisible={true}
                    size="sm"
                    level={user.level}
                  />

                  {/* شارة القفل أو الارتداء */}
                  {isEquipped ? (
                    <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black shadow">
                      ✓
                    </span>
                  ) : !unlocked ? (
                    <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 text-[9px] border border-zinc-700 shadow">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>

                <span className="text-[10px] font-bold text-foreground mt-1 max-w-[56px] truncate text-center">
                  {frame.name.replace("إطار ", "")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
