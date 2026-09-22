"use client";

// ═══════════════════════════════════════════════════════════════
//  الصورة الشخصية التفاعلية — رفع طبيعي ومباشر بدون أي نوافذ منبثقة
//  النقر على الكاميرا يفتح ملفات/كاميرا الجهاز مباشرة وسلس بنقرة واحدة
//  وزر الإطارات يفتح الخزانة كقسم مدمج ومباشر في الصفحة بدون أي شاشات معتمة
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Camera, Sparkles, RotateCcw, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { FrameWardrobeInline } from "./frame-wardrobe-inline";
import { restoreAccountAvatarAction, setAvatarUrlAction } from "@/actions/profile";

interface ProfileAvatarInteractiveProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    accountAvatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
    provider: string;
  };
  framesVisible?: boolean;
}

export function ProfileAvatarInteractive({
  user,
  framesVisible = true,
}: ProfileAvatarInteractiveProps) {
  const [showInlineFrames, setShowInlineFrames] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(user.avatarFrameId ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhoto = Boolean(currentAvatarUrl && currentAvatarUrl !== "INITIALS");
  const hasAccountPhoto = Boolean(user.accountAvatarUrl || user.provider === "GOOGLE");

  // ضغط خفيف وسريع في المتصفح بصيغة WebP
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

  // رفع الصورة مباشرة عند اختيارها من الهاتف أو الكمبيوتر
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setCurrentAvatarUrl(data.url);
      toast.success("تم تحديث صورتك الشخصية بنجاح! 📸");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // استعادة صورة Google الأصلية بنقرة واحدة
  const handleRestoreAccountAvatar = () => {
    startTransition(async () => {
      const res = await restoreAccountAvatarAction();
      if (res.ok && res.avatarUrl) {
        setCurrentAvatarUrl(res.avatarUrl);
        toast.success("تمت استعادة صورتك الشخصية الأصلية من Google بنجاح! 📸");
      } else {
        toast.error(res.error || "تعذر استعادة صورة الحساب");
      }
    });
  };

  // إزالة الصورة الحالية
  const handleDeleteAvatar = () => {
    startTransition(async () => {
      const res = await setAvatarUrlAction("INITIALS");
      if (res.ok) {
        setCurrentAvatarUrl(null);
        toast.success("تمت إزالة صورتك الشخصية والعودة للشعار البسيط");
      } else {
        toast.error(res.error || "تعذر إزالة الصورة");
      }
    });
  };

  return (
    <div className="flex flex-col items-center sm:items-start gap-3 w-full">
      {/* المدخل المخفي لفتح المعرض/الكاميرا مباشرة بدون أي نوافذ منبثقة */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── 1. الصورة الشخصية مع أيقونة الكاميرا (النقر يفتح اختيار الصورة مباشرة) ── */}
      <div className="relative inline-block">
        <button
          type="button"
          disabled={isUploading || isPending}
          onClick={() => fileInputRef.current?.click()}
          className="relative group focus:outline-none rounded-full cursor-pointer transition-all hover:ring-4 hover:ring-gold/35 hover:scale-[1.03] disabled:opacity-50"
          title="انقر لتغيير صورتك الشخصية مباشرة من جهازك"
          aria-label="تغيير الصورة الشخصية"
        >
          <AvatarWithFrame
            avatarUrl={currentAvatarUrl}
            name={user.fullName}
            frameId={currentFrameId}
            framesVisible={framesVisible}
            size="2xl"
            level={user.level}
            showLevel
          />

          {/* شارة الكاميرا السريعة */}
          <span
            className="absolute bottom-1 end-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#121b22] text-gold border-2 border-gold/70 shadow-2xl transition-all group-hover:scale-110 group-hover:bg-gold group-hover:text-night"
            title="انقر لاختيار صورة جديدة من جهازك"
          >
            {isUploading || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </span>
        </button>
      </div>

      {/* ── 2. أزرار التحكم الطبيعية أسفل الصورة (بدون أي نوافذ منبثقة) ── */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
        {/* زر تغيير الصورة المباشر */}
        <button
          type="button"
          disabled={isUploading || isPending}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 hover:bg-muted px-3 py-1 text-[11px] font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
          title="اختر صورة جديدة من جهازك"
        >
          <Camera className="h-3 w-3 text-gold" />
          <span>تغيير الصورة</span>
        </button>

        {/* زر استعادة صورة Google بنقرة واحدة */}
        {hasAccountPhoto && (
          <button
            type="button"
            disabled={isUploading || isPending}
            onClick={handleRestoreAccountAvatar}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 hover:bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-gold transition-all cursor-pointer"
            title="استعادة صورتك الأصلية من Google"
          >
            <RotateCcw className="h-3 w-3 text-gold" />
            <span>صورة Google</span>
          </button>
        )}

        {/* زر حذف الصورة */}
        {hasPhoto && (
          <button
            type="button"
            disabled={isUploading || isPending}
            onClick={handleDeleteAvatar}
            className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-500 transition-all cursor-pointer"
            title="إزالة الصورة والعودة للشعار البسيط"
          >
            <Trash2 className="h-3 w-3" />
            <span>إزالة</span>
          </button>
        )}

        {/* زر إظهار/إخفاء خزانة الإطارات بشكل مدمج في الصفحة */}
        {framesVisible && (
          <button
            type="button"
            onClick={() => setShowInlineFrames((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black transition-all shadow-sm active:scale-95 cursor-pointer ${
              showInlineFrames
                ? "bg-gold text-night border border-gold"
                : "border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold"
            }`}
            title="إظهار/إخفاء خزانة إطارات التميز للمستويات"
          >
            <Sparkles className="h-3 w-3" />
            <span>{currentFrameId ? "تغيير الإطار 👑" : "إطار التميز 👑"}</span>
            {showInlineFrames ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* ── 3. خزانة الإطارات المدمجة مباشرة داخل الصفحة (بدون أي نافذة منبثقة أو شاشة معتمة) ── */}
      {framesVisible && showInlineFrames && (
        <div className="w-full mt-4 rounded-3xl border border-gold/35 bg-card/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
            <span className="text-sm font-black text-gold flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> خزانة إطارات التميز والرتب الملكية 👑
            </span>
            <button
              type="button"
              onClick={() => setShowInlineFrames(false)}
              className="rounded-xl px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer border border-border/60"
            >
              ✕ إغلاق الخزانة
            </button>
          </div>
          <FrameWardrobeInline
            user={{
              fullName: user.fullName,
              avatarUrl: currentAvatarUrl,
              avatarFrameId: currentFrameId,
              level: user.level,
              points: user.points,
            }}
            onFrameChanged={(newId) => setCurrentFrameId(newId)}
          />
        </div>
      )}
    </div>
  );
}
