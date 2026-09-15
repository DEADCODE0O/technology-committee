// ═══════════════════════════════════════════════════════════════
// منظومة قلوب التفاعل والمستويات (Litmatch-style Charm Hearts System)
// نظام تدرج القلوب والأجنحة والتيجان حسب مستويات الفصل الدراسي الواقعية
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
  imagePath: string;
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
    imagePath: '/images/hearts/lit_heart_0.png',
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
    imagePath: '/images/hearts/lit_heart_1.png',
    unlockedPerk: 'قلب حلوى وردي ثلاثي الأبعاد وكتابة المنشورات',
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
    imagePath: '/images/hearts/lit_heart_2.png',
    unlockedPerk: 'قلب ياقوتي متوهج وإطار التروس البرونزية',
    description: 'حضور منتظم وتسليم المهام والتفاعل المثمر مع المدربين.'
  },
  {
    level: 3,
    title: 'مبادر واعد',
    pointsRequired: 65,
    heartColor: '#f472b6',
    heartGradient: ['#fb7185', '#e11d48'],
    wings: 'mini',
    crown: 'none',
    glowColor: 'rgba(244, 114, 182, 0.5)',
    imagePath: '/images/hearts/lit_heart_3.png',
    unlockedPerk: 'ظهور أول زوج من أجنحة الملاك الذهبية الملكية',
    description: 'مبادرة متميزة في النقاشات التقنية والمساعدة في المجتمع.'
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
    imagePath: '/images/hearts/lit_heart_4.png',
    unlockedPerk: 'تتويج القلب بتاج الذهب الملكي وإطار طيف النيون',
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
    imagePath: '/images/hearts/lit_heart_5.png',
    unlockedPerk: 'تاج الكريستال الوردي وإطار فارس الفضة الكريستالي',
    description: 'مستوى احترافي عالي في تسليم المشروعات البرمجية والتطبيقية.'
  },
  {
    level: 6,
    title: 'فارس الإبداع',
    pointsRequired: 195,
    heartColor: '#dc2626',
    heartGradient: ['#ef4444', '#b91c1c'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(220, 38, 38, 0.6)',
    imagePath: '/images/hearts/lit_heart_6.png',
    unlockedPerk: 'أجنحة ذهبية حاضنة لقلب الياقوت وفتح إطار سديم المجرة',
    description: 'حضور نخبة الورش وتقديم حلول إبداعية في التحديات والهاكاثونات.'
  },
  {
    level: 7,
    title: 'قائد تقني',
    pointsRequired: 255,
    heartColor: '#d946ef',
    heartGradient: ['#e879f9', '#c026d3'],
    wings: 'golden',
    crown: 'crystal',
    glowColor: 'rgba(217, 70, 239, 0.65)',
    imagePath: '/images/hearts/lit_heart_7.png',
    unlockedPerk: 'قلب ماسي وردي فخم وفتح إطار درع الزمرد الملكي',
    description: 'قيادة فرق العمل والمساهمة في تأهيل زملائك بالأنشطة الطلابية.'
  },
  {
    level: 8,
    title: 'بطل المنصة',
    pointsRequired: 320,
    heartColor: '#0ea5e9',
    heartGradient: ['#38bdf8', '#0284c7'],
    wings: 'golden',
    crown: 'sapphire',
    glowColor: 'rgba(14, 165, 233, 0.7)',
    imagePath: '/images/hearts/lit_heart_8.png',
    unlockedPerk: 'قلب الياقوت الأزرق الملكي وإطار طائر الفينيق الأسطوري',
    description: 'أحد أبرز فرسان التكنولوجيا المداومين على صدارة لوحة الشرف.'
  },
  {
    level: 9,
    title: 'رائد الابتكار',
    pointsRequired: 390,
    heartColor: '#8b5cf6',
    heartGradient: ['#a78bfa', '#7c3aed'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(139, 92, 246, 0.75)',
    imagePath: '/images/hearts/lit_heart_9.png',
    unlockedPerk: 'قلب الجمشت الإمبراطوري المتلألئ وإطار التاج الإمبراطوري',
    description: 'ابتكارات استثنائية وتحقيق مراكز متقدمة على مستوى الكلية.'
  },
  {
    level: 10,
    title: 'أسطورة التكنولوجيا',
    pointsRequired: 470,
    heartColor: '#f43f5e',
    heartGradient: ['#fb7185', '#e11d48'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(244, 63, 94, 0.8)',
    imagePath: '/images/hearts/lit_heart_10.png',
    unlockedPerk: 'أجنحة مزدوجة فائقة (زوجان من الأجنحة الذهبية)',
    description: 'تطور أجنحة القلب إلى زوجين مجنحين فاخرين مع تاج العرش الملكي.'
  },
  {
    level: 11,
    title: 'النخبة الياقوتية',
    pointsRequired: 560,
    heartColor: '#0284c7',
    heartGradient: ['#38bdf8', '#0369a1'],
    wings: 'radiant',
    crown: 'sapphire',
    glowColor: 'rgba(2, 132, 199, 0.85)',
    imagePath: '/images/hearts/lit_heart_11.png',
    unlockedPerk: 'أجنحة مزدوجة مع قلب وتاج الياقوت النادر وإطار الأسد المجنح',
    description: 'مرتبة النخبة الملكية العليا وتتويج شرفي خاص في المجتمع.'
  },
  {
    level: 12,
    title: 'العرش الإمبراطوري',
    pointsRequired: 660,
    heartColor: '#9333ea',
    heartGradient: ['#c084fc', '#7e22ce'],
    wings: 'imperial',
    crown: 'sovereign',
    glowColor: 'rgba(147, 51, 234, 0.9)',
    imagePath: '/images/hearts/lit_heart_12.png',
    unlockedPerk: 'أجنحة ثلاثية (3 أزواج مجنحة) وفتح إطار تنين اللهب القرمزي',
    description: '3 طبقات من أجنحة الملاك الذهبية مع تاج الإمبراطورية الكبرى.'
  },
  {
    level: 13,
    title: 'السيادة الماسية',
    pointsRequired: 770,
    heartColor: '#f59e0b',
    heartGradient: ['#fde047', '#d97706'],
    wings: 'imperial',
    crown: 'sovereign',
    glowColor: 'rgba(245, 158, 11, 0.95)',
    imagePath: '/images/hearts/lit_heart_13.png',
    unlockedPerk: '4 طبقات من الأجنحة الذهبية الشعاعية المهيبة وتاج السيادة',
    description: 'طاقة شعاعية خارقة تتجاوز حدود العادية مع 4 طبقات مجنحة.'
  },
  {
    level: 14,
    title: 'السفير الأسمى والقمة الكونية',
    pointsRequired: 900,
    heartColor: '#06b6d4',
    heartGradient: ['#67e8f9', '#0891b2'],
    wings: 'cosmic',
    crown: 'sovereign',
    glowColor: 'rgba(6, 182, 212, 1)',
    imagePath: '/images/hearts/lit_heart_14.png',
    unlockedPerk: '5 طبقات من الأجنحة السماوية الكونية المطلقة وأعلى رتبة في المنصة',
    description: 'أعلى مرتبة شرفية في تاريخ المنصة مع 5 طبقات أجنحة سماوية مضيئة.'
  }
];

export function getCharmTier(level: number): CharmTierConfig {
  const safeLevel = Math.max(0, Math.min(level, CHARM_TIERS.length - 1));
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
  if (currentLevel >= CHARM_TIERS.length - 1) return null;
  return CHARM_TIERS[currentLevel + 1];
}
