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
  Mic,
  Square,
  Image as ImageIcon,
  Camera,
  Search,
  X,
  Reply,
  Edit2,
  Smile,
} from "lucide-react";
import {
  sendDirectMessage,
  getConversationMessages,
  deleteDirectMessage,
  editDirectMessage,
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
import { ChatAudioPlayer } from "./chat-audio-player";
import { MessageActionSheet } from "./message-action-sheet";
import { compressImageClient } from "@/lib/client-compress";

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

  // ── التكيف الذكي مع لوحة المفاتيح عبر visualViewport ──
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // ── حالات الإجراءات، التعديل، الرد، والبحث ──
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── التسجيل الصوتي ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── رفع الصور ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // ── الإبلاغ والحظر ──
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "MESSAGE" | "PROFILE"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<"INAPPROPRIATE" | "SPAM" | "HARASSMENT" | "OTHER">("INAPPROPRIATE");
  const [reportDetails, setReportDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── 1. ربط الارتفاع بمستشعر visualViewport للهواتف ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
      updateHeight();
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
    };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  // تتبع أحدث الرسائل دائماً لاستخدامها في الاستعلام بالدلتا
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── 2. Smart Zero-Egress Delta Polling ──
  // - إيقاف تام للاستعلامات عند قفل الشاشة أو وضع التبويب في الخلفية (Page Visibility API)
  // - التباطؤ التلقائي عند خمول المحادثة (Adaptive Backoff: 4s -> 8s -> 20s)
  // - فحص التحديثات الخفيفة بنمط Delta Polling عبر /api/chat/poll بدون تكرار طلبات Auth
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;
    let lastActivityTime = Date.now();

    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };

    window.addEventListener("pointerdown", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });

    const poll = async () => {
      if (!isMounted) return;

      // 1) إذا كان التبويب في الخلفية أو شاشة الهاتف مغلقة: توقف كلياً (0 بايت Egress)
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      try {
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];
        const afterTime = lastMsg?.createdAt || "";
        const afterId = lastMsg?.id || "";

        const params = new URLSearchParams({
          type: "direct",
          targetId: otherUser.id,
          ...(afterTime ? { afterTime } : {}),
          ...(afterId ? { afterId } : {}),
        });

        const res = await fetch(`/api/chat/poll?${params.toString()}`);
        if (res.status === 410) {
          isMounted = false;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.ok && data.hasNew && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const additions = data.messages.filter((m: MessageItem) => !existingIds.has(m.id));
              if (additions.length > 0) {
                return [...prev, ...additions];
              }
              return prev;
            });
            lastActivityTime = Date.now();
          }
        }
      } catch {
        // Silent catch
      } finally {
        if (!isMounted) return;

        // حساب الفترة التالية حسب مدة الخمول:
        const idleMs = Date.now() - lastActivityTime;
        let nextInterval = 4000; // نشط: 4 ثوان
        if (idleMs > 120000) {
          nextInterval = 20000; // خامل جداً (أكثر من دقيقتين): 20 ثانية
        } else if (idleMs > 30000) {
          nextInterval = 8000; // خامل قليلاً (أكثر من 30 ثانية): 8 ثوان
        }

        timer = setTimeout(poll, nextInterval);
      }
    };

    // عند العودة للتبويب من شاشة القفل: فحص فوري
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastActivityTime = Date.now();
        if (timer) clearTimeout(timer);
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // جدولة أول فحص بعد 4 ثوان
    timer = setTimeout(poll, 4000);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [otherUser.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // ── 3. إرسال الرسالة (عادية / تعديل / رد) ──
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || isSending) return;

    // إذا كان تعديل رسالة قائمة
    if (editingMessage) {
      setIsSending(true);
      const res = await editDirectMessage(editingMessage.id, clean);
      setIsSending(false);

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? { ...m, body: clean } : m))
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

    // إرسال جديد
    setIsSending(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let finalBody = clean;
    if (replyingTo) {
      const author = replyingTo.mine ? "أنت" : otherUser.displayName;
      const snippet = replyingTo.body.slice(0, 80);
      finalBody = `[REPLY]:${author}:${snippet}\n${clean}`;
      setReplyingTo(null);
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      receiverId: otherUser.id,
      body: finalBody,
      readAt: null,
      createdAt: new Date().toISOString(),
      mine: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendDirectMessage(otherUser.id, finalBody);
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

  // ── 4. التسجيل الصوتي الحقيقي فائق الضغط عبر MediaRecorder (Opus 24kbps) ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 24000, // Opus 24kbps نقي جداً للصوت البشري وحجمه 30KB فقط لكل 10 ثوان
      };
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: options.mimeType || "audio/webm",
        });
        if (audioBlob.size > 0 && recordingDuration > 0) {
          await uploadAndSendAudio(audioBlob, recordingDuration);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            // الحد الأقصى 60 ثانية لحماية الباندويث والتخزين
            stopRecording();
            toast.info("تم إنهاء التسجيل تلقائياً عند الحد الأقصى (دقيقة واحدة) ⏱️");
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("يرجى منح صلاحية الميكروفون لتسجيل الرسائل الصوتية 🎙️");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      toast.info("تم إلغاء التسجيل الصوتي");
    }
  };

  const uploadAndSendAudio = async (blob: Blob, durationSec: number) => {
    setIsSending(true);
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("file", blob, `voice_message.${ext}`);
      formData.append("type", "AUDIO");

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل رفع الصوت");

      const voiceBody = `[VOICE]:${data.url}:${durationSec}`;
      const sendRes = await sendDirectMessage(otherUser.id, voiceBody);
      if (sendRes.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: sendRes.messageId || `voice-${Date.now()}`,
            senderId: currentUserId,
            receiverId: otherUser.id,
            body: voiceBody,
            readAt: null,
            createdAt: new Date().toISOString(),
            mine: true,
          },
        ]);
        toast.success("تم إرسال الرسالة الصوتية 🎤");
      }
    } catch (err) {
      toast.error("تعذر إرسال التسجيل الصوتي");
    } finally {
      setIsSending(false);
    }
  };

  // ── 5. إرسال الصور في الشات مع ضغط الكانفاس التلقائي ──
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)");
      return;
    }

    setIsUploadingMedia(true);
    try {
      // ضغط الصورة برمجياً على الكانفاس لتخفيض حجمها بنسبة 90%+ قبل إرسالها
      const compressed = await compressImageClient(file);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("type", "IMAGE");

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل رفع الصورة");

      const photoBody = `[IMAGE]:${data.url}`;
      const sendRes = await sendDirectMessage(otherUser.id, photoBody);
      if (sendRes.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: sendRes.messageId || `img-${Date.now()}`,
            senderId: currentUserId,
            receiverId: otherUser.id,
            body: photoBody,
            readAt: null,
            createdAt: new Date().toISOString(),
            mine: true,
          },
        ]);
        toast.success("تم إرسال الصورة بنجاح 📸");
      }
    } catch (err) {
      toast.error("فشل إرسال الصورة");
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── 6. حذف الرسائل (لدي فقط أو لدى الجميع) ──
  const handleDeleteMessage = (msgId: string, forEveryone: boolean) => {
    startTransition(async () => {
      const res = await deleteDirectMessage(msgId, forEveryone);
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        toast.success(forEveryone ? "تم حذف الرسالة لدى الجميع" : "تم حذف الرسالة من عندك");
      } else {
        toast.error(res.error || "تعذر حذف الرسالة");
      }
    });
  };

  const handleCopyText = (msgBody: string) => {
    let clean = msgBody;
    if (clean.startsWith("[REPLY]:")) {
      const lines = clean.split("\n");
      lines.shift();
      clean = lines.join("\n");
    }
    navigator.clipboard.writeText(clean);
    toast.success("تم نسخ نص الرسالة 📋");
  };

  const handleClearChat = () => {
    if (!confirm("هل أنت متأكد من مسح المحادثة بالكامل من عندك؟")) return;
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
    if (!confirm(`هل أنت متأكد من حظر «${otherUser.displayName}»؟`)) return;
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

  // تصفية الرسائل عند البحث
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.body.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : messages;

  return (
    <div
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className="flex flex-col h-full w-full rounded-none sm:rounded-3xl border-0 sm:border border-border bg-card overflow-hidden shadow-2xl relative"
    >
      {/* ── مدخل مخفي لاختيار الصور من الكاميرا أو المعرض ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* ── 1. رأس المحادثة بأسلوب واتساب الفاخر (Sticky Mobile Header) ── */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/40 backdrop-blur-xl shrink-0 z-20">
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
            className="shrink-0 transition-transform active:scale-95 relative"
            title={`ملف ${otherUser.displayName}`}
          >
            <AvatarWithFrame
              avatarUrl={otherUser.avatarUrl}
              name={otherUser.displayName}
              frameId={otherUser.avatarFrameId}
              size="md"
              level={otherUser.level}
              showLevel
            />
            {/* نقطة اتصال خضراء نابضة */}
            <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
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

            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>متصل الآن</span>
              {otherUser.username && <span className="opacity-70">· @{otherUser.username}</span>}
            </p>
          </div>
        </div>

        {/* أدوات المحادثة: بحث، ملف، قائمة الخيارات */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="بحث في المحادثة"
          >
            <Search className="h-4 w-4" />
          </button>

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
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
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

      {/* ── شريط البحث في الرسائل القابل للطي ── */}
      {searchOpen && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 border-b border-border animate-in fade-in duration-150 shrink-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 ms-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في رسائل المحادثة..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground text-xs"
            >
              مسح
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. مساحة الرسائل بخلفية واتساب ونظام التمرير فائق السلاسة ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar bg-background/40 relative">
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-gold" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground">
              {searchQuery ? "لا توجد رسائل تطابق بحثك" : `بداية المحادثة مع «${otherUser.displayName}»`}
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              {searchQuery
                ? "جرب البحث بكلمة أخرى"
                : "أرسل رسالة نصية، صورة، أو تسجيلاً صوتياً للتواصل والتنسيق."}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // هل نحتاج فاصل زمني لليوم؟
            const prevMsg = displayedMessages[idx - 1];
            const showDateHeader =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            // فحص محتوى الرسالة (صورة / صوت / رد / نص)
            const isImage = msg.body.startsWith("[IMAGE]:");
            const imageUrl = isImage ? msg.body.replace("[IMAGE]:", "") : null;

            const isVoice = msg.body.startsWith("[VOICE]:");
            let voiceSrc = "";
            let voiceDuration = 0;
            if (isVoice) {
              const parts = msg.body.replace("[VOICE]:", "").split(":");
              voiceSrc = parts[0];
              voiceDuration = parseInt(parts[1] || "0", 10);
            }

            const isReply = msg.body.startsWith("[REPLY]:");
            let replyAuthor = "";
            let replySnippet = "";
            let actualBody = msg.body;
            if (isReply) {
              const lines = msg.body.split("\n");
              const meta = lines[0].replace("[REPLY]:", "").split(":");
              replyAuthor = meta[0] || "";
              replySnippet = meta.slice(1).join(":") || "";
              actualBody = lines.slice(1).join("\n");
            }

            return (
              <div key={msg.id} className="space-y-2">
                {showDateHeader && (
                  <div className="flex items-center justify-center my-2 select-none">
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
                  {/* زر النقاط الثلاثة السريع بجانب الفقاعة */}
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(msg)}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer rounded-lg hover:bg-muted/60"
                    title="خيارات الرسالة (تعديل، حذف، رد)"
                    aria-label="خيارات الرسالة"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* فقاعة الرسالة (النقر عليها يفتح قائمة الإجراءات السفلية بنمط واتساب) */}
                  <div
                    onClick={() => setSelectedMessage(msg)}
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words cursor-pointer transition-all hover:ring-2 hover:ring-gold/30 active:scale-[0.99] ${
                      msg.mine
                        ? "bg-gold/15 dark:bg-gold/20 text-foreground border border-gold/30 rounded-tr-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    {/* اقتباس الرد إن وجد */}
                    {isReply && (
                      <div className="mb-2 rounded-xl p-2 text-xs border-s-3 bg-muted/60 border-gold text-muted-foreground">
                        <span className="font-extrabold text-gold block text-[11px]">
                          {replyAuthor}
                        </span>
                        <p className="line-clamp-1 italic text-[11px] mt-0.5">
                          {replySnippet}
                        </p>
                      </div>
                    )}

                    {/* محتوى الصورة */}
                    {isImage && imageUrl && (
                      <div className="rounded-xl overflow-hidden my-1 max-w-sm">
                        <img
                          src={imageUrl}
                          alt="صورة مرفقة"
                          className="w-full max-h-72 object-cover rounded-xl hover:opacity-95 transition-opacity"
                          loading="lazy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImage(imageUrl);
                          }}
                        />
                      </div>
                    )}

                    {/* محتوى التسجيل الصوتي بنمط واتساب */}
                    {isVoice && voiceSrc && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ChatAudioPlayer
                          src={voiceSrc}
                          durationSec={voiceDuration}
                          isMine={msg.mine}
                        />
                      </div>
                    )}

                    {/* محتوى النص العادي */}
                    {!isImage && !isVoice && <p>{actualBody}</p>}

                    {/* التوقيت وعلامات القراءة */}
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

      {/* ── 3. أشرطة الحالة العائمة (شريط الرد أو التعديل المعلق) ── */}
      {replyingTo && (
        <div className="bg-gold/10 border-t border-gold/25 px-4 py-2 flex items-center justify-between text-xs shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="h-4 w-4 text-gold shrink-0" />
            <div className="truncate">
              الرد على <strong className="font-black text-gold">{replyingTo.mine ? "نفسك" : otherUser.displayName}</strong>:{" "}
              <span className="text-muted-foreground italic truncate">
                {replyingTo.body.slice(0, 60)}
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
            <span>تعديل الرسالة (اضغط إرسال لحفظ التعديل)</span>
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

      {/* ── 4. شريط إدخال الرسائل بأسلوب واتساب المتمدد والملائم للكيبورد ── */}
      <div className="border-t border-border p-2 sm:p-3 bg-muted/30 backdrop-blur-md shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {isRecording ? (
          /* شريط التسجيل الصوتي المباشر */
          <div className="flex items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-red-500 text-xs font-black ms-2">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
              <span>جاري التسجيل: {recordingDuration} ثانية</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-xl hover:bg-muted cursor-pointer"
                title="إلغاء التسجيل"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-night font-black text-xs hover:bg-gold-light cursor-pointer shadow-md"
                title="إرسال التسجيل الصوتي"
              >
                <Send className="h-4 w-4 -rotate-90" />
                <span>إرسال الصوت</span>
              </button>
            </div>
          </div>
        ) : (
          /* حقل الكتابة العادي مع أزرار الصور والتسجيل */
          <form onSubmit={handleSend} className="relative flex items-end gap-1.5 sm:gap-2">
            {/* زر إضافة صورة من الهاتف */}
            <button
              type="button"
              disabled={isUploadingMedia || isSending}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-gold hover:border-gold/50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="إرفاق صورة"
              aria-label="إرفاق صورة"
            >
              {isUploadingMedia ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>

            {/* حقل الإدخال المتمدد تلقائياً */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  editingMessage
                    ? "اكتب النص الجديد للرسالة..."
                    : "اكتب رسالتك... (Enter للإرسال)"
                }
                rows={1}
                maxLength={1000}
                className="w-full max-h-28 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-4 ps-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none transition-all leading-relaxed"
              />
            </div>

            {/* زر الإرسال أو زر التسجيل الصوتي (إذا كان الحقل فارغاً) */}
            {text.trim() || editingMessage ? (
              <button
                type="submit"
                disabled={!text.trim() || isSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-night hover:bg-gold-light active:scale-95 transition-all disabled:opacity-40 shadow-md cursor-pointer"
                title="إرسال"
                aria-label="إرسال"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 -rotate-90 text-night" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-gold hover:border-gold/50 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="تسجيل رسالة صوتية (انقر للبدء)"
                aria-label="تسجيل صوتي"
              >
                <Mic className="h-5 w-5 text-gold" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* ── 5. قائمة الإجراءات السفلية التفاعلية بنمط واتساب/تليجرام ── */}
      <MessageActionSheet
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        message={selectedMessage}
        canEdit={selectedMessage?.mine ?? false}
        canDeleteForEveryone={selectedMessage?.mine ?? false}
        onReply={() => {
          if (selectedMessage) setReplyingTo(selectedMessage);
          textareaRef.current?.focus();
        }}
        onEdit={() => {
          if (selectedMessage) {
            setEditingMessage(selectedMessage);
            setText(selectedMessage.body);
            textareaRef.current?.focus();
          }
        }}
        onCopy={() => {
          if (selectedMessage) handleCopyText(selectedMessage.body);
        }}
        onDeleteForMe={() => {
          if (selectedMessage) handleDeleteMessage(selectedMessage.id, false);
        }}
        onDeleteForEveryone={() => {
          if (selectedMessage) handleDeleteMessage(selectedMessage.id, true);
        }}
        onReport={() => {
          if (selectedMessage) {
            setReportTarget({ type: "MESSAGE", id: selectedMessage.id });
            setReportModalOpen(true);
          }
        }}
        onReact={(emoji) => {
          toast.success(`تم التفاعل بـ ${emoji}`);
        }}
      />

      {/* ── 6. معاينة الصورة المكبرة ── */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 end-4 p-3 text-white hover:text-gold cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={expandedImage}
            alt="معاينة كاملة"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* ── 7. نافذة الإبلاغ المنبثقة ── */}
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
