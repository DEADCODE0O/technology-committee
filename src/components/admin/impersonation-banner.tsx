"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut, Loader2 } from "lucide-react";
import { stopImpersonationAction } from "@/actions/admin";

export function ImpersonationBanner({
  studentName,
  studentEmail,
}: {
  studentName: string;
  studentEmail: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleStop = () => {
    startTransition(async () => {
      const res = await stopImpersonationAction();
      if (res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-zinc-950 shadow-md backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-950/15">
          <Eye className="h-4 w-4 text-zinc-950" />
        </div>
        <span>
          وضع معاينة الإدارة: أنت تتصفح المنصة حاليًا بحساب الطالب{" "}
          <span className="underline decoration-zinc-950/40 underline-offset-2">{studentName}</span>{" "}
          <span className="opacity-80" dir="ltr">({studentEmail})</span>
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-amber-300 transition-all hover:bg-zinc-900 active:scale-95 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        إنهاء المعاينة والعودة للوحة الإدارة
      </button>
    </div>
  );
}
