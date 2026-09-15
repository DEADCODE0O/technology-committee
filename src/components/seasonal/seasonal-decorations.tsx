import { type SiteThemeDefinition } from "@/lib/site-theme-defs";

export function SeasonalDecorations({ theme }: { theme: SiteThemeDefinition }) {
  if (theme.id === "default" || theme.decorations === "none") {
    return null;
  }

  // 🌙 زينة رمضان: هلال وفوانيس متحركة خفيفة في زوايا الموقع
  if (theme.decorations === "crescent_lanterns") {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        aria-hidden="true"
      >
        {/* هلال وفانوس في أعلى الزاوية اليسرى */}
        <div className="absolute -top-4 -left-4 w-28 h-28 opacity-40 transition-opacity duration-1000">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]">
            <path d="M50,15 A35,35 0 1,0 85,50 A28,28 0 1,1 50,15 Z" />
          </svg>
        </div>
        {/* فانوس معلق في أعلى الزاوية اليمنى */}
        <div className="absolute top-0 right-8 w-8 h-20 opacity-35 animate-bounce [animation-duration:5s]">
          <svg viewBox="0 0 40 100" className="w-full h-full stroke-amber-400 fill-amber-500/30">
            <line x1="20" y1="0" x2="20" y2="25" strokeWidth="1.5" stroke="#eab308" />
            <polygon points="12,25 28,25 35,40 5,40" strokeWidth="1" />
            <rect x="8" y="40" width="24" height="35" rx="3" strokeWidth="1" />
            <circle cx="20" cy="57" r="5" fill="#facc15" className="animate-pulse" />
            <polygon points="5,75 35,75 28,90 12,90" strokeWidth="1" />
            <line x1="20" y1="90" x2="20" y2="100" strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  }

  // ❄️ زينة رأس السنة: بريق النجوم والشهب
  if (theme.decorations === "winter_stars") {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-6 left-12 text-sky-400/40 text-xl animate-pulse [animation-duration:3s]">✦</div>
        <div className="absolute top-16 right-16 text-cyan-300/30 text-2xl animate-pulse [animation-duration:4s]">✧</div>
        <div className="absolute top-28 left-1/4 text-sky-200/25 text-sm animate-ping-soft">❄</div>
        <div className="absolute top-10 right-1/3 text-sky-300/30 text-lg animate-pulse [animation-duration:5s]">✦</div>
      </div>
    );
  }

  // 🎉 زينة الأعياد والاحتفالات
  if (theme.decorations === "festive_confetti" || theme.decorations === "sacred_stars") {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-6 left-10 text-amber-400/40 text-lg animate-pulse">✨</div>
        <div className="absolute top-12 right-12 text-pink-400/35 text-xl animate-pulse [animation-duration:3.5s]">★</div>
        <div className="absolute top-24 right-1/4 text-yellow-300/30 text-sm animate-pulse [animation-duration:4.5s]">✦</div>
        <div className="absolute top-8 left-1/3 text-emerald-400/30 text-base animate-pulse [animation-duration:5s]">✨</div>
      </div>
    );
  }

  return null;
}
