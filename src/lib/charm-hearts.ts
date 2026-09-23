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
    title: 'قلب الانطلاق التقني',
    pointsRequired: 0,
    heartColor: '#64748b',
    heartGradient: ['#475569', '#334155'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    unlockedPerk: 'الانضمام لمجتمع اللجنة وحضور الورش التأسيسية',
    description: 'انطلاقة مسيرتك التقنية والتعرف على مجتمع وفعاليات اللجنة التكنولوجية.',
    imageSrc: '/images/hearts/lit_heart_0.webp',
  },
  {
    level: 1,
    title: 'قلب المبادرة التكنولوجية',
    pointsRequired: 15,
    heartColor: '#cd7f32',
    heartGradient: ['#d97706', '#92400e'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(205, 127, 50, 0.45)',
    unlockedPerk: 'المشاركة في النقاشات البرمجية وإنجاز أولى المهام',
    description: 'إثبات الحضور والمبادرة الفعالة في أولى ورش العمل والمختبرات التقنية.',
    imageSrc: '/images/hearts/lit_heart_1.webp',
  },
  {
    level: 2,
    title: 'قلب التفاعل الرقمي',
    pointsRequired: 35,
    heartColor: '#94a3b8',
    heartGradient: ['#e2e8f0', '#64748b'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    unlockedPerk: 'حضور الورش التخصصية والتفاعل المباشر مع المدربين',
    description: 'التزام منتظم بالحضور والتفاعل الإيجابي مع الأنشطة والمشاريع الطلابية.',
    imageSrc: '/images/hearts/lit_heart_2.webp',
  },
  {
    level: 3,
    title: 'قلب الإنجاز التقني',
    pointsRequired: 65,
    heartColor: '#ef4444',
    heartGradient: ['#f87171', '#b91c1c'],
    wings: 'none',
    crown: 'none',
    glowColor: 'rgba(239, 68, 68, 0.55)',
    unlockedPerk: 'تسليم التكليفات التقنية والمساهمة في دعم الزملاء',
    description: 'مستوى متقدم في إنجاز المهام البرمجية والتطبيقية ومساعدة الطلاب الجدد.',
    imageSrc: '/images/hearts/lit_heart_3.webp',
  },
  {
    level: 4,
    title: 'قلب التميز البرمجي',
    pointsRequired: 100,
    heartColor: '#f59e0b',
    heartGradient: ['#fbbf24', '#b45309'],
    wings: 'mini',
    crown: 'mini',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    unlockedPerk: 'بلوغ مئوية النقاط والمشاركة في المسارات المتقدمة',
    description: 'إتمام 100 نقطة خبرة وإتقان المهارات التكنولوجية الأساسية بتفوق.',
    imageSrc: '/images/hearts/lit_heart_4.webp',
  },
  {
    level: 5,
    title: 'قلب الابتكار الرقمي',
    pointsRequired: 145,
    heartColor: '#10b981',
    heartGradient: ['#34d399', '#047857'],
    wings: 'mini',
    crown: 'crystal',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    unlockedPerk: 'تطوير مشروعات تطبيقية وطرح أفكار تقنية مبتكرة',
    description: 'تقديم حلول برمجية مبتكرة ومساهمات تقنية مميزة في فعاليات اللجنة.',
    imageSrc: '/images/hearts/lit_heart_5.webp',
  },
  {
    level: 6,
    title: 'قلب الاحتراف التكنولوجي',
    pointsRequired: 195,
    heartColor: '#0284c7',
    heartGradient: ['#38bdf8', '#0369a1'],
    wings: 'golden',
    crown: 'royal',
    glowColor: 'rgba(2, 132, 199, 0.7)',
    unlockedPerk: 'المنافسة في التحديات البرمجية والتصفيات المتقدمة',
    description: 'أداء احترافي عالي في حل المشكلات البرمجية ومواكبة أحدث التقنيات.',
    imageSrc: '/images/hearts/lit_heart_6.webp',
  },
  {
    level: 7,
    title: 'قلب القيادة الهندسية',
    pointsRequired: 255,
    heartColor: '#a855f7',
    heartGradient: ['#c084fc', '#7e22ce'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    unlockedPerk: 'قيادة الفرق الطلابية في الهاكاثونات والأنشطة الكبرى',
    description: 'مهارات قيادية متميزة وتوجيه الفرق لتنفيذ مشروعات هندسية رائدة.',
    imageSrc: '/images/hearts/lit_heart_7.webp',
  },
  {
    level: 8,
    title: 'قلب الخبرة التقنية',
    pointsRequired: 320,
    heartColor: '#f59e0b',
    heartGradient: ['#fde047', '#b45309'],
    wings: 'radiant',
    crown: 'royal',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    unlockedPerk: 'مكانة متقدمة في لوحة الشرف والمساهمة في التدريب',
    description: 'خبرة تقنية رصينة ومشاركات نوعية تثري المحتوى العلمي للجنة.',
    imageSrc: '/images/hearts/lit_heart_8.webp',
  },
  {
    level: 9,
    title: 'قلب هندسة الحلول',
    pointsRequired: 390,
    heartColor: '#00d2ff',
    heartGradient: ['#38bdf8', '#0284c7'],
    wings: 'radiant',
    crown: 'sovereign',
    glowColor: 'rgba(0, 210, 255, 0.85)',
    unlockedPerk: 'تصميم بنية المشروعات المتكاملة وإرشاد الطلاب',
    description: 'قدرة متقدمة على هندسة الحلول الرقمية وتقديم استشارات تقنية للزملاء.',
    imageSrc: '/images/hearts/lit_heart_9.webp',
  },
  {
    level: 10,
    title: 'قلب رواد التكنولوجيا',
    pointsRequired: 470,
    heartColor: '#dc2626',
    heartGradient: ['#f87171', '#991b1b'],
    wings: 'imperial',
    crown: 'royal',
    glowColor: 'rgba(220, 38, 38, 0.85)',
    unlockedPerk: 'رتبة شرفية عليا للرواد وصنّاع الأثر في اللجنة',
    description: 'ريادة وصدارة في كافة المحافل التقنية والمساهمة في قيادة المبادرات.',
    imageSrc: '/images/hearts/lit_heart_10.webp',
  },
  {
    level: 11,
    title: 'قلب النخبة التقنية',
    pointsRequired: 560,
    heartColor: '#f59e0b',
    heartGradient: ['#fde047', '#d97706'],
    wings: 'cosmic',
    crown: 'sovereign',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    unlockedPerk: 'وسام النخبة لأبرز المطورين والمبتكرين في المنصة',
    description: 'مرتبة فخرية رفيعة تُمنح لأكثر الطلاب تأثيراً وإبداعاً في المجال التقني.',
    imageSrc: '/images/hearts/lit_heart_11.webp',
  },
  {
    level: 12,
    title: 'وسام القمة التكنولوجية',
    pointsRequired: 660,
    heartColor: '#a855f7',
    heartGradient: ['#e879f9', '#6b21a8'],
    wings: 'cosmic',
    crown: 'sovereign',
    glowColor: 'rgba(168, 85, 247, 0.95)',
    unlockedPerk: 'أعلى تتويج شرفي في المنصة — المستوى 12 الأسمى',
    description: 'قمة الامتياز والتفوق التكنولوجي والسيادة الرقمية في مجتمع اللجنة.',
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
