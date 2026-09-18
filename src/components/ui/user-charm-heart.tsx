'use client';

import React, { useState } from 'react';
import {
  getCharmTier,
  getNextCharmTier,
  CHARM_TIERS,
} from '@/lib/charm-hearts';
import { VectorCharmHeart } from '@/components/ui/vector-charm-heart';

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
  const [isOpen, setIsOpen] = useState(false);
  const safeLevel = Math.max(0, Math.min(12, level));
  const tier = getCharmTier(safeLevel);

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

  // المحتوى الداخلي لأيقونة القلب الفيكتور ثلاثية الأبعاد
  const heartIconContent = (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeConfig.wrapper}`}>
      <div className="w-full h-full transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
        <VectorCharmHeart level={tier.level} />
      </div>
      {/* شارة رقم المستوى في الزاوية السفلية اليمنى */}
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
    <>
      <button
        type="button"
        onClick={(e) => {
          if (!disableModal) {
            e.stopPropagation();
            setIsOpen(true);
          }
        }}
        className={`inline-flex items-center gap-2 select-none group transition-all duration-200 ${
          disableModal ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'
        } ${className}`}
        title={`المستوى ${tier.level}: ${tier.title} (اضغط لعرض تفاصيل الترقية)`}
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

      {/* ── مودال مستويات القلوب المبسط والأنيق ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[88vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-right font-sans text-white"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow overflow-hidden p-1"
                  style={{
                    backgroundColor: `${tier.heartColor}20`,
                    borderColor: `${tier.heartColor}50`,
                  }}
                >
                  <VectorCharmHeart level={tier.level} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    مستويات التفاعل (القلوب)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    كلما زادت نقاطك وتفاعلك ارتفع مستوى قلبك وتميز مظهر حسابك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
              {/* بطاقة المستوى الحالي والتقدم */}
              <div
                className="p-4 rounded-2xl border relative overflow-hidden flex items-center justify-between gap-4"
                style={{
                  background: `radial-gradient(circle at top right, ${tier.heartColor}20 0%, rgba(24,24,27,0.95) 80%)`,
                  borderColor: `${tier.heartColor}40`,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg shrink-0 p-1.5"
                    style={{
                      borderColor: tier.heartColor,
                      boxShadow: `0 0 15px ${tier.glowColor}`,
                    }}
                  >
                    <VectorCharmHeart level={tier.level} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      مستواك الحالي: {tier.level}
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-1">
                      {tier.title}
                    </h4>
                    <p className="text-xs text-gold-light mt-0.5 font-bold">
                      {effectivePoints} نقطة
                    </p>
                  </div>
                </div>

                {nextTier && (
                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-zinc-400 block">المستوى التالي</span>
                    <span className="text-xs font-bold text-zinc-200 block">
                      متبقي {pointsToNext} نقطة
                    </span>
                    <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5 ml-auto">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: tier.heartColor,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* قائمة المستويات المبسطة */}
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-2">
                  تدرج المستويات (0 إلى 12):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHARM_TIERS.map((t) => {
                    const isCurrent = t.level === tier.level;
                    const isUnlocked = level >= t.level;

                    return (
                      <div
                        key={t.level}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-gold/15 border-gold shadow-sm ring-1 ring-gold/40'
                            : isUnlocked
                            ? 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                            : 'bg-zinc-900/20 border-zinc-800/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <UserCharmHeart level={t.level} size="xs" disableModal />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-zinc-200">
                                {t.title}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-gold text-night px-1.5 py-0.2 rounded font-black">
                                  أنت هنا
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              مستوى {t.level}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-gold-light/90">
                          {t.pointsRequired} نقطة
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-light text-night font-extrabold text-xs shadow transition-all active:scale-95"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
