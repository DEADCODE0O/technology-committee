"use client";

// ═══════════════════════════════════════════════════════════════
//  زر التراجع عن عملية إدارية — يظهر في سجل العمليات
//  ينفذ العملية العكسية ويعيد الحالة كما كانت قبل التنفيذ
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Undo2, ShieldAlert } from "lucide-react";
import { undoAuditAction } from "@/actions/undo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function UndoButton({ auditId, summary }: { auditId: string; summary: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const doUndo = () => {
    if (reason.trim().length < 3) return toast.error("اكتب سبب التراجع");
    startTransition(async () => {
      const res = await undoAuditAction(auditId, reason.trim());
      if (res.ok) {
        toast.success("تم التراجع عن العملية — وأُعيدت الحالة كما كانت");
        setOpen(false);
        setReason("");
        router.refresh();
      } else toast.error(res.error || "تعذر التراجع");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="التراجع عن العملية"
        title="التراجع عن هذه العملية"
        className="shrink-0 rounded-lg p-1.5 text-sky-300/60 transition-colors hover:bg-sky-400/10 hover:text-sky-300"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-zinc-50">
              <Undo2 className="h-4 w-4 text-sky-300" />
              التراجع عن هذه العملية؟
            </DialogTitle>
            <DialogDescription className="text-xs leading-6 text-zinc-500">
              <span className="flex items-start gap-1.5 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2 text-[11px] text-zinc-400">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300/70" />
                سيُعاد الوضع كما كان قبل: «{summary}» — التراجع نفسه يُوثَّق في السجل ولا يمسح التاريخ.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب التراجع (إلزامي) — مثال: خطأ غير مقصود"
            className="h-11 rounded-xl"
          />
          <div className="flex gap-2">
            <Button onClick={doUndo} disabled={pending} className="h-11 flex-1 rounded-xl bg-sky-500/90 text-xs font-extrabold text-white">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              تنفيذ التراجع
            </Button>
            <Button onClick={() => setOpen(false)} variant="outline" className="h-11 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
