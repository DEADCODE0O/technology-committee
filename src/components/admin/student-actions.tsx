"use client";

// أزرار إجراءات الطلاب: تعليق/تنشيط + إضافة نقاط + منح شارة + إعادة تعيين كلمة سر

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Ban, CheckCircle2, Zap, TrendingDown, Medal, KeyRound, Trash2, AlertTriangle, LogIn, Copy, ShieldCheck, MailCheck, Mail } from "lucide-react";
import { toggleStudentStatus, addPointEvent, awardBadge, resetStudentPassword, deleteStudentPermanently, impersonateStudentAction, verifyStudentDirectlyAction, resendStudentOtpAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// تعليق / تنشيط
export function SuspendToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(active ? "تعليق حساب هذا الطالب؟ هيقدر يتصفح لكن مش هيسجل دخول." : "إعادة تنشيط الحساب؟")) return;
        startTransition(async () => {
          const res = await toggleStudentStatus(userId);
          if (res.ok) { toast.success(active ? "تم تعليق الحساب" : "تم تنشيط الحساب"); router.refresh(); }
          else toast.error(res.error || "تعذر التنفيذ");
        });
      }}
      title={active ? "تعليق الحساب" : "تنشيط الحساب"}
      className={`rounded-lg border p-1.5 transition-colors ${
        active
          ? "border-red-500/20 bg-red-500/[0.04] text-red-300/70 hover:bg-red-500/10"
          : "border-gold/30 bg-gold/[0.08] text-gold-light hover:bg-gold/[0.15]"
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
    </button>
  );
}

// إضافة/خصم نقاط — السبب إلزامي، والوضع (منح/خصم) صريح وواضح
export function AddPointsButton({ userId, studentName, pointRules, workshopId }: { userId: string; studentName: string; pointRules: { action: string; label: string; points: number }[]; workshopId?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [rule, setRule] = useState("CUSTOM");
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [points, setPoints] = useState("10");
  const [reason, setReason] = useState("");

  const applyRule = (v: string) => {
    setRule(v);
    if (v !== "CUSTOM") {
      const r = pointRules.find((x) => x.action === v);
      if (r) setPoints(String(r.points));
    }
  };

  const submit = () => {
    const pts = Math.abs(Number(points));
    if (!Number.isInteger(pts) || pts === 0) return toast.error("قيمة نقاط غير صحيحة");
    if (reason.trim().length < 3) return toast.error("السبب إلزامي — يظهر في سجل النقاط");
    const signed = mode === "deduct" ? -pts : pts;
    startTransition(async () => {
      const res = await addPointEvent(userId, signed, reason.trim(), workshopId);
      if (res.ok) {
        toast.success(mode === "deduct" ? `خُصمت ${pts} نقطة` : `أُضيفت ${pts} نقطة`);
        setOpen(false);
        setReason(""); setRule("CUSTOM"); setMode("add");
        router.refresh();
      } else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-9 rounded-lg border-gold/30 bg-gold/[0.06] px-3 text-xs font-extrabold text-gold-light hover:bg-gold/[0.15]"
      >
        <Zap className="h-3.5 w-3.5" />
        نقاط
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-white/10 bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-zinc-50">نقاط — {studentName}</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">كل عملية نقاط تُسجل باسمك في سجل العمليات — التلاعب ممنوع</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* نوع العملية — منح أم خصم */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("add")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors ${
                  mode === "add" ? "border-gold/40 bg-gold/[0.15] text-gold-light" : "border-white/[0.08] text-zinc-500"
                }`}
              >
                <Zap className="h-4 w-4" />
                منح نقاط
              </button>
              <button
                type="button"
                onClick={() => setMode("deduct")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors ${
                  mode === "deduct" ? "border-red-400/40 bg-red-500/[0.12] text-red-300" : "border-white/[0.08] text-zinc-500"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                خصم نقاط
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">القاعدة (تعبئة تلقائية)</Label>
              <Select dir="rtl" value={rule} onValueChange={applyRule}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOM">مخصصة</SelectItem>
                  {pointRules.map((r) => (
                    <SelectItem key={r.action} value={r.action}>{r.label} ({r.points > 0 ? `+${r.points}` : r.points})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">
                عدد النقاط <span className="text-gold">*</span>
                <span className="text-zinc-600"> ({mode === "deduct" ? "سيتم خصمها" : "ستُضاف"})</span>
              </Label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} className="h-11 rounded-xl" dir="ltr" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">السبب <span className="text-gold">*</span></Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: أداء مميز في ورشة الرسم" className="h-11 rounded-xl" />
            </div>

            <Button onClick={submit} disabled={pending} className={`h-12 w-full rounded-xl text-sm font-extrabold ${
              mode === "deduct" ? "bg-red-500/90 text-white" : "bg-gradient-to-b from-gold-light to-gold text-night"
            }`}>
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "deduct" ? <TrendingDown className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              {mode === "deduct" ? `خصم ${points || "—"} نقطة` : `منح ${points || "—"} نقطة`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// منح شارة
export function AwardBadgeButton({ userId, studentName, badges }: { userId: string; studentName: string; badges: { id: string; name: string; icon: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [badgeId, setBadgeId] = useState("");

  const submit = () => {
    if (!badgeId) return toast.error("اختر شارة");
    startTransition(async () => {
      const res = await awardBadge(userId, badgeId);
      if (res.ok) { toast.success("تم منح الشارة 🏅"); setOpen(false); router.refresh(); }
      else toast.error(res.error || "تعذر المنح");
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-9 rounded-lg border-white/15 bg-white/[0.03] px-3 text-xs font-extrabold text-zinc-200 hover:border-gold/30"
      >
        <Medal className="h-3.5 w-3.5" />
        شارة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl border-white/10 bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-zinc-50">منح شارة — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الشارة</Label>
              <Select dir="rtl" value={badgeId} onValueChange={setBadgeId}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="اختر شارة" /></SelectTrigger>
                <SelectContent>
                  {badges.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submit} disabled={pending || !badgeId} className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Medal className="h-5 w-5" />}
              منح الشارة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// الدخول بحساب الطالب (محاكاة المشرف)
export function ImpersonateStudentButton({
  userId,
  studentName,
  variant = "default",
}: {
  userId: string;
  studentName: string;
  variant?: "default" | "icon";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleImpersonate = () => {
    if (!confirm(`الدخول ومعاينة المنصة بحساب الطالب «${studentName}»؟\nستتمكن من رؤية ورش الطالب ومهامه ونقاطه كأنه هو تماماً، ومعك زر للعودة للإدارة في أي لحظة.`)) return;
    startTransition(async () => {
      const res = await impersonateStudentAction(userId);
      if (res.ok && res.redirectTo) {
        toast.success(`تم الدخول بحساب الطالب: ${studentName}`);
        router.push(res.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر الدخول بحساب الطالب");
      }
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleImpersonate}
        disabled={pending}
        title={`الدخول بحساب ${studentName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/[0.08] text-amber-400 hover:bg-amber-500/[0.18] transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleImpersonate}
      disabled={pending}
      variant="outline"
      className="h-9 rounded-lg border-amber-500/30 bg-amber-500/[0.08] px-3 text-xs font-extrabold text-amber-300 hover:bg-amber-500/[0.18] hover:border-amber-500/50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
      الدخول كطالب
    </Button>
  );
}

// تعيين كلمة السر للطالب (تخصيص أو عشوائية مع نسخ مباشر)
export function ResetPasswordButton({
  userId,
  studentName,
  studentEmail,
}: {
  userId: string;
  studentName: string;
  studentEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customPass, setCustomPass] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleGenerate = () => {
    setCustomPass(`TC${Math.random().toString(36).slice(2, 8)}!2026`);
  };

  const handleSubmit = () => {
    if (customPass.trim() && customPass.trim().length < 8) {
      return toast.error("كلمة السر يجب أن تكون 8 أحرف على الأقل");
    }
    startTransition(async () => {
      const res = await resetStudentPassword(userId, customPass.trim() || undefined);
      if (res.ok && res.tempPassword) {
        setResult(res.tempPassword);
        toast.success("تم تعيين كلمة السر وتفعيل الحساب بنجاح ✓");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تعيين كلمة السر");
      }
    });
  };

  const handleCopy = () => {
    const textToCopy = `بيانات الدخول للجنة التكنولوجية:
البريد: ${studentEmail || "—"}
كلمة السر: ${result}
رابط المنصة: https://technology-committee-website.vercel.app/login`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("تم نسخ بيانات الدخول إلى الحافظة!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setResult(null);
          setCustomPass("");
        }}
        variant="outline"
        className="h-9 rounded-lg border-white/15 bg-white/[0.03] px-3 text-xs font-extrabold text-zinc-200 hover:border-gold/30"
      >
        <KeyRound className="h-3.5 w-3.5" />
        كلمة سر
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-white/10 bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-gold-light">
              تعيين كلمة سر للطالب
            </DialogTitle>
            <DialogDescription>
              يمكنك كتابة كلمة سر مخصصة للطالب «{studentName}» أو توليد كلمة عشوائية. سيتم تفعيل حسابه فورًا بالكلمة الجديدة في Supabase.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">
                  كلمة السر الجديدة (اختياري - اتركها فارغة لتوليد كلمة عشوائية)
                </Label>
                <Input
                  type="text"
                  dir="ltr"
                  placeholder="مثال: Ahmed@123456 أو 12345678"
                  value={customPass}
                  onChange={(e) => setCustomPass(e.target.value)}
                  className="h-11 rounded-xl font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  className="h-11 flex-1 rounded-xl border-white/10 text-xs font-bold"
                >
                  توليد كلمة تلقائية
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={pending}
                  className="h-11 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-xs font-extrabold text-night"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  حفظ وتعيين
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-gold/30 bg-gold/[0.08] p-4 text-center">
                <p className="text-xs font-bold text-zinc-400 mb-1">كلمة السر النشطة الآن:</p>
                <p dir="ltr" className="select-all font-mono text-xl font-black text-gold-light">
                  {result}
                </p>
                {studentEmail && (
                  <p dir="ltr" className="mt-2 text-xs text-zinc-400">
                    البريد: {studentEmail}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="h-11 flex-1 rounded-xl bg-gold text-night font-bold text-xs flex items-center justify-center gap-2"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-900" /> : <Copy className="h-4 w-4" />}
                  {copied ? "تم النسخ!" : "نسخ بيانات الدخول للطالب"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="h-11 rounded-xl border-white/10 text-xs font-bold px-4"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// حذف حساب الطالب نهائياً من قاعدة البيانات وسيرفر Supabase
export function DeleteStudentButton({ userId, studentName }: { userId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submitDelete = () => {
    if (confirmName.trim() !== studentName.trim()) {
      return toast.error("يرجى كتابة اسم الطالب للتأكيد");
    }
    startTransition(async () => {
      const res = await deleteStudentPermanently(userId);
      if (res.ok) {
        toast.success("تم حذف حساب الطالب نهائياً من المنصة وسيرفر Supabase ✓");
        setOpen(false);
        router.push("/admin/students");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف الحساب");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setConfirmName("");
          setOpen(true);
        }}
        variant="outline"
        className="h-9 rounded-lg border-red-500/30 bg-red-500/[0.06] px-3 text-xs font-extrabold text-red-400 hover:bg-red-500/15 hover:border-red-500/50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف نهائي
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-red-500/30 bg-surface">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/[0.1] text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-base font-extrabold text-red-400">
              حذف حساب الطالب نهائياً
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-zinc-400">
              هذا الإجراء سيقوم بمسح حساب الطالب <span className="font-bold text-zinc-200">«{studentName}»</span> وجميع بياناته، تسجيلاته، ونقاطه بالكامل من قاعدة البيانات وسيرفر Supabase نهائياً. لن يمكن استرجاع البيانات ولكن سيتمكن الطالب من التسجيل من جديد كحساب جديد بالكامل.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 text-xs text-zinc-300">
              لتأكيد الحذف، اكتب اسم الطالب في الخانة التالية: <span className="font-bold text-red-400 select-all">{studentName}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-300">اسم الطالب للتأكيد</Label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={studentName}
                className="h-11 rounded-xl bg-surface border-white/15"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={submitDelete}
                disabled={pending || confirmName.trim() !== studentName.trim()}
                className="h-11 flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-extrabold text-white shadow-lg shadow-red-900/40"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف الحساب نهائياً
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// تصفير غيابات الطالب ورفع تقييد الحضور (قبول عذر)
export function ResetStudentAbsencesButton({
  userId,
  studentName,
  absencesCount,
  restricted,
}: {
  userId: string;
  studentName: string;
  absencesCount: number;
  restricted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleReset = () => {
    startTransition(async () => {
      const { resetAbsences } = await import("@/actions/attendance");
      const res = await resetAbsences(userId, reason.trim() || undefined);
      if (res.ok) {
        toast.success("تم تصفير غيابات الطالب ورفع التقييد بنجاح ✓");
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تصفير الغيابات");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="outline"
        className={`h-9 rounded-lg px-3 text-xs font-extrabold transition-colors ${
          restricted
            ? "border-amber-500/40 bg-amber-500/[0.1] text-amber-300 hover:bg-amber-500/[0.18]"
            : "border-white/15 bg-white/[0.03] text-zinc-300 hover:border-gold/30"
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {restricted ? "رفع التقييد وقبول عذر" : "تصفير الغيابات"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-white/10 bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-gold-light">
              قبول عذر وتصفير غيابات الطالب
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              الطالب «{studentName}» لديه حالياً <span className="font-bold text-red-300">{absencesCount}</span> غياب غير مبرر
              {restricted && " (حسابه مقيد وينتقل لقائمة الانتظار تلقائياً)"}.
              تصفير الغيابات سيعيد له أولوية التسجيل المباشر ويرسل له إشعاراً بقبول العذر.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">
                سبب قبول العذر (اختياري — يظهر في سجل العمليات والإشعار)
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: عذر طبي معتمد / ظرف سفر / خطأ في التسجيل"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                disabled={pending}
                className="h-11 flex-1 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/30"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                تأكيد رفع التقييد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── تفعيل الحساب يدويًا ومباشرة للطلاب الذين لم يصلهم الـ OTP ────
export function VerifyStudentDirectlyButton({
  userId,
  studentName,
}: {
  userId: string;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleVerify = () => {
    if (!confirm(`هل أنت متأكد من تفعيل وتأكيد حساب الطالب «${studentName}» فوراً وتجاوز التحقق بالبريد؟`)) return;

    startTransition(async () => {
      const res = await verifyStudentDirectlyAction(userId);
      if (res.ok) {
        toast.success(`تم تفعيل حساب الطالب «${studentName}» بنجاح — يمكنه تصفح المنصة والدخول الآن`);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تفعيل الحساب");
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={handleVerify}
      className="h-8 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-extrabold text-emerald-400 hover:bg-emerald-500/20"
      title="تفعيل الحساب فوراً بدون انتظار رسالة البريد"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailCheck className="h-3.5 w-3.5" />}
      <span className="ms-1">تفعيل مباشر</span>
    </Button>
  );
}

// ─── إعادة إرسال رمز الـ OTP للطالب من الإدارة ───────────────
export function ResendStudentOtpButton({
  userId,
  studentName,
}: {
  userId: string;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();

  const handleResend = () => {
    startTransition(async () => {
      const res = await resendStudentOtpAction(userId);
      if (res.ok) {
        toast.success(`تمت إعادة إرسال رمز OTP إلى بريد الطالب «${studentName}»`);
      } else {
        toast.error(res.error || "تعذر إعادة إرسال الرمز");
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={handleResend}
      className="h-8 rounded-lg border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20"
      title="إعادة إرسال رمز الـ OTP إلى بريد الطالب"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      <span className="ms-1">إعادة إرسال</span>
    </Button>
  );
}


