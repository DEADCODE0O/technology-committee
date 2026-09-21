"use client";

// ═══════════════════════════════════════════════════════════════
//  محاكي المفاضلة ودعم اتخاذ القرارات (Decision Trade-Off Simulator)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { Scale, Trophy, Check, ArrowRightLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { simulateTradeOff } from "@/lib/analytics/decision-engine";

interface OptionState {
  title: string;
  category: string;
  demandScore: number;
  historicalAttendanceRate: number;
  expectedRating: number;
  complexity: "LOW" | "MEDIUM" | "HIGH";
}

export function DecisionTradeoffTool() {
  const [optionA, setOptionA] = useState<OptionState>({
    title: "دفعة جديدة: معسكر تطوير الويب الشامل (Next.js)",
    category: "مسار برمجي",
    demandScore: 85,
    historicalAttendanceRate: 75,
    expectedRating: 4.8,
    complexity: "MEDIUM",
  });

  const [optionB, setOptionB] = useState<OptionState>({
    title: "ورشة مكثفة: الذكاء الاصطناعي وهندسة الأوامر (Prompt Engineering)",
    category: "ذكاء اصطناعي",
    demandScore: 92,
    historicalAttendanceRate: 80,
    expectedRating: 4.6,
    complexity: "LOW",
  });

  const result = simulateTradeOff(optionA, optionB);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold-deep dark:text-gold">
              <Scale className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              محاكي المفاضلة بين البدائل والقرارات (Trade-Off Simulator)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            قارن بين قرارين تشغيليين بناءً على الحسابات الإحصائية وحجم الطلب ونسب الإكمال التاريخية
          </p>
        </div>

        {/* نتيجة المحاكاة */}
        <div className="flex items-center gap-2 rounded-xl bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-deep dark:text-gold border border-gold/20">
          <Trophy className="h-4 w-4" />
          <span>
            {result.winner === "A" ? `الأرجح إحصائياً: البديل الأول` : result.winner === "B" ? `الأرجح إحصائياً: البديل الثاني` : `تعادل في الجدارة`}
          </span>
        </div>
      </div>

      {/* صندوق التفسير والقرار */}
      <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-4 text-xs leading-relaxed text-foreground flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-gold-deep dark:text-gold block mb-1">الخلاصة الإحصائية الموصى بها:</span>
          {result.rationale}
        </div>
      </div>

      {/* بطاقات المقارنة بين البديلين */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* البديل الأول A */}
        <div className={`rounded-xl border p-5 space-y-4 transition-all ${
          result.winner === "A"
            ? "border-emerald-500/40 bg-emerald-500/[0.02] shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30"
            : "border-border/70 bg-muted/20"
        }`}>
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              البديل المقترح (أ)
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-foreground text-sm">
              <span>درجة الجدارة:</span>
              <span className="text-emerald-500 text-lg">{result.candidateA.suitabilityScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground">عنوان الفعالية / القرار:</label>
            <input
              type="text"
              value={optionA.title}
              onChange={(e) => setOptionA({ ...optionA, title: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground outline-hidden focus:border-gold"
            />
          </div>

          {/* عناصر التعديل للمحاكاة */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">حجم الطلب المتوقع (Wishlist):</span>
                <span className="font-mono font-bold">{optionA.demandScore}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={optionA.demandScore}
                onChange={(e) => setOptionA({ ...optionA, demandScore: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">نسبة الالتزام بالحضور التاريخية:</span>
                <span className="font-mono font-bold">{optionA.historicalAttendanceRate}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={optionA.historicalAttendanceRate}
                onChange={(e) => setOptionA({ ...optionA, historicalAttendanceRate: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">الرضا والجودة المتوقعة:</span>
                <span className="font-mono font-bold">{optionA.expectedRating} ★</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={Math.round(optionA.expectedRating * 10)}
                onChange={(e) => setOptionA({ ...optionA, expectedRating: Number(e.target.value) / 10 })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-1.5">صعوبة التنظيم والتجهيز:</span>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setOptionA({ ...optionA, complexity: lvl })}
                    className={`rounded-lg py-1 font-bold transition-all ${
                      optionA.complexity === lvl
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {lvl === "LOW" ? "بسيطة" : lvl === "MEDIUM" ? "متوسطة" : "معقدة"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* مزايا وعيوب */}
          <div className="pt-2 border-t border-border/40 space-y-1.5 text-[11px]">
            {result.candidateA.pros.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3 shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* البديل الثاني B */}
        <div className={`rounded-xl border p-5 space-y-4 transition-all ${
          result.winner === "B"
            ? "border-emerald-500/40 bg-emerald-500/[0.02] shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30"
            : "border-border/70 bg-muted/20"
        }`}>
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
              البديل المقترح (ب)
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-foreground text-sm">
              <span>درجة الجدارة:</span>
              <span className="text-emerald-500 text-lg">{result.candidateB.suitabilityScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground">عنوان الفعالية / القرار:</label>
            <input
              type="text"
              value={optionB.title}
              onChange={(e) => setOptionB({ ...optionB, title: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground outline-hidden focus:border-gold"
            />
          </div>

          {/* عناصر التعديل للمحاكاة */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">حجم الطلب المتوقع (Wishlist):</span>
                <span className="font-mono font-bold">{optionB.demandScore}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={optionB.demandScore}
                onChange={(e) => setOptionB({ ...optionB, demandScore: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">نسبة الالتزام بالحضور التاريخية:</span>
                <span className="font-mono font-bold">{optionB.historicalAttendanceRate}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={optionB.historicalAttendanceRate}
                onChange={(e) => setOptionB({ ...optionB, historicalAttendanceRate: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">الرضا والجودة المتوقعة:</span>
                <span className="font-mono font-bold">{optionB.expectedRating} ★</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={Math.round(optionB.expectedRating * 10)}
                onChange={(e) => setOptionB({ ...optionB, expectedRating: Number(e.target.value) / 10 })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground block mb-1.5">صعوبة التنظيم والتجهيز:</span>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setOptionB({ ...optionB, complexity: lvl })}
                    className={`rounded-lg py-1 font-bold transition-all ${
                      optionB.complexity === lvl
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {lvl === "LOW" ? "بسيطة" : lvl === "MEDIUM" ? "متوسطة" : "معقدة"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* مزايا وعيوب */}
          <div className="pt-2 border-t border-border/40 space-y-1.5 text-[11px]">
            {result.candidateB.pros.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3 shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
