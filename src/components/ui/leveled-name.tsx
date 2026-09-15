import { Crown, Sparkles, Gem } from "lucide-react";
import { getAccountFlair, type CrownTier } from "@/lib/account-style";

// ═══════════════════════════════════════════════════════════════
//  «الاسم المتدرج» — اسم الطالب يتحسن مظهره مع كل مستوى:
//  عادي → ملون → ذهبي متدرج → توهج + تاج → لمعان متحرك + هالة
//  (مكوّن خادم نقي بلا hooks — يُستخدم في التعليقات والمتصدرون
//   والملف الشخصي ومنشورات المجتمع، ويتكيف مع الوضعين تلقائيًا)
// ═══════════════════════════════════════════════════════════════

const CROWN_RENDER: Record<CrownTier, { icon: typeof Crown; cls: string }> = {
  none: { icon: Crown, cls: "" },
  mini: { icon: Crown, cls: "h-3 w-3 text-amber-500 dark:text-amber-400" },
  royal: { icon: Crown, cls: "h-3.5 w-3.5 text-amber-500 dark:text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.55)]" },
  imperial: { icon: Gem, cls: "h-3.5 w-3.5 text-violet-500 dark:text-violet-300 drop-shadow-[0_0_5px_rgba(139,92,246,0.6)]" },
  cosmic: { icon: Sparkles, cls: "h-4 w-4 text-cyan-500 dark:text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.7)]" },
};
const SIZE_MAP = {
  xs: { text: "text-xs", chip: "text-[8px] px-1 py-px", gap: "gap-1", truncate: "max-w-[110px]" },
  sm: { text: "text-sm", chip: "text-[9px] px-1.5 py-0.5", gap: "gap-1.5", truncate: "max-w-[160px]" },
  md: { text: "text-base", chip: "text-[10px] px-2 py-0.5", gap: "gap-1.5", truncate: "max-w-[240px]" },
  lg: { text: "text-lg sm:text-xl", chip: "text-[11px] px-2.5 py-0.5", gap: "gap-2", truncate: "max-w-full" },
  xl: { text: "text-xl sm:text-2xl", chip: "text-xs px-3 py-1", gap: "gap-2", truncate: "max-w-full" },
} as const;

interface LeveledNameProps {
  name: string;
  level?: number;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  /** إظهار شارة رقم المستوى بجانب الاسم */
  showLevelChip?: boolean;
  /** قص الاسم الطويل */
  truncate?: boolean;
}

export function LeveledName({
  name,
  level = 0,
  size = "sm",
  className = "",
  showLevelChip = true,
  truncate = true,
}: LeveledNameProps) {
  const flair = getAccountFlair(level);
  const sizeCfg = SIZE_MAP[size];
  const crown = CROWN_RENDER[flair.crown];
  const showCrown = flair.crown !== "none";
  const showChip = showLevelChip && level > 0;

  return (
    <span className={`inline-flex min-w-0 items-center ${sizeCfg.gap} ${className}`}>
      {showCrown && (
        <span className="shrink-0" aria-hidden="true" title={flair.rankTitle}>
          <crown.icon className={crown.cls} />
        </span>
      )}
      <span
        className={`min-w-0 font-extrabold ${sizeCfg.text} ${flair.nameCls} ${
          truncate ? `truncate ${sizeCfg.truncate}` : ""
        }`}
        title={`${name} — ${flair.rankTitle} (مستوى ${level})`}
      >
        {name}
      </span>
      {showChip && (
        <span
          className={`shrink-0 inline-flex items-center justify-center rounded-md border font-black leading-none ${sizeCfg.chip} ${flair.chipCls}`}
        >
          {level}
        </span>
      )}
      {flair.halo && level >= 13 && (
        <span
          className="shrink-0 account-name-star"
          aria-hidden="true"
        >
          ✦
        </span>
      )}
    </span>
  );
}
