import Image from "next/image";
import { cleanAvatarUrl } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarWithFrameProps {
  avatarUrl?: string | null;
  name: string;
  frameId?: string | null; // محتفظ به للتوافقية
  size?: AvatarSize;
  level?: number;
  showLevel?: boolean;
  className?: string;
}

const SIZE_MAP: Record<
  AvatarSize,
  {
    container: string;
    px: number;
    initialsText: string;
    badgeText: string;
  }
> = {
  xs: {
    container: "w-7 h-7",
    px: 28,
    initialsText: "text-[10px]",
    badgeText: "text-[7px] px-0.5 py-0 -bottom-1",
  },
  sm: {
    container: "w-9 h-9",
    px: 36,
    initialsText: "text-xs",
    badgeText: "text-[8px] px-1 py-0 -bottom-1",
  },
  md: {
    container: "w-11 h-11",
    px: 44,
    initialsText: "text-sm",
    badgeText: "text-[9px] px-1.5 py-0.5 -bottom-1.5",
  },
  lg: {
    container: "w-16 h-16",
    px: 64,
    initialsText: "text-base",
    badgeText: "text-[10px] px-2 py-0.5 -bottom-2",
  },
  xl: {
    container: "w-20 h-20",
    px: 80,
    initialsText: "text-lg",
    badgeText: "text-xs px-2.5 py-0.5 -bottom-2.5",
  },
  "2xl": {
    container: "w-24 h-24",
    px: 96,
    initialsText: "text-xl",
    badgeText: "text-xs px-3 py-1 -bottom-3",
  },
};

function getInitials(name: string): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`;
  }
  return name.slice(0, 2);
}

export function AvatarWithFrame({
  avatarUrl,
  name,
  size = "md",
  level,
  showLevel = false,
  className = "",
}: AvatarWithFrameProps) {
  const cfg = SIZE_MAP[size];
  const initials = getInitials(name);

  // ترقية رابط الصورة وتنظيفه
  const highResAvatarUrl = cleanAvatarUrl(avatarUrl);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${cfg.container} ${className}`}
    >
      {/* ── الدائرة الرئيسية للأفاتار (Clean Round Avatar) ── */}
      <div className="relative h-full w-full overflow-hidden rounded-full border border-border/80 bg-muted/60 shadow-sm flex items-center justify-center dark:border-white/15 dark:bg-zinc-900/80">
        {highResAvatarUrl ? (
          <Image
            src={highResAvatarUrl}
            alt={name}
            width={cfg.px * 2}
            height={cfg.px * 2}
            quality={95}
            unoptimized={highResAvatarUrl.startsWith("http") || highResAvatarUrl.endsWith(".svg")}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className={`font-extrabold text-gold-deep dark:text-gold-light select-none ${cfg.initialsText}`}>
            {initials}
          </span>
        )}
      </div>

      {/* ── شارة المستوى السفلي (Lv.X) ── */}
      {showLevel && typeof level === "number" && (
        <span
          className={`absolute z-20 rounded-full font-black text-night shadow-md tracking-tight border border-white/50 bg-gradient-to-r from-gold to-gold-light ${cfg.badgeText}`}
        >
          Lv.{level}
        </span>
      )}
    </div>
  );
}
