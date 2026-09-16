"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  Crown,
  Loader2,
  User,
  Layers,
  Palette,
  RotateCcw,
} from "lucide-react";
import {
  AVATAR_FRAMES,
  TIER_CONFIG,
  isFrameUnlocked,
  getAvatarFrame,
  type AvatarFrame,
  type FrameTier,
} from "@/lib/avatar-frames";
import { PRESET_AVATARS, getPresetAvatar, type PresetAvatar } from "@/lib/avatars";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { equipAvatarFrame, setAvatarUrlAction } from "@/actions/profile";

interface FrameWardrobeModalProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
  };
  triggerClassName?: string;
}

export function FrameWardrobeModal({ user, triggerClassName }: FrameWardrobeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // التبويب النشط: الإطارات أو الصور الرمزية
  const [activeTab, setActiveTab] = useState<"FRAMES" | "AVATARS">("FRAMES");

  // حالة الإطارات
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(
    user.avatarFrameId ?? "frame_lvl_1"
  );
  const [filterTier, setFilterTier] = useState<string>("ALL");

  // حالة الصور الرمزية (أفاتار)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? null
  );
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? PRESET_AVATARS[0].src
  );
  const [avatarFilter, setAvatarFilter] = useState<"ALL" | "BOY" | "GIRL">("ALL");

  const previewFrame = getAvatarFrame(previewFrameId);
  const isPreviewUnlocked = previewFrame
    ? isFrameUnlocked(previewFrame, user.level, true)
    : true;
  const isPreviewEquipped = previewFrameId === currentFrameId;

  const isAvatarEquipped = previewAvatarUrl === currentAvatarUrl;
  const selectedPreset = getPresetAvatar(previewAvatarUrl);

  const handleEquipFrame = (frameId: string | null) => {
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

  const handleSaveAvatar = (url: string | null) => {
    startTransition(async () => {
      const res = await setAvatarUrlAction(url);
      if (res.ok) {
        setCurrentAvatarUrl(url);
        if (url) {
          const preset = getPresetAvatar(url);
          toast.success(
            preset
              ? `تم اعتماد أفاتار «${preset.name}» بنجاح!`
              : "تم تحديث صورتك الرمزية بنجاح!"
          );
        } else {
          toast.success("تمت استعادة الصورة الافتراضية (الحروف الأولى).");
        }
      } else {
        toast.error(res.error || "تعذر تحديث الصورة الرمزية");
      }
    });
  };

  const filteredFrames = AVATAR_FRAMES.filter((f) => {
    if (filterTier === "ALL") return true;
    if (filterTier === "LEVELS") return f.category === "levels";
    if (filterTier === "SPECIAL") return f.category !== "levels";
    return true;
  });

  const filteredAvatars = PRESET_AVATARS.filter((av) => {
    if (avatarFilter === "ALL") return true;
    return av.gender === avatarFilter;
  });

  return (
    <>
      {/* زر فتح الخزانة في واجهة الحساب */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          "inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.1] px-4 py-2.5 text-xs font-extrabold text-gold-light hover:border-gold/60 hover:bg-gold/[0.18] transition-all shadow-sm"
        }
      >
        <Sparkles className="h-4 w-4 text-gold" />
        خزانة المظهر والإطارات الملكية
      </button>

      {/* النافذة المنبثقة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-title"
        >
          <div className="relative w-full max-w-4xl rounded-3xl border border-border/80 bg-card dark:bg-[#0d0d12] p-5 sm:p-7 shadow-2xl dark:shadow-[0_0_50px_-10px_rgba(201,164,92,0.3)] my-auto max-h-[92vh] flex flex-col">
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>

            {/* العنوان وتبديل الأقسام الرئيسية */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pe-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/20 text-gold-light">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="wardrobe-title" className="text-lg font-extrabold text-foreground dark:text-zinc-50 sm:text-xl">
                    خزانة المظهر والإطارات الملكية
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground dark:text-zinc-400">
                    مستواك: <span className="text-gold-light font-extrabold">المستوى {user.level}</span> ({user.points} نقطة) — اختر مظهرك وأبرز هيبتك في المنصة!
                  </p>
                </div>
              </div>

              {/* التبديل بين قسم الإطارات وقسم الأفاتار */}
              <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/50 p-1 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setActiveTab("FRAMES")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                    activeTab === "FRAMES"
                      ? "bg-gold text-night shadow-sm"
                      : "text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  الإطارات ({AVATAR_FRAMES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("AVATARS")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                    activeTab === "AVATARS"
                      ? "bg-gold text-night shadow-sm"
                      : "text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  الأفاتار ({PRESET_AVATARS.length})
                </button>
              </div>
            </div>

            {/* ── لوحة المعاينة المباشرة العلوية ── */}
            <div className="mb-4 rounded-2xl border border-border/80 bg-muted/30 dark:border-white/[0.08] dark:bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <AvatarWithFrame
                  avatarUrl={previewAvatarUrl}
                  name={user.fullName}
                  frameId={previewFrameId}
                  size="xl"
                  level={user.level}
                  showLevel
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-foreground dark:text-zinc-100">
                      {activeTab === "FRAMES"
                        ? previewFrame?.name ?? "الإطار الافتراضي"
                        : selectedPreset?.name ?? "الصورة المحددة"}
                    </h3>
                    {activeTab === "FRAMES" && previewFrame && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                          TIER_CONFIG[previewFrame.tier].badgeCls
                        }`}
                      >
                        {TIER_CONFIG[previewFrame.tier].label}
                      </span>
                    )}
                    {activeTab === "AVATARS" && selectedPreset && (
                      <span className="rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-light">
                        {selectedPreset.gender === "BOY" ? "شباب" : "بنات"} · {selectedPreset.roleHint}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400 leading-5 max-w-md">
                    {activeTab === "FRAMES"
                      ? previewFrame?.description ?? "عرض صورتك بدون أي إطار مضاف."
                      : selectedPreset?.description ?? "صورتك المخصصة المعروضة في المنصة."}
                  </p>
                  {activeTab === "FRAMES" && (
                    <p className="mt-1.5 text-[11px] font-bold text-gold-deep dark:text-gold/80">
                      {previewFrame?.unlockHint}
                    </p>
                  )}
                </div>
              </div>

              {/* أزرار الحفظ والتجهيز حسب التبويب النشط */}
              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                {activeTab === "FRAMES" ? (
                  isPreviewEquipped ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEquipFrame(null)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-extrabold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      إلغاء تجهيز الإطار
                    </button>
                  ) : isPreviewUnlocked ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEquipFrame(previewFrameId)}
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
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      الإطار مغلق حالياً
                    </div>
                  )
                ) : (
                  /* أزرار قسم الأفاتار */
                  <div className="flex flex-col gap-2">
                    {isAvatarEquipped ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-extrabold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        هذا هو أفاتارك الحالي
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSaveAvatar(previewAvatarUrl)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-xs font-extrabold text-night hover:bg-gold-light transition-all disabled:opacity-50 shadow-md"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        اعتماد هذا الأفاتار
                      </button>
                    )}
                    {currentAvatarUrl && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setPreviewAvatarUrl(null);
                          handleSaveAvatar(null);
                        }}
                        className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        استعادة الافتراضي (الحروف)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── المحتوى السفلي: الإطارات أو الأفاتار ── */}
            {activeTab === "FRAMES" ? (
              <>
                {/* فلاتر الإطارات */}
                <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border/80 dark:border-white/[0.06] pb-2.5">
                  {[
                    { key: "ALL", label: `كافة الإطارات (${AVATAR_FRAMES.length})` },
                    { key: "LEVELS", label: "إطارات المستويات (1 - 10)" },
                    { key: "SPECIAL", label: "المواسم والبطولات الحصرية" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterTier(tab.key)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        filterTier === tab.key
                          ? "bg-gold text-night"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* شبكة الإطارات */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-80 py-2">
                  {filteredFrames.map((frame) => {
                    const unlocked = isFrameUnlocked(frame, user.level, true);
                    const isEquipped = currentFrameId === frame.id;
                    const isSelected = previewFrameId === frame.id;

                    return (
                      <button
                        key={frame.id}
                        type="button"
                        onClick={() => setPreviewFrameId(frame.id)}
                        className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all overflow-visible ${
                          isSelected
                            ? "border-gold bg-gold/[0.12] shadow-[0_0_25px_-5px_rgba(201,164,92,0.45)]"
                            : unlocked
                            ? "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04] dark:border-white/[0.08] dark:bg-surface dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                            : "border-border/60 bg-muted/20 opacity-60 hover:opacity-85 dark:border-white/[0.04] dark:bg-white/[0.01]"
                        }`}
                      >
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

                        <div className="my-2">
                          <AvatarWithFrame
                            name={user.fullName}
                            avatarUrl={previewAvatarUrl}
                            frameId={frame.id}
                            size="md"
                          />
                        </div>

                        <div className="w-full">
                          <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold-light dark:text-zinc-100">
                            {frame.name}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold text-muted-foreground dark:text-zinc-500">
                            {frame.category === "levels"
                              ? `المستوى ${frame.requiredLevel}`
                              : TIER_CONFIG[frame.tier].label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── شبكة الأفاتار (Avatar Selection) ── */
              <>
                {/* فلاتر الأفاتار */}
                <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border/80 dark:border-white/[0.06] pb-2.5">
                  {[
                    { key: "ALL", label: `كافة الشخصيات (${PRESET_AVATARS.length})` },
                    { key: "BOY", label: "شباب 👨‍💻 (6)" },
                    { key: "GIRL", label: "بنات 👩‍💻 (6)" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setAvatarFilter(tab.key as "ALL" | "BOY" | "GIRL")}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                        avatarFilter === tab.key
                          ? "bg-gold text-night"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* شبكة الأفاتار */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-80 py-2">
                  {filteredAvatars.map((av) => {
                    const isEquipped = currentAvatarUrl === av.src;
                    const isSelected = previewAvatarUrl === av.src;

                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setPreviewAvatarUrl(av.src)}
                        className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all overflow-visible ${
                          isSelected
                            ? "border-gold bg-gold/[0.12] shadow-[0_0_25px_-5px_rgba(201,164,92,0.45)]"
                            : "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04] dark:border-white/[0.08] dark:bg-surface dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="absolute top-2 right-2 z-20">
                          {isEquipped ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>

                        {/* صورة الأفاتار بالإطار المختار في المعاينة */}
                        <div className="my-2">
                          <AvatarWithFrame
                            name={av.name}
                            avatarUrl={av.src}
                            frameId={previewFrameId}
                            size="md"
                          />
                        </div>

                        <div className="w-full">
                          <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold-light dark:text-zinc-100">
                            {av.name}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold text-gold-deep dark:text-gold/70">
                            {av.roleHint}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
