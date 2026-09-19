"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageSquare,
  MessageCircle,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Sparkles,
  Loader2,
  ExternalLink,
  Shield,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { respondToFriendRequest, sendFriendRequest, searchStudents } from "@/actions/social";
import { GRADE_LABELS, GENDER_LABELS } from "@/lib/constants";
import type { UnifiedConversation } from "@/actions/messaging";
import type { PendingRequestItem } from "./friends-manager";

interface MessagingHubProps {
  conversations: UnifiedConversation[];
  initialPendingRequests: PendingRequestItem[];
  currentUserId: string;
  initialTab?: "conversations" | "requests" | "search";
}

export function MessagingHub({
  conversations,
  initialPendingRequests,
  currentUserId,
  initialTab = "conversations",
}: MessagingHubProps) {
  const [activeTab, setActiveTab] = useState<"conversations" | "requests" | "search">(
    initialPendingRequests.length > 0 && initialTab === "requests"
      ? "requests"
      : initialTab
  );

  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [convFilter, setConvFilter] = useState<"ALL" | "DIRECT" | "TEAM" | "ACTIVITY">("ALL");
  const [convSearch, setConvSearch] = useState("");

  // حالة البحث عن زملاء جدد
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  // تصفية المحادثات
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (convFilter !== "ALL" && c.type !== convFilter) return false;
      if (convSearch.trim()) {
        const q = convSearch.toLowerCase().trim();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesSub = c.subtitle?.toLowerCase().includes(q);
        const matchesMsg = c.lastMessage?.body.toLowerCase().includes(q);
        return matchesTitle || matchesSub || matchesMsg;
      }
      return true;
    });
  }, [conversations, convFilter, convSearch]);

  const handleAcceptRequest = (reqId: string, name: string) => {
    startTransition(async () => {
      const res = await respondToFriendRequest(reqId, true);
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
        toast.success(`تم قبول طلب الصداقة من «${name}» 🎉`);
      } else {
        toast.error(res.error || "فشل قبول الطلب");
      }
    });
  };

  const handleDeclineRequest = (reqId: string) => {
    startTransition(async () => {
      const res = await respondToFriendRequest(reqId, false);
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
        toast.info("تم رفض طلب الصداقة");
      } else {
        toast.error(res.error || "فشل رفض الطلب");
      }
    });
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.info("أدخل حرفين على الأقل للبحث");
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchStudents(searchQuery);
      setSearchResults(results);
    } catch {
      toast.error("تعذر البحث حالياً");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = (targetUserId: string, name: string) => {
    startTransition(async () => {
      const res = await sendFriendRequest(targetUserId);
      if (res.ok) {
        toast.success(`تم إرسال طلب الصداقة إلى «${name}»! 👥`);
        setSearchResults((prev) =>
          prev.map((s) =>
            s.id === targetUserId
              ? { ...s, friendship: { status: "PENDING", isSender: true } }
              : s
          )
        );
      } else {
        toast.error(res.error || "تعذر إرسال الطلب");
      }
    });
  };

  const filteredSearchResults = searchResults.filter((s) => {
    if (genderFilter === "ALL") return true;
    return s.gender === genderFilter;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── الرأس والتبويبات الرئيسية ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            الرسائل والمحادثات 💬
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            مركز التواصل الموحد: محادثاتك الخاصة، شاتات الفرق والأنشطة، وقائمة الزملاء.
          </p>
        </div>

        {/* التبويبات الثلاثة الموحدة */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("conversations")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
              activeTab === "conversations"
                ? "bg-gold text-night shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>المحادثات</span>
            {conversations.length > 0 && (
              <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-[10px]">
                {conversations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all relative ${
              activeTab === "requests"
                ? "bg-gold text-night shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>الطلبات</span>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.2 text-[10px] font-black animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
              activeTab === "search"
                ? "bg-gold text-night shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>بحث عن زملاء</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── التبويب 1: المحادثات النشطة ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "conversations" && (
        <div className="space-y-4">
          {/* شريط البحث وتصفية النوع */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="ابحث في محادثاتك..."
                className="w-full rounded-2xl border border-border bg-card py-2 pe-4 ps-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "ALL", label: "الكل" },
                { key: "DIRECT", label: "أصدقاء 👤" },
                { key: "TEAM", label: "فرق 🛡️" },
                { key: "ACTIVITY", label: "أنشطة 💬" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setConvFilter(pill.key as any)}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition-all shrink-0 ${
                    convFilter === pill.key
                      ? "bg-gold/20 text-gold border border-gold/40 shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-extrabold text-foreground">
                {convSearch || convFilter !== "ALL"
                  ? "لا توجد محادثات تطابق بحثك"
                  : "لا توجد محادثات نشطة بعد"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                ابحث عن زملائك بالكلية وأرسل لهم طلبات صداقة، أو انضم للفرق والأنشطة لبدء الدردشة.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all shadow"
              >
                <UserPlus className="h-4 w-4" />
                البحث عن زملاء جدد
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
              {filteredConversations.map((c) => {
                const isDirect = c.type === "DIRECT";
                const isTeam = c.type === "TEAM";

                return (
                  <Link
                    key={`${c.type}-${c.id}`}
                    href={c.href}
                    className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors gap-3.5 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {isDirect ? (
                        <AvatarWithFrame
                          avatarUrl={c.avatarUrl}
                          name={c.title}
                          frameId={c.avatarFrameId}
                          size="md"
                          level={c.level}
                          showLevel
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl shadow-inner group-hover:scale-105 transition-transform"
                          style={{
                            backgroundColor: `${c.color || "#c9a45c"}15`,
                            borderColor: `${c.color || "#c9a45c"}35`,
                          }}
                        >
                          {c.icon || (isTeam ? "🛡️" : "💬")}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-gold transition-colors truncate">
                            {c.title}
                          </h3>

                          {isTeam && (
                            <span className="rounded-full bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.2 text-[9px] font-black">
                              فريق
                            </span>
                          )}

                          {c.type === "ACTIVITY" && (
                            <span className="rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-black">
                              نشاط
                            </span>
                          )}

                          {c.subtitle && (
                            <span className="text-[10px] font-mono text-muted-foreground truncate" dir="ltr">
                              {c.subtitle}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                          {c.lastMessage ? (
                            <span className={c.unreadCount > 0 ? "font-bold text-foreground" : ""}>
                              {c.lastMessage.mine && "أنت: "}
                              {c.lastMessage.body}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground/60">
                              لا توجد رسائل بعد — انقر للبدء
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {c.lastMessage && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}

                      {c.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-black text-night shadow">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── التبويب 2: طلبات الصداقة ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-extrabold text-foreground">
                لا توجد طلبات صداقة معلقة
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                عندما يرسل لك زملاؤك بالمنصة طلبات صداقة ستظهر هنا مع إيضاح الاسم والبيانات والجنس لتحديد رغبتك بالقبول.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <AvatarWithFrame
                      avatarUrl={req.avatarUrl}
                      name={req.name}
                      frameId={req.avatarFrameId}
                      size="lg"
                      level={req.level}
                      showLevel
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={req.username ? `/p/${req.username}` : `/p/${req.senderId}`}
                        className="truncate text-xs sm:text-sm font-extrabold text-foreground hover:text-gold transition-colors block"
                      >
                        {req.name}
                      </Link>
                      {req.username && (
                        <span className="text-[11px] font-mono text-gold-light/90 block truncate" dir="ltr">
                          @{req.username}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span
                          className={`rounded-full px-2 py-0.5 border ${
                            req.gender === "FEMALE"
                              ? "border-pink-500/40 text-pink-500 bg-pink-500/10"
                              : "border-blue-500/40 text-blue-500 bg-blue-500/10"
                          }`}
                        >
                          {req.gender === "FEMALE" ? "طالبة 👩‍🎓" : "طالب 👨‍🎓"}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {GRADE_LABELS[req.grade] ?? "—"}
                        </span>
                        <span className="rounded-full bg-gold/10 text-gold px-2 py-0.5">
                          مستوى {req.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeclineRequest(req.id)}
                      className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      رفض
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAcceptRequest(req.id, req.name)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-all shadow-sm"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      قبول الطلب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── التبويب 3: البحث عن زملاء ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم الكامل أو المعرف مثل @ahmed..."
                className="w-full rounded-2xl border border-border bg-card py-2.5 pe-4 ps-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-gold px-6 py-2.5 text-xs font-extrabold text-night hover:bg-gold-light transition-all shadow-md shrink-0"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              بحث
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">تصفية:</span>
              {[
                { key: "ALL", label: "الكل" },
                { key: "MALE", label: "الشباب 👨‍🎓" },
                { key: "FEMALE", label: "البنات 👩‍🎓" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setGenderFilter(pill.key as any)}
                  className={`rounded-xl px-3 py-1 text-xs font-extrabold transition-all ${
                    genderFilter === pill.key
                      ? "bg-gold text-night shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

          {filteredSearchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSearchResults.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-gold/40"
                >
                  <div className="flex items-start gap-3">
                    <AvatarWithFrame
                      avatarUrl={student.avatarUrl}
                      name={student.fullName}
                      frameId={student.avatarFrameId}
                      size="md"
                      level={student.level}
                      showLevel
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={student.username ? `/p/${student.username}` : `/p/${student.id}`}
                        className="truncate text-xs font-extrabold text-foreground hover:text-gold transition-colors block"
                      >
                        {student.displayName || student.fullName}
                      </Link>
                      {student.username && (
                        <span className="text-[10px] font-mono text-gold-light/90 block truncate" dir="ltr">
                          @{student.username}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span
                          className={`rounded-full px-1.5 py-0.2 border ${
                            student.gender === "FEMALE"
                              ? "border-pink-500/30 text-pink-500 bg-pink-500/10"
                              : "border-blue-500/30 text-blue-500 bg-blue-500/10"
                          }`}
                        >
                          {student.gender === "FEMALE" ? "طالبة" : "طالب"}
                        </span>
                        <span className="text-muted-foreground">{GRADE_LABELS[student.grade] ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                    <Link
                      href={student.username ? `/p/${student.username}` : `/p/${student.id}`}
                      className="text-[11px] font-bold text-muted-foreground hover:text-gold flex items-center gap-1"
                    >
                      الملف الشخصي
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {student.friendship?.status === "ACCEPTED" ? (
                      <Link
                        href={`/messages/${student.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-gold/15 px-3 py-1 text-[11px] font-extrabold text-gold"
                      >
                        <MessageSquare className="h-3 w-3" />
                        مراسلة ✓
                      </Link>
                    ) : student.friendship?.status === "PENDING" ? (
                      <span className="text-[11px] font-bold text-amber-500">
                        معلق...
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSendFriendRequest(student.id, student.fullName)}
                        className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-1 text-[11px] font-extrabold text-night hover:bg-gold-light transition-all shadow-sm"
                      >
                        <UserPlus className="h-3 w-3" />
                        إضافة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              لا توجد نتائج تطابق الفلتر المحدد.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
