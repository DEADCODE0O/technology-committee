"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";
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
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {
    error: initialError,
  });

  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state?.redirectTo]);

  const isSubmitting = pending || Boolean(state?.redirectTo);

  return (
    <form action={formAction} className="space-y-4">

      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3">
        <GoogleButton returnTo={returnTo} enabled={googleEnabled} label="تسجيل الدخول بحساب Google" />
        <p className="mt-2 text-center text-[11px] leading-5 text-zinc-500">
          تسجيل دخول سريع وآمن بنقرة واحدة دون الحاجة لكتابة كلمة السر
        </p>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs font-bold text-zinc-500">
          أو تسجيل الدخول بالبريد الإلكتروني
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-bold text-zinc-200">
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
          className="h-12 rounded-xl text-start"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-bold text-zinc-200">
            كلمة السر
          </Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-bold text-gold/80 transition-colors hover:text-gold"
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
            className="h-12 rounded-xl text-left ps-4 pr-11"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
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

      {state?.error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-sm font-bold text-red-600 dark:text-red-300">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
        {state?.redirectTo
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
