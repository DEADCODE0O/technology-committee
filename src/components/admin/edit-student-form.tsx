"use client";

// ═══════════════════════════════════════════════════════════════
//  تعديل كامل بيانات الطالب — الملف + البريد + كلمة السر
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, PencilLine, Save, KeyRound, X } from "lucide-react";
import { updateStudentFull } from "@/actions/staff";
import { GRADES, SECTIONS, GENDERS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function EditStudentButton({
  userId,
  initial: init,
}: {
  userId: string;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    grade: string;
    section: string;
    gender: string;
    studentCode: string;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg bg-gradient-to-b from-gold-light to-gold px-4 text-xs font-extrabold text-night"
      >
        <PencilLine className="h-3.5 w-3.5" />
        تعديل البيانات
      </Button>
      {open && (
        <EditStudentDialog
          userId={userId}
          initial={init}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditStudentDialog({
  userId,
  initial: init,
  onClose,
}: {
  userId: string;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    grade: string;
    section: string;
    gender: string;
    studentCode: string;
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [v, setV] = useState({
    fullName: init.fullName,
    email: init.email,
    phone: init.phone,
    grade: init.grade,
    section: init.section,
    gender: init.gender,
    studentCode: init.studentCode,
  });
  const [newPassword, setNewPassword] = useState("");

  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const save = () => {
    startTransition(async () => {
      const res = await updateStudentFull(userId, {
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        grade: v.grade,
        section: v.section,
        gender: v.gender,
        studentCode: v.studentCode || undefined,
        newPassword: newPassword || undefined,
      });
      if (res.ok) {
        toast.success(newPassword ? "تم حفظ البيانات وكلمة السر الجديدة" : "تم حفظ البيانات");
        setOpen(false);
        onClose();
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setOpen(false); onClose(); } }}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-md overflow-y-auto rounded-3xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold text-zinc-50">تعديل بيانات الطالب</DialogTitle>
          <DialogDescription className="text-xs leading-6 text-zinc-500">
            تعديل كامل — البيانات الشخصية والبريد وكلمة السر (كل التعديلات تُسجل في سجل العمليات)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الاسم الكامل <span className="text-gold">*</span></Label>
            <Input value={v.fullName} onChange={(e) => set("fullName", e.target.value)} className="h-11 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">البريد الإلكتروني <span className="text-gold">*</span></Label>
              <Input dir="ltr" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className="h-11 rounded-xl text-start" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">رقم الهاتف <span className="text-gold">*</span></Label>
              <Input dir="ltr" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 rounded-xl text-start" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الفرقة <span className="text-gold">*</span></Label>
              <Select dir="rtl" value={v.grade} onValueChange={(val) => set("grade", val)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الشعبة <span className="text-gold">*</span></Label>
              <Select dir="rtl" value={v.section} onValueChange={(val) => set("section", val)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الجنس <span className="text-gold">*</span></Label>
              <Select dir="rtl" value={v.gender} onValueChange={(val) => set("gender", val)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">كود الطالب <span className="text-xs text-zinc-500">(اختياري)</span></Label>
            <Input dir="ltr" value={v.studentCode} onChange={(e) => set("studentCode", e.target.value)} placeholder="مثال: 2023105689" className="h-11 rounded-xl text-start" />
          </div>

          {/* كلمة سر جديدة */}
          <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-3.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold text-gold-light">
              <KeyRound className="h-3.5 w-3.5" />
              كلمة سر جديدة <span className="text-xs font-normal text-zinc-500">(اتركها فارغة للإبقاء على الحالية)</span>
            </Label>
            <Input
              dir="ltr"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              className="mt-2 h-11 rounded-xl text-start"
              autoComplete="off"
            />
            {newPassword && newPassword.length < 8 && (
              <p className="mt-1 text-[11px] text-red-400">كلمة السر: 8 أحرف على الأقل</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={pending} className="h-11 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التعديلات
          </Button>
          <Button onClick={() => { setOpen(false); onClose(); }} variant="outline" className="h-11 rounded-xl border-white/10 text-sm font-bold text-zinc-300">
            <X className="h-4 w-4" />
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
