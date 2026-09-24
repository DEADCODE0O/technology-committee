"use client";

// ═══════════════════════════════════════════════════════════════
//  محدد المواهب والرغبات التفاعلي — تجربة عصرية وسلسة
//  • مستوحى ومطابق للبرامج الـ 5 المعتمدة للجنة في قاعدة البيانات:
//    1) الكورسات والتكنولوجيا  2) الرياضة واللياقة  3) الفنون والأشغال
//    4) المسرح والأداء والموسيقى  5) الثقافة والأدب والمسابقات
//    6) الفعاليات والتنظيم والقيادة
//  • اختيار مباشر بنقرة واحدة (وسوم تفاعلية جذابة)
//  • إمكانية إضافة أي موهبة أو رغبة حرة إضافية فوراً
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Check, Plus, X, Sparkles, Search, Layers } from "lucide-react";
import {
  TALENT_CATEGORIES,
  TALENT_OPTIONS,
  TALENT_CATEGORY_LABELS,
  MAX_TALENTS,
} from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type SelectedTalent = {
  category: string;
  name: string;
  customName?: string;
  description?: string;
};

type TalentSelectorFieldProps = {
  selectedTalents: SelectedTalent[];
  onChange: (talents: SelectedTalent[]) => void;
  maxTalents?: number;
};

export function TalentSelectorField({
  selectedTalents,
  onChange,
  maxTalents = MAX_TALENTS,
}: TalentSelectorFieldProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");

  // الفئات المعروضة للتصفح (نستثني الفئات المرجعية القديمة)
  const displayCategories = useMemo(() => {
    return TALENT_CATEGORIES.filter((c) => c.value !== "OTHER");
  }, []);

  // قائمة جميع الخيارات المصنفة
  const allCategorizedOptions = useMemo(() => {
    const list: Array<{
      category: string;
      categoryLabel: string;
      value: string;
      label: string;
    }> = [];

    displayCategories.forEach((cat) => {
      const opts = TALENT_OPTIONS[cat.value] || [];
      opts.forEach((opt) => {
        // استبعاد العناصر العامة
        if (opt.value !== "OTHER" && !opt.value.startsWith("OTHER_")) {
          list.push({
            category: cat.value,
            categoryLabel: cat.label,
            value: opt.value,
            label: opt.label,
          });
        }
      });
    });

    return list;
  }, [displayCategories]);

  // تصفية الخيارات حسب التبويب والبحث
  const filteredOptions = useMemo(() => {
    let result = allCategorizedOptions;

    if (activeTab !== "ALL") {
      result = result.filter((item) => item.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allCategorizedOptions, activeTab, searchQuery]);

  // فحص هل الموهبة مختارة حالياً
  const isSelected = (cat: string, name: string) => {
    return selectedTalents.some(
      (t) => t.category === cat && t.name === name
    );
  };

  // تبديل اختيار موهبة محددة
  const handleToggleOption = (cat: string, name: string) => {
    const exists = selectedTalents.some(
      (t) => t.category === cat && t.name === name
    );

    if (exists) {
      onChange(
        selectedTalents.filter(
          (t) => !(t.category === cat && t.name === name)
        )
      );
    } else {
      if (selectedTalents.length >= maxTalents) {
        toast.error(`يمكنك اختيار حتى ${maxTalents} موهبة ورغبة`);
        return;
      }
      onChange([
        ...selectedTalents,
        {
          category: cat,
          name,
        },
      ]);
    }
  };

  // إضافة موهبة أو رغبة مخصصة يكتبها الطالب
  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      toast.error("يرجى كتابة اسم الموهبة بوضوح");
      return;
    }

    if (selectedTalents.length >= maxTalents) {
      toast.error(`يمكنك اختيار حتى ${maxTalents} موهبة ورغبة`);
      return;
    }

    // تحقق من عدم التكرار
    const alreadyExists = selectedTalents.some(
      (t) =>
        t.customName?.trim().toLowerCase() === trimmed.toLowerCase() ||
        t.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      toast.info("هذه الموهبة مضافة بالفعل في اختياراتك");
      setCustomInput("");
      return;
    }

    onChange([
      ...selectedTalents,
      {
        category: "OTHER",
        name: "OTHER",
        customName: trimmed,
      },
    ]);

    setCustomInput("");
    toast.success(`تمت إضافة «${trimmed}» بنجاح ✓`);
  };

  // حذف موهبة من المحددين
  const handleRemoveTalent = (index: number) => {
    onChange(selectedTalents.filter((_, idx) => idx !== index));
  };

  // الحصول على اسم العرض لموهبة مختارة
  const getSelectedDisplayName = (item: SelectedTalent) => {
    if (item.customName) return item.customName;
    const catOpts = TALENT_OPTIONS[item.category] || [];
    const found = catOpts.find((o) => o.value === item.name);
    return found ? found.label : item.name;
  };

  return (
    <div className="space-y-4">
      {/* ── شريط التبويبات الفئوية ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none sm:flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
            activeTab === "ALL"
              ? "bg-gold text-night shadow-[0_4px_15px_-4px_rgba(201,164,92,0.6)]"
              : "border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-gold/30 hover:bg-white/[0.06]"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          الكل
        </button>

        {displayCategories.map((cat) => {
          const isActive = activeTab === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveTab(cat.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                isActive
                  ? "bg-gold text-night shadow-[0_4px_15px_-4px_rgba(201,164,92,0.6)]"
                  : "border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-gold/30 hover:bg-white/[0.06]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── حقل بحث سريع لتسهيل الوصول ── */}
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن موهبة أو رغبة معينة..."
          className="h-10 rounded-xl bg-surface ps-9 text-xs"
        />
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── شبكة الوسوم التفاعلية (الاختيار بنقرة واحدة) ── */}
      <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
        {filteredOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredOptions.map((opt) => {
              const checked = isSelected(opt.category, opt.value);
              return (
                <button
                  key={`${opt.category}-${opt.value}`}
                  type="button"
                  onClick={() => handleToggleOption(opt.category, opt.value)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all select-none ${
                    checked
                      ? "border border-gold/70 bg-gradient-to-r from-gold/25 to-gold/10 text-gold-light shadow-[0_0_15px_-3px_rgba(201,164,92,0.35)] ring-1 ring-gold/40 scale-[1.02]"
                      : "border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-gold/30 hover:bg-white/[0.06] hover:text-zinc-100"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] transition-colors ${
                      checked
                        ? "border-gold bg-gold text-night"
                        : "border-white/20 bg-white/[0.04]"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500">
            لم نجد نتائج مطابقة لبحثك — يمكنك كتابتها وإضافتها بالأسفل مباشرة
          </div>
        )}
      </div>

      {/* ── إضافة موهبة خاصة / حرة ── */}
      <div className="rounded-2xl border border-dashed border-gold/30 bg-gold/[0.03] p-3 sm:p-4">
        <label className="mb-2 block text-xs font-bold text-gold-light">
          لديك موهبة أو رغبة أخرى لم تجدها بالقائمة؟ أضفها هنا:
        </label>
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="مثال: تعليق صوتي، عزف ناي، برمجة تطبيقات، رماية..."
            className="h-10 flex-1 rounded-xl bg-surface text-xs"
          />
          <Button
            type="button"
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="h-10 rounded-xl bg-gold px-4 text-xs font-extrabold text-night hover:bg-gold-light shrink-0"
          >
            <Plus className="h-4 w-4 me-1" />
            إضافة
          </Button>
        </div>
      </div>

      {/* ── ملخص المواهب المحددة ── */}
      {selectedTalents.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              المواهب والرغبات المحددة ({selectedTalents.length})
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-semibold text-zinc-500 hover:text-red-400 transition-colors"
            >
              مسح الكل
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {selectedTalents.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold-light"
              >
                <span>{getSelectedDisplayName(item)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTalent(idx)}
                  className="rounded-full p-0.5 text-gold-light hover:bg-gold/20 hover:text-white transition-colors"
                  aria-label="إزالة"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-zinc-500">
        💡 خطوة اختيارية لمساعدتنا في تنظيم الأنشطة المناسبة لك — يمكنك المتابعة في أي وقت.
      </p>
    </div>
  );
}
