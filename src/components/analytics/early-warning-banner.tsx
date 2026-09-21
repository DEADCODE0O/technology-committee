"use client";

// ═══════════════════════════════════════════════════════════════
//  شريط ورادار التنبيهات المبكرة (Early Warning Alert Cards)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import { AlertTriangle, AlertCircle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { EarlyWarningAlert } from "@/lib/analytics/types";

interface EarlyWarningBannerProps {
  alerts: EarlyWarningAlert[];
}

export function EarlyWarningBanner({ alerts }: EarlyWarningBannerProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <div className="text-xs">
          <p className="font-bold">كافة المؤشرات في النطاق الآمن والمثالي</p>
          <p className="opacity-90">لا توجد مخاطر تشغيلية أو فجوات حضور أو هبوط في الجودة مرصودة حالياً.</p>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (sev: EarlyWarningAlert["severity"]) => {
    switch (sev) {
      case "CRITICAL":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
          wrapper: "border-rose-500/30 bg-rose-500/[0.06]",
          badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
          titleColor: "text-rose-600 dark:text-rose-400",
          label: "إنذار حرج",
        };
      case "HIGH":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          wrapper: "border-orange-500/30 bg-orange-500/[0.06]",
          badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
          titleColor: "text-orange-600 dark:text-orange-400",
          label: "خطر مرتفع",
        };
      case "MEDIUM":
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
          wrapper: "border-amber-500/30 bg-amber-500/[0.06]",
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          titleColor: "text-amber-600 dark:text-amber-400",
          label: "تنبيه تشغيلي",
        };
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-500" />,
          wrapper: "border-blue-500/30 bg-blue-500/[0.06]",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
          titleColor: "text-blue-600 dark:text-blue-400",
          label: "ملاحظة",
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h4 className="font-heading text-sm font-bold text-foreground">
            تنبيهات الإنذار المبكر ورصد المخاطر ({alerts.length})
          </h4>
        </div>
        <span className="text-[11px] text-muted-foreground">خوارزميات فحص الشذوذ اللحظي</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {alerts.slice(0, 4).map((alert) => {
          const style = getSeverityBadge(alert.severity);
          return (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 transition-all shadow-xs ${style.wrapper}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {style.icon}
                  <h5 className={`font-bold text-xs ${style.titleColor}`}>{alert.title}</h5>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                  {style.label}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                {alert.description}
              </p>

              {alert.metricValue && (
                <div className="mt-2 inline-flex items-center gap-1 rounded bg-background/60 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                  <span>المؤشر المرصود:</span>
                  <span>{alert.metricValue}</span>
                </div>
              )}

              <div className="mt-3 border-t border-border/40 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">💡 الإجراء الوقائي المقترح: </span>
                {alert.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
