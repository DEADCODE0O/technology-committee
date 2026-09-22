"use client";

import { useEffect } from "react";
import {
  Reply,
  Edit2,
  Copy,
  Trash2,
  Flag,
  X,
  Sparkles,
} from "lucide-react";

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    id: string;
    body: string;
    mine: boolean;
    authorName?: string;
  } | null;
  onReply?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  onReport?: () => void;
  onReact?: (emoji: string) => void;
  canEdit?: boolean;
  canDeleteForEveryone?: boolean;
}

const EMOJI_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"];

export function MessageActionSheet({
  isOpen,
  onClose,
  message,
  onReply,
  onEdit,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
  onReport,
  onReact,
  canEdit = false,
  canDeleteForEveryone = false,
}: MessageActionSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-border bg-card p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* مقبض السحب للموبايل */}
        <div className="flex justify-center sm:hidden pb-1">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* ── 1. شريط التفاعلات بالأيموجي السريعة بنمط واتساب وتليجرام ── */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 px-2 rounded-2xl bg-muted/40 border border-border/60">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact?.(emoji);
                onClose();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl hover:bg-muted active:scale-125 transition-transform cursor-pointer"
              title={`تفاعل بـ ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* معاينة نص الرسالة المختارة */}
        <div className="rounded-2xl bg-muted/30 border border-border/60 p-2.5 text-xs text-muted-foreground line-clamp-2 italic">
          {message.body.startsWith("[IMAGE]:")
            ? "📷 صورة مرفقة"
            : message.body.startsWith("[VOICE]:")
            ? "🎤 رسالة صوتية"
            : message.body}
        </div>

        {/* ── 2. قائمة الإجراءات السريعة (Touch Targets >= 48px) ── */}
        <div className="space-y-1">
          {/* رد على الرسالة */}
          {onReply && (
            <button
              type="button"
              onClick={() => {
                onReply();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-foreground hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <Reply className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>رد على الرسالة (Quote)</p>
                <span className="text-[10px] text-muted-foreground font-normal">اقتباس الرسالة والرد عليها في حقل الكتابة</span>
              </div>
            </button>
          )}

          {/* تعديل الرسالة */}
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-amber-500 hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Edit2 className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>تعديل الرسالة</p>
                <span className="text-[10px] text-muted-foreground font-normal">تصحيح النص وإعادة نشره</span>
              </div>
            </button>
          )}

          {/* نسخ النص */}
          {onCopy && !message.body.startsWith("[") && (
            <button
              type="button"
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-foreground hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Copy className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>نسخ النص</p>
                <span className="text-[10px] text-muted-foreground font-normal">نسخ محتوى الرسالة إلى الحافظة</span>
              </div>
            </button>
          )}

          {/* حذف من عندي فقط */}
          {onDeleteForMe && (
            <button
              type="button"
              onClick={() => {
                onDeleteForMe();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>حذف من عندي (Delete for me)</p>
                <span className="text-[10px] text-muted-foreground font-normal">إخفاء الرسالة من شاشتك فقط دون التأثير على الطرف الآخر</span>
              </div>
            </button>
          )}

          {/* حذف لدى الطرفين / لدى الجميع */}
          {canDeleteForEveryone && onDeleteForEveryone && (
            <button
              type="button"
              onClick={() => {
                onDeleteForEveryone();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-500">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>حذف لدى الجميع (Delete for everyone)</p>
                <span className="text-[10px] text-muted-foreground font-normal">حذف الرسالة نهائياً من المحادثة لدى الطرفين</span>
              </div>
            </button>
          )}

          {/* إبلاغ عن محتوى مخالف */}
          {!message.mine && onReport && (
            <button
              type="button"
              onClick={() => {
                onReport();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-orange-500 hover:bg-orange-500/10 active:bg-orange-500/20 transition-colors cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                <Flag className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p>إبلاغ عن محتوى أو سلوك مخالف</p>
                <span className="text-[10px] text-muted-foreground font-normal">إرسال بلاغ سري لإدارة اللجنة للمراجعة</span>
              </div>
            </button>
          )}
        </div>

        {/* زر الإلغاء */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
