'use client';

import React, { useId } from 'react';

export interface VectorCharmHeartProps {
  level: number;
  className?: string;
}

/**
 * محرك قلوب ومستويات التفاعل الفيكتور الاحترافي (Vector Charm Heart Engine)
 * - استبدال الصور المتكررة الملونة بتصاميم فيكتور ثلاثية الأبعاد مميزة لكل مستوى
 * - تدرج فني حقيقي في الأشكال والأجنحة الملكية والتيجان من المستوى 0 وحتى المستوى 12
 * - متوافق مع كافة مقاسات العرض (xs, sm, md, lg) وبدقة لا متناهية
 */
export function VectorCharmHeart({ level = 0, className = '' }: VectorCharmHeartProps) {
  const uid = useId().replace(/[:]/g, '_');
  const safeLevel = Math.max(0, Math.min(12, Math.round(level)));

  switch (safeLevel) {
    // ═══════════════════════════════════════════════════════════════
    // المستوى 0: جوهرة الحصى الرمادية النقية (Novice Slate Pebble)
    // ═══════════════════════════════════════════════════════════════
    case 0:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt0_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <filter id={`hrt0_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.4" />
            </filter>
          </defs>
          <g filter={`url(#hrt0_shd_${uid})`}>
            {/* جسم القلب الأملس */}
            <path
              d="M 50 82 C 16 60 16 32 32 20 C 42 12 48 18 50 24 C 52 18 58 12 68 20 C 84 32 84 60 50 82 Z"
              fill={`url(#hrt0_${uid})`}
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* لمعان الوجه الداخلي */}
            <path
              d="M 34 24 C 42 18 47 22 49 26 C 47 38 35 48 26 40 C 24 34 27 28 34 24 Z"
              fill="#ffffff"
              fillOpacity="0.25"
            />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 1: جوهرة الكوارتز الوردي المصقولة (Rose Quartz Gem)
    // ═══════════════════════════════════════════════════════════════
    case 1:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt1_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <filter id={`hrt1_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#ec4899" floodOpacity="0.5" />
            </filter>
          </defs>
          <g filter={`url(#hrt1_shd_${uid})`}>
            <path
              d="M 50 82 C 16 60 16 32 32 20 C 42 12 48 18 50 24 C 52 18 58 12 68 20 C 84 32 84 60 50 82 Z"
              fill={`url(#hrt1_${uid})`}
              stroke="#fbcfe8"
              strokeWidth="1.5"
            />
            {/* أوجه كريستالية ماسية هندسية */}
            <path d="M 50 24 L 35 42 L 50 68 L 65 42 Z" fill="#ffffff" fillOpacity="0.18" />
            <path d="M 32 20 L 35 42 L 50 24 Z" fill="#ffffff" fillOpacity="0.3" />
            <path d="M 68 20 L 65 42 L 50 24 Z" fill="#ffffff" fillOpacity="0.15" />
            <circle cx="38" cy="28" r="2" fill="#ffffff" fillOpacity="0.7" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 2: قلب الياقوت الأحمر المتوهج (Glowing Ruby Core)
    // ═══════════════════════════════════════════════════════════════
    case 2:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt2_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="45%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <filter id={`hrt2_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
          </defs>
          <g filter={`url(#hrt2_shd_${uid})`}>
            {/* طوق ذهبي دقيق يحيط بالقلب */}
            <path
              d="M 50 84 C 14 62 14 30 31 18 C 42 10 48 16 50 22 C 52 16 58 10 69 18 C 86 30 86 62 50 84 Z"
              fill="#fbbf24"
            />
            {/* القلب الياقوتي الرئيسي */}
            <path
              d="M 50 81 C 17 60 17 33 32 21 C 42 13 48 19 50 25 C 52 19 58 13 68 21 C 83 33 83 60 50 81 Z"
              fill={`url(#hrt2_${uid})`}
            />
            {/* انعكاس بريق زجاجي */}
            <path
              d="M 33 24 C 40 18 46 22 49 26 C 46 36 36 44 28 38 C 26 33 28 27 33 24 Z"
              fill="#ffffff"
              fillOpacity="0.35"
            />
            <polygon points="50,45 54,51 50,57 46,51" fill="#fef08a" fillOpacity="0.8" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 3: قلب الكريستال ذو الأجنحة البازغة (Sprouting Winged)
    // ═══════════════════════════════════════════════════════════════
    case 3:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt3_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
            <linearGradient id={`wng3_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`hrt3_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#f43f5e" floodOpacity="0.6" />
            </filter>
          </defs>
          <g filter={`url(#hrt3_shd_${uid})`}>
            {/* زوج أجنحة ذهبي صغير عند جانبي القاعدة */}
            <path d="M 24 50 C 14 44 8 49 4 58 C 12 59 18 56 22 53 Z" fill={`url(#wng3_${uid})`} stroke="#b45309" strokeWidth="0.8" />
            <path d="M 76 50 C 86 44 92 49 96 58 C 88 59 82 56 78 53 Z" fill={`url(#wng3_${uid})`} stroke="#b45309" strokeWidth="0.8" />
            {/* القلب */}
            <path
              d="M 50 80 C 20 60 20 34 33 23 C 42 15 48 20 50 26 C 52 20 58 15 67 23 C 80 34 80 60 50 80 Z"
              fill={`url(#hrt3_${uid})`}
              stroke="#fbcfe8"
              strokeWidth="1.2"
            />
            <path d="M 35 26 C 42 20 47 24 49 28 C 47 38 38 46 30 40 C 28 35 30 29 35 26 Z" fill="#ffffff" fillOpacity="0.32" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 4: قلب الذهب المتوج بالتاج الملكي (Crowned Gold Heart)
    // ═══════════════════════════════════════════════════════════════
    case 4:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt4_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`crw4_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`hrt4_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.65" />
            </filter>
          </defs>
          <g filter={`url(#hrt4_shd_${uid})`}>
            {/* التاج الملكي الصريح أعلى القلب */}
            <g transform="translate(50, 18)">
              <path d="M -12 6 L -9 -3 L -4 1 L 0 -6 L 4 1 L 9 -3 L 12 6 Z" fill={`url(#crw4_${uid})`} stroke="#78350f" strokeWidth="0.8" />
              <circle cx="0" cy="-6.5" r="1.5" fill="#ffffff" />
              <circle cx="-9" cy="-3.5" r="1.2" fill="#ef4444" />
              <circle cx="9" cy="-3.5" r="1.2" fill="#ef4444" />
            </g>
            {/* أجنحة خفيفة */}
            <path d="M 22 54 C 12 48 6 54 2 62 C 10 63 17 60 21 57 Z" fill={`url(#crw4_${uid})`} />
            <path d="M 78 54 C 88 48 94 54 98 62 C 90 63 83 60 79 57 Z" fill={`url(#crw4_${uid})`} />
            {/* قلب الذهب المصقول */}
            <path
              d="M 50 83 C 20 63 20 38 33 27 C 42 20 48 24 50 30 C 52 24 58 20 67 27 C 80 38 80 63 50 83 Z"
              fill={`url(#hrt4_${uid})`}
              stroke="#fef08a"
              strokeWidth="1.2"
            />
            <path d="M 36 30 C 42 25 47 28 49 32 C 47 41 38 48 31 43 C 29 38 31 33 36 30 Z" fill="#ffffff" fillOpacity="0.4" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 5: قلب الكريستال والتاج الزمردي (Emerald Crystal Sovereign)
    // ═══════════════════════════════════════════════════════════════
    case 5:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt5_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#9d174d" />
            </linearGradient>
            <linearGradient id={`gld5_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`hrt5_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#ec4899" floodOpacity="0.65" />
            </filter>
          </defs>
          <g filter={`url(#hrt5_shd_${uid})`}>
            {/* أجنحة ملاك ذهبية حاضنة ومفصلة */}
            <path d="M 22 48 C 10 38 4 45 1 56 C 8 57 15 53 19 49 C 13 55 10 63 8 70 C 15 67 20 60 23 55 Z" fill={`url(#gld5_${uid})`} />
            <path d="M 78 48 C 90 38 96 45 99 56 C 92 57 85 53 81 49 C 87 55 90 63 92 70 C 85 67 80 60 77 55 Z" fill={`url(#gld5_${uid})`} />
            {/* تاج كريستالي زمردي بالأعلى */}
            <g transform="translate(50, 16)">
              <path d="M -11 5 L -8 -3 L -3 1 L 0 -6 L 3 1 L 8 -3 L 11 5 Z" fill={`url(#gld5_${uid})`} stroke="#854d0e" strokeWidth="0.8" />
              <polygon points="0,-6 2,-2 0,0 -2,-2" fill="#34d399" />
              <circle cx="-8" cy="-3.5" r="1.2" fill="#34d399" />
              <circle cx="8" cy="-3.5" r="1.2" fill="#34d399" />
            </g>
            {/* قلب الكريستال الوردي */}
            <path
              d="M 50 82 C 22 62 22 38 34 27 C 42 20 48 24 50 30 C 52 24 58 20 66 27 C 78 38 78 62 50 82 Z"
              fill={`url(#hrt5_${uid})`}
              stroke="#fbcfe8"
              strokeWidth="1.2"
            />
            <path d="M 36 30 C 42 24 47 28 49 32 C 47 41 38 48 31 43 C 29 38 31 33 36 30 Z" fill="#ffffff" fillOpacity="0.38" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 6: قلب الياقوت وفارس الأجنحة الذهبية (Royal Winged Ruby)
    // ═══════════════════════════════════════════════════════════════
    case 6:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt6_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="45%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id={`gld6_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id={`hrt6_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodColor="#dc2626" floodOpacity="0.7" />
            </filter>
          </defs>
          <g filter={`url(#hrt6_shd_${uid})`}>
            {/* أجنحة ملاك ذهبية مفرودة وعريضة */}
            <path d="M 24 46 C 10 32 3 40 0 52 C 8 53 16 48 20 45 C 13 52 9 61 7 70 C 15 66 21 58 24 53 Z" fill={`url(#gld6_${uid})`} stroke="#b45309" strokeWidth="0.8" />
            <path d="M 76 46 C 90 32 97 40 100 52 C 92 53 84 48 80 45 C 87 52 91 61 93 70 C 85 66 79 58 76 53 Z" fill={`url(#gld6_${uid})`} stroke="#b45309" strokeWidth="0.8" />
            {/* تاج العرش الذهبي الملكي */}
            <g transform="translate(50, 15)">
              <path d="M -13 6 L -10 -4 L -4 1 L 0 -7 L 4 1 L 10 -4 L 13 6 Z" fill={`url(#gld6_${uid})`} stroke="#78350f" strokeWidth="0.8" />
              <circle cx="0" cy="-7.5" r="1.5" fill="#ffffff" />
              <circle cx="-10" cy="-4.5" r="1.3" fill="#dc2626" />
              <circle cx="10" cy="-4.5" r="1.3" fill="#dc2626" />
            </g>
            {/* قلب الياقوت */}
            <path
              d="M 50 82 C 22 62 22 38 34 27 C 42 20 48 24 50 30 C 52 24 58 20 66 27 C 78 38 78 62 50 82 Z"
              fill={`url(#hrt6_${uid})`}
              stroke="#fca5a5"
              strokeWidth="1.2"
            />
            <path d="M 36 30 C 42 24 47 28 49 32 C 47 41 38 48 31 43 C 29 38 31 33 36 30 Z" fill="#ffffff" fillOpacity="0.4" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 7: قلب الجمشت الماسي المتلألئ (Radiant Amethyst)
    // ═══════════════════════════════════════════════════════════════
    case 7:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt7_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="40%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#701a75" />
            </linearGradient>
            <linearGradient id={`gld7_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`hrt7_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodColor="#d946ef" floodOpacity="0.75" />
            </filter>
          </defs>
          <g filter={`url(#hrt7_shd_${uid})`}>
            {/* أجنحة ملاك متوهجة */}
            <path d="M 23 44 C 8 28 1 37 -2 50 C 7 51 15 46 19 43 C 12 50 8 60 6 70 C 14 66 20 57 23 52 Z" fill={`url(#gld7_${uid})`} />
            <path d="M 77 44 C 92 28 99 37 102 50 C 93 51 85 46 81 43 C 88 50 92 60 94 70 C 86 66 80 57 77 52 Z" fill={`url(#gld7_${uid})`} />
            {/* تاج جمشت إمبراطوري */}
            <g transform="translate(50, 14)">
              <path d="M -13 6 L -10 -4 L -4 1 L 0 -8 L 4 1 L 10 -4 L 13 6 Z" fill={`url(#gld7_${uid})`} stroke="#701a75" strokeWidth="0.8" />
              <polygon points="0,-8 2.5,-3 0,0 -2.5,-3" fill="#f5d0fe" />
              <circle cx="-10" cy="-4.5" r="1.3" fill="#f5d0fe" />
              <circle cx="10" cy="-4.5" r="1.3" fill="#f5d0fe" />
            </g>
            <path
              d="M 50 83 C 22 63 22 38 34 27 C 42 20 48 24 50 30 C 52 24 58 20 66 27 C 78 38 78 63 50 83 Z"
              fill={`url(#hrt7_${uid})`}
              stroke="#f5d0fe"
              strokeWidth="1.4"
            />
            {/* هالة ماسية في المركز */}
            <polygon points="50,42 56,52 50,62 44,52" fill="#ffffff" fillOpacity="0.4" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 8: قلب الياقوت الأزرق الملكي (Sapphire Monarch)
    // ═══════════════════════════════════════════════════════════════
    case 8:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt8_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="40%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id={`wng8_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`hrt8_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodColor="#0ea5e9" floodOpacity="0.8" />
            </filter>
          </defs>
          <g filter={`url(#hrt8_shd_${uid})`}>
            {/* أجنحة ملكية بأطراف ريشية مضاعفة */}
            <path d="M 23 44 C 7 26 -1 36 -4 48 C 6 49 14 44 19 41 C 11 48 7 57 5 66 C 13 62 19 55 22 50 Z" fill={`url(#wng8_${uid})`} />
            <path d="M 77 44 C 93 26 101 36 104 48 C 94 49 86 44 81 41 C 89 48 93 57 95 66 C 87 62 81 55 78 50 Z" fill={`url(#wng8_${uid})`} />
            {/* تاج ياقوت ملكي خماسي */}
            <g transform="translate(50, 13)">
              <path d="M -14 6 L -11 -5 L -5 1 L 0 -9 L 5 1 L 11 -5 L 14 6 Z" fill={`url(#wng8_${uid})`} stroke="#0369a1" strokeWidth="0.8" />
              <circle cx="0" cy="-9.5" r="1.6" fill="#38bdf8" />
              <circle cx="-11" cy="-5.5" r="1.3" fill="#38bdf8" />
              <circle cx="11" cy="-5.5" r="1.3" fill="#38bdf8" />
            </g>
            <path
              d="M 50 83 C 22 63 22 38 34 27 C 42 20 48 24 50 30 C 52 24 58 20 66 27 C 78 38 78 63 50 83 Z"
              fill={`url(#hrt8_${uid})`}
              stroke="#bae6fd"
              strokeWidth="1.4"
            />
            <path d="M 36 30 C 42 24 47 28 49 32 C 47 41 38 48 31 43 C 29 38 31 33 36 30 Z" fill="#ffffff" fillOpacity="0.45" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 9: قلب الجمشت الإمبراطوري المتلألئ (Imperial Sovereign)
    // ═══════════════════════════════════════════════════════════════
    case 9:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt9_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>
            <linearGradient id={`wng9_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id={`hrt9_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.85" />
            </filter>
          </defs>
          <g filter={`url(#hrt9_shd_${uid})`}>
            {/* أجنحة مزدوجة الطبقات */}
            <path d="M 23 42 C 6 22 -2 33 -5 45 C 5 46 14 41 19 38 C 10 46 6 56 4 66 C 13 62 19 54 22 49 Z" fill={`url(#wng9_${uid})`} />
            <path d="M 26 52 C 16 57 10 65 6 74 C 14 72 20 66 24 61 Z" fill={`url(#wng9_${uid})`} opacity="0.85" />
            <path d="M 77 42 C 94 22 102 33 105 45 C 95 46 86 41 81 38 C 90 46 94 56 96 66 C 87 62 81 54 78 49 Z" fill={`url(#wng9_${uid})`} />
            <path d="M 74 52 C 84 57 90 65 94 74 C 86 72 80 66 76 61 Z" fill={`url(#wng9_${uid})`} opacity="0.85" />
            {/* تاج العرش الإمبراطوري العالي */}
            <g transform="translate(50, 12)">
              <path d="M -15 6 L -12 -6 L -5 1 L 0 -10 L 5 1 L 12 -6 L 15 6 Z" fill={`url(#wng9_${uid})`} stroke="#5b21b6" strokeWidth="0.8" />
              <polygon points="0,-10 3,-4 0,-1 -3,-4" fill="#ffffff" />
              <circle cx="-12" cy="-6.5" r="1.4" fill="#c084fc" />
              <circle cx="12" cy="-6.5" r="1.4" fill="#c084fc" />
            </g>
            <path
              d="M 50 83 C 22 63 22 38 34 27 C 42 20 48 24 50 30 C 52 24 58 20 66 27 C 78 38 78 63 50 83 Z"
              fill={`url(#hrt9_${uid})`}
              stroke="#e9d5ff"
              strokeWidth="1.5"
            />
            <polygon points="50,40 57,51 50,62 43,51" fill="#ffffff" fillOpacity="0.45" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 10: أسطورة التكنولوجيا (الأجنحة المزدوجة الفائقة 4 Wings)
    // ═══════════════════════════════════════════════════════════════
    case 10:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt10_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <linearGradient id={`wng10_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`hrt10_shd_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#f43f5e" floodOpacity="0.9" />
            </filter>
          </defs>
          <g filter={`url(#hrt10_shd_${uid})`}>
            {/* زوج الأجنحة العلوي الأول */}
            <path d="M 22 38 C 4 18 -4 28 -7 42 C 4 43 13 38 18 34 C 8 42 4 52 2 62 C 11 58 17 50 20 45 Z" fill={`url(#wng10_${uid})`} />
            <path d="M 78 38 C 96 18 104 28 107 42 C 96 43 87 38 82 34 C 92 42 96 52 98 62 C 89 58 83 50 80 45 Z" fill={`url(#wng10_${uid})`} />
            {/* زوج الأجنحة السفلي الثاني */}
            <path d="M 25 50 C 14 56 6 66 1 76 C 11 74 18 67 22 61 Z" fill={`url(#wng10_${uid})`} opacity="0.9" />
            <path d="M 75 50 C 86 56 94 66 99 76 C 89 74 82 67 78 61 Z" fill={`url(#wng10_${uid})`} opacity="0.9" />
            {/* تاج العرش الإمبراطوري الأسطوري */}
            <g transform="translate(50, 10)">
              <path d="M -16 7 L -13 -7 L -5 1 L 0 -11 L 5 1 L 13 -7 L 16 7 Z" fill={`url(#wng10_${uid})`} stroke="#9f1239" strokeWidth="0.8" />
              <circle cx="0" cy="-11.5" r="1.8" fill="#ffffff" />
              <circle cx="-13" cy="-7.5" r="1.5" fill="#f43f5e" />
              <circle cx="13" cy="-7.5" r="1.5" fill="#f43f5e" />
            </g>
            {/* القلب القرمزي */}
            <path
              d="M 50 84 C 21 64 21 38 33 27 C 42 20 48 24 50 30 C 52 24 58 20 67 27 C 79 38 79 64 50 84 Z"
              fill={`url(#hrt10_${uid})`}
              stroke="#fecdd3"
              strokeWidth="1.5"
            />
            <polygon points="50,38 58,50 50,62 42,50" fill="#ffffff" fillOpacity="0.5" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 11: النخبة الياقوتية (السفير الكوني وأجنحة السيادة)
    // ═══════════════════════════════════════════════════════════════
    case 11:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt11_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
            <linearGradient id={`wng11_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#7dd3fc" />
              <stop offset="70%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`hrt11_shd_${uid}`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0284c7" floodOpacity="0.95" />
            </filter>
          </defs>
          <g filter={`url(#hrt11_shd_${uid})`}>
            {/* زوجان من الأجنحة السماوية الذهبية */}
            <path d="M 22 36 C 3 14 -5 24 -9 39 C 2 40 12 35 17 31 C 7 40 3 50 1 60 C 10 56 16 48 19 43 Z" fill={`url(#wng11_${uid})`} />
            <path d="M 78 36 C 97 14 105 24 109 39 C 98 40 88 35 83 31 C 93 40 97 50 99 60 C 90 56 84 48 81 43 Z" fill={`url(#wng11_${uid})`} />
            <path d="M 24 48 C 12 54 4 65 -1 76 C 9 74 16 67 21 60 Z" fill={`url(#wng11_${uid})`} />
            <path d="M 76 48 C 88 54 96 65 101 76 C 91 74 84 67 79 60 Z" fill={`url(#wng11_${uid})`} />
            {/* تاج ياقوتي إمبراطوري مرصع بالنجوم */}
            <g transform="translate(50, 9)">
              <path d="M -16 7 L -13 -8 L -5 1 L 0 -12 L 5 1 L 13 -8 L 16 7 Z" fill={`url(#wng11_${uid})`} stroke="#0c4a6e" strokeWidth="0.8" />
              <polygon points="0,-12 3,-6 0,-2 -3,-6" fill="#ffffff" />
              <circle cx="-13" cy="-8.5" r="1.6" fill="#38bdf8" />
              <circle cx="13" cy="-8.5" r="1.6" fill="#38bdf8" />
            </g>
            <path
              d="M 50 84 C 21 64 21 38 33 27 C 42 20 48 24 50 30 C 52 24 58 20 67 27 C 79 38 79 64 50 84 Z"
              fill={`url(#hrt11_${uid})`}
              stroke="#bae6fd"
              strokeWidth="1.6"
            />
            <polygon points="50,38 59,51 50,64 41,51" fill="#ffffff" fillOpacity="0.55" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 12 (القمة القصوى): العرش الإمبراطوري الأسمى (6 Wings Archangel Apex)
    // ═══════════════════════════════════════════════════════════════
    case 12:
    default:
      return (
        <svg viewBox="-12 -12 124 124" overflow="visible" className={`w-full h-full select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`hrt12_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="40%" stopColor="#9333ea" />
              <stop offset="80%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <linearGradient id={`wng12_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <filter id={`hrt12_shd_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#9333ea" floodOpacity="1" />
            </filter>
          </defs>
          <g filter={`url(#hrt12_shd_${uid})`}>
            {/* 3 أزواج مجنحة ملكية فائقة (6 أجنحة ملائكية سيرافيم) */}
            {/* الزوج العلوي 1 */}
            <path d="M 21 34 C 1 10 -7 20 -11 36 C 0 37 11 32 16 28 C 5 37 1 48 -1 58 C 8 54 15 46 18 41 Z" fill={`url(#wng12_${uid})`} />
            <path d="M 79 34 C 99 10 107 20 111 36 C 100 37 89 32 84 28 C 95 37 99 48 101 58 C 92 54 85 46 82 41 Z" fill={`url(#wng12_${uid})`} />
            {/* الزوج الأوسط 2 */}
            <path d="M 23 46 C 9 51 0 62 -5 74 C 5 72 13 65 19 58 Z" fill={`url(#wng12_${uid})`} />
            <path d="M 77 46 C 91 51 100 62 105 74 C 95 72 87 65 81 58 Z" fill={`url(#wng12_${uid})`} />
            {/* الزوج السفلي 3 الحاضن */}
            <path d="M 26 58 C 18 65 11 75 8 85 C 17 81 23 72 26 65 Z" fill={`url(#wng12_${uid})`} opacity="0.85" />
            <path d="M 74 58 C 82 65 89 75 92 85 C 83 81 77 72 74 65 Z" fill={`url(#wng12_${uid})`} opacity="0.85" />
            {/* تاج العرش الإمبراطوري الأسمى العظيم */}
            <g transform="translate(50, 8)">
              <path d="M -18 7 L -14 -9 L -6 1 L 0 -14 L 6 1 L 14 -9 L 18 7 Z" fill={`url(#wng12_${uid})`} stroke="#3b0764" strokeWidth="1" />
              <polygon points="0,-14 3.5,-7 0,-3 -3.5,-7" fill="#ffffff" />
              <circle cx="0" cy="-14.5" r="1.8" fill="#ffffff" />
              <circle cx="-14" cy="-9.5" r="1.6" fill="#fde047" />
              <circle cx="14" cy="-9.5" r="1.6" fill="#fde047" />
            </g>
            {/* قلب العرش الكوني الأرجواني */}
            <path
              d="M 50 85 C 20 64 20 38 32 26 C 42 19 48 23 50 29 C 52 23 58 19 68 26 C 80 38 80 64 50 85 Z"
              fill={`url(#hrt12_${uid})`}
              stroke="#f5d0fe"
              strokeWidth="1.8"
            />
            {/* ماسة الطاقة الكونية في المركز */}
            <polygon points="50,36 60,50 50,64 40,50" fill="#ffffff" fillOpacity="0.6" />
            <circle cx="50" cy="50" r="3" fill="#fde047" />
          </g>
        </svg>
      );
  }
}
