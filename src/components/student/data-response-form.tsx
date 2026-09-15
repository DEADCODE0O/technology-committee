"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج استجابة الطالب على طلب بيانات من اللجنة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitDataResponse } from "@/actions/staff";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type RespField = {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
};

export function DataResponseForm({
  requestId,
  fields,
  initialAnswers,
  disabled,
}: {
  requestId: string;
  fields: RespField[];
  initialAnswers: Record<string, string | string[]>;
  disabled: boolean; // مغلق أو انتهى الموعد
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers);
  const [done, setDone] = useState(false);

  const setAns = (id: string, val: string | string[]) => setAnswers((p) => ({ ...p, [id]: val }));
  const toggleMulti = (id: string, option: string) => {
    const arr = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    setAns(id, arr.includes(option) ? arr.filter((o) => o !== option) : [...arr, option]);
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
        <p className="mt-3 text-lg font-extrabold text-gold-light">تم إرسال بياناتك</p>
        <p className="mt-1.5 text-sm text-zinc-400">شكرًا لك — بياناتك وصلت لإدارة اللجنة</p>
      </div>
    );
  }

  const submit = () => {
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) return toast.error(`السؤال «${f.label}» إلزامي`);
      }
    }
    startTransition(async () => {
      const res = await submitDataResponse(requestId, answers);
      if (res.ok) {
        setDone(true);
        router.refresh();
        toast.success("تم إرسال بياناتك بنجاح");
      } else toast.error(res.error || "تعذر الإرسال");
    });
  };

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.id} className="space-y-1.5">
          <Label className="text-sm font-bold text-zinc-200">
            {f.label} {f.required && <span className="text-gold">*</span>}
          </Label>

          {(f.type === "TEXT" || f.type === "NUMBER") && (
            <Input
              dir={f.type === "NUMBER" ? "ltr" : undefined}
              type={f.type === "NUMBER" ? "number" : "text"}
              value={(answers[f.id] as string) ?? ""}
              onChange={(e) => setAns(f.id, e.target.value)}
              disabled={disabled}
              className="h-11 rounded-xl"
            />
          )}
          {f.type === "LONGTEXT" && (
            <textarea
              rows={3}
              value={(answers[f.id] as string) ?? ""}
              onChange={(e) => setAns(f.id, e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          )}
          {(f.type === "PHONE" || f.type === "EMAIL") && (
            <Input dir="ltr" type={f.type === "PHONE" ? "tel" : "email"} value={(answers[f.id] as string) ?? ""} onChange={(e) => setAns(f.id, e.target.value)} disabled={disabled} className="h-11 rounded-xl text-start" />
          )}
          {(f.type === "DATE" || f.type === "TIME") && (
            <Input dir="ltr" type={f.type === "DATE" ? "date" : "time"} value={(answers[f.id] as string) ?? ""} onChange={(e) => setAns(f.id, e.target.value)} disabled={disabled} className="h-11 rounded-xl text-start" />
          )}
          {(f.type === "SELECT" || f.type === "RADIO") && (f.options ?? []).length > 0 && (
            <Select dir="rtl" value={(answers[f.id] as string) ?? ""} onValueChange={(v) => setAns(f.id, v)} disabled={disabled}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {f.type === "CHECKBOX" && (f.options ?? []).length > 0 && (
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 sm:grid-cols-2">
              {(f.options ?? []).map((o) => {
                const checked = Array.isArray(answers[f.id]) && (answers[f.id] as string[]).includes(o);
                return (
                  <label key={o} className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                    <Checkbox checked={checked} onCheckedChange={() => toggleMulti(f.id, o)} disabled={disabled} />
                    {o}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {!disabled && (
        <Button onClick={submit} disabled={pending} className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          إرسال البيانات
        </Button>
      )}
    </div>
  );
}
