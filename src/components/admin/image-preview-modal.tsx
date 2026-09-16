"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Maximize2,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { resolveImageSrc } from "@/lib/links";

export type ImagePreviewModalProps = {
  src: string | null;
  alt?: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * نافذة فحص الصور وتكبيرها وتحميلها للوحة التحكم
 * - تكبير حتى 500% وتصغير حتى 50%
 * - سحب وتحريك الصورة (Pan) عند التكبير
 * - تدوير بزاوية 90 درجة
 * - تحميل مباشر على الجهاز بجودة الملف الكاملة
 * - تفاعل بعجلة الماوس والنقر المزدوج واختصارات لوحة المفاتيح
 */
export function ImagePreviewModal({
  src,
  alt = "معاينة الصورة",
  title = "معاينة وفحص الصورة",
  isOpen,
  onClose,
}: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // إعادة ضبط الحالة عند فتح نافذة جديدة أو تغيير الصورة
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImgLoaded(false);
      setLoadError(false);
    }
  }, [isOpen, src]);

  // إغلاق بمفتاح Escape واختصارات التكبير
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(5, Number((s + 0.25).toFixed(2))));
      } else if (e.key === "-") {
        setScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))));
      } else if (e.key === "0") {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // منع سحب المتصفح الافتراضي للصفحة أثناء التكبير
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => {
      const next = Math.min(5, Math.max(0.5, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // تحكم الفأرة بالسحب
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // نقر مزدوج للتكبير/الإلغاء
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  // وظيفة التحميل المباشر للصور
  const handleDownload = async () => {
    if (!src) return;
    setDownloading(true);
    try {
      const resolved = resolveImageSrc(src) || src;
      // محاولة الجلب كـ Blob أولاً لحفظ الملف محلياً مباشرة
      const response = await fetch(resolved);
      if (!response.ok) throw new Error("فشل الجلب المباشر");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // استخراج امتداد أو اسم مناسب
      let ext = "png";
      if (blob.type.includes("jpeg") || blob.type.includes("jpg")) ext = "jpg";
      else if (blob.type.includes("webp")) ext = "webp";
      else if (blob.type.includes("gif")) ext = "gif";

      const cleanTitle = (title || "image")
        .replace(/[^a-zA-Z0-9\u0621-\u064A_-]/g, "_")
        .slice(0, 30);
      const filename = `${cleanTitle}_${Date.now()}.${ext}`;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // بديل احتياطي: التوجيه عبر بروكسي التحميل
      const fallbackUrl = `/api/img?u=${encodeURIComponent(src)}&download=1`;
      const link = document.createElement("a");
      link.href = fallbackUrl;
      link.download = "image.jpg";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !src) return null;

  const displaySrc = resolveImageSrc(src) || src;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-between bg-black/90 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === containerRef.current || e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* شريط الإجراءات العلوي */}
      <div className="z-10 flex w-full max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/[0.1] text-gold">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs sm:text-sm font-extrabold text-zinc-100">{title}</p>
            <p className="text-[10px] text-zinc-400">انقر نقراً مزدوجاً أو استخدم العجلة للتكبير</p>
          </div>
        </div>

        {/* أزرار التحكم بالصورة */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* مؤشر التكبير */}
          <span className="hidden sm:inline-block rounded-lg bg-white/[0.05] px-2 py-1 text-center font-mono text-[11px] font-bold text-gold-light min-w-[50px]">
            {Math.round(scale * 100)}%
          </span>

          {/* تصغير */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
            disabled={scale <= 0.5}
            title="تصغير (-)"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-gold/40 hover:bg-gold/[0.1] hover:text-gold-light disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* إعادة ضبط */}
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
              setRotation(0);
            }}
            title="إعادة ضبط الحجم (100%)"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-gold/40 hover:bg-gold/[0.1] hover:text-gold-light"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* تكبير */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(5, Number((s + 0.25).toFixed(2))))}
            disabled={scale >= 5}
            title="تكبير (+)"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-gold/40 hover:bg-gold/[0.1] hover:text-gold-light disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* تدوير 90 درجة */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="تدوير 90°"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-gold/40 hover:bg-gold/[0.1] hover:text-gold-light"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <span className="mx-1 h-5 w-[1px] bg-white/10" />

          {/* فتح الرابط الأصلي */}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="فتح الرابط المباشر في علامة تبويب جديدة"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-gold/40 hover:bg-gold/[0.1] hover:text-gold-light"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* تحميل الصورة */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/[0.15] px-3 text-xs font-black text-gold-light transition-all hover:bg-gold hover:text-night disabled:opacity-50"
            title="تحميل الصورة على جهازك"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>تحميل</span>
          </button>

          {/* إغلاق */}
          <button
            type="button"
            onClick={onClose}
            title="إغلاق (Esc)"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/25"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* مساحة عرض الصورة */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`relative flex flex-1 w-full items-center justify-center overflow-hidden p-2 select-none ${
          scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
      >
        {!imgLoaded && !loadError && (
          <div className="absolute flex flex-col items-center gap-2 text-gold-light">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-bold">جاري تحميل الصورة...</span>
          </div>
        )}

        {loadError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center text-red-300">
            <p className="text-sm font-bold">تعذر تحميل الصورة</p>
            <p className="mt-1 text-xs text-zinc-400">قد يكون الرابط خاصاً أو غير متاح</p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> فتح الرابط الأصلي
            </a>
          </div>
        ) : (
          <img
            src={displaySrc}
            alt={alt}
            onLoad={() => setImgLoaded(true)}
            onError={() => setLoadError(true)}
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
              maxHeight: "85vh",
              maxWidth: "92vw",
            }}
            className="rounded-xl object-contain shadow-2xl transition-opacity duration-300"
          />
        )}
      </div>

      {/* تذييل النافذة */}
      <div className="z-10 flex items-center justify-center gap-3 text-[11px] text-zinc-400">
        <span>عجلة الفأرة للتكبير/التصغير</span>
        <span>·</span>
        <span>اسحب للتحريك عند التكبير</span>
        <span>·</span>
        <span>Esc للإغلاق</span>
      </div>
    </div>
  );
}

/**
 * مكون مصغر للصورة قابل للنقر لفتح نافذة الفحص والتكبير والتحميل
 */
export function ImageWithPreview({
  src,
  alt = "صورة",
  title,
  className = "relative group overflow-hidden rounded-2xl border border-white/10 cursor-pointer",
  imgClassName = "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
}: {
  src: string | null | undefined;
  alt?: string;
  title?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!src) return null;
  const displaySrc = resolveImageSrc(src) || src;

  return (
    <>
      <div
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="انقر لفحص وتكبير وتحميل الصورة"
      >
        <img src={displaySrc} alt={alt} className={imgClassName} />
        {/* طبقة تفاعلية عند المرور */}
        <div className="absolute inset-0 flex items-center justify-center bg-night/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-night/80 px-3 py-1.5 text-xs font-black text-gold-light shadow-lg">
            <Maximize2 className="h-3.5 w-3.5" /> تكبير وتحميل
          </span>
        </div>
      </div>

      <ImagePreviewModal
        src={src}
        alt={alt}
        title={title || alt}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
