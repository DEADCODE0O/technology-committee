"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setNewPassword } from "@/actions/password-reset";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const submit = async (formData: FormData) => {
    setPending(true);
    setError(null);
    try {
      const res = await setNewPassword(
        String(formData.get("password") || ""),
        String(formData.get("confirm") || "")
      );
      if (!res.ok) {
        setError(res.error ?? "تعذر تعيين كلمة السر");
        return;
      }
      toast.success("تم تعيين كلمة السر الجديدة — جاري تحويلك");
      setTimeout(() => router.replace("/login?notice=password_updated"), 900);
    } finally {
      setPending(false);
    }
  };

  return (
    <form action={submit} className="space-y-4">
      <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-center text-xs font-bold text-zinc-400" dir="ltr">
        {email}
      </p>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-bold text-zinc-200">كلمة السر الجديدة</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            className="h-12 rounded-xl pe-12"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label={show ? "إخفاء" : "إظهار"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-sm font-bold text-zinc-200">تأكيد كلمة السر</Label>
        <Input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          className="h-12 rounded-xl"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-center text-sm font-bold text-red-300">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
        {pending ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}
      </Button>
    </form>
  );
}
