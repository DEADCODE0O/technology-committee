"use client";

import { useState } from "react";
import { Copy, Check, Phone, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/platform/community-links-card";

type ClosedContactActionsProps = {
  phoneNumber: string;
  whatsappUrl: string;
};

export function ClosedContactActions({
  phoneNumber,
  whatsappUrl,
}: ClosedContactActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      toast.success("تم نسخ الرقم إلى الحافظة: " + phoneNumber);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("تعذر نسخ الرقم تلقائياً");
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* زر واتساب كبير وبارز */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 px-6 py-4 text-base sm:text-lg font-black text-white shadow-xl shadow-emerald-950/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-900/50 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
          <WhatsAppIcon className="h-6 w-6 fill-current text-white" />
        </span>
        <span className="truncate">تواصل عبر واتساب للانضمام</span>
        <ArrowUpRight className="h-5 w-5 shrink-0 opacity-80 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>

      {/* أزرار مساعدة سريعة (اتصال مباشر + نسخ الرقم) */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href={`tel:${phoneNumber}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs sm:text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
        >
          <Phone className="h-4 w-4 text-emerald-400" />
          <span>اتصال هاتفي</span>
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs sm:text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400 animate-in zoom-in-50" />
              <span className="text-emerald-400 font-extrabold">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-zinc-400" />
              <span>نسخ الرقم</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
