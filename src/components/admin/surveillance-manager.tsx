"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Eye,
  Shield,
  ShieldAlert,
  MessageSquare,
  MessageCircle,
  Check,
  CheckCheck,
  AlertTriangle,
  Loader2,
  User,
  ExternalLink,
  Lock,
  Phone,
  Hash,
  Clock,
  X,
  ChevronLeft,
  Filter,
  EyeOff,
} from "lucide-react";
import {
  searchStudentsForSurveillance,
  getStudentConversationsForAdmin,
  getTranscriptBetweenStudents,
  toggleChatMessageVisibility,
  resolveReport,
} from "@/actions/surveillance";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

interface StudentSearchResult {
  id: string;
  username: string | null;
  displayName: string;
  email: string;
  phone: string;
  studentCode: string;
  gender: string;
  grade: string;
  section: string;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  level: number;
  lastActiveAt: Date | string | null;
  createdAt: Date | string;
  stats: {
    sentDirectMessages: number;
    receivedDirectMessages: number;
    publicChatMessages: number;
  };
}

interface ConversationItem {
  otherUser: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    avatarFrameId: string | null;
    phone: string;
    studentCode: string;
    gender: string;
    level: number;
  };
  totalMessages: number;
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: Date | string;
  };
}

interface TranscriptData {
  studentA: {
    id: string;
    name: string;
    username: string | null;
    phone: string;
    studentCode: string;
    avatarUrl: string | null;
  } | null;
  studentB: {
    id: string;
    name: string;
    username: string | null;
    phone: string;
    studentCode: string;
    avatarUrl: string | null;
  } | null;
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    body: string;
    createdAt: string;
    readAt: string | null;
    status: string;
  }[];
}

interface PublicChatMessage {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  room: { id: string; name: string; type: string };
  user: {
    id: string;
    username: string | null;
    name: string;
    email: string;
    phone: string;
    studentCode: string;
    avatarUrl: string | null;
    avatarFrameId: string | null;
    level: number;
  };
}

interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface SurveillanceManagerProps {
  initialChatMessages: PublicChatMessage[];
  initialReports: ReportItem[];
}

export function SurveillanceManager({
  initialChatMessages,
  initialReports,
}: SurveillanceManagerProps) {
  const [activeTab, setActiveTab] = useState<"direct" | "public" | "reports">("direct");

  // ── State for Tab 1: Direct Messages Shadow Mode ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptData | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // ── State for Tab 2: Public Chat Moderation ──
  const [chatMessages, setChatMessages] = useState<PublicChatMessage[]>(initialChatMessages);
  const [togglingMsgId, setTogglingMsgId] = useState<string | null>(null);

  // ── State for Tab 3: Reports Queue ──
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  // البحث عن طالب
  const handleSearchStudents = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchStudentsForSurveillance(searchQuery);
      setSearchResults(results as StudentSearchResult[]);
      if (results.length === 0) {
        toast.info("لم يتم العثور على أي طلاب يطابقون البحث");
      }
    } catch {
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsSearching(false);
    }
  };

  // اختيار طالب وجلب محادثاته
  const handleSelectStudent = async (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setActiveTranscript(null);
    setIsLoadingConversations(true);
    try {
      const convs = await getStudentConversationsForAdmin(student.id);
      setConversations(convs as ConversationItem[]);
    } catch {
      toast.error("فشل جلب محادثات الطالب");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // فتح أرشيف المحادثة في وضع المراقب الخفي
  const handleOpenTranscript = async (otherStudentId: string) => {
    if (!selectedStudent) return;
    setIsLoadingTranscript(true);
    try {
      const transcript = await getTranscriptBetweenStudents(selectedStudent.id, otherStudentId);
      setActiveTranscript(transcript);
    } catch {
      toast.error("فشل فتح أرشيف المحادثة");
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // إخفاء/استعادة رسالة في الشات العام
  const handleToggleChatMessage = async (msgId: string, currentStatus: string) => {
    const willHide = currentStatus === "VISIBLE";
    setTogglingMsgId(msgId);
    try {
      const res = await toggleChatMessageVisibility(msgId, willHide);
      if (res.ok) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: willHide ? "HIDDEN" : "VISIBLE" } : m))
        );
        toast.success(willHide ? "تم إخفاء الرسالة بنجاح" : "تمت استعادة الرسالة بنجاح");
      } else {
        toast.error(res.error || "فشل تعديل حالة الرسالة");
      }
    } finally {
      setTogglingMsgId(null);
    }
  };

  // معالجة بلاغ
  const handleResolveReport = async (reportId: string, action: "REVIEWED" | "DISMISSED") => {
    setResolvingReportId(reportId);
    try {
      const res = await resolveReport(reportId, action);
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: action, resolvedAt: new Date().toISOString() } : r))
        );
        toast.success(action === "REVIEWED" ? "تم اعتماد مراجعة البلاغ" : "تم تجاهل البلاغ");
      } else {
        toast.error(res.error || "فشل معالجة البلاغ");
      }
    } finally {
      setResolvingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* شريط التبويبات العلوي */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all ${
            activeTab === "direct"
              ? "bg-gold text-night shadow-md"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-4 w-4" />
          فاحص المحادثات الخاصة (Shadow Mode)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all ${
            activeTab === "public"
              ? "bg-gold text-night shadow-md"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          مراقبة الشات العام ({chatMessages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all ${
            activeTab === "reports"
              ? "bg-gold text-night shadow-md"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          البلاغات والشكاوى ({reports.filter((r) => r.status === "PENDING").length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  التبويب 1: فاحص المحادثات الخاصة في وضع المراقب الخفي        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "direct" && (
        <div className="space-y-6">
          {/* بنر توضيحي عن وضع المراقب الخفي */}
          <div className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4">
            <Lock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h3 className="font-black text-foreground">
                ضمان وضع المراقب الخفي (Stealth Surveillance Guarantee)
              </h3>
              <p className="text-muted-foreground leading-5">
                تصفحك لأي محادثة بين أي طالبين هنا يتم بصورة سرية تماماً للقراءة والتحقيق: لن يتم تعديل حالة قراءة الرسائل (Double ticks / Read receipts)، ولن يظهر للطرفين أن أحداً اطّلع على رسائلهم، مع الحفاظ الكامل على أمن وسلامة الطلاب.
              </p>
            </div>
          </div>

          {/* حقل البحث عن طالب */}
          <form onSubmit={handleSearchStudents} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب، كود الطالب، اسم المستخدم، البريد، أو الهاتف..."
                className="w-full rounded-2xl border border-border bg-card py-2.5 pr-10 pl-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2 rounded-2xl bg-gold px-5 text-xs font-black text-night hover:bg-gold-light transition-all disabled:opacity-50 shadow-md shrink-0"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "بحث وتحديد"}
            </button>
          </form>

          {/* نتائج البحث عن طلاب */}
          {searchResults.length > 0 && !selectedStudent && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground">نتائج البحث ({searchResults.length} طالب):</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card hover:border-gold/50 cursor-pointer transition-all shadow-sm hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithFrame
                        avatarUrl={s.avatarUrl}
                        name={s.displayName}
                        frameId={s.avatarFrameId}
                        size="md"
                        level={s.level}
                        showLevel
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-foreground truncate">{s.displayName}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">كود: {s.studentCode}</p>
                        <p className="text-[10px] text-muted-foreground">{s.phone}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-black">
                        {s.stats.sentDirectMessages + s.stats.receivedDirectMessages} رسالة
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* عند تحديد طالب: بطاقة الطالب + قائمة محادثاته */}
          {selectedStudent && (
            <div className="space-y-4">
              {/* بطاقة الطالب المحدد */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-gold/40 bg-card/80 shadow-md">
                <div className="flex items-center gap-3.5">
                  <AvatarWithFrame
                    avatarUrl={selectedStudent.avatarUrl}
                    name={selectedStudent.displayName}
                    frameId={selectedStudent.avatarFrameId}
                    size="lg"
                    level={selectedStudent.level}
                    showLevel
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground">{selectedStudent.displayName}</h3>
                      <span className="text-[10px] rounded-full bg-gold/15 text-gold px-2 py-0.5 font-black">
                        مستوى {selectedStudent.level}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground font-mono">
                      <span>كود: {selectedStudent.studentCode}</span>
                      <span>هاتف: {selectedStudent.phone}</span>
                      <span>البريد: {selectedStudent.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={selectedStudent.username ? `/p/${selectedStudent.username}` : `/p/${selectedStudent.id}`}
                    target="_blank"
                    className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    عرض الملف العام
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setActiveTranscript(null);
                    }}
                    className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    تغيير الطالب
                  </button>
                </div>
              </div>

              {/* شبكة: قائمة المحادثات + عارض الأرشيف */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* قائمة المحادثات (الزملاء الذين تحدث معهم) */}
                <div className="lg:col-span-4 space-y-2">
                  <h4 className="text-xs font-extrabold text-muted-foreground">
                    المحادثات الخاصة ({conversations.length}):
                  </h4>

                  {isLoadingConversations ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      لم يجرِ هذا الطالب أي محادثات خاصة بعد.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar">
                      {conversations.map((c) => {
                        const isSelected = activeTranscript?.studentB?.id === c.otherUser.id || activeTranscript?.studentA?.id === c.otherUser.id;
                        return (
                          <div
                            key={c.otherUser.id}
                            onClick={() => handleOpenTranscript(c.otherUser.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "border-gold bg-gold/10 shadow-sm"
                                : "border-border bg-card hover:border-gold/30 hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <AvatarWithFrame
                                  avatarUrl={c.otherUser.avatarUrl}
                                  name={c.otherUser.displayName}
                                  frameId={c.otherUser.avatarFrameId}
                                  size="sm"
                                  level={c.otherUser.level}
                                  showLevel={false}
                                />
                                <div className="min-w-0">
                                  <h5 className="text-xs font-black text-foreground truncate">
                                    {c.otherUser.displayName}
                                  </h5>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {c.otherUser.phone}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black rounded-full bg-muted px-2 py-0.5 text-muted-foreground shrink-0">
                                {c.totalMessages} رسالة
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1 italic bg-background/50 p-1.5 rounded-lg">
                              «{c.lastMessage.body}»
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* عارض أرشيف المحادثة في وضع المراقب الخفي */}
                <div className="lg:col-span-8 rounded-3xl border border-border bg-card overflow-hidden shadow-sm flex flex-col h-[580px]">
                  {isLoadingTranscript ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-gold mb-2" />
                      <p className="text-xs font-bold text-muted-foreground">
                        جارٍ فتح أرشيف المحادثة سرياً...
                      </p>
                    </div>
                  ) : !activeTranscript ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                      <Eye className="h-10 w-10 text-muted-foreground/40 mb-2" />
                      <h4 className="text-sm font-bold text-foreground">
                        اختر محادثة من القائمة لعرض أرشيف الرسائل
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        يمكنك قراءة المحادثة بأكملها بتوقيتاتها الأصلية بدون التأثير على أي علامات قراءة لدى الطلاب.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ترويسة المحادثة المفتوحة */}
                      <div className="p-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold text-foreground">
                            محادثة بين: {activeTranscript.studentA?.name} ({activeTranscript.studentA?.phone})
                          </span>
                          <span className="text-gold font-black">↔</span>
                          <span className="font-extrabold text-foreground">
                            {activeTranscript.studentB?.name} ({activeTranscript.studentB?.phone})
                          </span>
                        </div>
                        <span className="text-[10px] font-black rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          مراقب خفي
                        </span>
                      </div>

                      {/* الرسائل في الأرشيف */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-background/50">
                        {activeTranscript.messages.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground p-8">
                            لا توجد رسائل في هذا الأرشيف.
                          </p>
                        ) : (
                          activeTranscript.messages.map((m) => {
                            const isStudentA = m.senderId === activeTranscript.studentA?.id;
                            const timeStr = new Date(m.createdAt).toLocaleString("ar-EG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            return (
                              <div
                                key={m.id}
                                className={`flex ${isStudentA ? "justify-start" : "justify-end"}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl p-3 text-xs leading-5 break-words shadow-sm ${
                                    isStudentA
                                      ? "bg-muted border border-border text-foreground rounded-tr-none"
                                      : "bg-gold/15 border border-gold/30 text-foreground rounded-tl-none"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                                    <span className="font-bold text-foreground">{m.senderName}</span>
                                    <span>{timeStr}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap">{m.body}</p>
                                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                                    {m.readAt ? (
                                      <span className="text-blue-500 flex items-center gap-0.5">
                                        <CheckCheck className="h-3 w-3" /> تمت القراءة من الطرف الآخر ({new Date(m.readAt).toLocaleTimeString("ar-EG")})
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-0.5">
                                        <Check className="h-3 w-3" /> لم تُقرأ بعد
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  التبويب 2: مراقبة الشات العام والإشراف الفوري               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "public" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">
                سجل الرسائل الأخيرة في الشات العام
              </h3>
              <p className="text-xs text-muted-foreground">
                يمكنك إخفاء أي رسالة مخالفة بضغطة زر واحدة لتختفي فوراً من جميع الطلاب مع تسجيل التدقيق.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {chatMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  لا توجد رسائل مسجلة في الشات العام.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isHidden = msg.status === "HIDDEN";
                  const timeStr = new Date(msg.createdAt).toLocaleString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isHidden ? "bg-red-500/5 opacity-70" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <AvatarWithFrame
                          avatarUrl={msg.user.avatarUrl}
                          name={msg.user.name}
                          frameId={msg.user.avatarFrameId}
                          size="md"
                          level={msg.user.level}
                          showLevel={false}
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-foreground">{msg.user.name}</span>
                            <span className="text-[10px] rounded-full bg-gold/15 text-gold px-2 py-0.2 font-black">
                              مستوى {msg.user.level}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              كود: {msg.user.studentCode}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              هاتف: {msg.user.phone}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${isHidden ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {msg.body}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isHidden && (
                          <span className="rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black px-2.5 py-0.5">
                            مخفية عن الطلاب
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={togglingMsgId === msg.id}
                          onClick={() => handleToggleChatMessage(msg.id, msg.status)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                            isHidden
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                          }`}
                        >
                          {togglingMsgId === msg.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isHidden ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              استعادة
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              إخفاء الرسالة
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  التبويب 3: طابور البلاغات والشكاوى                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">
                البلاغات المقدمة من الطلاب ({reports.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                إشراف سريع على البلاغات المرفوعة بحق الرسائل أو الحسابات.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                لا توجد أي بلاغات مسجلة حالياً.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reports.map((r) => {
                  const isPending = r.status === "PENDING";
                  const timeStr = new Date(r.createdAt).toLocaleString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-foreground">
                            المُبلِّغ: {r.reporterName}
                          </span>
                          <span className="text-[10px] rounded-full bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.2 font-black">
                            سبب: {r.reason}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                        </div>
                        {r.details && (
                          <p className="text-xs text-muted-foreground italic">
                            «{r.details}»
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono">
                          نوع العنصر: {r.entityType} | المعرّف: {r.entityId}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              disabled={resolvingReportId === r.id}
                              onClick={() => handleResolveReport(r.id, "REVIEWED")}
                              className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 text-xs font-black hover:bg-emerald-500/25 transition-all"
                            >
                              تمت المراجعة
                            </button>
                            <button
                              type="button"
                              disabled={resolvingReportId === r.id}
                              onClick={() => handleResolveReport(r.id, "DISMISSED")}
                              className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                            >
                              تجاهل
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] rounded-full bg-muted text-muted-foreground px-2.5 py-1 font-bold">
                            الحالة: {r.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}