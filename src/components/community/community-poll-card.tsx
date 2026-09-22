"use client";

import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Send,
  Sparkles,
  Lock,
  Clock,
  Star,
  Users,
  AlertCircle,
} from "lucide-react";
import { submitSurveyVote } from "@/actions/surveys";
import { toast } from "sonner";

export interface PollQuestionOption {
  option: string;
  count: number;
  percentage: number;
}

export interface PollQuestionData {
  id: string;
  type: "POLL_SINGLE" | "POLL_MULTI" | "RATING" | "TEXT";
  question: string;
  description?: string;
  options: string[];
  optionsStats: PollQuestionOption[];
  averageRating?: number;
  userAnswer?: string | string[];
}

export interface CommunityPollCardProps {
  surveyId: string;
  title: string;
  description?: string | null;
  status: string; // "OPEN" | "CLOSED"
  deadline?: string | null;
  totalVotes: number;
  hasVoted: boolean;
  questions: PollQuestionData[];
  canVote: boolean;
}

export function CommunityPollCard({
  surveyId,
  title,
  description,
  status,
  deadline,
  totalVotes: initialTotalVotes,
  hasVoted: initialHasVoted,
  questions,
  canVote,
}: CommunityPollCardProps) {
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تخزين الإجابات المختارة
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    questions.forEach((q) => {
      if (q.userAnswer) {
        initial[q.id] = q.userAnswer;
      }
    });
    return initial;
  });

  const isClosed = status !== "OPEN" || (deadline && new Date(deadline) < new Date());

  const handleSingleSelect = (qId: string, option: string) => {
    if (hasVoted || isClosed) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const handleMultiSelect = (qId: string, option: string) => {
    if (hasVoted || isClosed) return;
    setSelectedAnswers((prev) => {
      const current: string[] = Array.isArray(prev[qId]) ? [...prev[qId]] : [];
      const idx = current.indexOf(option);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(option);
      }
      return { ...prev, [qId]: current };
    });
  };

  const handleRatingSelect = (qId: string, star: number) => {
    if (hasVoted || isClosed) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: star }));
  };

  const handleSubmit = async () => {
    if (!canVote) {
      toast.error("يرجى تسجيل الدخول كطالب للمشاركة في الاستبيان");
      return;
    }

    // تحقق من الإجابة على سؤال واحد على الأقل
    const answeredCount = Object.keys(selectedAnswers).filter(
      (k) => selectedAnswers[k] !== undefined && selectedAnswers[k] !== ""
    ).length;

    if (answeredCount === 0) {
      toast.error("يرجى اختيار إجابة واحدة على الأقل قبل الإرسال");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSurveyVote(surveyId, selectedAnswers);
      if (res.ok) {
        setHasVoted(true);
        setTotalVotes((v) => v + 1);
        if (res.awardedPoints) {
          toast.success(`تم تسجيل تصويتك بنجاح! 🎉 وحصلت على +${res.awardedPoints} XP`);
        } else {
          toast.success("تم تحديث تصويتك بنجاح ✓");
        }
      } else {
        toast.error(res.error || "فشل تسجيل التصويت");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال، يرجى المحاولة لاحقاً");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-gold/25 bg-card/90 dark:bg-card/75 p-4 sm:p-6 shadow-md space-y-5 my-3">
      {/* الرأس: شارات الحالة ومجموع الأصوات */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gold-deep dark:text-gold-light flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> استطلاع رأي المجتمع
            </span>
            <h3 className="text-sm sm:text-base font-black text-foreground">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasVoted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              تم تصويتك ✓
            </span>
          )}

          {isClosed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-1 text-[10px] font-extrabold text-muted-foreground">
              <Lock className="h-3 w-3" />
              مغلق
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-[10px] font-black text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              مفتوح للمشاركة
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            <Users className="h-3 w-3 text-gold" />
            {totalVotes} صوت
          </span>
        </div>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {/* الأسئلة والخيارات */}
      <div className="space-y-5">
        {questions.map((q, qIndex) => {
          const isAnswered = hasVoted || isClosed;

          return (
            <div
              key={q.id}
              className="space-y-3 rounded-2xl bg-muted/20 border border-border/60 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black text-gold">سؤال {qIndex + 1}</span>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    {q.question}
                  </h4>
                  {q.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{q.description}</p>
                  )}
                </div>

                {q.type === "POLL_MULTI" && !isAnswered && (
                  <span className="rounded-md bg-gold/10 px-2 py-0.5 text-[9px] font-black text-gold border border-gold/20 shrink-0">
                    اختيار متعدد
                  </span>
                )}
              </div>

              {/* حالة 1: تم التصويت أو الاستبيان مغلق -> إظهار أشرطة النسب والنتائج */}
              {isAnswered && (q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") ? (
                <div className="space-y-2 pt-1">
                  {q.optionsStats.map((opt) => {
                    const isSelectedByUser =
                      q.type === "POLL_SINGLE"
                        ? selectedAnswers[q.id] === opt.option
                        : Array.isArray(selectedAnswers[q.id]) &&
                          selectedAnswers[q.id].includes(opt.option);

                    return (
                      <div
                        key={opt.option}
                        className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
                          isSelectedByUser
                            ? "border-gold/50 bg-gold/[0.08]"
                            : "border-border/80 bg-card/60"
                        }`}
                      >
                        {/* خلفية شريط التقدم النسبة المئوية */}
                        <div
                          className={`absolute inset-y-0 start-0 opacity-20 transition-all duration-700 ${
                            isSelectedByUser ? "bg-gold" : "bg-muted-foreground"
                          }`}
                          style={{ width: `${opt.percentage}%` }}
                        />

                        <div className="relative flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="flex items-center gap-2 text-foreground">
                            {isSelectedByUser && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-gold shrink-0" />
                            )}
                            {opt.option}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              ({opt.count} صوت)
                            </span>
                            <span
                              className={`text-xs font-black ${
                                isSelectedByUser ? "text-gold" : "text-foreground"
                              }`}
                            >
                              {opt.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* حالة 2: لم يصوت بعد -> إظهار الأزرار التفاعلية للاختيار */}
              {!isAnswered && (q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") ? (
                <div className="grid gap-2 sm:grid-cols-1 pt-1">
                  {q.options.map((opt) => {
                    const isSelected =
                      q.type === "POLL_SINGLE"
                        ? selectedAnswers[q.id] === opt
                        : Array.isArray(selectedAnswers[q.id]) &&
                          selectedAnswers[q.id].includes(opt);

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          q.type === "POLL_SINGLE"
                            ? handleSingleSelect(q.id, opt)
                            : handleMultiSelect(q.id, opt)
                        }
                        className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-start transition-all ${
                          isSelected
                            ? "border-gold bg-gold/15 text-gold-deep dark:text-gold shadow-sm"
                            : "border-border/80 bg-card/80 text-foreground hover:border-gold/40 hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-extrabold">{opt}</span>
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isSelected
                              ? "border-gold bg-gold text-night"
                              : "border-muted-foreground/40 bg-transparent"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* سؤال تقييم نجوم (RATING) */}
              {q.type === "RATING" && (
                <div className="pt-1">
                  {isAnswered ? (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                      <div className="flex items-center gap-1 text-gold">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              (q.averageRating || 0) >= s
                                ? "fill-gold text-gold"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-foreground">
                        متوسط التقييم: {q.averageRating ?? "—"} / 5
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (selectedAnswers[q.id] || 0) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingSelect(q.id, star)}
                            className="p-1 text-gold hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`h-7 w-7 ${
                                active ? "fill-gold text-gold" : "text-muted-foreground/40 hover:text-gold/60"
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-bold text-muted-foreground ms-2">
                        {selectedAnswers[q.id] ? `${selectedAnswers[q.id]} نجوم` : "حدد تقييمك"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* سؤال نصي (TEXT) */}
              {q.type === "TEXT" && !isAnswered && (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    value={selectedAnswers[q.id] || ""}
                    onChange={(e) =>
                      setSelectedAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="اكتب إجابتك أو ملاحظاتك هنا..."
                    className="w-full rounded-2xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* زر إرسال التصويت في حال لم يسبق له التصويت */}
      {!hasVoted && !isClosed && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" />
            تحصل على <strong className="text-gold">+15 XP</strong> فور إرسال تصويتك الأول!
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-night border-t-transparent" />
                جاري الإرسال...
              </span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                إرسال تصويتي 🚀
              </>
            )}
          </button>
        </div>
      )}

      {hasVoted && !isClosed && (
        <p className="text-[11px] text-center text-muted-foreground">
          شكراً لمشاركتك! صوتك يساهم في تحديد مسار القرارات والأنشطة القادمة 🌟
        </p>
      )}
    </div>
  );
}
