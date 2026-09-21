"use client";

// ═══════════════════════════════════════════════════════════════
//  عداد مؤشر صحة اللجنة الشامل (Committee Health Score Card)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Activity, Award, Users, HeartHandshake } from "lucide-react";
import { CommitteeHealthScore } from "@/lib/analytics/types";

interface HealthScoreDialProps {
  health: CommitteeHealthScore;
}

export function HealthScoreDial({ health }: HealthScoreDialProps) {
  // حساب نسبة الدائرة للـ SVG
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  let strokeColor = "#10b981"; // زمردي
  if (health.level === "HEALTHY") strokeColor = "#3b82f6"; // أزرق
  if (health.level === "WARNING") strokeColor = "#f59e0b"; // برتقالي
  if (health.level === "CRITICAL") strokeColor = "#f43f5e"; // أحمر

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      {/* هيدر البطاقة */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold-deep dark:text-gold">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">مؤشر صحة اللجنة الشامل (CHS)</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            مؤشر رياضي مركب يجمع بين الحضور، الجودة، التفاعل، والنمو
          </p>
        </div>

        {/* شارة الزخم (Momentum) */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            health.momentum === "RISING"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : health.momentum === "DECLINING"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
          }`}
        >
          {health.momentum === "RISING" && <TrendingUp className="h-3.5 w-3.5" />}
          {health.momentum === "DECLINING" && <TrendingDown className="h-3.5 w-3.5" />}
          {health.momentum === "STEADY" && <Minus className="h-3.5 w-3.5" />}
          <span>
            {health.momentum === "RISING" ? "في صعود مستمر" : health.momentum === "DECLINING" ? "في انحدار طفيف" : "حالة استقرار"}
          </span>
          {health.momentumVelocity !== 0 && (
            <span className="font-mono text-[10px] opacity-80" dir="ltr">
              ({health.momentumVelocity > 0 ? `+${health.momentumVelocity}` : health.momentumVelocity}%)
            </span>
          )}
        </div>
      </div>

      {/* العداد الدائري والتفاصيل */}
      <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-12">
        {/* الدائرة الدائرية الكبيرة */}
        <div className="flex flex-col items-center justify-center md:col-span-5">
          <div className="relative flex items-center justify-center">
            <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 128 128">
              {/* حلقة الخلفية */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-muted"
                strokeWidth="10"
                fill="transparent"
              />
              {/* حلقة النتيجة النشطة */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke={strokeColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* الرقم بالوسط */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
                {health.score}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">من 100</span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${health.badgeColor}`}>
              {health.statusLabel}
            </span>
          </div>
        </div>

        {/* المكونات الأربعة للمؤشر */}
        <div className="space-y-3.5 md:col-span-7">
          {/* 1. الحضور الفعلي */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-500">
                  <Activity className="h-3 w-3" />
                </span>
                <span className="font-bold text-foreground">الالتزام بالحضور (35%)</span>
              </div>
              <span className="font-mono font-bold text-foreground">{health.breakdown.attendance.actualRate}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(health.breakdown.attendance.actualRate, 100)}%` }}
              />
            </div>
          </div>

          {/* 2. الجودة والتقييم السري */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10 text-amber-500">
                  <Award className="h-3 w-3" />
                </span>
                <span className="font-bold text-foreground">جودة الورش والمحاضرين (30%)</span>
              </div>
              <span className="font-mono font-bold text-foreground">{health.breakdown.quality.actualAvg} / 5</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min((health.breakdown.quality.actualAvg / 5) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 3. استقطاب ونمو الطلاب */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-500">
                  <Users className="h-3 w-3" />
                </span>
                <span className="font-bold text-foreground">سرعة استقطاب الطلاب (20%)</span>
              </div>
              <span className="font-mono font-bold text-foreground">{health.breakdown.growth.newUsersCount} طالب جديد</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(health.breakdown.growth.score, 100)}%` }}
              />
            </div>
          </div>

          {/* 4. التفاعل والمشاركة الحية */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/10 text-purple-500">
                  <HeartHandshake className="h-3 w-3" />
                </span>
                <span className="font-bold text-foreground">التفاعل والمشاركة (15%)</span>
              </div>
              <span className="font-mono font-bold text-foreground">{health.breakdown.engagement.activeRate}% نشط</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(health.breakdown.engagement.score, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
