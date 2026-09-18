// ═══════════════════════════════════════════════════════════════
// منظومة قلوب التفاعل والمستويات (Litmatch-style Charm Hearts System)
// تدرج فني متناسق لقلوب التفاعل حسب مستويات المنصة الواقعية
// السقف الأقصى للمستويات: المستوى 12 (القمة التكنولوجية)
// ═══════════════════════════════════════════════════════════════

export interface CharmTierConfig {
  level: number;
  title: string;
  pointsRequired: number;
  heartColor: string;
  heartGradient: [string, string];
  wings: 'none' | 'mini' | 'golden' | 'radiant' | 'imperial' | 'cosmic';
  crown: 'none' | 'mini' | 'crystal' | 'royal' | 'sapphire' | 'sovereign';
  glowColor: string;
  unlockedPerk: string;
  description: string;
  imageSrc: string;
}

export const CHARM_TIERS: CharmTierConfig[] = [
  {
    level: 0,
    title: 'نبض البداية',
    pointsRequired: 0,
    heartColor: '#64748b',
    heartGradient: ['#475569', '#334155'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    unlockedPerk: 'المشاركة في ورش العمل وفعاليات اللجنة',
    description: 'انطلاقة رحلتك الاستكشافية في عالم التكنولوجيا والابتكار.',
    imageSrc: '/images/hearts/lit_heart_0.webp',
  },
  {
    level: 1,
    title: 'قلب البرونز التقني',
    pointsRequired: 15,
    heartColor: '#cd7f32',
    heartGradient: ['#d97706', '#92400e'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(205, 127, 50, 0.45)',
    unlockedPerk: 'قلب البرونز السيبراني وإطار البداية',
    description: 'إثبات الحضور والمشاركة الفعالة في أولى الورش والمختبرات.',
    imageSrc: '/images/hearts/lit_heart_1.webp',
  },
  {
    level: 2,
    title: 'قلب الفضة الرقمية',
    pointsRequired: 35,
    heartColor: '#94a3b8',
    heartGradient: ['#e2e8f0', '#64748b'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    unlockedPerk: 'قلب الفضة الرقمية وإطار المبادرة الفضي',
    description: 'حضور منتظم وتسليم المهام والتفاعل المثمر مع المدربين.',
    imageSrc: '/images/hearts/lit_heart_2.webp',
  },
  {
    level: 3,
    title: 'قلب الياقوت المضيء',
    pointsRequired: 65,
    heartColor: '#ef4444',
    heartGradient: ['#f87171', '#b91c1c'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(239, 68, 68, 0.55)',
    unlockedPerk: 'بلورة الياقوت الناري وإطار المشاركة',
    description: 'مبادرة متميزة في النقاشات التقنية ومساعدة الزملاء بالمجتمع.',
    imageSrc: '/images/hearts/lit_heart_3.webp',
  },
  {
    level: 4,
    title: 'قلب الذهب المتوج',
    pointsRequired: 100,
    heartColor: '#f59e0b',
    heartGradient: ['#fbbf24', '#b45309'],
    wings: 'mini',
    crown: 'mini',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    unlockedPerk: 'التاج الذهبي الملكي وإطار النشاط الذهبي المزدوج',
    description: 'الوصول لمئوية النقاط الأولى وإتقان مهارات تكنولوجية متعددة.',
    imageSrc: '/images/hearts/lit_heart_4.webp',
  },
  {
    level: 5,
    title: 'قلب الزمرد السيبراني',
    pointsRequired: 145,
    heartColor: '#10b981',
    heartGradient: ['#34d399', '#047857'],
    wings: 'mini',
    crown: 'crystal',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    unlockedPerk: 'مصفوفة الطاقة الزمردية وإطار الإنجاز الألماسي',
    description: 'مستوى احترافي عالي في تسليم المشروعات البرمجية والتطبيقية.',
    imageSrc: '/images/hearts/lit_heart_5.webp',
  },
  {
    level: 6,
    title: 'قلب السفير الملكي',
    pointsRequired: 195,
    heartColor: '#0284c7',
    heartGradient: ['#38bdf8', '#0369a1'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(2, 132, 199, 0.7)',
    unlockedPerk: 'أجنحة الملاك المذهبة ودرع السفير وإطار التميز البلاتيني',
    description: 'حضور نخبة الورش وتقديم حلول إبداعية في التحديات والمسابقات.',
    imageSrc: '/images/hearts/lit_heart_6.webp',
  },
  {
    level: 7,
    title: 'قلب الجمشت الماسي',
    pointsRequired: 255,
    heartColor: '#a855f7',
    heartGradient: ['#c084fc', '#7e22ce'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    unlockedPerk: 'بلورة الجمشت الملكية وأجنحة البلاتين وإطار الموهبة',
    description: 'موهبة متألقة ومساهمة فعالة في تطوير المشاريع التقنية للجنة.',
    imageSrc: '/images/hearts/lit_heart_7.webp',
  },
  {
    level: 8,
    title: 'قلب التيتانيوم المجنح',
    pointsRequired: 320,
    heartColor: '#f59e0b',
    heartGradient: ['#fde047', '#b45309'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    unlockedPerk: 'أجنحة التيتانيوم المفرودة وإطار الإبداع الفاخر',
    description: 'أحد أبرز رواد التكنولوجيا المداومين على صدارة لوحة الشرف.',
    imageSrc: '/images/hearts/lit_heart_8.webp',
  },
  {
    level: 9,
    title: 'قلب السيادة التكنولوجية',
    pointsRequired: 390,
    heartColor: '#00d2ff',
    heartGradient: ['#38bdf8', '#0284c7'],
    wings: 'radiant',
    crown: 'sovereign',
    glowColor: 'rgba(0, 210, 255, 0.85)',
    unlockedPerk: 'طاقة السيادة الزرقاء والأجنحة المزدوجة وإطار القيادة',
    description: 'قيادة الفرق التقنية وإلهام الزملاء بتحقيق إنجازات استثنائية.',
    imageSrc: '/images/hearts/lit_heart_9.webp',
  },
  {
    level: 10,
    title: 'قلب الرواد الإمبراطوري',
    pointsRequired: 470,
    heartColor: '#dc2626',
    heartGradient: ['#f87171', '#991b1b'],
    wings: 'imperial',
    crown: 'royal',
    glowColor: 'rgba(220, 38, 38, 0.85)',
    unlockedPerk: 'وسام الرواد القرمزي والتاج الإمبراطوري وإطار الرواد الملكي',
    description: 'رتبة شرفية عليا تعكس الصدارة والريادة في كافة فعاليات المنصة.',
    imageSrc: '/images/hearts/lit_heart_10.webp',
  },
  {
    level: 11,
    title: 'قلب النخبة الكوني',
    pointsRequired: 560,
    heartColor: '#f59e0b',
    heartGradient: ['#fde047', '#d97706'],
    wings: 'cosmic',
    crown: 'sovereign',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    unlockedPerk: 'الماسة الكونية وتاج النجوم بأربعة أجنحة مشعة وإطار النخبة',
    description: 'مرتبة النخبة الملكية الكونية وتتويج شرفي نادر لرواد اللجنة.',
    imageSrc: '/images/hearts/lit_heart_11.webp',
  },
  {
    level: 12,
    title: 'قلب العرش الأسمى',
    pointsRequired: 660,
    heartColor: '#a855f7',
    heartGradient: ['#e879f9', '#6b21a8'],
    wings: 'cosmic',
    crown: 'sovereign',
    glowColor: 'rgba(168, 85, 247, 0.95)',
    unlockedPerk: 'تحفة العرش الكبرى بستة أجنحة ملائكية وإطار القمة التكنولوجية الأسمى',
    description: 'قمة الشرف والسيادة والتميز بالمنصة — المستوى 12 الأسمى.',
    imageSrc: '/images/hearts/lit_heart_12.webp',
  }
];

export function getCharmTier(level: number): CharmTierConfig {
  const safeLevel = Math.max(0, Math.min(12, Math.min(level, CHARM_TIERS.length - 1)));
  return CHARM_TIERS[safeLevel] || CHARM_TIERS[0];
}

export function getCharmTierByPoints(points: number): CharmTierConfig {
  let matched = CHARM_TIERS[0];
  for (const tier of CHARM_TIERS) {
    if (points >= tier.pointsRequired) {
      matched = tier;
    } else {
      break;
    }
  }
  return matched;
}

export function getNextCharmTier(currentLevel: number): CharmTierConfig | null {
  if (currentLevel >= 12 || currentLevel >= CHARM_TIERS.length - 1) return null;
  return CHARM_TIERS[currentLevel + 1] || null;
}
