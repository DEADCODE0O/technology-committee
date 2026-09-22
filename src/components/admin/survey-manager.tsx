"use client";

import { useState } from "react";
import {
  BarChart3,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  Users,
  Download,
  Star,
  Brain,
  AlertTriangle,
  Lightbulb,
  Info,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";
import {
  createSurvey,
  toggleSurveyStatus,
  deleteSurvey,
  getSurveyAnalytics,
  type CreateSurveyInput,
  type SurveyAnalyticsResult,
} from "@/actions/surveys";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  responsesCount: number;
  questionsCount: number;
}

interface SurveyManagerProps {
  initialSurveys: SurveyListItem[];
  canManage: boolean;
}

export function SurveyManager({ initialSurveys, canManage }: SurveyManagerProps) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyListItem[]>(initialSurveys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<SurveyAnalyticsResult | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // حالة نموذج الإنشاء
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [postToCommunity, setPostToCommunity] = useState(true);
  const [questions, setQuestions] = useState<
    { id: string; type: "POLL_SINGLE" | "POLL_MULTI" | "RATING" | "TEXT"; question: string; options: string[] }[]
  >([
    {
      id: "q_1",
      type: "POLL_SINGLE",
      question: "ما هو موضوع الورشة أو المحاضرة القادمة التي تفضلها؟",
      options: ["تطوير تطبيقات الموبايل (Flutter)", "الذكاء الاصطناعي وتعلم الآلة", "الأمن السيبراني والهاكينج الأخلاقي", "تطوير الويب الحديث (Next.js)"],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إحصائيات عامة
  const totalVotes = surveys.reduce((acc, s) => acc + s.responsesCount, 0);
  const activeCount = surveys.filter((s) => s.status === "OPEN").length;

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${prev.length + 1}`,
        type: "POLL_SINGLE",
        question: "",
        options: ["خيار 1", "خيار 2"],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("يجب أن يحتوي الاستبيان على سؤال واحد على الأقل");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].options.push(`خيار جديد`);
      return copy;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[qIndex].options.length <= 2) {
        toast.error("يجب أن يحتوي السؤال على خيارين على الأقل");
        return prev;
      }
      copy[qIndex].options = copy[qIndex].options.filter((_, i) => i !== optIndex);
      return copy;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان للاستبيان");
      return;
    }

    for (const q of questions) {
      if (!q.question.trim()) {
        toast.error("يرجى كتابة نص كافة الأسئلة");
        return;
      }
      if ((q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") && q.options.length < 2) {
        toast.error("كل سؤال اختياري يجب أن يحتوي على خيارين على الأقل");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateSurveyInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          required: true,
        })),
        deadline: deadline ? deadline : undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        postToCommunity,
      };

      const res = await createSurvey(payload);
      if (res.ok) {
        toast.success("تم إنشاء الاستبيان ونشره بنجاح! 📊");
        setIsCreateOpen(false);
        setTitle("");
        setDescription("");
        setDeadline("");
        setBannerUrl("");
        router.refresh();
      } else {
        toast.error(res.error || "فشل إنشاء الاستبيان");
      }
    } catch {
      toast.error("حدث خطأ أثناء إنشاء الاستبيان");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewAnalytics = async (surveyId: string) => {
    setIsLoadingAnalytics(true);
    setSelectedAnalytics(null);
    try {
      const data = await getSurveyAnalytics(surveyId);
      if (data) {
        setSelectedAnalytics(data);
      } else {
        toast.error("تعذر جلب تحليلات الاستبيان");
      }
    } catch {
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleToggleStatus = async (surveyId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await toggleSurveyStatus(surveyId, nextStatus);
      if (res.ok) {
        toast.success(`تم ${nextStatus === "OPEN" ? "إعادة فتح" : "إغلاق"} الاستبيان`);
        setSurveys((prev) =>
          prev.map((s) => (s.id === surveyId ? { ...s, status: nextStatus } : s))
        );
      } else {
        toast.error(res.error || "فشل تعديل الحالة");
      }
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاستبيان وكافة الردود المرتبطة به؟")) return;
    try {
      const res = await deleteSurvey(surveyId);
      if (res.ok) {
        toast.success("تم حذف الاستبيان بنجاح");
        setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
        if (selectedAnalytics?.id === surveyId) setSelectedAnalytics(null);
      } else {
        toast.error(res.error || "فشل الحذف");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const exportCSV = (analytics: SurveyAnalyticsResult) => {
    const rows: string[][] = [
      ["عنوان الاستبيان", analytics.title],
      ["إجمالي المشاركين", String(analytics.totalResponses)],
      ["تاريخ الإنشاء", analytics.createdAt],
      [],
      ["السؤال", "النوع", "الخيار / النجوم", "عدد الأصوات", "النسبة المئوية"],
    ];

    analytics.questionsAnalytics.forEach((qa) => {
      if (qa.optionsStats.length > 0) {
        qa.optionsStats.forEach((opt) => {
          rows.push([qa.question, qa.type, opt.option, String(opt.count), `${opt.percentage}%`]);
        });
      } else if (qa.type === "RATING") {
        rows.push([qa.question, qa.type, `متوسط التقييم: ${qa.averageRating}`, String(qa.totalAnswers), "100%"]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((e) => e.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `survey_analytics_${analytics.id.slice(-6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف CSV بنجاح! 📥");
  };

  return (
    <div className="space-y-6">
      {/* ── بطاقات الإحصائيات العامة ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <BarChart3 className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1.5 text-2xl font-black text-foreground">{surveys.length}</p>
          <p className="text-[11px] font-bold text-muted-foreground">إجمالي الاستبيانات</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
          <p className="mt-1.5 text-2xl font-black text-emerald-500">{activeCount}</p>
          <p className="text-[11px] font-bold text-muted-foreground">استبيانات نشطة الآن</p>
        </div>
        <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1.5 text-2xl font-black text-gold">{totalVotes}</p>
          <p className="text-[11px] font-bold text-muted-foreground">إجمالي الأصوات المسجلة</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Brain className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1.5 text-2xl font-black text-foreground">ذكاء القرار 💡</p>
          <p className="text-[11px] font-bold text-muted-foreground">تحليلات وتوصيات تلقائية</p>
        </div>
      </div>

      {/* زر إنشاء استبيان جديد */}
      {canManage && (
        <div className="flex items-center justify-between gap-3 bg-muted/20 border border-border rounded-2xl p-4">
          <div>
            <h3 className="text-sm font-black text-foreground">إنشاء استبيان تفاعلي جديد</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              اطرح أسئلة أو استطلاعات لطلاب اللجنة، وانشرها مباشرة في المجتمع مع تحليلات ذكية لاتخاذ القرار.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md shrink-0"
          >
            <Plus className="h-4 w-4" />
            استبيان جديد 📊
          </button>
        </div>
      )}

      {/* ── جدول الاستبيانات ── */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" />
            سجل الاستبيانات واستطلاعات الرأي ({surveys.length})
          </h2>
        </div>

        {surveys.length > 0 ? (
          <div className="divide-y divide-border overflow-x-auto">
            {surveys.map((s) => (
              <div
                key={s.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">{s.title}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                        s.status === "OPEN"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {s.status === "OPEN" ? "مفتوح للتصويت 🟢" : "مغلق 🏁"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gold" />
                      {s.responsesCount} طالب شارك
                    </span>
                    <span>·</span>
                    <span>{s.questionsCount} أسئلة</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(
                        new Date(s.createdAt)
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewAnalytics(s.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-sm"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    التحليلات واتخاذ القرار 💡
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s.id, s.status)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-muted p-2 text-xs text-muted-foreground hover:text-foreground"
                        title={s.status === "OPEN" ? "إغلاق الاستبيان" : "إعادة فتح الاستبيان"}
                      >
                        {s.status === "OPEN" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                        title="حذف الاستبيان"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-bold">لا توجد أي استبيانات منشأة حتى الآن</p>
            <p className="text-xs">ابدأ بإنشاء استبيانك الأول لقياس آراء الطلاب وتوجيه القرارات بدقة.</p>
          </div>
        )}
      </div>

      {/* ── نافذة إنشاء استبيان جديد (Modal) ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-gold/30 bg-card p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gold" />
                إنشاء استبيان واستطلاع رأي تفاعلي
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  عنوان الاستبيان <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: استطلاع رأي: الموعد الأنسب لورشة الأمن السيبراني"
                  className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  وصف ومقدمة الاستبيان (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح للطلاب الهدف من الاستبيان وكيف سيساهم رأيهم في صناعة القرار..."
                  className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    الموعد النهائي للتصويت (اختياري)
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    رابط صورة غلاف / بانر (اختياري)
                  </label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-2xl bg-gold/10 border border-gold/20">
                <input
                  type="checkbox"
                  id="postCommunity"
                  checked={postToCommunity}
                  onChange={(e) => setPostToCommunity(e.target.checked)}
                  className="h-4 w-4 rounded accent-gold"
                />
                <label htmlFor="postCommunity" className="text-xs font-bold text-foreground cursor-pointer">
                  نشر الاستبيان فوراً كمنشور تفاعلي رسمي في قسم المجتمع 📢
                </label>
              </div>

              {/* ── منشئ الأسئلة ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-gold" />
                    أسئلة وخيارات الاستبيان ({questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 rounded-xl bg-muted hover:bg-muted/80 px-2.5 py-1 text-[11px] font-black text-gold"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة سؤال
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={q.id} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-gold">سؤال {qIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            setQuestions((prev) => {
                              const copy = [...prev];
                              copy[qIdx].type = newType;
                              return copy;
                            });
                          }}
                          className="rounded-xl border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground focus:border-gold"
                        >
                          <option value="POLL_SINGLE">اختيار فردي (Radio)</option>
                          <option value="POLL_MULTI">اختيار متعدد (Checkbox)</option>
                          <option value="RATING">تقييم نجوم (1-5)</option>
                          <option value="TEXT">إجابة نصية حرة</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-muted-foreground hover:text-rose-500 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((prev) => {
                          const copy = [...prev];
                          copy[qIdx].question = val;
                          return copy;
                        });
                      }}
                      placeholder="نص السؤال..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                    />

                    {/* خيارات السؤال إذا كان تصويت */}
                    {(q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") && (
                      <div className="space-y-2 pt-1 ps-2 border-s-2 border-gold/40">
                        <p className="text-[11px] font-bold text-muted-foreground">خيارات الإجابة:</p>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-4">{optIdx + 1}.</span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions((prev) => {
                                  const copy = [...prev];
                                  copy[qIdx].options[optIdx] = val;
                                  return copy;
                                });
                              }}
                              className="flex-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-gold"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(qIdx, optIdx)}
                                className="text-muted-foreground hover:text-rose-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-[11px] font-bold text-gold hover:underline pt-1 inline-flex items-center gap-1"
                        >
                          + إضافة خيار إضافي
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-gold px-6 py-2 text-xs font-black text-night hover:bg-gold-light shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء ونشر الآن 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── لوحة تحليلات الاستبيان ومحرك اتخاذ القرار (Analytics & Decision Modal) ── */}
      {selectedAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl border border-gold/40 bg-card p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* الهيدر */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/15 text-gold px-2.5 py-0.5 text-[10px] font-black border border-gold/30">
                    مركز الاستخبارات والقرارات 🤖💡
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedAnalytics.totalResponses} مشارك
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground mt-1">
                  تحليلات: {selectedAnalytics.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => exportCSV(selectedAnalytics)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted hover:bg-muted/80 px-3.5 py-2 text-xs font-black text-foreground transition-all shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-gold" />
                  تصدير CSV 📥
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnalytics(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 🤖 محرك التوصيات والقرارات الاستراتيجية التلقائية */}
            {selectedAnalytics.recommendations.length > 0 && (
              <div className="rounded-3xl border border-gold/35 bg-gold/[0.05] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-gold" />
                  <h4 className="text-sm font-black text-foreground">
                    محرك التوصيات واتخاذ القرار التلقائي (Decision Engine) 💡
                  </h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedAnalytics.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl border p-4 space-y-2 ${
                        rec.severity === "SUCCESS"
                          ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                          : rec.severity === "WARNING"
                          ? "border-amber-500/30 bg-amber-500/[0.06]"
                          : "border-blue-500/30 bg-blue-500/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {rec.severity === "SUCCESS" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {rec.severity === "WARNING" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                        {rec.severity === "INFO" && <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />}
                        <h5 className="text-xs font-black text-foreground">{rec.title}</h5>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.summary}</p>
                      <div className="rounded-xl bg-card/80 p-2.5 border border-border/60 text-[11px] font-bold text-foreground">
                        <strong className="text-gold">القرار الموصى به: </strong>
                        {rec.actionableDecision}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── توزيع الأسئلة والنتائج بالأشرطة ── */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gold" />
                نتائج الأسئلة التفصيلية
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {selectedAnalytics.questionsAnalytics.map((qa, idx) => (
                  <div key={qa.id} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-black text-foreground">
                        {idx + 1}. {qa.question}
                      </h5>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {qa.totalAnswers} إجابة
                      </span>
                    </div>

                    {qa.optionsStats.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {qa.optionsStats.map((opt) => (
                          <div key={opt.option} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-foreground">{opt.option}</span>
                              <span className="text-gold">{opt.percentage}% ({opt.count})</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gold transition-all duration-500"
                                style={{ width: `${opt.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {qa.type === "RATING" && qa.averageRating !== undefined && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-gold">{qa.averageRating}</span>
                          <div className="flex items-center text-gold">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-4 w-4 ${
                                  (qa.averageRating || 0) >= s ? "fill-gold text-gold" : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted-foreground">من 5 نجوم</span>
                        </div>

                        {qa.ratingBreakdown && (
                          <div className="space-y-1 pt-2">
                            {qa.ratingBreakdown.map((rb) => (
                              <div key={rb.star} className="flex items-center gap-2 text-[10px]">
                                <span className="w-12 text-muted-foreground">{rb.star} نجوم</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-gold rounded-full" style={{ width: `${rb.percentage}%` }} />
                                </div>
                                <span className="w-8 text-end text-muted-foreground">{rb.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {qa.type === "TEXT" && qa.textAnswers && (
                      <div className="space-y-2 pt-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {qa.textAnswers.length > 0 ? (
                          qa.textAnswers.map((ta, tIdx) => (
                            <div key={tIdx} className="rounded-xl border border-border/80 bg-card p-2.5 text-xs">
                              <p className="text-foreground">{ta.answer}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {ta.studentName} ({ta.grade}) · {ta.date}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">لا توجد إجابات نصية بعد.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── التوزيع الديموغرافي ── */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-gold" />
                التوزيع الديموغرافي للمشاركين
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* حسب الفرقة */}
                <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-foreground">حسب الفرقة الدراسية</h5>
                  {selectedAnalytics.demographics.byGrade.map((g) => (
                    <div key={g.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{g.label}</span>
                      <span className="font-bold text-foreground">{g.percentage}% ({g.count})</span>
                    </div>
                  ))}
                </div>

                {/* حسب الشعبة */}
                <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-foreground">حسب الشعبة</h5>
                  {selectedAnalytics.demographics.bySection.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-bold text-foreground">{s.percentage}% ({s.count})</span>
                    </div>
                  ))}
                </div>

                {/* حسب النوع */}
                <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-foreground">حسب النوع</h5>
                  {selectedAnalytics.demographics.byGender.map((gn) => (
                    <div key={gn.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{gn.label}</span>
                      <span className="font-bold text-foreground">{gn.percentage}% ({gn.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
