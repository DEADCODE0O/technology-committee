"use client";

// ═══════════════════════════════════════════════════════════════
//  إعدادات قسم المواهب — إظهار/إخفاء القسم للطلاب بمفتاح واحد
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Palette } from "lucide-react";
import { setTalentsSectionVisibleAction } from "@/actions/admin";
import { Switch } from "@/components/ui/switch";

export function TalentsSectionSettings({ visible }: { visible: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(visible);
  const [pending, startTransition] = useTransition();

  const flip = (next: boolean) => {
    setOn(next);
    startTransition(async () => {
      const res = await setTalentsSectionVisibleAction(next);
      if (res.ok) {
        toast.success(next ? "قسم المواهب ظاهر الآن للطلاب ✓" : "قسم المواهب مخفي الآن عن الطلاب");
        router.refresh();
      } else {
        setOn(!next);
        toast.error(res.error || "تعذر التطبيق");
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.05] px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.08] text-gold">
          {on ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-extrabold text-zinc-100">
            <Palette className="h-4 w-4 text-gold/70" />
            قسم المواهب
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${on ? "border border-gold/30 bg-gold/10 text-gold-light" : "border border-white/10 bg-white/[0.03] text-zinc-400"}`}>
              {on ? "ظاهر" : "مخفي"}
            </span>
          </p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            عند الإخفاء: تختفي صفحة المواهب ومكوّنها من لوحة الطالب والموقع العام — إدارة المواهب نفسها تبقى متاحة لك في لوحة التحكم
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
        <Switch checked={on} onCheckedChange={flip} disabled={pending} />
      </div>
    </div>
  );
}
