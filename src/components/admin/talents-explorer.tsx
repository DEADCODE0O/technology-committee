"use client";

// ═══════════════════════════════════════════════════════════════
//  مركز استكشاف وتحليل المواهب والرغبات الطلابية — لوحة الإدارة
//  • قسم 1: معلومات وقرارات استراتيجية (إحصائيات، نسب، أولويات الورش)
//  • قسم 2: فلترة، استكشاف، تواصل عبر واتساب، وتصدير إكسيل
//  • قسم 3: بنك المواهب المعروضة بالموقع العام
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Filter,
  Download,
  Copy,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Users,
  Award,
  TrendingUp,
  Lightbulb,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Settings,
  Sparkles,
  Palette,
  Compass,
  ArrowUpRight,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  TALENT_OPTIONS,
  talentLabel,
  JOIN_REASONS,
  JOIN_REASON_LABELS,
  GRADES,
  GRADE_LABELS,
  SECTIONS,
  SECTION_LABELS,
} from "@/lib/constants";
import {
  type TalentsAnalyticsSummary,
  type ExplorerStudentRow,
  type TalentsFilterParams,
  getFilteredTalentsStudents,
  updateTalentStatusDirectly,
  toggleTalentFeaturedDirectly,
} from "@/actions/talents-explorer";
import { TalentManager, type AdminTalentRow } from "@/components/admin/talent-manager";

type TalentsExplorerProps = {
  analytics: TalentsAnalyticsSummary;
  initialStudents: ExplorerStudentRow[];
  initialTotalCount: number;
  initialPage: number;
  initialTotalPages: number;
  canManage: boolean;
  adminTalents: AdminTalentRow[];
  studentOptions: { id: string; label: string }[];
  sectionVisible: boolean;
};

export function TalentsExplorer({
  analytics,
  initialStudents,
  initialTotalCount,
  initialPage,
  initialTotalPages,
  canManage,
  adminTalents,
  studentOptions,
  sectionVisible,
}: TalentsExplorerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"analytics" | "explorer" | "manager">("analytics");

  // حالات الفلترة في قسم الاستكشاف
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [talentFilter, setTalentFilter] = useState<string>("ALL");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // نتائج الطلاب الحالية والصفحات
  const [students, setStudents] = useState<ExplorerStudentRow[]>(initialStudents);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);

  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // قائمة المواهب المتاحة بناءً على التصنيف المختار
  const availableTalentOptions = useMemo(() => {
    if (categoryFilter === "ALL") {
      // دمج كافة الخيارات
      const all: { value: string; label: string; category: string }[] = [];
      Object.entries(TALENT_OPTIONS).forEach(([cat, opts]) => {
        opts.forEach((o) => all.push({ ...o, category: cat }));
      });
      return all;
    }
    return (TALENT_OPTIONS[categoryFilter] || []).map((o) => ({
      ...o,
      category: categoryFilter,
    }));
  }, [categoryFilter]);

  // تنفيذ البحث والفلترة عبر الـ Server Action
  function applyFilters(overrideParams: Partial<TalentsFilterParams> = {}) {
    startTransition(async () => {
      const params: TalentsFilterParams = {
        category: overrideParams.category !== undefined ? overrideParams.category : categoryFilter,
        talentName: overrideParams.talentName !== undefined ? overrideParams.talentName : talentFilter,
        joinReason: overrideParams.joinReason !== undefined ? overrideParams.joinReason : reasonFilter,
        grade: overrideParams.grade !== undefined ? overrideParams.grade : gradeFilter,
        section: overrideParams.section !== undefined ? overrideParams.section : sectionFilter,
        gender: overrideParams.gender !== undefined ? overrideParams.gender : genderFilter,
        status: overrideParams.status !== undefined ? overrideParams.status : statusFilter,
        q: overrideParams.q !== undefined ? overrideParams.q : searchQuery,
        page: overrideParams.page !== undefined ? overrideParams.page : 1,
        pageSize: 25,
      };

      try {
        const res = await getFilteredTalentsStudents(params);
        setStudents(res.students);
        setTotalCount(res.totalCount);
        setCurrentPage(res.page);
        setTotalPages(res.totalPages);
      } catch {
        toast.error("حدث خطأ أثناء تطبيق الفلترة");
      }
    });
  }

  // إعادة ضبط كافة الفلاتر
  function resetFilters() {
    setCategoryFilter("ALL");
    setTalentFilter("ALL");
    setReasonFilter("ALL");
    setGradeFilter("ALL");
    setSectionFilter("ALL");
    setGenderFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    applyFilters({
      category: "ALL",
      talentName: "ALL",
      joinReason: "ALL",
      grade: "ALL",
      section: "ALL",
      gender: "ALL",
      status: "ALL",
      q: "",
      page: 1,
    });
  }

  // انتقال سريع من الإحصائيات إلى استكشاف موهبة بعينها
  function jumpToTalentFilter(category: string, talentName?: string) {
    setCategoryFilter(category);
    setTalentFilter(talentName || "ALL");
    setActiveTab("explorer");
    applyFilters({
      category,
      talentName: talentName || "ALL",
      page: 1,
    });
  }

  // انتقال سريع من الإحصائيات إلى استكشاف رغبة انضمام بعينها
  function jumpToReasonFilter(reason: string) {
    setReasonFilter(reason);
    setActiveTab("explorer");
    applyFilters({
      joinReason: reason,
      page: 1,
    });
  }

  // تصدير كشف إكسيل بالبيانات الحالية المفلترة
  function handleExportExcel() {
    setIsExporting(true);
    const params = new URLSearchParams();
    if (categoryFilter !== "ALL") params.set("category", categoryFilter);
    if (talentFilter !== "ALL") params.set("talent", talentFilter);
    if (reasonFilter !== "ALL") params.set("reason", reasonFilter);
    if (gradeFilter !== "ALL") params.set("grade", gradeFilter);
    if (sectionFilter !== "ALL") params.set("section", sectionFilter);
    if (genderFilter !== "ALL") params.set("gender", genderFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const url = `/api/admin/talents/export?${params.toString()}`;
    window.location.href = url;
    setTimeout(() => {
      setIsExporting(false);
      toast.success("بدأ تحميل ملف الإكسيل بنجاح");
    }, 1200);
  }

  // نسخ أرقام الواتساب للطلاب المعروضين
  function copyAllPhones() {
    const phones = students
      .map((s) => s.phone)
      .filter((p) => Boolean(p && p.trim().length >= 8));

    if (phones.length === 0) {
      toast.error("لا توجد أرقام هواتف متاحة في النتائج الحالية");
      return;
    }

    const unique = Array.from(new Set(phones)).join("\n");
    navigator.clipboard.writeText(unique);
    toast.success(`تم نسخ ${phones.length} رقم هاتف للحافظة`);
  }

  // نسخ رقم هاتف طالب منفرد
  function copyPhone(phone: string) {
    if (!phone) {
      toast.error("رقم الهاتف غير متوفر");
      return;
    }
    navigator.clipboard.writeText(phone);
    toast.success(`تم نسخ الرقم: ${phone}`);
  }

  // تحديث حالة موهبة طالب مباشرة
  async function handleStatusChange(talentId: string, newStatus: "VERIFIED" | "PENDING" | "REJECTED") {
    const res = await updateTalentStatusDirectly(talentId, newStatus);
    if (res.ok) {
      toast.success("تم تحديث حالة الموهبة بنجاح");
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          talents: s.talents.map((t) => (t.id === talentId ? { ...t, status: newStatus } : t)),
          matchedTalent: s.matchedTalent?.id === talentId ? { ...s.matchedTalent, status: newStatus } : s.matchedTalent,
        }))
      );
    } else {
      toast.error(res.error || "فشل التحديث");
    }
  }

  // تبديل تمييز الموهبة
  async function handleToggleFeatured(talentId: string) {
    const res = await toggleTalentFeaturedDirectly(talentId);
    if (res.ok) {
      toast.success(res.featured ? "تم تمييز الموهبة للظهور العام" : "تم إلغاء التمييز");
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          talents: s.talents.map((t) => (t.id === talentId ? { ...t, featured: !!res.featured } : t)),
          matchedTalent: s.matchedTalent?.id === talentId ? { ...s.matchedTalent, featured: !!res.featured } : s.matchedTalent,
        }))
      );
    } else {
      toast.error(res.error || "فشل التحديث");
    }
  }

  // فحص ما إذا كان هناك فلاتر مفعلة
  const hasActiveFilters =
    categoryFilter !== "ALL" ||
    talentFilter !== "ALL" ||
    reasonFilter !== "ALL" ||
    gradeFilter !== "ALL" ||
    sectionFilter !== "ALL" ||
    genderFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* التبويبات الرئيسية العلوية */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-gold/20 via-gold/10 to-amber-500/10 text-gold-light border border-gold/30 shadow-sm"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-gold" />
            <span>المعلومات والقرارات</span>
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-gold-light">
              ذكاء المنصة
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("explorer")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === "explorer"
                ? "bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            <Filter className="h-4 w-4 text-emerald-400" />
            <span>استكشاف وفلترة الطلاب</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
              {totalCount} طالب
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manager")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === "manager"
                ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-pink-500/10 text-purple-300 border border-purple-500/30 shadow-sm"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            <Palette className="h-4 w-4 text-purple-400" />
            <span>المواهب المعروضة</span>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
              {adminTalents.length}
            </span>
          </button>
        </div>

        {/* أزرار سريعة ومساعدة */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30 hover:text-emerald-200"
          >
            {isExporting ? (
              <RefreshCw className="ml-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="ml-1.5 h-3.5 w-3.5 text-emerald-400" />
            )}
            تصدير كشف إكسيل
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* التبويب 1: قسم المعلومات والقرارات (Analytics & Decisions) */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* بطاقات الإحصائيات العلوية الـ KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">إجمالي الطلاب</span>
                <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-zinc-100">{analytics.totalStudents}</p>
              <p className="mt-1 text-[11px] text-zinc-500">طالب وطالبة مسجلين بالمنصة</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/[0.08] p-4.5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">الطلاب ذوو المواهب</span>
                <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
                  <Award className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-300">
                {analytics.studentsWithTalentsCount}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300">
                  {analytics.studentsWithTalentsPercentage}%
                </span>
                <span className="text-[11px] text-zinc-400">نسبة الطلاب أصحاب المواهب</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4.5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gold-light font-medium">إجمالي المواهب المسجلة</span>
                <span className="rounded-lg bg-gold/20 p-2 text-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-gold-light">
                {analytics.totalTalentsCount}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                متوسط {analytics.studentsWithTalentsCount > 0 ? (analytics.totalTalentsCount / analytics.studentsWithTalentsCount).toFixed(1) : 0} موهبة لكل طالب
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/[0.08] p-4.5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300 font-medium">الدافع الأول للانضمام</span>
                <span className="rounded-lg bg-purple-500/20 p-2 text-purple-300">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xl font-black text-purple-200">
                {analytics.joinReasonsBreakdown[0]?.label || "التعلم والمهارات"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                بنسبة {analytics.joinReasonsBreakdown[0]?.percentage || 0}% من إجمالي الطلاب
              </p>
            </div>
          </div>

          {/* التوصيات الاستراتيجية لصناع القرار واللجان */}
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-amber-950/[0.04] to-transparent p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-gold/20 p-1.5 text-gold">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  لوحة التوجيه الإداري واتخاذ القرارات للورش والفعاليات
                </h3>
                <p className="text-xs text-zinc-400">
                  استنتاجات ذكية مبنية على الرغبات الحقيقية المسجلة من الطلاب لتوجيه خطة الأنشطة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {analytics.strategicInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-gold/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{insight.icon}</span>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-200">
                          {insight.title}
                        </h4>
                      </div>
                      <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold-light">
                        {insight.statBadge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {insight.message}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">
                      مجال: {TALENT_CATEGORY_LABELS[insight.category] || insight.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => jumpToTalentFilter(insight.category)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:text-gold-light"
                    >
                      <span>استعراض الطلاب المستهدفين</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* التوزيع المئوي لمجالات واهتمامات الطلاب */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* اليسار: توزيع الفئات الـ 7 */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gold" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    التوزيع النسبي لمجالات المواهب (7 تصنيفات)
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  انقر على أي مجال للفلترة المباشرة
                </span>
              </div>

              <div className="space-y-4">
                {analytics.categoriesBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    onClick={() => jumpToTalentFilter(cat.category)}
                    className="group cursor-pointer rounded-xl border border-transparent p-2.5 transition-all hover:border-gold/20 hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-zinc-200 group-hover:text-gold-light">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gold-light">
                          {cat.percentage}%
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          ({cat.count} اختيار)
                        </span>
                      </div>
                    </div>
                    {/* شريط النسبة المئوية */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
                        style={{ width: `${Math.max(4, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* اليمين: رغبات وأسباب الانضمام */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    رغبات وتطلعات الطلاب عند التسجيل
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  {analytics.totalStudents} طالب
                </span>
              </div>

              <div className="space-y-2.5">
                {analytics.joinReasonsBreakdown.map((item) => (
                  <div
                    key={item.reason}
                    onClick={() => jumpToReasonFilter(item.reason)}
                    className="group cursor-pointer rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 transition-all hover:border-emerald-500/30 hover:bg-emerald-950/[0.1]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-zinc-200 group-hover:text-emerald-300">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">
                          {item.percentage}%
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          ({item.count} طالب)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400"
                        style={{ width: `${Math.max(3, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* قائمة الـ 15 موهبة الأكثر طلباً وتوجهاً من الطلاب */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <span>قائمة المواهب الـ 15 الأكثر إقبالاً بالمنصة (ترتيب تنازلي)</span>
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  المواهب التي تمثل أعلى تركيز طلابي وتتطلب فتح ورش عمل ودورات بشكل عاجل
                </p>
              </div>
              <span className="text-xs text-gold-light font-bold">
                توجيه مسارات الورش
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {analytics.topTalents.map((item, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <div
                    key={`${item.category}-${item.name}`}
                    onClick={() => jumpToTalentFilter(item.category, item.name)}
                    className={`group cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                      isTop3
                        ? "border-gold/30 bg-gold/[0.04] hover:border-gold hover:bg-gold/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                            rank === 1
                              ? "bg-amber-400 text-black shadow-sm"
                              : rank === 2
                              ? "bg-zinc-300 text-black shadow-sm"
                              : rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-white/10 text-zinc-400"
                          }`}
                        >
                          {rank}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {TALENT_CATEGORY_LABELS[item.category]?.slice(0, 16) || item.category}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-zinc-100 group-hover:text-gold-light line-clamp-1">
                        {item.label}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="font-black text-gold-light">
                        {item.count} طالب
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {item.percentage}% من الطلاب
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* التوزيع الديموغرافي للطلاب (الفرقة والشعبة) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5">
              <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                توزيع الطلاب حسب الفرق الدراسية
              </h4>
              <div className="space-y-2 text-xs">
                {GRADES.map((g) => {
                  const count = analytics.demographics.byGrade[g.value] || 0;
                  const pct = analytics.totalStudents > 0 ? Math.round((count / analytics.totalStudents) * 100) : 0;
                  return (
                    <div key={g.value} className="flex items-center justify-between">
                      <span className="text-zinc-400">{g.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{count}</span>
                        <span className="text-[10px] text-zinc-500">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5">
              <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                توزيع الطلاب حسب الشعب الدراسية
              </h4>
              <div className="space-y-2 text-xs">
                {SECTIONS.map((s) => {
                  const count = analytics.demographics.bySection[s.value] || 0;
                  const pct = analytics.totalStudents > 0 ? Math.round((count / analytics.totalStudents) * 100) : 0;
                  return (
                    <div key={s.value} className="flex items-center justify-between">
                      <span className="text-zinc-400">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{count}</span>
                        <span className="text-[10px] text-zinc-500">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5">
              <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                التوزيع حسب النوع (الجندر)
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">ذكور (بنين)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">
                      {analytics.demographics.byGender["MALE"] || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      ({analytics.totalStudents > 0 ? Math.round(((analytics.demographics.byGender["MALE"] || 0) / analytics.totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">إناث (بنات)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">
                      {analytics.demographics.byGender["FEMALE"] || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      ({analytics.totalStudents > 0 ? Math.round(((analytics.demographics.byGender["FEMALE"] || 0) / analytics.totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* التبويب 2: قسم الفلترة واستكشاف الطلاب (Explorer & Filter) */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "explorer" && (
        <div className="space-y-5">
          {/* شريط الفلاتر المتقدمة والمنظمة */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5 backdrop-blur-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  لوحة الفلترة والبحث الذكي للطلاب والمواهب
                </h3>
                {hasActiveFilters && (
                  <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold-light text-[10px]">
                    فلاتر نشطة
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-7 text-xs text-zinc-400 hover:text-rose-400"
                  >
                    <RefreshCw className="ml-1 h-3 w-3" />
                    تفريغ الفلاتر
                  </Button>
                )}
              </div>
            </div>

            {/* عناصر التحكم في الفلاتر */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. فئة الموهبة */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">مجال / فئة الموهبة</label>
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setTalentFilter("ALL");
                    applyFilters({ category: val, talentName: "ALL", page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة المجالات" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">كافة المجالات ({TALENT_CATEGORIES.length})</SelectItem>
                    {TALENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. اسم الموهبة المحددة */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">الموهبة المحددة</label>
                <Select
                  value={talentFilter}
                  onValueChange={(val) => {
                    setTalentFilter(val);
                    applyFilters({ talentName: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة المواهب" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200 max-h-56">
                    <SelectItem value="ALL">كافة المواهب</SelectItem>
                    {availableTalentOptions.map((opt) => (
                      <SelectItem key={`${opt.category}-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. دافع ورغبة الانضمام */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">رغبة / هدف الانضمام</label>
                <Select
                  value={reasonFilter}
                  onValueChange={(val) => {
                    setReasonFilter(val);
                    applyFilters({ joinReason: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة أهداف الانضمام" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">كافة أهداف الانضمام</SelectItem>
                    {JOIN_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. الفرقة الدراسية */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">الفرقة الدراسية</label>
                <Select
                  value={gradeFilter}
                  onValueChange={(val) => {
                    setGradeFilter(val);
                    applyFilters({ grade: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة الفرق" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">كافة الفرق</SelectItem>
                    {GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. الشعبة الأكاديمية */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">الشعبة الأكاديمية</label>
                <Select
                  value={sectionFilter}
                  onValueChange={(val) => {
                    setSectionFilter(val);
                    applyFilters({ section: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة الشعب" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">كافة الشعب</SelectItem>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 6. النوع (الجندر) */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">النوع</label>
                <Select
                  value={genderFilter}
                  onValueChange={(val) => {
                    setGenderFilter(val);
                    applyFilters({ gender: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="الجميع" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">الجميع (ذكور وإناث)</SelectItem>
                    <SelectItem value="MALE">ذكور</SelectItem>
                    <SelectItem value="FEMALE">إناث</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 7. حالة الاعتماد */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">حالة اعتماد الموهبة</label>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    applyFilters({ status: val, page: 1 });
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-200">
                    <SelectValue placeholder="كافة الحالات" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-200">
                    <SelectItem value="ALL">كافة الحالات</SelectItem>
                    <SelectItem value="VERIFIED">معتمدة وموثقة ✓</SelectItem>
                    <SelectItem value="PENDING">قيد المراجعة</SelectItem>
                    <SelectItem value="FEATURED">المواهب المميزة ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 8. حقل البحث بالاسم / الكود / الهاتف */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">بحث بالاسم أو الكود أو الهاتف</label>
                <div className="relative">
                  <Input
                    placeholder="ابحث هنا..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyFilters({ q: searchQuery, page: 1 });
                      }
                    }}
                    className="h-9 pl-8 border-white/10 bg-white/[0.03] text-xs text-zinc-200 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => applyFilters({ q: searchQuery, page: 1 })}
                    className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-gold"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* شريط الأدوات والعمليات على الطلاب المفلترين */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">
                نتائج البحث: <span className="font-extrabold text-gold-light">{totalCount}</span> طالب مطابق
              </span>
              {isPending && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400 animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  جاري جلب البيانات...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyAllPhones}
                className="border-white/10 bg-white/[0.03] text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300 text-xs"
              >
                <Copy className="ml-1.5 h-3.5 w-3.5" />
                نسخ هواتف الطلاب
              </Button>

              <Button
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isExporting ? (
                  <RefreshCw className="ml-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="ml-1.5 h-3.5 w-3.5" />
                )}
                تصدير كشف إكسيل (.xlsx)
              </Button>
            </div>
          </div>

          {/* بطاقات الطلاب المطابقين للفلتر */}
          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.01] p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
              <h4 className="text-base font-bold text-zinc-300">لا يوجد طلاب مطابقين للشروط الحالية</h4>
              <p className="mt-1 text-xs text-zinc-500">
                جرّب تغيير فئة الموهبة أو تفريغ الفلاتر لاستعراض قاعدة الطلاب بالكامل
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={resetFilters}
                className="mt-4 border-white/10 text-xs text-zinc-300"
              >
                تفريغ الفلاتر
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {students.map((student) => {
                // الموهبة المتطابقة مع الفلتر أو الموهبة الأولى
                const primaryTalent = student.matchedTalent || student.talents[0];
                const cleanPhone = student.phone.replace(/[^0-9]/g, "");
                const waPhone = cleanPhone.startsWith("0") ? `20${cleanPhone.slice(1)}` : cleanPhone;
                const talentForMsg = primaryTalent ? primaryTalent.label : "الأنشطة والورش الطلابية";
                const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
                  `السلام عليكم يا ${student.fullName}، معك إدارة الأنشطة الطلابية بالمعهد بخصوص اهتمامك بمجال (${talentForMsg})...`
                )}`;

                return (
                  <div
                    key={student.id}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-gold/30 hover:bg-white/[0.04] flex flex-col justify-between"
                  >
                    <div>
                      {/* رأس البطاقة: الاسم، الكود، والفرقة */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-100 group-hover:text-gold-light truncate">
                            {student.fullName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                            <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] text-zinc-300 font-mono">
                              {student.studentCode || "بدون كود"}
                            </span>
                            <span>•</span>
                            <span>{student.gradeLabel}</span>
                            <span>•</span>
                            <span>{student.sectionLabel}</span>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            student.gender === "FEMALE"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {student.genderLabel}
                        </span>
                      </div>

                      {/* الموهبة المستهدفة أو الرئيسية */}
                      {primaryTalent ? (
                        <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-2.5 mb-2.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-extrabold text-gold-light flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-gold" />
                              {primaryTalent.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {primaryTalent.status === "VERIFIED" ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  معتمدة
                                </span>
                              ) : primaryTalent.status === "REJECTED" ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
                                  <XCircle className="h-3 w-3" />
                                  مرفوضة
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                                  <Clock className="h-3 w-3" />
                                  قيد المراجعة
                                </span>
                              )}

                              {primaryTalent.featured && (
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-400">
                            مجال: {TALENT_CATEGORY_LABELS[primaryTalent.category] || primaryTalent.category}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 p-2 text-center text-xs text-zinc-500 mb-2.5">
                          لم يسجل مواهب تفصيلية
                        </div>
                      )}

                      {/* قائمة كافة المواهب المسجلة للطالب */}
                      {student.talents.length > 1 && (
                        <div className="mb-2.5">
                          <span className="text-[10px] text-zinc-500 block mb-1">
                            مواهب أخرى ({student.talents.length - 1}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {student.talents
                              .filter((t) => t.id !== primaryTalent?.id)
                              .map((t) => (
                                <span
                                  key={t.id}
                                  onClick={() => jumpToTalentFilter(t.category, t.name)}
                                  className="cursor-pointer rounded-md bg-white/[0.04] border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-gold/40 hover:text-gold-light"
                                >
                                  {t.label}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* أسباب ورغبات الانضمام */}
                      {student.joinReasonsLabels.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-zinc-500 block mb-1">
                            أهداف ورغبات الانضمام:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {student.joinReasonsLabels.slice(0, 3).map((lbl, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-emerald-950/20 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300"
                              >
                                {lbl}
                              </span>
                            ))}
                            {student.joinReasonsLabels.length > 3 && (
                              <span className="text-[10px] text-zinc-500 self-center">
                                +{student.joinReasonsLabels.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* تذييل البطاقة: التواصل عبر واتساب والتحكم السريع */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => copyPhone(student.phone)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-zinc-300 hover:border-white/20 hover:text-white"
                          title="نسخ رقم الهاتف"
                        >
                          <Phone className="h-3 w-3 text-zinc-400" />
                          <span className="font-mono text-[11px]">{student.phone || "—"}</span>
                        </button>

                        {cleanPhone && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-emerald-300 hover:bg-emerald-900/40 text-[11px] font-bold"
                            title="فتح محادثة واتساب فورية"
                          >
                            <MessageCircle className="h-3 w-3" />
                            واتساب
                          </a>
                        )}
                      </div>

                      {/* إجراءات الإدارة السريعة على الموهبة */}
                      {canManage && primaryTalent && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(primaryTalent.id)}
                            className={`p-1.5 rounded-lg border text-xs transition-all ${
                              primaryTalent.featured
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                                : "border-white/10 bg-white/[0.02] text-zinc-500 hover:text-amber-300"
                            }`}
                            title={primaryTalent.featured ? "إلغاء التمييز العام" : "تمييز للظهور بالموقع العام"}
                          >
                            <Star className={`h-3.5 w-3.5 ${primaryTalent.featured ? "fill-current" : ""}`} />
                          </button>

                          {primaryTalent.status !== "VERIFIED" ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(primaryTalent.id, "VERIFIED")}
                              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              title="اعتماد وتوثيق الموهبة"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(primaryTalent.id, "PENDING")}
                              className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              title="إلغاء الاعتماد (قيد المراجعة)"
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ترقيم الصفحات (Pagination) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400">
              <span>
                صفحة <strong className="text-zinc-200">{currentPage}</strong> من{" "}
                <strong className="text-zinc-200">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => applyFilters({ page: currentPage - 1 })}
                  className="h-8 border-white/10 bg-white/[0.02] text-xs text-zinc-200"
                >
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  السابق
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => applyFilters({ page: currentPage + 1 })}
                  className="h-8 border-white/10 bg-white/[0.02] text-xs text-zinc-200"
                >
                  التالي
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* التبويب 3: بنك المواهب المعروضة (Public Talent Manager)   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "manager" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/[0.08] p-4 text-xs text-zinc-300">
            <p className="font-bold text-purple-200 mb-1">
              بنك المواهب المميزة المعروضة في المنصة والموقع العام
            </p>
            <p className="text-zinc-400 leading-relaxed">
              هنا يمكنك إضافة أسماء حرة أو ربط طلاب محددين، ورفع أعمالهم أو روابط بورتفوليو، وتحديد الموهوبين المميزين الذين يظهرون في الواجهة العامة للطلاب.
            </p>
          </div>

          {canManage ? (
            <TalentManager talents={adminTalents} students={studentOptions} />
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
              صلاحياتك للعرض فقط — التعديل يتطلب صلاحية الإدارة
            </p>
          )}
        </div>
      )}
    </div>
  );
}
