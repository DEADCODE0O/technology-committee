'use client';

import React, { useId } from 'react';

export interface VectorAvatarFrameProps {
  frameId: string;
  className?: string;
}

/**
 * محرك إطارات الصور الرمزية الاحترافي (Vector Avatar Frame Engine)
 * - مركز دائري نقي ومفتوح 100% لا يحجب صورة المستخدم نهائياً
 * - إطارات فيكتور فائقة النقاء والدقة لا تبهت مع التكبير
 * - أبعاد محكمة لا تتجاوز حدود الحاوية وتمنع أي اقتصاص (No clipping / overflow)
 * - تدرج احترافي حقيقي من المستوى 1 وحتى المستوى 12 + إطارات البطولات والمناسبات
 */
export function VectorAvatarFrame({ frameId, className = '' }: VectorAvatarFrameProps) {
  const uid = useId().replace(/[:]/g, '_');

  switch (frameId) {
    // ═══════════════════════════════════════════════════════════════
    // المستوى 1: طوق البرونز النحاسي الأنيق (Bronze Circuit)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_1':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`brz_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <filter id={`brz_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#d97706" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="44.5" stroke={`url(#brz_${uid})`} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 2" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#brz_${uid})`} strokeWidth="2" filter={`url(#brz_glow_${uid})`} />
          <circle cx="50" cy="7.5" r="1.8" fill="#fbbf24" />
          <circle cx="50" cy="92.5" r="1.8" fill="#fbbf24" />
          <circle cx="7.5" cy="50" r="1.8" fill="#fbbf24" />
          <circle cx="92.5" cy="50" r="1.8" fill="#fbbf24" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 2: النواة الفضية السيبرانية (Silver Quantum)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_2':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`slv_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <filter id={`slv_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#94a3b8" floodOpacity="0.5" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45" stroke={`url(#slv_${uid})`} strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#slv_${uid})`} strokeWidth="2.2" strokeDasharray="18 3 6 3" filter={`url(#slv_glow_${uid})`} />
          <path d="M 47 6 L 53 6 L 50 9.5 Z" fill="#ffffff" />
          <path d="M 47 94 L 53 94 L 50 90.5 Z" fill="#ffffff" />
          <path d="M 6 47 L 6 53 L 9.5 50 Z" fill="#ffffff" />
          <path d="M 94 47 L 94 53 L 90.5 50 Z" fill="#ffffff" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 3: الهالة الذهبية المتوهجة (Golden Aureole)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_3':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`gld3_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
            <filter id={`gld3_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#eab308" floodOpacity="0.6" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45.5" stroke={`url(#gld3_${uid})`} strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#gld3_${uid})`} strokeWidth="2.5" filter={`url(#gld3_glow_${uid})`} />
          {[45, 135, 225, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 42.5 * Math.cos(rad);
            const y = 50 + 42.5 * Math.sin(rad);
            return (
              <g key={deg} transform={`translate(${x},${y}) rotate(${deg})`}>
                <polygon points="0,-3.2 3.2,0 0,3.2 -3.2,0" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
              </g>
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 4: درع البلاتين الصقيعي (Glacial Platinum)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_4':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`plt_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </linearGradient>
            <filter id={`plt_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#0ea5e9" floodOpacity="0.6" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46" stroke={`url(#plt_${uid})`} strokeWidth="1" strokeOpacity="0.5" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#plt_${uid})`} strokeWidth="2.5" strokeDasharray="12 4 4 4" filter={`url(#plt_glow_${uid})`} />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <circle key={deg} cx={x} cy={y} r="1.8" fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
            );
          })}
          <path d="M 46 4.5 L 54 4.5 L 50 8 Z" fill="#38bdf8" />
          <path d="M 46 95.5 L 54 95.5 L 50 92 Z" fill="#38bdf8" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 5: درع الزمرد الملكي (Royal Emerald Shield)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_5':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`emr_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id={`emr_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`emr_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45" stroke={`url(#emr_gold_${uid})`} strokeWidth="1" strokeOpacity="0.7" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#emr_${uid})`} strokeWidth="3" filter={`url(#emr_glow_${uid})`} />
          <path d="M 5 44 C 9 47 9 53 5 56 C 8 54 8 46 5 44 Z" fill={`url(#emr_gold_${uid})`} />
          <path d="M 95 44 C 91 47 91 53 95 56 C 92 54 92 46 95 44 Z" fill={`url(#emr_gold_${uid})`} />
          <polygon points="50,4 54,8.5 50,13 46,8.5" fill="#34d399" stroke={`url(#emr_gold_${uid})`} strokeWidth="1" />
          <polygon points="50,96 53,92.5 50,89 47,92.5" fill="#34d399" stroke={`url(#emr_gold_${uid})`} strokeWidth="0.8" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 6: صرح الياقوت الأزرق الملكي (Royal Sapphire Crest)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_6':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`sph_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <filter id={`sph_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.7" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46" stroke={`url(#sph_${uid})`} strokeWidth="1" strokeDasharray="6 2 2 2" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#sph_${uid})`} strokeWidth="3.2" filter={`url(#sph_glow_${uid})`} />
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 43 * Math.cos(rad);
            const y = 50 + 43 * Math.sin(rad);
            return (
              <g key={deg} transform={`translate(${x},${y}) rotate(${deg})`}>
                <polygon points="0,-3.5 3.5,0 0,3.5 -3.5,0" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
              </g>
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 7: سديم الجمشت النجمي (Astral Amethyst)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_7':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`amt_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="30%" stopColor="#c084fc" />
              <stop offset="70%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <filter id={`amt_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.75" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#amt_${uid})`} strokeWidth="1" strokeOpacity="0.6" strokeDasharray="4 8" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#amt_${uid})`} strokeWidth="3.2" filter={`url(#amt_glow_${uid})`} />
          {[45, 135, 225, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <g key={deg} transform={`translate(${x},${y})`}>
                <polygon points="0,-4.5 1,-1 4.5,0 1,1 0,4.5 -1,1 -4.5,0 -1,-1" fill="#f5d0fe" />
              </g>
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 8: صعود الفينيق الناري (Solar Phoenix Blaze)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_8':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`phx_${uid}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
            <filter id={`phx_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ea580c" floodOpacity="0.8" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45.5" stroke={`url(#phx_${uid})`} strokeWidth="1" strokeOpacity="0.6" strokeDasharray="8 4" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#phx_${uid})`} strokeWidth="3.5" filter={`url(#phx_glow_${uid})`} />
          <path d="M 4 48 C 6 42 10 37 13 33 C 11 38 10 44 11 50 C 9 48 6 47 4 48 Z" fill="#f97316" />
          <path d="M 96 48 C 94 42 90 37 87 33 C 89 38 90 44 89 50 C 91 48 94 47 96 48 Z" fill="#f97316" />
          <path d="M 45 6 C 47 3 50 1 50 1 C 50 1 53 3 55 6 C 52 6 50 8 50 10 C 50 8 48 6 45 6 Z" fill="#fef08a" filter={`url(#phx_glow_${uid})`} />
          <circle cx="50" cy="11" r="1.5" fill="#ef4444" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 9: تنين الشرف القرمزي الملكي (Crimson Dragon Sovereign)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_9':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`drg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="30%" stopColor="#dc2626" />
              <stop offset="70%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
            <linearGradient id={`drg_gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id={`drg_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#dc2626" floodOpacity="0.85" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#drg_gold_${uid})`} strokeWidth="1" strokeOpacity="0.75" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#drg_${uid})`} strokeWidth="3.6" filter={`url(#drg_glow_${uid})`} />
          <path d="M 42 6 L 46 2 L 50 7 L 54 2 L 58 6 L 50 10 Z" fill={`url(#drg_gold_${uid})`} stroke="#7f1d1d" strokeWidth="0.8" />
          <path d="M 5 40 Q 12 45 6 52 Q 13 54 7 60" stroke={`url(#drg_gold_${uid})`} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 95 40 Q 88 45 94 52 Q 87 54 93 60" stroke={`url(#drg_gold_${uid})`} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="50" cy="93" r="2.5" fill="#ef4444" stroke={`url(#drg_gold_${uid})`} strokeWidth="1" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 10: التاج الإمبراطوري الذهبي (Imperial Monarch Crown)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_10':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`imp_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <filter id={`imp_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#eab308" floodOpacity="0.85" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#imp_${uid})`} strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#imp_${uid})`} strokeWidth="3.8" filter={`url(#imp_glow_${uid})`} />
          <g transform="translate(50, 6)">
            <path d="M -10 3 L -8 -5 L -3 -1 L 0 -7 L 3 -1 L 8 -5 L 10 3 Z" fill={`url(#imp_${uid})`} stroke="#713f12" strokeWidth="0.8" />
            <circle cx="0" cy="-7.5" r="1.2" fill="#ffffff" />
            <circle cx="-8" cy="-5.5" r="1" fill="#ffffff" />
            <circle cx="8" cy="-5.5" r="1" fill="#ffffff" />
          </g>
          <polygon points="7,50 9.5,46 12,50 9.5,54" fill="#fde047" stroke="#854d0e" strokeWidth="0.6" />
          <polygon points="93,50 90.5,46 88,50 90.5,54" fill="#fde047" stroke="#854d0e" strokeWidth="0.6" />
          <polygon points="50,94 46,91.5 50,89 54,91.5" fill="#fde047" stroke="#854d0e" strokeWidth="0.6" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 11: سديم المجرة والمدارات الكونية (Cosmic Nebula Galaxy)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_11':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`cos_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#818cf8" />
              <stop offset="80%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <filter id={`cos_glow_${uid}`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.9" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="47" stroke={`url(#cos_${uid})`} strokeWidth="1" strokeDasharray="8 6 2 6" opacity="0.85" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#cos_${uid})`} strokeWidth="3.8" filter={`url(#cos_glow_${uid})`} />
          <circle cx="20" cy="16" r="2.4" fill="#38bdf8" filter={`url(#cos_glow_${uid})`} />
          <circle cx="82" cy="24" r="2.8" fill="#f43f5e" filter={`url(#cos_glow_${uid})`} />
          <circle cx="80" cy="82" r="2.2" fill="#a855f7" filter={`url(#cos_glow_${uid})`} />
          <circle cx="18" cy="78" r="2.5" fill="#38bdf8" filter={`url(#cos_glow_${uid})`} />
          <circle cx="50" cy="4" r="1.5" fill="#ffffff" />
          <circle cx="50" cy="96" r="1.5" fill="#ffffff" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // المستوى 12 (القمة العليا): العرش الكوني الأسمى (Transcendent Apex Sovereign)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_lvl_12':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`apx_gld_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="65%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id={`apx_cos_${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id={`apx_glow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#eab308" floodOpacity="0.9" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" stroke={`url(#apx_cos_${uid})`} strokeWidth="1" strokeDasharray="12 4 4 4" />
          <circle cx="50" cy="50" r="45" stroke={`url(#apx_gld_${uid})`} strokeWidth="1.5" strokeOpacity="0.85" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#apx_gld_${uid})`} strokeWidth="4" filter={`url(#apx_glow_${uid})`} />
          <g transform="translate(50, 4.5)">
            <path d="M -13 4 L -10 -6 L -4 0 L 0 -9 L 4 0 L 10 -6 L 13 4 Z" fill={`url(#apx_gld_${uid})`} stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="-9.5" r="1.8" fill="#ffffff" filter={`url(#apx_glow_${uid})`} />
            <circle cx="-10" cy="-6.5" r="1.4" fill="#38bdf8" />
            <circle cx="10" cy="-6.5" r="1.4" fill="#e879f9" />
          </g>
          {[45, 135, 225, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 50 + 44 * Math.cos(rad);
            const y = 50 + 44 * Math.sin(rad);
            return (
              <g key={deg} transform={`translate(${x},${y})`}>
                <polygon points="0,-5 1.2,-1.2 5,0 1.2,1.2 0,5 -1.2,1.2 -5,0 -1.2,-1.2" fill="#ffffff" filter={`url(#apx_glow_${uid})`} />
              </g>
            );
          })}
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // خاص: وسام بطل التكنولوجيا والهاكاثون (Tech Champion Trophy)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_tech_champion':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`chm_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="40%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <filter id={`chm_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.8" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46" stroke={`url(#chm_${uid})`} strokeWidth="1" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#chm_${uid})`} strokeWidth="3.2" filter={`url(#chm_glow_${uid})`} />
          <g transform="translate(50, 6)">
            <path d="M -5 -4 L 5 -4 L 3.5 1 C 2.5 3 0 4 0 4 C 0 4 -2.5 3 -3.5 1 Z" fill="#facc15" stroke="#0284c7" strokeWidth="0.8" />
            <path d="M 0 4 L 0 7 M -2.5 7 L 2.5 7" stroke="#facc15" strokeWidth="1" strokeLinecap="round" />
          </g>
          <circle cx="50" cy="50" r="45" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 8" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // موسمي: هلال وفانوس رمضان الملكي (Ramadan Crescent)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_ramadan_crescent':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`rmd_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id={`rmd_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.75" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="42.5" stroke={`url(#rmd_${uid})`} strokeWidth="2.5" filter={`url(#rmd_glow_${uid})`} />
          <path
            d="M 40 5 C 22 10 10 26 10 46 C 10 68 25 85 45 89 C 30 84 20 70 20 50 C 20 28 32 14 40 5 Z"
            fill={`url(#rmd_${uid})`}
            filter={`url(#rmd_glow_${uid})`}
          />
          <g transform="translate(82, 16)">
            <line x1="0" y1="-6" x2="0" y2="0" stroke="#fde047" strokeWidth="0.8" />
            <polygon points="-2.5,0 2.5,0 4,4 1.5,7 -1.5,7 -4,4" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.6" />
            <circle cx="0" cy="3.5" r="1" fill="#ffffff" />
          </g>
          <circle cx="76" cy="82" r="1.5" fill="#fef08a" />
          <circle cx="88" cy="72" r="1.2" fill="#fef08a" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // خاص: أجنحة النور والملائكية الملكية (Angelic Wings)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_angelic_wings':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`ang_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#e0f2fe" />
              <stop offset="80%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <filter id={`ang_glow_${uid}`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="42.5" stroke={`url(#ang_${uid})`} strokeWidth="2.8" filter={`url(#ang_glow_${uid})`} />
          <ellipse cx="50" cy="7" rx="11" ry="3.2" stroke="#ffffff" strokeWidth="1.2" fill="none" filter={`url(#ang_glow_${uid})`} />
          <path
            d="M 6 36 C 12 38 11 44 8 49 C 13 49 13 56 7 62 C 10 59 11 50 6 36 Z"
            fill={`url(#ang_${uid})`}
            filter={`url(#ang_glow_${uid})`}
          />
          <path
            d="M 94 36 C 88 38 89 44 92 49 C 87 49 87 56 93 62 C 90 59 89 50 94 36 Z"
            fill={`url(#ang_${uid})`}
            filter={`url(#ang_glow_${uid})`}
          />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════
    // خاص: مفاعل السايبر والكم التكنولوجي (Quantum Cyber Reactor)
    // ═══════════════════════════════════════════════════════════════
    case 'frame_tech_quantum':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full pointer-events-none select-none ${className}`} fill="none">
          <defs>
            <linearGradient id={`qtm_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id={`qtm_glow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#06b6d4" floodOpacity="0.85" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46.5" stroke={`url(#qtm_${uid})`} strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="50" cy="50" r="42.5" stroke={`url(#qtm_${uid})`} strokeWidth="3" strokeDasharray="20 4 6 4" filter={`url(#qtm_glow_${uid})`} />
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <rect x="48" y="4" width="4" height="4" fill="#22d3ee" />
              <line x1="44" y1="7" x2="56" y2="7" stroke="#ffffff" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      );

    default:
      return null;
  }
}
