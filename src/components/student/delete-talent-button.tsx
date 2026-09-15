"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteStudentTalentAction } from "@/actions/profile";

export function DeleteTalentButton({ talentId }: { talentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الموهبة؟")) return;

    startTransition(async () => {
      const res = await deleteStudentTalentAction(talentId);
      if (res.ok) {
        toast.success("تم حذف الموهبة من ملفك");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف الموهبة");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title="حذف الموهبة"
      aria-label="حذف الموهبة"
      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
