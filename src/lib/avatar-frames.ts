// ═══════════════════════════════════════════════════════════════
// منظومة إطارات الصور الرمزية الاحترافية (Vector VIP Avatar Frames)
// إطارات متدرجة هندسياً وعقلانياً من المستوى 1 إلى المستوى 12
// تصميم مدمج محكم بنظام فيكتور نقي لا يحجب الصورة ولا يُقص في القوائم
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

export type FrameCategory = "levels";

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
  unlockHint: string;
  imageSrc?: string;
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
    badgeCls: "bg-indigo-950/40 text-indigo-300 border-indigo-600/40",
    borderCls: "border-indigo-400/60",
    color: "#818cf8",
  },
  SEASONAL: {
    label: "موسمي",
    badgeCls: "bg-emerald-950/40 text-emerald-300 border-emerald-600/40",
    borderCls: "border-emerald-400/60",
    color: "#34d399",
  },
  EXCLUSIVE: {
    label: "قمة التميز",
    badgeCls: "bg-yellow-950/40 text-yellow-300 border-yellow-600/40",
    borderCls: "border-yellow-400/60",
    color: "#ffd700",
  },
};

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "frame_lvl_1",
    name: "إطار البداية",
    category: "levels",
    tier: "BRONZE",
    requiredLevel: 1,
    description: "إطار دائري ناعم بنحاس هادئ ومصقول يمثل أولى خطواتك في المنصة.",
    icon: "🌱",
    color: "#b45309",
    glowColor: "#d97706",
    unlockHint: "متاح لجميع الطلاب عند المستوى 1 (15 نقطة)",
  },
  {
    id: "frame_lvl_2",
    name: "إطار المبادرة",
    category: "levels",
    tier: "SILVER",
    requiredLevel: 2,
    description: "إطار فضي ناعم بنقاط ارتكاز تقنية دقيقة تبرز حضورك ومبادرتك الأولية.",
    icon: "⚡",
    color: "#94a3b8",
    glowColor: "#cbd5e1",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 2 (35 نقطة)",
  },
  {
    id: "frame_lvl_3",
    name: "إطار المشاركة",
    category: "levels",
    tier: "SILVER",
    requiredLevel: 3,
    description: "حلقة فضية مصقولة بلمسات ذهبية خفيفة تعكس استمرارية مشاركتك وتفاعلك.",
    icon: "🌟",
    color: "#cbd5e1",
    glowColor: "#facc15",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 3 (65 نقطة)",
  },
  {
    id: "frame_lvl_4",
    name: "إطار النشاط",
    category: "levels",
    tier: "GOLD",
    requiredLevel: 4,
    description: "إطار ذهبي نقي بخط مزدوج أنيق يعبر عن النشاط والالتزام المستمر.",
    icon: "✨",
    color: "#eab308",
    glowColor: "#fde047",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 4 (100 نقطة)",
  },
  {
    id: "frame_lvl_5",
    name: "إطار الإنجاز",
    category: "levels",
    tier: "GOLD",
    requiredLevel: 5,
    description: "إطار ذهبي متألق بنقاط هندسية ناعمة عند الأركان لأصحاب الإنجازات المتتالية.",
    icon: "🏅",
    color: "#f59e0b",
    glowColor: "#fbbf24",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 5 (145 نقطة)",
  },
  {
    id: "frame_lvl_6",
    name: "إطار التميز",
    category: "levels",
    tier: "PLATINUM",
    requiredLevel: 6,
    description: "إطار بلاتيني سماوي مشع بهدوء وتناسق احترافي لفرسان التميز التقني.",
    icon: "💎",
    color: "#06b6d4",
    glowColor: "#22d3ee",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 6 (195 نقطة)",
  },
  {
    id: "frame_lvl_7",
    name: "إطار الموهبة",
    category: "levels",
    tier: "PLATINUM",
    requiredLevel: 7,
    description: "إطار زمردي ملكي بلمسات برونزية راقية تعكس موهبتك وإبداعك المتقن.",
    icon: "🌿",
    color: "#10b981",
    glowColor: "#34d399",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 7 (255 نقطة)",
    imageSrc: "/images/frames/frame_lvl_7.webp",
  },
  {
    id: "frame_lvl_8",
    name: "إطار الإبداع",
    category: "levels",
    tier: "DIAMOND",
    requiredLevel: 8,
    description: "إطار ياقوتي فاخر بأوجه هندسية متطورة لرواد الإبداع والتطوير.",
    icon: "🔥",
    color: "#ef4444",
    glowColor: "#f87171",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 8 (320 نقطة)",
  },
  {
    id: "frame_lvl_9",
    name: "إطار القيادة",
    category: "levels",
    tier: "MYTHIC",
    requiredLevel: 9,
    description: "إطار ذهبي ملكي بنقوش هندسية دقيقة يرمز لروح القيادة والمسؤولية.",
    icon: "🛡️",
    color: "#eab308",
    glowColor: "#ca8a04",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 9 (390 نقطة)",
  },
  {
    id: "frame_lvl_10",
    name: "إطار الرواد",
    category: "levels",
    tier: "EXCLUSIVE",
    requiredLevel: 10,
    description: "إطار كحلي وذهبي فخم مع تاج ملكي مصغر متناسق لنخبة رواد التكنولوجيا.",
    icon: "👑",
    color: "#1e3a8a",
    glowColor: "#3b82f6",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 10 (470 نقطة)",
    imageSrc: "/images/frames/frame_lvl_10.webp",
  },
  {
    id: "frame_lvl_11",
    name: "إطار النخبة",
    category: "levels",
    tier: "COSMIC",
    requiredLevel: 11,
    description: "إطار ماسي كوني بحلقات مدارية ضوئية ناعمة لنخبة المنصة المتألقة.",
    icon: "🪐",
    color: "#8b5cf6",
    glowColor: "#a78bfa",
    unlockHint: "يفتح تلقائياً عند الوصول إلى المستوى 11 (560 نقطة)",
    imageSrc: "/images/frames/frame_lvl_11.webp",
  },
  {
    id: "frame_lvl_12",
    name: "إطار القمة التكنولوجية",
    category: "levels",
    tier: "EXCLUSIVE",
    requiredLevel: 12,
    description: "أرقى وأفخم إطار بالمنصة — مزيج ملكي من الذهب والألماس النقي المصمم بأعلى دقة.",
    icon: "🏆",
    color: "#ffd700",
    glowColor: "#f59e0b",
    unlockHint: "يفتح تلقائياً عند بلوغ المستوى الأقصى للمنصة: المستوى 12 (660 نقطة)",
    imageSrc: "/images/frames/frame_lvl_12.webp",
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

  // دعم المعرفات الرقمية frame_lvl_X
  if (frameId.startsWith("frame_lvl_")) {
    const num = parseInt(frameId.replace("frame_lvl_", ""), 10);
    if (!isNaN(num)) {
      const mapped = Math.max(1, Math.min(12, num));
      return AVATAR_FRAMES.find((f) => f.id === `frame_lvl_${mapped}`) || AVATAR_FRAMES[0];
    }
  }

  // خريطة توافق للمعرفات القديمة حتى لا يتأثر أي حساب سابق
  const legacyMap: Record<string, string> = {
    frame_bronze_ring: "frame_lvl_1",
    frame_bronze_gear: "frame_lvl_1",
    frame_silver_shield: "frame_lvl_2",
    frame_cyber_matrix: "frame_lvl_2",
    frame_golden_laurel: "frame_lvl_3",
    frame_neon_rainbow: "frame_lvl_3",
    frame_platinum_knight: "frame_lvl_4",
    frame_silver_knight: "frame_lvl_4",
    frame_emerald_crown: "frame_lvl_5",
    frame_emerald_vip: "frame_lvl_5",
    frame_sapphire_crest: "frame_lvl_6",
    frame_diamond_sapphire: "frame_lvl_6",
    frame_cosmic_nebula: "frame_lvl_7",
    frame_cosmic_galaxy: "frame_lvl_7",
    frame_phoenix_rebirth: "frame_lvl_8",
    frame_phoenix_blaze: "frame_lvl_8",
    frame_ruby_warlord: "frame_lvl_8",
    frame_dragon_fire: "frame_lvl_9",
    frame_crimson_dragon: "frame_lvl_9",
    frame_lion_emperor: "frame_lvl_10",
    frame_golden_lion: "frame_lvl_10",
    frame_golden_wings: "frame_lvl_10",
    frame_angelic_wings: "frame_lvl_11",
    frame_tech_quantum: "frame_lvl_6",
    frame_royal_emperor: "frame_lvl_12",
    frame_national_honor: "frame_lvl_12",
    frame_tech_champion: "frame_lvl_12",
    frame_ramadan_crescent: "frame_lvl_4",
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
