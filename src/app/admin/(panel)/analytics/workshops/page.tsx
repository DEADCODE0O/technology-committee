import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getWorkshopDeepAnalytics } from "@/actions/analytics";
import { AnalyticsNavTabs } from "@/components/analytics/analytics-nav-tabs";
import { QualityRadarChart } from "@/components/analytics/quality-radar-chart";
import { ConfidentialCommentsViewer } from "@/components/analytics/confidential-comments-viewer";
import { Layers, ChevronDown, Award, TrendingDown, ArrowDownRight, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "تشريح الورش والتقييم السري | إدارة اللجنة التكنولوجية",
};

interface PageProps {
  searchParams?: Promise<{ session?: string }> | { session?: string };
}

export default async function WorkshopAnalyticsPage({ searchParams }: PageProps) {
  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};
  const targetSessionId = typeof sp.session === "string" ? sp.session : undefined;
  const data = await getWorkshopDeepAnalytics(targetSessionId);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* رأس الصفحة */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-deep dark:text-gold">
            <MessageSquare className="h-5 w-5" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            التشريح المجهري للورش والتقييم السري
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          استعراض التقييم السري لأداء المحاضرين، القيمة المعرفية، وملاحظات الطلاب التي لا تظهر إلا للإدارة
        </p>
      </div>

      <AnalyticsNavTabs />

      {/* قائمة اختيار الورشة/الجلسة */}
      {data.sessionsList.length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Layers className="h-4 w-4 text-gold" />
            <span>اختر الورشة أو الجلسة للتشريح:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {data.sessionsList.slice(0, 6).map((s) => {
              const isSelected = s.id === data.currentSession?.sessionId;
              return (
                <Link
                  key={s.id}
                  href={`/admin/analytics/workshops?session=${s.id}`}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-gold text-black shadow-xs font-extrabold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {s.title}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground">
          لا توجد جلسات مسجلة حتى الآن في قاعدة البيانات.
        </div>
      )}

      {data.currentSession && (
        <>
          {/* مخطط رادار الجودة والأبعاد الخمسة ومؤشر NPS */}
          <QualityRadarChart radarData={data.currentSession} />

          {/* مسار الاحتفاظ والتسرب (Retention & Drop-off Funnel) في حال كانت الورشة متعددة الجلسات */}
          {data.retentionFunnel.length > 1 && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                    <TrendingDown className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-foreground">
                      مسار الاحتفاظ والتسرب عبر المحاضرات (Retention Funnel)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      قياس التزام الطلاب من المحاضرة الأولى حتى المحاضرة الختامية
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.retentionFunnel.map((step) => (
                  <div key={step.step} className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">محاضرة {step.step}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {step.retentionRate}%
                      </span>
                    </div>
                    <p className="font-mono text-xs font-bold text-foreground">
                      {step.count} طالب حاضر
                    </p>
                    {step.step > 1 && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-500 font-mono">
                        <ArrowDownRight className="h-3 w-3" />
                        <span>فقد {step.dropOffRate}% من الدفعة</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* سجل الملاحظات والشكاوى السرية */}
          <ConfidentialCommentsViewer
            comments={data.currentSession.confidentialComments}
            sessionTitle={data.currentSession.sessionTitle}
          />
        </>
      )}
    </div>
  );
}
