"use client";

// ═══════════════════════════════════════════════════════════════
//  شريط تبويبات قمرة القيادة والتحليلات (Analytics Nav Tabs)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldCheck, Compass, Scale, MessageSquare } from "lucide-react";

export function AnalyticsNavTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "غرفة القيادة والموقف العام",
      href: "/admin/analytics",
      icon: <Activity className="h-4 w-4" />,
      exact: true,
    },
    {
      label: "تشريح الورش والتقييم السري",
      href: "/admin/analytics/workshops",
      icon: <MessageSquare className="h-4 w-4" />,
      exact: false,
    },
    {
      label: "بوصلة الرغبات والتوجهات",
      href: "/admin/analytics/demands",
      icon: <Compass className="h-4 w-4" />,
      exact: false,
    },
    {
      label: "محاكي المفاضلة والقرارات",
      href: "/admin/analytics/decisions",
      icon: <Scale className="h-4 w-4" />,
      exact: false,
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3 text-xs font-bold">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all whitespace-nowrap ${
              isActive
                ? "bg-gold/15 text-gold-deep dark:text-gold border border-gold/30 shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
