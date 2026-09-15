"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { changeMyPassword } from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ hasPassword = true }: { hasPassword?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (next.length < 8) return toast.error("كلمة السر الجديدة 8 أحرف على الأقل");
    if (next !== confirm) return toast.error("كلمتا السر غير متطابقتين");
    startTransition(async () => {
      const res = await changeMyPassword(current, next);
      if (res.ok) {
        toast.success("تم تغيير كلمة السر بنجاح");
        setCurrent(""); setNext(""); setConfirm("");
      } else toast.error(res.error || "تعذر التغيير");
    });
  };

  return (
    <div className="space-y-4">
      {hasPassword ? (
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">كلمة السر الحالية</Label>
          <Input dir="ltr" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11 rounded-xl" autoComplete="current-password" />
        </div>
      ) : (
        <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-xs font-bold leading-6 text-gold-light">
          حسابك عبر Google — عيّن كلمة سر لتقدر تدخل بالبريد أيضًا
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">الجديدة</Label>
          <Input dir="ltr" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="h-11 rounded-xl" autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">تأكيد الجديدة</Label>
          <Input dir="ltr" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl" autoComplete="new-password" />
        </div>
      </div>
      <Button
        onClick={submit}
        disabled={pending || (hasPassword && !current) || !next}
        className="h-11 w-full rounded-xl border border-gold/40 bg-gold/[0.1] text-sm font-extrabold text-gold-light hover:bg-gold/[0.18] sm:w-auto sm:px-8"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {hasPassword ? "تغيير كلمة السر" : "تعيين كلمة السر"}
      </Button>
    </div>
  );
}
