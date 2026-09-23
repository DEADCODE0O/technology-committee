"use client";

import { Download, FileSpreadsheet, FileCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AuditExportDropdown({
  currentLogs,
  queryString,
}: {
  currentLogs: Array<{
    id: string;
    createdAt: string;
    actorEmail: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    success: boolean;
    summary: string;
  }>;
  queryString: string;
}) {
  const [open, setOpen] = useState(false);

  const downloadJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLogs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("تم تصدير ملف JSON بنجاح");
      setOpen(false);
    } catch {
      toast.error("حدث خطأ أثناء تصدير JSON");
    }
  };

  return (
    <div className="relative inline-block text-start">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold-deep dark:text-gold-light hover:bg-gold/20 transition-all shadow-sm"
      >
        <Download className="h-3.5 w-3.5" />
        <span>تصدير السجل</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-2 z-50 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
            <a
              href={`/api/admin/audit/export${queryString ? `?${queryString}` : ""}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>تصدير CSV (Excel عربي)</span>
            </a>
            <button
              type="button"
              onClick={downloadJson}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              <FileCode className="h-4 w-4 text-sky-400" />
              <span>تصدير JSON (للمطورين)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
