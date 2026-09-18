"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Check,
  CheckCheck,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { sendDirectMessage, getConversationMessages } from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

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

export function DirectChatRoom({
  otherUser,
  initialMessages,
  currentUserId,
}: DirectChatRoomProps) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // ── Smart Polling: كل 4 ثوان لجلب الرسائل الجديدة ──
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await getConversationMessages(otherUser.id, 60);
        if (isMounted && res.ok && res.messages) {
          setMessages((prev) => {
            // تحديث فقط إذا كان هناك رسائل جديدة أو تغيرت حالة القراءة
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
        // تجاهل أخطاء الشبكة المؤقتة في الـ polling
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [otherUser.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || isSending) return;

    setIsSending(true);
    setText("");

    // إضافة تفاؤلية للواجهة (Optimistic update)
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
      setText(clean); // إعادة النص للحقل
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[82vh] rounded-3xl border border-border bg-card overflow-hidden shadow-xl">
      {/* رأس المحادثة */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
        <div className="flex items-center gap-3.5">
          <Link
            href="/messages"
            className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="العودة لصندوق الرسائل"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <AvatarWithFrame
            avatarUrl={otherUser.avatarUrl}
            name={otherUser.displayName}
            frameId={otherUser.avatarFrameId}
            size="md"
            level={otherUser.level}
            showLevel
          />

          <div>
            <div className="flex items-center gap-2">
              <Link
                href={otherUser.username ? `/p/${otherUser.username}` : `/p/${otherUser.id}`}
                className="text-xs sm:text-sm font-extrabold text-foreground hover:text-gold transition-colors"
              >
                {otherUser.displayName}
              </Link>
              <span className="text-[10px] rounded-full bg-gold/15 text-gold px-2 py-0.2 font-black">
                مستوى {otherUser.level}
              </span>
            </div>
            {otherUser.username && (
              <p className="text-[11px] font-mono text-muted-foreground" dir="ltr">
                @{otherUser.username}
              </p>
            )}
          </div>
        </div>

        <Link
          href={otherUser.username ? `/p/${otherUser.username}` : `/p/${otherUser.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          الملف الشخصي
        </Link>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar bg-background/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 text-gold/60 mb-2" />
            <h4 className="text-sm font-extrabold text-foreground">
              بداية المحادثة مع «{otherUser.displayName}»
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              أرسل رسالتك الأولى لبدء الدردشة والنقاش حول أنشطة ومشاريع اللجنة التكنولوجية.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex ${msg.mine ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-5 whitespace-pre-wrap break-words ${
                    msg.mine
                      ? "bg-gold text-night rounded-tr-none font-bold"
                      : "bg-muted border border-border text-foreground rounded-tl-none font-medium"
                  }`}
                >
                  <p>{msg.body}</p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      msg.mine ? "text-night/70" : "text-muted-foreground"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {msg.mine && (
                      <span>
                        {msg.readAt ? (
                          <CheckCheck className="h-3.5 w-3.5 text-blue-700" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإرسال */}
      <form onSubmit={handleSend} className="border-t border-border p-3 sm:p-4 bg-muted/30">
        <div className="relative flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
            rows={1}
            maxLength={1000}
            className="flex-1 max-h-32 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-4 ps-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none"
          />

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
    </div>
  );
}

