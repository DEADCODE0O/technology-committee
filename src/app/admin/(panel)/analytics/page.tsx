import React from "react";
import { Metadata } from "next";
import { getExecutiveDashboardData } from "@/actions/analytics";
import { HealthScoreDial } from "@/components/analytics/health-score-dial";
import { BCGMatrixChart } from "@/components/analytics/bcg-matrix-chart";
import { EarlyWarningBanner } from "@/components/analytics/early-warning-banner";
import { AttendanceTrendChart } from "@/components/analytics/attendance-trend-chart";
import { ExecutiveReportModal } from "@/components/analytics/executive-report-modal";
import { AnalyticsNavTabs } from "@/components/analytics/analytics-nav-tabs";
import { Users, Ticket, CheckCircle, Star, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "منظومة الاستخبارات ودعم اتخاذ القرار | إدارة اللجنة التكنولوجية",
};

export default async function AnalyticsDashboardPage() {
  const data = await getExecutiveDashboardData();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* رأس الصفحة الرئيسي مع زر تصدير التقرير التنفيذي */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-deep dark:text-gold">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="font-heading text-2xl font-extrabold text-foreground">
              منظومة الاستخبارات ودعم اتخاذ القرار (CEIDS)
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            نماذج رياضية وإحصائية متقدمة لتحليل الموقف التشغيلي، التنبؤ بالمخاطر، والمفاضلة بين بدائل الورش والفعاليات
          </p>
        </div>

        <div>
          <ExecutiveReportModal data={data} />
        </div>
      </div>

      {/* شريط التبويبات الداخلية */}
      <AnalyticsNavTabs />

      {/* المؤشرات السريعة (Executive Metric Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>إجمالي الطلاب المسجلين</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-foreground mt-2 font-mono">
            {data.totalStudents}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">في قاعدة بيانات المنصة</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>مقاعد التسجيل المحجوزة</span>
            <Ticket className="h-4 w-4 text-amber-500" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-foreground mt-2 font-mono">
            {data.totalRegistrations}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">إجمالي طلبات التسجيل المعتمدة</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الحضور الفعلي بالـ QR</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {data.overallAttendanceRate}%
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {data.totalAttendedSessions} حضور موثق
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>متوسط الرضا السري</span>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-amber-500 mt-2 font-mono">
            {data.averageSatisfaction} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            بناءً على {data.recentEvaluationsCount} استبيان سري
          </span>
        </div>
      </div>

      {/* العداد الرئيسي لمؤشر صحة اللجنة */}
      <HealthScoreDial health={data.healthScore} />

      {/* رادار وتنبيهات الإنذار المبكر */}
      <EarlyWarningBanner alerts={data.alerts} />

      {/* مصفوفة بوسطن لتقييم الورش */}
      <BCGMatrixChart workshops={data.bcgWorkshops} />

      {/* منحنى تدفق الحضور والتسجيل الأسبوعي */}
      <AttendanceTrendChart
        trendData={data.weeklyAttendanceTrend}
        overallAttendanceRate={data.overallAttendanceRate}
      />
    </div>
  );
}
