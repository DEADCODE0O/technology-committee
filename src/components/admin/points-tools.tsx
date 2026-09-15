"use client";

// ═══════════════════════════════════════════════════════════════
//  أدوات النقاط — منح/خصم جماعي لمجموعة + حذف حدث
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Users, Trash2, Zap, TrendingDown, Undo2 } from "lucide-react";
import { bulkAwardPoints, deletePointEvent } from "@/actions/staff";
import { reversePointEvent } from "@/actions/admin";
import { GRADES, SECTIONS, GENDERS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─── منح جماعي لمجموعة مستهدفة ────────────────────────────────

export function BulkPointsForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // نوع العملية: منح أم خصم
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [points, setPoints] = useState("10");
  const [reason, setReason] = useState("");

  // الاستهداف
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<"ANY" | "ATTENDED" | "NOT_ATTENDED">("ANY");
  const [talent, setTalent] = useState<"ANY" | "HAS" | "VERIFIED" | "NONE">("ANY");
  const [minPoints, setMinPoints] = useState("");

  const toggleIn = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const submit = () => {
    const pts = Number(points);
    if (!Number.isInteger(pts) || pts <= 0) return toast.error("أدخل عدد نقاط صحيحًا");
    if (reason.trim().length < 3) return toast.error("اكتب سببًا واضحًا (يُسجل في سجل العمليات)");

    startTransition(async () => {
      const res = await bulkAwardPoints(
        {
          grades,
          sections,
          genders,
          attendance,
          talent,
          minPoints: minPoints ? Math.max(1, Number(minPoints) || 0) : null,
          userIds: [],
          sessionId: null,
      runId: null,
      activityId: null,
      programId: null,
      teamId: null,
      scope: "REGISTERED",

        },
        mode === "deduct" ? -pts : pts,
        reason.trim()
      );
      if (res.ok) {
        toast.success(`تم ${mode === "deduct" ? "خصم" : "منح"} ${pts} نقطة ${res.count ? `من ${res.count} طالب` : ""}`);
        setOpen(false);
        router.refresh();
      } else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night"
      >
        <Users className="h-4 w-4" />
        نقاط جماعية لمجموعة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-md overflow-y-auto rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-zinc-50">نقاط جماعية لمجموعة</DialogTitle>
            <DialogDescription className="text-xs leading-6 text-zinc-500">
              منح أو خصم نقاط لكل الطلاب المطابقين للفلاتر دفعة واحدة — بعملية واحدة موثقة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* نوع العملية */}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">عدد النقاط <span className="text-gold">*</span></Label>
                <Input dir="ltr" type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} className="h-11 rounded-xl text-start" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">المتفوقون (نقاط ≥)</Label>
                <Input dir="ltr" type="number" min={1} value={minPoints} onChange={(e) => setMinPoints(e.target.value)} placeholder="اختياري" className="h-11 rounded-xl text-start" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">السبب <span className="text-gold">*</span></Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: مكافأة تفوق الترم الأول" className="h-11 rounded-xl" />
            </div>

            {/* الفلاتر */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="text-xs font-bold text-gold/80">المجموعة المستهدفة (اتركه فارغًا للكل)</p>
              <ChipRow label="الفرقة" options={GRADES.map((g) => ({ value: g.value, label: g.label }))} selected={grades} onToggle={(v) => toggleIn(grades, setGrades, v)} />
              <ChipRow label="الشعبة" options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))} selected={sections} onToggle={(v) => toggleIn(sections, setSections, v)} />
              <ChipRow label="الجنس" options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} selected={genders} onToggle={(v) => toggleIn(genders, setGenders, v)} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500">الحضور</Label>
                  <Select dir="rtl" value={attendance} onValueChange={(v) => setAttendance(v as typeof attendance)}>
                    <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">الكل</SelectItem>
                      <SelectItem value="ATTENDED">الحاضرون</SelectItem>
                      <SelectItem value="NOT_ATTENDED">غير الحاضرين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500">المواهب</Label>
                  <Select dir="rtl" value={talent} onValueChange={(v) => setTalent(v as typeof talent)}>
                    <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">الكل</SelectItem>
                      <SelectItem value="HAS">لديهم مواهب</SelectItem>
                      <SelectItem value="VERIFIED">مواهب موثقة</SelectItem>
                      <SelectItem value="NONE">بدون مواهب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={submit} disabled={pending} className={`h-12 w-full rounded-xl text-sm font-extrabold ${
            mode === "deduct" ? "bg-red-500/90 text-white" : "bg-gradient-to-b from-gold-light to-gold text-night"
          }`}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
            {mode === "deduct" ? `خصم ${points || "—"} نقطة من المجموعة` : `منح ${points || "—"} نقطة للمجموعة`}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChipRow({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold text-zinc-500">{label}:</span>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`h-7 rounded-lg border px-2 text-[10px] font-bold transition-colors ${
              active ? "border-gold/40 bg-gold/[0.15] text-gold-light" : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── زر التراجع عن حدث نقاط (منح أو خصم) ──────────────────────
// يُنشئ حدثًا معاكسًا فيُلغى أثر المنح/الخصم مع بقاء الأثر التاريخي موثقًا

export function ReversePointEventButton({ eventId, points, studentName }: { eventId: string; points: number; studentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  const doReverse = () => {
    if (reason.trim().length < 3) return toast.error("اكتب سبب التراجع");
    startTransition(async () => {
      const res = await reversePointEvent(eventId, reason.trim());
      if (res.ok) {
        toast.success(`تم التراجع عن ${points > 0 ? "منح" : "خصم"} ${Math.abs(points)} نقطة`);
        setConfirmOpen(false);
        setReason("");
        router.refresh();
      } else toast.error(res.error || "تعذر التراجع");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label="التراجع عن الحدث"
        title="التراجع عن هذا المنح/الخصم (حدث معاكس)"
        className="shrink-0 rounded-lg p-1.5 text-sky-300/60 transition-colors hover:bg-sky-400/10 hover:text-sky-300"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-zinc-50">التراجع عن {points > 0 ? `منح` : `خصم`} {Math.abs(points)} نقطة؟</DialogTitle>
            <DialogDescription className="text-xs leading-6 text-zinc-500">
              يُسجّل حدث معاكس ({points > 0 ? `${-points}` : `+${Math.abs(points)}`}) لـ{studentName} — الأثر يُلغى والتاريخ يبقى موثقًا في سجل العمليات.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب التراجع (إلزامي) — مثال: خطأ في الإدخال" className="h-11 rounded-xl" />
          <div className="flex gap-2">
            <Button onClick={doReverse} disabled={pending} className="h-10 flex-1 rounded-xl bg-sky-500/90 text-xs font-extrabold text-white">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              تراجع
            </Button>
            <Button onClick={() => setConfirmOpen(false)} variant="outline" className="h-10 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── زر حذف حدث نقاط ──────────────────────────────────────────

export function DeletePointEventButton({ eventId, studentName }: { eventId: string; studentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  const doDelete = () => {
    if (reason.trim().length < 3) return toast.error("اكتب سبب الحذف");
    startTransition(async () => {
      const res = await deletePointEvent(eventId, reason.trim());
      if (res.ok) {
        toast.success("تم حذف الحدث نهائيًا");
        setConfirmOpen(false);
        router.refresh();
      } else toast.error(res.error || "تعذر الحذف");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label="حذف الحدث"
        title="حذف الحدث"
        className="shrink-0 rounded-lg p-1.5 text-red-300/50 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-zinc-50">حذف حدث نقاط؟</DialogTitle>
            <DialogDescription className="text-xs leading-6 text-zinc-500">
              يُحذف نهائيًا من رصيد {studentName} — الحذف موثق في سجل العمليات بسببه.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الحذف (إلزامي)" className="h-11 rounded-xl" />
          <div className="flex gap-2">
            <Button onClick={doDelete} disabled={pending} className="h-10 flex-1 rounded-xl bg-red-500/90 text-xs font-extrabold text-white">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف نهائي
            </Button>
            <Button onClick={() => setConfirmOpen(false)} variant="outline" className="h-10 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
