"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج التحقق من كود الـ OTP المكون من 6 أرقام
//  • دعم الإدخال السلس عبر 6 خانات مع التركيز التلقائي
//  • دعم اللصق المباشر (Paste) لكامل الكود بنقرة واحدة
//  • مؤقت تنازلي (60 ثانية) لإعادة إرسال الرمز
//  • تجربة استخدام متوافقة بالكامل مع الهواتف الذكية (Numeric Keypad)
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, CheckCircle2, RotateCw, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { verifySignupOtp, resendSignupOtp } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface OtpVerifyFormProps {
  email: string;
  returnTo?: string;
  notice?: string;
}

export function OtpVerifyForm({ email, returnTo, notice }: OtpVerifyFormProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // عداد تنازلي لإعادة الإرسال
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // تركيز الخانة الأولى تلقائيًا عند التحميل
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleVerify = (codeToVerify?: string) => {
    const code = (codeToVerify || digits.join("")).replace(/\D/g, "");
    if (code.length !== 6) {
      setErrorMessage("أدخل الرمز كاملاً المكون من 6 أرقام");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await verifySignupOtp({
        email,
        code,
        returnTo,
      });

      if (res.ok) {
        toast.success("تم تأكيد بريدك الإلكتروني بنجاح! 🎉");
        const target = res.redirectTo || (returnTo && returnTo.startsWith("/") ? returnTo : "/panel");
        router.push(target);
        router.refresh();
      } else {
        setErrorMessage(res.error || "رمز التحقق غير صحيح — يرجى التأكد وإعادة المحاولة");
        // مسح الخانات وإعادة التركيز على الأولى
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    });
  };

  const handleChange = (index: number, value: string) => {
    // استخلاص الأرقام فقط
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // إذا كان الحرف مدخلاً فرديًا
    const char = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage(null);

    // الانتقال للخانة التالية
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }

    // إذا اكتملت الخانات الـ 6، تنفيذ التحقق فورًا
    if (index === 5 && char) {
      const fullCode = newDigits.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index < 5) {
      // بما أن الاتجاه LTR فاليسار هو التالي
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowRight" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);
    setErrorMessage(null);

    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    } else {
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendSignupOtp({ email });
      if (res.ok) {
        toast.success("تم إرسال رمز تفعيل جديد إلى بريدك بنجاح 📩");
        setSecondsLeft(60);
      } else {
        toast.error(res.error || "تعذر إعادة إرسال الرمز حاليًا");
      }
    } catch {
      toast.error("حدث خطأ أثناء إعادة إرسال الرمز");
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="space-y-6">
      {/* إشعار إن كان مطلوبًا تفعيل الحساب */}
      {notice === "need_verification" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold leading-5 text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>حسابك مسجل بالفعل ولكن يتطلب تأكيد البريد الإلكتروني. أدخل رمز التحقق لتفعيله.</span>
        </div>
      )}

      {/* البريد المرسل إليه الرمز */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          <Mail className="h-4 w-4 text-gold" />
          <span className="font-mono text-zinc-200" dir="ltr">
            {email}
          </span>
        </div>
        <Link
          href="/register"
          className="text-xs font-bold text-gold-light transition-colors hover:text-gold hover:underline"
        >
          تغيير البريد
        </Link>
      </div>

      {/* خانات الـ OTP الـ 6 */}
      <div className="space-y-3">
        <div
          className="flex items-center justify-center gap-2 sm:gap-3"
          dir="ltr"
          onPaste={handlePaste}
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              autoComplete={idx === 0 ? "one-time-code" : "off"}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`h-12 w-11 sm:h-14 sm:w-13 text-center text-xl sm:text-2xl font-black rounded-xl border bg-black/40 text-zinc-100 transition-all outline-none ${
                digit
                  ? "border-gold bg-gold/10 text-gold shadow-[0_0_15px_rgba(201,164,92,0.25)]"
                  : "border-white/15 hover:border-white/30 focus:border-gold focus:ring-2 focus:ring-gold/30"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-[11px] text-zinc-500">
          يمكنك لصق كود التحقق المكون من 6 أرقام مباشرة في أي خانة.
        </p>
      </div>

      {/* رسالة الخطأ */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-xs font-bold text-red-300">
          {errorMessage}
        </div>
      )}

      {/* زر التأكيد */}
      <Button
        type="button"
        onClick={() => handleVerify()}
        disabled={!isComplete || isPending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night transition-all hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)] disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري التحقق من الرمز...
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" />
            تأكيد الرمز وإكمال التسجيل
          </>
        )}
      </Button>

      {/* إعادة الإرسال */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2 text-center text-xs text-zinc-400">
        {secondsLeft > 0 ? (
          <p className="text-zinc-500">
            يمكنك طلب رمز جديد بعد{" "}
            <span className="font-mono font-bold text-gold">{secondsLeft}</span> ثانية
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center gap-1.5 font-bold text-gold-light transition-colors hover:text-gold disabled:opacity-50"
          >
            {isResending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            لم يصلك الرمز؟ أعد إرسال كود التحقق
          </button>
        )}

        <p className="text-[11px] text-zinc-600">
          يرجى مراجعة مجلد الرسائل غير المرغوب فيها (Spam / Junk) إذا لم تجده في صندوق الوارد.
        </p>
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          العودة لصفحة تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
