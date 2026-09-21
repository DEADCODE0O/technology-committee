"use client";

// ═══════════════════════════════════════════════════════════════
//  منحنى تدفق الحضور والتسجيل الأسبوعي (Attendance Momentum Trend)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Users, CheckCircle } from "lucide-react";

interface AttendanceTrendChartProps {
  trendData: { week: string; registered: number; attended: number }[];
  overallAttendanceRate: number;
}

export function AttendanceTrendChart({ trendData, overallAttendanceRate }: AttendanceTrendChartProps) {
  const totalRegistered = trendData.reduce((acc, curr) => acc + curr.registered, 0);
  const totalAttended = trendData.reduce((acc, curr) => acc + curr.attended, 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              منحنى تدفق الحضور والتسجيل (Attendance Velocity)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            تتبع أسبوعي للمسجلين مقارنة بالحضور الفعلي المثبت بالـ QR ومعدل الفقد
          </p>
        </div>

        {/* إحصائيات سريعة */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">المسجلون:</span>
            <span className="font-mono font-bold text-foreground">{totalRegistered}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">الحضور:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalAttended}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRegistered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="week"
              tick={{ fill: "currentColor", opacity: 0.7, fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "currentColor", opacity: 0.7, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const reg = payload.find((p) => p.dataKey === "registered")?.value as number;
                  const att = payload.find((p) => p.dataKey === "attended")?.value as number;
                  const rate = reg > 0 ? Math.round((att / reg) * 100) : 0;
                  return (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 z-50">
                      <p className="font-bold text-foreground">{label}</p>
                      <div className="flex items-center justify-between gap-4 font-mono">
                        <span className="text-blue-500">إجمالي التسجيل:</span>
                        <span className="font-bold text-foreground">{reg}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono">
                        <span className="text-emerald-500">الحضور الفعلي:</span>
                        <span className="font-bold text-foreground">{att}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono pt-1 border-t border-border/50">
                        <span>نسبة الالتزام:</span>
                        <span className="font-bold text-foreground">{rate}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="registered"
              name="المسجلون"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRegistered)"
            />
            <Area
              type="monotone"
              dataKey="attended"
              name="الحضور الفعلي"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorAttended)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
