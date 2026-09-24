"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { ImagePreviewModal } from "@/components/admin/image-preview-modal";

export function ImagePreviewButton({
  src,
  alt = "عرض الصورة",
  title = "فحص وتكبير الصورة بالكامل",
  label = "عرض البوستر كاملًا",
  className = "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-night/80 px-3 py-1.5 text-xs font-bold text-zinc-100 backdrop-blur-md transition-all hover:border-gold/50 hover:bg-night hover:text-gold-light shadow-lg cursor-pointer",
}: {
  src: string | null | undefined;
  alt?: string;
  title?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
        title={title}
      >
        <Maximize2 className="h-3.5 w-3.5 text-gold-light shrink-0" />
        <span>{label}</span>
      </button>

      <ImagePreviewModal
        src={src}
        alt={alt}
        title={title}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
