"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج تسليم كود الطالب — يظهر في بوابة البيانات المطلوبة
//  عندما تكون الأكواد مفعّلة لفرقة الطالب ولم يسجلها بعد
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, IdCard, CheckCircle2 } from "lucide-react";
import { saveMyStudentCode } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudentCodeGateForm({ hint, pattern }: { hint: string; pattern: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    const v = code.trim();
    if (v.length < 4) return toast.error("اكتب الكود كما هو مدون على الكارنيه");
    startTransition(async () => {
      const res = await saveMyStudentCode(v);
      if (res.ok) {
        setDone(true);
        toast.success("تم تسجيل كود الطالب");
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
        <p className="text-sm font-bold text-emerald-200">تم تسليم كود الطالب — شكرًا لك</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08] text-gold">
          <IdCard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-zinc-100">كود الطالب</p>
          <p className="mt-1 text-xs leading-6 text-zinc-500">{hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="2023108888"
          maxLength={10}
          inputMode="numeric"
          autoComplete="off"
          className="h-12 rounded-xl text-start tracking-widest sm:flex-1"
          aria-label="كود الطالب"
        />
        <Button
          onClick={submit}
          disabled={pending}
          className="h-12 rounded-xl bg-gradient-to-b from-gold-light to-gold px-6 text-sm font-extrabold text-night sm:w-auto"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          تسليم الكود
        </Button>
      </div>
    </div>
  );
}
