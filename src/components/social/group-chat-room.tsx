"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Users,
  Sparkles,
  ShieldAlert,
  Info,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Reply,
  Edit2,
  Trash2,
  X,
  Flag,
  AlertTriangle,
} from "lucide-react";
import {
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  getChatRoomMessages,
} from "@/actions/chat";
import { reportEntity } from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

interface ChatAuthor {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  role: string;
  level: number;
}

export interface ChatMessageItem {
  id: string;
  body: string;
  isDeleted?: boolean;
  editedAt?: string | null;
  createdAt: string;
  user: ChatAuthor;
  replyTo?: {
    id: string;
    authorName: string;
    snippet: string;
  } | null;
}

interface RoomInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface GroupChatRoomProps {
  room: RoomInfo;
  initialMessages: ChatMessageItem[];
  currentUserId: string;
  currentUserRole?: string;
}

export function GroupChatRoom({
  room,
  initialMessages,
  currentUserId,
  currentUserRole,
}: GroupChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; snippet: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; body: string } | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<"INAPPROPRIATE" | "SPAM" | "HARASSMENT" | "OTHER">("INAPPROPRIATE");
  const [reportDetails, setReportDetails] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  // ── Smart Polling: كل 3.5 ثوان لجلب الرسائل الجديدة ──
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const fresh = await getChatRoomMessages(room.id, 80);
        if (isMounted && Array.isArray(fresh)) {
          setMessages((prev) => {
            if (fresh.length !== prev.length) {
              return fresh;
            }
            if (fresh.length > 0 && fresh[fresh.length - 1].id !== prev[prev.length - 1]?.id) {
              return fresh;
            }
            return prev;
          });
        }
      } catch {
        // Silent catch for background polling
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [room.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || isSending) return;

    if (clean.length > 500) {
      toast.error("الحد الأقصى للرسالة 500 حرف");
      return;
    }

    // إذا كان تعديل لرسالة قائمة
    if (editingMessage) {
      setIsSending(true);
      const res = await editChatMessage(editingMessage.id, clean);
      setIsSending(false);
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id ? { ...m, body: clean, editedAt: new Date().toISOString() } : m
          )
        );
        setEditingMessage(null);
        setText("");
        toast.success("تم تعديل الرسالة");
      } else {
        toast.error(res.error || "تعذر تعديل الرسالة");
      }
      return;
    }

    setIsSending(true);
    setText("");

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      body: clean,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUserId,
        username: null,
        name: "أنت",
        avatarUrl: null,
        avatarFrameId: null,
        role: currentUserRole || "STUDENT",
        level: 1,
      },
      replyTo: replyingTo,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    const res = await sendChatMessage(room.id, clean, replyId);
    setIsSending(false);

    if (res.ok) {
      if (res.messageId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: res.messageId! } : m))
        );
      }
    } else {
      toast.error(res.error || "تعذر إرسال الرسالة");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(clean);
    }
  };

  const handleDelete = (msgId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    startTransition(async () => {
      const res = await deleteChatMessage(msgId);
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isDeleted: true, body: "تم حذف هذه الرسالة" } : m
          )
        );
        toast.success("تم حذف الرسالة");
      } else {
        toast.error(res.error || "تعذر حذف الرسالة");
      }
    });
  };

  const handleStartEdit = (msg: ChatMessageItem) => {
    setEditingMessage({ id: msg.id, body: msg.body });
    setText(msg.body);
    setReplyingTo(null);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportMessageId) return;

    startTransition(async () => {
      const res = await reportEntity({
        entityType: "CHAT_MESSAGE",
        entityId: reportMessageId,
        reason: reportReason,
        details: reportDetails,
      });

      if (res.ok) {
        toast.success("تم إرسال البلاغ لإدارة اللجنة لمراجعته");
        setReportMessageId(null);
        setReportDetails("");
      } else {
        toast.error(res.error || "تعذر إرسال البلاغ");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isAdmin = currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN";

  return (
    <div className="flex flex-col h-[82vh] rounded-3xl border border-border bg-card overflow-hidden shadow-xl">
      {/* رأس الشات الجماعي */}
      <div className="flex items-center justify-between border-b border-border p-3.5 sm:p-4 bg-muted/40">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="العودة لقائمة المحادثات"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 border border-gold/30 text-xl shadow-inner">
            {room.icon || "💬"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-foreground">
                {room.name}
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                مباشر
              </span>
            </div>
            {room.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-sm sm:max-w-md">
                {room.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="flex items-center gap-1 rounded-xl border border-border bg-card/60 px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="تعليمات الشات"
          >
            <Info className="h-3.5 w-3.5 text-gold" />
            <span className="hidden sm:inline">القواعد</span>
          </button>
        </div>
      </div>

      {/* شريط الإرشادات التفاعلي */}
      {showGuidelines && (
        <div className="bg-gold/10 border-b border-gold/20 p-3 text-xs text-foreground flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-black text-gold">ميثاق المحادثة في مجتمع اللجنة:</p>
            <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
              <li>الاحترام المتبادل والابتعاد عن النقاشات غير اللائقة.</li>
              <li>الرسائل مراقبة ومفلترة آلياً لحماية جميع الطلاب والطالبات.</li>
              <li>يمكنك الرد على أي رسالة، وتعديل رسائلك خلال 15 دقيقة، أو حذفها.</li>
            </ul>
          </div>
        </div>
      )}

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar bg-background/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 text-gold/60 mb-2" />
            <h4 className="text-sm font-extrabold text-foreground">
              لا توجد رسائل بعد في {room.name}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              كن أول من يبدأ المحادثة ويرحب بالزملاء وأعضاء اللجنة!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user.id === currentUserId;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const profileLink = msg.user.username
              ? `/p/${msg.user.username}`
              : `/p/${msg.user.id}`;
            const isMsgAdmin =
              msg.user.role === "SUPER_ADMIN" || msg.user.role === "ADMIN";

            return (
              <div
                key={msg.id}
                className={`flex group items-start gap-2.5 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* الصورة والإطار مع رابط الملف الشخصي */}
                <Link
                  href={profileLink}
                  className="shrink-0 transition-transform hover:scale-105"
                  title={`زيارة ملف ${msg.user.name}`}
                >
                  <AvatarWithFrame
                    avatarUrl={msg.user.avatarUrl}
                    name={msg.user.name}
                    frameId={msg.user.avatarFrameId}
                    size="sm"
                    level={msg.user.level}
                    showLevel={false}
                  />
                </Link>

                {/* فقاعة الرسالة */}
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3 shadow-sm text-xs leading-5 break-words relative ${
                    isMe
                      ? "bg-gold text-night rounded-tr-none font-bold"
                      : "bg-muted border border-border text-foreground rounded-tl-none font-medium"
                  }`}
                >
                  {/* شريط اقتباس الرد إن وجد */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 rounded-xl p-2 text-[11px] border-s-2 ${
                        isMe
                          ? "bg-night/10 border-night text-night/90"
                          : "bg-card border-gold text-muted-foreground"
                      }`}
                    >
                      <span className="font-extrabold block">{msg.replyTo.authorName}</span>
                      <p className="line-clamp-1 italic text-[10px]">{msg.replyTo.snippet}</p>
                    </div>
                  )}

                  {/* رأس الفقاعة: اسم المرسل + مستواه + رتبته */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/50">
                      <Link
                        href={profileLink}
                        className="font-extrabold text-foreground hover:text-gold transition-colors text-[11px]"
                      >
                        {msg.user.name}
                      </Link>

                      {isMsgAdmin && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black px-1.5 py-0.2">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          إدارة
                        </span>
                      )}

                      <span className="text-[9px] rounded-full bg-gold/15 text-gold px-1.5 py-0.2 font-black">
                        مستوى {msg.user.level}
                      </span>
                    </div>
                  )}

                  {/* نص الرسالة */}
                  <p className={`whitespace-pre-wrap ${msg.isDeleted ? "italic opacity-70" : ""}`}>
                    {msg.body}
                  </p>

                  {/* التوقيت والتعديل */}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[9px] ${
                      isMe ? "text-night/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.editedAt && <span>(معدّلة)</span>}
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* أزرار الإجراءات السريعة عند التمرير (رد، تعديل، حذف، إبلاغ) */}
                {!msg.isDeleted && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 self-center transition-opacity">
                    <button
                      type="button"
                      onClick={() => setReplyingTo({ id: msg.id, authorName: msg.user.name, snippet: msg.body })}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="رد على الرسالة"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>

                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(msg)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="تعديل الرسالة"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {(isMe || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(msg.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => setReportMessageId(msg.id)}
                        className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500 transition-colors"
                        title="إبلاغ عن محتوى غير لائق"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* شريط الرد المعلق أو التعديل المعلق إن وجد */}
      {replyingTo && (
        <div className="bg-gold/10 border-t border-gold/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Reply className="h-3.5 w-3.5 text-gold" />
            <span>
              الرد على <strong className="font-black text-gold">{replyingTo.authorName}</strong>:{" "}
              <span className="text-muted-foreground italic truncate max-w-xs inline-block">
                {replyingTo.snippet}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Edit2 className="h-3.5 w-3.5" />
            <span>تعديل الرسالة المحددة (اضغط Enter للحفظ)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setText("");
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* حقل الإرسال */}
      <form onSubmit={handleSend} className="border-t border-border p-3 sm:p-4 bg-muted/30">
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "اكتب النص الجديد..." : "اكتب رسالتك... (Enter للإرسال)"}
              rows={1}
              maxLength={500}
              className="w-full max-h-32 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-12 ps-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none"
            />
            <span
              className={`absolute bottom-2.5 left-3 text-[10px] font-mono pointer-events-none ${
                text.length > 450 ? "text-red-400 font-bold" : "text-muted-foreground/60"
              }`}
            >
              {text.length}/500
            </span>
          </div>

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-night hover:bg-gold-light transition-all disabled:opacity-40 shadow-md"
            title="إرسال"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 -rotate-90" />
            )}
          </button>
        </div>
      </form>

      {/* ── مودال الإبلاغ عن رسالة شات ── */}
      {reportMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-orange-500 font-extrabold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>إبلاغ عن رسالة في الشات</span>
            </div>

            <p className="text-xs text-muted-foreground">
              تساعدنا البلاغات في الحفاظ على مجتمع طلابي محترم وبيئة تعليمية نقية.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  سبب الإبلاغ:
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="INAPPROPRIATE">محتوى غير لائق أو مسيء</option>
                  <option value="HARASSMENT">تنمر أو مضايقة</option>
                  <option value="SPAM">إعلانات مضللة أو سبام</option>
                  <option value="OTHER">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  ملاحظات إضافية (اختياري):
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="وضح سبب البلاغ بإيجاز..."
                  maxLength={250}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportMessageId(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-500 shadow"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                  إرسال البلاغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}