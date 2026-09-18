// ═══════════════════════════════════════════════════════════════
// منظومة إطارات الصور الرمزية الاحترافية (Vector VIP Avatar Frames)
// مجموعة مميزة ومختارة بدقة من 12 إطاراً تدريجياً + إطارات البطولات والمواسم
// تصميم مدمج ومحكم بنظام فيكتور نقي لا يحجب الصورة ولا يُقص في القوائم
// ═══════════════════════════════════════════════════════════════

export type FrameTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MYTHIC"
  | "COSMIC"
  | "SEASONAL"
  | "EXCLUSIVE";

export type FrameCategory = "levels" | "seasonal" | "achievements" | "special";

export interface AvatarFrame {
  id: string;
  name: string;
  category: FrameCategory;
  tier: FrameTier;
  requiredLevel: number;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
  animationType:
    | "pulse"
    | "spin-slow"
    | "neon-flow"
    | "fire-flicker"
    | "wings-float"
    | "shimmer"
    | "cosmic-orbit"
    | "royal-crest";
  unlockHint: string;
  imageSrc?: string;
  scale?: number;
  filter?: string;
}

export const TIER_CONFIG: Record<
  FrameTier,
  { label: string; badgeCls: string; borderCls: string; color: string }
> = {
  BRONZE: {
    label: "برونزي",
    badgeCls: "bg-amber-900/30 text-amber-400 border-amber-800/40",
    borderCls: "border-amber-700/50",
    color: "#b45309",
  },
  SILVER: {
    label: "فضي",
    badgeCls: "bg-zinc-700/30 text-zinc-300 border-zinc-600/40",
    borderCls: "border-zinc-400/50",
    color: "#cbd5e1",
  },
  GOLD: {
    label: "ذهبي",
    badgeCls: "bg-amber-500/20 text-gold-light border-gold/40",
    borderCls: "border-gold/60",
    color: "#c9a45c",
  },
  PLATINUM: {
    label: "بلاتيني",
    badgeCls: "bg-cyan-950/40 text-cyan-300 border-cyan-700/40",
    borderCls: "border-cyan-400/60",
    color: "#22d3ee",
  },
  DIAMOND: {
    label: "ألماسي",
    badgeCls: "bg-blue-950/40 text-blue-300 border-blue-600/40",
    borderCls: "border-blue-400/60",
    color: "#60a5fa",
  },
  MYTHIC: {
    label: "أسطوري",
    badgeCls: "bg-purple-950/40 text-purple-300 border-purple-600/40",
    borderCls: "border-purple-400/60",
    color: "#c084fc",
  },
  COSMIC: {
    label: "كوني إمبراطوري",
    badgeCls: "bg-rose-950/40 text-rose-300 border-rose-600/40",
    borderCls: "border-rose-400/60",
    color: "#fb7185",
  },
  SEASONAL: {
    label: "موسمي",
    badgeCls: "bg-emerald-950/40 text-emerald-300 border-emerald-600/40",
    borderCls: "border-emerald-400/60",
    color: "#34d399",
  },
  EXCLUSIVE: {
    label: "حصري VIP",
    badgeCls: "bg-yellow-950/40 text-yellow-300 border-yellow-600/40",
    borderCls: "border-yellow-400/60",
    color: "#facc15",
  },
};

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "frame_lvl_1",
    name: "طوق البرونز النحاسي الأنيق",
    category: "levels",
    tier: "BRONZE",
    requiredLevel: 1,
    description: "إطار معدني ناعم وأنيق يزين بداية انطلاقتك ومشاركتك في أنشطة اللجنة.",
    icon: "⚙️",
    color: "#b45309",
    glowColor: "#d97706",
    animationType: "pulse",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 1 (15 نقطة)",
  },
  {
    id: "frame_lvl_2",
    name: "النواة الفضية السيبرانية",
    category: "levels",
    tier: "SILVER",
    requiredLevel: 2,
    description: "مصفوفة رقمية فضية ودوائر ذكية متوهجة تميز الطالب المتفاعل والمبادر.",
    icon: "⚡",
    color: "#94a3b8",
    glowColor: "#cbd5e1",
    animationType: "pulse",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 2 (35 نقطة)",
  },
  {
    id: "frame_lvl_3",
    name: "الهالة الذهبية المتوهجة",
    category: "levels",
    tier: "GOLD",
    requiredLevel: 3,
    description: "إطار ذهبي مصقول مرصع بماسات رقيقة عند الأركان لأصحاب النشاط المستمر.",
    icon: "✨",
    color: "#eab308",
    glowColor: "#facc15",
    animationType: "neon-flow",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 3 (65 نقطة)",
  },
  {
    id: "frame_lvl_4",
    name: "درع البلاتين الصقيعي",
    category: "levels",
    tier: "PLATINUM",
    requiredLevel: 4,
    description: "درع بلاتيني بلوري مع أطياف ضوئية سماوية لنجم الورش المتألق.",
    icon: "🛡️",
    color: "#22d3ee",
    glowColor: "#38bdf8",
    animationType: "shimmer",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 4 (100 نقطة)",
  },
  {
    id: "frame_lvl_5",
    name: "درع الزمرد الملكي المذهب",
    category: "levels",
    tier: "PLATINUM",
    requiredLevel: 5,
    description: "أجنحة زمردية محاطة بإطار من الذهب الخالص لخبراء التكنولوجيا.",
    icon: "💎",
    color: "#10b981",
    glowColor: "#34d399",
    animationType: "shimmer",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 5 (145 نقطة)",
  },
  {
    id: "frame_lvl_6",
    name: "صرح الياقوت الأزرق الملكي",
    category: "levels",
    tier: "DIAMOND",
    requiredLevel: 6,
    description: "إطار ماسي فاخر مرصع بأحجار الياقوت الأزرق لفرسان الإبداع.",
    icon: "👑",
    color: "#3b82f6",
    glowColor: "#60a5fa",
    animationType: "shimmer",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 6 (195 نقطة)",
  },
  {
    id: "frame_lvl_7",
    name: "سديم الجمشت النجمي",
    category: "levels",
    tier: "COSMIC",
    requiredLevel: 7,
    description: "حلقات طيفية بنفسجية ومشاعل كوكبية متلألئة من أعماق الفضاء.",
    icon: "🌌",
    color: "#a855f7",
    glowColor: "#c084fc",
    animationType: "cosmic-orbit",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 7 (255 نقطة)",
  },
  {
    id: "frame_lvl_8",
    name: "صعود الفينيق الناري",
    category: "levels",
    tier: "MYTHIC",
    requiredLevel: 8,
    description: "أجنحة طائر الفينيق المتقدة وشعلة الصعود الأسطورية لأبطال المنصة.",
    icon: "🔥",
    color: "#f97316",
    glowColor: "#ea580c",
    animationType: "fire-flicker",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 8 (320 نقطة)",
  },
  {
    id: "frame_lvl_9",
    name: "تنين الشرف القرمزي الملكي",
    category: "levels",
    tier: "MYTHIC",
    requiredLevel: 9,
    description: "درع التنين القرمزي المهيب بحراشف نارية متقدة لرواد الابتكار.",
    icon: "🐉",
    color: "#ef4444",
    glowColor: "#dc2626",
    animationType: "fire-flicker",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 9 (390 نقطة)",
  },
  {
    id: "frame_lvl_10",
    name: "التاج الإمبراطوري الذهبي",
    category: "levels",
    tier: "EXCLUSIVE",
    requiredLevel: 10,
    description: "تاج ملكي شامخ مرصع بالألماس لفرسان أساطير التكنولوجيا.",
    icon: "👑",
    color: "#eab308",
    glowColor: "#ca8a04",
    animationType: "royal-crest",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 10 (470 نقطة)",
  },
  {
    id: "frame_lvl_11",
    name: "سديم المجرة والمدارات الكونية",
    category: "levels",
    tier: "COSMIC",
    requiredLevel: 11,
    description: "مدارات كوكبية وجزيئات بولسار مضيئة لنخبة المنصة الياقوتية العليا.",
    icon: "🪐",
    color: "#0284c7",
    glowColor: "#38bdf8",
    animationType: "cosmic-orbit",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 11 (560 نقطة)",
  },
  {
    id: "frame_lvl_12",
    name: "العرش الكوني الأسمى — القمة الملكية",
    category: "levels",
    tier: "EXCLUSIVE",
    requiredLevel: 12,
    description: "تاج العرش الإمبراطوري الأسمى محاط بهالة المدارات السماوية والنجوم الرباعية — قمة الشرف والتميز.",
    icon: "💎",
    color: "#ffd700",
    glowColor: "#eab308",
    animationType: "royal-crest",
    unlockHint: "يفتح تلقائياً عند الوصول إلى أعلى مستويات المنصة المستوى 12 (660 نقطة)",
  },
  {
    id: "frame_tech_champion",
    name: "وسام بطل التكنولوجيا والهاكاثون",
    category: "achievements",
    tier: "EXCLUSIVE",
    requiredLevel: 1,
    description: "وسام الشرف والريادة للفائزين في مسابقات وهاكاثونات اللجنة التكنولوجية.",
    icon: "🏆",
    color: "#06b6d4",
    glowColor: "#38bdf8",
    animationType: "royal-crest",
    unlockHint: "يمنح حصرياً لأبطال مسابقات التكنولوجيا والهاكاثون",
  },
  {
    id: "frame_ramadan_crescent",
    name: "هلال وفانوس رمضان الملكي",
    category: "seasonal",
    tier: "SEASONAL",
    requiredLevel: 1,
    description: "إطار رمضاني إسلامي فخم بهلال مذهب وفانوس مضيء احتفاءً بالشهر الفضيل.",
    icon: "🌙",
    color: "#f59e0b",
    glowColor: "#fbbf24",
    animationType: "shimmer",
    unlockHint: "متاح ومجاني لجميع الطلاب طوال شهر رمضان المبارك",
  },
  {
    id: "frame_angelic_wings",
    name: "أجنحة النور والملائكية الملكية",
    category: "special",
    tier: "EXCLUSIVE",
    requiredLevel: 5,
    description: "أجنحة ملائكية نقية ومضيئة مشعة بهالة سماوية مهيبة للمتميزين وأصحاب الهمم العالية.",
    icon: "🪽",
    color: "#f8fafc",
    glowColor: "#38bdf8",
    animationType: "wings-float",
    unlockHint: "إطار أسطوري نادر متاح للمتميزين بدءاً من المستوى 5",
  },
  {
    id: "frame_tech_quantum",
    name: "مفاعل السايبر والكم التكنولوجي",
    category: "special",
    tier: "PLATINUM",
    requiredLevel: 4,
    description: "دوائر رقمية ومفاعل كمي متدفق بألوان السايبربانك والتكنولوجيا المتقدمة.",
    icon: "⚡",
    color: "#06b6d4",
    glowColor: "#22d3ee",
    animationType: "neon-flow",
    unlockHint: "إطار تقني حصري لرواد التكنولوجيا بدءاً من المستوى 4",
  },
];

/**
 * الحصول على كائن الإطار بمعرفه
 */
export function getAvatarFrame(frameId?: string | null): AvatarFrame | null {
  if (!frameId) return null;

  // فحص مباشر
  const exact = AVATAR_FRAMES.find((f) => f.id === frameId);
  if (exact) return exact;

  // دعم المعرفات القديمة لضمان عدم حدوث أي خطأ في الحسابات القديمة
  if (frameId.startsWith("frame_lvl_")) {
    const num = parseInt(frameId.replace("frame_lvl_", ""), 10);
    if (!isNaN(num)) {
      const mapped = Math.max(1, Math.min(12, num));
      return AVATAR_FRAMES.find((f) => f.id === `frame_lvl_${mapped}`) || AVATAR_FRAMES[0];
    }
  }

  const legacyMap: Record<string, string> = {
    frame_bronze_ring: "frame_lvl_1",
    frame_bronze_gear: "frame_lvl_1",
    frame_silver_shield: "frame_lvl_2",
    frame_golden_laurel: "frame_lvl_3",
    frame_neon_rainbow: "frame_lvl_3",
    frame_cyber_matrix: "frame_lvl_2",
    frame_platinum_knight: "frame_lvl_4",
    frame_silver_knight: "frame_lvl_4",
    frame_emerald_crown: "frame_lvl_5",
    frame_emerald_vip: "frame_lvl_5",
    frame_sapphire_crest: "frame_lvl_6",
    frame_diamond_sapphire: "frame_lvl_6",
    frame_ruby_warlord: "frame_lvl_8",
    frame_cosmic_nebula: "frame_lvl_7",
    frame_cosmic_galaxy: "frame_lvl_7",
    frame_phoenix_rebirth: "frame_lvl_8",
    frame_phoenix_blaze: "frame_lvl_8",
    frame_dragon_fire: "frame_lvl_9",
    frame_crimson_dragon: "frame_lvl_9",
    frame_lion_emperor: "frame_lvl_10",
    frame_golden_lion: "frame_lvl_10",
    frame_golden_wings: "frame_lvl_10",
    frame_royal_emperor: "frame_tech_champion",
    frame_national_honor: "frame_tech_champion",
  };

  const mappedId = legacyMap[frameId];
  if (mappedId) {
    return AVATAR_FRAMES.find((f) => f.id === mappedId) || null;
  }

  return null;
}

/**
 * فحص هل الإطار متاح للمستخدم بناءً على مستواه
 */
export function isFrameUnlocked(
  frame: AvatarFrame,
  userLevel: number,
  isSeasonalActive: boolean = true
): boolean {
  if (frame.category === "levels") {
    return userLevel >= frame.requiredLevel;
  }
  if (frame.category === "seasonal") {
    return isSeasonalActive;
  }
  return userLevel >= frame.requiredLevel;
}

/**
 * الحصول على كافة الإطارات المفتوحة لمستوى معين
 */
export function getUnlockedFramesForLevel(level: number): AvatarFrame[] {
  return AVATAR_FRAMES.filter((f) => isFrameUnlocked(f, level));
}
