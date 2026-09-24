"use client";

// ═══════════════════════════════════════════════════════════════
//  معالج إكمال بيانات الطالب (Google OAuth) — معالج 4 خطوات تفاعلي
//  مطابق تماماً لتجربة معالج التسجيل بالبريد العادي:
//  1) حسابك  2) بياناتك الأساسية  3) مواهبك ورغباتك  4) بيانات إضافية
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ChevronRight, ChevronLeft, Mail, User as UserIcon, Phone, IdCard,
  HelpCircle, Heart, PartyPopper, Check, Sparkles,
} from "lucide-react";
import { completeGoogleProfile, type CompleteProfileData } from "@/actions/auth";
import { validateStudentCodeFormat } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GRADES, SECTIONS, GENDERS, DISCOVERY_SOURCES, JOIN_REASONS,
  MAX_TALENTS,
} from "@/lib/constants";
import { TalentSelectorField, type SelectedTalent } from "@/components/platform/talent-selector-field";

const STEPS = [
  { title: "حسابك", icon: Mail },
  { title: "بياناتك الأساسية", icon: UserIcon },
  { title: "مواهبك ورغباتك", icon: Sparkles },
  { title: "بيانات إضافية", icon: HelpCircle },
];

type CodeConfig = { requiredGrades: string[]; pattern: string; hint: string };

export function CompleteProfileForm({
  userEmail,
  suggestedName,
  avatarUrl,
  codeConfig,
  returnTo,
}: {
  userEmail: string;
  suggestedName: string;
  avatarUrl?: string | null;
  codeConfig?: CodeConfig;
  returnTo?: string;
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  // البيانات
  const [fullName, setFullName] = useState(suggestedName);
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [discoverySource, setDiscoverySource] = useState("");
  const [joinReasons, setJoinReasons] = useState<string[]>([]);
  const [joinReasonOther, setJoinReasonOther] = useState("");

  // المواهب والرغبات (اختيار سلس بنقرة واحدة)
  const [talents, setTalents] = useState<SelectedTalent[]>([]);

  const codeNeeded = codeConfig?.requiredGrades?.includes(grade) ?? false;

  // أسئلة التعارف — التنسيق للفرقة الأولى فقط
  const discoveryOptions = DISCOVERY_SOURCES.filter(
    (d) => !("firstYearOnly" in d && d.firstYearOnly) || grade === "FIRST"
  );

  // ── التحقق لكل خطوة ──
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      // حساب Google موثق بالفعل
      return null;
    }
    if (s === 1) {
      if (
        !/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFEFF\s]+$/u.test(fullName.trim().replace(/\s+/g, " ")) ||
        fullName.trim().replace(/\s+/g, " ").split(" ").filter((w) => w.length >= 2).length < 3
      ) {
        return "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل";
      }
      if (!grade) return "اختر فرقتك";
      if (!section) return "اختر شعبتك";
      if (!gender) return "اختر الجنس";
      if (!/^01[0125][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
        return "رقم هاتف مصري غير صحيح — مثال: 01012345678";
      }
      if (codeNeeded) {
        const check = validateStudentCodeFormat(studentCode.trim(), grade);
        if (!check.ok) return check.error!;
      }
    }
    if (s === 2) {
      // المواهب اختيارية وسلسة — لا قيود تمنع الانتقال
      return null;
    }
    if (s === 3) {
      if (joinReasons.includes("OTHER") && joinReasonOther.trim().length < 3) {
        return "اكتب سببك في خانة «أخرى»";
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) return toast.error(err);
    setStep((p) => Math.min(p + 1, 3));
  };

  const submit = () => {
    for (let s = 0; s < 4; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        return toast.error(err);
      }
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
      hasTalent: talents.length > 0,
      talents: talents.length > 0
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
        toast.success("أهلاً بيك في اللجنة! 🎉");
        const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/panel";
        window.location.href = target;
      } else {
        toast.error(res.error || "تعذر حفظ البيانات");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
      {/* مؤشر الخطوات */}
      <ol className="mb-8 grid grid-cols-4 gap-1.5" aria-label="خطوات التسجيل">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 ${
                i < step
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : i === step
                    ? "border-gold bg-gradient-to-b from-gold-light to-gold text-night shadow-[0_6px_20px_-6px_rgba(201,164,92,0.5)]"
                    : "border-white/10 bg-white/[0.03] text-zinc-600"
              }`}
            >
              {i < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
            </div>
            <span className={`text-center text-[10px] font-bold sm:text-xs ${i <= step ? "text-zinc-200" : "text-zinc-600"}`}>
              {s.title}
            </span>
          </li>
        ))}
      </ol>

      {/* شريط التقدم */}
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-gold to-gold-light"
          initial={false}
          animate={{ width: `${((step + 1) / 4) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* ── الخطوة 1: الحساب ── */}
          {step === 0 && (
            <>
              <StepIntro
                icon={<Mail className="h-5 w-5" />}
                title="حسابك على Google"
                hint="تم التحقق من بريدك الإلكتروني بنجاح"
              />
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">البريد الإلكتروني الموثق</Label>
                <div className="relative">
                  <Input
                    dir="ltr"
                    type="email"
                    value={userEmail}
                    disabled
                    className="h-12 rounded-xl text-start bg-white/[0.04] text-zinc-200 font-mono pr-11 opacity-90 cursor-not-allowed"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                  </span>
                </div>
              </div>

              {/* بطاقة توثيق Google */}
              <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Google Avatar" className="h-10 w-10 rounded-full border border-emerald-500/30 object-cover shrink-0" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm">
                      G
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-zinc-100">{suggestedName || userEmail}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        موثّق بـ Google ✓
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      تسجيل دخولك دائمًا فوري وآمن بنقرة واحدة بحساب Google — لا تحتاج لكلمة سر.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── الخطوة 2: البيانات الأساسية ── */}
          {step === 1 && (
            <>
              <StepIntro
                icon={<UserIcon className="h-5 w-5" />}
                title="بياناتك الأساسية"
                hint="كلها قوائم جاهزة — بدون كتابة يدوية"
              />
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الاسم الكامل <span className="text-gold">*</span></Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد الله"
                  className="h-12 rounded-xl"
                  autoComplete="name"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-zinc-200">الفرقة <span className="text-gold">*</span></Label>
                  <Select dir="rtl" value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر فرقتك" /></SelectTrigger>
                    <SelectContent>{GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-zinc-200">الشعبة <span className="text-gold">*</span></Label>
                  <Select dir="rtl" value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر شعبتك" /></SelectTrigger>
                    <SelectContent>{SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الجنس <span className="text-gold">*</span></Label>
                <RadioGroup dir="rtl" value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <div
                      key={g.value}
                      onClick={() => setGender(g.value)}
                      className={`flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border text-sm font-bold transition-colors select-none ${
                        gender === g.value
                          ? "border-gold/60 bg-gold/[0.1] text-gold-light shadow-[0_0_15px_-3px_rgba(201,164,92,0.3)]"
                          : "border-white/[0.08] bg-white/[0.02] text-zinc-200 hover:border-gold/30 hover:bg-white/[0.05]"
                      }`}
                    >
                      <RadioGroupItem value={g.value} id={`cg-${g.value}`} />
                      <span>{g.label}</span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">رقم الهاتف <span className="text-gold">*</span></Label>
                <Input
                  dir="ltr"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="h-12 rounded-xl text-start"
                  autoComplete="tel"
                />
                <p className="flex items-center gap-1.5 text-xs text-zinc-600"><Phone className="h-3.5 w-3.5" /> للتواصل بشأن الأنشطة والورش</p>
              </div>

              {/* كود الطالب — يظهر فقط لو مفعّل لفرقته */}
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
                  <p className="text-xs text-zinc-500">{codeConfig?.hint || "أدخل كودك الجامعي للتحقق الأكاديمي"}</p>
                </div>
              )}
            </>
          )}

          {/* ── الخطوة 3: المواهب والرغبات ── */}
          {step === 2 && (
            <>
              <StepIntro
                icon={<Sparkles className="h-5 w-5" />}
                title="مواهبك واهتماماتك ورغباتك"
                hint="اختر كل المجالات التي تتقنها أو تحب المشاركة والتطور فيها — بنقرة واحدة!"
              />
              <TalentSelectorField
                selectedTalents={talents}
                onChange={setTalents}
                maxTalents={MAX_TALENTS}
              />
            </>
          )}

          {/* ── الخطوة 4: بيانات إضافية ── */}
          {step === 3 && (
            <>
              <StepIntro
                icon={<HelpCircle className="h-5 w-5" />}
                title="بيانات تساعدنا"
                hint="اختيارية — لكنها تصنع فرقًا في تطوير تجربتك"
              />
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">إزاي عرفت عن اللجنة؟</Label>
                <Select dir="rtl" value={discoverySource} onValueChange={setDiscoverySource}>
                  <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    {discoveryOptions.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {grade === "FIRST" && (
                  <p className="text-xs text-zinc-600">خيار «أثناء التنسيق» يظهر للفرقة الأولى فقط</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-zinc-200">ليه انضمت للجنة؟ <span className="text-xs font-normal text-zinc-500">(تقدر تختار أكثر من سبب)</span></Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {JOIN_REASONS.map((r) => {
                    const isChecked = joinReasons.includes(r.value);
                    return (
                      <div
                        key={r.value}
                        onClick={() => {
                          setJoinReasons((p) =>
                            isChecked ? p.filter((x) => x !== r.value) : [...p, r.value]
                          );
                        }}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-colors select-none ${
                          isChecked
                            ? "border-gold/60 bg-gold/[0.08] text-gold-light"
                            : "border-white/[0.06] bg-white/[0.02] text-zinc-200 hover:border-gold/25"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(chk) => {
                            setJoinReasons((p) =>
                              chk ? [...p, r.value] : p.filter((x) => x !== r.value)
                            );
                          }}
                        />
                        <span>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
                {joinReasons.includes("OTHER") && (
                  <div className="space-y-2 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                    <Label className="text-sm font-bold text-gold-light"><Heart className="me-1.5 inline h-4 w-4" />اكتب سببك</Label>
                    <Input value={joinReasonOther} onChange={(e) => setJoinReasonOther(e.target.value)} placeholder="سببك في الانضمام..." className="h-11 rounded-xl" />
                  </div>
                )}
              </div>
            </>
          )}

        </motion.div>
      </AnimatePresence>

      {/* أزرار التنقل — ثابتة أسفل الشاشة في الموبايل */}
      <div className="sticky bottom-4 z-20 mt-8 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-night/95 p-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:static sm:z-auto sm:mt-8 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((p) => p - 1)}
            className="h-12 rounded-xl border-white/15 bg-white/[0.03] px-5 text-sm font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            <ChevronRight className="h-5 w-5" />
            السابق
          </Button>
        )}
        {step < 3 ? (
          <Button
            type="button"
            onClick={goNext}
            className="h-12 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
          >
            التالي
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={pending}
            className="h-12 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PartyPopper className="h-5 w-5" />}
            {pending ? "جاري تفعيل حسابك..." : "إكمال التسجيل والدخول إلى المنصة"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIntro({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.08] text-gold">{icon}</span>
      <div>
        <p className="text-base font-extrabold text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}
