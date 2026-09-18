'use client';

import React from 'react';
import { getCharmTier } from '@/lib/charm-hearts';

export interface VectorCharmHeartProps {
  level: number;
  className?: string;
}

/**
 * محرك قلوب ومستويات التفاعل ثلاثية الأبعاد الاحترافي (3D Game Asset Charm Heart)
 * أصول حصرية عالية الدقة تم إنشاؤها عبر Nano Banana Pro ومعالجتها كـ WebP شفاف فائق الخفة
 */
export function VectorCharmHeart({ level = 0, className = '' }: VectorCharmHeartProps) {
  const safeLevel = Math.max(0, Math.min(12, Math.round(level)));
  const tier = getCharmTier(safeLevel);

  return (
    <div className={`relative inline-flex items-center justify-center w-full h-full select-none ${className}`}>
      <img
        src={`/images/hearts/lit_heart_${safeLevel}.webp`}
        alt={tier.title}
        width={128}
        height={128}
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-110"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}

