"use client";

// ═══════════════════════════════════════════════════════════════
//  معالج إكمال بيانات الطالب (Google / Facebook OAuth) — معالج خطوات تفاعلي
//  مطابق تماماً لتجربة معالج التسجيل:
//  1) البيانات الأساسية  2) مواهبك  3) بيانات إضافية
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, UserRound, Sparkles, Plus, Trash2,
  HelpCircle, Heart, Phone, IdCard, ChevronRight, ChevronLeft, Check,
} from "lucide-react";
import { completeGoogleProfile, type CompleteProfileData } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GRADES, SECTIONS, GENDERS, DISCOVERY_SOURCES, JOIN_REASONS,
  TALENT_CATEGORIES, TALENT_OPTIONS, MAX_TALENTS,
} from "@/lib/constants";
import { isValidArabicFullName, normalizeArabicName, validateStudentCodeFormat } from "@/lib/validation";

const STEPS = [
  { title: "بياناتك الأساسية", icon: UserRound },
  { title: "مواهبك", icon: Sparkles },
  { title: "بيانات إضافية", icon: HelpCircle },
];

type CodeConfig = { requiredGrades: string[]; pattern: string; hint: string };

export function CompleteProfileForm({
  suggestedName,
  codeConfig,
}: {
  suggestedName: string;
  codeConfig?: CodeConfig;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  // البيانات الأساسية
  const [fullName, setFullName] = useState(suggestedName);
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [studentCode, setStudentCode] = useState("");

  // المواهب
  const [hasTalent, setHasTalent] = useState(false);
  const [talents, setTalents] = useState<
    Array<{ category: string; name: string; customName: string; description: string }>
  >([]);

  // مصدر التعارف وأسباب الانضمام
  const [discoverySource, setDiscoverySource] = useState("");
  const [joinReasons, setJoinReasons] = useState<string[]>([]);
  const [joinReasonOther, setJoinReasonOther] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const codeNeeded = codeConfig?.requiredGrades?.includes(grade) ?? false;
  const discoveryOptions = DISCOVERY_SOURCES.filter(
    (d) => !("firstYearOnly" in d && d.firstYearOnly) || grade === "FIRST"
  );

  const toggleHasTalent = (checked: boolean) => {
    setHasTalent(checked);
    if (checked && talents.length === 0) {
      setTalents([{ category: "", name: "", customName: "", description: "" }]);
    }
  };

  const handleAddTalentSlot = () => {
    if (talents.length >= MAX_TALENTS) {
      toast.error(`الحد الأقصى للمواهب هو ${MAX_TALENTS}`);
      return;
    }
    setTalents((prev) => [...prev, { category: "", name: "", customName: "", description: "" }]);
  };

  const handleRemoveTalentSlot = (index: number) => {
    setTalents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTalent = (
    index: number,
    field: "category" | "name" | "customName" | "description",
    val: string
  ) => {
    setTalents((prev) => {
      const next = [...prev];
      if (field === "category") {
        next[index] = { ...next[index], category: val, name: "", customName: "" };
      } else if (field === "name") {
        next[index] = { ...next[index], name: val, customName: val === "OTHER" ? next[index].customName : "" };
      } else {
        next[index] = { ...next[index], [field]: val };
      }
      return next;
    });
  };

  // التحقق قبل الانتقال للخطوة التالية
  const validateStep = (currentStep: number): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 0) {
      if (!isValidArabicFullName(normalizeArabicName(fullName))) {
        errs.fullName = "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل";
      }
      if (!grade) errs.grade = "اختر فرقتك الدراسية";
      if (!section) errs.section = "اختر شعبتك";
      if (!gender) errs.gender = "اختر الجنس";
      if (!/^01[0125][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
        errs.phone = "رقم هاتف غير صحيح — مثال: 01012345678";
      }
      if (codeNeeded) {
        const check = validateStudentCodeFormat(studentCode.trim(), grade);
        if (!check.ok) errs.studentCode = check.error!;
      }
    }

    if (currentStep === 1 && hasTalent) {
      if (talents.length === 0) {
        errs.talents = "يرجى إضافة موهبة واحدة على الأقل أو إغلاق خيار الموهبة";
      }
      for (let i = 0; i < talents.length; i++) {
        const t = talents[i];
        const prefix = talents.length > 1 ? `الموهبة (${i + 1}): ` : "";
        if (!t.category) {
          errs[`talent_${i}`] = `${prefix}اختر تصنيف الموهبة`;
          break;
        }
        if (!t.name) {
          errs[`talent_${i}`] = `${prefix}اختر الموهبة من القائمة`;
          break;
        }
        if (t.name === "OTHER" && (!t.customName || t.customName.trim().length < 2)) {
          errs[`talent_${i}`] = `${prefix}اكتب اسم الموهبة`;
          break;
        }
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = () => {
    if (!validateStep(0) || !validateStep(1)) return;

    if (joinReasons.includes("OTHER") && (!joinReasonOther || joinReasonOther.trim().length < 3)) {
      toast.error("يرجى توضيح سبب الانضمام في خانة «أخرى»");
      return;
    }

    const payload: CompleteProfileData = {
      fullName: normalizeArabicName(fullName),
      grade,
      section,
      gender,
      phone: phone.replace(/[\s-]/g, ""),
      studentCode: codeNeeded ? studentCode.trim() : undefined,
      discoverySource: discoverySource || undefined,
      joinReasons: joinReasons.length ? joinReasons : undefined,
      joinReasonOther: joinReasons.includes("OTHER") ? joinReasonOther.trim() : undefined,
      hasTalent,
      talents: hasTalent
        ? talents.map((t) => ({
            category: t.category,
            name: t.name,
            customName: t.customName?.trim() || undefined,
            description: t.description?.trim() || undefined,
          }))
        : undefined,
    };

    startTransition(async () => {
      const res = await completeGoogleProfile(payload);
      if (res.ok) {
        setDone(true);
        toast.success("أهلاً بك في اللجنة! تم حفظ بياناتك بنجاح 🎉");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حفظ البيانات — حاول مجددًا");
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-8 text-center shadow-xl backdrop-blur-xl">
        <CheckCircle2 className="mx-auto h-14 w-14 text-gold animate-bounce" />
        <h2 className="mt-4 text-2xl font-extrabold text-gold-light">أهلًا بك رسميًا في مجتمع اللجنة ✦</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-400">
          تم حفظ جميع بياناتك ومواهبك بنجاح — حسابك مفعل وجاهز الآن للمشاركة في الورش وحصد النقاط.
        </p>
        <Button
          onClick={() => router.push("/panel")}
          className="mt-6 h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-8 text-sm font-extrabold text-night shadow-lg hover:opacity-95"
        >
          الانتقال إلى لوحة التحكم
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
      {/* ── مؤشر الخطوات التفاعلي ── */}
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="خطوات إكمال البيانات">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center gap-2">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 ${
                i < step
                  ? "border-gold/50 bg-gold/15 text-gold shadow-[0_0_15px_rgba(201,164,92,0.2)]"
                  : i === step
                  ? "border-gold bg-gradient-to-b from-gold-light to-gold text-night shadow-[0_6px_20px_-6px_rgba(201,164,92,0.6)] scale-105"
                  : "border-white/10 bg-white/[0.03] text-zinc-600"
              }`}
            >
              {i < step ? <Check className="h-5 w-5 stroke-[2.5]" /> : <s.icon className="h-5 w-5" />}
            </div>
            <span
              className={`text-center text-[11px] font-bold sm:text-xs transition-colors ${
                i <= step ? "text-zinc-100" : "text-zinc-600"
              }`}
            >
              {s.title}
            </span>
          </li>
        ))}
      </ol>

      {/* ── شريط التقدم المتدرج ── */}
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-gold to-gold-light"
          initial={false}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          {/* ══════════════════════════════════════════════════════ */}
          {/* الخطوة 1: البيانات الأساسية */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">بياناتك الأكاديمية والشخصية</h3>
                  <p className="text-[11px] text-zinc-400">تساعدنا في توثيق حسابك وربط شهاداتك بالفرقة والشعبة الصحيحة</p>
                </div>
              </div>

              {/* الاسم الكامل */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-zinc-200">
                  الاسم الكامل (ثلاثي أو رباعي) <span className="text-gold">*</span>
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد الله إبراهيم"
                  className={`h-12 rounded-xl text-base ${errors.fullName ? "border-red-500" : ""}`}
                  autoComplete="name"
                />
                {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
              </div>

              {/* الفرقة والشعبة */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-zinc-200">
                    الفرقة الدراسية <span className="text-gold">*</span>
                  </Label>
                  <Select dir="rtl" value={grade} onValueChange={(val) => { setGrade(val); setErrors((prev) => ({ ...prev, grade: "" })); }}>
                    <SelectTrigger className={`h-12 w-full rounded-xl ${errors.grade ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="اختر فرقتك" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-zinc-200">
                    الشعبة <span className="text-gold">*</span>
                  </Label>
                  <Select dir="rtl" value={section} onValueChange={(val) => { setSection(val); setErrors((prev) => ({ ...prev, section: "" })); }}>
                    <SelectTrigger className={`h-12 w-full rounded-xl ${errors.section ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="اختر شعبتك" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* الجنس */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-zinc-200">
                  الجنس <span className="text-gold">*</span>
                </Label>
                <RadioGroup dir="rtl" value={gender} onValueChange={(val) => { setGender(val); setErrors((prev) => ({ ...prev, gender: "" })); }} className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <label
                      key={g.value}
                      className="flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm font-bold text-zinc-200 transition-colors has-[button[data-state=checked]]:border-gold/60 has-[button[data-state=checked]]:bg-gold/[0.1] has-[button[data-state=checked]]:text-gold-light"
                    >
                      <RadioGroupItem value={g.value} id={`cg-${g.value}`} />
                      {g.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* رقم الهاتف */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-zinc-200">
                  رقم الهاتف (واتساب) <span className="text-gold">*</span>
                </Label>
                <div className="relative">
                  <Input
                    dir="ltr"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className={`h-12 rounded-xl text-start font-mono ps-11 ${errors.phone ? "border-red-500" : ""}`}
                    autoComplete="tel"
                  />
                  <Phone className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>

              {/* كود الطالب (إن كان مطلوباً للفرقة) */}
              {codeNeeded && (
                <div className="space-y-1.5 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
                  <div className="flex items-center gap-2 text-gold-light">
                    <IdCard className="h-4 w-4" />
                    <Label className="text-sm font-bold">كود الطالب الأكاديمي <span className="text-gold">*</span></Label>
                  </div>
                  <p className="text-xs text-zinc-400">{codeConfig?.hint || "أدخل كودك الجامعي للتحقق الأكاديمي"}</p>
                  <Input
                    dir="ltr"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="مثال: 20240123"
                    className={`h-12 rounded-xl font-mono text-start ${errors.studentCode ? "border-red-500" : ""}`}
                  />
                  {errors.studentCode && <p className="text-xs text-red-400">{errors.studentCode}</p>}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* الخطوة 2: المواهب */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">شاركنا شغفك ومواهبك</h3>
                  <p className="text-[11px] text-zinc-400">ندعم مواهبك ونوفر لك فرص المشاركة في المعارض والمشاريع</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-zinc-200">هل لديك موهبة تحب تنميتها وتشارك بها؟</Label>
                  <p className="text-xs text-zinc-400">برمجة، تصميم، كتابة، تصوير، خط، رسم، تعليق صوتي، إلقاء...</p>
                </div>
                <Switch checked={hasTalent} onCheckedChange={toggleHasTalent} />
              </div>

              {hasTalent && (
                <div className="space-y-4">
                  {talents.map((t, idx) => {
                    const options = TALENT_OPTIONS[t.category] ?? [];
                    return (
                      <div key={idx} className="relative rounded-2xl border border-gold/20 bg-white/[0.02] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gold-light">الموهبة ({idx + 1})</span>
                          {talents.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTalentSlot(idx)}
                              className="h-8 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5 ms-1" /> حذف
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-zinc-300">تصنيف الموهبة</Label>
                            <Select
                              dir="rtl"
                              value={t.category}
                              onValueChange={(val) => handleUpdateTalent(idx, "category", val)}
                            >
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="اختر التصنيف" />
                              </SelectTrigger>
                              <SelectContent>
                                {TALENT_CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-zinc-300">اسم الموهبة</Label>
                            <Select
                              dir="rtl"
                              value={t.name}
                              onValueChange={(val) => handleUpdateTalent(idx, "name", val)}
                              disabled={!t.category}
                            >
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder={t.category ? "اختر الموهبة" : "اختر التصنيف أولاً"} />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {t.name === "OTHER" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-zinc-300">اكتب اسم موهبتك</Label>
                            <Input
                              value={t.customName}
                              onChange={(e) => handleUpdateTalent(idx, "customName", e.target.value)}
                              placeholder="مثال: مونتاج بودكاست أو تصميم ثلاثي الأبعاد..."
                              className="h-11 rounded-xl"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-300">نبذة أو رابط معرض أعمال (اختياري)</Label>
                          <Textarea
                            value={t.description}
                            onChange={(e) => handleUpdateTalent(idx, "description", e.target.value)}
                            placeholder="اكتب نبذة عن مستواك أو رابط Behance / GitHub / Drive..."
                            className="min-h-[70px] rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {talents.length < MAX_TALENTS && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTalentSlot}
                      className="w-full h-11 rounded-xl border-dashed border-gold/40 text-gold-light hover:bg-gold/10 text-xs font-bold gap-2"
                    >
                      <Plus className="h-4 w-4" /> إضافة موهبة أخرى (حتى {MAX_TALENTS})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* الخطوة 3: بيانات إضافية */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">أسئلة إضافية سريعة</h3>
                  <p className="text-[11px] text-zinc-400">تساعدنا في تحسين فعالياتنا وتقديم الأنشطة التي تهمك</p>
                </div>
              </div>

              {/* مصدر التعارف */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">عرفت اللجنة منين؟</Label>
                <div className="grid grid-cols-2 gap-2">
                  {discoveryOptions.map((opt) => {
                    const isSelected = discoverySource === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDiscoverySource(opt.value)}
                        className={`flex h-11 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                          isSelected
                            ? "border-gold bg-gold/15 text-gold-light shadow-[0_0_12px_rgba(201,164,92,0.2)]"
                            : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* أسباب الانضمام */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">إيه أكتر حاجات حابب تستفيد منها معنا؟ (يمكن اختيار أكثر من سبب)</Label>
                <div className="space-y-2">
                  {JOIN_REASONS.map((r) => {
                    const isChecked = joinReasons.includes(r.value);
                    return (
                      <label
                        key={r.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-bold transition-colors ${
                          isChecked
                            ? "border-gold/60 bg-gold/10 text-gold-light"
                            : "border-white/[0.07] bg-white/[0.02] text-zinc-300 hover:border-white/15"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => {
                            if (c) setJoinReasons((prev) => [...prev, r.value]);
                            else setJoinReasons((prev) => prev.filter((x) => x !== r.value));
                          }}
                        />
                        <span>{r.label}</span>
                      </label>
                    );
                  })}
                </div>

                {joinReasons.includes("OTHER") && (
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-bold text-zinc-300">وضح سببك بالتفصيل</Label>
                    <Textarea
                      value={joinReasonOther}
                      onChange={(e) => setJoinReasonOther(e.target.value)}
                      placeholder="اكتب توقعاتك وهدفك من الانضمام..."
                      className="min-h-[70px] rounded-xl text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── أزرار التنقل (السابق / التالي / تأكيد الحساب) ── */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={pending}
            className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-sm font-bold text-zinc-300 hover:bg-white/[0.08] gap-2 px-6"
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={nextStep}
            className="h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-7 text-sm font-extrabold text-night shadow-md hover:opacity-95 gap-2 ms-auto"
          >
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={pending}
            className="h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-8 text-sm font-extrabold text-night shadow-lg hover:opacity-95 gap-2 ms-auto"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> جاري حفظ وتفعيل الحساب...
              </>
            ) : (
              <>
                إكمال التسجيل والدخول إلى المنصة <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
