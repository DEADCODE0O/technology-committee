"use client";

// أزرار حالة الموهبة: توثيق / رفض / تمييز

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, BadgeCheck, XCircle, Sparkles } from "lucide-react";
import { setTalentStatus, toggleTalentFeatured } from "@/actions/admin";

export function SetTalentStatusButtons({ talentId, status, featured }: { talentId: string; status: string; featured: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { toast.success(msg); router.refresh(); }
      else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />}

      {status !== "VERIFIED" && (
        <button
          onClick={() => run(() => setTalentStatus(talentId, "VERIFIED"), "تم توثيق الموهبة ✓")}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-gold/30 bg-gold/[0.08] px-2.5 text-[11px] font-extrabold text-gold-light hover:bg-gold/[0.18]"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          توثيق
        </button>
      )}

      {status !== "REJECTED" && (
        <button
          onClick={() => {
            if (!confirm("رفض هذه الموهبة؟")) return;
            run(() => setTalentStatus(talentId, "REJECTED"), "تم رفض الموهبة");
          }}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-2.5 text-[11px] font-extrabold text-red-300/70 hover:bg-red-500/10"
        >
          <XCircle className="h-3.5 w-3.5" />
          رفض
        </button>
      )}

      <button
        onClick={() => run(() => toggleTalentFeatured(talentId), featured ? "أُلغي التمييز" : "موهبة مميزة الآن ✦")}
        className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold transition-colors ${
          featured
            ? "border border-gold/50 bg-gold/[0.15] text-gold-light"
            : "border border-white/15 bg-white/[0.03] text-zinc-300 hover:border-gold/40 hover:text-gold-light"
        }`}
        title="الظهور في قسم المواهب المميزة بالموقع العام"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {featured ? "مميزة" : "تمييز"}
      </button>
    </div>
  );
}
