"use client";

import { useState } from "react";
import Link from "next/link";
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
  Edit3,
  Share2,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  MessageCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { submitSurveyVote } from "@/actions/surveys";
import { toast } from "sonner";

export interface SurveyOptionStat {
  option: string;
  count: number;
  percentage: number;
  isOther?: boolean;
}

export interface StandaloneQuestion {
  id: string;
  type: "POLL_SINGLE" | "POLL_MULTI" | "RATING" | "TEXT";
  question: string;
  description?: string | null;
  options: string[];
  allowOther?: boolean;
  optionsStats: SurveyOptionStat[];
  userAnswer?: string | string[];
}

export interface StandaloneSurveyViewProps {
  survey: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    deadline: string | null;
    createdAt: string;
    totalVotes: number;
    hasVoted: boolean;
    userResponse?: Record<string, any> | null;
    questions: StandaloneQuestion[];
    isLoggedIn: boolean;
    currentUserId?: string;
  };
}

export function StandaloneSurveyView({ survey }: StandaloneSurveyViewProps) {
  const [hasVoted, setHasVoted] = useState(survey.hasVoted);
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [totalVotes, setTotalVotes] = useState(survey.totalVotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // تخزين نصوص خيار "أخرى" المكتوبة لكل سؤال
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (survey.userResponse) {
      survey.questions.forEach((q) => {
        const val = survey.userResponse?.[q.id];
        if (typeof val === "string") {
          if (val.startsWith("أخرى: ")) {
            initial[q.id] = val.replace("أخرى: ", "");
          } else if (val.startsWith("__OTHER__: ")) {
            initial[q.id] = val.replace("__OTHER__: ", "");
          }
        } else if (Array.isArray(val)) {
          const otherItem = val.find(
            (v: unknown) => typeof v === "string" && (v.startsWith("أخرى: ") || v.startsWith("__OTHER__: "))
          );
          if (otherItem && typeof otherItem === "string") {
            initial[q.id] = otherItem.replace(/^(أخرى: |__OTHER__: )/, "");
          }
        }
      });
    }
    return initial;
  });

  // تخزين الإجابات المختارة
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    if (survey.userResponse) {
      survey.questions.forEach((q) => {
        const val = survey.userResponse?.[q.id];
        if (val !== undefined && val !== null) {
          if (typeof val === "string") {
            if (val.startsWith("أخرى: ") || val.startsWith("__OTHER__: ")) {
              initial[q.id] = "أخرى";
            } else {
              initial[q.id] = val;
            }
          } else if (Array.isArray(val)) {
            initial[q.id] = val.map((v: unknown) =>
              typeof v === "string" && (v.startsWith("أخرى: ") || v.startsWith("__OTHER__: ")) ? "أخرى" : v
            );
          } else {
            initial[q.id] = val;
          }
        }
      });
    }
    return initial;
  });

  const isClosed =
    survey.status !== "OPEN" || Boolean(survey.deadline && new Date(survey.deadline) < new Date());
  const isAnswered = Boolean((hasVoted && !isEditingVote) || isClosed);

  // نسخ رابط الاستبيان
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("تم نسخ رابط الاستبيان المباشر بنجاح! 📋");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // مشاركة عبر واتساب
  const handleShareWhatsApp = () => {
    if (typeof window !== "undefined") {
      const text = `🗳️ شارك في استبيان: *${survey.title}*\n${window.location.href}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // مشاركة عبر تليجرام
  const handleShareTelegram = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const text = `🗳️ استبيان: ${survey.title}`;
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  const handleSingleSelect = (qId: string, option: string) => {
    if (isClosed) return;
    if (hasVoted && !isEditingVote) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const handleMultiSelect = (qId: string, option: string) => {
    if (isClosed) return;
    if (hasVoted && !isEditingVote) return;
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
    if (isClosed) return;
    if (hasVoted && !isEditingVote) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: star }));
  };

  const handleSubmit = async () => {
    if (!survey.isLoggedIn) {
      toast.error("يرجى تسجيل الدخول أولاً للمشاركة في الاستبيان");
      return;
    }

    // تجهيز الإجابات النهائية مع تضمين نص خيار "أخرى" إن تم اختياره
    const payload: Record<string, any> = {};

    survey.questions.forEach((q) => {
      const rawAns = selectedAnswers[q.id];
      if (rawAns === undefined || rawAns === null || rawAns === "") return;

      if (q.type === "POLL_SINGLE") {
        if (rawAns === "أخرى") {
          const txt = (otherTexts[q.id] || "").trim();
          payload[q.id] = txt ? `أخرى: ${txt}` : "أخرى";
        } else {
          payload[q.id] = rawAns;
        }
      } else if (q.type === "POLL_MULTI") {
        if (Array.isArray(rawAns)) {
          payload[q.id] = rawAns.map((item) => {
            if (item === "أخرى") {
              const txt = (otherTexts[q.id] || "").trim();
              return txt ? `أخرى: ${txt}` : "أخرى";
            }
            return item;
          });
        } else {
          payload[q.id] = rawAns;
        }
      } else {
        payload[q.id] = rawAns;
      }
    });

    const answeredCount = Object.keys(payload).length;
    if (answeredCount === 0) {
      toast.error("يرجى اختيار إجابة واحدة على الأقل قبل الإرسال");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSurveyVote(survey.id, payload);
      if (res.ok) {
        if (!hasVoted) {
          setTotalVotes((v) => v + 1);
        }
        setHasVoted(true);
        setIsEditingVote(false);
        if (res.awardedPoints) {
          toast.success(`تم تسجيل مشاركتك بنجاح! 🎉 وحصلت على +${res.awardedPoints} XP`);
        } else {
          toast.success("تم حفظ وتحديث إجاباتك بنجاح ✓");
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

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return "غير راضٍ تماماً 😞";
      case 2:
        return "يحتاج إلى تحسين 😐";
      case 3:
        return "جيد ومقبول 🙂";
      case 4:
        return "جيد جداً ومميز 😃";
      case 5:
        return "ممتاز ورائع للغاية! 🌟";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        {/* ── شريط التنقل العلوي ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-gold transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لمجتمع الكلية
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              title="نسخ الرابط"
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-xs font-bold text-foreground transition-all shadow-sm"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] text-emerald-500">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gold" />
                  <span className="text-[11px]">نسخ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              title="مشاركة عبر واتساب"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleShareTelegram}
              title="مشاركة عبر تليجرام"
              className="inline-flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 transition-all shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">تليجرام</span>
            </button>
          </div>
        </div>

        {/* ── بطاقة رأس الاستبيان الفاخرة (Google Forms Style) ── */}
        <div className="overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-card via-card/95 to-card p-6 sm:p-8 shadow-xl relative">
          {/* خط ذهبي مميز في الأعلى كاستبيانات جوجل الرسمية */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-gold/60 via-gold to-gold/60" />

          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-inner">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-gold-deep dark:text-gold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> استطلاع رأي رسمي
                  </span>
                  <span className="text-[11px] text-muted-foreground">اللجنة التكنولوجية</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isClosed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-black text-rose-500">
                    <Lock className="h-3.5 w-3.5" />
                    مغلق للتصويت
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    مفتوح للمشاركة
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  {totalVotes} صوت
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug">
              {survey.title}
            </h1>

            {survey.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/60 pt-3">
                {survey.description}
              </p>
            )}

            {/* تفاصيل إضافية وتاريخ الانتهاء */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              {survey.deadline && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                  <Clock className="h-4 w-4" />
                  <span>ينتهي في: {new Date(survey.deadline).toLocaleDateString("ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>تاريخ النشر: {new Date(survey.createdAt).toLocaleDateString("ar-EG")}</span>
              </div>
            </div>

            {/* شارة توضح حالة تصويت المستخدم الحالي */}
            {hasVoted && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 p-3.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>لقد قمت بالمشاركة وتسجيل إجاباتك في هذا الاستبيان بنجاح ✓</span>
                </div>

                {!isClosed && (
                  <button
                    type="button"
                    onClick={() => setIsEditingVote(!isEditingVote)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/30 px-3 py-1.5 text-xs font-black text-gold transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {isEditingVote ? "إلغاء التعديل ✕" : "تعديل إجابتي ✏️"}
                  </button>
                )}
              </div>
            )}

            {!survey.isLoggedIn && !isClosed && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/[0.08] border border-amber-500/30 p-3.5 text-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>يجب تسجيل الدخول بحسابك الجامعي لحفظ وتوثيق صوتك في الاستبيان.</span>
                </div>
                <Link
                  href={`/login?redirect=/surveys/${survey.id}`}
                  className="rounded-xl bg-gold px-3 py-1.5 text-xs font-black text-night hover:bg-gold-light transition-all shrink-0"
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── بطاقات الأسئلة ── */}
        <div className="space-y-5">
          {survey.questions.map((q, qIndex) => {
            const isQuestionAnswered = (hasVoted && !isEditingVote) || isClosed;
            const currentSelected = selectedAnswers[q.id];

            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-4"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <span className="text-[11px] font-black text-gold">سؤال {qIndex + 1}</span>
                    <h3 className="text-sm sm:text-base font-black text-foreground mt-0.5">
                      {q.question}
                    </h3>
                    {q.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                  </div>

                  {q.type === "POLL_MULTI" && !isQuestionAnswered && (
                    <span className="rounded-xl bg-gold/10 px-2.5 py-1 text-[10px] font-black text-gold border border-gold/20 shrink-0">
                      اختيار متعدد
                    </span>
                  )}
                </div>

                {/* حالة 1: تم التصويت أو مغلق -> عرض أشرطة النسب المئوية */}
                {isQuestionAnswered && (q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") ? (
                  <div className="space-y-2.5 pt-1">
                    {q.optionsStats.map((opt) => {
                      const isSelectedByUser =
                        q.type === "POLL_SINGLE"
                          ? currentSelected === opt.option ||
                            (opt.isOther &&
                              typeof currentSelected === "string" &&
                              (currentSelected.startsWith("أخرى:") ||
                                currentSelected.startsWith("__OTHER__:")))
                          : Array.isArray(currentSelected) &&
                            (currentSelected.includes(opt.option) ||
                              (opt.isOther &&
                                currentSelected.some(
                                  (v: string) =>
                                    v.startsWith("أخرى:") || v.startsWith("__OTHER__:")
                                )));

                      return (
                        <div
                          key={opt.option}
                          className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all ${
                            isSelectedByUser
                              ? "border-gold/60 bg-gold/[0.09] shadow-sm"
                              : "border-border/80 bg-card/60"
                          }`}
                        >
                          {/* شريط التقدم النسبة المئوية */}
                          <div
                            className={`absolute inset-y-0 start-0 opacity-20 transition-all duration-700 ${
                              isSelectedByUser ? "bg-gold" : "bg-muted-foreground"
                            }`}
                            style={{ width: `${opt.percentage}%` }}
                          />

                          <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm font-bold">
                            <span className="flex items-center gap-2 text-foreground">
                              {isSelectedByUser && (
                                <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />
                              )}
                              <span>{opt.option}</span>
                            </span>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                ({opt.count} صوت)
                              </span>
                              <span
                                className={`text-xs sm:text-sm font-black ${
                                  isSelectedByUser ? "text-gold" : "text-foreground"
                                }`}
                              >
                                {opt.percentage}%
                              </span>
                            </div>
                          </div>

                          {/* لو كان هناك مقترح مكتوب في خيار أخرى بواسطة المستخدم الحالي */}
                          {opt.isOther && isSelectedByUser && otherTexts[q.id] && (
                            <div className="relative mt-2 rounded-xl bg-gold/10 border border-gold/25 p-2 text-[11px] text-foreground">
                              <span className="font-black text-gold">مقترحك المكتوب: </span>
                              {otherTexts[q.id]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* حالة 2: لم يتم التصويت بعد أو في وضع التعديل -> أزرار الخيارات التفاعلية */}
                {!isQuestionAnswered && (q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") ? (
                  <div className="space-y-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isSelected =
                        q.type === "POLL_SINGLE"
                          ? currentSelected === opt
                          : Array.isArray(currentSelected) && currentSelected.includes(opt);

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            q.type === "POLL_SINGLE"
                              ? handleSingleSelect(q.id, opt)
                              : handleMultiSelect(q.id, opt)
                          }
                          className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-4 text-start transition-all ${
                            isSelected
                              ? "border-gold bg-gold/15 text-gold-deep dark:text-gold shadow-md"
                              : "border-border/80 bg-card/80 text-foreground hover:border-gold/40 hover:bg-muted/40"
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-black">{opt}</span>
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                              isSelected
                                ? "border-gold bg-gold text-night"
                                : "border-muted-foreground/40 bg-transparent"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                        </button>
                      );
                    })}

                    {/* خيار «أخرى» إذا كان السؤال يسمح به */}
                    {q.allowOther && (
                      <div className="space-y-2 pt-1">
                        {(() => {
                          const isOtherSelected =
                            q.type === "POLL_SINGLE"
                              ? currentSelected === "أخرى"
                              : Array.isArray(currentSelected) && currentSelected.includes("أخرى");

                          return (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  q.type === "POLL_SINGLE"
                                    ? handleSingleSelect(q.id, "أخرى")
                                    : handleMultiSelect(q.id, "أخرى")
                                }
                                className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-4 text-start transition-all ${
                                  isOtherSelected
                                    ? "border-gold bg-gold/15 text-gold-deep dark:text-gold shadow-md"
                                    : "border-border/80 bg-card/80 text-foreground hover:border-gold/40 hover:bg-muted/40"
                                }`}
                              >
                                <span className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                                  <span>خيار آخر غير مذكور (أخرى) ✍️</span>
                                </span>
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                    isOtherSelected
                                      ? "border-gold bg-gold text-night"
                                      : "border-muted-foreground/40 bg-transparent"
                                  }`}
                                >
                                  {isOtherSelected && <CheckCircle2 className="h-4 w-4" />}
                                </div>
                              </button>

                              {/* حقل إدخال المقترح المخصص إذا اختار أخرى */}
                              {isOtherSelected && (
                                <div className="ps-2 pe-1 pt-1">
                                  <input
                                    type="text"
                                    value={otherTexts[q.id] || ""}
                                    onChange={(e) =>
                                      setOtherTexts((prev) => ({
                                        ...prev,
                                        [q.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="اكتب مقترحك أو خيارك المخصص هنا..."
                                    className="w-full rounded-2xl border border-gold/40 bg-card px-4 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold shadow-inner"
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* سؤال التقييم بالنجوم (RATING) */}
                {q.type === "RATING" && (
                  <div className="pt-2">
                    {isQuestionAnswered ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/20 border border-border">
                        <div className="flex items-center gap-1 text-gold">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-5 w-5 ${
                                (Number(currentSelected) || 0) >= s
                                  ? "fill-gold text-gold"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-foreground">
                          تقييمك: {currentSelected || "—"} من 5 نجوم (
                          {getRatingLabel(Number(currentSelected))})
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3 p-2">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = (Number(currentSelected) || 0) >= star;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleRatingSelect(q.id, star)}
                                className="p-1 text-gold hover:scale-125 transition-transform"
                              >
                                <Star
                                  className={`h-8 w-8 sm:h-9 sm:w-9 ${
                                    active
                                      ? "fill-gold text-gold"
                                      : "text-muted-foreground/30 hover:text-gold/60"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                        {currentSelected && (
                          <p className="text-xs font-black text-gold">
                            {getRatingLabel(Number(currentSelected))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* سؤال إجابة نصية مفتوحة (TEXT) */}
                {q.type === "TEXT" && (
                  <div className="pt-1">
                    {isQuestionAnswered ? (
                      <div className="rounded-2xl border border-border bg-muted/20 p-4 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {currentSelected || "لم يتم كتابة إجابة."}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={currentSelected || ""}
                        onChange={(e) =>
                          setSelectedAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="اكتب إجابتك أو مقترحك هنا..."
                        className="w-full rounded-2xl border border-border bg-card p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── منطقة إرسال التصويت ── */}
        {(!hasVoted || isEditingVote) && !isClosed && (
          <div className="sticky bottom-4 z-20 rounded-3xl border border-gold/30 bg-card/95 backdrop-blur-md p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-start">
              <p className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-gold shrink-0" />
                {hasVoted ? "تحديث إجاباتك السابقة" : "صوتك أمانة ويصنع الفارق في قرارات الكلية"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasVoted
                  ? "يمكنك تعديل أي خيار وإعادة إرساله فوراً"
                  : "تحصل على +15 XP في حسابك فور إرسال تصويتك الأول 🚀"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-8 py-3.5 text-sm font-black text-night hover:bg-gold-light transition-all shadow-lg disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-night border-t-transparent" />
                  جاري تسجيل صوتك...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isEditingVote ? "حفظ وتحديث الإجابات 🚀" : "إرسال التصويت النهائي 🚀"}
                </>
              )}
            </button>
          </div>
        )}

        {/* ── تذييل الاستبيان الرسمي ── */}
        <div className="text-center pt-8 border-t border-border/60 text-xs text-muted-foreground space-y-1">
          <p className="font-bold">
            استطلاع رأي تنفيذي معتمد من اللجنة التكنولوجية - اتحاد طلاب الكلية
          </p>
          <p className="text-[11px]">
            يتم حفظ كافة الأصوات بسرية وشفافية لخدمة المصلحة الطلابية وصناع القرار.
          </p>
        </div>
      </div>
    </div>
  );
}
