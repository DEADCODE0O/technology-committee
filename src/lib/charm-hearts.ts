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
}

export const CHARM_TIERS: CharmTierConfig[] = [
  {
    level: 0,
    title: 'مستكشف جديد',
    pointsRequired: 0,
    heartColor: '#64748b',
    heartGradient: ['#475569', '#334155'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(100, 116, 139, 0.35)',
    unlockedPerk: 'المشاركة في ورش العمل وفعاليات اللجنة',
    description: 'بداية رحلتك الاستكشافية في أنشطة وورش اللجنة التكنولوجية.'
  },
  {
    level: 1,
    title: 'عضو نشط',
    pointsRequired: 15,
    heartColor: '#ec4899',
    heartGradient: ['#f472b6', '#db2777'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    unlockedPerk: 'جوهرة الكوارتز الوردي وإطار البداية',
    description: 'إثبات الحضور والمشاركة الفعالة في أول ورشة عمل.'
  },
  {
    level: 2,
    title: 'مشارك متميز',
    pointsRequired: 35,
    heartColor: '#ef4444',
    heartGradient: ['#f87171', '#dc2626'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    unlockedPerk: 'قلب الياقوت الأحمر وإطار المبادرة',
    description: 'حضور منتظم وتسليم المهام والتفاعل المثمر مع المدربين.'
  },
  {
    level: 3,
    title: 'مبادر واعد',
    pointsRequired: 65,
    heartColor: '#f43f5e',
    heartGradient: ['#fb7185', '#e11d48'],
    wings: 'mini',
    crown: 'none',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    unlockedPerk: 'أول زوج من أجنحة الملاك الذهبية وإطار المشاركة',
    description: 'مبادرة متميزة في النقاشات التقنية ومساعدة الزملاء بالمجتمع.'
  },
  {
    level: 4,
    title: 'نجم الورش',
    pointsRequired: 100,
    heartColor: '#f59e0b',
    heartGradient: ['#fbbf24', '#d97706'],
    wings: 'mini',
    crown: 'mini',
    glowColor: 'rgba(245, 158, 11, 0.55)',
    unlockedPerk: 'تاج الذهب المصغر وإطار النشاط الذهبي',
    description: 'الوصول لمئوية النقاط الأولى وإتقان ورش تكنولوجية متعددة.'
  },
  {
    level: 5,
    title: 'خبير تكنولوجي',
    pointsRequired: 145,
    heartColor: '#ec4899',
    heartGradient: ['#f472b6', '#db2777'],
    wings: 'golden',
    crown: 'crystal',
    glowColor: 'rgba(236, 72, 153, 0.55)',
    unlockedPerk: 'تاج الكريستال الزمردي وإطار الإنجاز المتألق',
    description: 'مستوى احترافي عالي في تسليم المشروعات البرمجية والتطبيقية.'
  },
  {
    level: 6,
    title: 'فارس التميز',
    pointsRequired: 195,
    heartColor: '#06b6d4',
    heartGradient: ['#38bdf8', '#0284c7'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    unlockedPerk: 'أجنحة ذهبية لقلب الياقوت الأزرق وإطار التميز البلاتيني',
    description: 'حضور نخبة الورش وتقديم حلول إبداعية في التحديات والمسابقات.'
  },
  {
    level: 7,
    title: 'نجم الموهبة',
    pointsRequired: 255,
    heartColor: '#10b981',
    heartGradient: ['#34d399', '#059669'],
    wings: 'golden',
    crown: 'crystal',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    unlockedPerk: 'قلب الزمرد الملكي المضيء وإطار الموهبة',
    description: 'موهبة متألقة ومساهمة فعالة في تطوير المشاريع التقنية.'
  },
  {
    level: 8,
    title: 'رائد الإبداع',
    pointsRequired: 320,
    heartColor: '#ef4444',
    heartGradient: ['#f87171', '#dc2626'],
    wings: 'golden',
    crown: 'sapphire',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    unlockedPerk: 'قلب الياقوت الملكي المشع وإطار الإبداع الفاخر',
    description: 'أحد أبرز رواد التكنولوجيا المداومين على صدارة لوحة الشرف.'
  },
  {
    level: 9,
    title: 'قائد تقني',
    pointsRequired: 390,
    heartColor: '#eab308',
    heartGradient: ['#fde047', '#ca8a04'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(234, 179, 8, 0.75)',
    unlockedPerk: 'قلب الذهب الملكي الخالص وإطار القيادة',
    description: 'قيادة الفرق الطلابية وتحقيق مراكز متقدمة على مستوى المدرسة والكلية.'
  },
  {
    level: 10,
    title: 'رائد المنصة',
    pointsRequired: 470,
    heartColor: '#3b82f6',
    heartGradient: ['#60a5fa', '#1d4ed8'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    unlockedPerk: 'أجنحة مزدوجة ملكية وتاج العرش وإطار الرواد',
    description: 'تطور أجنحة القلب إلى زوجين مجنحين فاخرين مع تاج العرش الملكي.'
  },
  {
    level: 11,
    title: 'نخبة التكنولوجيا',
    pointsRequired: 560,
    heartColor: '#8b5cf6',
    heartGradient: ['#a78bfa', '#6d28d9'],
    wings: 'radiant',
    crown: 'sapphire',
    glowColor: 'rgba(139, 92, 246, 0.85)',
    unlockedPerk: 'أجنحة مدارية مشعة وتاج الياقوت الكوني وإطار النخبة',
    description: 'مرتبة النخبة الملكية العليا وتتويج شرفي استثنائي بالمنصة.'
  },
  {
    level: 12,
    title: 'القمة التكنولوجية',
    pointsRequired: 660,
    heartColor: '#ffd700',
    heartGradient: ['#fef08a', '#d97706'],
    wings: 'imperial',
    crown: 'sovereign',
    glowColor: 'rgba(255, 215, 0, 0.9)',
    unlockedPerk: 'تاج السيادة الكبرى والأجنحة الإمبراطورية وإطار القمة التكنولوجية الأسمى',
    description: 'قمة الشرف والتفاعل والتميز بالمنصة — المستوى 12 الأسمى.'
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
