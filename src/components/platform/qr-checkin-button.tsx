"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { qrCheckIn } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { SessionFeedbackDialog } from "@/components/platform/session-feedback-dialog";

export function QrCheckinButton({ token, title }: { token: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ sessionId?: string; sessionTitle?: string } | null>(null);
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const res = await qrCheckIn(token);
      if (res.ok) {
        setSuccess(true);
        setSessionInfo({ sessionId: res.sessionId, sessionTitle: res.sessionTitle || title });
        toast.success(res.sessionTitle ? `تم تسجيل حضورك في «${res.sessionTitle}»` : `تم تسجيل حضورك في «${title}»`);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تسجيل الحضور");
      }
    });
  };

  if (success) {
    return (
      <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/[0.08] p-6 text-center space-y-4">
        <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
        <div>
          <p className="text-lg font-extrabold text-gold-light">تم تسجيل حضورك ✦</p>
          <p className="mt-1 text-sm text-zinc-400">استمتع بالنشاط — تم توثيق حضورك وإضافة نقاطك تلقائياً.</p>
        </div>

        {sessionInfo?.sessionId && (
          <div className="pt-2 border-t border-gold/20 flex justify-center">
            <SessionFeedbackDialog
              sessionId={sessionInfo.sessionId}
              sessionTitle={sessionInfo.sessionTitle || title}
              triggerButtonText="شاركنا رأيك السري في المحاضرة والمحاضر"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Button
        onClick={submit}
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanLine className="h-6 w-6" />}
        {pending ? "جاري التسجيل..." : "سجّل حضورك الآن"}
      </Button>
      <p className="mt-3 text-center text-xs text-zinc-600">بضغطة واحدة — الحضور والنقاط بيتسجلوا فورًا</p>
    </div>
  );
}
