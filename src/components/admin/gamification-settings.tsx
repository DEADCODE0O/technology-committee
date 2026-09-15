"use client";

// ═══════════════════════════════════════════════════════════════
//  إعدادات الأوسمة والقلوب — التحكم في ظهورها وإخفائها على مستوى المنصة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Heart } from "lucide-react";
import { setAvatarFramesVisibleAction, setCharmHeartsVisibleAction } from "@/actions/admin";
import { Switch } from "@/components/ui/switch";

interface GamificationSettingsProps {
  initialAvatarFramesVisible: boolean;
  initialCharmHeartsVisible: boolean;
}

export function GamificationSettings({
  initialAvatarFramesVisible,
  initialCharmHeartsVisible,
}: GamificationSettingsProps) {
  const router = useRouter();
  const [framesOn, setFramesOn] = useState(initialAvatarFramesVisible);
  const [heartsOn, setHeartsOn] = useState(initialCharmHeartsVisible);
  const [framesPending, startFramesTransition] = useTransition();
  const [heartsPending, startHeartsTransition] = useTransition();

  const handleFramesToggle = (next: boolean) => {
    setFramesOn(next);
    startFramesTransition(async () => {
      const res = await setAvatarFramesVisibleAction(next);
      if (res.ok) {
        toast.success(next ? "إطارات الصور الرمزية ظاهرة الآن على كامل المنصة ✓" : "تم إخفاء إطارات الصور الرمزية عن المنصة");
        router.refresh();
      } else {
        setFramesOn(!next);
        toast.error(res.error || "تعذر تطبيق التعديل");
      }
    });
  };

  const handleHeartsToggle = (next: boolean) => {
    setHeartsOn(next);
    startHeartsTransition(async () => {
      const res = await setCharmHeartsVisibleAction(next);
      if (res.ok) {
        toast.success(next ? "قلوب ومستويات التفاعل ظاهرة الآن على المنصة ✓" : "قلوب ومستويات التفاعل مخفية الآن عن المنصة");
        router.refresh();
      } else {
        setHeartsOn(!next);
        toast.error(res.error || "تعذر تطبيق التعديل");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── 1. مفتاح إطارات الصور الرمزية ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.04] p-4.5 transition-colors hover:border-gold/35">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.1] text-gold shadow-[0_0_15px_rgba(201,164,92,0.15)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold text-zinc-100">إطارات الصور الرمزية (Avatar Frames)</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  framesOn
                    ? "border border-gold/30 bg-gold/10 text-gold-light"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400"
                }`}
              >
                {framesOn ? "ظاهرة" : "مخفية"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              التحكم في ظهور الإطارات الزخرفية الملكية ثلاثية الأبعاد حول صور الطلاب في البروفايل، المتصدرين، والمجتمع. عند إخفائها تظهر الصور نقية دائرية.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {framesPending && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
          <Switch checked={framesOn} onCheckedChange={handleFramesToggle} disabled={framesPending} />
        </div>
      </div>

      {/* ── 2. مفتاح قلوب التفاعل والمستويات ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.04] p-4.5 transition-colors hover:border-gold/35">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.1] text-gold shadow-[0_0_15px_rgba(201,164,92,0.15)]">
            <Heart className="h-5 w-5 fill-gold/20" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold text-zinc-100">قلوب التفاعل ومستويات الـ Charm (Charm Hearts)</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  heartsOn
                    ? "border border-gold/30 bg-gold/10 text-gold-light"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400"
                }`}
              >
                {heartsOn ? "ظاهرة" : "مخفية"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              التحكم في ظهور القلوب المجنحة ثلاثية الأبعاد بجانب أسماء الطلاب في البروفايل وعند كتابة وقراءة التعليقات المجتمعية.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {heartsPending && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
          <Switch checked={heartsOn} onCheckedChange={handleHeartsToggle} disabled={heartsPending} />
        </div>
      </div>
    </div>
  );
}
