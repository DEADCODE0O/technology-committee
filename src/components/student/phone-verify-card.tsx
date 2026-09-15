"use client";

import { useState, useEffect } from "react";
import { BadgeCheck, Loader2, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { sendPhoneOtp, verifyPhoneOtp } from "@/actions/phone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════════════════════════
//  بطاقة توثيق الهاتف عبر OTP — تظهر للطالب في اللوحة والملف
//  الحالات: طلب كود → إدخال (مع عدّاد إعادة إرسال) → موثق ✓
// ═══════════════════════════════════════════════════════════════

export function PhoneVerifyCard({
  phone,
  verified,
  compact,
}: {
  phone: string;
  verified: boolean;
  compact?: boolean;
}) {
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [pending, setPending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(verified);

  // عدّاد إعادة الإرسال
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (done) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] ${compact ? "px-4 py-3" : "px-5 py-4"}`}
      >
        <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-emerald-300">رقم هاتفك موثق ✓</p>
          <p className="mt-0.5 truncate text-xs text-emerald-400/70" dir="ltr">{phone}</p>
        </div>
      </div>
    );
  }

  const requestCode = async () => {
    if (pending || countdown > 0) return;
    setPending(true);
    try {
      const res = await sendPhoneOtp();
      if (res.ok) {
        setStage("sent");
        setCode("");
        setAttemptsLeft(null);
        setDevCode(res.devCode ?? null);
        setCountdown(60);
        toast.success("أُرسل كود التوثيق إلى هاتفك");
      } else {
        if (res.retryAfter) setCountdown(res.retryAfter);
        toast.error(res.error || "تعذر إرسال الكود");
      }
    } finally {
      setPending(false);
    }
  };

  const verify = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await verifyPhoneOtp(code);
      if (res.ok) {
        setDone(true);
        toast.success("تم توثيق رقم هاتفك رسميًا ✓");
      } else {
        setAttemptsLeft(res.attemptsLeft ?? null);
        toast.error(res.error || "الكود غير صحيح");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-gold/25 bg-gold/[0.05] ${compact ? "px-4 py-3.5" : "px-5 py-4"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-zinc-100">وثّق رقم هاتفك</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500" dir="ltr">{phone}</p>
        </div>
      </div>

      {stage === "idle" ? (
        <Button
          type="button"
          onClick={requestCode}
          disabled={pending || countdown > 0}
          className="mt-3 h-11 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {pending
            ? "جاري الإرسال..."
            : countdown > 0
              ? `متاح بعد ${countdown} ثانية`
              : "أرسل كود التوثيق"}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              dir="ltr"
              placeholder="––––––"
              className="h-11 rounded-xl text-center text-lg font-bold tracking-[0.4em]"
              aria-label="كود التوثيق"
            />
            <Button
              type="button"
              onClick={verify}
              disabled={verifying || code.length !== 6}
              className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              تحقّق
            </Button>
          </div>

          {devCode && (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-xs font-bold text-zinc-400">
              وضع التطوير (بلا مزوّد SMS): الكود هو{" "}
              <span className="text-gold-light" dir="ltr">{devCode}</span>
            </p>
          )}

          {attemptsLeft !== null && attemptsLeft > 0 && (
            <p className="text-center text-[11px] text-zinc-500">
              متبقٍ {attemptsLeft} محاولات قبل إبطال الكود
            </p>
          )}

          <button
            type="button"
            onClick={requestCode}
            disabled={countdown > 0 || pending}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-zinc-500 transition-colors hover:text-gold-light disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {countdown > 0 ? `إعادة الإرسال بعد ${countdown} ثانية` : "إعادة إرسال الكود"}
          </button>
        </div>
      )}
    </div>
  );
}
