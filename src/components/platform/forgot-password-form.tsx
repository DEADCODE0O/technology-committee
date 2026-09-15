"use client";

import { useState } from "react";
import { Loader2, MailQuestion } from "lucide-react";
import { requestPasswordReset, type ResetRequestResult } from "@/actions/password-reset";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ResetRequestResult | null>(null);

  const submit = async (formData: FormData) => {
    setPending(true);
    try {
      const res = await requestPasswordReset(String(formData.get("email") || ""));
      setResult(res);
    } finally {
      setPending(false);
    }
  };

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-bold text-zinc-200">البريد الإلكتروني المسجل</Label>
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

      {result?.error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-sm font-bold text-red-300">
          {result.error}
        </p>
      )}

      {result?.ok && result.message && (
        <p
          className={`rounded-xl px-4 py-3 text-center text-sm font-bold leading-6 ${
            result.devNotice
              ? "border border-gold/25 bg-gold/[0.06] text-gold-light"
              : "border border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300"
          }`}
        >
          {result.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MailQuestion className="h-5 w-5" />}
        {pending ? "جاري الإرسال..." : "أرسل رابط الاستعادة"}
      </Button>
    </form>
  );
}
