"use client";

// ═══════════════════════════════════════════════════════════════
//  إكمال بيانات مستخدم Google — النموذج الشامل:
//  البيانات الأساسية + كود الطالب + المواهب + أسباب الانضمام + مصدر التعارف
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, UserRound, Sparkles, Plus, Trash2,
  HelpCircle, Heart, Phone, IdCard,
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

type CodeConfig = { requiredGrades: string[]; pattern: string; hint: string };

export function CompleteProfileForm({
  suggestedName,
  codeConfig,
}: {
  suggestedName: string;
  codeConfig?: CodeConfig;
}) {
  const router = useRouter();
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

  if (done) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-4 text-xl font-extrabold text-gold-light">أهلًا بك رسميًا في مجتمع اللجنة ✦</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-400">
          تم حفظ جميع بياناتك ومواهبك بنجاح — حسابك جاهز بالكامل للتفاعل وتجميع النقاط والمشاركة في الورش.
        </p>
        <Button
          onClick={() => router.push("/panel")}
          className="mt-5 h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-8 text-sm font-extrabold text-night shadow-lg"
        >
          إلى لوحتي
        </Button>
      </div>
    );
  }

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!isValidArabicFullName(normalizeArabicName(fullName))) {
      errs.fullName = "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل";
    }
    if (!grade) errs.grade = "اختر الفرقة";
    if (!section) errs.section = "اختر الشعبة";
    if (!gender) errs.gender = "اختر الجنس";
    if (!/^01[0125][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      errs.phone = "رقم هاتف غير صحيح — مثال: 01012345678";
    }
    if (codeNeeded) {
      const check = validateStudentCodeFormat(studentCode.trim(), grade);
      if (!check.ok) errs.studentCode = check.error!;
    }

    if (hasTalent) {
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
          errs[`talent_${i}`] = `${prefix}اختر اسم الموهبة من القائمة`;
          break;
        }
        if (t.name === "OTHER" && (!t.customName || t.customName.trim().length < 2)) {
          errs[`talent_${i}`] = `${prefix}اكتب اسم الموهبة`;
          break;
        }
      }
      const keys = talents.map((t) => `${t.category}|${t.name}|${t.customName.trim()}`.toLowerCase());
      if (new Set(keys).size !== keys.length) {
        errs.talents = "يوجد تكرار في المواهب المختارة — اختر موهبة مختلفة";
      }
    }

    if (joinReasons.includes("OTHER") && joinReasonOther.trim().length < 3) {
      errs.joinReasonOther = "اكتب سببك في خانة «أخرى»";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErr = Object.values(errs)[0];
      toast.error(firstErr);
      return;
    }

    const payload: CompleteProfileData = {
      fullName: fullName.trim(),
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
        router.refresh();
        toast.success("اكتمل ملفك بنجاح 🎉");
      } else {
        toast.error(res.error || "تعذر حفظ البيانات");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8 space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold">
          <UserRound className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold text-zinc-50">خطوة أخيرة — إكمال بياناتك</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
          تم توثيق بريدك عبر Google بنجاح. أكمل بياناتك الدراسية ومواهبك لنخصص لك أنشطة تناسبك
        </p>
      </div>

      <div className="space-y-5">
        {/* ── 1. البيانات الأساسية ── */}
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <h2 className="text-xs font-bold text-gold flex items-center gap-1.5">
            <UserRound className="h-4 w-4" />
            البيانات الأساسية والدراسية
          </h2>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">
              الاسم الكامل <span className="text-gold">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمد عبد الرحمن"
              className="h-12 rounded-xl"
            />
            {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">
                الفرقة <span className="text-gold">*</span>
              </Label>
              <Select dir="rtl" value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-12 w-full rounded-xl">
                  <SelectValue placeholder="اختر فرقتك" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade && <p className="text-xs text-red-400">{errors.grade}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">
                الشعبة <span className="text-gold">*</span>
              </Label>
              <Select dir="rtl" value={section} onValueChange={setSection}>
                <SelectTrigger className="h-12 w-full rounded-xl">
                  <SelectValue placeholder="اختر شعبتك" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.section && <p className="text-xs text-red-400">{errors.section}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">
              الجنس <span className="text-gold">*</span>
            </Label>
            <RadioGroup dir="rtl" value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <label
                  key={g.value}
                  className="flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm font-bold text-zinc-200 transition-colors has-[button[data-state=checked]]:border-gold/60 has-[button[data-state=checked]]:bg-gold/[0.1] has-[button[data-state=checked]]:text-gold-light"
                >
                  <RadioGroupItem value={g.value} id={`g-google-${g.value}`} />
                  {g.label}
                </label>
              ))}
            </RadioGroup>
            {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">
              رقم الهاتف <span className="text-gold">*</span>
            </Label>
            <Input
              dir="ltr"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="h-12 rounded-xl text-start"
            />
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Phone className="h-3.5 w-3.5" /> للتواصل بخصوص الأنشطة والورش
            </p>
            {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
          </div>

          {codeNeeded && (
            <div className="space-y-2 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
              <Label className="flex items-center gap-2 text-sm font-bold text-gold-light">
                <IdCard className="h-4 w-4" /> كود الطالب <span className="text-gold">*</span>
              </Label>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="2023108888"
                maxLength={10}
                className="h-12 rounded-xl text-start"
                autoComplete="off"
              />
              <p className="text-xs text-zinc-400">{codeConfig?.hint}</p>
              {errors.studentCode && <p className="text-xs text-red-400">{errors.studentCode}</p>}
            </div>
          )}
        </div>

        {/* ── 2. المواهب والاهتمامات ── */}
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-gold" />
                هل لديك موهبة تحب تشاركها معنا؟
              </Label>
              <p className="text-xs text-zinc-400 mt-0.5">
                تقدر تضيف حتى {MAX_TALENTS} مواهب، أو تتخطاها وتضيفها لاحقًا من ملفك
              </p>
            </div>
            <Switch checked={hasTalent} onCheckedChange={toggleHasTalent} />
          </div>

          {hasTalent && (
            <div className="space-y-4 pt-2">
              {talents.map((t, idx) => {
                const availableOptions = TALENT_OPTIONS[t.category] || [];
                return (
                  <div key={idx} className="relative space-y-3 rounded-2xl border border-gold/20 bg-gold/[0.03] p-4 sm:p-5">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                      <span className="text-xs font-bold text-gold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        الموهبة {idx + 1} من {MAX_TALENTS}
                      </span>
                      {talents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTalentSlot(idx)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-300">
                          تصنيف الموهبة <span className="text-gold">*</span>
                        </Label>
                        <Select
                          dir="rtl"
                          value={t.category}
                          onValueChange={(val) => handleUpdateTalent(idx, "category", val)}
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl bg-surface">
                            <SelectValue placeholder="اختر المجال" />
                          </SelectTrigger>
                          <SelectContent>
                            {TALENT_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-300">
                          الموهبة المحددة <span className="text-gold">*</span>
                        </Label>
                        <Select
                          dir="rtl"
                          value={t.name}
                          disabled={!t.category}
                          onValueChange={(val) => handleUpdateTalent(idx, "name", val)}
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl bg-surface">
                            <SelectValue placeholder={t.category ? "اختر الموهبة" : "اختر المجال أولاً"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {t.name === "OTHER" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gold-light">
                          اسم الموهبة بالتفصيل <span className="text-gold">*</span>
                        </Label>
                        <Input
                          value={t.customName}
                          onChange={(e) => handleUpdateTalent(idx, "customName", e.target.value)}
                          placeholder="مثال: تعليق صوتي، كتابة محتوى..."
                          className="h-11 rounded-xl bg-surface"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-400">
                        نبذة أو إنجازاتك في الموهبة (اختياري)
                      </Label>
                      <Textarea
                        value={t.description}
                        onChange={(e) => handleUpdateTalent(idx, "description", e.target.value)}
                        placeholder="مثال: شاركت في مسابقات أو مشاريع..."
                        rows={2}
                        className="rounded-xl bg-surface resize-none text-sm"
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
                  className="w-full h-11 border-dashed border-gold/40 text-gold hover:bg-gold/[0.06] rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm"
                >
                  <Plus className="h-4 w-4" />
                  إضافة موهبة أخرى ({talents.length}/{MAX_TALENTS})
                </Button>
              )}
              {errors.talents && <p className="text-xs text-red-400">{errors.talents}</p>}
            </div>
          )}
        </div>

        {/* ── 3. بيانات إضافية (التعارف والانضمام) ── */}
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <h2 className="text-xs font-bold text-gold flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" />
            بيانات تساعدنا في تطوير تجربتك (اختيارية)
          </h2>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">إزاي عرفت عن اللجنة؟</Label>
            <Select dir="rtl" value={discoverySource} onValueChange={setDiscoverySource}>
              <SelectTrigger className="h-12 w-full rounded-xl">
                <SelectValue placeholder="اختر (اختياري)" />
              </SelectTrigger>
              <SelectContent>
                {discoveryOptions.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {grade === "FIRST" && (
              <p className="text-xs text-zinc-500">خيار «أثناء التنسيق» متاح لطلاب الفرقة الأولى</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-zinc-200">
              ليه انضمت للجنة؟ <span className="text-xs font-normal text-zinc-400">(تقدر تختار أكثر من سبب)</span>
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {JOIN_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm text-zinc-200 transition-colors hover:border-gold/25 has-[button[data-state=checked]]:border-gold/50 has-[button[data-state=checked]]:bg-gold/[0.08]"
                >
                  <Checkbox
                    checked={joinReasons.includes(r.value)}
                    onCheckedChange={(chk) => {
                      setJoinReasons((p) => (chk ? [...p, r.value] : p.filter((x) => x !== r.value)));
                    }}
                  />
                  {r.label}
                </label>
              ))}
            </div>

            {joinReasons.includes("OTHER") && (
              <div className="space-y-2 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                <Label className="text-sm font-bold text-gold-light">
                  <Heart className="me-1.5 inline h-4 w-4" />
                  اكتب سببك في خانة «أخرى»
                </Label>
                <Input
                  value={joinReasonOther}
                  onChange={(e) => setJoinReasonOther(e.target.value)}
                  placeholder="سببك في الانضمام..."
                  className="h-11 rounded-xl"
                />
                {errors.joinReasonOther && <p className="text-xs text-red-400">{errors.joinReasonOther}</p>}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={pending}
          className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          إتمام ملفي وحفظ البيانات
        </Button>
      </div>
    </div>
  );
}
