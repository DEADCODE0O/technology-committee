"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  Crown,
  ShieldAlert,
  Loader2,
  Layers,
} from "lucide-react";
import {
  AVATAR_FRAMES,
  TIER_CONFIG,
  isFrameUnlocked,
  getAvatarFrame,
  type AvatarFrame,
  type FrameTier,
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
}

export function FrameWardrobeModal({ user }: FrameWardrobeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(
    user.avatarFrameId ?? "frame_lvl_1"
  );
  const [filterTier, setFilterTier] = useState<string>("ALL");

  const previewFrame = getAvatarFrame(previewFrameId);
  const isPreviewUnlocked = previewFrame
    ? isFrameUnlocked(previewFrame, user.level, true)
    : true;
  const isPreviewEquipped = previewFrameId === currentFrameId;

  const handleEquip = (frameId: string | null) => {
    startTransition(async () => {
      const res = await equipAvatarFrame(frameId);
      if (res.ok) {
        setCurrentFrameId(frameId);
        const name = frameId ? getAvatarFrame(frameId)?.name : "الافتراضي";
        toast.success(`تم تجهيز إطار «${name}» بنجاح!`);
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  const filteredFrames = AVATAR_FRAMES.filter((f) => {
    if (filterTier === "ALL") return true;
    if (filterTier === "LEVELS") return f.category === "levels";
    if (filterTier === "SPECIAL") return f.category !== "levels";
    return true;
  });

  return (
    <>
      {/* زر فتح الخزانة في واجهة الحساب */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.1] px-4 py-2.5 text-xs font-extrabold text-gold-light hover:border-gold/60 hover:bg-gold/[0.18] transition-all shadow-sm"
      >
        <Sparkles className="h-4 w-4 text-gold" />
        خزانة الإطارات الملكية ثلاثية الأبعاد
      </button>

      {/* النافذة المنبثقة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-title"
        >
          <div className="relative w-full max-w-4xl rounded-3xl border border-border/80 bg-card dark:bg-[#0d0d12] p-5 sm:p-7 shadow-2xl dark:shadow-[0_0_50px_-10px_rgba(201,164,92,0.3)] my-auto max-h-[90vh] flex flex-col">
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>

            {/* العنوان */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/20 text-gold-light">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h2 id="wardrobe-title" className="text-lg font-extrabold text-zinc-50 sm:text-xl">
                  خزانة الإطارات والمستويات
                </h2>
                <p className="text-xs font-bold text-zinc-400">
                  مستواك الحالي: <span className="text-gold-light">المستوى {user.level}</span> ({user.points} نقطة) — كلما تقدمت فتحت إطارات أكثر هيبة!
                </p>
              </div>
            </div>

            {/* ── لوحة المعاينة المباشرة العلوية ── */}
            <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <AvatarWithFrame
                  avatarUrl={user.avatarUrl}
                  name={user.fullName}
                  frameId={previewFrameId}
                  size="xl"
                  level={user.level}
                  showLevel
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-zinc-100">
                      {previewFrame?.name ?? "الإطار الافتراضي"}
                    </h3>
                    {previewFrame && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                          TIER_CONFIG[previewFrame.tier].badgeCls
                        }`}
                      >
                        {TIER_CONFIG[previewFrame.tier].label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-5 max-w-md">
                    {previewFrame?.description ?? "بدون أي إطار مضاف."}
                  </p>
                  <p className="mt-1.5 text-[11px] font-bold text-zinc-500">
                    {previewFrame?.unlockHint}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
                {isPreviewEquipped ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleEquip(null)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-extrabold text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    إلغاء تجهيز الإطار
                  </button>
                ) : isPreviewUnlocked ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleEquip(previewFrameId)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-xs font-extrabold text-night hover:bg-gold-light transition-all disabled:opacity-50 shadow-md"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    تجهيز هذا الإطار
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-500">
                    <Lock className="h-3.5 w-3.5" />
                    الإطار مغلق حالياً
                  </div>
                )}
              </div>
            </div>

            {/* ── فلاتر التصنيفات ── */}
            <div className="mb-4 flex flex-wrap gap-1.5 border-b border-white/[0.06] pb-3">
              {[
                { key: "ALL", label: `كافة الإطارات (${AVATAR_FRAMES.length})` },
                { key: "LEVELS", label: "إطارات المستويات (1 - 10)" },
                { key: "SPECIAL", label: "المواسم والبطولات" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTier(tab.key)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filterTier === tab.key
                      ? "bg-gold text-night"
                      : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── شبكة الإطارات ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pr-1 flex-1 max-h-96 py-2">
              {filteredFrames.map((frame) => {
                const unlocked = isFrameUnlocked(frame, user.level, true);
                const isEquipped = currentFrameId === frame.id;
                const isSelected = previewFrameId === frame.id;

                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => setPreviewFrameId(frame.id)}
                    className={`group relative flex flex-col items-center justify-between rounded-2xl border p-4 text-center transition-all overflow-visible ${
                      isSelected
                        ? "border-gold bg-gold/[0.12] shadow-[0_0_25px_-5px_rgba(201,164,92,0.45)]"
                        : unlocked
                        ? "border-white/[0.08] bg-surface hover:border-white/20 hover:bg-white/[0.04]"
                        : "border-white/[0.04] bg-white/[0.01] opacity-60 hover:opacity-85"
                    }`}
                  >
                    {/* شارة التجهيز أو القفل */}
                    <div className="absolute top-2 right-2 z-20">
                      {isEquipped ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : !unlocked ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                          <Lock className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>

                    {/* عرض الأفاتار بالإطار المصغر */}
                    <div className="my-2">
                      <AvatarWithFrame
                        name={user.fullName}
                        avatarUrl={user.avatarUrl}
                        frameId={frame.id}
                        size="md"
                      />
                    </div>

                    <div className="w-full">
                      <p className="truncate text-xs font-extrabold text-zinc-100 group-hover:text-gold-light">
                        {frame.name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-zinc-500">
                        {frame.category === "levels"
                          ? `المستوى ${frame.requiredLevel}`
                          : TIER_CONFIG[frame.tier].label}
                      </p>
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
