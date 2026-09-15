"use client";

// ═══════════════════════════════════════════════════════════════
//  Form Builder — باني أسئلة التسجيل الديناميكية لكل ورشة
//  11 نوعًا من الأسئلة بدون لمس أي كود
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Loader2, Save, ChevronUp, ChevronDown } from "lucide-react";
import { saveFormFields, type FormFieldInput } from "@/actions/activities";
import { FORM_FIELD_TYPES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NEED_OPTIONS = ["SELECT", "RADIO", "CHECKBOX"];

export function FormBuilder({ activityId, initial }: { activityId: string; initial: FormFieldInput[] }) {
  const [fields, setFields] = useState<FormFieldInput[]>(initial);
  const [pending, startTransition] = useTransition();

  const addField = () => {
    setFields((p) => [
      ...p,
      { label: "", type: "TEXT", options: [], required: false, order: p.length },
    ]);
  };

  const update = (i: number, patch: Partial<FormFieldInput>) => {
    setFields((p) => p.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  const remove = (i: number) => {
    setFields((p) => p.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx })));
  };

  const move = (i: number, dir: -1 | 1) => {
    setFields((p) => {
      const next = [...p];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((f, idx) => ({ ...f, order: idx }));
    });
  };

  const save = () => {
    const cleaned = fields
      .filter((f) => (f.label || "").trim().length > 0)
      .map((f, i) => ({ ...f, order: i }));
    if (fields.some((f) => (f.label || "").trim().length === 0)) {
      return toast.error("فيه سؤال بنص فاضي — امسحه أو اكتب نصه");
    }
    startTransition(async () => {
      const res = await saveFormFields(activityId, cleaned);
      if (res.ok) {
        toast.success(`تم حفظ الأسئلة (${cleaned.length})`);
        setFields(cleaned);
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/[0.05] px-5 py-4">
        <div>
          <p className="text-sm font-extrabold text-gold-light">أسئلة التسجيل الخاصة بالورشة</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">بيظهر للطالب بعد بياناته الجاهزة — إجاباته تتخزن مع تسجيله وتظهر في الـ Excel</p>
        </div>
        <Button onClick={addField} variant="outline" className="h-10 rounded-xl border-gold/40 bg-gold/[0.08] text-xs font-extrabold text-gold-light hover:bg-gold/[0.15]">
          <Plus className="h-4 w-4" />
          سؤال جديد
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center text-sm text-zinc-500">
          مفيش أسئلة إضافية — الطالب يسجل ببياناته الأساسية فقط
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((f, i) => (
            <li key={i} className="rounded-2xl border border-white/[0.06] bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-zinc-600">
                  <GripVertical className="h-4 w-4" />
                  <button onClick={() => move(i, -1)} aria-label="تحريك لأعلى" className="rounded p-0.5 hover:text-gold"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(i, 1)} aria-label="تحريك لأسفل" className="rounded p-0.5 hover:text-gold"><ChevronDown className="h-3.5 w-3.5" /></button>
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/[0.1] text-xs font-extrabold text-gold-light">{i + 1}</span>
                <span className="text-xs font-bold text-zinc-500">السؤال</span>
                <div className="ms-auto flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-400">
                    إلزامي
                    <Switch checked={f.required} onCheckedChange={(v) => update(i, { required: v })} />
                  </label>
                  <button onClick={() => remove(i)} aria-label="حذف السؤال" className="rounded-lg p-1.5 text-red-300/60 transition-colors hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-400">نص السؤال</Label>
                  <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="مثال: هل لديك خبرة سابقة؟" className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-400">النوع</Label>
                  <Select dir="rtl" value={f.type} onValueChange={(v) => update(i, { type: v })}>
                    <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORM_FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {NEED_OPTIONS.includes(f.type) && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-400">الخيارات <span className="text-zinc-600">(سطر لكل خيار)</span></Label>
                  <textarea
                    value={(f.options ?? []).join("\n")}
                    onChange={(e) => update(i, { options: e.target.value.split("\n") })}
                    rows={Math.max(2, (f.options ?? []).length)}
                    placeholder={"نعم\nلا"}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold/40 focus:outline-none"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={save}
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.5)]"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        حفظ الأسئلة
      </Button>
    </div>
  );
}
