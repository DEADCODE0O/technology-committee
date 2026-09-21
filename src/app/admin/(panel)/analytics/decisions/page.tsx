import React from "react";
import { Metadata } from "next";
import { AnalyticsNavTabs } from "@/components/analytics/analytics-nav-tabs";
import { DecisionTradeoffTool } from "@/components/analytics/decision-tradeoff-tool";
import { Scale, BookOpen, Sparkles, CheckCircle2, Calculator } from "lucide-react";

export const metadata: Metadata = {
  title: "محاكي المفاضلة والقرارات | إدارة اللجنة التكنولوجية",
};

export default function DecisionsAnalyticsPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-deep dark:text-gold">
            <Scale className="h-5 w-5" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            محاكي المفاضلة وبدائل القرارات التشغيلية
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          أداة حسابية لدعم اتخاذ القرار وتحديد البديل الأمثل استناداً لمعادلات الجدارة الإحصائية وحجم الطلب
        </p>
      </div>

      <AnalyticsNavTabs />

      {/* أداة المحاكاة التفاعلية */}
      <DecisionTradeoffTool />

      {/* الدليل المنهجي للمعادلات الرياضية المطبقة */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Calculator className="h-4 w-4" />
          </span>
          <div>
            <h4 className="font-heading text-sm font-bold text-foreground">
              الأساس الرياضي والإحصائي للنماذج المطبقة في النظام
            </h4>
            <p className="text-[11px] text-muted-foreground">
              كيف تقوم خوارزميات المنظومة بحساب النتائج وتحديد التوصيات الآلية؟
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2">
            <span className="font-bold text-foreground block">1. مؤشر صحة اللجنة (CHS / 100)</span>
            <p className="text-muted-foreground leading-relaxed">
              معادلة وزنية مركبة:
              <br />
              <code className="font-mono text-[11px] text-gold-deep dark:text-gold block mt-1">
                CHS = 0.35(Att) + 0.30(Qual) + 0.20(Grow) + 0.15(Eng)
              </code>
            </p>
            <span className="text-[10px] text-muted-foreground block">
              يعطي وزناً أعلى للالتزام بالحضور الفعلي والتقييم السري للجودة.
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2">
            <span className="font-bold text-foreground block">2. مؤشر الزخم والمشتقة (Momentum)</span>
            <p className="text-muted-foreground leading-relaxed">
              قياس سرعة التغير الأسبوعي:
              <br />
              <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">
                Velocity = ((Current - Previous) / Previous) × 100
              </code>
            </p>
            <span className="text-[10px] text-muted-foreground block">
              تحديد حالة النشاط: صعود مستمر (+5%)، استقرار (±5%)، أو تباطؤ وانحدار (-5%).
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2">
            <span className="font-bold text-foreground block">3. مصفوفة بوسطن لأداء الورش (BCG)</span>
            <p className="text-muted-foreground leading-relaxed">
              تصنيف رباعي متقاطع بين نسبة الإقبال والحضور (حد فاصل 60%) ومتوسط الرضا السري (حد فاصل 4.0 نجوم) لفرز الورش إلى نجوم، ركائز، فرص ضائعة، أو ورش تشكل خطراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
