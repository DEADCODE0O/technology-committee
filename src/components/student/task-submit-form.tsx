"use client";

import { useState, useTransition } from "react";
import { Send, Upload, Link2, Type, Loader2, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle, HardDrive } from "lucide-react";
import { submitTask } from "@/actions/tasks";
import { TASK_SUBMISSION_TYPE_LABELS } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
//  نموذج تسليم المهمة — يدعم Google Drive / روابط سحابية / رفع ملف
//  + شرح خطوات مشاركة رابط درايف لتوفير مساحة السيرفر
// ═══════════════════════════════════════════════════════════════

type Props = {
  taskId: string;
  submissionType: string;
  needsVariant: boolean;
  pool: { title: string; description?: string }[];
  canResubmit: boolean;
};

export function TaskSubmitForm({ taskId, submissionType, needsVariant, pool, canResubmit }: Props) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [fileMethod, setFileMethod] = useState<"DRIVE" | "UPLOAD">("DRIVE");
  const [showDriveHelp, setShowDriveHelp] = useState(false);
  const [variant, setVariant] = useState<number | null>(needsVariant ? null : 0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const needsText = ["TEXT", "TEXT_AND_FILE", "TEXT_AND_LINK"].includes(submissionType);
  const needsFile = ["FILE", "TEXT_AND_FILE"].includes(submissionType);
  const needsLinkOnly = ["LINK", "TEXT_AND_LINK"].includes(submissionType);

  const isDriveLink = link.toLowerCase().includes("drive.google.com") || link.toLowerCase().includes("docs.google.com");

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("file", file);
      const res = await fetch("/api/tasks/upload-file", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "فشل الرفع");
      setFileUrl(json.url);
      setFileLabel(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // التحقق من تسليم الملف سواء عبر درايف أو الرفع
    if (needsFile && !fileUrl && !link) {
      setError("يرجى إرفاق رابط جوجل درايف للملف أو رفع الملف مباشرة");
      return;
    }

    startTransition(async () => {
      const res = await submitTask({
        taskId,
        text: text || undefined,
        fileUrl: fileUrl || undefined,
        linkUrl: link || undefined,
        variantIndex: variant ?? undefined,
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error ?? "تعذر التسليم");
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-5 py-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-extrabold text-emerald-300">تم تسليم التكليف بنجاح 🎉</p>
          <p className="mt-1 text-xs leading-6 text-emerald-200/60">هتوصلك إشعارات حالة التقييم — راجع «مهامي»</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {needsVariant && pool.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-extrabold text-foreground">اختر أحد البدائل:</p>
          <div className="grid gap-2.5">
            {pool.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setVariant(i)}
                className={`rounded-2xl border p-4 text-start transition-colors ${
                  variant === i
                    ? "border-gold/50 bg-gold/[0.08]"
                    : "border-border bg-card hover:border-gold/30"
                }`}
              >
                <p className="text-sm font-extrabold text-foreground">{p.title}</p>
                {p.description && <p className="mt-1 text-xs leading-6 text-muted-foreground">{p.description}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsText && (
        <div>
          <label htmlFor="task-text" className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-foreground">
            <Type className="h-3.5 w-3.5 text-gold/70" /> إجابتك النصية
          </label>
          <textarea
            id="task-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="اكتب إجابتك أو ملاحظاتك هنا..."
            className="w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-7 text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>
      )}

      {/* إذا كان نوع المهمة يتطلب ملف */}
      {needsFile && (
        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
              <HardDrive className="h-4 w-4 text-gold" /> تسليم الملف المطلوب
            </span>
            <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFileMethod("DRIVE")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  fileMethod === "DRIVE"
                    ? "bg-gradient-to-b from-gold-light to-gold text-night font-extrabold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                رابط Google Drive (موصى به)
              </button>
              <button
                type="button"
                onClick={() => setFileMethod("UPLOAD")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  fileMethod === "UPLOAD"
                    ? "bg-gradient-to-b from-gold-light to-gold text-night font-extrabold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                رفع ملف مباشر
              </button>
            </div>
          </div>

          {fileMethod === "DRIVE" ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="url"
                  dir="ltr"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
                />
                {isDriveLink && (
                  <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-500 border border-emerald-500/25">
                    <CheckCircle2 className="h-3 w-3" /> رابط درايف سليم
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowDriveHelp(!showDriveHelp)}
                  className="inline-flex items-center gap-1 text-gold/90 hover:text-gold-light underline underline-offset-4"
                >
                  <HelpCircle className="h-3 w-3" />
                  {showDriveHelp ? "إخفاء الخطوات" : "كيف أنسخ رابط Google Drive بشكل صحيح؟"}
                </button>
                {link && !isDriveLink && (
                  <span className="text-muted-foreground">رابط خارجي مقبول (Dropbox/OneDrive/GitHub)</span>
                )}
              </div>

              {showDriveHelp && (
                <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-3 text-[11px] leading-6 text-foreground/80 space-y-1">
                  <p className="font-bold text-gold-dark dark:text-gold-light">📌 خطوات بسيطة لتسليم الواجب بدون فقدان الجودة:</p>
                  <p>1. ارفع ملفك (PDF، صورة، فيديو، أو ZIP) على حسابك في Google Drive.</p>
                  <p>2. اضغط كليك يمين على الملف واختر <strong className="text-foreground">مشاركة (Share)</strong>.</p>
                  <p>3. في خانة الوصول العام، اختر <strong className="text-foreground">«أي شخص لديه الرابط» (Anyone with the link)</strong>.</p>
                  <p>4. اضغط <strong className="text-foreground">نسخ الرابط (Copy link)</strong> ثم الصقه في المربع أعلاه.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3.5 transition-colors hover:border-gold/40">
                <input type="file" className="sr-only" onChange={onUpload} accept=".pdf,.jpg,.jpeg,.png,.webp,.zip" />
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-xs font-bold text-foreground">{fileLabel || "اضغط لاختيار ملف من جهازك (PDF / صورة / ZIP حتى 8MB)"}</span>
                {fileUrl && <CheckCircle2 className="ms-auto h-5 w-5 text-emerald-500" />}
              </label>
            </div>
          )}
        </div>
      )}

      {/* إذا كان نوع المهمة يتطلب رابط فقط */}
      {needsLinkOnly && (
        <div>
          <label htmlFor="task-link" className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-foreground">
            <Link2 className="h-3.5 w-3.5 text-gold/70" /> رابط التسليم (Google Drive / GitHub / Figma / أي رابط)
          </label>
          <input
            id="task-link"
            dir="ltr"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading || (needsVariant && variant === null)}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night shadow-[0_10px_25px_-8px_rgba(201,164,92,0.5)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {canResubmit ? "أعد التسليم" : "سلّم التكليف الآن"}
      </button>
      <p className="text-[11px] text-muted-foreground">نوع التسليم المطلوب: {TASK_SUBMISSION_TYPE_LABELS[submissionType]}</p>
    </form>
  );
}
