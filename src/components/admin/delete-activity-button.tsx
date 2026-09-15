"use client";

// حذف نشاط بلا تسجيلات (أرشفة آمنة للباقي)

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteActivity } from "@/actions/activities";

export function DeleteActivityButton({ activityId, activityTitle }: { activityId: string; activityTitle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        title="حذف (فقط إن لم يكن عليه تسجيلات)"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-bold text-zinc-400 transition-colors hover:border-red-500/30 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
        حذف
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() =>
          startTransition(async () => {
            const res = await deleteActivity(activityId);
            if (res.ok) {
              toast.success("تم حذف النشاط");
              router.push("/admin/activities");
            } else toast.error(res.error || "تعذر الحذف");
          })
        }
        disabled={pending}
        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 text-xs font-extrabold text-red-300"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        تأكيد حذف «{activityTitle.slice(0, 18)}»
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400">
        إلغاء
      </button>
    </div>
  );
}
