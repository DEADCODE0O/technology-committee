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
  ShieldCheck,
  ArrowRight,
  Reply,
  Edit2,
  Trash2,
  X,
  Flag,
  AlertTriangle,
  Copy,
  MoreVertical,
} from "lucide-react";
import {
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  getChatRoomMessages,
} from "@/actions/chat";
import { reportEntity } from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "اليوم";
  if (isYesterday) return "أمس";
  return d.toLocaleDateString("ar-EG", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  // ── Smart Polling: جلب الرسائل الجديدة كل 3 ثوان ──
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
        // Silent catch
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [room.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

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
            m.id === editingMessage.id
              ? { ...m, body: clean, editedAt: new Date().toISOString() }
              : m
          )
        );
        setEditingMessage(null);
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        toast.success("تم تعديل الرسالة بنجاح ✨");
      } else {
        toast.error(res.error || "تعذر تعديل الرسالة");
      }
      return;
    }

    // إرسال رسالة جديدة (أو رد على رسالة)
    setIsSending(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const replyTarget = replyingTo;
    setReplyingTo(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      body: clean,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUserId,
        name: "أنت",
        username: null,
        avatarUrl: null,
        avatarFrameId: null,
        role: currentUserRole || "STUDENT",
        level: 1,
      },
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            authorName: replyTarget.authorName,
            snippet: replyTarget.snippet,
          }
        : null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendChatMessage(room.id, clean, replyTarget?.id);
    setIsSending(false);

    if (res.ok) {
      if (res.messageId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: res.messageId! } : m))
        );
      }
    } else {
      toast.error(res.error || "فشل إرسال الرسالة");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(clean);
      setReplyingTo(replyTarget);
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

  const handleCopyText = (body: string) => {
    navigator.clipboard.writeText(body);
    toast.success("تم نسخ نص الرسالة 📋");
  };

  const handleStartEdit = (msg: ChatMessageItem) => {
    setEditingMessage({ id: msg.id, body: msg.body });
    setText(msg.body);
    setReplyingTo(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
    <div className="flex flex-col h-full w-full rounded-none sm:rounded-3xl border-0 sm:border border-border bg-card overflow-hidden shadow-2xl">
      {/* ── 1. رأس الشات الجماعي بأسلوب تليجرام/واتساب (Sticky Mobile Header) ── */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/messages"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 active:scale-95"
            title="العودة لقائمة المحادثات"
            aria-label="الرجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 border border-gold/30 text-lg sm:text-xl shadow-inner">
            {room.icon || "💬"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-foreground truncate">
                {room.name}
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                مباشر
              </span>
            </div>

            {room.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                {room.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="flex h-10 items-center gap-1 rounded-xl border border-border bg-card/60 px-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="تعليمات الشات"
          >
            <Info className="h-4 w-4 text-gold" />
            <span className="hidden sm:inline">القواعد</span>
          </button>
        </div>
      </div>

      {/* ── 2. شريط الإرشادات التفاعلي القابل للطي ── */}
      {showGuidelines && (
        <div className="bg-gold/10 border-b border-gold/20 p-3 text-xs text-foreground flex items-start gap-2.5 shrink-0 animate-in fade-in duration-150">
          <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-black text-gold">ميثاق المحادثة في مجتمع اللجنة:</p>
            <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
              <li>الاحترام المتبادل والابتعاد عن النقاشات غير اللائقة.</li>
              <li>الرسائل مراقبة ومفلترة آلياً لحماية جميع الطلاب والطالبات.</li>
              <li>يمكنك الرد على أي رسالة، وتعديل رسائلك خلال 15 دقيقة، أو حذفها.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setShowGuidelines(false)}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 3. مساحة الرسائل بأسلوب تليجرام/واتساب ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 custom-scrollbar bg-background/40">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-gold" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground">
              لا توجد رسائل بعد في {room.name}
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              كن أول من يبدأ المحادثة ويرحب بالزملاء وأعضاء اللجنة التكنولوجية!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
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

            const prevMsg = messages[idx - 1];
            const showDateHeader =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            return (
              <div key={msg.id} className="space-y-2">
                {showDateHeader && (
                  <div className="flex items-center justify-center my-2">
                    <span className="rounded-full bg-muted/80 border border-border/70 px-3 py-0.5 text-[10px] font-extrabold text-muted-foreground shadow-xs">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex group items-end gap-2 ${
                    isMe ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* قائمة الإجراءات باللمس أو التمرير */}
                  {!msg.isDeleted && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer rounded-lg hover:bg-muted/60"
                          title="خيارات الرسالة"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isMe ? "start" : "end"} className="w-40 rounded-2xl p-1">
                        <DropdownMenuItem
                          onClick={() =>
                            setReplyingTo({
                              id: msg.id,
                              authorName: msg.user.name,
                              snippet: msg.body,
                            })
                          }
                          className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          رد على الرسالة
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleCopyText(msg.body)}
                          className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          نسخ النص
                        </DropdownMenuItem>

                        {isMe && (
                          <DropdownMenuItem
                            onClick={() => handleStartEdit(msg)}
                            className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-amber-500 hover:text-amber-400"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            تعديل الرسالة
                          </DropdownMenuItem>
                        )}

                        {(isMe || isAdmin) && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(msg.id)}
                            className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف الرسالة
                          </DropdownMenuItem>
                        )}

                        {!isMe && (
                          <DropdownMenuItem
                            onClick={() => setReportMessageId(msg.id)}
                            className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-orange-500 hover:text-orange-400"
                          >
                            <Flag className="h-3.5 w-3.5" />
                            إبلاغ عن محتوى
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* فقاعة الرسالة مع رأس معلومات المرسل */}
                  <div
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? "bg-gold/15 dark:bg-gold/20 text-foreground border border-gold/30 rounded-tr-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    {/* شريط اقتباس الرد إن وجد بأسلوب واتساب */}
                    {msg.replyTo && (
                      <div className="mb-2 rounded-xl p-2 text-xs border-s-3 bg-muted/60 border-gold text-muted-foreground">
                        <span className="font-extrabold text-gold block text-[11px]">
                          {msg.replyTo.authorName}
                        </span>
                        <p className="line-clamp-1 italic text-[11px] mt-0.5">
                          {msg.replyTo.snippet}
                        </p>
                      </div>
                    )}

                    {/* رأس الفقاعة: اسم المرسل + مستواه + رتبته (للآخرين) */}
                    {!isMe && (
                      <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-border/40">
                        <Link
                          href={profileLink}
                          className="font-extrabold text-gold-deep dark:text-gold-light hover:underline text-xs"
                        >
                          {msg.user.name}
                        </Link>

                        {isMsgAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black px-1.5 py-0.2">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            إدارة
                          </span>
                        )}

                        <span className="text-[9px] rounded-full bg-muted text-muted-foreground px-1.5 py-0.2 font-black">
                          Lv.{msg.user.level}
                        </span>
                      </div>
                    )}

                    {/* نص الرسالة */}
                    <p className={`${msg.isDeleted ? "italic opacity-70" : ""}`}>
                      {msg.body}
                    </p>

                    {/* التوقيت والتعديل */}
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground select-none">
                      {msg.editedAt && <span>(معدّلة)</span>}
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {/* صورة المرسل مع إطاره (للآخرين فقط) */}
                  {!isMe && (
                    <Link
                      href={profileLink}
                      className="shrink-0 transition-transform active:scale-95 mb-0.5"
                      title={`ملف ${msg.user.name}`}
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
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 4. شريط الرد المعلق أو التعديل المعلق إن وجد ── */}
      {replyingTo && (
        <div className="bg-gold/10 border-t border-gold/25 px-4 py-2 flex items-center justify-between text-xs shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="h-4 w-4 text-gold shrink-0" />
            <div className="truncate">
              الرد على <strong className="font-black text-gold">{replyingTo.authorName}</strong>:{" "}
              <span className="text-muted-foreground italic truncate">
                {replyingTo.snippet}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="bg-amber-500/10 border-t border-amber-500/25 px-4 py-2 flex items-center justify-between text-xs shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Edit2 className="h-4 w-4 shrink-0" />
            <span>تعديل الرسالة المحددة (اضغط Enter للحفظ)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setText("");
            }}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 5. حقل إدخال الرسالة بأسلوب متمدد وسلس ── */}
      <form
        onSubmit={handleSend}
        className="border-t border-border p-2.5 sm:p-3 bg-muted/30 backdrop-blur-md shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage
                  ? "اكتب النص المعدل..."
                  : "اكتب رسالتك في المجموعة... (Enter للإرسال)"
              }
              rows={1}
              maxLength={500}
              className="w-full max-h-28 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-12 ps-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none transition-all"
            />
            <span
              className={`absolute bottom-2.5 left-3 text-[10px] font-mono pointer-events-none select-none ${
                text.length > 450 ? "text-red-400 font-bold" : "text-muted-foreground/60"
              }`}
            >
              {text.length}/500
            </span>
          </div>

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-night hover:bg-gold-light active:scale-95 transition-all disabled:opacity-40 shadow-md cursor-pointer"
            title="إرسال"
            aria-label="إرسال"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 -rotate-90 text-night" />
            )}
          </button>
        </div>
      </form>

      {/* ── 6. نافذة الإبلاغ عن رسالة مخالفة ── */}
      {reportMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-orange-500 font-extrabold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>إبلاغ عن رسالة في شات المجموعة</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
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
                  placeholder="وضح سبب البلاغ بإيجاز لمساعدة المشرفين..."
                  maxLength={250}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportMessageId(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-500 shadow cursor-pointer"
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