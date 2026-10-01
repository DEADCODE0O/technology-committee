"use client";

// ═══════════════════════════════════════════════════════════════
//  مستكشف وفلتر استجابات ومواهب الورشة المتقدم — لوحة الإدارة
//  • فلترة مركبة بعدة مواهب/خيارات معاً (AND / OR)
//  • توزيع إحصائي تفاعلي حسب أقسام ومحاور الاستمارة
//  • تصدير كشف إكسيل (.xlsx) مخصص
//  • نسخ أرقام واتساب الطلاب بنقرة واحدة لإنشاء الجروبات
//  • بطاقات طلابية بروابط واتساب مباشرة ومحادثة فورية
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  Filter,
  Download,
  Copy,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
  RefreshCw,
  Tag,
  X,
  ExternalLink,
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
  GRADES,
  GRADE_LABELS,
  SECTIONS,
  SECTION_LABELS,
  GENDERS,
  GENDER_LABELS,
} from "@/lib/constants";
import { type ParticipantRow } from "@/components/admin/participants-table";

export type SessionFormFieldMeta = {
  id: string;
  label: string;
  type: string;
  options: string[];
  section?: string;
  allowCustom?: boolean;
};

type SessionIntakeExplorerProps = {
  sessionId: string;
  sessionTitle: string;
  activityTitle: string;
  formFields: SessionFormFieldMeta[];
  participants: ParticipantRow[];
};

export function SessionIntakeExplorer({
  sessionId,
  sessionTitle,
  activityTitle,
  formFields,
  participants,
}: SessionIntakeExplorerProps) {
  // حالات الفلترة
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"OR" | "AND">("OR");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [selectedSectionAcademic, setSelectedSectionAcademic] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedAttendance, setSelectedAttendance] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // استخراج كافة الأقسام المعرفة في الاستمارة
  const sections = useMemo(() => {
    const set = new Set<string>();
    formFields.forEach((f) => {
      const s = (f.section || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [formFields]);

  // استخراج كافة الخيارات المتاحة مع عدد تكرارها بين الطلاب
  const choicesStats = useMemo(() => {
    const statsMap = new Map<string, { choice: string; fieldId: string; section: string; count: number }>();

    // تهيئة الخيارات من الأسئلة
    formFields.forEach((f) => {
      f.options.forEach((opt) => {
        const key = opt.trim();
        if (key && !statsMap.has(key)) {
          statsMap.set(key, {
            choice: key,
            fieldId: f.id,
            section: f.section || "عام",
            count: 0,
          });
        }
      });
    });

    // حساب عدد الطلاب الذين اختاروا كل خيار
    participants.forEach((p) => {
      if (!p.answers) return;
      p.answers.forEach((ans) => {
        const val = ans.value;
        const items = Array.isArray(val) ? val : typeof val === "string" ? [val] : [];
        items.forEach((item) => {
          const trimmed = String(item).trim();
          if (statsMap.has(trimmed)) {
            statsMap.get(trimmed)!.count++;
          } else if (trimmed) {
            // خيار حر أضافه الطالب
            statsMap.set(trimmed, {
              choice: trimmed,
              fieldId: ans.fieldId,
              section: "إضافات حرة",
              count: 1,
            });
          }
        });
      });
    });

    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [formFields, participants]);

  // تبديل اختيار خيار فلترة
  const toggleChoice = (choice: string) => {
    setSelectedChoices((prev) =>
      prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]
    );
  };

  // تفريغ كافة الفلاتر
  const resetFilters = () => {
    setSelectedChoices([]);
    setFilterMode("OR");
    setSelectedSection("ALL");
    setSelectedGrade("ALL");
    setSelectedSectionAcademic("ALL");
    setSelectedGender("ALL");
    setSelectedAttendance("ALL");
    setSearchQuery("");
  };

  // تصفية الطلاب بناءً على المعايير المركبة
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // 1. استبعاد الملغيين افتراضياً ما لم يطلب البحث عنهم
      if (p.status === "CANCELLED") return false;

      // 2. الفلترة الأكاديمية
      if (selectedGrade !== "ALL" && p.grade !== selectedGrade) return false;
      if (selectedSectionAcademic !== "ALL" && p.section !== selectedSectionAcademic) return false;
      if (selectedGender !== "ALL" && p.gender !== selectedGender) return false;

      // 3. فلترة الحضور
      if (selectedAttendance === "ATTENDED" && !p.attended) return false;
      if (selectedAttendance === "ABSENT" && p.attended !== false) return false;

      // 4. استخراج كافة إجابات الطالب كمصفوفة نصوص
      const studentChoices: string[] = [];
      if (p.answers) {
        p.answers.forEach((ans) => {
          const val = ans.value;
          if (Array.isArray(val)) {
            val.forEach((v) => studentChoices.push(String(v).trim()));
          } else if (val) {
            studentChoices.push(String(val).trim());
          }
        });
      }

      // 5. فلترة القسم المختار
      if (selectedSection !== "ALL") {
        const fieldsInSection = formFields.filter((f) => (f.section || "").trim() === selectedSection);
        const hasAnyInSection = fieldsInSection.some((f) => {
          const ans = p.answers?.find((a) => a.fieldId === f.id);
          return Boolean(ans && ans.value && (Array.isArray(ans.value) ? ans.value.length > 0 : true));
        });
        if (!hasAnyInSection) return false;
      }

      // 6. فلترة الخيارات المتعددة (Multi-Choice Tags)
      if (selectedChoices.length > 0) {
        if (filterMode === "AND") {
          // يجب أن يكون اختار جميع الخيارات المحددة
          const hasAll = selectedChoices.every((req) =>
            studentChoices.some((sc) => sc.toLowerCase() === req.toLowerCase())
          );
          if (!hasAll) return false;
        } else {
          // يكفي أن يكون اختار أياً من الخيارات المحددة
          const hasAny = selectedChoices.some((req) =>
            studentChoices.some((sc) => sc.toLowerCase() === req.toLowerCase())
          );
          if (!hasAny) return false;
        }
      }

      // 7. البحث النصي
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          p.fullName,
          p.phone || "",
          p.studentCode || "",
          p.email || "",
          ...studentChoices,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    participants,
    selectedGrade,
    selectedSectionAcademic,
    selectedGender,
    selectedAttendance,
    selectedSection,
    selectedChoices,
    filterMode,
    searchQuery,
    formFields,
  ]);

  // نسخ أرقام واتساب الطلاب المفلترين
  const copyFilteredPhones = () => {
    const phones = filteredParticipants
      .map((p) => p.phone)
      .filter((phone) => Boolean(phone && phone.trim().length >= 8));

    if (phones.length === 0) {
      toast.error("لا توجد أرقام هواتف متاحة في النتائج المفلترة");
      return;
    }

    const unique = Array.from(new Set(phones)).join("\n");
    navigator.clipboard.writeText(unique);
    toast.success(`تم نسخ ${phones.length} رقم هاتف للحافظة لإنشاء جروب واتساب`);
  };

  // رابط تصدير إكسيل مخصص للنتائج المفلترة
  const exportExcelUrl = () => {
    const p = new URLSearchParams();
    if (selectedGrade !== "ALL") p.set("grade", selectedGrade);
    if (selectedSectionAcademic !== "ALL") p.set("section", selectedSectionAcademic);
    if (selectedGender !== "ALL") p.set("gender", selectedGender);
    if (searchQuery.trim()) p.set("q", searchQuery.trim());
    return `/api/admin/sessions/${sessionId}/export?${p.toString()}`;
  };

  const hasActiveFilters =
    selectedChoices.length > 0 ||
    selectedSection !== "ALL" ||
    selectedGrade !== "ALL" ||
    selectedSectionAcademic !== "ALL" ||
    selectedGender !== "ALL" ||
    selectedAttendance !== "ALL" ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* ── لوحة ملخص الخيارات والمواهب الأكثر اختياراً ── */}
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.05] via-transparent to-transparent p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              توزيع المواهب والاهتمامات في استمارة الورشة ({choicesStats.length} خيار/موهبة)
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              انقر على أي موهبة أو فن لإضافتها مباشرة لشريط الفلترة وعرض الطلاب المسجلين فيها
            </p>
          </div>

          {selectedChoices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">وضع المطابقة:</span>
              <button
                type="button"
                onClick={() => setFilterMode((m) => (m === "OR" ? "AND" : "OR"))}
                className="rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-black text-gold-light hover:bg-gold/20"
              >
                {filterMode === "OR" ? "أي من الخيارات (OR)" : "جميع الخيارات معاً (AND)"}
              </button>
            </div>
          )}
        </div>

        {/* سحابة الخيارات التفاعلية (Filter Chips) */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
          {choicesStats.map((item) => {
            const isSelected = selectedChoices.includes(item.choice);
            return (
              <button
                key={item.choice}
                type="button"
                onClick={() => toggleChoice(item.choice)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-gold bg-gold text-night shadow-sm font-black"
                    : "border-border bg-card/60 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
              >
                <span>{item.choice}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                    isSelected ? "bg-night/20 text-night" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── شريط الفلاتر المتقدم والبحث ── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-foreground">لوحة الفلترة والتخصيص</span>
            {hasActiveFilters && (
              <Badge variant="outline" className="border-gold/40 text-gold-light text-[10px]">
                فلاتر مفعلة ({selectedChoices.length + (selectedSection !== "ALL" ? 1 : 0)})
              </Badge>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-rose-500"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              تفريغ الفلاتر
            </Button>
          )}
        </div>

        {/* الخيارات المختارة كـ Tags يمكن حذفها */}
        {selectedChoices.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/40">
            <span className="text-xs text-muted-foreground font-bold shrink-0">المواهب المحددة:</span>
            {selectedChoices.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs font-bold text-gold-light"
              >
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => toggleChoice(c)}
                  className="hover:text-rose-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* عناصر القوائم المنسدلة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* فلتر القسم في الاستمارة */}
          {sections.length > 0 && (
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                محور / قسم الاستمارة
              </label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="كافة الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كافة أقسام الاستمارة</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* الفرقة */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">الفرقة الدراسية</label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="كافة الفرق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كافة الفرق</SelectItem>
                {GRADES.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الشعبة */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">الشعبة الأكاديمية</label>
            <Select value={selectedSectionAcademic} onValueChange={setSelectedSectionAcademic}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="كافة الشعب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كافة الشعب</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* النوع */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">النوع (الجندر)</label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="الجميع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الجميع (بنين وبنات)</SelectItem>
                <SelectItem value="MALE">ذكور (بنين)</SelectItem>
                <SelectItem value="FEMALE">إناث (بنات)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* البحث الحي */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">
              بحث بالاسم أو الكود أو الهاتف
            </label>
            <div className="relative">
              <Input
                placeholder="ابحث هنا..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── شريط الأدوات والعمليات على النتائج المفلترة ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            الطلاب المطابقون:{" "}
            <strong className="text-gold-deep dark:text-gold-light font-black text-sm">
              {filteredParticipants.length}
            </strong>{" "}
            من أصل {participants.length} مسجلاً
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copyFilteredPhones}
            className="border-border text-xs font-bold"
          >
            <Copy className="ml-1.5 h-3.5 w-3.5" />
            نسخ أرقام واتساب الطلاب
          </Button>

          <a
            href={exportExcelUrl()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-black text-white shadow-sm transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            تصدير كشف إكسيل (.xlsx)
          </a>
        </div>
      </div>

      {/* ── بطاقات الطلاب المطابقين ── */}
      {filteredParticipants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h4 className="text-sm font-bold text-foreground">لا يوجد طلاب مطابقون لهذه المعايير</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            جرّب تقليل المواهب المحددة أو تفريغ الفلاتر لاستعراض كافة المشاركين
          </p>
          <Button size="sm" variant="outline" onClick={resetFilters} className="mt-3 text-xs">
            تفريغ الفلاتر
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredParticipants.map((p) => {
            const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");
            const waPhone = cleanPhone.startsWith("0") ? `20${cleanPhone.slice(1)}` : cleanPhone;
            const waGreeting = encodeURIComponent(
              `السلام عليكم يا ${p.fullName}، معك إدارة ورشة (${activityTitle} — ${sessionTitle}) بخصوص مشاركتك في الاستمارة...`
            );
            const waUrl = `https://wa.me/${waPhone}?text=${waGreeting}`;

            return (
              <div
                key={p.id}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-gold/40 hover:shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* الرأس: الاسم والكود والأكاديمي */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="min-w-0">
                      <h5 className="font-extrabold text-sm text-foreground truncate group-hover:text-gold-deep dark:group-hover:text-gold-light">
                        {p.fullName}
                      </h5>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{p.studentCode || "بدون كود"}</span>
                        <span>•</span>
                        <span>{GRADE_LABELS[p.grade || ""] || p.grade || "—"}</span>
                        <span>•</span>
                        <span>{SECTION_LABELS[p.section || ""] || p.section || "—"}</span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.gender === "FEMALE"
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}
                    >
                      {GENDER_LABELS[p.gender || ""] || p.gender || "—"}
                    </span>
                  </div>

                  {/* تفاصيل الإجابات والمواهب المختارة للطالب */}
                  {p.answers && p.answers.length > 0 ? (
                    <div className="space-y-2 mt-2.5">
                      {p.answers.map((ans, idx) => {
                        const val = ans.value;
                        const items = Array.isArray(val) ? val : [val];
                        const fieldMeta = formFields.find((f) => f.id === ans.fieldId);
                        const secName = fieldMeta?.section;

                        return (
                          <div key={idx} className="rounded-xl bg-muted/30 p-2 text-xs border border-border/40">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                              <span className="font-bold truncate">{ans.label}</span>
                              {secName && (
                                <span className="rounded bg-gold/10 text-gold-light px-1.5 py-0.2 text-[9px] font-bold">
                                  {secName}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {items.map((item, itemIdx) => {
                                const str = String(item).trim();
                                const isMatchedFilter = selectedChoices.includes(str);
                                return (
                                  <span
                                    key={itemIdx}
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                      isMatchedFilter
                                        ? "bg-gold text-night font-black shadow-xs"
                                        : "bg-background border border-border text-foreground"
                                    }`}
                                  >
                                    {str}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/50 p-2.5 text-center text-xs text-muted-foreground mt-2">
                      لم يسجل استجابات إضافية
                    </div>
                  )}
                </div>

                {/* تذييل البطاقة: التواصل عبر واتساب ونسخ الهاتف */}
                <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (p.phone) {
                        navigator.clipboard.writeText(p.phone);
                        toast.success(`تم نسخ الرقم: ${p.phone}`);
                      } else {
                        toast.error("لا يوجد رقم مسجل");
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    title="نسخ رقم الهاتف"
                  >
                    <Phone className="h-3 w-3" />
                    <span className="font-mono text-[11px]">{p.phone || "—"}</span>
                  </button>

                  {cleanPhone && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                    >
                      <MessageCircle className="h-3 w-3" />
                      واتساب
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
