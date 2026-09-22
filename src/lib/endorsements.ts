// ═══════════════════════════════════════════════════════════════
//  نظام التفاعلات والتقديرات الأكاديمية والتقنية الراقية
//  Tech & Impact Endorsements — بديل راقٍ لإيموجيات السوشيال ميديا البدائية
// ═══════════════════════════════════════════════════════════════

export type EndorsementKey = "ROCKET" | "IDEA" | "APPLAUSE" | "ENERGY" | "GEM";

export interface EndorsementMeta {
  key: EndorsementKey;
  label: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  activeRing: string;
}

export const ENDORSEMENTS: Record<EndorsementKey, EndorsementMeta> = {
  ROCKET: {
    key: "ROCKET",
    label: "إبداع",
    title: "انطلاق وإبداع",
    emoji: "🚀",
    description: "أفكار استثنائية وانطلاقة تقنية رائدة",
    color: "text-amber-500 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
    badgeBorder: "border-amber-500/30",
    activeRing: "ring-1 ring-amber-400/50 bg-amber-500/20 text-amber-500 dark:text-amber-300 font-black",
  },
  IDEA: {
    key: "IDEA",
    label: "فكرة ملهمة",
    title: "فكرة ملهمة",
    emoji: "💡",
    description: "رؤية ذكية ومحتوى يثري ويفيد الآخرين",
    color: "text-yellow-500 dark:text-yellow-400",
    badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    badgeBorder: "border-yellow-500/30",
    activeRing: "ring-1 ring-yellow-400/50 bg-yellow-500/20 text-yellow-500 dark:text-yellow-300 font-black",
  },
  APPLAUSE: {
    key: "APPLAUSE",
    label: "فخر وتقدير",
    title: "فخر وتقدير",
    emoji: "👏",
    description: "كل الاحترام والتقدير لهذا الجهد المتميز",
    color: "text-emerald-500 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    activeRing: "ring-1 ring-emerald-400/50 bg-emerald-500/20 text-emerald-500 dark:text-emerald-300 font-black",
  },
  ENERGY: {
    key: "ENERGY",
    label: "حماس وطاقة",
    title: "حماس وطاقة",
    emoji: "⚡",
    description: "طاقة إيجابية وشغف متواصل للتعلم والإنتاج",
    color: "text-violet-500 dark:text-violet-400",
    badgeBg: "bg-violet-500/10 dark:bg-violet-500/15",
    badgeBorder: "border-violet-500/30",
    activeRing: "ring-1 ring-violet-400/50 bg-violet-500/20 text-violet-500 dark:text-violet-300 font-black",
  },
  GEM: {
    key: "GEM",
    label: "تميّز ودعم",
    title: "تميّز ودعم",
    emoji: "💎",
    description: "محتوى نفيس ذو قيمة أكاديمية أو تقنية نادرة",
    color: "text-cyan-500 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    badgeBorder: "border-cyan-500/30",
    activeRing: "ring-1 ring-cyan-400/50 bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 font-black",
  },
};

export const ENDORSEMENT_KEYS: EndorsementKey[] = ["ROCKET", "IDEA", "APPLAUSE", "ENERGY", "GEM"];

/**
 * تطبيع التفاعلات القديمة (LIKE, LOVE...) إلى منظومة التقديرات الاحترافية
 */
export function normalizeEndorsement(raw?: string | null): EndorsementKey {
  if (!raw) return "ROCKET";
  const upper = raw.toUpperCase().trim();
  if (upper === "LIKE") return "ROCKET";
  if (upper === "LOVE") return "GEM";
  if (upper === "HAHA") return "ENERGY";
  if (upper === "WOW") return "IDEA";
  if (upper === "SAD" || upper === "ANGRY") return "APPLAUSE";
  if (upper in ENDORSEMENTS) return upper as EndorsementKey;
  return "ROCKET";
}
