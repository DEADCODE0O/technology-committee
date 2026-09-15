"use client";

// ═══════════════════════════════════════════════════════════════
//  إكمال بيانات مستخدم Google — الاسم والفرقة والشعبة والجنس والهاتف
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, UserRound } from "lucide-react";
import { completeGoogleProfile } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES, SECTIONS, GENDERS } from "@/lib/constants";
import { isValidArabicFullName, normalizeArabicName } from "@/lib/validation";

export function CompleteProfileForm({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [values, setValues] = useState({
    fullName: suggestedName,
    grade: "",
    section: "",
    gender: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof values, v: string) => setValues((p) => ({ ...p, [k]: v }));

  if (done) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-4 text-xl font-extrabold text-gold-light">أهلًا بك رسميًا ✦</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-400">
          بياناتك اكتملت — حسابك جاهز بالكامل. جاهز تتصفح الورش وتجمع النقاط؟
        </p>
        <Button
          onClick={() => router.push("/panel")}
          className="mt-5 h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-8 text-sm font-extrabold text-night"
        >
          إلى لوحتي
        </Button>
      </div>
    );
  }

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!isValidArabicFullName(normalizeArabicName(values.fullName))) {
      errs.fullName = "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل";
    }
    if (!values.grade) errs.grade = "اختر الفرقة";
    if (!values.section) errs.section = "اختر الشعبة";
    if (!values.gender) errs.gender = "اختر الجنس";
    if (!/^01[0125][0-9]{8}$/.test(values.phone.replace(/[\s-]/g, ""))) {
      errs.phone = "رقم غير صحيح — مثال: 01012345678";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startTransition(async () => {
      const res = await completeGoogleProfile({
        fullName: values.fullName,
        grade: values.grade,
        section: values.section,
        gender: values.gender,
        phone: values.phone,
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
        toast.success("اكتمل ملفك بنجاح");
      } else {
        toast.error(res.error || "تعذر الحفظ");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-gold">
          <UserRound className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold text-zinc-50">خطوة أخيرة — بياناتك</h1>
        <p className="mt-1.5 text-sm text-zinc-500">حسابك عبر Google جاهز، نحتاج بياناتك الدراسية لإتمام ملفك</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">الاسم الكامل <span className="text-gold">*</span></Label>
          <Input
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="مثال: أحمد محمد عبد الرحمن"
            className="h-12 rounded-xl"
          />
          {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">الفرقة <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={values.grade} onValueChange={(v) => set("grade", v)}>
              <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.grade && <p className="text-xs text-red-400">{errors.grade}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">الشعبة <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={values.section} onValueChange={(v) => set("section", v)}>
              <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.section && <p className="text-xs text-red-400">{errors.section}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">الجنس <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={values.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">رقم الهاتف <span className="text-gold">*</span></Label>
            <Input
              dir="ltr"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="01xxxxxxxxx"
              className="h-12 rounded-xl text-start"
            />
            {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={pending}
          className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          إتمام ملفي
        </Button>
      </div>
    </div>
  );
}
