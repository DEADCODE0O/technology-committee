"use client";

// ═══════════════════════════════════════════════════════════════
//  نافذة إصدار التقرير التنفيذي الرسمي للاجتماعات (One-Click PDF Report)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import Image from "next/image";
import { Printer, FileDown, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ExecutiveDashboardData } from "@/lib/analytics/types";

interface ExecutiveReportModalProps {
  data: ExecutiveDashboardData;
}

export function ExecutiveReportModal({ data }: ExecutiveReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-black shadow-sm transition-all hover:bg-gold-light"
      >
        <Printer className="h-4 w-4" />
        <span>تصدير تقرير تنفيذي رسمي (PDF)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl border border-border">
            {/* شريط الإجراءات بالأعلى (لا يظهر في الطباعة) */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileDown className="h-5 w-5 text-gold" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  معاينة التقرير التنفيذي الرسمي
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-black hover:bg-gold-light transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>طباعة / حفظ كـ PDF</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* صفحة التقرير الرسمية للطباعة */}
            <div className="mt-6 space-y-6 text-foreground print:m-0 print:p-0">
              {/* ترويسة التقرير الرسمية */}
              <div className="flex items-center justify-between border-b-2 border-gold/40 pb-5">
                <div className="space-y-1">
                  <h2 className="font-heading text-lg font-extrabold text-foreground">
                    المعهد العالي للعلوم التجارية والحاسب الآلي بالعريش
                  </h2>
                  <p className="text-sm font-bold text-gold-deep dark:text-gold">
                    اللجنة التكنولوجية — منظومة الاستخبارات ودعم اتخاذ القرار
                  </p>
                  <p className="text-xs text-muted-foreground">
                    تقرير الموقف التنفيذي ومؤشرات الأداء الفصلية
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/5 p-2">
                  <Image src="/images/logo.png" alt="شعار اللجنة" width={48} height={48} className="h-auto w-auto" />
                </div>
              </div>

              {/* بطاقة تاريخ وبيانات الإصدار */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-3 text-xs sm:grid-cols-4 font-mono">
                <div>
                  <span className="text-muted-foreground block">تاريخ الإصدار:</span>
                  <span className="font-bold">{new Date().toLocaleDateString("ar-EG")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">مؤشر صحة اللجنة:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.healthScore.score} / 100</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">حالة الزخم:</span>
                  <span className="font-bold">{data.healthScore.statusLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">إجمالي الطلاب:</span>
                  <span className="font-bold">{data.totalStudents} طالب مسجل</span>
                </div>
              </div>

              {/* ملخص المؤشرات الرقمية */}
              <div className="space-y-3">
                <h4 className="font-heading text-sm font-bold border-s-4 border-gold pe-2 ps-2 text-foreground">
                  أولاً: ملخص المؤشرات الإحصائية العامة
                </h4>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                      <th className="p-2.5 text-start">المؤشر</th>
                      <th className="p-2.5 text-start">القيمة المحققة</th>
                      <th className="p-2.5 text-start">الحالة والتقييم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="p-2.5 font-bold">نسبة الالتزام بالحضور الفعلي بالـ QR</td>
                      <td className="p-2.5 font-mono">{data.overallAttendanceRate}%</td>
                      <td className="p-2.5">
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-600 font-bold">
                          {data.overallAttendanceRate >= 60 ? "ممتاز ومستقر" : "يحتاج متابعة"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">متوسط الرضا والتقييم السري للجلسات</td>
                      <td className="p-2.5 font-mono">{data.averageSatisfaction} من 5 ★</td>
                      <td className="p-2.5">
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 font-bold">
                          {data.averageSatisfaction >= 4.0 ? "جودة عالية" : "متوسط"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">إجمالي مقاعد التسجيل المكتملة</td>
                      <td className="p-2.5 font-mono">{data.totalRegistrations} مقعد</td>
                      <td className="p-2.5">إقبال واسع</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">عدد التقييمات السرية المستلمة</td>
                      <td className="p-2.5 font-mono">{data.recentEvaluationsCount} استبيان</td>
                      <td className="p-2.5">شفافية عالية</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* توصيات مصفوفة بوسطن لأبرز الورش */}
              <div className="space-y-3">
                <h4 className="font-heading text-sm font-bold border-s-4 border-gold pe-2 ps-2 text-foreground">
                  ثانياً: تصنيف الأنشطة والورش والقرارات الموصى بها
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {data.bcgWorkshops.slice(0, 4).map((w) => (
                    <div key={w.id} className="rounded-lg border border-border/80 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>{w.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${w.badgeClass}`}>
                          {w.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {w.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* توقيعات الاعتماد الرسمية */}
              <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 text-center text-xs">
                <div className="space-y-6">
                  <p className="font-bold">مسؤول ومقرر اللجنة التكنولوجية</p>
                  <p className="font-mono text-muted-foreground">...................................</p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">أستاذ المادة والدكتورة المشرفة على النشاط</p>
                  <p className="font-mono text-muted-foreground">...................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
