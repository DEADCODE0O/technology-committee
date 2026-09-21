"use client";

// ═══════════════════════════════════════════════════════════════
//  مخططات التوزيع الديموغرافي للطلاب (Demographics Pie & Donut Charts)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, GraduationCap, Building2, UserCheck } from "lucide-react";
import { DemographicDistribution } from "@/lib/analytics/types";

interface DemographicsChartsProps {
  gradeDistribution: DemographicDistribution[];
  sectionDistribution: DemographicDistribution[];
  genderDistribution: DemographicDistribution[];
}

export function DemographicsCharts({
  gradeDistribution,
  sectionDistribution,
  genderDistribution,
}: DemographicsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* مخطط توزيع الفرق الدراسية */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                توزيع الطلاب حسب الفرق الدراسية
              </h4>
              <p className="text-[11px] text-muted-foreground">تحديد الشريحة العمرية والأكاديمية الأكثر نشاطاً</p>
            </div>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="label"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#10b981"} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DemographicDistribution;
                      return (
                        <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.label}</p>
                          <p className="font-mono text-muted-foreground">
                            {data.count} طالب ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* مفتاح المخطط */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs">
            {gradeDistribution.map((g) => (
              <div key={g.key} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-muted-foreground text-[11px]">{g.label}</span>
                </div>
                <span className="font-mono font-bold text-foreground">{g.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* مخطط توزيع الشعب الأكاديمية */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                توزيع الطلاب حسب الأقسام والشعب
              </h4>
              <p className="text-[11px] text-muted-foreground">توجيه محتوى الورش بما يناسب كل تخصص</p>
            </div>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="label"
                >
                  {sectionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#06b6d4"} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DemographicDistribution;
                      return (
                        <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.label}</p>
                          <p className="font-mono text-muted-foreground">
                            {data.count} طالب ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* مفتاح المخطط */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs">
            {sectionDistribution.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground text-[11px]">{s.label}</span>
                </div>
                <span className="font-mono font-bold text-foreground">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* توزيع الجنس */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gold" />
          <span className="font-bold text-xs text-foreground">التوازن بين الجنسين في الحضور:</span>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono">
          {genderDistribution.map((g) => (
            <div key={g.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="text-muted-foreground">{g.label}:</span>
              <span className="font-bold text-foreground">{g.count} طالب ({g.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
