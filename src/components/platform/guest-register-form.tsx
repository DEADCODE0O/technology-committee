"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج تسجيل الضيف — بدون حساب، بيانات أساسية + أسئلة النشاط
//  يظهر للزوار فقط عند تفعيل «السماح للضيوف» في النشاط
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper, UserRound } from "lucide-react";
import { guestRegisterToSession } from "@/actions/registrations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES, GENDERS, SECTIONS } from "@/lib/constants";
import type { DynField } from "@/components/platform/session-register-form";

export function GuestRegisterForm({
  sessionId,
  sessionTitle,
  fields,
  isFull,
  seatsLeft,
}: {
  sessionId: string;
  sessionTitle: string;
  fields: DynField[];
  isFull: boolean;
  seatsLeft: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<"registered" | "waitlisted" | null>(null);
  const [values, setValues] = useState({ fullName: "", phone: "", email: "", grade: "", section: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [fileBusy, setFileBusy] = useState<string | null>(null);

  const set = (k: keyof typeof values, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const setAnswer = (id: string, val: string | string[]) => setAnswers((p) => ({ ...p, [id]: val }));

  if (result === "registered" || result === "waitlisted") {
    return (
      <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-gold" />
        <p className="mt-3 text-lg font-extrabold text-gold-light">
          {result === "waitlisted" ? "تم إضافتك لقائمة الانتظار!" : "تم حجز مقعدك كضيف!"}
        </p>
        <p className="mt-2 text-sm leading-7 text-zinc-400">
          {result === "waitlisted"
            ? "هيتم الترقية تلقائيًا لو اتفسح مقعد."
            : `بنتشوفك في «${sessionTitle}» — اعرض هذا الرقم عند الدخول.`}
        </p>
      </div>
    );
  }


  const uploadAnswerFile = async (fieldId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("الملف يجب أن يكون حتى 8MB"); return; }
    setFileBusy(fieldId);
    try {
      const fd = new FormData(); fd.append("sessionId", sessionId); fd.append("fieldId", fieldId); fd.append("file", file);
      const res = await fetch("/api/sessions/upload-answer", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "تعذر رفع الملف");
      setAnswer(fieldId, json.url); toast.success("تم رفع الملف");
    } catch (err) { toast.error(err instanceof Error ? err.message : "تعذر رفع الملف"); }
    finally { setFileBusy(null); }
  };

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/u.test(values.fullName.trim().replace(/\s+/g, " ")) || values.fullName.trim().replace(/\s+/g, " ").split(/\s+/).filter((w) => w.length >= 2).length < 3) {
      errs.fullName = "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل";
    }
    if (!/^01[0125][0-9]{8}$/.test(values.phone.replace(/[\s-]/g, ""))) {
      errs.phone = "مثال: 01012345678";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errs.email = "بريد غير صحيح";
    }
    if (!values.grade) errs.grade = "الفرقة مطلوبة — اختر فرقتك";
    if (!values.section) errs.section = "الشعبة مطلوبة — اختر شعبتك";
    if (!values.gender) errs.gender = "الجنس مطلوب — اختره";
    // أسئلة إلزامية
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) {
          toast.error(`السؤال «${f.label}» إلزامي`);
          return;
        }
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startTransition(async () => {
      const res = await guestRegisterToSession({
        sessionId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        grade: values.grade || undefined,
        section: values.section || undefined,
        gender: values.gender || undefined,
        answers,
      });
      if (res.ok) {
        setResult(res.waitlisted ? "waitlisted" : "registered");
        router.refresh();
        toast.success(res.waitlisted ? "أُضفت لقائمة الانتظار" : "تم حجز مقعدك!");
      } else {
        toast.error(res.error || "تعذر التسجيل");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/15 text-gold">
          <UserRound className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-base font-extrabold text-foreground">التسجيل كضيف</h3>
          <p className="text-[11px] text-muted-foreground">بدون حساب — بياناتك تظهر للإدارة في قائمة المشاركين</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-sm font-bold text-foreground">الاسم الكامل <span className="text-gold">*</span></Label>
          <Input value={values.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="مثال: محمود عادل حسن" className="h-11 rounded-xl" />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-foreground">رقم الهاتف <span className="text-gold">*</span></Label>
            <Input dir="ltr" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01xxxxxxxxx" className="h-11 rounded-xl text-start" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-foreground">البريد <span className="text-xs text-muted-foreground">(اختياري)</span></Label>
            <Input dir="ltr" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="example@mail.com" className="h-11 rounded-xl text-start" />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-foreground">الفرقة <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={values.grade} onValueChange={(v) => set("grade", v)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-foreground">الجنس <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={values.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-bold text-foreground">الشعبة <span className="text-gold">*</span></Label>
          <Select dir="rtl" value={values.section} onValueChange={(v) => set("section", v)}>
            <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="اختر شعبتك..." /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.section && <p className="text-xs text-red-500">{errors.section}</p>}
          {errors.grade && <p className="text-xs text-red-500">{errors.grade}</p>}
          {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
        </div>

        {/* أسئلة النشاط الديناميكية */}
        {fields.length > 0 && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-bold text-gold-deep dark:text-gold-light">أسئلة خاصة بالنشاط:</p>
            {fields.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label className="text-sm font-bold text-foreground">
                  {f.label} {f.required && <span className="text-gold">*</span>}
                </Label>
                {(f.type === "TEXT" || f.type === "NUMBER") && (
                  <Input value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} type={f.type === "NUMBER" ? "number" : "text"} />
                )}
                {f.type === "LONGTEXT" && (
                  <textarea
                    rows={3}
                    value={(answers[f.id] as string) ?? ""}
                    onChange={(e) => setAnswer(f.id, e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                )}
                {(f.type === "PHONE" || f.type === "EMAIL") && (
                  <Input dir="ltr" type={f.type === "PHONE" ? "tel" : "email"} value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} className="text-start" />
                )}
                {(f.type === "DATE" || f.type === "TIME") && (
                  <Input dir="ltr" type={f.type === "DATE" ? "date" : "time"} value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} className="text-start" />
                )}
                {f.type === "FILE" && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground">اختر ملفًا (PDF/صورة حتى 8MB):</p>
                      <Input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        disabled={fileBusy === f.id}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAnswerFile(f.id, file); }}
                        className="h-10 rounded-lg file:me-2.5 file:rounded file:border-0 file:bg-gold/[0.12] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-gold-light"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      <span className="text-[11px] text-muted-foreground font-bold shrink-0">أو رابط درايف:</span>
                      <Input
                        dir="ltr"
                        placeholder="https://drive.google.com/..."
                        value={typeof answers[f.id] === "string" && (answers[f.id] as string).startsWith("http") ? (answers[f.id] as string) : ""}
                        onChange={(e) => setAnswer(f.id, e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    {fileBusy === f.id && <p className="text-[11px] text-gold">جاري رفع الملف...</p>}
                    {typeof answers[f.id] === "string" && answers[f.id] && (
                      <a href={answers[f.id] as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                        ✓ تم تسجيل الملف/الرابط (اضغط للمعاينة)
                      </a>
                    )}
                  </div>
                )}
                {(f.type === "SELECT" || f.type === "RADIO") && f.options.length > 0 && (
                  <Select value={(answers[f.id] as string) ?? ""} onValueChange={(v) => setAnswer(f.id, v)}>
                    <SelectTrigger dir="rtl" className="w-full"><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={pending}
          className="h-12 w-full rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 border border-emerald-500/50 text-base font-extrabold text-white shadow-[0_8px_25px_-8px_rgba(5,150,105,0.55)] hover:shadow-[0_12px_35px_-8px_rgba(5,150,105,0.7)] hover:from-emerald-300 hover:to-emerald-500 transition-all"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {pending ? "جاري التسجيل..." : isFull ? "انضم لقائمة الانتظار" : `احجز مقعدك كضيف${seatsLeft > 0 ? ` (${seatsLeft} متبقٍ)` : ""}`}
        </Button>
        <p className="text-center text-[11px] leading-5 text-muted-foreground">
          الضيوف يظهرون في قائمة المشاركين والحضور — النقاط والشارات خاصة بالأعضاء
        </p>
      </div>
    </div>
  );
}
