"use client";

// ═══════════════════════════════════════════════════════════════
//  مخطط مصفوفة بوسطن لأداء الورش (BCG Performance Matrix)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Star, HelpCircle, ShieldAlert, Award, Sparkles, Filter } from "lucide-react";
import { WorkshopBCGItem, BCGQuadrant } from "@/lib/analytics/types";

interface BCGMatrixChartProps {
  workshops: WorkshopBCGItem[];
}

export function BCGMatrixChart({ workshops }: BCGMatrixChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<BCGQuadrant | "ALL">("ALL");

  const filteredWorkshops = selectedCategory === "ALL"
    ? workshops
    : workshops.filter((w) => w.category === selectedCategory);

  const starCount = workshops.filter((w) => w.category === "STAR").length;
  const cashCowCount = workshops.filter((w) => w.category === "CASH_COW").length;
  const questionCount = workshops.filter((w) => w.category === "QUESTION_MARK").length;
  const riskCount = workshops.filter((w) => w.category === "RISK").length;

  const getQuadrantColor = (cat: BCGQuadrant) => {
    switch (cat) {
      case "STAR": return "#f59e0b"; // ذهبي / أصفر
      case "CASH_COW": return "#06b6d4"; // سماوي
      case "QUESTION_MARK": return "#a855f7"; // بنفسجي
      case "RISK": return "#f43f5e"; // أحمر
      default: return "#3b82f6";
    }
  };

  // بيانات النقاط للرسم البياني
  const chartData = workshops.map((w) => ({
    x: Math.max(w.attendanceRate || w.fillRate, 5),
    y: w.averageRating || 4.0,
    z: Math.max(w.registeredCount, 10),
    title: w.title,
    presenter: w.presenter || "غير محدد",
    registeredCount: w.registeredCount,
    attendedCount: w.attendedCount,
    category: w.category,
    recommendation: w.recommendation,
  }));

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      {/* رأس القسم مع أدوات التصفية */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              مصفوفة بوسطن لأداء الورش (BCG Performance Matrix)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            توزيع الورش على 4 أرباع وفقاً لـ (الإقبال والحضور الفعلي vs الرضا والتقييم السري للطلاب)
          </p>
        </div>

        {/* فلاتر الأرباع */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === "ALL"
                ? "bg-foreground text-background shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({workshops.length})
          </button>
          <button
            onClick={() => setSelectedCategory("STAR")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === "STAR"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Star className="h-3 w-3" />
            نجوم ({starCount})
          </button>
          <button
            onClick={() => setSelectedCategory("CASH_COW")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === "CASH_COW"
                ? "bg-cyan-500 text-white shadow-xs"
                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20"
            }`}
          >
            <Award className="h-3 w-3" />
            ركائز ({cashCowCount})
          </button>
          <button
            onClick={() => setSelectedCategory("QUESTION_MARK")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === "QUESTION_MARK"
                ? "bg-purple-500 text-white shadow-xs"
                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
            }`}
          >
            <HelpCircle className="h-3 w-3" />
            فرص ضائعة ({questionCount})
          </button>
          <button
            onClick={() => setSelectedCategory("RISK")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === "RISK"
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <ShieldAlert className="h-3 w-3" />
            خطر ({riskCount})
          </button>
        </div>
      </div>

      {/* الرسم البياني التفاعلي Recharts Scatter */}
      <div className="relative mt-6 h-72 w-full">
        {/* خلفيات الأرباع الأربعة */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-15 pointer-events-none rounded-xl overflow-hidden">
          <div className="bg-purple-500/20 border-e border-b border-purple-500/30 p-2 text-[10px] font-bold text-purple-500">
            ❓ فرص ضائعة (رضا عالٍ / إقبال محدود)
          </div>
          <div className="bg-amber-500/20 border-b border-amber-500/30 p-2 text-[10px] font-bold text-amber-500 text-end">
            🌟 نجوم (رضا عالٍ / إقبال فائق)
          </div>
          <div className="bg-rose-500/20 border-e border-rose-500/30 p-2 text-[10px] font-bold text-rose-500 flex items-end">
            ⚠️ خطر (رضا متدنٍ / إقبال ضعيف)
          </div>
          <div className="bg-cyan-500/20 p-2 text-[10px] font-bold text-cyan-500 flex items-end justify-end">
            🐄 ركائز (رضا متوسط / إقبال كبير)
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <XAxis
              type="number"
              dataKey="x"
              name="معدل الحضور والإقبال"
              unit="%"
              domain={[0, 100]}
              tick={{ fill: "currentColor", opacity: 0.6, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="متوسط التقييم السري"
              domain={[1, 5]}
              unit="★"
              tick={{ fill: "currentColor", opacity: 0.6, fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[80, 400]} name="عدد المسجلين" />
            <ReferenceLine x={55} stroke="currentColor" strokeDasharray="3 3" opacity={0.3} />
            <ReferenceLine y={3.8} stroke="currentColor" strokeDasharray="3 3" opacity={0.3} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 z-50 max-w-xs">
                      <p className="font-bold text-foreground text-sm">{data.title}</p>
                      <p className="text-muted-foreground">المحاضر: {data.presenter}</p>
                      <div className="flex items-center justify-between font-mono pt-1 border-t border-border/50">
                        <span>الحضور/الإقبال:</span>
                        <span className="font-bold text-foreground">{data.x}%</span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span>التقييم السري:</span>
                        <span className="font-bold text-amber-500">{data.y} / 5 ★</span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span>المسجلون:</span>
                        <span className="font-bold text-foreground">{data.registeredCount} طالب</span>
                      </div>
                      <div className="pt-2 border-t border-border/50 text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-bold text-foreground">التوصية الآلية: </span>
                        {data.recommendation}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="الورش" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getQuadrantColor(entry.category)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* قائمة البطاقات المصنفة للتصفح السريع */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filteredWorkshops.slice(0, 4).map((w) => (
          <div key={w.id} className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${w.badgeClass}`}>
                {w.categoryLabel}
              </span>
              <span className="font-mono text-xs font-bold text-amber-500">
                {w.averageRating} ★
              </span>
            </div>
            <h4 className="font-bold text-xs text-foreground line-clamp-1">{w.title}</h4>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>حضور: {w.attendedCount}/{w.registeredCount}</span>
              <span>{w.attendanceRate}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pt-1 border-t border-border/40">
              {w.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
