"use client";

// إعدادات كود الطالب — مفاتيح لكل فرقة + النص التوضيحي
// (صيغة الكود ثابتة: 10 أرقام = سنة الدفعة + شهر التقديم + رقم الطالب)

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveStudentCodeSettings } from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function StudentCodeSettings({
  requiredGrades, pattern, hint, grades,
}: {
  requiredGrades: string[];
  pattern: string;
  hint: string;
  grades: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(requiredGrades);
  const [hintText, setHintText] = useState(hint);
  const [pending, startTransition] = useTransition();

  const toggle = (grade: string) => {
    setSelected((p) => (p.includes(grade) ? p.filter((g) => g !== grade) : [...p, grade]));
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveStudentCodeSettings(selected, "^[0-9]{10}$", hintText);
      if (res.ok) {
        toast.success(
          selected.length === 0
            ? "تم الحفظ — كود الطالب معطل لكل الفرق"
            : `تم الحفظ — الكود مطلوب لـ: ${selected.length} فرق`
        );
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  return (
    <div className="space-y-6">
      {/* مفاتيح الفرق */}
      <div className="space-y-2.5">
        <Label className="text-sm font-bold text-zinc-200">مطلوب لأي فرقة؟</Label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {grades.map((g) => (
            <label
              key={g.value}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${
                selected.includes(g.value)
                  ? "border-gold/40 bg-gold/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${selected.includes(g.value) ? "text-gold-light" : "text-zinc-300"}`}>{g.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  {selected.includes(g.value) ? "الكود مطلوب عند التسجيل" : "لا يُطلب الكود"}
                </p>
              </div>
              <Switch checked={selected.includes(g.value)} onCheckedChange={() => toggle(g.value)} />
            </label>
          ))}
        </div>
      </div>

      {/* صيغة الكود الثابتة + النص التوضيحي */}
      <div className="rounded-2xl border border-gold/15 bg-gold/[0.03] p-4">
        <p className="text-xs font-extrabold text-gold-light">صيغة الكود (ثابتة)</p>
        <p className="mt-1.5 text-sm leading-7 text-zinc-300" dir="ltr">2023 10 8888</p>
        <p className="mt-1 text-[11px] leading-6 text-zinc-500">سنة الدفعة (4 أرقام — تتحدد تلقائيًا حسب فرقة الطالب) + شهر التقديم (2 أرقام) + رقم الطالب الجامعي (4 أرقام). كل طالب له كوده الخاص — لا يوجد كود موحد.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-zinc-300">نص توضيحي للطالب</Label>
        <Input value={hintText} onChange={(e) => setHintText(e.target.value)} className="h-11 rounded-xl" />
      </div>

      <Button
        onClick={save}
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        حفظ الإعدادات
      </Button>
    </div>
  );
}
