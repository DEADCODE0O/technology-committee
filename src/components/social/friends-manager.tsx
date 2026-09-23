"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { respondToFriendRequest, removeFriend, sendFriendRequest, searchStudents } from "@/actions/social";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

export interface FriendItem {
  id: string;
  userId: string;
  username: string | null;
  name: string;
  gender: string;
  grade: string;
  section: string;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  level: number;
}

export interface PendingRequestItem {
  id: string; // friendship ID
  senderId: string;
  username: string | null;
  name: string;
  gender: string;
  grade: string;
  section: string;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  level: number;
  createdAt: string;
}

interface FriendsManagerProps {
  initialFriends: FriendItem[];
  initialPendingRequests: PendingRequestItem[];
  currentUserId: string;
}

export function FriendsManager({
  initialFriends,
  initialPendingRequests,
  currentUserId,
}: FriendsManagerProps) {
  const [activeTab, setActiveTab] = useState<"FRIENDS" | "REQUESTS" | "SEARCH">(
    initialPendingRequests.length > 0 ? "REQUESTS" : "FRIENDS"
  );
  const [friends, setFriends] = useState(initialFriends);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);

  // حالة البحث
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAccept = (reqId: string, name: string) => {
    startTransition(async () => {
      const res = await respondToFriendRequest(reqId, true);
      if (res.ok) {
        const acceptedReq = pendingRequests.find((r) => r.id === reqId);
        setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
        if (acceptedReq) {
          setFriends((prev) => [
            {
              id: reqId,
              userId: acceptedReq.senderId,
              username: acceptedReq.username,
              name: acceptedReq.name,
              gender: acceptedReq.gender,
              grade: acceptedReq.grade,
              section: acceptedReq.section,
              avatarUrl: acceptedReq.avatarUrl,
              avatarFrameId: acceptedReq.avatarFrameId,
              level: acceptedReq.level,
            },
            ...prev,
          ]);
        }
        toast.success(`تم قبول طلب الصداقة من «${name}» 🎉`);
      } else {
        toast.error(res.error || "فشل قبول الطلب");
      }
    });
  };

  const handleDecline = (reqId: string) => {
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

  const handleRemoveFriend = (otherUserId: string, name: string) => {
    if (!confirm(`هل أنت متأكد من إزالة «${name}» من قائمة أصدقائك؟`)) return;
    startTransition(async () => {
      const res = await removeFriend(otherUserId);
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.userId !== otherUserId));
        toast.success("تمت إزالة الصداقة");
      } else {
        toast.error(res.error || "فشل إزالة الصداقة");
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

  const handleAddFromSearch = (targetUserId: string, name: string) => {
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
    <div className="space-y-6">
      {/* التبويبات العلوية */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("FRIENDS")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            activeTab === "FRIENDS"
              ? "bg-gold text-night shadow-md"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>أصدقائي</span>
          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
            {friends.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REQUESTS")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            activeTab === "REQUESTS"
              ? "bg-gold text-night shadow-md"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>طلبات الصداقة</span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] animate-pulse font-black">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SEARCH")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            activeTab === "SEARCH"
              ? "bg-gold text-night shadow-md"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>البحث عن طلاب جدد</span>
        </button>
      </div>

      {/* ── تبويب أصدقائي ── */}
      {activeTab === "FRIENDS" && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-3 text-base font-extrabold text-foreground">
                ليس لديك أصدقاء بعد
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                ابحث عن زملائك بالاسم أو المعرف وأرسل لهم طلبات صداقة لبدء محادثات خاصة ممتعة!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("SEARCH")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all"
              >
                <Search className="h-4 w-4" />
                البحث عن طلاب
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {friends.map((friend) => (
                <div
                  key={friend.userId}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-gold/30 hover:shadow-md"
                >
                  <div className="flex items-start gap-3.5">
                    <AvatarWithFrame
                      avatarUrl={friend.avatarUrl}
                      name={friend.name}
                      frameId={friend.avatarFrameId}
                      size="lg"
                      level={friend.level}
                      showLevel
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={friend.username ? `/p/${friend.username}` : `/p/${friend.userId}`}
                        className="truncate text-xs sm:text-sm font-extrabold text-foreground hover:text-gold transition-colors block"
                      >
                        {friend.name}
                      </Link>
                      {friend.username && (
                        <span className="text-[11px] font-mono text-gold-light/90 block truncate" dir="ltr">
                          @{friend.username}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                        <span
                          className={`rounded-full px-2 py-0.2 border ${
                            friend.gender === "FEMALE"
                              ? "border-pink-500/30 text-pink-500 bg-pink-500/10"
                              : "border-blue-500/30 text-blue-500 bg-blue-500/10"
                          }`}
                        >
                          {GENDER_LABELS[friend.gender] ?? "—"}
                        </span>
                        <span>{GRADE_LABELS[friend.grade] ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">

                    <div className="flex items-center gap-1">
                      <Link
                        href={friend.username ? `/p/${friend.username}` : `/p/${friend.userId}`}
                        className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="عرض الملف الشخصي"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend.userId, friend.name)}
                        className="rounded-xl p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="إزالة من الأصدقاء"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تبويب طلبات الصداقة ── */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-3 text-base font-extrabold text-foreground">
                لا توجد طلبات صداقة معلقة
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                عندما يرسل لك زملاؤك بالمنصة طلبات صداقة ستظهر هنا مع إيضاح الاسم والبيانات والجنس لتحديد رغبتك في القبول بكل راحة.
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
                        {/* إظهار الجنس بوضوح فائق لتمكين الطالبات من القبول أو الرفض باطمئنان */}
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
                          {GRADE_LABELS[req.grade] ?? "—"} · {SECTION_LABELS[req.section] ?? "—"}
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
                      onClick={() => handleDecline(req.id)}
                      className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      رفض
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAccept(req.id, req.name)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-all shadow-sm"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      قبول الطلب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تبويب البحث عن طلاب ── */}
      {activeTab === "SEARCH" && (
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم الكامل أو اسم المستخدم مثل @ahmed..."
                className="w-full rounded-2xl border border-border bg-muted/40 py-2.5 pe-4 ps-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
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

          {/* فلاتر الجنس للبحث */}
          {searchResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">تصفية النتائج:</span>
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

          {/* نتائج البحث */}
          {filteredSearchResults.length > 0 && (
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
                      <span className="inline-flex items-center gap-1 rounded-xl bg-gold/15 px-3 py-1 text-[11px] font-extrabold text-gold">
                        أصدقاء ✓
                      </span>
                    ) : student.friendship?.status === "PENDING" ? (
                      <span className="text-[11px] font-bold text-amber-500">
                        معلق...
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAddFromSearch(student.id, student.fullName)}
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
          )}
        </div>
      )}
    </div>
  );
}

