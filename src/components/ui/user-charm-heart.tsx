'use client';

import React, { useState } from 'react';
import {
  getCharmTier,
  getNextCharmTier,
  CHARM_TIERS,
  type CharmTierConfig,
} from '@/lib/charm-hearts';

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
  const tier = getCharmTier(level);

  if (!visible) return null;

  // حجم الأيقونة والشارة
  const sizeConfig = {
    xs: {
      wrapper: 'w-7 h-7',
      img: 'w-7 h-7',
      badge: 'min-w-[13px] h-[13px] text-[8px] -bottom-0.5 -right-0.5 px-0.5',
      titleText: 'text-[11px]',
    },
    sm: {
      wrapper: 'w-9 h-9',
      img: 'w-9 h-9',
      badge: 'min-w-[15px] h-[15px] text-[9px] -bottom-0.5 -right-0.5 px-1',
      titleText: 'text-xs',
    },
    md: {
      wrapper: 'w-11 h-11',
      img: 'w-11 h-11',
      badge: 'min-w-[18px] h-[18px] text-[10px] -bottom-1 -right-1 px-1',
      titleText: 'text-xs',
    },
    lg: {
      wrapper: 'w-14 h-14',
      img: 'w-14 h-14',
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

  // المحتوى الداخلي لأيقونة القلب وشارة المستوى في الزاوية السفلية (Litmatch 3D Heart Icon)
  const heartIconContent = (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeConfig.wrapper}`}>
      <img
        src={tier.imagePath}
        alt={`مستوى ${tier.level}`}
        className={`${sizeConfig.img} object-contain transition-transform duration-200 group-hover:scale-115 select-none`}
        style={{
          filter: `drop-shadow(0 2px 6px ${tier.glowColor})`,
        }}
        loading="lazy"
      />
      {/* شارة رقم المستوى في الزاوية السفلية اليمنى مثل لتماتش تماماً */}
      <span
        className={`absolute rounded-full font-black text-night flex items-center justify-center shadow-md border border-white/80 leading-none select-none ${sizeConfig.badge}`}
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

      {/* ── مودال قواعد الترقية (Litmatch Promotion Rules Modal) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] bg-zinc-950 border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-right font-sans text-white"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: `${tier.heartColor}20`,
                    borderColor: `${tier.heartColor}50`,
                  }}
                >
                  <img
                    src={tier.imagePath}
                    alt=""
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    قواعد الترقية ومستوى الجاذبية
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold-light border border-gold/40 font-semibold">
                      15 مستوى ملكي
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    الآن مستوى الجاذبية والتفاعل له عدة مستويات. عندما تكتسب نقاط المشاركة والورش، سيزداد مستواك وفقًا لذلك.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* بطاقة مستوى المستخدم الحالي */}
              <div
                className="p-5 rounded-2xl border relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5"
                style={{
                  background: `radial-gradient(circle at top right, ${tier.heartColor}25 0%, rgba(24,24,27,0.92) 75%)`,
                  borderColor: `${tier.heartColor}50`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center border shadow-2xl relative overflow-hidden shrink-0"
                    style={{
                      background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(9,9,11,0.95) 100%)',
                      borderColor: tier.heartColor,
                      boxShadow: `0 0 25px ${tier.glowColor}`,
                    }}
                  >
                    <img
                      src={tier.imagePath}
                      alt={tier.title}
                      className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        مستواك الحالي
                      </span>
                      <h4 className="text-base font-extrabold text-white">
                        المستوى {tier.level}: {tier.title}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-5">{tier.description}</p>
                  </div>
                </div>

                {/* مؤشر التقدم نحو المستوى القادم */}
                <div className="w-full sm:w-56 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 shrink-0">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                    <span className="text-zinc-400">النقاط الحالية:</span>
                    <span className="text-gold-light">{effectivePoints} نقطة</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(90deg, ${tier.heartColor}, #f59e0b)`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1.5 text-center">
                    {nextTier
                      ? `متبقي ${pointsToNext} نقطة للترقية إلى ${nextTier.title} (مستوى ${nextTier.level})`
                      : 'لقد حققت أعلى مرتبة شرفية في المنصة! 🎉'}
                  </p>
                </div>
              </div>

              {/* كيف تكسب النقاط؟ */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                  <span>⚡ كيف تجمع نقاط الترقية هذا الفصل؟</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🎓</span>
                    <h5 className="text-xs font-bold text-zinc-200">حضور الورش</h5>
                    <span className="text-[11px] font-black text-emerald-400 block mt-0.5">
                      +25 إلى 35 نقطة
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">💻</span>
                    <h5 className="text-xs font-bold text-zinc-200">تسليم المهام</h5>
                    <span className="text-[11px] font-black text-cyan-400 block mt-0.5">
                      +30 إلى 50 نقطة
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🏆</span>
                    <h5 className="text-xs font-bold text-zinc-200">المسابقات والهاكاثون</h5>
                    <span className="text-[11px] font-black text-gold-light block mt-0.5">
                      +80 إلى 150 نقطة
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">💬</span>
                    <h5 className="text-xs font-bold text-zinc-200">نقاشات المجتمع</h5>
                    <span className="text-[11px] font-black text-purple-400 block mt-0.5">
                      +5 إلى 15 نقطة
                    </span>
                  </div>
                </div>
              </div>

              {/* جدول مستويات الترقية الشامل (Litmatch 15 Tiers Table) */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                  <span>📜 جدول مستويات القلوب الـ 15 ومكافآتها</span>
                </h4>
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/40">
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur">
                        <tr>
                          <th className="p-3 font-bold">المستوى</th>
                          <th className="p-3 font-bold text-center">أيقونة القلب ثلاثية الأبعاد</th>
                          <th className="p-3 font-bold">اللقب الشرفي</th>
                          <th className="p-3 font-bold">النقاط</th>
                          <th className="p-3 font-bold">المكافآت والمزايا المفتوحة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {CHARM_TIERS.map((t) => {
                          const isCurrent = t.level === tier.level;
                          return (
                            <tr
                              key={t.level}
                              className={`transition-colors ${
                                isCurrent
                                  ? 'bg-gold/10 font-bold border-r-4 border-gold'
                                  : 'hover:bg-zinc-900/50'
                              }`}
                            >
                              <td className="p-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-extrabold ${
                                  isCurrent ? 'bg-gold text-night' : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                  {t.level}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center">
                                  <UserCharmHeart level={t.level} size="sm" disableModal />
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className={isCurrent ? 'text-gold-light font-extrabold' : 'text-zinc-200'}>
                                    {t.title}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-gold text-night px-1.5 py-0.5 rounded-full font-black">
                                      أنت هنا
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-gold-light font-extrabold whitespace-nowrap">
                                {t.pointsRequired} نقطة
                              </td>
                              <td className="p-3 text-zinc-400 text-[11px] leading-5">
                                {t.unlockedPerk}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-night font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                فهمت، استمر في التقدم 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
