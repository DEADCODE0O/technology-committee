"use client";

// ═══════════════════════════════════════════════════════════════
//  WhatsApp-Style Profile Photo Manager (محرر الصور بنمط واتساب)
//  سلس وسريع وخفيف الوزن، مصمم خصيصاً لتجربة الهواتف الذكية (Bottom Sheet)
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Trash2,
  X,
  Loader2,
  ZoomIn,
  ChevronRight,
  Check,
} from "lucide-react";
import { PRESET_AVATARS, getPresetAvatar } from "@/lib/avatars";
import { setAvatarUrlAction, restoreAccountAvatarAction } from "@/actions/profile";

interface WhatsappAvatarModalProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    accountAvatarUrl?: string | null;
    provider?: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUpdated?: (newUrl: string | null) => void;
}

export function WhatsappAvatarModal({
  user,
  isOpen,
  onOpenChange,
  onAvatarUpdated,
}: WhatsappAvatarModalProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [viewMode, setViewMode] = useState<"MAIN" | "AVATARS" | "ZOOM">("MAIN");
  const [avatarFilter, setAvatarFilter] = useState<"ALL" | "BOY" | "GIRL">("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const hasPhoto = Boolean(currentUrl && currentUrl !== "INITIALS");
  const hasAccountPhoto = Boolean(user.accountAvatarUrl || user.provider === "GOOGLE");

  // ضغط وتجهيز الصورة في المتصفح قبل الرفع
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);

            const maxSize = 512;
            canvas.width = maxSize;
            canvas.height = maxSize;

            // Crop دائري متوازن للوجه في المنتصف
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
              0.85
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

  // رفع الصورة المختارة من الكاميرا أو المعرض
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 20 ميجابايت");
      return;
    }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "تعذر رفع الصورة");
      }

      setCurrentUrl(data.url);
      if (onAvatarUpdated) onAvatarUpdated(data.url);
      toast.success("تم تحديث صورتك الشخصية بنجاح! 📸");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // اختيار شخصية رمزية جاهزة
  const handleSelectPreset = (presetSrc: string) => {
    startTransition(async () => {
      const res = await setAvatarUrlAction(presetSrc);
      if (res.ok) {
        setCurrentUrl(presetSrc);
        if (onAvatarUpdated) onAvatarUpdated(presetSrc);
        const preset = getPresetAvatar(presetSrc);
        toast.success(preset ? `تم اختيار شخصية «${preset.name}» بنجاح!` : "تم تعيين الأفاتار بنجاح!");
        onOpenChange(false);
      } else {
        toast.error(res.error || "تعذر حفظ الأفاتار");
      }
    });
  };

  // استعادة صورة حساب Google الأصلية
  const handleRestoreAccountAvatar = () => {
    startTransition(async () => {
      const res = await restoreAccountAvatarAction();
      if (res.ok && res.avatarUrl) {
        setCurrentUrl(res.avatarUrl);
        if (onAvatarUpdated) onAvatarUpdated(res.avatarUrl);
        toast.success("تمت استعادة صورتك الأصلية من Google بنجاح! 📸");
        onOpenChange(false);
      } else {
        toast.error(res.error || "تعذر استعادة صورة الحساب");
      }
    });
  };

  // حذف الصورة الشخصية والعودة للأحرف الأولى
  const handleDeleteAvatar = () => {
    startTransition(async () => {
      const res = await setAvatarUrlAction("INITIALS");
      if (res.ok) {
        setCurrentUrl(null);
        if (onAvatarUpdated) onAvatarUpdated(null);
        toast.success("تم حذف صورتك الشخصية والعودة للشعار الرمزي");
        onOpenChange(false);
      } else {
        toast.error(res.error || "تعذر حذف الصورة");
      }
    });
  };

  const filteredPresets = PRESET_AVATARS.filter((p) => {
    if (avatarFilter === "ALL") return true;
    return p.gender === avatarFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* خلفية معتمة تتيح النقر للإغلاق */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* مدخلات الكاميرا والمعرض الخفية */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* نافذة المحرر (Bottom Sheet على الموبايل / Centered Modal على الكمبيوتر) */}
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-white/10 bg-[#121b22] text-zinc-100 shadow-2xl transition-all">
        {/* مؤشر السحب للموبايل (Drag handle) */}
        <div className="flex sm:hidden justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* ── 1. وضع المعاينة المكبرة (Zoom Mode) ── */}
        {viewMode === "ZOOM" && (
          <div className="p-6 text-center space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode("MAIN")}
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
                رجوع
              </button>
              <h3 className="text-sm font-bold text-white">معاينة الصورة الحالية</h3>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-3xl border-2 border-gold/40 shadow-2xl bg-black/40">
              {currentUrl && currentUrl !== "INITIALS" ? (
                <Image
                  src={currentUrl}
                  alt={user.fullName}
                  fill
                  className="object-cover"
                  unoptimized={currentUrl.startsWith("http")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gold/15 text-5xl font-black text-gold">
                  {user.fullName.slice(0, 2)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewMode("MAIN")}
              className="w-full rounded-2xl bg-white/10 py-3 text-xs font-bold text-zinc-200 hover:bg-white/15"
            >
              تغيير أو حذف الصورة
            </button>
          </div>
        )}

        {/* ── 2. وضع اختيار الأفاتار الجاهز (Avatar Presets) ── */}
        {viewMode === "AVATARS" && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setViewMode("MAIN")}
                className="flex items-center gap-1 text-xs font-bold text-gold hover:text-gold-light"
              >
                <ChevronRight className="h-4 w-4" />
                رجوع للخيارات
              </button>
              <h3 className="text-sm font-extrabold text-white">اختر شخصية رمزية</h3>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* فلتر أولاد وبنات */}
            <div className="flex rounded-xl bg-white/[0.06] p-1 gap-1">
              {[
                { key: "ALL", label: "الكل" },
                { key: "BOY", label: "شباب" },
                { key: "GIRL", label: "بنات" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setAvatarFilter(f.key as any)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    avatarFilter === f.key
                      ? "bg-gold text-night shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* شبكة الأفاتارات السريعة */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-1">
              {filteredPresets.map((preset) => {
                const isSelected = currentUrl === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.src)}
                    disabled={isPending}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all ${
                      isSelected
                        ? "border-gold bg-gold/20 ring-2 ring-gold/40"
                        : "border-white/10 bg-white/[0.04] hover:border-gold/40 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-black/40">
                      <Image
                        src={preset.src}
                        alt={preset.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-gold">
                          <Check className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-zinc-300 truncate w-full text-center">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. القائمة الرئيسية بنمط واتساب (WhatsApp Profile Photo Menu) ── */}
        {viewMode === "MAIN" && (
          <div className="p-6 space-y-6">
            {/* الرأس */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">صورة الملف الشخصي</h3>
                <p className="text-xs text-zinc-400 mt-0.5">اختر طريقة تحديث أو استعادة صورتك</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* معاينة الصورة الحالية بشكل دائري مع زر معاينة مكبرة */}
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div
                className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-gold/50 bg-black/50 shadow-md group"
                onClick={() => setViewMode("ZOOM")}
                title="اضغط للتكبير"
              >
                {currentUrl && currentUrl !== "INITIALS" ? (
                  <Image
                    src={currentUrl}
                    alt={user.fullName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    unoptimized={currentUrl.startsWith("http")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gold/15 text-lg font-black text-gold">
                    {user.fullName.slice(0, 2)}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <ZoomIn className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {hasPhoto ? "صورة مخصصة مفعّلة" : "الحروف الأولى الافتراضية"}
                </p>
              </div>

              {hasPhoto && (
                <button
                  type="button"
                  onClick={() => setViewMode("ZOOM")}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  معاينة
                </button>
              )}
            </div>

            {/* خيارات واتساب الدائرية الكبيرة (WhatsApp Action Grid) */}
            <div className="grid grid-cols-3 gap-3">
              {/* خيار 1: الكاميرا */}
              <button
                type="button"
                disabled={isUploading || isPending}
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-all hover:border-gold/40 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30 shadow-inner">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-xs font-extrabold text-zinc-200">الكاميرا</span>
              </button>

              {/* خيار 2: المعرض */}
              <button
                type="button"
                disabled={isUploading || isPending}
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-all hover:border-gold/40 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#53bdeb]/20 text-[#53bdeb] border border-[#53bdeb]/30 shadow-inner">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <span className="text-xs font-extrabold text-zinc-200">المعرض</span>
              </button>

              {/* خيار 3: الأفاتار الرمزي */}
              <button
                type="button"
                disabled={isUploading || isPending}
                onClick={() => setViewMode("AVATARS")}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-all hover:border-gold/40 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-gold border border-gold/30 shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span className="text-xs font-extrabold text-zinc-200">شخصية رمزية</span>
              </button>
            </div>

            {/* أزرار العمليات الإضافية (استعادة وحذف) */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              {/* زر استعادة صورة Google */}
              {hasAccountPhoto && (
                <button
                  type="button"
                  disabled={isUploading || isPending}
                  onClick={handleRestoreAccountAvatar}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-zinc-200 hover:bg-white/[0.07] transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <RotateCcw className="h-4 w-4 text-gold" />
                    استعادة صورة حساب Google الأصلية
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">نقرة واحدة</span>
                </button>
              )}

              {/* زر حذف الصورة */}
              {hasPhoto && (
                <button
                  type="button"
                  disabled={isUploading || isPending}
                  onClick={handleDeleteAvatar}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Trash2 className="h-4 w-4" />
                    إزالة الصورة الحالية
                  </span>
                  <span className="text-[10px] text-red-400/70 font-medium">العودة للافتراضي</span>
                </button>
              )}
            </div>

            {/* حالة الرفع الحالية */}
            {(isUploading || isPending) && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-gold/10 p-3 text-xs font-bold text-gold border border-gold/30">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري معالجة وتحديث الصورة...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
