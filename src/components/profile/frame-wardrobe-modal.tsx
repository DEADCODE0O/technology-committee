"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة إطارات التميز والمستويات (VIP Frames Wardrobe)
//  مخصصة حصرياً لإطارات الرتب والمستويات بدون أي تداخل مع الصور
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  X,
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

interface FrameWardrobeModalProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
  };
  triggerClassName?: string;
  framesVisible?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function FrameWardrobeModal({
  user,
  triggerClassName,
  framesVisible = true,
  externalOpen,
  onExternalOpenChange,
  hideTrigger = false,
}: FrameWardrobeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isOpen) : val;
    if (onExternalOpenChange) {
      onExternalOpenChange(nextVal);
    } else {
      setInternalOpen(nextVal);
    }
  };

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

  // تجهيز إطار المستوى
  const handleEquipFrame = (frameId: string | null) => {
    startTransition(async () => {
      const res = await equipAvatarFrame(frameId);
      if (res.ok) {
        setCurrentFrameId(frameId);
        if (frameId) {
          const frame = getAvatarFrame(frameId);
          toast.success(`تم تجهيز إطار «${frame?.name ?? ""}» بنجاح! 👑`);
        } else {
          toast.success("تمت إزالة الإطار والعودة للوضع الدائري البسيط");
        }
        setIsOpen(false);
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            triggerClassName ||
            "inline-flex items-center gap-1.5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-black text-gold hover:bg-gold/20 transition-all shadow-sm"
          }
        >
          <Sparkles className="h-4 w-4 text-gold" />
          <span>خزانة الإطارات 👑</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="frames-wardrobe-title"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-gold/20 bg-card dark:bg-[#0f1015] p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 rounded-xl p-1.5 text-zinc-400 hover:bg-muted hover:text-foreground transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>

            {/* العنوان */}
            <div className="mb-5 flex items-center gap-3 pe-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold shadow-sm border border-gold/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 id="frames-wardrobe-title" className="text-lg font-extrabold text-foreground sm:text-xl">
                  خزانة إطارات التميز والرتب
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إطارات مخصصة تُميزك في المجتمع وتُفتح تلقائياً بارتفاع مستواك ونقاطك (مستواك الحالي: {user.level})
                </p>
              </div>
            </div>

            {/* معاينة الإطار المختار */}
            <div className="mb-5 rounded-2xl border border-gold/30 bg-gold/[0.04] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 dark:border-gold/25 dark:bg-gold/[0.03]">
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
                    <h3 className="text-base font-extrabold text-foreground">
                      {selectedFrame ? selectedFrame.name : "الوضع الدائري البسيط (بدون إطار)"}
                    </h3>
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
                      : "الصورة معروضة بحواف دائرية بسيطة بدون أي إطار إضافي."}
                  </p>
                  {selectedFrame && !isSelectedFrameUnlocked && (
                    <p className="mt-1 text-[11px] font-bold text-amber-500 dark:text-amber-400 flex items-center justify-center sm:justify-start gap-1">
                      <Lock className="h-3 w-3" />
                      {selectedFrame.unlockHint}
                    </p>
                  )}
                </div>
              </div>

              {/* أزرار التجهيز والإلغاء */}
              <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                {isFrameEquipped ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    الإطار المجهز حالياً
                  </div>
                ) : isSelectedFrameUnlocked ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleEquipFrame(previewFrameId)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-xs font-extrabold text-night hover:bg-gold-light transition-all disabled:opacity-50 shadow-md"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    تجهيز هذا الإطار
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-zinc-400">
                    <Lock className="h-3.5 w-3.5" />
                    إطار مغلق لمستواك
                  </div>
                )}

                {currentFrameId && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setPreviewFrameId(null);
                      handleEquipFrame(null);
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <CircleOff className="h-3 w-3" />
                    إزالة الإطار
                  </button>
                )}
              </div>
            </div>

            {/* شبكة الإطارات الـ 12 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-80 py-2 custom-scrollbar">
              {/* خيار: بدون إطار */}
              <button
                type="button"
                onClick={() => setPreviewFrameId(null)}
                className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all ${
                  previewFrameId === null
                    ? "border-gold bg-gold/[0.12] shadow-[0_0_20px_-5px_rgba(201,164,92,0.35)]"
                    : "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04]"
                }`}
              >
                <div className="absolute top-2 right-2 z-10">
                  {currentFrameId === null && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="my-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground">
                  <CircleOff className="h-6 w-6" />
                </div>

                <div className="w-full">
                  <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold">
                    بدون إطار
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                    الوضع البسيط
                  </p>
                </div>
              </button>

              {/* بطاقات الإطارات المتاحة والمغلقة */}
              {AVATAR_FRAMES.map((frame) => {
                const isUnlocked = isFrameUnlocked(frame, user.level, true);
                const isEquipped = currentFrameId === frame.id;
                const isSelected = previewFrameId === frame.id;
                const tierCfg = TIER_CONFIG[frame.tier];

                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => setPreviewFrameId(frame.id)}
                    className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all ${
                      isSelected
                        ? "border-gold bg-gold/[0.12] shadow-[0_0_20px_-5px_rgba(201,164,92,0.35)] ring-1 ring-gold"
                        : isUnlocked
                        ? "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04]"
                        : "border-border/50 bg-muted/20 opacity-70 hover:opacity-90"
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      {isEquipped ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : !isUnlocked ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-amber-400">
                          <Lock className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>

                    <div className="my-2">
                      <AvatarWithFrame
                        name={user.fullName}
                        avatarUrl={user.avatarUrl}
                        frameId={frame.id}
                        framesVisible={true}
                        size="md"
                      />
                    </div>

                    <div className="w-full">
                      <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold">
                        {frame.name}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-black border ${
                          tierCfg?.badgeCls || "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {tierCfg?.label || frame.tier}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
