'use client';

// ═══════════════════════════════════════════════════════════════
//  شارة القلب التفاعلية — بدون أي نوافذ منبثقة معتمة
//  النقر ينتقل بسلاسة للدليل في الصفحة أو يفتح بطاقة معلومات خفيفة
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  getCharmTier,
  getNextCharmTier,
} from '@/lib/charm-hearts';
import { VectorCharmHeart } from '@/components/ui/vector-charm-heart';
import { Sparkles, X, ArrowLeft, Heart } from 'lucide-react';

interface UserCharmHeartProps {
  level: number;
  points?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
  disableModal?: boolean;
  visible?: boolean;
}

export function UserCharmHeart({
  level = 0,
  points,
  size = 'sm',
  showTitle = false,
  className = '',
  disableModal = false,
  visible = true,
}: UserCharmHeartProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeLevel = Math.max(0, Math.min(12, level));
  const tier = getCharmTier(safeLevel);

  // إغلاق البطاقة عند النقر خارجها
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  if (!visible) return null;

  // حجم الأيقونة والشارة
  const sizeConfig = {
    xs: {
      wrapper: 'w-7 h-7',
      badge: 'min-w-[13px] h-[13px] text-[8px] -bottom-0.5 -right-0.5 px-0.5',
      titleText: 'text-[11px]',
    },
    sm: {
      wrapper: 'w-9 h-9',
      badge: 'min-w-[15px] h-[15px] text-[9px] -bottom-0.5 -right-0.5 px-1',
      titleText: 'text-xs',
    },
    md: {
      wrapper: 'w-11 h-11',
      badge: 'min-w-[18px] h-[18px] text-[10px] -bottom-1 -right-1 px-1',
      titleText: 'text-xs',
    },
    lg: {
      wrapper: 'w-14 h-14',
      badge: 'min-w-[20px] h-[20px] text-[11px] -bottom-1.5 -right-1.5 px-1.5',
      titleText: 'text-sm',
    },
  }[size];

  const effectivePoints = typeof points === 'number' ? points : tier.pointsRequired;
  const nextTier = getNextCharmTier(tier.level);
  const pointsToNext = nextTier ? Math.max(0, nextTier.pointsRequired - effectivePoints) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.round(
          ((effectivePoints - tier.pointsRequired) /
            Math.max(1, nextTier.pointsRequired - tier.pointsRequired)) *
            100
        )
      )
    : 100;

  const handleClick = (e: React.MouseEvent) => {
    if (disableModal) return;
    e.stopPropagation();

    // إذا كان دليل القلوب موجوداً في نفس الصفحة، ننتقل إليه بسلاسة فوراً
    const guideEl = document.getElementById('charm-hearts-guide');
    if (guideEl) {
      guideEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      guideEl.classList.add('ring-2', 'ring-gold', 'rounded-3xl');
      setTimeout(() => {
        guideEl.classList.remove('ring-2', 'ring-gold');
      }, 2000);
      return;
    }

    // إذا لم يكن الدليل في الصفحة، نفتح بطاقة معلومات منبثقة خفيفة وغير معتمة
    setPopoverOpen((prev) => !prev);
  };

  // المحتوى الداخلي لأيقونة القلب الفيكتور
  const heartIconContent = (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeConfig.wrapper}`}>
      <div className="w-full h-full transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
        <VectorCharmHeart level={tier.level} />
      </div>
      {/* شارة رقم المستوى */}
      <span
        className={`absolute rounded-full font-black flex items-center justify-center shadow-md border border-white/80 leading-none select-none z-10 ${sizeConfig.badge}`}
        style={{
          background:
            tier.level === 0
              ? 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          color: tier.level === 0 ? '#1e293b' : '#000000',
        }}
      >
        {tier.level}
      </span>
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-block text-start">
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 select-none group transition-all duration-200 ${
          disableModal ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'
        } ${className}`}
        title={`المستوى ${tier.level}: ${tier.title} (انقر لعرض تفاصيل الترقية)`}
        aria-label={`مستوى التفاعل: ${tier.level} - ${tier.title}`}
      >
        {showTitle ? (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/90 shadow-sm hover:border-gold/40 transition-colors">
            {heartIconContent}
            <span className={`font-bold text-zinc-200 ${sizeConfig.titleText}`}>
              {tier.title}
            </span>
          </div>
        ) : (
          heartIconContent
        )}
      </button>

      {/* ── بطاقة سريعة خفيفة وموضعية (بدون أي شاشة معتمة أو مودال) ── */}
      {popoverOpen && (
        <div
          className="absolute top-full mt-2 end-0 z-40 w-72 sm:w-80 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-foreground"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border p-1 shadow-xs shrink-0"
                style={{
                  backgroundColor: `${tier.heartColor}20`,
                  borderColor: `${tier.heartColor}50`,
                }}
              >
                <VectorCharmHeart level={tier.level} />
              </div>
              <div>
                <span className="text-xs font-black block">{tier.title}</span>
                <span className="text-[10px] text-muted-foreground block">
                  مستوى التفاعل {tier.level}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress */}
          <div className="py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">رصيدك الحالي:</span>
              <span className="font-black text-gold">{effectivePoints} نقطة</span>
            </div>

            {nextTier ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>الهدف: {nextTier.title}</span>
                  <span>باقي {pointsToNext} نقطة</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: tier.heartColor,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-emerald-500">
                وصلت للقمة! أعلى رتبة تفاعلية 👑
              </p>
            )}
          </div>

          {/* Link to full guide in Profile */}
          <div className="border-t border-border/60 pt-2.5">
            <Link
              href="/profile#charm-hearts-guide"
              onClick={() => setPopoverOpen(false)}
              className="flex items-center justify-between w-full rounded-xl bg-muted/60 hover:bg-gold/15 px-3 py-2 text-xs font-bold text-foreground hover:text-gold transition-colors group"
            >
              <span>دليل مستويات القلوب الـ 12</span>
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
