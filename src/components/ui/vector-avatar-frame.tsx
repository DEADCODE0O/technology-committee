'use client';

import React, { useId } from 'react';

export interface VectorAvatarFrameProps {
  frameId: string;
  className?: string;
}

/**
 * محرك إطارات الصور الرمزية الفيكتور الاحترافي فائق الفخامة والبروز (High-Impact Vector Avatar Frame Engine)
 * - مركز دائري نقي ومفتوح (Radius < 35.5) لا يحجب وجه المستخدم نهائياً
 * - حزام معدني عريض وثقيل (سُمك من 8 إلى 10 وحدات فيكتور) يظهر بوضوح فائق وفخامة لافتة
 * - تدرجات لونية معدنية متعددة المحطات مع ظلال ثلاثية الأبعاد (Drop Shadows) وحواف بارزة (Bevels)
 * - أحجار كريمة، تيجان، أجنحة، ومثبتات صناعية ثلاثية الأبعاد تعطي إحساس ألعاب AAA
 */
export function VectorAvatarFrame({ frameId, className = '' }: VectorAvatarFrameProps) {
  const uid = useId().replace(/[:]/g, '_');

  switch (frameId) {
    // ═══════════════════════════════════════════════════════════════
    // المستوى 1: إطار البداية (Starting Bronze Bezel) — نحاس صناعي مصقول وثقيل
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_1':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`brz1_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="25%" stopColor="#b45309" />
              <stop offset="55%" stopColor="#78350f" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <filter id={`brz1_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#451a03" floodOpacity="0.8" />
            </filter>
          </defs>
          {/* الحزام البرونزي الرئيسي العريض */}
          <circle cx="50" cy="50" r="41" stroke={`url(#brz1_body_${uid})`} strokeWidth="7.5" filter={`url(#brz1_shadow_${uid})`} />
          {/* حافة خارجية مصقولة */}
          <circle cx="50" cy="50" r="45" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.8" />
          {/* حافة داخلية مشطوفة تبرز وجه الأفاتار */}
          <circle cx="50" cy="50" r="37.2" stroke="#451a03" strokeWidth="1.2" strokeOpacity="0.9" />
          {/* 4 براغي نحاسية ضخمة ثلاثية الأبعاد عند الأركان الرئيسية */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="9" r="3.2" fill="#78350f" stroke="#f59e0b" strokeWidth="0.8" />
              <circle cx="49" cy="8.2" r="1.2" fill="#fef08a" />
            </g>
          ))}
          {/* تروس وعلامات تقنية دقيقة بين البراغي */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <rect x="49" y="6.5" width="2" height="3" rx="0.5" fill="#f59e0b" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 2: إطار المبادرة (Silver Cyber Bezel) — كروم فضي بضوء سيان
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_2':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`slv2_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id={`slv2_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284c7" floodOpacity="0.6" />
            </filter>
          </defs>
          {/* حزام الكروم الفضي العريض */}
          <circle cx="50" cy="50" r="41" stroke={`url(#slv2_body_${uid})`} strokeWidth="8" filter={`url(#slv2_shadow_${uid})`} />
          <circle cx="50" cy="50" r="45.2" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.9" />
          <circle cx="50" cy="50" r="36.8" stroke="#0f172a" strokeWidth="1.2" />
          {/* 4 مشابك تقنية سيبرانية زرقاء مضيئة */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <rect x="47" y="5.5" width="6" height="4.5" rx="1.2" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
              <circle cx="50" cy="7.8" r="1.3" fill="#ffffff" />
            </g>
          ))}
          {/* نقاط طاقة سيان عند الـ 45 درجة */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.5" r="1.8" fill="#22d3ee" stroke="#0891b2" strokeWidth="0.6" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 3: إطار المشاركة (Two-Tone Silver & Gold) — فضة وذهب ملكي متداخل
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_3':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`tt3_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <linearGradient id={`tt3_slv_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id={`tt3_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.8" floodColor="#b45309" floodOpacity="0.65" />
            </filter>
          </defs>
          {/* حلقة خارجية ذهبية عريضة */}
          <circle cx="50" cy="50" r="42.5" stroke={`url(#tt3_gold_${uid})`} strokeWidth="5.5" filter={`url(#tt3_shadow_${uid})`} />
          {/* حلقة داخلية فضية مصقولة */}
          <circle cx="50" cy="50" r="38" stroke={`url(#tt3_slv_${uid})`} strokeWidth="4" />
          <circle cx="50" cy="50" r="45.5" stroke="#fef08a" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="36" stroke="#78350f" strokeWidth="1" />
          {/* 4 ماسات ذهبية ثلاثية الأبعاد عند الزوايا */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4.5 53.5,8 50,11.5 46.5,8" fill="#fef08a" stroke="#b45309" strokeWidth="0.8" />
              <polygon points="50,5.5 52.2,8 50,10.5 47.8,8" fill="#ffffff" />
            </g>
          ))}
          {/* أزرار فضية عند المحاور */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8" r="2.2" fill="#ffffff" stroke="#475569" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 4: إطار النشاط (Activity Pure Gold Bezel) — ذهب خالص 24K مضلع
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_4':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`gld4_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#92400e" />
              <stop offset="88%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`gld4_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#ca8a04" floodOpacity="0.75" />
            </filter>
          </defs>
          {/* حزام ذهبي مصمت عريض جداً */}
          <circle cx="50" cy="50" r="41" stroke={`url(#gld4_body_${uid})`} strokeWidth="9" filter={`url(#gld4_shadow_${uid})`} />
          <circle cx="50" cy="50" r="45.8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.95" />
          <circle cx="50" cy="50" r="36.5" stroke="#78350f" strokeWidth="1.2" />
          {/* حفر هندسي داخلي */}
          <circle cx="50" cy="50" r="41" stroke="#fef08a" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
          {/* 8 قباب ذهبية ثلاثية الأبعاد على المحيط */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.2" r="2.6" fill="#fef08a" stroke="#78350f" strokeWidth="0.7" />
              <circle cx="49" cy="7.2" r="0.9" fill="#ffffff" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 5: إطار الإنجاز (Achievement Royal Crest) — درع ذهبي بثمانية أوجه
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_5':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`gld5_crest_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`gld5_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.2" floodColor="#b45309" floodOpacity="0.8" />
            </filter>
          </defs>
          {/* مضلع ثماني هندسي خارجي يمنح الإطار طابع الدروع الملكية */}
          <polygon
            points="50,2.5 83.5,16.5 97.5,50 83.5,83.5 50,97.5 16.5,83.5 2.5,50 16.5,16.5"
            stroke={`url(#gld5_crest_${uid})`}
            strokeWidth="3.2"
            fill="none"
            filter={`url(#gld5_shadow_${uid})`}
          />
          {/* الحزام الدائري الذهبي الصلب */}
          <circle cx="50" cy="50" r="41" stroke={`url(#gld5_crest_${uid})`} strokeWidth="9.2" />
          <circle cx="50" cy="50" r="45.8" stroke="#fef08a" strokeWidth="1" />
          <circle cx="50" cy="50" r="36.4" stroke="#78350f" strokeWidth="1.2" />
          {/* 4 أهرامات ذهبية ثلاثية الأبعاد عند الأركان */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4.2 54,8.5 50,11.5 46,8.5" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
              <polygon points="50,4.2 50,11.5 46,8.5" fill="#ca8a04" />
            </g>
          ))}
          {/* أزرار كروية بالأقطار */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8" r="2.4" fill="#ffffff" stroke="#92400e" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 6: إطار التميز (Cyan Platinum Accelerator) — محرك بلاتيني سيبراني
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_6':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`plt6_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id={`plt6_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#38bdf8" floodOpacity="0.9" />
            </filter>
          </defs>
          {/* حزام بلاتيني عريض مشع */}
          <circle cx="50" cy="50" r="41" stroke={`url(#plt6_body_${uid})`} strokeWidth="9.5" filter={`url(#plt6_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46" stroke="#e0f2fe" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="36.2" stroke="#0369a1" strokeWidth="1.2" />
          {/* قوسي تسارع علوي وسفلي فائقين الفخامة */}
          <path d="M 32 8.5 A 43 43 0 0 1 68 8.5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 32 91.5 A 43 43 0 0 0 68 91.5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* نوى طاقة سيان مشعة في الأقطار */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.2" r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
              <circle cx="50" cy="8.2" r="1.5" fill="#ffffff" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 7: إطار الموهبة (Emerald Royalty) — زمرد ملكي وذهب
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_7':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`emr7_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="30%" stopColor="#10b981" />
              <stop offset="65%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id={`emr7_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id={`emr7_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3.2" floodColor="#10b981" floodOpacity="0.8" />
            </filter>
          </defs>
          {/* حزام الزمرد العريض */}
          <circle cx="50" cy="50" r="41" stroke={`url(#emr7_body_${uid})`} strokeWidth="9.5" filter={`url(#emr7_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46" stroke={`url(#emr7_gold_${uid})`} strokeWidth="1.5" />
          <circle cx="50" cy="50" r="36.2" stroke={`url(#emr7_gold_${uid})`} strokeWidth="1.5" />
          {/* 8 أحجار زمرد كابوشون مصقولة داخل مخالب ذهبية */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.2" r="3" fill="#6ee7b7" stroke="#b45309" strokeWidth="0.8" />
              <circle cx="49" cy="7.2" r="1.1" fill="#ffffff" />
            </g>
          ))}
          {/* قمة التاج الزمردية العلوية */}
          <polygon points="50,2.5 53.5,6.5 50,8 46.5,6.5" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 8: إطار الإبداع (Ruby Sovereign Relic) — ياقوت دموي فخم ومذهب
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_8':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`rby8_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
            <linearGradient id={`rby8_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id={`rby8_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#ef4444" floodOpacity="0.85" />
            </filter>
          </defs>
          {/* حزام الياقوت القرمزي الثقيل */}
          <circle cx="50" cy="50" r="41" stroke={`url(#rby8_body_${uid})`} strokeWidth="10" filter={`url(#rby8_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46.2" stroke={`url(#rby8_gold_${uid})`} strokeWidth="1.5" />
          <circle cx="50" cy="50" r="35.8" stroke={`url(#rby8_gold_${uid})`} strokeWidth="1.5" />
          {/* 4 أحجار ياقوت ماسية بارزة عند المحاور الأربعة مع مخالب ذهبية */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,3 55,8.2 50,13.4 45,8.2" fill="#ef4444" stroke="#fde047" strokeWidth="1" />
              <polygon points="50,4.5 53.5,8.2 50,11.9 46.5,8.2" fill="#fecaca" />
              <circle cx="49" cy="7.2" r="1.2" fill="#ffffff" />
            </g>
          ))}
          {/* أزرار ذهبية عند الزوايا الـ 45 */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.2" r="2.5" fill="#fde047" stroke="#7f1d1d" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 9: إطار القيادة (Monarch Imperial Gold) — ذهب إمبراطوري مع أكاليل الغار
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_9':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`ldr9_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#854d0e" />
              <stop offset="90%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id={`ldr9_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.8" floodColor="#ca8a04" floodOpacity="0.85" />
            </filter>
          </defs>
          {/* حزام ذهب قيادي ملكي فائق السمك */}
          <circle cx="50" cy="50" r="41" stroke={`url(#ldr9_body_${uid})`} strokeWidth="10" filter={`url(#ldr9_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46.5" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.95" />
          <circle cx="50" cy="50" r="35.5" stroke="#78350f" strokeWidth="1.5" />
          {/* أوراق غار إمبراطورية تحيط بالإطار */}
          {[20, 40, 60, 120, 140, 160, 200, 220, 240, 300, 320, 340].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <ellipse cx="50" cy="7.5" rx="3" ry="1.8" fill="#fef08a" stroke="#854d0e" strokeWidth="0.6" />
            </g>
          ))}
          {/* تاج القيادة الإمبراطوري في قمة الإطار */}
          <g transform="translate(50, 4)">
            <polygon points="-6,3 -8,-1.5 -3,0.5 0,-3.5 3,0.5 8,-1.5 6,3" fill="#ffffff" stroke="#854d0e" strokeWidth="0.7" />
            <circle cx="0" cy="-4" r="1.2" fill="#ffd700" stroke="#78350f" strokeWidth="0.5" />
          </g>
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 10: إطار الرواد (Pioneers Sovereign Crown) — كحلي ذهبي متوج
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_10':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`pnr10_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fde047" />
              <stop offset="70%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id={`pnr10_blue_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <filter id={`pnr10_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="4" floodColor="#1e3a8a" floodOpacity="0.9" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="41" stroke={`url(#pnr10_blue_${uid})`} strokeWidth="10.5" filter={`url(#pnr10_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46.5" stroke={`url(#pnr10_gold_${uid})`} strokeWidth="1.8" />
          <circle cx="50" cy="50" r="35.5" stroke={`url(#pnr10_gold_${uid})`} strokeWidth="1.8" />
          {/* تاج الرواد الملكي الذهبي في الأعلى */}
          <g transform="translate(50, 4)">
            <polygon points="-7,3.5 -9,-2 -3.5,0.5 0,-4.5 3.5,0.5 9,-2 7,3.5" fill={`url(#pnr10_gold_${uid})`} stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-5" r="1.4" fill="#ffffff" stroke="#0284c7" strokeWidth="0.5" />
            <circle cx="-9" cy="-2.5" r="1" fill="#ffffff" />
            <circle cx="9" cy="-2.5" r="1" fill="#ffffff" />
          </g>
          {/* 6 ماسات كحلية في الأسفل والجوانب */}
          {[60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4.5 53,8.2 50,12 47,8.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.6" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 11: إطار النخبة (Elite Cosmic Orbit) — ماسي كوني بحلقات مدارية
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_11':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`elt11_body_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="30%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#7c3aed" />
              <stop offset="85%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id={`elt11_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#a855f7" floodOpacity="0.9" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="41" stroke={`url(#elt11_body_${uid})`} strokeWidth="10.5" filter={`url(#elt11_shadow_${uid})`} />
          <circle cx="50" cy="50" r="46.8" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="35.2" stroke="#e879f9" strokeWidth="1.5" />
          {/* نجوم مدارية متألقة عند الأركان */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,2 51.8,6 55.8,6 52.8,8.8 54,12.8 50,10.2 46,12.8 47.2,8.8 44.2,6 48.2,6" fill="#ffffff" stroke="#7c3aed" strokeWidth="0.6" />
              <circle cx="50" cy="8.2" r="1.5" fill="#fde047" />
            </g>
          ))}
          {/* كويكبات سماوية مشعة بالأقطار */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="8.2" r="2.8" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 12: إطار القمة التكنولوجية (Technology Summit Sovereign)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_12':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`smt12_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#ffd700" />
            </linearGradient>
            <linearGradient id={`smt12_dia_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <filter id={`smt12_shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="4.5" floodColor="#f59e0b" floodOpacity="0.9" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="41" stroke={`url(#smt12_gold_${uid})`} strokeWidth="11" filter={`url(#smt12_shadow_${uid})`} />
          <circle cx="50" cy="50" r="47" stroke="#ffffff" strokeWidth="1.8" />
          <circle cx="50" cy="50" r="35" stroke={`url(#smt12_dia_${uid})`} strokeWidth="1.8" />
          {/* التاج الأسمى الملكي ذو الألماسات السبع في القمة */}
          <g transform="translate(50, 3.5)">
            <polygon points="-8,4 -10,-2 -4,0.5 0,-5 4,0.5 10,-2 8,4" fill={`url(#smt12_gold_${uid})`} stroke="#78350f" strokeWidth="0.9" />
            <circle cx="0" cy="-5.5" r="1.6" fill="#ffffff" stroke="#0284c7" strokeWidth="0.6" />
            <circle cx="-10" cy="-2.5" r="1.2" fill="#ffffff" />
            <circle cx="10" cy="-2.5" r="1.2" fill="#ffffff" />
          </g>
          {/* درع شرفي سفلي */}
          <g transform="translate(50, 96.5)">
            <polygon points="0,2.5 5,-1.5 -5,-1.5" fill={`url(#smt12_gold_${uid})`} stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
          </g>
          {/* ألماسات ماسية فاخرة عند الزوايا الـ 45 */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4 53.5,7.5 50,11 46.5,7.5" fill={`url(#smt12_dia_${uid})`} stroke="#0369a1" strokeWidth="0.8" />
              <polygon points="50,5.2 52.2,7.5 50,9.8 47.8,7.5" fill="#ffffff" />
            </g>
          ))}
        </svg>
      );

    default:
      return null;
  }
}
