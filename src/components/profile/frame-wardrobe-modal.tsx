"use client";

// ═══════════════════════════════════════════════════════════════
//  خزانة مظهر الطالب — اختيار الأفاتار وإطارات الصور الرمزية VIP
//  تدعم التبديل بين الصور الرمزية وإطارات المستويات والبطولات
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import {
  User,
  CheckCircle2,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
  Lock,
  Palette,
  CircleOff,
  Upload,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { PRESET_AVATARS, getPresetAvatar } from "@/lib/avatars";
import {
  AVATAR_FRAMES,
  getAvatarFrame,
  isFrameUnlocked,
  TIER_CONFIG,
  type FrameCategory,
} from "@/lib/avatar-frames";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { setAvatarUrlAction, equipAvatarFrame, restoreAccountAvatarAction } from "@/actions/profile";

interface AvatarWardrobeModalProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    accountAvatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
    provider?: string;
  };
  triggerClassName?: string;
  framesVisible?: boolean;
}

export function FrameWardrobeModal({
  user,
  triggerClassName,
  framesVisible = true,
}: AvatarWardrobeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"AVATAR" | "FRAMES">("AVATAR");
  const [isPending, startTransition] = useTransition();

  // حالة الصور الرمزية
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? null
  );
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
    user.avatarUrl ?? user.accountAvatarUrl ?? PRESET_AVATARS[0].src
  );
  const [avatarFilter, setAvatarFilter] = useState<"ALL" | "BOY" | "GIRL">("ALL");

  // حالة إطارات الصور الرمزية
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(
    user.avatarFrameId ?? null
  );
  const [frameFilter, setFrameFilter] = useState<"ALL" | FrameCategory>("ALL");

  // حالة رفع صورة مخصصة
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isAvatarEquipped = previewAvatarUrl === currentAvatarUrl;
  const hasAccountPhoto = Boolean(user.accountAvatarUrl || user.provider === "GOOGLE");
  const isAccountPhotoSelected = Boolean(
    user.accountAvatarUrl && previewAvatarUrl === user.accountAvatarUrl
  );
  const isAccountPhotoEquipped = Boolean(
    user.accountAvatarUrl && currentAvatarUrl === user.accountAvatarUrl
  );
  const selectedPreset = getPresetAvatar(previewAvatarUrl);
  const selectedFrame = getAvatarFrame(previewFrameId);
  const isSelectedFrameUnlocked = selectedFrame
    ? isFrameUnlocked(selectedFrame, user.level, true)
    : true;
  const isFrameEquipped = previewFrameId === currentFrameId;

  // استعادة صورة الحساب الأصلية (جوجل) واعتمادها مباشرة
  const handleRestoreAccountAvatar = () => {
    startTransition(async () => {
      const res = await restoreAccountAvatarAction();
      if (res.ok && res.avatarUrl) {
        setCurrentAvatarUrl(res.avatarUrl);
        setPreviewAvatarUrl(res.avatarUrl);
        toast.success("تمت استعادة صورتك الشخصية الأصلية من Google بنجاح! 📸");
      } else {
        toast.error(res.error || "تعذر استعادة صورة الحساب الأصلية");
      }
    });
  };

  // ضغط فوري للصورة على المتصفح إلى WebP بجودة عالية وحجم خفيف (~25-35KB) لحماية خطة Supabase
  const compressImageToWebp = async (file: File, maxSize = 320, quality = 0.82): Promise<File> => {
    return new Promise((resolve) => {
      // إذا كانت الصورة خفيفة جداً وبالفعل بصيغة WebP
      if (file.type === "image/webp" && file.size <= 45 * 1024) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => resolve(file); // تجاوز آمن في حال الخطأ
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(file);
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = maxSize;
            canvas.height = maxSize;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // Center-crop مربع بدون تشويه أبعاد وجه الطالب
            const minDim = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - minDim) / 2;
            const sy = (img.naturalHeight - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressed = new File([blob], "avatar.webp", {
                    type: "image/webp",
                    lastModified: Date.now(),
                  });
                  resolve(compressed);
                } else {
                  resolve(file);
                }
              },
              "image/webp",
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // رفع صورة مخصصة من الجهاز مع الضغط السحابي السريع
  const handleUploadCustomAvatar = async (rawFile: File) => {
    if (!rawFile) return;
    if (rawFile.size > 20 * 1024 * 1024) {
      toast.error("حجم الصورة الأصلي يجب ألا يتجاوز 20 ميجابايت");
      return;
    }
    setIsUploading(true);
    try {
      // ضغط فوري للصورة في جهاز الطالب إلى ~30KB بصيغة WebP الحديثة
      const fileToUpload = await compressImageToWebp(rawFile);

      const formData = new FormData();
      formData.append("file", fileToUpload);
      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "تعذر رفع الصورة");
      }
      setPreviewAvatarUrl(data.url);
      setCurrentAvatarUrl(data.url);
      toast.success(data.message || "تم رفع صورتك الشخصية واعتمادها بنجاح! 📸");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل رفع الصورة الشخصية");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // حفظ الصورة الرمزية
  const handleSaveAvatar = (url: string | null) => {
    startTransition(async () => {
      const res = await setAvatarUrlAction(url);
      if (res.ok) {
        const nextEquipped = url === "INITIALS" ? null : (url || user.accountAvatarUrl || null);
        setCurrentAvatarUrl(nextEquipped);
        if (url && url !== "INITIALS") {
          if (url === user.accountAvatarUrl) {
            toast.success("تم تفعيل صورتك الشخصية الأصلية بنجاح! 📸");
          } else {
            const preset = getPresetAvatar(url);
            toast.success(
              preset
                ? `تم اختيار شخصية «${preset.name}» كصورتك الرمزية بنجاح!`
                : "تم تحديث صورتك الرمزية بنجاح!"
            );
          }
        } else if (url === null) {
          toast.success("تمت استعادة صورة الحساب الأصلية بنجاح! 📸");
        } else {
          toast.success("تمت استعادة الوضع البسيط (الحروف الأولى).");
        }
      } else {
        toast.error(res.error || "تعذر تحديث الصورة الرمزية");
      }
    });
  };

  // حفظ وتجهيز الإطار
  const handleEquipFrame = (fId: string | null) => {
    startTransition(async () => {
      const res = await equipAvatarFrame(fId);
      if (res.ok) {
        setCurrentFrameId(fId);
        if (fId) {
          const frame = getAvatarFrame(fId);
          toast.success(
            frame
              ? `تم تجهيز إطار «${frame.name}» بنجاح! ✨`
              : "تم تجهيز الإطار بنجاح!"
          );
        } else {
          toast.success("تمت إزالة الإطار والعودة للوضع الدائري البسيط.");
        }
      } else {
        toast.error(res.error || "تعذر تجهيز الإطار");
      }
    });
  };

  const filteredAvatars = PRESET_AVATARS.filter((av) => {
    if (avatarFilter === "ALL") return true;
    return av.gender === avatarFilter;
  });

  const filteredFrames = AVATAR_FRAMES.filter((fr) => {
    if (frameFilter === "ALL") return true;
    return fr.category === frameFilter;
  });

  return (
    <>
      {/* زر فتح نافذة التخصيص في صفحة الملف الشخصي */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          "inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-xs font-extrabold text-gold hover:border-gold/60 hover:bg-gold/[0.15] transition-all shadow-sm"
        }
      >
        {framesVisible ? (
          <>
            <Sparkles className="h-4 w-4 text-gold" />
            تخصيص المظهر (الأفاتار والإطارات)
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-gold" />
            تغيير الصورة الرمزية (أفاتار / حسابك)
          </>
        )}
      </button>

      {/* النافذة المنبثقة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
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

            {/* العنوان وتبويبات التنقل العلوية */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pe-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold shadow-sm">
                  {activeTab === "FRAMES" ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Palette className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 id="wardrobe-title" className="text-lg font-extrabold text-foreground sm:text-xl">
                    {activeTab === "FRAMES" ? "إطارات الصور الرمزية VIP" : "تخصيص صورة ملفك الشخصي"}
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground">
                    {activeTab === "FRAMES"
                      ? "اختر من إطاراتك المفتوحة حسب مستواك لتمييز مظهر حسابك."
                      : "يمكنك التبديل بحرية بين صورة حسابك الرسمية أو اختيار شخصية أفاتار معبرة."}
                  </p>
                </div>
              </div>

              {/* أزرار التبديل بين تبويب الصور وتبويب الإطارات (إذا كانت الإطارات مفعلة) */}
              {framesVisible && (
                <div className="flex items-center rounded-2xl border border-border bg-muted/60 p-1 dark:border-white/10 dark:bg-zinc-900/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("AVATAR")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                      activeTab === "AVATAR"
                        ? "bg-gold text-night shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    الصورة والأفاتار
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("FRAMES")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                      activeTab === "FRAMES"
                        ? "bg-gold text-night shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    إطارات الصور الرمزية
                  </button>
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════ */}
            {/* التبويب الأول: اختيار الأفاتار والصور الشخصية           */}
            {/* ═════════════════════════════════════════════════════════ */}
            {activeTab === "AVATAR" && (
              <>
                {/* لوحة المعاينة المباشرة العلوية للأفاتار */}
                <div className="mb-4 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <AvatarWithFrame
                      avatarUrl={previewAvatarUrl}
                      name={user.fullName}
                      frameId={currentFrameId}
                      framesVisible={framesVisible}
                      size="xl"
                      level={user.level}
                      showLevel={false}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-foreground">
                          {isAccountPhotoSelected
                            ? "صورة حسابك الأصلية"
                            : selectedPreset?.name ??
                              (previewAvatarUrl ? "صورتك المخصصة" : "الوضع البسيط (الحروف الأولى)")}
                        </h3>
                        {isAccountPhotoSelected ? (
                          <span className="rounded-full bg-blue-500/15 border border-blue-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                            {user.provider === "GOOGLE" ? "حساب جوجل 🌐" : "صورة الحساب"}
                          </span>
                        ) : selectedPreset ? (
                          <span className="rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-deep dark:text-gold-light">
                            {selectedPreset.gender === "BOY" ? "شاب" : "فتاة"} · {selectedPreset.tag}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-5 max-w-md">
                        {isAccountPhotoSelected
                          ? "صورتك الشخصية الأصلية المأخوذة مباشرة من حسابك."
                          : selectedPreset?.description ??
                            "الصورة المعروضة في حسابك ولدى زملائك بالمنصة."}
                      </p>
                    </div>
                  </div>

                  {/* أزرار الحفظ أو استعادة الافتراضي */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                    {isAvatarEquipped ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-500 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        صورتك الحالية
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending || isUploading}
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

                    {/* زر استعادة صورة الحساب الأصلية */}
                    {hasAccountPhoto && (currentAvatarUrl !== user.accountAvatarUrl || previewAvatarUrl !== user.accountAvatarUrl) && (
                      <button
                        type="button"
                        disabled={isPending || isUploading}
                        onClick={handleRestoreAccountAvatar}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all shadow-sm"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        استعادة صورة حساب Google الأصلية
                      </button>
                    )}

                    {currentAvatarUrl && (
                      <button
                        type="button"
                        disabled={isPending || isUploading}
                        onClick={() => {
                          setPreviewAvatarUrl(null);
                          handleSaveAvatar("INITIALS");
                        }}
                        className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card/60 px-3 py-1 text-[11px] font-bold text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <CircleOff className="h-3 w-3" />
                        الوضع البسيط (الحروف الأولى)
                      </button>
                    )}
                  </div>
                </div>

                {/* خيار صورة الحساب الأصلية (جوجل / حسابك) إن وُجدت */}
                {hasAccountPhoto && (
                  <div
                    onClick={() => {
                      if (user.accountAvatarUrl) {
                        setPreviewAvatarUrl(user.accountAvatarUrl);
                      } else {
                        handleRestoreAccountAvatar();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (user.accountAvatarUrl) {
                          setPreviewAvatarUrl(user.accountAvatarUrl);
                        } else {
                          handleRestoreAccountAvatar();
                        }
                      }
                    }}
                    className={`mb-4 flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                      isAccountPhotoSelected
                        ? "border-gold bg-gold/[0.08] shadow-[0_0_20px_-5px_rgba(201,164,92,0.3)] ring-1 ring-gold/40"
                        : "border-blue-500/25 bg-blue-500/[0.04] hover:border-blue-500/50 hover:bg-blue-500/[0.08] dark:border-blue-500/20 dark:bg-blue-500/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
                      <AvatarWithFrame
                        avatarUrl={user.accountAvatarUrl || currentAvatarUrl}
                        name={user.fullName}
                        frameId={currentFrameId}
                        framesVisible={framesVisible}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                            صورة حسابك الأصلية
                          </h4>
                          <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {user.provider === "GOOGLE" ? "جوجل 🌐" : "صورة الحساب"}
                          </span>
                          {isAccountPhotoSelected && (
                            <span className="rounded-full bg-gold/15 border border-gold/40 px-2 py-0.5 text-[10px] font-extrabold text-gold">
                              المحددة في المعاينة
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          صورتك الشخصية الحقيقية المستوردة عند تسجيل الدخول عبر Google — انقر للاستعادة والاعتماد المباشر
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                      {isAccountPhotoEquipped ? (
                        <div className="flex items-center gap-2">
                          {!isAccountPhotoSelected && user.accountAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewAvatarUrl(user.accountAvatarUrl!)}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
                            >
                              معاينة صورتي
                            </button>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-extrabold text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            مستخدمة حالياً
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isAccountPhotoSelected && user.accountAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewAvatarUrl(user.accountAvatarUrl!)}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card/70 px-3 py-1.5 text-xs font-extrabold text-foreground hover:border-gold/50 transition-all"
                            >
                              معاينة
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isPending || isUploading}
                            onClick={handleRestoreAccountAvatar}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all disabled:opacity-50 shadow-sm"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            استعادة واعتماد صورة حسابي
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* خيار رفع صورة شخصية من الجهاز */}
                <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-3.5 sm:p-4 hover:border-gold/40 hover:bg-gold/[0.02] transition-all dark:border-white/10 dark:bg-white/[0.01]">
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold border border-gold/20">
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-2">
                        رفع صورة مخصصة من جهازك
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        صورة من هاتفك أو حاسوبك (يتم تحسينها وضغطها فائقاً بتقنية WebP السريعة لحماية باقتك وسرعة الموقع)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadCustomAvatar(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={isPending || isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-extrabold text-gold hover:bg-gold/20 transition-all disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Camera className="h-3.5 w-3.5" />
                          اختر صورة للرفع
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* فلاتر تصنيف الشخصيات */}
                <div className="mb-3 flex items-center justify-between border-b border-border/80 pb-2.5 dark:border-white/[0.06]">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "ALL", label: `كافة الأفاتار (${PRESET_AVATARS.length})` },
                      { key: "BOY", label: "شباب 👨‍🎓 (6)" },
                      { key: "GIRL", label: "بنات 👩‍🎓 (6)" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAvatarFilter(tab.key as "ALL" | "BOY" | "GIRL")}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                          avatarFilter === tab.key
                            ? "bg-gold text-night shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* شبكة شخصيات الأفاتار */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-72 py-2">
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
                            frameId={currentFrameId}
                            framesVisible={framesVisible}
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
              </>
            )}

            {/* ═════════════════════════════════════════════════════════ */}
            {/* التبويب الثاني: إطارات الصور الرمزية (VIP Frames)         */}
            {/* ═════════════════════════════════════════════════════════ */}
            {activeTab === "FRAMES" && framesVisible && (
              <>
                {/* لوحة المعاينة المباشرة للإطار المختار */}
                <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/[0.04] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 dark:border-gold/25 dark:bg-gold/[0.03]">
                  <div className="flex items-center gap-4">
                    <AvatarWithFrame
                      avatarUrl={currentAvatarUrl ?? user.accountAvatarUrl}
                      name={user.fullName}
                      frameId={previewFrameId}
                      framesVisible={true}
                      size="xl"
                      level={user.level}
                      showLevel
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="mt-1 text-xs text-muted-foreground leading-5 max-w-md">
                        {selectedFrame
                          ? selectedFrame.description
                          : "الصورة معروضة بحواف دائرية نقية بدون أي إطارات إضافية."}
                      </p>
                      {selectedFrame && !isSelectedFrameUnlocked && (
                        <p className="mt-1 text-[11px] font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {selectedFrame.unlockHint}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* أزرار تجهيز الإطار أو إزالته */}
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
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
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
                        إزالة الإطار (الوضع البسيط)
                      </button>
                    )}
                  </div>
                </div>

                {/* فلاتر تصنيف الإطارات */}
                <div className="mb-3 flex items-center justify-between border-b border-border/80 pb-2.5 dark:border-white/[0.06]">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "ALL", label: `كافة الإطارات (${AVATAR_FRAMES.length})` },
                      { key: "levels", label: "إطارات المستويات 🏆" },
                      { key: "seasonal", label: "المواسم والمناسبات 🌙" },
                      { key: "special", label: "إطارات خاصة VIP ✨" },
                      { key: "achievements", label: "البطولات والجوائز 🥇" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFrameFilter(tab.key as "ALL" | FrameCategory)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                          frameFilter === tab.key
                            ? "bg-gold text-night shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* شبكة الإطارات */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto pe-1 flex-1 max-h-72 py-2">
                  {/* بطاقة الخيار الافتراضي: بدون إطار */}
                  <button
                    type="button"
                    onClick={() => setPreviewFrameId(null)}
                    className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all ${
                      previewFrameId === null
                        ? "border-gold bg-gold/[0.12] shadow-[0_0_20px_-5px_rgba(201,164,92,0.35)]"
                        : "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04] dark:border-white/[0.08] dark:bg-surface dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      {currentFrameId === null ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="my-2 flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-500/40 text-zinc-400">
                      <CircleOff className="h-6 w-6" />
                    </div>

                    <div className="w-full">
                      <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold dark:text-zinc-100">
                        بدون إطار
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground dark:text-zinc-400">
                        الوضع الدائري البسيط
                      </p>
                    </div>
                  </button>

                  {/* بطاقات الإطارات المتاحة */}
                  {filteredFrames.map((frame) => {
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
                            ? "border-gold bg-gold/[0.12] shadow-[0_0_20px_-5px_rgba(201,164,92,0.35)]"
                            : isUnlocked
                            ? "border-border bg-card hover:border-gold/30 hover:bg-gold/[0.04] dark:border-white/[0.08] dark:bg-surface dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                            : "border-white/5 bg-zinc-950/40 opacity-70 hover:opacity-90"
                        }`}
                      >
                        {/* شارة الحالة العلوية (مجهز أو قفل) */}
                        <div className="absolute top-2 right-2 z-10">
                          {isEquipped ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night shadow">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : !isUnlocked ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : null}
                        </div>

                        {/* معاينة الإطار بصورة الأفاتار */}
                        <div className="my-2">
                          <AvatarWithFrame
                            avatarUrl={currentAvatarUrl ?? user.accountAvatarUrl}
                            name={user.fullName}
                            frameId={frame.id}
                            framesVisible={true}
                            size="md"
                          />
                        </div>

                        {/* تفاصيل الإطار */}
                        <div className="w-full">
                          <p className="truncate text-xs font-extrabold text-foreground group-hover:text-gold dark:text-zinc-100">
                            {frame.name}
                          </p>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${
                                tierCfg?.badgeCls || "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {tierCfg?.label || frame.tier}
                            </span>
                            {frame.category === "levels" && (
                              <span className="text-[9px] font-bold text-zinc-400">
                                {isUnlocked ? `مستوى ${frame.requiredLevel} ✓` : `مستوى ${frame.requiredLevel}`}
                              </span>
                            )}
                          </div>
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
