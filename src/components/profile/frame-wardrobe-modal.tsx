"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  User,
  CheckCircle2,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { PRESET_AVATARS, getPresetAvatar, type PresetAvatar } from "@/lib/avatars";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { setAvatarUrlAction } from "@/actions/profile";

interface AvatarWardrobeModalProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
  };
  triggerClassName?: string;
}

export function FrameWardrobeModal({ user, triggerClassName }: AvatarWardrobeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // حالة الصور الرمزية
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? null
  );
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? PRESET_AVATARS[0].src
  );
  const [avatarFilter, setAvatarFilter] = useState<"ALL" | "BOY" | "GIRL">("ALL");

  const isAvatarEquipped = previewAvatarUrl === currentAvatarUrl;
  const selectedPreset = getPresetAvatar(previewAvatarUrl);

  const handleSaveAvatar = (url: string | null) => {
    startTransition(async () => {
      const res = await setAvatarUrlAction(url);
      if (res.ok) {
        setCurrentAvatarUrl(url);
        if (url) {
          const preset = getPresetAvatar(url);
          toast.success(
            preset
              ? `تم اختيار شخصية «${preset.name}» كصورتك الرمزية بنجاح!`
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

  const filteredAvatars = PRESET_AVATARS.filter((av) => {
    if (avatarFilter === "ALL") return true;
    return av.gender === avatarFilter;
  });

  return (
    <>
      {/* زر فتح نافذة اختيار الأفاتار في صفحة الملف الشخصي */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          "inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-xs font-extrabold text-gold hover:border-gold/60 hover:bg-gold/[0.15] transition-all shadow-sm"
        }
      >
        <User className="h-4 w-4 text-gold" />
        اختيار صورة رمزية (أفاتار)
      </button>

      {/* النافذة المنبثقة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-title"
        >
          <div className="relative w-full max-w-3xl rounded-3xl border border-border/80 bg-card dark:bg-[#0f1015] p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] flex flex-col">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 id="wardrobe-title" className="text-lg font-extrabold text-foreground sm:text-xl">
                  اختيار صورتك الرمزية (الأفاتار)
                </h2>
                <p className="text-xs font-bold text-muted-foreground">
                  اختر الشخصية الأقرب إليك لتمثيلك في المنصة والأنشطة الطلابية.
                </p>
              </div>
            </div>

            {/* ── لوحة المعاينة المباشرة العلوية ── */}
            <div className="mb-5 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <AvatarWithFrame
                  avatarUrl={previewAvatarUrl}
                  name={user.fullName}
                  size="xl"
                  level={user.level}
                  showLevel={false}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-foreground">
                      {selectedPreset?.name ?? "صورتك الحالية"}
                    </h3>
                    {selectedPreset && (
                      <span className="rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-deep dark:text-gold-light">
                        {selectedPreset.gender === "BOY" ? "شاب" : "فتاة"} · {selectedPreset.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-5 max-w-md">
                    {selectedPreset?.description ?? "صورتك المخصصة المعروضة في حسابك ولدى زملائك."}
                  </p>
                </div>
              </div>

              {/* أزرار الحفظ أو استعادة الافتراضي */}
              <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                {isAvatarEquipped ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    صورتك الحالية
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
                    اعتماد هذه الصورة
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
                    className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    إزالة الصورة واستعادة الحروف
                  </button>
                )}
              </div>
            </div>

            {/* ── فلاتر التصنيف ── */}
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border/80 pb-2.5 dark:border-white/[0.06]">
              {[
                { key: "ALL", label: `كافة الشخصيات (${PRESET_AVATARS.length})` },
                { key: "BOY", label: "شباب 👨‍🎓 (6)" },
                { key: "GIRL", label: "بنات 👩‍🎓 (6)" },
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

            {/* ── شبكة الشخصيات ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-80 py-2">
              {filteredAvatars.map((av) => {
                const isEquipped = currentAvatarUrl === av.src;
                const isSelected = previewAvatarUrl === av.src;

                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setPreviewAvatarUrl(av.src)}
                    className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all ${
                      isSelected
                        ? "border-gold bg-gold/[0.12] shadow-[0_0_20px_-5px_rgba(201,164,92,0.35)]"
                        : "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04] dark:border-white/[0.08] dark:bg-surface dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      {isEquipped ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="my-2">
                      <AvatarWithFrame
                        name={av.name}
                        avatarUrl={av.src}
                        size="md"
                      />
                    </div>

                    <div className="w-full">
                      <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold dark:text-zinc-100">
                        {av.name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground dark:text-zinc-400">
                        {av.tag}
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
