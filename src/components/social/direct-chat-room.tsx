"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Check,
  CheckCheck,
  ArrowRight,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Trash2,
  Ban,
  Flag,
  AlertTriangle,
  Copy,
  Smile,
} from "lucide-react";
import {
  sendDirectMessage,
  getConversationMessages,
  deleteDirectMessage,
  clearDirectConversation,
  blockUser,
  reportEntity,
} from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  readAt: Date | string | null;
  createdAt: string;
  mine: boolean;
}

interface OtherUser {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  gender: string;
  grade: string;
  section: string;
  level: number;
  lastActiveAt: Date | string | null;
}

interface DirectChatRoomProps {
  otherUser: OtherUser;
  initialMessages: MessageItem[];
  currentUserId: string;
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

export function DirectChatRoom({
  otherUser,
  initialMessages,
  currentUserId,
}: DirectChatRoomProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "MESSAGE" | "PROFILE"; id: string } | null>(null);
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

  // ── Smart Polling: جلب الرسائل الجديدة كل 3.5 ثوان ──
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await getConversationMessages(otherUser.id, 60);
        if (isMounted && res.ok && res.messages) {
          setMessages((prev) => {
            if (
              res.messages.length !== prev.length ||
              (res.messages.length > 0 && res.messages[res.messages.length - 1].id !== prev[prev.length - 1]?.id)
            ) {
              return res.messages;
            }
            return prev;
          });
        }
      } catch {
        // Silent catch
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [otherUser.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // التمدد التلقائي لحقل الإدخال
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || isSending) return;

    setIsSending(true);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      receiverId: otherUser.id,
      body: clean,
      readAt: null,
      createdAt: new Date().toISOString(),
      mine: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendDirectMessage(otherUser.id, clean);
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
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!confirm("هل تريد حذف هذه الرسالة من عندك فقط؟")) return;
    startTransition(async () => {
      const res = await deleteDirectMessage(msgId);
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        toast.success("تم حذف الرسالة من عندك");
      } else {
        toast.error(res.error || "تعذر حذف الرسالة");
      }
    });
  };

  const handleCopyText = (msgBody: string) => {
    navigator.clipboard.writeText(msgBody);
    toast.success("تم نسخ نص الرسالة 📋");
  };

  const handleClearChat = () => {
    if (!confirm("هل أنت متأكد من مسح المحادثة بالكامل من عندك؟ لن تتأثر رسائل الطرف الآخر.")) return;
    startTransition(async () => {
      const res = await clearDirectConversation(otherUser.id);
      if (res.ok) {
        setMessages([]);
        toast.success("تم مسح المحادثة من عندك بنجاح");
      } else {
        toast.error(res.error || "تعذر مسح المحادثة");
      }
    });
  };

  const handleBlockUser = () => {
    if (!confirm(`هل أنت متأكد من حظر «${otherUser.displayName}»؟ لن يتمكن من مراسلتك مجدداً.`)) return;
    startTransition(async () => {
      const res = await blockUser(otherUser.id);
      if (res.ok) {
        toast.success(`تم حظر «${otherUser.displayName}»`);
        router.push("/messages");
      } else {
        toast.error(res.error || "تعذر حظر المستخدم");
      }
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    startTransition(async () => {
      const res = await reportEntity({
        entityType: reportTarget.type === "MESSAGE" ? "MESSAGE" : "PROFILE",
        entityId: reportTarget.id,
        reason: reportReason,
        details: reportDetails,
      });

      if (res.ok) {
        toast.success("تم إرسال بلاغك للإدارة للمراجعة وحماية المجتمع");
        setReportModalOpen(false);
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

  return (
    <div className="flex flex-col h-full w-full rounded-none sm:rounded-3xl border-0 sm:border border-border bg-card overflow-hidden shadow-2xl">
      {/* ── 1. رأس المحادثة بأسلوب واتساب (Sticky Mobile Header) ── */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/messages"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 active:scale-95"
            title="العودة لصندوق الرسائل"
            aria-label="الرجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href={otherUser.username ? `/p/${otherUser.username}` : `/p/${otherUser.id}`}
            className="shrink-0 transition-transform active:scale-95"
            title={`زيارة ملف ${otherUser.displayName}`}
          >
            <AvatarWithFrame
              avatarUrl={otherUser.avatarUrl}
              name={otherUser.displayName}
              frameId={otherUser.avatarFrameId}
              size="md"
              level={otherUser.level}
              showLevel
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={otherUser.username ? `/p/${otherUser.username}` : `/p/${otherUser.id}`}
                className="text-sm font-black text-foreground hover:text-gold transition-colors truncate"
              >
                {otherUser.displayName}
              </Link>
              <span className="text-[9px] rounded-full bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.2 font-black shrink-0">
                Lv.{otherUser.level}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {otherUser.username ? `@${otherUser.username}` : "طالب بالكلية"}
            </p>
          </div>
        </div>

        {/* أدوات المحادثة */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={otherUser.username ? `/p/${otherUser.username}` : `/p/${otherUser.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            الملف
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                title="خيارات المحادثة"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
              <DropdownMenuItem
                onClick={handleClearChat}
                className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4 text-amber-500" />
                مسح المحادثة من عندي
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setReportTarget({ type: "PROFILE", id: otherUser.id });
                  setReportModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Flag className="h-4 w-4 text-orange-500" />
                إبلاغ عن المستخدم
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleBlockUser}
                className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-red-500 hover:text-red-400"
              >
                <Ban className="h-4 w-4" />
                حظر المستخدم
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── 2. مساحة الرسائل بأسلوب واتساب المريح ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar bg-background/40">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-gold" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground">
              بداية المحادثة مع «{otherUser.displayName}»
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              أرسل رسالتك الأولى لبدء الدردشة وتبادل المعرفة والتنسيق في أنشطة ومشاريع اللجنة التكنولوجية.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // هل نحتاج فاصل زمني لليوم؟
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
                  className={`flex group items-end gap-1.5 ${
                    msg.mine ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* قائمة الإجراءات السريعة (تعمل باللمس على الهاتف وبالـ Hover على الكمبيوتر) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer rounded-lg hover:bg-muted/60"
                        title="خيارات الرسالة"
                        aria-label="خيارات الرسالة"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={msg.mine ? "start" : "end"} className="w-40 rounded-2xl p-1">
                      <DropdownMenuItem
                        onClick={() => handleCopyText(msg.body)}
                        className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        نسخ النص
                      </DropdownMenuItem>

                      {msg.mine ? (
                        <DropdownMenuItem
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف من عندي
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => {
                            setReportTarget({ type: "MESSAGE", id: msg.id });
                            setReportModalOpen(true);
                          }}
                          className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-orange-500 hover:text-orange-400"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          إبلاغ عن الرسالة
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* فقاعة الرسالة */}
                  <div
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.mine
                        ? "bg-gold/15 dark:bg-gold/20 text-foreground border border-gold/30 rounded-tr-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    <p>{msg.body}</p>

                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground select-none">
                      <span>{timeStr}</span>
                      {msg.mine && (
                        <span>
                          {msg.readAt ? (
                            <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 3. حقل إدخال الرسالة بأسلوب واتساب المتمدد ── */}
      <form
        onSubmit={handleSend}
        className="border-t border-border p-2.5 sm:p-3 bg-muted/30 backdrop-blur-md shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك... (Enter للإرسال)"
            rows={1}
            maxLength={1000}
            className="flex-1 max-h-28 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-4 ps-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none transition-all"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-night hover:bg-gold-light active:scale-95 transition-all disabled:opacity-40 shadow-md cursor-pointer"
            title="إرسال الرسالة"
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

      {/* ── 4. نافذة الإبلاغ المنبثقة ── */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-orange-500 font-extrabold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>إبلاغ عن محتوى أو سلوك مخالف</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              تلتزم اللجنة التكنولوجية بتوفير بيئة طلابية آمنة ومحترمة. سيتم فحص بلاغك بسرية تامة من قِبل إدارة اللجنة.
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
                  <option value="INAPPROPRIATE">محتوى غير لائق أو كلام مسيء</option>
                  <option value="HARASSMENT">مضايقة أو تنمر</option>
                  <option value="SPAM">رسائل مزعجة أو إعلانات (Spam)</option>
                  <option value="OTHER">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  تفاصيل إضافية (اختياري):
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
                  onClick={() => setReportModalOpen(false)}
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
