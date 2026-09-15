"use client";

// ═══════════════════════════════════════════════════════════════
//  زر الإجراء (CTA) — «انضم للجروب» / «افتح المادة» ...
//  أيقونة ولون حسب نوع الرابط (واتساب/درايف/تليجرام...)
// ═══════════════════════════════════════════════════════════════

import { LINK_TYPE_ICONS, LINK_TYPE_COLORS, LINK_TYPE_LABELS } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";

export function CtaLink({
  label,
  url,
  linkType,
  newTab = true,
  size = "md",
  onClick,
}: {
  label: string;
  url: string;
  linkType?: string | null;
  newTab?: boolean;
  size?: "md" | "lg";
  onClick?: () => void;
}) {
  const type = linkType || "LINK";
  const icon = LINK_TYPE_ICONS[type] ?? "🔗";
  const color = LINK_TYPE_COLORS[type] ?? "#c9a45c";
  const typeName = LINK_TYPE_LABELS[type];

  return (
    <a
      href={safeExternalUrl(url)}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer noopener" : undefined}
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 font-extrabold transition-all hover:-translate-y-0.5 active:translate-y-0"
      style={{
        borderColor: `${color}55`,
        background: `linear-gradient(180deg, ${color}22, ${color}10)`,
        color,
        fontSize: size === "lg" ? "15px" : "13.5px",
        boxShadow: `0 8px 24px -12px ${color}66`,
      }}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
      <span className="opacity-0 transition-opacity group-hover:opacity-70" style={{ fontSize: 11 }}>
        {typeName} ↗
      </span>
    </a>
  );
}
