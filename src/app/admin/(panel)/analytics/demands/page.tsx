import React from "react";
import { Metadata } from "next";
import { getDemographicAnalytics } from "@/actions/analytics";
import { getDemandPolls } from "@/actions/demands";
import { DemographicsCharts } from "@/components/analytics/demographics-charts";
import { DemandPollManager } from "@/components/analytics/demand-poll-manager";
import { AnalyticsNavTabs } from "@/components/analytics/analytics-nav-tabs";
import { Compass, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "بوصلة الرغبات والتوجهات | إدارة اللجنة التكنولوجية",
};

export default async function DemandsAnalyticsPage() {
  const [demographics, polls] = await Promise.all([
    getDemographicAnalytics(),
    getDemandPolls(),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-deep dark:text-gold">
            <Compass className="h-5 w-5" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            بوصلة رغبات واهتمامات الطلاب
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          تحليل التركيبة الديموغرافية وقوائم رغبات الفرق والشعب لتوجيه مواضيع الورش القادمة بدقة إحصائية
        </p>
      </div>

      <AnalyticsNavTabs />

      {/* المخططات الديموغرافية (الفرق والشعب والجنس) */}
      <DemographicsCharts
        gradeDistribution={demographics.gradeDistribution}
        sectionDistribution={demographics.sectionDistribution}
        genderDistribution={demographics.genderDistribution}
      />

      {/* إدارة استطلاعات الرغبات وتصويتات الطلاب */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <DemandPollManager polls={polls} />
      </div>
    </div>
  );
}
