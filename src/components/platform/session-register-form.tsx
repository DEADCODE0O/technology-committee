"use client";

// ═══════════════════════════════════════════════════════════════
//  فورم التسجيل الذكي في الجلسة — بيانات العضو جاهزة + أسئلة النشاط مرة واحدة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hourglass, Loader2, PartyPopper, XCircle } from "lucide-react";
import { registerToSession, cancelRegistration } from "@/actions/registrations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SessionFeedbackDialog } from "@/components/platform/session-feedback-dialog";

export type DynField = {
  id: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
};

type ProfilePreview = {
  fullName: string;
  phone: string;
  grade: string;
  section: string;
  studentCode: string | null;
};

type ExistingReg = { id: string; status: string } | null;

export function SessionRegisterForm({
  sessionId,
  sessionTitle,
  fields,
  profile,
  existing,
  isFull,
  waitlistPos,
  seatsLeft,
}: {
  sessionId: string;
  sessionTitle: string;
  fields: DynField[];
  profile: ProfilePreview;
  existing: ExistingReg;
  isFull: boolean;
  waitlistPos: number | null;
  seatsLeft: number;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [fileBusy, setFileBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<"registered" | "waitlisted" | null>(null);
  const router = useRouter();

  // حالة "مسجل بالفعل"
  if (existing) {
    return (
      <div className="rounded-2xl border border-gold/25 bg-surface p-5">
        {existing.status === "WAITLISTED" ? (
          <div className="flex items-start gap-3">
            <Hourglass className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <div>
              <p className="font-bold text-gold-light">أنت في قائمة الانتظار</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                ترتيبك: <span className="font-bold text-zinc-200">رقم {waitlistPos}</span> — لو اتفسح مقعد هيتم ترقيتك
                تلقائيًا وهنبلغك هنا.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500 dark:text-gold" />
            <div className="flex-1">
              <p className="font-bold text-emerald-700 dark:text-gold-light">مقعدك محجوز ✦</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                بانتظارك يوم الورشة — سجّل حضورك بمسح كود الـ QR عند الدخول.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SessionFeedbackDialog
                  sessionId={sessionId}
                  sessionTitle={sessionTitle}
                  triggerButtonText="تقييم الورشة والملاحظات السرية"
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!confirm("متأكد إنك عايز تلغي التسجيل؟")) return;
                    startTransition(async () => {
                      const res = await cancelRegistration(existing.id);
                      if (res.ok) {
                        toast.success("تم إلغاء التسجيل");
                        router.refresh();
                      } else toast.error(res.error || "تعذر الإلغاء");
                    });
                  }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    className="text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <XCircle className="h-4 w-4" />
                    إلغاء تسجيلي
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (result === "registered" || result === "waitlisted") {
    return (
      <div className="rounded-2xl border border-emerald-300/80 dark:border-gold/30 bg-emerald-50 dark:bg-gold/[0.06] p-6 text-center shadow-[0_8px_24px_-12px_rgba(5,120,85,0.25)] dark:shadow-none">
        <PartyPopper className="mx-auto h-10 w-10 text-emerald-600 dark:text-gold" />
        <p className="mt-3 text-lg font-extrabold text-emerald-700 dark:text-gold-light">
          {result === "waitlisted" ? "تم إضافتك لقائمة الانتظار!" : "تم حجز مقعدك بنجاح!"}
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {result === "waitlisted"
            ? "هيتم ترقيتك تلقائيًا لو اتفسح مقعد."
            : `بنتشوفك في «${sessionTitle}» — مسح كود QR عند الدخول يسجل حضورك.`}
        </p>
      </div>
    );
  }

  const setAnswer = (id: string, val: string | string[]) => setAnswers((p) => ({ ...p, [id]: val }));


  const uploadAnswerFile = async (fieldId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("الملف يجب أن يكون حتى 8MB"); return; }
    setFileBusy(fieldId);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("fieldId", fieldId);
      fd.append("file", file);
      const res = await fetch("/api/sessions/upload-answer", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; name?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "تعذر رفع الملف");
      setAnswer(fieldId, json.url);
      toast.success("تم رفع الملف");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الملف");
    } finally { setFileBusy(null); }
  };

  const submit = () => {
    // تحقق إلزامي سريع
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
    startTransition(async () => {
      const res = await registerToSession(sessionId, answers);
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
      <h3 className="text-lg font-extrabold text-foreground">التسجيل في هذه الجلسة</h3>

      {/* بياناتك — تُجلب تلقائيًا */}
      <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
        <p className="mb-3 text-xs font-bold text-gold-deep dark:text-gold-light">بياناتك — جاهزة تلقائيًا من حسابك:</p>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <InfoRow label="الاسم" value={profile.fullName} />
          <InfoRow label="الهاتف" value={profile.phone} />
          <InfoRow label="الفرقة والشعبة" value={`${profile.grade} — ${profile.section}`} />
          {profile.studentCode && <InfoRow label="كود الطالب" value={profile.studentCode} />}
        </div>
      </div>

      {/* أسئلة الورشة الديناميكية */}
      {fields.length > 0 && (
        <div className="mt-5 space-y-5">
          <p className="text-xs font-bold text-gold-deep dark:text-gold-light">أسئلة خاصة بالتسجيل:</p>
          {fields.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label className="text-sm font-bold text-foreground">
                {f.label} {f.required && <span className="text-gold">*</span>}
              </Label>

              {f.type === "TEXT" && <Input value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />}
              {f.type === "LONGTEXT" && (
                <Textarea rows={3} value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
              )}
              {f.type === "NUMBER" && (
                <Input type="number" value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
              )}
              {f.type === "PHONE" && (
                <Input dir="ltr" type="tel" placeholder="01xxxxxxxxx" value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
              )}
              {f.type === "EMAIL" && (
                <Input dir="ltr" type="email" value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
              )}
              {f.type === "DATE" && (
                <Input type="date" value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
              )}
              {f.type === "TIME" && (
                <Input type="time" value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)} />
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
                  <SelectTrigger dir="rtl" className="w-full">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {f.type === "CHECKBOX" && f.options.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {f.options.map((o) => (
                    <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground transition-colors hover:border-gold/40">
                      <Checkbox
                        checked={((answers[f.id] as string[]) ?? []).includes(o)}
                        onCheckedChange={(chk) => {
                          const arr = ((answers[f.id] as string[]) ?? []).slice();
                          if (chk) arr.push(o);
                          else arr.splice(arr.indexOf(o), 1);
                          setAnswer(f.id, arr);
                        }}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={submit}
        disabled={pending}
        className="mt-6 w-full h-12 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-base font-extrabold text-white shadow-[0_8px_25px_-8px_rgba(5,150,105,0.55)] hover:shadow-[0_12px_35px_-8px_rgba(5,150,105,0.7)] hover:from-emerald-300 hover:to-emerald-500 transition-all"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : isFull ? "انضم لقائمة الانتظار" : `احجز مقعدك${seatsLeft > 0 ? ` (${seatsLeft} متبقٍ)` : ""}`}
      </Button>
      {isFull && <p className="mt-2 text-center text-xs text-zinc-500">المقاعد ممتلئة — أول إلغاء يرقّي أول المنتظرين تلقائيًا</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
