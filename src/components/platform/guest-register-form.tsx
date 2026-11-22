"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج تسجيل الضيف / التسجيل المستقل — بيانات أساسية + استمارة النشاط الديناميكية
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper, UserRound, Layers, CheckCircle2 } from "lucide-react";
import { guestRegisterToSession } from "@/actions/registrations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  externalToken,
  whatsappUrl,
  telegramUrl,
}: {
  sessionId: string;
  sessionTitle: string;
  fields: DynField[];
  isFull: boolean;
  seatsLeft: number;
  externalToken?: string;
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
}) {
  const isStandalone = Boolean(externalToken);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<"registered" | "waitlisted" | null>(null);
  const [values, setValues] = useState({ fullName: "", phone: "", email: "", grade: "", section: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [fileBusy, setFileBusy] = useState<string | null>(null);

  const set = (k: keyof typeof values, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const setAnswer = (id: string, val: string | string[]) => setAnswers((p) => ({ ...p, [id]: val }));

  const groupedFields = useMemo(() => {
    const groups: { section: string; fields: DynField[] }[] = [];
    const sectionMap = new Map<string, DynField[]>();
    fields.forEach((f) => {
      const secName = (f.section || "").trim() || "الأسئلة العامة";
      if (!sectionMap.has(secName)) {
        sectionMap.set(secName, []);
      }
      sectionMap.get(secName)!.push(f);
    });
    sectionMap.forEach((fList, secName) => {
      groups.push({ section: secName, fields: fList });
    });
    return groups;
  }, [fields]);

  if (result === "registered" || result === "waitlisted") {
    return (
      <div className="rounded-3xl border border-gold/25 bg-card p-6 text-center shadow-sm space-y-4">
        {result === "waitlisted" ? (
          <PartyPopper className="mx-auto h-10 w-10 text-gold" />
        ) : (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        )}
        <div>
          <p className="text-lg font-black text-emerald-600 dark:text-gold-light">
            {result === "waitlisted"
              ? "أنت الآن في قائمة الانتظار"
              : isStandalone
              ? "مقعدك محجوز بنجاح ✦"
              : "تم حجز مقعدك كضيف!"}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {result === "waitlisted"
              ? "سيتم ترقيتك تلقائيًا فور توفر مقعد شاغر."
              : `بانتظارك في «${sessionTitle}» — احتفظ برقم هاتفك لتأكيد الحضور عند الوصول.`}
          </p>
        </div>
        {result === "registered" && (whatsappUrl || telegramUrl) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-border">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#20bd5a]"
              >
                انضم لجروب واتساب الخاص بالورشة
              </a>
            )}
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#229ED9] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#1e8ec3]"
              >
                انضم لقناة تليجرام
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  const uploadAnswerFile = async (fieldId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("الملف يجب أن يكون حتى 8MB"); return; }
    setFileBusy(fieldId);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("fieldId", fieldId);
      if (externalToken) fd.append("externalToken", externalToken);
      fd.append("file", file);
      const res = await fetch("/api/sessions/upload-answer", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "تعذر رفع الملف");
      setAnswer(fieldId, json.url); toast.success("تم رفع الملف بنجاح");
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
        externalToken,
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
        toast.success(res.waitlisted ? "أُضفت لقائمة الانتظار بنجاح" : "تم حجز مقعدك بنجاح!");
      } else {
        toast.error(res.error || "تعذر التسجيل");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        {!isStandalone && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/15 text-gold">
            <UserRound className="h-4.5 w-4.5" />
          </span>
        )}
        <div>
          <h3 className={isStandalone ? "text-lg font-black text-foreground" : "text-base font-extrabold text-foreground"}>
            {isStandalone ? "التسجيل في هذه الجلسة" : "التسجيل كضيف"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isStandalone
              ? "أكمل بياناتك واختياراتك لتأكيد حجز مقعدك"
              : "بدون حساب — بياناتك تظهر للإدارة في قائمة المشاركين"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className={isStandalone ? "rounded-2xl border border-border bg-muted/30 p-4 space-y-3.5" : "space-y-3.5"}>
          {isStandalone && (
            <p className="text-xs font-bold text-gold-deep dark:text-gold-light">
              بياناتك الشخصية:
            </p>
          )}
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
        </div>

        {/* أقسام الأسئلة الديناميكية — بنفس تصميم صفحة المسجلين */}
        {fields.length > 0 && (
          <div className="space-y-5">
            {groupedFields.map((group, gIdx) => (
              <div
                key={group.section}
                className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold text-xs font-black">
                    {gIdx + 1}
                  </span>
                  <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-gold" />
                    {group.section}
                  </h4>
                </div>

                <div className="space-y-4">
                  {group.fields.map((f) => {
                    const currentVal = answers[f.id];
                    const currentArr = Array.isArray(currentVal) ? currentVal : [];
                    return (
                      <div key={f.id} className="space-y-2 rounded-xl bg-background/50 p-3 border border-border/40">
                        <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                          <span>
                            {f.label} {f.required && <span className="text-gold">*</span>}
                          </span>
                          {f.type === "CHECKBOX" && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (يمكنك اختيار أكثر من خيار)
                            </span>
                          )}
                        </Label>

                        {(f.type === "TEXT" || f.type === "NUMBER") && (
                          <Input
                            value={(currentVal as string) ?? ""}
                            onChange={(e) => setAnswer(f.id, e.target.value)}
                            type={f.type === "NUMBER" ? "number" : "text"}
                            placeholder="اكتب إجابتك هنا..."
                            className="h-10 text-xs"
                          />
                        )}
                        {f.type === "LONGTEXT" && (
                          <Textarea
                            rows={3}
                            value={(currentVal as string) ?? ""}
                            onChange={(e) => setAnswer(f.id, e.target.value)}
                            placeholder="اكتب تفاصيلك هنا..."
                            className="text-xs"
                          />
                        )}
                        {(f.type === "PHONE" || f.type === "EMAIL") && (
                          <Input
                            dir="ltr"
                            type={f.type === "PHONE" ? "tel" : "email"}
                            value={(currentVal as string) ?? ""}
                            onChange={(e) => setAnswer(f.id, e.target.value)}
                            className="h-10 text-start text-xs"
                          />
                        )}
                        {(f.type === "DATE" || f.type === "TIME") && (
                          <Input
                            dir="ltr"
                            type={f.type === "DATE" ? "date" : "time"}
                            value={(currentVal as string) ?? ""}
                            onChange={(e) => setAnswer(f.id, e.target.value)}
                            className="h-10 text-start text-xs"
                          />
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
                                value={typeof currentVal === "string" && currentVal.startsWith("http") ? currentVal : ""}
                                onChange={(e) => setAnswer(f.id, e.target.value)}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            {fileBusy === f.id && <p className="text-[11px] text-gold animate-pulse">جاري رفع الملف...</p>}
                            {typeof currentVal === "string" && currentVal && (
                              <a href={currentVal} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                ✓ تم تسجيل الملف/الرابط (اضغط للمعاينة)
                              </a>
                            )}
                          </div>
                        )}
                        {(f.type === "SELECT" || f.type === "RADIO") && f.options.length > 0 && (
                          <div className="space-y-2">
                            <Select value={(currentVal as string) ?? ""} onValueChange={(v) => setAnswer(f.id, v)}>
                              <SelectTrigger dir="rtl" className="w-full text-xs h-10"><SelectValue placeholder="اختر من القائمة..." /></SelectTrigger>
                              <SelectContent>
                                {f.options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {f.allowCustom && (
                              <div className="pt-1.5 flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground shrink-0">أو حدد بنفسك:</span>
                                <Input
                                  placeholder="اكتب خياراً آخر ترغب به..."
                                  value={typeof currentVal === "string" && !f.options.includes(currentVal) ? currentVal : ""}
                                  onChange={(e) => setAnswer(f.id, e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {f.type === "CHECKBOX" && f.options.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {f.options.map((o) => {
                                const isChecked = currentArr.includes(o);
                                return (
                                  <label
                                    key={o}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                                      isChecked
                                        ? "border-gold/50 bg-gold/10 text-gold-light shadow-sm"
                                        : "border-border bg-muted/20 text-muted-foreground hover:border-border/80"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(chk) => {
                                        const arr = currentArr.slice();
                                        if (chk) {
                                          if (!arr.includes(o)) arr.push(o);
                                        } else {
                                          const idx = arr.indexOf(o);
                                          if (idx > -1) arr.splice(idx, 1);
                                        }
                                        setAnswer(f.id, arr);
                                      }}
                                    />
                                    <span>{o}</span>
                                  </label>
                                );
                              })}
                            </div>

                            {f.allowCustom && (
                              <div className="mt-2 rounded-xl border border-dashed border-border p-2.5 bg-muted/10">
                                <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                                  ✏️ ترغب بإضافة خيار آخر غير مذكور أعلاه؟
                                </span>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="اكتب إضافتك..."
                                    value={customInputs[f.id] || ""}
                                    onChange={(e) => setCustomInputs((p) => ({ ...p, [f.id]: e.target.value }))}
                                    className="h-8 text-xs"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const val = (customInputs[f.id] || "").trim();
                                      if (!val) return;
                                      const arr = currentArr.slice();
                                      if (!arr.includes(val)) {
                                        arr.push(val);
                                        setAnswer(f.id, arr);
                                        setCustomInputs((p) => ({ ...p, [f.id]: "" }));
                                        toast.success(`تمت إضافة «${val}» لاختياراتك`);
                                      }
                                    }}
                                    className="h-8 text-xs font-bold shrink-0"
                                  >
                                    إضافة
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
          {pending
            ? "جاري التسجيل..."
            : isFull
            ? "انضم لقائمة الانتظار"
            : isStandalone
            ? `تأكيد التسجيل وحجز المقعد${seatsLeft > 0 ? ` (${seatsLeft} متبقٍ)` : ""}`
            : `احجز مقعدك كضيف${seatsLeft > 0 ? ` (${seatsLeft} متبقٍ)` : ""}`}
        </Button>
        {!isStandalone && (
          <p className="text-center text-[11px] leading-5 text-muted-foreground">
            الضيوف يظهرون في قائمة المشاركين والحضور — النقاط والشارات خاصة بالأعضاء
          </p>
        )}
      </div>
    </div>
  );
}
