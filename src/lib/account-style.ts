// ═══════════════════════════════════════════════════════════════
//  نظام «تدرج مظهر الحساب الملكي» (Progressive Account Prestige)
//  كل ما ارتفع مستوى الطالب تحسّن مظهر اسمه تدريجيًا:
//  المستوى 0 يبدأ بتصميم أساسي هادئ → ذهبي متدرج → توهج →
//  تاج → هالة → تدرج كوني فاخر مع لمعان متحرك عند القمة
//  (متوافق مع الوضعين النهاري والليلي عبر متغيرات dark:)
// ═══════════════════════════════════════════════════════════════

export type CrownTier = 'none' | 'mini' | 'royal' | 'imperial' | 'cosmic';

export interface AccountFlairConfig {
  level: number;
  /** لقب المرتبة الشرفي */
  rankTitle: string;
  /** طبقات نص الاسم (تعمل في الوضعين) */
  nameCls: string;
  /** تاج/رمز يسبق الاسم */
  crown: CrownTier;
  /** شارة رقم المستوى الملونة بجانب الاسم */
  chipCls: string;
  /** وهج خلف الاسم */
  glow: boolean;
  /** لمعان متحرك يمسح الاسم (للمرتبات العليا) */
  shimmer: boolean;
  /** هالة ضوئية دائرية خلف الأفاتار/الاسم */
  halo: boolean;
  /** وصف المرحلة للملف الشخصي */
  stageDescription: string;
}

const FLAIRS: AccountFlairConfig[] = [
  {
    level: 0,
    rankTitle: 'مستكشف جديد',
    nameCls: 'text-zinc-700 dark:text-zinc-300',
    crown: 'none',
    chipCls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
    glow: false,
    shimmer: false,
    halo: false,
    stageDescription: 'بداية رحلتك — حسابك بتصميمه الأساسي، اجمع النقاط لتفتح مظهرًا أفخم.',
  },
  {
    level: 1,
    rankTitle: 'عضو نشط',
    nameCls: 'text-zinc-800 dark:text-zinc-200',
    crown: 'none',
    chipCls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    glow: false,
    shimmer: false,
    halo: false,
    stageDescription: 'أول خطوة ملونة — اسمك صار أكثر حضورًا مع شارة وردية أنيقة.',
  },
  {
    level: 2,
    rankTitle: 'مشارك متميز',
    nameCls: 'text-zinc-900 dark:text-zinc-100',
    crown: 'none',
    chipCls: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-500/30',
    glow: false,
    shimmer: false,
    halo: false,
    stageDescription: 'حضور أقوى — اسم داكن بارز وشارة ياقوتية تلمع.',
  },
  {
    level: 3,
    rankTitle: 'مبادر واعد',
    nameCls: 'text-rose-700 dark:text-rose-300',
    crown: 'none',
    chipCls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    glow: true,
    shimmer: false,
    halo: false,
    stageDescription: 'اسمك يكتسب أول لمسة لونية دافئة مع توهج ناعم.',
  },
  {
    level: 4,
    rankTitle: 'نجم الورش',
    nameCls: 'text-amber-700 dark:text-amber-300',
    crown: 'mini',
    chipCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    glow: true,
    shimmer: false,
    halo: false,
    stageDescription: 'تاجك الأول يظهر — نجم الورش يستحق التوّج.',
  },
  {
    level: 5,
    rankTitle: 'خبير تكنولوجي',
    nameCls: 'account-name-gold',
    crown: 'mini',
    chipCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    glow: true,
    shimmer: false,
    halo: false,
    stageDescription: 'اسمك يتحول إلى تدرج ذهبي مصقول يلفت الأنظار.',
  },
  {
    level: 6,
    rankTitle: 'فارس الإبداع',
    nameCls: 'account-name-gold',
    crown: 'royal',
    chipCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    glow: true,
    shimmer: false,
    halo: false,
    stageDescription: 'تاج ملكي ذهبي يتوّج اسمك المتدرج بفخامة.',
  },
  {
    level: 7,
    rankTitle: 'قائد تقني',
    nameCls: 'account-name-gold account-name-glow',
    crown: 'royal',
    chipCls: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30',
    glow: true,
    shimmer: false,
    halo: false,
    stageDescription: 'توهج ذهبي يحيط باسمك — قيادة تستحق البروز.',
  },
  {
    level: 8,
    rankTitle: 'بطل المنصة',
    nameCls: 'account-name-royal account-name-glow',
    crown: 'royal',
    chipCls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    glow: true,
    shimmer: false,
    halo: true,
    stageDescription: 'تدرج ملكي فاخر + هالة ضوئية خلف اسمك وحول صورتك.',
  },
  {
    level: 9,
    rankTitle: 'رائد الابتكار',
    nameCls: 'account-name-royal account-name-glow',
    crown: 'imperial',
    chipCls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
    glow: true,
    shimmer: false,
    halo: true,
    stageDescription: 'تاج إمبراطوري + هالة بنفسجية دافئة حول حضورك.',
  },
  {
    level: 10,
    rankTitle: 'أسطورة التكنولوجيا',
    nameCls: 'account-name-royal account-name-glow account-name-shimmer',
    crown: 'imperial',
    chipCls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    glow: true,
    shimmer: true,
    halo: true,
    stageDescription: 'اسمك يلمع بتيار ضوئي متحرك — مرتبة الأساطير.',
  },
  {
    level: 11,
    rankTitle: 'النخبة الياقوتية',
    nameCls: 'account-name-royal account-name-glow account-name-shimmer',
    crown: 'imperial',
    chipCls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    glow: true,
    shimmer: true,
    halo: true,
    stageDescription: 'نخبة ياقوتية — تدرج أزرق ملكي مع لمعان حي.',
  },
  {
    level: 12,
    rankTitle: 'العرش الإمبراطوري',
    nameCls: 'account-name-imperial account-name-glow account-name-shimmer',
    crown: 'imperial',
    chipCls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
    glow: true,
    shimmer: true,
    halo: true,
    stageDescription: 'تدرج إمبراطوري بنفسجي-ذهبي مهيب مع تاج مزدوج.',
  },
  {
    level: 13,
    rankTitle: 'السيادة الماسية',
    nameCls: 'account-name-diamond account-name-glow account-name-shimmer',
    crown: 'cosmic',
    chipCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    glow: true,
    shimmer: true,
    halo: true,
    stageDescription: 'مظهر ماسي متلألئ — قمة الفخامة قبل الكونية.',
  },
  {
    level: 14,
    rankTitle: 'السفير الأسمى',
    nameCls: 'account-name-cosmic account-name-glow account-name-shimmer',
    crown: 'cosmic',
    chipCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
    glow: true,
    shimmer: true,
    halo: true,
    stageDescription: 'أعلى مرتبة: تدرج كوني متعدد الألوان مع لمعان متحرك وهالة مجرّية.',
  },
];

export function getAccountFlair(level: number): AccountFlairConfig {
  const safe = Math.max(0, Math.min(level, FLAIRS.length - 1));
  return FLAIRS[safe] ?? FLAIRS[0];
}
