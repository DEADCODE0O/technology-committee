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
  Mic,
  Camera,
  Search,
} from "lucide-react";
import {
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  getChatRoomMessages,
} from "@/actions/chat";
import { reportEntity } from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { ChatAudioPlayer } from "./chat-audio-player";
import { MessageActionSheet } from "./message-action-sheet";
import { compressImageClient } from "@/lib/client-compress";

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

  // ── التكيف الذكي مع لوحة المفاتيح عبر visualViewport ──
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // ── حالات الإجراءات، الرد، التعديل، والبحث ──
  const [selectedMessage, setSelectedMessage] = useState<ChatMessageItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; snippet: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; body: string } | null>(null);
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

  // ── الإبلاغ والحذف ──
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
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
          type: "room",
          targetId: room.id,
          ...(afterTime ? { afterTime } : {}),
          ...(afterId ? { afterId } : {}),
        });

        const res = await fetch(`/api/chat/poll?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.ok && data.hasNew && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const additions = data.messages.filter((m: ChatMessageItem) => !existingIds.has(m.id));
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
  }, [room.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // ── 3. إرسال الرسالة في المجموعة ──
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

    // إرسال رسالة جديدة
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

  // ── 4. التسجيل الصوتي في المجموعة (Opus 24kbps فائق التوفير) ──
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
            // سقف دقيقة واحدة لحماية المساحة والباندويث
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
      const formData = new FormData();
      formData.append("file", blob, "group_voice.webm");
      formData.append("type", "AUDIO");

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل رفع الصوت");

      const voiceBody = `[VOICE]:${data.url}:${durationSec}`;
      const sendRes = await sendChatMessage(room.id, voiceBody);
      if (sendRes.ok) {
        toast.success("تم إرسال الرسالة الصوتية في المجموعة 🎤");
      }
    } catch (err) {
      toast.error("تعذر إرسال التسجيل الصوتي");
    } finally {
      setIsSending(false);
    }
  };

  // ── 5. إرسال الصور في المجموعة مع ضغط الكانفاس التلقائي ──
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 15 ميجابايت)");
      return;
    }

    setIsUploadingMedia(true);
    try {
      // ضغط الصورة برمجياً على الكانفاس لتخفيض حجمها 90%+
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
      const sendRes = await sendChatMessage(room.id, photoBody);
      if (sendRes.ok) {
        toast.success("تم إرسال الصورة في المجموعة 📸");
      }
    } catch (err) {
      toast.error("فشل إرسال الصورة");
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── 6. حذف رسالة المجموعة ──
  const handleDelete = (msgId: string) => {
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

  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.body.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : messages;

  return (
    <div
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className="flex flex-col h-full w-full rounded-none sm:rounded-3xl border-0 sm:border border-border bg-card overflow-hidden shadow-2xl relative"
    >
      {/* ── مدخل مخفي لاختيار الصور ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* ── 1. رأس الشات الجماعي (Sticky Mobile Header) ── */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/40 backdrop-blur-xl shrink-0 z-20">
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
            <div className="flex items-center gap-1.5">
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

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="بحث في رسائل المجموعة"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="flex h-10 items-center gap-1 rounded-xl border border-border bg-card/60 px-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            title="تعليمات الشات"
          >
            <Info className="h-4 w-4 text-gold" />
            <span className="hidden sm:inline">القواعد</span>
          </button>
        </div>
      </div>

      {/* ── شريط البحث في المجموعة ── */}
      {searchOpen && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 border-b border-border animate-in fade-in duration-150 shrink-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 ms-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في رسائل المجموعة..."
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

      {/* ── شريط الإرشادات التفاعلي ── */}
      {showGuidelines && (
        <div className="bg-gold/10 border-b border-gold/20 p-3 text-xs text-foreground flex items-start gap-2.5 shrink-0 animate-in fade-in duration-150">
          <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-black text-gold">ميثاق المحادثة في مجتمع اللجنة:</p>
            <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
              <li>الاحترام المتبادل والابتعاد عن النقاشات غير اللائقة.</li>
              <li>الرسائل مراقبة ومفلترة آلياً لحماية جميع الطلاب والطالبات.</li>
              <li>يمكنك الرد على أي رسالة، وتعديل رسائلك، أو حذفها.</li>
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

      {/* ── 2. مساحة الرسائل بأسلوب تليجرام/واتساب ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 custom-scrollbar bg-background/40 relative">
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-gold" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground">
              {searchQuery ? "لا توجد رسائل تطابق بحثك" : `لا توجد رسائل بعد في ${room.name}`}
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              كن أول من يبدأ المحادثة ويرحب بالزملاء وأعضاء اللجنة التكنولوجية!
            </p>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
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

            const prevMsg = displayedMessages[idx - 1];
            const showDateHeader =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

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
                  className={`flex group items-end gap-2 ${
                    isMe ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* زر النقاط الثلاثة السريع */}
                  {!msg.isDeleted && (
                    <button
                      type="button"
                      onClick={() => setSelectedMessage(msg)}
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer rounded-lg hover:bg-muted/60"
                      title="خيارات الرسالة (تعديل، حذف، رد)"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  )}

                  {/* فقاعة الرسالة */}
                  <div
                    onClick={() => !msg.isDeleted && setSelectedMessage(msg)}
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words cursor-pointer transition-all hover:ring-2 hover:ring-gold/30 active:scale-[0.99] ${
                      isMe
                        ? "bg-gold/15 dark:bg-gold/20 text-foreground border border-gold/30 rounded-tr-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    {/* شريط اقتباس الرد إن وجد */}
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
                          onClick={(e) => e.stopPropagation()}
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

                    {/* محتوى التسجيل الصوتي */}
                    {isVoice && voiceSrc && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ChatAudioPlayer
                          src={voiceSrc}
                          durationSec={voiceDuration}
                          isMine={isMe}
                        />
                      </div>
                    )}

                    {/* نص الرسالة العادية */}
                    {!isImage && !isVoice && (
                      <p className={`${msg.isDeleted ? "italic opacity-70" : ""}`}>
                        {msg.body}
                      </p>
                    )}

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

      {/* ── 3. شريط الرد المعلق أو التعديل المعلق ── */}
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

      {/* ── 4. شريط إدخال الرسائل بالصوت والصورة والكتابة ── */}
      <div className="border-t border-border p-2 sm:p-3 bg-muted/30 backdrop-blur-md shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {isRecording ? (
          <div className="flex items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-red-500 text-xs font-black ms-2">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
              <span>جاري تسجيل صوتي للمجموعة: {recordingDuration} ثانية</span>
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
                title="إرسال الصوت"
              >
                <Send className="h-4 w-4 -rotate-90" />
                <span>إرسال الصوت</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative flex items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={isUploadingMedia || isSending}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-gold hover:border-gold/50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="إرفاق صورة"
            >
              {isUploadingMedia ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>

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
                className="w-full max-h-28 min-h-[44px] rounded-2xl border border-border bg-card py-2.5 pe-12 ps-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none resize-none transition-all leading-relaxed"
              />
              <span
                className={`absolute bottom-2.5 left-3 text-[10px] font-mono pointer-events-none select-none ${
                  text.length > 450 ? "text-red-400 font-bold" : "text-muted-foreground/60"
                }`}
              >
                {text.length}/500
              </span>
            </div>

            {text.trim() || editingMessage ? (
              <button
                type="submit"
                disabled={!text.trim() || isSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-night hover:bg-gold-light active:scale-95 transition-all disabled:opacity-40 shadow-md cursor-pointer"
                title="إرسال"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 -rotate-90 text-night" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-gold hover:border-gold/50 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="تسجيل رسالة صوتية للمجموعة"
              >
                <Mic className="h-5 w-5 text-gold" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* ── 5. قائمة الإجراءات السفلية بنمط واتساب وتليجرام ── */}
      <MessageActionSheet
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        message={
          selectedMessage
            ? {
                id: selectedMessage.id,
                body: selectedMessage.body,
                mine: selectedMessage.user.id === currentUserId,
                authorName: selectedMessage.user.name,
              }
            : null
        }
        canEdit={selectedMessage?.user.id === currentUserId}
        canDeleteForEveryone={selectedMessage?.user.id === currentUserId || isAdmin}
        onReply={() => {
          if (selectedMessage) {
            setReplyingTo({
              id: selectedMessage.id,
              authorName: selectedMessage.user.name,
              snippet: selectedMessage.body,
            });
            textareaRef.current?.focus();
          }
        }}
        onEdit={() => {
          if (selectedMessage && selectedMessage.user.id === currentUserId) {
            handleStartEdit(selectedMessage);
          }
        }}
        onCopy={() => {
          if (selectedMessage) handleCopyText(selectedMessage.body);
        }}
        onDeleteForMe={() => {
          if (selectedMessage) handleDelete(selectedMessage.id);
        }}
        onDeleteForEveryone={() => {
          if (selectedMessage) handleDelete(selectedMessage.id);
        }}
        onReport={() => {
          if (selectedMessage) {
            setReportMessageId(selectedMessage.id);
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

      {/* ── 7. نافذة الإبلاغ عن محتوى ── */}
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