"use client";

// ═══════════════════════════════════════════════════════════════
//  SmartImg — <img> مع بديل تلقائي عند فشل التحميل
//  صور درايف الخاصة/المحذوفة أو الروابط الميتة تظهر البديل
//  الرسمي بدل صورة مكسورة («الصورة بها مشكلة») — تجربة أنظف
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
};

export function SmartImg({ src, alt, className, fallback = "/images/hero-bg.webp" }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <img src={fallback} alt={alt} className={className} loading="lazy" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      decoding="async"
    />
  );
}
