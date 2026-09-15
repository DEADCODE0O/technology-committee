"use client";

// محرر قواعد النقاط — تعديل القيمة + تفعيل/تعطيل

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Save, Power } from "lucide-react";
import { upsertPointRule, togglePointRule } from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Rule = { action: string; label: string; points: number; active: boolean };

export function PointRuleEditor({ rules, canManage }: { rules: Rule[]; canManage: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rules.map((r) => [r.action, String(r.points)]))
  );
  const [busy, setBusy] = useState<string | null>(null);

  const save = (r: Rule) => {
    const pts = Number(values[r.action]);
    if (!Number.isInteger(pts) || pts < 0) return toast.error("قيمة غير صحيحة");
    setBusy(r.action);
    upsertPointRule(r.action, r.label, pts)
      .then((res) => {
        if (res.ok) { toast.success(`تم حفظ «${r.label}» = ${pts} نقطة`); router.refresh(); }
        else toast.error(res.error || "تعذر الحفظ");
      })
      .finally(() => setBusy(null));
  };

  const toggle = (r: Rule) => {
    setBusy(r.action);
    togglePointRule(r.action)
      .then((res) => {
        if (res.ok) { toast.success(r.active ? "تم التعطيل" : "تم التفعيل"); router.refresh(); }
        else toast.error(res.error || "تعذر التنفيذ");
      })
      .finally(() => setBusy(null));
  };

  return (
    <ul className="space-y-2.5">
      {rules.map((r) => (
        <li
          key={r.action}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            r.active ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.06] bg-white/[0.01] opacity-60"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-200">{r.label}</p>
            <p className="text-[10px] text-zinc-600" dir="ltr">{r.action}</p>
          </div>

          {canManage ? (
            <>
              <Input
                dir="ltr"
                type="number"
                value={values[r.action] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [r.action]: e.target.value }))}
                className="h-10 w-20 rounded-lg text-center"
                disabled={busy === r.action}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy === r.action}
                onClick={() => save(r)}
                className="h-10 rounded-lg border-gold/30 bg-gold/[0.08] px-3 text-xs font-extrabold text-gold-light"
              >
                {busy === r.action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </Button>
              <button
                onClick={() => toggle(r)}
                disabled={busy === r.action}
                title={r.active ? "تعطيل القاعدة" : "تفعيل القاعدة"}
                className={`rounded-lg border p-2 transition-colors ${
                  r.active
                    ? "border-gold/30 bg-gold/[0.1] text-gold-light"
                    : "border-white/10 bg-white/[0.03] text-zinc-500"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="text-sm font-extrabold text-gold-light">{r.points}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
