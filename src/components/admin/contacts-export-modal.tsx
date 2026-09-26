"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Smartphone,
  Download,
  Users,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Eye,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getContactsExportStatsAction } from "@/actions/admin";
import { formatContactName, normalizePhoneNumber } from "@/lib/contacts-export";

interface ContactsExportModalProps {
  currentFilters?: {
    q?: string;
    grade?: string;
    section?: string;
    gender?: string;
    status?: string;
  };
}

export function ContactsExportModal({ currentFilters }: ContactsExportModalProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  // إحصائيات وعينات حقيقية من قاعدة البيانات
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalWithPhone: number;
    maleCount: number;
    femaleCount: number;
    activeCount: number;
    pendingCount: number;
    samples: {
      id: string;
      fullName: string;
      phone: string;
      grade: string | null;
      section: string | null;
      gender: string | null;
      email: string;
      status: string;
    }[];
  } | null>(null);

  // إعدادات التصدير وتخصيص الأسماء
  const [format, setFormat] = useState<"VCF" | "CSV_GOOGLE" | "CSV_EXCEL">("VCF");
  const [phoneFormat, setPhoneFormat] = useState<"LOCAL" | "INTERNATIONAL">("LOCAL");
  const [scope, setScope] = useState<"ALL" | "CURRENT_FILTER">("ALL");
  const [selectedGender, setSelectedGender] = useState<"ALL" | "MALE" | "FEMALE">("ALL");

  // قالب الاسم
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState(" + ( دراسات نوعية )");
  const [appendGrade, setAppendGrade] = useState(false);
  const [appendSection, setAppendSection] = useState(false);

  // تخصيص البنين والبنات
  const [enableGenderCustomization, setEnableGenderCustomization] = useState(true);
  const [maleEmoji, setMaleEmoji] = useState("👨‍🎓");
  const [maleSuffix, setMaleSuffix] = useState("");
  const [femaleEmoji, setFemaleEmoji] = useState("👩‍🎓");
  const [femaleSuffix, setFemaleSuffix] = useState("");

  // جلب الإحصائيات عند فتح النافذة
  useEffect(() => {
    if (open && !stats) {
      startTransition(async () => {
        const res = await getContactsExportStatsAction();
        if (res.ok && res.stats) {
          setStats(res.stats);
        }
      });
    }
  }, [open, stats]);

  // بناء رابط التحميل الفوري
  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      params.set("phoneFormat", phoneFormat);
      params.set("scope", scope);

      if (selectedGender !== "ALL") {
        params.set("gender", selectedGender);
      }

      if (prefix.trim()) params.set("prefix", prefix.trim());
      if (suffix.trim()) params.set("suffix", suffix.trim());

      if (enableGenderCustomization) {
        params.set("enableGender", "1");
        if (maleEmoji.trim()) params.set("maleEmoji", maleEmoji.trim());
        if (maleSuffix.trim()) params.set("maleSuffix", maleSuffix.trim());
        if (femaleEmoji.trim()) params.set("femaleEmoji", femaleEmoji.trim());
        if (femaleSuffix.trim()) params.set("femaleSuffix", femaleSuffix.trim());
      }

      if (appendGrade) params.set("appendGrade", "1");
      if (appendSection) params.set("appendSection", "1");

      if (scope === "CURRENT_FILTER" && currentFilters) {
        if (currentFilters.grade) params.set("grade", currentFilters.grade);
        if (currentFilters.section) params.set("section", currentFilters.section);
        if (currentFilters.gender && selectedGender === "ALL") params.set("gender", currentFilters.gender);
        if (currentFilters.status) params.set("status", currentFilters.status);
        if (currentFilters.q) params.set("q", currentFilters.q);
      }

      const link = document.createElement("a");
      link.href = `/api/admin/students/contacts?${params.toString()}`;
      link.setAttribute(
        "download",
        format === "VCF"
          ? "students-contacts.vcf"
          : format === "CSV_GOOGLE"
          ? "google-contacts.csv"
          : "students-contacts.csv"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        format === "VCF"
          ? "جاري تحميل ملف VCF — افتحه على هاتفك لإضافة كافة الأسماء بلمسة واحدة!"
          : "جاري تحميل ملف جهات الاتصال CSV..."
      );
      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    } catch {
      setIsDownloading(false);
      toast.error("حدث خطأ أثناء إعداد ملف جهات الاتصال");
    }
  };

  // العينات الافتراضية للمعاينة الحية إذا لم تكتمل الإحصائيات بعد
  const defaultPreviewSamples = [
    {
      id: "preview-1",
      fullName: "احمد محمد محمود",
      phone: "01552370838",
      grade: "FOURTH",
      section: "IS",
      gender: "MALE",
      email: "ahmed@example.com",
    },
    {
      id: "preview-2",
      fullName: "رحمه سامح سكي",
      phone: "01113643391",
      grade: "FOURTH",
      section: "COMMERCIAL",
      gender: "FEMALE",
      email: "rahma@example.com",
    },
  ];

  const previewSource = stats?.samples && stats.samples.length > 0 ? stats.samples : defaultPreviewSamples;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 text-xs font-extrabold text-emerald-300 hover:bg-emerald-500/[0.16] shadow-sm transition-all"
        title="تصدير جهات الاتصال كملف VCF لهاتفك أو CSV"
      >
        <Smartphone className="h-4 w-4 text-emerald-400" />
        <span>تصدير جهات الاتصال للهاتف</span>
        <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-200">
          {stats ? `${stats.totalWithPhone} هاتف` : "VCF / CSV"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-white/10 bg-surface p-6 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-zinc-50">
              <Smartphone className="h-5 w-5 text-emerald-400" />
              <span>تصدير جهات اتصال الطلاب إلى هاتفك المحمول</span>
            </DialogTitle>
            <DialogDescription className="text-xs leading-5 text-zinc-400">
              استخراج ملف جهات الاتصال بمجرد فتحه على هاتفك (أندرويد أو آيفون)، يطلب الهاتف حفظ كافة أسماء الطلاب وأرقام هواتفهم في دفتر العناوين بنقرة واحدة.
            </DialogDescription>
          </DialogHeader>

          {/* شريط الإحصائيات السريعة */}
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-2.5 text-center">
              <p className="text-[11px] text-zinc-400">مسجلون برقم هاتف</p>
              <p className="mt-1 font-mono text-base font-extrabold text-emerald-400">
                {stats ? stats.totalWithPhone.toLocaleString("ar-EG") : "186"}
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-2.5 text-center">
              <p className="text-[11px] text-zinc-400">الشباب (بنين)</p>
              <p className="mt-1 font-mono text-base font-extrabold text-sky-400">
                {stats ? stats.maleCount.toLocaleString("ar-EG") : "110"}
              </p>
            </div>
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.05] p-2.5 text-center">
              <p className="text-[11px] text-zinc-400">البنات (طالبات)</p>
              <p className="mt-1 font-mono text-base font-extrabold text-pink-400">
                {stats ? stats.femaleCount.toLocaleString("ar-EG") : "76"}
              </p>
            </div>
            <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-2.5 text-center">
              <p className="text-[11px] text-zinc-400">إجمالي طلاب المنصة</p>
              <p className="mt-1 font-mono text-base font-extrabold text-gold-light">
                {stats ? stats.totalStudents.toLocaleString("ar-EG") : "197"}
              </p>
            </div>
          </div>

          <div className="space-y-5 pt-1">
            {/* 1) صيغة الملف */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-300">1. صيغة الملف المراد استخراجه</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setFormat("VCF")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-start transition-all ${
                    format === "VCF"
                      ? "border-emerald-500/50 bg-emerald-500/[0.1] text-emerald-200 ring-1 ring-emerald-500/30"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-emerald-400">.VCF (vCard 3.0)</span>
                    <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-bold text-emerald-300">
                      موصى به للهواتف 🌟
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-400">
                    يُفتح على أندرويد وآيفون ويحفظ كافة الأرقام في الهاتف بلمسة واحدة.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("CSV_GOOGLE")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-start transition-all ${
                    format === "CSV_GOOGLE"
                      ? "border-sky-500/50 bg-sky-500/[0.1] text-sky-200 ring-1 ring-sky-500/30"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-sky-400">.CSV (Google Contacts)</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-400">
                    ملف مجهز للاستيراد المباشر في جهات اتصال حساب Google (contacts.google.com).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("CSV_EXCEL")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-start transition-all ${
                    format === "CSV_EXCEL"
                      ? "border-gold/50 bg-gold/[0.1] text-gold-light ring-1 ring-gold/30"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-gold-light">.CSV (Excel عربي)</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-zinc-400">
                    جدول إكسيل منسق بكافة بيانات الاتصال والفرقة والشعبة بالعربية.
                  </p>
                </button>
              </div>
            </div>

            {/* 2) نطاق الطلاب وتنسيق الهاتف */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-300">2. الطلاب المراد تصديرهم</Label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedGender("ALL")}
                      className={`px-1.5 py-0.5 rounded ${selectedGender === "ALL" ? "bg-white/20 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender("MALE")}
                      className={`px-1.5 py-0.5 rounded ${selectedGender === "MALE" ? "bg-sky-500/30 text-sky-300 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      بنين 👨‍🎓
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender("FEMALE")}
                      className={`px-1.5 py-0.5 rounded ${selectedGender === "FEMALE" ? "bg-pink-500/30 text-pink-300 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      بنات 👩‍🎓
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("ALL")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      scope === "ALL"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    جميع الطلاب ({selectedGender === "MALE" ? (stats?.maleCount ?? 110) : selectedGender === "FEMALE" ? (stats?.femaleCount ?? 76) : (stats?.totalWithPhone ?? 186)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("CURRENT_FILTER")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      scope === "CURRENT_FILTER"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    فلاتر الصفحة الحالية
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">3. صيغة رقم الهاتف</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneFormat("LOCAL")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      phoneFormat === "LOCAL"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    محلي (01xxxxxxxxx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneFormat("INTERNATIONAL")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      phoneFormat === "INTERNATIONAL"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    دولي (+201xxxxxxxxx)
                  </button>
                </div>
              </div>
            </div>

            {/* 3) قالب الاسم العام (Prefix & Suffix) */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold text-zinc-200">
                  4. تخصيص وفورمات الاسم العام (Prefix & Suffix)
                </Label>
                <span className="text-[10px] text-zinc-500">يطبق بجوار اسم الطالب الأصلي</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-zinc-400">نص بعد الاسم (Suffix)</Label>
                  <Input
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="مثال: + ( دراسات نوعية )"
                    className="h-10 rounded-xl bg-night text-xs text-gold-light font-bold"
                  />
                  <p className="text-[10px] text-zinc-500">مثال: «احمد محمد محمود + ( دراسات نوعية )»</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-zinc-400">نص قبل الاسم (Prefix - اختياري)</Label>
                  <Input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="مثال: نوعية - "
                    className="h-10 rounded-xl bg-night text-xs"
                  />
                  <p className="text-[10px] text-zinc-500">يوضع في بداية الاسم تماماً</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appendGrade}
                    onChange={(e) => setAppendGrade(e.target.checked)}
                    className="rounded border-white/20 bg-night text-gold focus:ring-gold"
                  />
                  <span>إضافة الفرقة في الاسم (مثلاً: رابعة)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appendSection}
                    onChange={(e) => setAppendSection(e.target.checked)}
                    className="rounded border-white/20 bg-night text-gold focus:ring-gold"
                  />
                  <span>إضافة الشعبة في الاسم (مثلاً: نظم معلومات)</span>
                </label>
              </div>
            </div>

            {/* 4) تخصيص الشباب والبنات (ميزة فريدة طلبتها) */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableGenderCustomization}
                    onCheckedChange={setEnableGenderCustomization}
                    id="gender-custom"
                  />
                  <Label htmlFor="gender-custom" className="text-xs font-extrabold text-zinc-200 cursor-pointer">
                    5. تخصيص إضافي للبنين والبنات (إيموجي أو نص مخصص)
                  </Label>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {enableGenderCustomization ? "مفعل ✓" : "معطل"}
                </span>
              </div>

              {enableGenderCustomization && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-white/[0.06]">
                  {/* للشباب */}
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300">للشباب (بنين 👨‍🎓)</span>
                      <span className="text-[10px] text-zinc-400">إيموجي أو نص</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-zinc-400">الإيموجي</Label>
                        <Input
                          value={maleEmoji}
                          onChange={(e) => setMaleEmoji(e.target.value)}
                          placeholder="👨‍🎓"
                          className="h-9 rounded-lg bg-night text-center text-sm font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-zinc-400">نص إضافي (اختياري)</Label>
                        <Input
                          value={maleSuffix}
                          onChange={(e) => setMaleSuffix(e.target.value)}
                          placeholder="مثلاً: (طالب)"
                          className="h-9 rounded-lg bg-night text-xs text-start"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {["👨‍🎓", "⚡", "💻", "⭐", "🔹"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setMaleEmoji(em)}
                          className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-xs hover:bg-white/15"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* للبنات */}
                  <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.04] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-300">للبنات (طالبات 👩‍🎓)</span>
                      <span className="text-[10px] text-zinc-400">إيموجي أو نص</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-zinc-400">الإيموجي</Label>
                        <Input
                          value={femaleEmoji}
                          onChange={(e) => setFemaleEmoji(e.target.value)}
                          placeholder="👩‍🎓"
                          className="h-9 rounded-lg bg-night text-center text-sm font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-zinc-400">نص إضافي (اختياري)</Label>
                        <Input
                          value={femaleSuffix}
                          onChange={(e) => setFemaleSuffix(e.target.value)}
                          placeholder="مثلاً: (طالبة)"
                          className="h-9 rounded-lg bg-night text-xs text-start"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {["👩‍🎓", "🌸", "✨", "🎀", "🔸"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setFemaleEmoji(em)}
                          className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-xs hover:bg-white/15"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5) معاينة حية وفورية في الوقت الفعلي */}
            <div className="rounded-2xl border border-gold/30 bg-gold/[0.04] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-gold-light">
                  <Eye className="h-4 w-4" />
                  معاينة حية ومباشرة: كيف ستظهر الأسماء في هاتفك الآن
                </span>
                <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold-light">
                  تحديث فوري ⚡
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {previewSource.slice(0, 3).map((item) => {
                  const sampleStudent = {
                    id: item.id,
                    email: item.email,
                    fullName: item.fullName,
                    phone: item.phone,
                    grade: item.grade,
                    section: item.section,
                    gender: item.gender,
                  };

                  const previewName = formatContactName(sampleStudent, {
                    format,
                    phoneFormat,
                    prefix,
                    suffix,
                    enableGenderCustomization,
                    maleEmoji,
                    femaleEmoji,
                    maleSuffix,
                    femaleSuffix,
                    appendGrade,
                    appendSection,
                  });

                  const previewPhone = normalizePhoneNumber(item.phone, phoneFormat);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-night/80 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                            item.gender === "FEMALE"
                              ? "bg-pink-500/20 text-pink-300"
                              : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {item.gender === "FEMALE" ? "👩" : "👨"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-zinc-100">{previewName}</p>
                          <p className="text-[10px] text-zinc-500">
                            الاسم الأصلي: {item.fullName}
                          </p>
                        </div>
                      </div>
                      <div className="text-end shrink-0 ps-3">
                        <span className="font-mono text-xs font-bold text-emerald-400" dir="ltr">
                          {previewPhone}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* الأزرار النهائية */}
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/5"
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="h-11 flex-[2] rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <Download className="h-4 w-4 me-1.5" />
                {isDownloading ? (
                  "جاري استخراج جهات الاتصال..."
                ) : format === "VCF" ? (
                  `تحميل جهات الاتصال للهاتف (${stats ? stats.totalWithPhone : 186} طالب .vcf)`
                ) : (
                  `تصدير ملف جهات الاتصال (${stats ? stats.totalWithPhone : 186} طالب .csv)`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
