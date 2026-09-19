"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  PenSquare,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { createStudentPost } from "@/actions/student-posts";

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreatePostDialogProps) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = body.trim();
    if (!clean) {
      toast.error("يرجى كتابة نص المنشور");
      return;
    }

    startTransition(async () => {
      const res = await createStudentPost({
        body: clean,
        category,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (res.ok) {
        toast.success("تم نشر منشورك في المجتمع بنجاح! 🎉");
        setBody("");
        setImageUrl("");
        setShowImageInput(false);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "فشل نشر المنشور");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-gold" />
            <h3 className="text-sm sm:text-base font-black text-foreground">
              إنشاء منشور جديد في المجتمع
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ما الذي يدور في ذهنك؟ شارك معلومة، اسأل سؤالاً، أو احتفل بإنجازك التقني..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-2xl border border-border bg-muted/30 p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1 px-1">
              <span>يتم مراجعة المنشورات آلياً لضمان بيئة آمنة</span>
              <span className={body.length > 1900 ? "text-red-400 font-bold" : ""}>
                {body.length}/2000
              </span>
            </div>
          </div>

          {/* اختيار التصنيف */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              تصنيف المنشور:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "GENERAL", label: "عام 💬" },
                { key: "QUESTION", label: "سؤال ❓" },
                { key: "ACHIEVEMENT", label: "إنجاز 🏆" },
                { key: "RESOURCE", label: "مصدر 📚" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`rounded-xl py-2 px-2 text-xs font-bold transition-all border ${
                    category === c.key
                      ? "bg-gold/15 border-gold text-gold shadow-sm"
                      : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* إضافة رابط صورة اختيارية */}
          <div>
            {showImageInput ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>رابط الصورة:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageInput(false);
                      setImageUrl("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-red-400"
                  >
                    إلغاء الصورة
                  </button>
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="ضع رابط صورة مباشر (مثال: https://...)"
                  className="w-full rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowImageInput(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
              >
                <ImageIcon className="h-4 w-4" />
                إرفاق صورة للمنشور (اختياري)
              </button>
            )}
          </div>

          {/* أزرار الحفظ والإغلاق */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!body.trim() || isPending}
              className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2 text-xs font-black text-night hover:bg-gold-light disabled:opacity-40 shadow-md transition-all"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -rotate-90" />}
              نشر الآن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
