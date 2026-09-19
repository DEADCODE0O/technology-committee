"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
        console.error("Admin login error:", err);
        setError("حدث خطأ أثناء تسجيل الدخول — حاول مرة أخرى");
      }
    });
  };

  const isSubmitting = pending || isRedirecting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="a-email" className="text-sm font-bold text-zinc-200">بريد الإدارة</Label>
        <Input id="a-email" name="email" type="email" dir="ltr" required placeholder="admin@example.com" className="h-12 rounded-xl text-start" autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="a-password" className="text-sm font-bold text-zinc-200">كلمة السر</Label>
        <Input id="a-password" name="password" type="password" required placeholder="••••••••" className="h-12 rounded-xl" autoComplete="current-password" />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-sm font-bold text-red-300">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl border border-gold/40 bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.5)]"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
        {isRedirecting ? "تم التحقق! جاري التوجيه..." : isSubmitting ? "جاري التحقق..." : "دخول لوحة الإدارة"}
      </Button>
    </form>
  );
}
