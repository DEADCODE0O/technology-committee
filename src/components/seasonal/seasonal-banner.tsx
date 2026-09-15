"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";

export function SeasonalBanner({
  text,
  icon,
  accentColor,
}: {
  text: string;
  icon?: string;
  accentColor?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !text) return null;

  return (
    <aside
      aria-label="شريط المناسبة الاحتفالي"
      className="relative z-50 border-b border-white/10 bg-gradient-to-r from-night via-surface to-night px-4 py-2.5 text-center text-xs font-bold text-zinc-100 shadow-md backdrop-blur-md"
      style={{
        borderBottomColor: accentColor ? `${accentColor}40` : undefined,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-center gap-2">
          {icon ? (
            <span className="text-base" aria-hidden="true">{icon}</span>
          ) : (
            <Sparkles className="h-4 w-4 text-gold-light shrink-0" />
          )}
          <span className="leading-relaxed">{text}</span>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="إغلاق شريط التهنئة"
          className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
