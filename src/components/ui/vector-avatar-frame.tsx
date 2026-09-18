'use client';

import React, { useId } from 'react';

export interface VectorAvatarFrameProps {
  frameId: string;
  className?: string;
}

/**
 * محرك إطارات الصور الرمزية الفيكتور الاحترافي (Vector Avatar Frame Engine)
 * - مركز دائري نقي ومفتوح 100% لا يحجب وجه المستخدم نهائياً
 * - إطارات فيكتور فائقة النقاء والدقة لا تبهت مع التكبير
 * - أبعاد هندسية محكمة داخل نطاق (viewBox 0 0 100 100) تمنع أي اقتصاص خارجي (No clipping / overflow)
 * - تدرج فني حقيقي من البساطة الهادئة للمبتدئين وحتى الفخامة الملكية للقمة (المستوى 12)
 */
export function VectorAvatarFrame({ frameId, className = '' }: VectorAvatarFrameProps) {
  const uid = useId().replace(/[:]/g, '_');

  switch (frameId) {
    // ═══════════════════════════════════════════════════════════════
    // المستوى 1: إطار البداية (Starting Bronze Ring) — بسيط وناعم
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_1':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`brz1_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <filter id={`brz1_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#d97706" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* حلقة برونزية أساسية ناعمة تطوق الأفاتار */}
          <circle cx="50" cy="50" r="46" stroke={`url(#brz1_${uid})`} strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 2" />
          <circle cx="50" cy="50" r="44" stroke={`url(#brz1_${uid})`} strokeWidth="1.8" filter={`url(#brz1_glow_${uid})`} />
          {/* نقاط ارتكاز برونزية مصقولة ناعمة */}
          <circle cx="50" cy="6" r="1.5" fill="#f59e0b" />
          <circle cx="50" cy="94" r="1.5" fill="#f59e0b" />
          <circle cx="6" cy="50" r="1.5" fill="#f59e0b" />
          <circle cx="94" cy="50" r="1.5" fill="#f59e0b" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 2: إطار المبادرة (Initiative Silver Bezel) — فضي تقني ناعم
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_2':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`slv2_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id={`slv2_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#94a3b8" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#slv2_${uid})`} strokeWidth="0.8" strokeOpacity="0.5" />
          <circle cx="50" cy="50" r="44" stroke={`url(#slv2_${uid})`} strokeWidth="2" strokeDasharray="14 3 4 3" filter={`url(#slv2_glow_${uid})`} />
          {/* مؤشرات فضية دقيقة */}
          <rect x="48.5" y="4.5" width="3" height="2" rx="0.8" fill="#ffffff" />
          <rect x="48.5" y="93.5" width="3" height="2" rx="0.8" fill="#ffffff" />
          <rect x="4.5" y="48.5" width="2" height="3" rx="0.8" fill="#ffffff" />
          <rect x="93.5" y="48.5" width="2" height="3" rx="0.8" fill="#ffffff" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 3: إطار المشاركة (Participation Two-Tone) — فضي بلمسات ذهب
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_3':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`slv3_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id={`gld3_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" stroke={`url(#gld3_${uid})`} strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="44" stroke={`url(#slv3_${uid})`} strokeWidth="2.2" />
          {/* أربع ماسات رقيقة عند الزوايا الـ 45 */}
          {[45, 135, 225, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <polygon
                key={deg}
                points={`${x},${y - 2.5} ${x + 2.5},${y} ${x},${y + 2.5} ${x - 2.5},${y}`}
                fill="#fde047"
                stroke="#b45309"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 4: إطار النشاط (Activity Pure Gold Ring) — ذهبي مزدوج نقي
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_4':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`gld4_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <filter id={`gld4_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#eab308" floodOpacity="0.5" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#gld4_${uid})`} strokeWidth="1" strokeOpacity="0.7" />
          <circle cx="50" cy="50" r="43.8" stroke={`url(#gld4_${uid})`} strokeWidth="2" filter={`url(#gld4_glow_${uid})`} />
          {/* خطوط تكنولوجية رقيقة للأركان */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <line x1="50" y1="3.5" x2="50" y2="7.5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 5: إطار الإنجاز (Achievement Faceted Gold) — ذهبي بهندسة دقيقة
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_5':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`gld5_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <filter id={`gld5_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#f59e0b" floodOpacity="0.6" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47" stroke={`url(#gld5_${uid})`} strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="44" stroke={`url(#gld5_${uid})`} strokeWidth="2.4" filter={`url(#gld5_glow_${uid})`} />
          {/* 8 أزرار هندسية ذهبية مرصعة */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <circle key={deg} cx={x} cy={y} r="1.8" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 6: إطار التميز (Excellence Cyan Platinum) — بلاتيني سماوي مشع
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_6':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`plt6_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <filter id={`plt6_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38bdf8" floodOpacity="0.7" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.2" stroke={`url(#plt6_${uid})`} strokeWidth="0.8" strokeDasharray="8 4" opacity="0.6" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#plt6_${uid})`} strokeWidth="2.5" filter={`url(#plt6_glow_${uid})`} />
          {/* أقواس الطاقة الجانبية الدقيقة */}
          <path d="M 43 5.5 A 44.5 44.5 0 0 1 57 5.5" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 43 94.5 A 44.5 44.5 0 0 0 57 94.5" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="50" cy="5.5" r="2.2" fill="#ffffff" />
          <circle cx="50" cy="94.5" r="2.2" fill="#ffffff" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 7: إطار الموهبة (Talent Emerald & Gold) — زمردي بأطياف ذهبية
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_7':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`emr7_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id={`gld7_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`emr7_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#10b981" floodOpacity="0.65" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47" stroke={`url(#gld7_${uid})`} strokeWidth="1" />
          <circle cx="50" cy="50" r="44" stroke={`url(#emr7_${uid})`} strokeWidth="2.6" filter={`url(#emr7_glow_${uid})`} />
          {/* زخارف أوراق الزمرد الملكية المحكمة بالمدار */}
          {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <circle key={deg} cx={x} cy={y} r="1.6" fill="#a7f3d0" stroke="#047857" strokeWidth="0.5" />
            );
          })}
          {/* قمم ذهبية متقاطعة */}
          <polygon points="50,3 52,6 50,7 48,6" fill="#fef08a" />
          <polygon points="50,97 52,94 50,93 48,94" fill="#fef08a" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 8: إطار الإبداع (Creativity Ruby Crest) — ياقوتي بنقوش هندسية
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_8':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`rby8_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
            <filter id={`rby8_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="#ef4444" floodOpacity="0.7" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.5" stroke="#fca5a5" strokeWidth="0.6" opacity="0.6" strokeDasharray="5 3" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#rby8_${uid})`} strokeWidth="2.8" filter={`url(#rby8_glow_${uid})`} />
          {/* أركان ياقوتية هندسية مصقولة */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,3.5 53.5,6.5 50,9.5 46.5,6.5" fill="#fecaca" stroke="#991b1b" strokeWidth="0.6" />
            </g>
          ))}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="5.8" r="1.4" fill="#f87171" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 9: إطار القيادة (Leadership Imperial Gold) — ذهبي ملكي متدرج
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_9':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`ldr9_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
            <filter id={`ldr9_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ca8a04" floodOpacity="0.75" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.5" stroke={`url(#ldr9_${uid})`} strokeWidth="1" strokeDasharray="6 3" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#ldr9_${uid})`} strokeWidth="3" filter={`url(#ldr9_glow_${uid})`} />
          {/* زخارف أركان قيادية فخمة */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,2.8 53,6 50,7.8 47,6" fill="#fef08a" stroke="#854d0e" strokeWidth="0.5" />
            </g>
          ))}
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
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`pnr10_blue_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
            <filter id={`pnr10_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.7" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.5" stroke={`url(#pnr10_gold_${uid})`} strokeWidth="1" opacity="0.8" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#pnr10_blue_${uid})`} strokeWidth="3" filter={`url(#pnr10_glow_${uid})`} />
          <circle cx="50" cy="50" r="43" stroke={`url(#pnr10_gold_${uid})`} strokeWidth="0.8" />
          {/* تاج ملكي علوي مصغر ومتناسق ضمن الحدود دون أي خروج */}
          <g transform="translate(50, 4.5)">
            <polygon points="-5,2 -7,-2 -3,-0.5 0,-3 3,-0.5 7,-2 5,2" fill={`url(#pnr10_gold_${uid})`} stroke="#854d0e" strokeWidth="0.4" />
            <circle cx="0" cy="-3.5" r="0.8" fill="#ffffff" />
            <circle cx="-7" cy="-2.5" r="0.6" fill="#ffffff" />
            <circle cx="7" cy="-2.5" r="0.6" fill="#ffffff" />
          </g>
          {/* دروع سفلية ناعمة */}
          <polygon points="50,97.5 53,94.5 47,94.5" fill="#fef08a" stroke="#854d0e" strokeWidth="0.4" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 11: إطار النخبة (Elite Cosmic Orbit) — ماسي بنفسجي كوني
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_11':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`elt11_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="35%" stopColor="#c084fc" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id={`elt11_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.2" floodColor="#a855f7" floodOpacity="0.8" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.8" stroke="#e9d5ff" strokeWidth="0.8" strokeDasharray="6 3 2 3" opacity="0.8" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#elt11_${uid})`} strokeWidth="3" filter={`url(#elt11_glow_${uid})`} />
          {/* نجوم المدار الكونية الأربع المشعة */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,2.5 51.5,5.5 54.5,5.5 52,7.5 53,10.5 50,8.5 47,10.5 48,7.5 45.5,5.5 48.5,5.5" fill="#ffffff" />
            </g>
          ))}
          {/* كويكبات مدارية لامعة */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="5.8" r="1.6" fill="#38bdf8" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 12: إطار القمة التكنولوجية (Technology Summit Sovereign)
    // قمة الفخامة: ذهب خالص 24K وألماس نقي محكم بلا أي بروز مشوه
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
            <filter id={`smt12_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.85" />
            </filter>
          </defs>
          {/* هالة الحافة الخارجية المصقولة */}
          <circle cx="50" cy="50" r="48" stroke={`url(#smt12_gold_${uid})`} strokeWidth="1" strokeDasharray="8 3" opacity="0.85" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#smt12_gold_${uid})`} strokeWidth="3.2" filter={`url(#smt12_glow_${uid})`} />
          <circle cx="50" cy="50" r="42.6" stroke={`url(#smt12_dia_${uid})`} strokeWidth="0.8" />
          
          {/* تاج القمة الملكي المتناسق أعلى الإطار ضمن الحدود الدقيقة */}
          <g transform="translate(50, 4)">
            <polygon points="-6,2.5 -8,-1.5 -3,0.2 0,-3.2 3,0.2 8,-1.5 6,2.5" fill={`url(#smt12_gold_${uid})`} stroke="#78350f" strokeWidth="0.4" />
            {/* ماسات التاج */}
            <circle cx="0" cy="-3.6" r="1" fill="#ffffff" stroke="#0284c7" strokeWidth="0.3" />
            <circle cx="-8" cy="-1.8" r="0.7" fill="#ffffff" />
            <circle cx="8" cy="-1.8" r="0.7" fill="#ffffff" />
          </g>

          {/* درع شرفي ذهبي سفلي */}
          <g transform="translate(50, 95.8)">
            <polygon points="0,2.4 4,-1 -4,-1" fill={`url(#smt12_gold_${uid})`} stroke="#78350f" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="0.8" fill="#ffffff" />
          </g>

          {/* ماسات زوايا الأركان الفخمة */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4.2 52.2,6.4 50,8.6 47.8,6.4" fill={`url(#smt12_dia_${uid})`} stroke="#0369a1" strokeWidth="0.3" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // إطار بطل المسابقات (Competition Champion Frame)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_tech_champion':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`chmp_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id={`chmp_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="#0284c7" floodOpacity="0.75" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.5" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#chmp_${uid})`} strokeWidth="3" filter={`url(#chmp_glow_${uid})`} />
          {/* نجمة البطولة الشرفية الذهبية في الأعلى */}
          <g transform="translate(50, 4.5)">
            <polygon points="0,-3.2 1,-0.8 3.2,-0.8 1.5,0.6 2.2,2.8 0,1.4 -2.2,2.8 -1.5,0.6 -3.2,-0.8 -1,-0.8" fill="#ffd700" stroke="#b45309" strokeWidth="0.4" />
          </g>
          {/* نقاط ذهبية للبطولة */}
          {[90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <circle cx="50" cy="5.8" r="1.8" fill="#ffd700" stroke="#b45309" strokeWidth="0.4" />
            </g>
          ))}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // إطار شهر رمضان المبارك (Ramadan Crescent Frame)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_ramadan_crescent':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`rmd_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <filter id={`rmd_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.7" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47.2" stroke={`url(#rmd_${uid})`} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.75" />
          <circle cx="50" cy="50" r="44.2" stroke={`url(#rmd_${uid})`} strokeWidth="2.6" filter={`url(#rmd_glow_${uid})`} />
          {/* هلال رمضاني إسلامي ذهبي أعلى الإطار */}
          <g transform="translate(50, 4.5)">
            <path
              d="M 1.5,-3.2 A 3.2 3.2 0 1 0 3.2,1.8 A 2.5 2.5 0 1 1 1.5,-3.2 Z"
              fill="#fef08a"
              stroke="#b45309"
              strokeWidth="0.4"
            />
          </g>
          {/* نجوم إسلامية ثمانية ناعمة */}
          {[90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <polygon points="50,4.2 51.5,5.8 53.5,5.8 52,7.2 52.8,9.2 50,8 47.2,9.2 48,7.2 46.5,5.8 48.5,5.8" fill="#fef08a" />
            </g>
          ))}
        </svg>
      );

    default:
      return null;
  }
}
