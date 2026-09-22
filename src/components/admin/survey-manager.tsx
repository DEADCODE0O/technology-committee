"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  Pencil,
  Pin,
  FileSpreadsheet,
  MessageCircle,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  createSurvey,
  updateSurvey,
  toggleSurveyPin,
  toggleSurveyStatus,
  deleteSurvey,
  getSurveyAnalytics,
  type CreateSurveyInput,
  type UpdateSurveyInput,
  type SurveyAnalyticsResult,
  type VoterInfo,
} from "@/actions/surveys";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface SurveyQuestionItem {
  id: string;
  type: "POLL_SINGLE" | "POLL_MULTI" | "RATING" | "TEXT";
  question: string;
  options: string[];
  allowOther?: boolean;
}

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  responsesCount: number;
  questionsCount: number;
  pinned?: boolean;
  questions?: SurveyQuestionItem[];
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

  // تبويبات نافذة التحليلات والمفاضلة
  const [analyticsTab, setAnalyticsTab] = useState<"SUMMARY" | "VOTERS" | "MATRIX">("SUMMARY");
  const [selectedQuestionFilter, setSelectedQuestionFilter] = useState<string>("ALL");
  const [selectedOptionFilter, setSelectedOptionFilter] = useState<string>("ALL");
  const [voterSearchQuery, setVoterSearchQuery] = useState("");
  const [voterGradeFilter, setVoterGradeFilter] = useState("ALL");

  // حالة نموذج الإنشاء
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [postToCommunity, setPostToCommunity] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [questions, setQuestions] = useState<SurveyQuestionItem[]>([
    {
      id: "q_1",
      type: "POLL_SINGLE",
      question: "ما هو موضوع الورشة أو المحاضرة القادمة التي تفضلها؟",
      options: [
        "تطوير تطبيقات الموبايل (Flutter)",
        "الذكاء الاصطناعي وتعلم الآلة",
        "الأمن السيبراني والهاكينج الأخلاقي",
        "تطوير الويب الحديث (Next.js)",
      ],
      allowOther: true,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالة نموذج التعديل
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [editPinned, setEditPinned] = useState(false);
  const [editQuestions, setEditQuestions] = useState<SurveyQuestionItem[]>([]);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

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
        allowOther: false,
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
      copy[qIndex].options.push(`خيار جديد ${copy[qIndex].options.length + 1}`);
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
          allowOther: !!q.allowOther,
          required: true,
        })),
        deadline: deadline ? deadline : undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        postToCommunity,
        pinned,
      };

      const res = await createSurvey(payload);
      if (res.ok) {
        toast.success("تم إنشاء الاستبيان ونشره بنجاح! 📊");
        setIsCreateOpen(false);
        setTitle("");
        setDescription("");
        setDeadline("");
        setBannerUrl("");
        setPinned(false);
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

  const handleTogglePin = async (surveyId: string, currentPinned: boolean) => {
    try {
      const res = await toggleSurveyPin(surveyId, !currentPinned);
      if (res.ok) {
        toast.success(
          !currentPinned
            ? "تم تثبيت الاستبيان في أعلى المجتمع 📌"
            : "تم إلغاء تثبيت الاستبيان من المجتمع"
        );
        setSurveys((prev) =>
          prev.map((s) => (s.id === surveyId ? { ...s, pinned: !currentPinned } : s))
        );
        router.refresh();
      } else {
        toast.error(res.error || "فشل تغيير حالة التثبيت");
      }
    } catch {
      toast.error("حدث خطأ أثناء تغيير حالة التثبيت");
    }
  };

  const handleOpenEdit = (s: SurveyListItem) => {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditDescription(s.description || "");
    setEditDeadline(s.deadline ? s.deadline.slice(0, 16) : "");
    setEditStatus((s.status as "OPEN" | "CLOSED") || "OPEN");
    setEditPinned(!!s.pinned);
    setEditQuestions(
      s.questions && s.questions.length > 0
        ? s.questions.map((q) => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options && q.options.length > 0 ? [...q.options] : ["خيار 1", "خيار 2"],
            allowOther: !!q.allowOther,
          }))
        : [
            {
              id: "q_1",
              type: "POLL_SINGLE",
              question: "سؤال الاستبيان",
              options: ["خيار 1", "خيار 2"],
              allowOther: false,
            },
          ]
    );
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    if (!editTitle.trim()) {
      toast.error("يرجى إدخال عنوان الاستبيان");
      return;
    }

    for (const q of editQuestions) {
      if (!q.question.trim()) {
        toast.error("يرجى ملء كافة نصوص الأسئلة");
        return;
      }
      if ((q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") && q.options.length < 2) {
        toast.error("كل سؤال اختياري يجب أن يحتوي على خيارين على الأقل");
        return;
      }
    }

    setIsEditingSubmitting(true);
    try {
      const res = await updateSurvey({
        id: editingId,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        status: editStatus,
        deadline: editDeadline || undefined,
        pinned: editPinned,
        questions: editQuestions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          allowOther: !!q.allowOther,
        })),
      });

      if (res.ok) {
        toast.success("تم حفظ تعديل الاستبيان بنجاح! ✏️");
        setSurveys((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  title: editTitle.trim(),
                  description: editDescription.trim() || null,
                  status: editStatus,
                  deadline: editDeadline || null,
                  pinned: editPinned,
                  questionsCount: editQuestions.length,
                  questions: editQuestions,
                }
              : s
          )
        );
        setIsEditOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "فشل حفظ التعديل");
      }
    } catch {
      toast.error("حدث خطأ أثناء حفظ التعديل");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleAddEditQuestion = () => {
    setEditQuestions((prev) => [
      ...prev,
      {
        id: `q_${prev.length + 1}`,
        type: "POLL_SINGLE",
        question: "",
        options: ["خيار 1", "خيار 2"],
        allowOther: false,
      },
    ]);
  };

  const handleRemoveEditQuestion = (index: number) => {
    if (editQuestions.length <= 1) {
      toast.error("يجب أن يحتوي الاستبيان على سؤال واحد على الأقل");
      return;
    }
    setEditQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEditOption = (qIndex: number) => {
    setEditQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].options.push(`خيار جديد ${copy[qIndex].options.length + 1}`);
      return copy;
    });
  };

  const handleRemoveEditOption = (qIndex: number, optIndex: number) => {
    if (editQuestions[qIndex].options.length <= 2) {
      toast.error("يجب أن يحتوي السؤال على خيارين على الأقل");
      return;
    }
    setEditQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].options = copy[qIndex].options.filter((_, i) => i !== optIndex);
      return copy;
    });
  };

  const handleViewAnalytics = async (surveyId: string) => {
    setIsLoadingAnalytics(true);
    setSelectedAnalytics(null);
    setAnalyticsTab("SUMMARY");
    setSelectedQuestionFilter("ALL");
    setSelectedOptionFilter("ALL");
    setVoterSearchQuery("");
    setVoterGradeFilter("ALL");
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
        rows.push([
          qa.question,
          qa.type,
          `متوسط التقييم: ${qa.averageRating}`,
          String(qa.totalAnswers),
          "100%",
        ]);
      }
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((e) => e.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `survey_analytics_${analytics.id.slice(-6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف CSV بنجاح! 📥");
  };

  // تجميع قائمة المصوتين للمفاضلة والكشف
  const filteredVoters = useMemo(() => {
    if (!selectedAnalytics) return [];

    interface EnrichedVoter extends VoterInfo {
      questionId: string;
      questionTitle: string;
      optionChosen: string;
      isOtherOption: boolean;
    }

    const list: EnrichedVoter[] = [];

    selectedAnalytics.questionsAnalytics.forEach((qa) => {
      if (selectedQuestionFilter !== "ALL" && qa.id !== selectedQuestionFilter) return;

      qa.optionsStats.forEach((opt) => {
        if (selectedOptionFilter !== "ALL" && opt.option !== selectedOptionFilter) return;

        (opt.voters || []).forEach((v) => {
          list.push({
            ...v,
            questionId: qa.id,
            questionTitle: qa.question,
            optionChosen: opt.option,
            isOtherOption: !!opt.isOther,
          });
        });
      });
    });

    return list.filter((v) => {
      if (voterGradeFilter !== "ALL" && v.grade !== voterGradeFilter) return false;

      if (voterSearchQuery.trim()) {
        const q = voterSearchQuery.trim().toLowerCase();
        const matchesName = v.studentName?.toLowerCase().includes(q);
        const matchesCode = v.studentCode?.toLowerCase().includes(q);
        const matchesPhone = v.phone?.includes(q);
        const matchesText = v.customText?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesText) return false;
      }

      return true;
    });
  }, [
    selectedAnalytics,
    selectedQuestionFilter,
    selectedOptionFilter,
    voterGradeFilter,
    voterSearchQuery,
  ]);

  // قائمة الخيارات للسؤال المحدد في الفلترة
  const availableOptionsForFilter = useMemo(() => {
    if (!selectedAnalytics) return [];
    if (selectedQuestionFilter === "ALL") {
      const set = new Set<string>();
      selectedAnalytics.questionsAnalytics.forEach((q) =>
        q.optionsStats.forEach((o) => set.add(o.option))
      );
      return Array.from(set);
    }
    const q = selectedAnalytics.questionsAnalytics.find((i) => i.id === selectedQuestionFilter);
    return q ? q.optionsStats.map((o) => o.option) : [];
  }, [selectedAnalytics, selectedQuestionFilter]);

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
          <p className="text-[11px] font-bold text-muted-foreground">تحليلات ومفاضلة ذكية</p>
        </div>
      </div>

      {/* زر إنشاء استبيان جديد */}
      {canManage && (
        <div className="flex items-center justify-between gap-3 bg-muted/20 border border-border rounded-2xl p-4">
          <div>
            <h3 className="text-sm font-black text-foreground">إنشاء استبيان تفاعلي جديد</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              اطرح استبيانات مستقلة مع خيار «أخرى» وكشوفات إكسيل وتحليلات دقيقة لهوية المصوتين.
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
                  <div className="flex items-center gap-2 flex-wrap">
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
                    {s.pinned && (
                      <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black bg-gold/15 text-gold border border-gold/30">
                        <Pin className="h-3 w-3 fill-current" />
                        مثبت في المجتمع 📌
                      </span>
                    )}
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
                      {new Intl.DateTimeFormat("ar-EG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(s.createdAt))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* زر التحليلات واتخاذ القرار */}
                  <button
                    type="button"
                    onClick={() => handleViewAnalytics(s.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-sm"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    التحليلات والمفاضلة 💡
                  </button>

                  {/* زر تصدير الإكسيل المباشر */}
                  <a
                    href={`/api/admin/surveys/${s.id}/export`}
                    download
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-2 text-xs text-emerald-600 dark:text-emerald-400 transition-colors"
                    title="تحميل كشف الإكسيل الكامل (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </a>

                  {/* زر فتح صفحة الاستبيان المستقلة */}
                  <Link
                    href={`/surveys/${s.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-muted p-2 text-xs text-muted-foreground hover:text-gold transition-colors"
                    title="فتح كصفحة استبيان مستقلة ↗"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(s.id, !!s.pinned)}
                        className={`inline-flex items-center gap-1 rounded-xl border p-2 text-xs transition-all ${
                          s.pinned
                            ? "border-gold/50 bg-gold/20 text-gold shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-gold/40 hover:text-gold"
                        }`}
                        title={
                          s.pinned
                            ? "إلغاء تثبيت الاستبيان من المجتمع"
                            : "تثبيت الاستبيان في أعلى المجتمع 📌"
                        }
                      >
                        <Pin className={`h-4 w-4 ${s.pinned ? "fill-current" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-muted p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="تعديل الاستبيان والأسئلة"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s.id, s.status)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-muted p-2 text-xs text-muted-foreground hover:text-foreground"
                        title={s.status === "OPEN" ? "إغلاق الاستبيان" : "إعادة فتح الاستبيان"}
                      >
                        {s.status === "OPEN" ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
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
          <div className="p-12 text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold">لا توجد استبيانات مسجلة حالياً</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          نافذة إنشاء استبيان جديد (Create Modal)
      ══════════════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
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
                  placeholder="مثال: استطلاع رأي: الموعد والموضوع الأنسب لورشة العمل القادمة"
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
                <label
                  htmlFor="postCommunity"
                  className="text-xs font-bold text-foreground cursor-pointer"
                >
                  نشر الاستبيان فوراً كمنشور تفاعلي رسمي في قسم المجتمع 📢
                </label>
              </div>

              {postToCommunity && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-gold/10 border border-gold/20">
                  <input
                    type="checkbox"
                    id="pinCommunity"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="h-4 w-4 rounded accent-gold"
                  />
                  <label
                    htmlFor="pinCommunity"
                    className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <Pin className="h-3.5 w-3.5 text-gold" />
                    تثبيت الاستبيان في أعلى خلاصة المجتمع 📌 (Pinned Post)
                  </label>
                </div>
              )}

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
                  <div
                    key={q.id}
                    className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3"
                  >
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
                            <span className="text-[10px] text-muted-foreground w-4">
                              {optIdx + 1}.
                            </span>
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

                        {/* مفتاح تفعيل خيار «أخرى» */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                          <input
                            type="checkbox"
                            id={`allowOther_create_${qIdx}`}
                            checked={!!q.allowOther}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setQuestions((prev) => {
                                const copy = [...prev];
                                copy[qIdx].allowOther = checked;
                                return copy;
                              });
                            }}
                            className="h-4 w-4 rounded accent-gold"
                          />
                          <label
                            htmlFor={`allowOther_create_${qIdx}`}
                            className="text-[11px] font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                          >
                            <span>تفعيل خيار «أخرى» لكتابة مقترح مخصص ✍️</span>
                            <span className="text-[10px] text-muted-foreground">
                              (يتيح للطالب كتابة مقترح مخصص غير مذكور بالقائمة)
                            </span>
                          </label>
                        </div>
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
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء ونشر الاستبيان 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          نافذة تعديل استبيان (Edit Modal)
      ══════════════════════════════════════════════════════════════ */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Pencil className="h-5 w-5 text-gold" />
                تعديل الاستبيان والأسئلة ✏️
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  عنوان الاستبيان <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="عنوان الاستبيان..."
                  className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  وصف ومقدمة الاستبيان
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="وصف الاستبيان..."
                  className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    الموعد النهائي للتصويت
                  </label>
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    حالة الاستبيان
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "OPEN" | "CLOSED")}
                    className="w-full rounded-2xl border border-border bg-muted/20 px-3.5 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                  >
                    <option value="OPEN">مفتوح للتصويت 🟢</option>
                    <option value="CLOSED">مغلق 🏁</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-2xl bg-gold/10 border border-gold/20">
                <input
                  type="checkbox"
                  id="editPinCommunity"
                  checked={editPinned}
                  onChange={(e) => setEditPinned(e.target.checked)}
                  className="h-4 w-4 rounded accent-gold"
                />
                <label
                  htmlFor="editPinCommunity"
                  className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <Pin className="h-3.5 w-3.5 text-gold" />
                  تثبيت الاستبيان في أعلى خلاصة المجتمع 📌 (Pinned)
                </label>
              </div>

              {/* أسئلة الاستبيان */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-gold" />
                    الأسئلة والخيارات ({editQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEditQuestion}
                    className="inline-flex items-center gap-1 rounded-xl bg-muted hover:bg-muted/80 px-2.5 py-1 text-[11px] font-black text-gold"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة سؤال
                  </button>
                </div>

                {editQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-gold">سؤال {qIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            setEditQuestions((prev) => {
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
                          onClick={() => handleRemoveEditQuestion(qIdx)}
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
                        setEditQuestions((prev) => {
                          const copy = [...prev];
                          copy[qIdx].question = val;
                          return copy;
                        });
                      }}
                      placeholder="نص السؤال..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                    />

                    {(q.type === "POLL_SINGLE" || q.type === "POLL_MULTI") && (
                      <div className="space-y-2 pt-1 ps-2 border-s-2 border-gold/40">
                        <p className="text-[11px] font-bold text-muted-foreground">خيارات الإجابة:</p>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-4">
                              {optIdx + 1}.
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuestions((prev) => {
                                  const copy = [...prev];
                                  copy[qIdx].options[optIdx] = val;
                                  return copy;
                                });
                              }}
                              className="flex-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-gold focus:outline-none"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEditOption(qIdx, optIdx)}
                                className="text-muted-foreground hover:text-rose-500 p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddEditOption(qIdx)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:underline pt-1"
                        >
                          <Plus className="h-3 w-3" />
                          إضافة خيار
                        </button>

                        {/* مفتاح تفعيل خيار «أخرى» */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                          <input
                            type="checkbox"
                            id={`allowOther_edit_${qIdx}`}
                            checked={!!q.allowOther}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditQuestions((prev) => {
                                const copy = [...prev];
                                copy[qIdx].allowOther = checked;
                                return copy;
                              });
                            }}
                            className="h-4 w-4 rounded accent-gold"
                          />
                          <label
                            htmlFor={`allowOther_edit_${qIdx}`}
                            className="text-[11px] font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                          >
                            <span>تفعيل خيار «أخرى» لكتابة مقترح مخصص ✍️</span>
                            <span className="text-[10px] text-muted-foreground">
                              (يتيح للطالب كتابة مقترح مخصص غير مذكور بالقائمة)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="rounded-2xl bg-gold px-6 py-2 text-xs font-black text-night hover:bg-gold-light shadow-md disabled:opacity-50"
                >
                  {isEditingSubmitting ? "جاري الحفظ..." : "حفظ التعديلات 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          نافذة التحليلات وكشف المصوتين والمفاضلة الذكية (Analytics Suite)
      ══════════════════════════════════════════════════════════════ */}
      {selectedAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* ── الرأس والأزرار الرسمية للتصدير ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/15 text-gold px-2.5 py-0.5 text-[10px] font-black border border-gold/30">
                    مركز الاستخبارات واتخاذ القرار 🤖💡
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedAnalytics.totalResponses} مشارك في الاستبيان
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground mt-1">
                  تحليلات: {selectedAnalytics.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* زر تحميل إكسيل رسمي (.xlsx) */}
                <a
                  href={`/api/admin/surveys/${selectedAnalytics.id}/export`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-black text-white transition-all shadow-md"
                  title="تحميل كشف الإكسيل الكامل مع بيانات كل طالب وإجابته"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  تحميل إكسيل (.xlsx) 📊
                </a>

                {/* زر تصدير CSV كخيار سريع */}
                <button
                  type="button"
                  onClick={() => exportCSV(selectedAnalytics)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted hover:bg-muted/80 px-3 py-2 text-xs font-bold text-foreground transition-all shadow-sm"
                  title="تصدير ملف CSV للبيانات السريعة"
                >
                  <Download className="h-3.5 w-3.5 text-gold" />
                  CSV
                </button>

                {/* رابط صفحة الاستبيان المستقلة */}
                <Link
                  href={`/surveys/${selectedAnalytics.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 hover:bg-gold/20 px-3 py-2 text-xs font-bold text-gold transition-all"
                  title="عرض الاستبيان كصفحة مستقلة"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  الرابط
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedAnalytics(null)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── شريط التبويبات الفاخر ── */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-1">
              <button
                type="button"
                onClick={() => setAnalyticsTab("SUMMARY")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  analyticsTab === "SUMMARY"
                    ? "bg-gold text-night shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Brain className="h-4 w-4" />
                ملخص النتائج والتوصيات 📊
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsTab("VOTERS")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  analyticsTab === "VOTERS"
                    ? "bg-gold text-night shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Users className="h-4 w-4" />
                كشف المصوتين والمفاضلة 👥 ({filteredVoters.length})
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsTab("MATRIX")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  analyticsTab === "MATRIX"
                    ? "bg-gold text-night shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Layers className="h-4 w-4" />
                مصفوفة المفاضلة والمقارنة 📐
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════
                التبويب 1: ملخص النتائج والتوصيات (SUMMARY)
            ══════════════════════════════════════════════════════════ */}
            {analyticsTab === "SUMMARY" && (
              <div className="space-y-6">
                {/* محرك التوصيات والقرارات الاستراتيجية */}
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
                            {rec.severity === "SUCCESS" && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                            {rec.severity === "WARNING" && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            {rec.severity === "INFO" && (
                              <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <h5 className="text-xs font-black text-foreground">{rec.title}</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {rec.summary}
                          </p>
                          <div className="rounded-xl bg-card/80 p-2.5 border border-border/60 text-[11px] font-bold text-foreground">
                            <strong className="text-gold">القرار الموصى به: </strong>
                            {rec.actionableDecision}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* توزيع الأسئلة والنتائج بالأشرطة */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gold" />
                    نتائج الأسئلة التفصيلية
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedAnalytics.questionsAnalytics.map((qa, idx) => (
                      <div
                        key={qa.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-black text-foreground">
                            {idx + 1}. {qa.question}
                          </h5>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {qa.totalAnswers} إجابة
                          </span>
                        </div>

                        {qa.optionsStats.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            {qa.optionsStats.map((opt) => (
                              <div key={opt.option} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-foreground flex items-center gap-1.5">
                                    <span>{opt.option}</span>
                                    {opt.isOther && (
                                      <span className="rounded-md bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.2 text-[9px] font-black">
                                        مقترحات مخصصة
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gold">
                                      {opt.percentage}% ({opt.count})
                                    </span>
                                    {opt.count > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedQuestionFilter(qa.id);
                                          setSelectedOptionFilter(opt.option);
                                          setAnalyticsTab("VOTERS");
                                        }}
                                        className="text-[10px] text-muted-foreground hover:text-gold underline transition-colors"
                                      >
                                        كشف الطلاب 👥
                                      </button>
                                    )}
                                  </div>
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
                              <span className="text-2xl font-black text-gold">
                                {qa.averageRating}
                              </span>
                              <div className="flex items-center text-gold">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-4 w-4 ${
                                      (qa.averageRating || 0) >= s
                                        ? "fill-gold text-gold"
                                        : "text-muted-foreground/30"
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
                                      <div
                                        className="h-full bg-gold rounded-full"
                                        style={{ width: `${rb.percentage}%` }}
                                      />
                                    </div>
                                    <span className="w-8 text-end text-muted-foreground">
                                      {rb.count}
                                    </span>
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
                                <div
                                  key={tIdx}
                                  className="rounded-xl border border-border/80 bg-card p-2.5 text-xs"
                                >
                                  <p className="text-foreground">{ta.answer}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {ta.voter?.studentName || "طالب"} ({ta.voter?.gradeLabel || "—"}) ·{" "}
                                    {ta.voter?.submittedAt
                                      ? new Date(ta.voter.submittedAt).toLocaleDateString("ar-EG")
                                      : ""}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                لا توجد إجابات نصية بعد.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* التوزيع الديموغرافي */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-gold" />
                    التوزيع الديموغرافي للمشاركين
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                      <h5 className="text-xs font-bold text-foreground">حسب الفرقة الدراسية</h5>
                      {selectedAnalytics.demographics.byGrade.map((g) => (
                        <div key={g.label} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{g.label}</span>
                          <span className="font-bold text-foreground">
                            {g.percentage}% ({g.count})
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                      <h5 className="text-xs font-bold text-foreground">حسب الشعبة</h5>
                      {selectedAnalytics.demographics.bySection.map((s) => (
                        <div key={s.label} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-bold text-foreground">
                            {s.percentage}% ({s.count})
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                      <h5 className="text-xs font-bold text-foreground">حسب النوع</h5>
                      {selectedAnalytics.demographics.byGender.map((gn) => (
                        <div key={gn.label} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{gn.label}</span>
                          <span className="font-bold text-foreground">
                            {gn.percentage}% ({gn.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                التبويب 2: كشف وتفاصيل المصوتين (VOTERS DRILLDOWN)
            ══════════════════════════════════════════════════════════ */}
            {analyticsTab === "VOTERS" && (
              <div className="space-y-4">
                {/* شريط الفلاتر والبحث */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-muted/20 border border-border">
                  {/* فلتر السؤال */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      السؤال
                    </label>
                    <select
                      value={selectedQuestionFilter}
                      onChange={(e) => {
                        setSelectedQuestionFilter(e.target.value);
                        setSelectedOptionFilter("ALL");
                      }}
                      className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-gold"
                    >
                      <option value="ALL">جميع الأسئلة</option>
                      {selectedAnalytics.questionsAnalytics.map((q, idx) => (
                        <option key={q.id} value={q.id}>
                          س{idx + 1}: {q.question.slice(0, 35)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* فلتر الخيار */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      الخيار المختار
                    </label>
                    <select
                      value={selectedOptionFilter}
                      onChange={(e) => setSelectedOptionFilter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-gold"
                    >
                      <option value="ALL">جميع الخيارات</option>
                      {availableOptionsForFilter.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* فلتر الفرقة */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      الفرقة الدراسية
                    </label>
                    <select
                      value={voterGradeFilter}
                      onChange={(e) => setVoterGradeFilter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-gold"
                    >
                      <option value="ALL">جميع الفرق</option>
                      <option value="GRADE_1">الفرقة الأولى</option>
                      <option value="GRADE_2">الفرقة الثانية</option>
                      <option value="GRADE_3">الفرقة الثالثة</option>
                      <option value="GRADE_4">الفرقة الرابعة</option>
                    </select>
                  </div>

                  {/* حقل البحث بالاسم أو الكود */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      بحث سريع
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={voterSearchQuery}
                        onChange={(e) => setVoterSearchQuery(e.target.value)}
                        placeholder="اسم الطالب، الكود، الهاتف..."
                        className="w-full rounded-xl border border-border bg-card pe-8 ps-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold focus:outline-none"
                      />
                      <Search className="absolute end-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* كشف الطلاب */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                    <span>قائمة المصوتين ({filteredVoters.length} صوت مطابق)</span>
                    <span className="text-[11px] text-muted-foreground">
                      اضغط على رقم الهاتف لفتح محادثة واتساب مباشرة 💬
                    </span>
                  </div>

                  {filteredVoters.length > 0 ? (
                    <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {filteredVoters.map((v, i) => {
                        const cleanPhone = v.phone ? v.phone.replace(/^0+/, "") : "";
                        return (
                          <div
                            key={`${v.userId}_${v.questionId}_${i}`}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-foreground">
                                  {v.studentName}
                                </span>
                                {v.studentCode && (
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground border border-border">
                                    كود: {v.studentCode}
                                  </span>
                                )}
                                <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-black border border-blue-500/20">
                                  {v.gradeLabel || "—"}
                                </span>
                                {v.sectionLabel && (
                                  <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 text-[10px] font-bold border border-purple-500/20">
                                    {v.sectionLabel}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="font-bold text-gold">السؤال:</span>
                                <span>{v.questionTitle}</span>
                              </div>

                              {/* المقترح المكتوب إن وُجد */}
                              {v.customText && (
                                <div className="rounded-xl bg-gold/10 border border-gold/30 p-2 text-xs text-foreground mt-1">
                                  <span className="font-black text-gold">المقترح المكتوب: </span>
                                  <span>{v.customText}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                              {/* الخيار المختار */}
                              <span className="rounded-xl bg-gold/15 text-gold border border-gold/30 px-3 py-1 text-xs font-black">
                                {v.optionChosen}
                              </span>

                              {/* رقم الهاتف وزر الواتساب */}
                              {v.phone ? (
                                <a
                                  href={`https://wa.me/20${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-mono font-bold transition-all border border-emerald-500/30"
                                  title="محادثة واتساب مباشرة مع الطالب"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>{v.phone}</span>
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}

                              {/* وقت التصويت */}
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(v.submittedAt).toLocaleDateString("ar-EG", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      لا يوجد مصوتون يطابقون خيارات الفلترة المحددة.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                التبويب 3: مصفوفة المفاضلة والمقارنة (MATRIX)
            ══════════════════════════════════════════════════════════ */}
            {analyticsTab === "MATRIX" && (
              <div className="space-y-6">
                <p className="text-xs text-muted-foreground">
                  مصفوفة تفصيلية تقارن كيفية توزيع أصوات كل خيار بين الفرق الدراسية المختلفة لمساعدة
                  الإدارة في اتخاذ القرار الأمثل لكل فرقة.
                </p>

                {selectedAnalytics.questionsAnalytics
                  .filter((qa) => qa.optionsStats.length > 0)
                  .map((qa, qIndex) => {
                    const grades = [
                      { key: "GRADE_1", label: "الفرقة الأولى" },
                      { key: "GRADE_2", label: "الفرقة الثانية" },
                      { key: "GRADE_3", label: "الفرقة الثالثة" },
                      { key: "GRADE_4", label: "الفرقة الرابعة" },
                    ];

                    return (
                      <div
                        key={qa.id}
                        className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm space-y-2"
                      >
                        <div className="p-3.5 bg-muted/30 border-b border-border">
                          <h5 className="text-xs font-black text-foreground">
                            سؤال {qIndex + 1}: {qa.question} ({qa.totalAnswers} صوت)
                          </h5>
                        </div>

                        <div className="overflow-x-auto p-2">
                          <table className="w-full text-xs text-start">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground font-black text-[11px]">
                                <th className="p-2.5 text-start">الخيار</th>
                                {grades.map((g) => (
                                  <th key={g.key} className="p-2.5 text-center">
                                    {g.label}
                                  </th>
                                ))}
                                <th className="p-2.5 text-center">أخرى / غير محدد</th>
                                <th className="p-2.5 text-center text-gold">إجمالي الأصوات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {qa.optionsStats.map((opt) => {
                                const voters = opt.voters || [];
                                const countByGrade: Record<string, number> = {};
                                let otherCount = 0;

                                voters.forEach((v) => {
                                  if (
                                    v.grade === "GRADE_1" ||
                                    v.grade === "GRADE_2" ||
                                    v.grade === "GRADE_3" ||
                                    v.grade === "GRADE_4"
                                  ) {
                                    countByGrade[v.grade] = (countByGrade[v.grade] || 0) + 1;
                                  } else {
                                    otherCount++;
                                  }
                                });

                                return (
                                  <tr key={opt.option} className="hover:bg-muted/20">
                                    <td className="p-2.5 font-bold text-foreground">
                                      {opt.option}
                                      {opt.isOther && (
                                        <span className="ms-1.5 rounded-md bg-gold/15 text-gold border border-gold/30 px-1 py-0.5 text-[9px]">
                                          مقترح
                                        </span>
                                      )}
                                    </td>
                                    {grades.map((g) => {
                                      const cnt = countByGrade[g.key] || 0;
                                      const pct =
                                        opt.count > 0 ? Math.round((cnt / opt.count) * 100) : 0;
                                      return (
                                        <td key={g.key} className="p-2.5 text-center">
                                          <span className="font-bold text-foreground">{cnt}</span>
                                          {cnt > 0 && (
                                            <span className="text-[10px] text-muted-foreground ms-1">
                                              ({pct}%)
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className="p-2.5 text-center text-muted-foreground">
                                      {otherCount}
                                    </td>
                                    <td className="p-2.5 text-center font-black text-gold">
                                      {opt.count} ({opt.percentage}%)
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
