import Image from "next/image";
import { getAvatarFrame, type AvatarFrame } from "@/lib/avatar-frames";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarWithFrameProps {
  avatarUrl?: string | null;
  name: string;
  frameId?: string | null;
  size?: AvatarSize;
  level?: number;
  showLevel?: boolean;
  className?: string;
}

const SIZE_MAP: Record<
  AvatarSize,
  {
    containerWithFrame: string;
    containerNoFrame: string;
    avatarWithFrame: string;
    avatarNoFrame: string;
    avatarPxWithFrame: number;
    avatarPxNoFrame: number;
    frameSize: string;
    badgeText: string;
  }
> = {
  xs: {
    containerWithFrame: "w-8 h-8",
    containerNoFrame: "w-6 h-6",
    avatarWithFrame: "w-4.5 h-4.5",
    avatarNoFrame: "w-6 h-6",
    avatarPxWithFrame: 18,
    avatarPxNoFrame: 24,
    frameSize: "w-full h-full",
    badgeText: "text-[7px] px-0.5 py-0 -bottom-1",
  },
  sm: {
    containerWithFrame: "w-14 h-14",
    containerNoFrame: "w-9 h-9",
    avatarWithFrame: "w-7 h-7",
    avatarNoFrame: "w-9 h-9",
    avatarPxWithFrame: 28,
    avatarPxNoFrame: 36,
    frameSize: "w-full h-full",
    badgeText: "text-[8px] px-1 py-0 -bottom-1",
  },
  md: {
    containerWithFrame: "w-20 h-20",
    containerNoFrame: "w-11 h-11",
    avatarWithFrame: "w-10 h-10",
    avatarNoFrame: "w-11 h-11",
    avatarPxWithFrame: 40,
    avatarPxNoFrame: 44,
    frameSize: "w-full h-full",
    badgeText: "text-[9px] px-1.5 py-0.5 -bottom-1.5",
  },
  lg: {
    containerWithFrame: "w-28 h-28",
    containerNoFrame: "w-14 h-14",
    avatarWithFrame: "w-14 h-14",
    avatarNoFrame: "w-14 h-14",
    avatarPxWithFrame: 56,
    avatarPxNoFrame: 56,
    frameSize: "w-full h-full",
    badgeText: "text-[10px] px-2 py-0.5 -bottom-2",
  },
  xl: {
    containerWithFrame: "w-36 h-36",
    containerNoFrame: "w-20 h-20",
    avatarWithFrame: "w-18 h-18",
    avatarNoFrame: "w-20 h-20",
    avatarPxWithFrame: 72,
    avatarPxNoFrame: 80,
    frameSize: "w-full h-full",
    badgeText: "text-xs px-2.5 py-0.5 -bottom-2.5",
  },
  "2xl": {
    containerWithFrame: "w-44 h-44",
    containerNoFrame: "w-24 h-24",
    avatarWithFrame: "w-22 h-22",
    avatarNoFrame: "w-24 h-24",
    avatarPxWithFrame: 88,
    avatarPxNoFrame: 96,
    frameSize: "w-full h-full",
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
  frameId,
  size = "md",
  level,
  showLevel = false,
  className = "",
}: AvatarWithFrameProps) {
  const frame = getAvatarFrame(frameId);
  const cfg = SIZE_MAP[size];
  const initials = getInitials(name);
  const hasFrame = Boolean(frame && frame.imageSrc);

  // أنيميشن ضوئي هادئ وثابت دون أي حركة تزعج المستخدم أو تخرج عن الحدود
  const animClass = frame
    ? frame.animationType === "pulse"
      ? "anim-frame-pulse"
      : frame.animationType === "spin-slow"
      ? "anim-frame-pulse"
      : frame.animationType === "neon-flow"
      ? "anim-frame-neon"
      : frame.animationType === "fire-flicker"
      ? "anim-frame-fire"
      : frame.animationType === "wings-float"
      ? "anim-frame-pulse"
      : frame.animationType === "shimmer"
      ? "anim-frame-shimmer"
      : frame.animationType === "cosmic-orbit"
      ? "anim-frame-orbit"
      : frame.animationType === "royal-crest"
      ? "anim-frame-royal"
      : "anim-frame-pulse"
    : "";

  const containerCls = hasFrame ? cfg.containerWithFrame : cfg.containerNoFrame;
  const avatarCls = hasFrame ? cfg.avatarWithFrame : cfg.avatarNoFrame;
  const avatarPx = hasFrame ? cfg.avatarPxWithFrame : cfg.avatarPxNoFrame;

  // تنظيف وترقية رابط الصورة ليظهر بأعلى دقة ممكنة دائماً
  const highResAvatarUrl = avatarUrl
    ? avatarUrl
        .replace(/=s\d+(-c)?$/i, "=s500-c")
        .replace(/height=\d+&width=\d+/i, "height=500&width=500")
    : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${containerCls} ${className}`}
      style={
        frame
          ? ({
              "--frame-glow": frame.glowColor,
              "--frame-color": frame.color,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* ── الصورة الرمزية للمستخدم (Avatar Circle) ── */}
      <div
        className={`relative overflow-hidden rounded-full bg-muted flex items-center justify-center border border-border shadow-inner z-10 dark:bg-zinc-900 dark:border-white/10 ${avatarCls}`}
      >
        {highResAvatarUrl ? (
          <Image
            src={highResAvatarUrl}
            alt={name}
            width={avatarPx * 2}
            height={avatarPx * 2}
            quality={95}
            unoptimized={highResAvatarUrl.startsWith("http")}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-extrabold text-gold-deep dark:text-zinc-300 text-xs sm:text-sm select-none">
            {initials}
          </span>
        )}
      </div>

      {/* ── مجسم الإطار ثلاثي الأبعاد الواقعي (3D VIP Graphic Frame) ── */}
      {hasFrame && frame ? (
        <div
          className={`pointer-events-none absolute flex items-center justify-center z-20 avatar-frame-layer ${cfg.frameSize}`}
          aria-hidden="true"
        >
          <img
            src={frame.imageSrc}
            alt=""
            className={`w-full h-full object-contain select-none transition-transform duration-300 ${animClass}`}
            style={{
              filter: frame.filter
                ? `${frame.filter} drop-shadow(0 0 8px ${frame.glowColor}90)`
                : `drop-shadow(0 0 8px ${frame.glowColor}90)`,
            }}
          />
        </div>
      ) : (
        /* إطار هادئ افتراضي عند عدم وجود إطار مخصص */
        <div className="pointer-events-none absolute inset-0 rounded-full border border-border dark:border-white/10" />
      )}

      {/* ── شارة المستوى السفلي (Lv.X) ── */}
      {showLevel && typeof level === "number" && (
        <span
          className={`absolute z-30 rounded-full font-black text-night shadow-lg tracking-tight border border-white/40 bg-gradient-to-r from-gold to-gold-light ${cfg.badgeText}`}
        >
          Lv.{level}
        </span>
      )}
    </div>
  );
}
