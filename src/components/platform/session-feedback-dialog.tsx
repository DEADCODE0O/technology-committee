"use client";

// ═══════════════════════════════════════════════════════════════
//  نافذة التقييم السري اللحظي للورشة والمحاضر (Student Feedback Modal)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useTransition } from "react";
import { Star, Lock, Heart, CheckCircle2, MessageSquare, Send, X, ShieldAlert } from "lucide-react";
import { submitSessionEvaluation } from "@/actions/evaluations";

interface SessionFeedbackDialogProps {
  sessionId: string;
  sessionTitle: string;
  triggerButtonText?: string;
  initialEvaluated?: boolean;
}

export function SessionFeedbackDialog({
  sessionId,
  sessionTitle,
  triggerButtonText = "شاركنا رأيك السري في الورشة",
  initialEvaluated = false,
}: SessionFeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(initialEvaluated);
  const [error, setError] = useState<string | null>(null);

  // حقول التقييم
  const [instructorRating, setInstructorRating] = useState(5);
  const [contentRating, setContentRating] = useState(5);
  const [organizationRating, setOrganizationRating] = useState(5);
  const [recommendScore, setRecommendScore] = useState(10);
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await submitSessionEvaluation({
          sessionId,
          instructorRating,
          contentRating,
          organizationRating,
          recommendScore,
          privateFeedback,
          strengths,
          improvements,
        });

        if (res.success) {
          setIsSubmitted(true);
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء حفظ التقييم");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/30 px-3.5 py-1.5 text-xs font-bold text-gold-deep dark:text-gold transition-all"
      >
        <Lock className="h-3.5 w-3.5 text-gold" />
        <span>{triggerButtonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl border border-border">
            {/* زر الإغلاق */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute start-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  شكراً لمساهمتك الصادقة!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  تم استلام تقييمك وملاحظاتك بسرية تامة وتوجيهها مباشرة لقيادة اللجنة التكنولوجية لتدارك العيوب وتطوير الورش القادمة.
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl bg-foreground px-5 py-2 text-xs font-bold text-background"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* رأس النافذة مع تأكيد السرية */}
                <div className="pe-8 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-deep dark:text-gold">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      استبيان الجودة والتقييم السري
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    جلسة: <span className="font-bold text-foreground">{sessionTitle}</span>
                  </p>
                </div>

                {/* شريط الأمان والسرية */}
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-foreground block">ملاحظاتك سرية 100%:</span>
                    لن يرى المحاضر ولا زملاؤك الطلاب اسمك أو تقييمك نهائياً؛ تظهر الملاحظات فقط لإدارة اللجنة لدراسة العيوب ونقاط القوة.
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-bold">
                    {error}
                  </div>
                )}

                {/* 1. أسلوب المحاضر وشرحه */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">1. أسلوب المحاضر وقدرته على الإيصال:</span>
                    <span className="font-mono font-bold text-amber-500">{instructorRating} من 5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setInstructorRating(val)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            val <= instructorRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. القيمة العلمية للمحتوى */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">2. القيمة العملية والتطبيقية للمحتوى:</span>
                    <span className="font-mono font-bold text-amber-500">{contentRating} من 5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setContentRating(val)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            val <= contentRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. تنظيم القاعة والوقت */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">3. التنظيم العام للقاعة والوقت:</span>
                    <span className="font-mono font-bold text-amber-500">{organizationRating} من 5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOrganizationRating(val)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            val <= organizationRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. إلى أي درجة توصي زملائك بالورشة؟ */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">4. هل تنصح زملاءك بحضور هذه الورشة مستقبلاً؟</span>
                    <span className="font-mono font-bold text-foreground">{recommendScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={recommendScore}
                    onChange={(e) => setRecommendScore(Number(e.target.value))}
                    className="w-full accent-gold cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>1 (لا أنصح إطلاقاً)</span>
                    <span>10 (أنصح بشدة)</span>
                  </div>
                </div>

                {/* 5. ملاحظات حرة سرية */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <label className="text-xs font-bold text-foreground block">
                    ملاحظات سرية أو عيوب لاحظتها (تصل لقيادة اللجنة فقط):
                  </label>
                  <textarea
                    rows={2}
                    value={privateFeedback}
                    onChange={(e) => setPrivateFeedback(e.target.value)}
                    placeholder="اكتب بصراحة تامة أي انتقاد أو مشكلة واجهتك أثناء المحاضرة..."
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-hidden focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      أبرز ما أعجبك:
                    </label>
                    <input
                      type="text"
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      placeholder="الشرح، الأمثلة..."
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      مقترح للتحسين:
                    </label>
                    <input
                      type="text"
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="وقت إضافي، تطبيق أكثر..."
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
                    />
                  </div>
                </div>

                {/* زر الإرسال */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-xs font-bold text-black shadow-md hover:bg-gold-light transition-all disabled:opacity-50"
                  >
                    {isPending ? (
                      <span>جارٍ حفظ التقييم السري...</span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>إرسال التقييم بأمان وسرية</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
