"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteNotification } from "@/actions/notifications";

export function DeleteNotificationButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("حذف الإشعار؟ سيختفي من الطلاب نهائيًا (التراجع متاح من سجل العمليات).")) return;
        startTransition(async () => {
          const res = await deleteNotification(notificationId);
          if (res.ok) { toast.success("تم الحذف"); router.refresh(); }
          else toast.error(res.error || "تعذر الحذف");
        });
      }}
      disabled={pending}
      title="حذف"
      className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-zinc-500 transition-colors hover:text-red-300"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
