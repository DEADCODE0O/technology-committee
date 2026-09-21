"use client";

// ═══════════════════════════════════════════════════════════════
//  رادار جودة الجلسة والمحاضر ومؤشر NPS (Quality Radar & NPS)
// ═══════════════════════════════════════════════════════════════

import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Star, ShieldCheck, Heart, Users, Award, MessageSquare } from "lucide-react";
import { SessionQualityRadarData } from "@/lib/analytics/types";

interface QualityRadarChartProps {
  radarData: SessionQualityRadarData;
}

export function QualityRadarChart({ radarData }: QualityRadarChartProps) {
  // بيانات الأبعاد الخمسة للرادار
  const chartData = [
    { subject: "شرح المحاضر", score: radarData.metrics.instructor, fullMark: 5 },
    { subject: "قيمة المحتوى", score: radarData.metrics.content, fullMark: 5 },
    { subject: "تنظيم القاعة", score: radarData.metrics.organization, fullMark: 5 },
    { subject: "التقييم الشامل", score: radarData.metrics.overall, fullMark: 5 },
    { subject: "توصية الزملاء", score: (radarData.metrics.recommendRate / 100) * 5, fullMark: 5 },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold-deep dark:text-gold">
              <Award className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              رادار أبعاد الجودة والمحاضر (Quality Radar)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            تشريح متعدد الأبعاد للتقييم السري للجلسة: <span className="font-bold text-foreground">{radarData.sessionTitle}</span>
          </p>
        </div>

        {/* مؤشر NPS */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
          <span className="text-muted-foreground">مؤشر صافي الترويج (NPS):</span>
          <span
            className={`font-mono font-extrabold ${
              radarData.nps >= 50
                ? "text-emerald-600 dark:text-emerald-400"
                : radarData.nps >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
            dir="ltr"
          >
            {radarData.nps > 0 ? `+${radarData.nps}` : radarData.nps}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* مخطط الرادار */}
        <div className="h-72 w-full lg:col-span-7">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="currentColor" opacity={0.15} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "currentColor", opacity: 0.8, fontSize: 11, fontWeight: "bold" }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
              <Radar
                name="درجة التقييم"
                dataKey="score"
                stroke="#c9a45c"
                fill="#c9a45c"
                fillOpacity={0.4}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-foreground">{data.subject}</p>
                        <p className="font-mono text-gold-deep dark:text-gold font-bold">
                          {data.score} / 5 نجوم
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* بطاقات المؤشرات الرقمية */}
        <div className="space-y-3 lg:col-span-5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
              <span className="text-[11px] text-muted-foreground">شرح المحاضر</span>
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {radarData.metrics.instructor} <span className="text-amber-400 text-xs">★</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
              <span className="text-[11px] text-muted-foreground">قيمة المحتوى</span>
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {radarData.metrics.content} <span className="text-amber-400 text-xs">★</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
              <span className="text-[11px] text-muted-foreground">تنظيم القاعة</span>
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {radarData.metrics.organization} <span className="text-amber-400 text-xs">★</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
              <span className="text-[11px] text-muted-foreground">إجمالي التقييمات</span>
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {radarData.totalEvaluations} <span className="text-xs font-normal text-muted-foreground">طالب</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>خصوصية التقييم:</span>
            </div>
            هذه الأرقام تم استخراجها من الاستبيانات السرية ولا يطّلع عليها المحاضر لضمان الشفافية المطلقة في نقل نبض الطلاب.
          </div>
        </div>
      </div>
    </div>
  );
}
