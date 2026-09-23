"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { GoogleButton } from "@/components/platform/google-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LoginForm({
  returnTo,
  initialError,
  notice,
  googleEnabled,
}: {
  returnTo?: string;
  initialError?: string;
  notice?: string;
  googleEnabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(initialError);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await loginAction({}, formData);
        if (res?.error) {
          setError(res.error);
        } else if (res?.redirectTo) {
          setIsRedirecting(true);
          window.location.href = res.redirectTo;
        }
      } catch (err: any) {
        console.error("Login submission error:", err);
        setError("حدث خطأ أثناء تسجيل الدخول — تأكد من بياناتك وحاول مرة أخرى");
      }
    });
  };

  const isSubmitting = pending || isRedirecting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <div className="space-y-2.5 rounded-2xl border border-gold/30 bg-gold/[0.06] p-3 shadow-xs">
        <GoogleButton returnTo={returnTo} enabled={googleEnabled} label="تسجيل الدخول بحساب Google" />
        <p className="mt-1 text-center text-[11px] leading-5 text-muted-foreground font-semibold">
          تسجيل دخول فوري وآمن بنقرة واحدة بحساب Google بدون الحاجة لكلمة سر
        </p>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-extrabold text-muted-foreground">
          أو تسجيل الدخول بالبريد الإلكتروني
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-extrabold text-foreground">
          البريد الإلكتروني
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          placeholder="student@example.com"
          className="h-12 rounded-xl text-start border-border bg-card text-foreground"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-extrabold text-foreground">
            كلمة السر
          </Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-bold text-gold-deep dark:text-gold-light transition-colors hover:text-gold"
          >
            نسيت كلمة السر؟
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-12 rounded-xl text-left ps-4 pr-11 border-border bg-card text-foreground"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {notice && (
        <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-center text-sm font-bold leading-6 text-gold-deep dark:text-gold-light">
          {notice}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-sm font-bold text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
        {isRedirecting
          ? "تم بنجاح! جاري التوجيه..."
          : isSubmitting
          ? "جاري تسجيل الدخول..."
          : "تسجيل الدخول"}
      </Button>

      <p className="text-center text-xs leading-6 text-zinc-600">
        مش قادر تدخل؟ استخدم <Link href="/auth/forgot-password" className="text-gold/80 hover:text-gold">استعادة كلمة السر</Link> أو تواصل مع <Link href="/#contact" className="text-gold/80 hover:text-gold">إدارة اللجنة</Link>
      </p>
    </form>
  );
}
