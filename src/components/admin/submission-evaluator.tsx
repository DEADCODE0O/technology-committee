"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Award, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { evaluateSubmission, returnSubmission } from "@/actions/tasks";

// ═══════════════════════════════════════════════════════════════
//  تقييم تسليم — درجة (0-100) + ملاحظات + منح XP/نقاط
//  التقييم مرة واحدة · نسبة الدرجة تحدد مقدار المكافأة
// ═══════════════════════════════════════════════════════════════

export function SubmissionEvaluator({
  submissionId,
  defaultXp,
}: {
  submissionId: string;
  defaultXp: number;
}) {
  const router = useRouter();
  const [score, setScore] = useState("85");
  const [feedback, setFeedback] = useState("");
  const [award, setAward] = useState(true);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onEvaluate() {
    setMsg(null);
    startTransition(async () => {
      const res = await evaluateSubmission(submissionId, {
        score: Number(score) || 0,
        feedback: feedback || undefined,
        awardXp: award,
      });
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "تعذر التقييم");
    });
  }

  function onReturn() {
    if (!feedback.trim()) {
      setMsg("اكتب سبب الإعادة للتعديل أولًا");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await returnSubmission(submissionId, feedback);
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "تعذر الإرجاع");
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gold/25 bg-gold/[0.04] p-4">
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="space-y-1.5">
          <Label className="text-xs font-extrabold">الدرجة /100</Label>
          <Input type="number" dir="ltr" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className="h-10 rounded-lg text-start" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-extrabold">ملاحظات المشرف</Label>
          <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} placeholder="نقاط القوة وما يحتاج تحسينًا..." className="rounded-lg" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-300">
        <input type="checkbox" checked={award} onChange={(e) => setAward(e.target.checked)} className="accent-gold" />
        منح المكافأة حسب الدرجة ({Math.round((Number(score) || 0) / 100 * defaultXp)} XP من {defaultXp})
      </label>
      {msg && <p className="text-xs font-bold text-red-300">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEvaluate} disabled={pending} className="h-10 rounded-lg bg-gold px-5 text-xs font-extrabold text-night hover:bg-gold-light">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />} تقييم نهائي
        </Button>
        <Button onClick={onReturn} disabled={pending} variant="outline" className="h-10 rounded-lg px-5 text-xs font-bold">
          <RotateCcw className="h-3.5 w-3.5" /> إعادة للتعديل
        </Button>
      </div>
    </div>
  );
}

export function EvaluatedBadge({ score, xp, late }: { score: number; xp: number; late: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-extrabold text-emerald-300">
        <Star className="h-3.5 w-3.5" /> {score}/100
      </span>
      {xp > 0 && (
        <span className="rounded-lg bg-gold/[0.1] px-2.5 py-1.5 text-xs font-extrabold text-gold">+{xp} XP</span>
      )}
      {late && <span className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">متأخر</span>}
    </div>
  );
}
