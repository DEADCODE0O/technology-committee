"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  QrCode,
  Users,
  AlertTriangle,
  Send,
  Shield,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
  MessageCircle,
  FileText,
  UserCheck,
  Ban,
  Calendar,
  Layers,
} from "lucide-react";
import {
  sendAdministrativeBroadcast,
  resetStudentAbsenceStrikes,
  searchStudentsForSurveillance,
} from "@/actions/surveillance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCairoDate } from "@/lib/dates";
import { WhatsAppIcon, TelegramIcon } from "@/components/platform/community-links-card";

export interface LiveOperationsData {
  recentAttendance: {
    id: string;
    studentName: string;
    studentPhone: string;
    studentCode: string;
    grade: string;
    section: string;
    gender: string;
    sessionTitle: string;
    activityTitle: string;
    activityType: string;
    method: string;
    attendedAt: string;
    avatarUrl: string | null;
    level: number;
  }[];
  recentRegistrations: {
    id: string;
    fullName: string;
    phone: string;
    studentCode: string;
    grade: string;
    section: string;
    gender: string;
    status: string;
    source: string;
    waitlistOrder: number | null;
    sessionTitle: string;
    activityTitle: string;
    createdAt: string;
  }[];
  strikeStudents: {
    id: string;
    name: string;
    phone: string;
    studentCode: string;
    grade: string;
    section: string;
    gender: string;
    absenceStrikes: number;
    attendanceRestricted: boolean;
    avatarUrl: string | null;
  }[];
  recentAudits: {
    id: string;
    action: string;
    entity: string;
    summary: string;
    actorName: string;
    createdAt: string;
  }[];
  activities: { id: string; title: string; type: string }[];
  sessions: { id: string; title: string; startsAt: string }[];
}

export function SurveillanceManager({
  initialData,
}: {
  initialData: LiveOperationsData;
}) {
  const [activeTab, setActiveTab] = useState<"operations" | "broadcast" | "strikes" | "search" | "audits">("operations");
  const [data, setData] = useState<LiveOperationsData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Broadcast form state
  const [broadcastAudience, setBroadcastAudience] = useState<"ALL" | "ACTIVITY" | "SESSION" | "STRIKES">("ALL");
  const [broadcastActivityId, setBroadcastActivityId] = useState<string>(initialData.activities[0]?.id || "");
  const [broadcastSessionId, setBroadcastSessionId] = useState<string>(initialData.sessions[0]?.id || "");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<"NORMAL" | "URGENT" | "DIRECTIVE">("URGENT");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastActionLabel, setBroadcastActionLabel] = useState("");

  // Student search state
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Broadcast preset templates
  const applyTemplate = (type: "WHATSAPP" | "STARTING_SOON" | "STRIKE_WARNING") => {
    if (type === "WHATSAPP") {
      setBroadcastTitle("انضمام لجروب الواتساب الرسمي 💬");
      setBroadcastBody("يرجى من جميع الطلاب المقبولين الانضمام الفوري لمجموعة الواتساب الرسمية لاستلام التكليفات والمواد والتنسيق مع المدرب.");
      setBroadcastActionLabel("الانضمام لجروب الواتساب الآن 💬");
      setBroadcastPriority("URGENT");
    } else if (type === "STARTING_SOON") {
      setBroadcastTitle("تنبيه: الجلسة ستبدأ قريباً ⏰");
      setBroadcastBody("نذكركم ببدء فعاليات الورشة خلال دقائق. يرجى التواجد بالقاعة وتحضير كود الـ QR لتسجيل الحضور فور الدخول.");
      setBroadcastActionLabel("عرض بيانات المحاضرة ↗");
      setBroadcastPriority("URGENT");
    } else if (type === "STRIKE_WARNING") {
      setBroadcastTitle("تنبيه انضباط: حجز المقاعد والالتزام بالحضور ⚠️");
      setBroadcastBody("لوحظ تكرار غياب بعض المسجلين دون عذر مسبق. نذكركم بأن تكرار الغياب 3 مرات ينقل حسابك تلقائياً لقائمة الانتظار في الورش القادمة لإتاحة الفرصة للطلاب الملتزمين.");
      setBroadcastPriority("DIRECTIVE");
    }
  };

  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim()) return toast.error("عنوان التوجيه مطلوب");
    if (!broadcastBody.trim()) return toast.error("نص التوجيه مطلوب");

    startTransition(async () => {
      const res = await sendAdministrativeBroadcast({
        audience: broadcastAudience,
        activityId: broadcastAudience === "ACTIVITY" ? broadcastActivityId : undefined,
        sessionId: broadcastAudience === "SESSION" ? broadcastSessionId : undefined,
        title: broadcastTitle,
        body: broadcastBody,
        priority: broadcastPriority,
        actionUrl: broadcastActionUrl,
        actionLabel: broadcastActionLabel,
      });

      if (res.ok) {
        toast.success("تم إرسال التوجيه الإداري للطلاب بنجاح! 🚀");
        setBroadcastTitle("");
        setBroadcastBody("");
        setBroadcastActionUrl("");
        setBroadcastActionLabel("");
      } else {
        toast.error(res.error || "تعذر إرسال التوجيه");
      }
    });
  };

  const handleResetStrikes = (studentId: string, studentName: string) => {
    if (!confirm(`تصفير إنذارات الغياب للطالب «${studentName}» وإلغاء تقييد الحضور؟`)) return;
    startTransition(async () => {
      const res = await resetStudentAbsenceStrikes(studentId);
      if (res.ok) {
        toast.success("تم تصفير إنذارات الطالب وقبول العذر بنجاح");
        setData((prev) => ({
          ...prev,
          strikeStudents: prev.strikeStudents.filter((s) => s.id !== studentId),
        }));
      } else {
        toast.error(res.error || "تعذر تصفير الإنذارات");
      }
    });
  };

  const handleSearchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchStudentsForSurveillance(studentSearchQuery);
      setStudentSearchResults(results);
    } catch {
      toast.error("فشل البحث في الطلاب");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── التبويبات العلوية ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("operations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === "operations"
              ? "bg-gold text-night shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>العمليات المباشرة وQR ({data.recentAttendance.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === "broadcast"
              ? "bg-gold text-night shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>إرسال توجيه / رسالة جماعية بجروب 📢</span>
        </button>

        <button
          onClick={() => setActiveTab("strikes")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === "strikes"
              ? "bg-gold text-night shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>إنذارات الغياب وتقييد الأولوية ({data.strikeStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === "search"
              ? "bg-gold text-night shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>تفتيش ملفات الطلاب</span>
        </button>

        <button
          onClick={() => setActiveTab("audits")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === "audits"
              ? "bg-gold text-night shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>سجل أمان العمليات ({data.recentAudits.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── تبويب 1: العمليات المباشرة والـ QR ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* بطاقة تسجيلات الحضور بالـ QR */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">سجل فحص الـ QR المباشر</h3>
                    <p className="text-[11px] text-muted-foreground">أحدث الحاضرين في الوقت الفعلي</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  مباشر
                </span>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {data.recentAttendance.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">لم يتم تسجيل حضور مؤخراً</p>
                ) : (
                  data.recentAttendance.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs">
                          ✓
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate text-foreground">{a.studentName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {a.sessionTitle} · {a.activityTitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                          {a.method === "QR" ? "مسح QR 📱" : "تحضير يدوي ✍️"}
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5" dir="ltr">
                          {formatCairoDate(a.attendedAt, { hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* بطاقة أحدث التسجيلات في المنصة */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">أحدث طلبات التسجيل</h3>
                    <p className="text-[11px] text-muted-foreground">التسجيلات الأخيرة في الورش والكورسات</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{data.recentRegistrations.length} تسجيل</span>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {data.recentRegistrations.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">لا توجد تسجيلات حديثة</p>
                ) : (
                  data.recentRegistrations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-foreground">{r.fullName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {r.sessionTitle} · {r.activityTitle}
                        </p>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.status === "REGISTERED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : r.status === "WAITLIST"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {r.status === "REGISTERED"
                            ? "مقبول ✓"
                            : r.status === "WAITLIST"
                            ? `انتظار (#${r.waitlistOrder ?? 1})`
                            : "ملغي"}
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5" dir="ltr">
                          {formatCairoDate(r.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── تبويب 2: إرسال توجيه ورسالة جماعية بالجروبات ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "broadcast" && (
        <div className="max-w-3xl mx-auto rounded-3xl border border-gold/30 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">مركز الرسائل والتوجيهات الإدارية 📢</h2>
                <p className="text-xs text-muted-foreground">
                  بث تعليمات، روابط مجموعات واتساب، أو إشعارات عاجلة للطلاب مع زر إجراء مباشر في لوحتهم
                </p>
              </div>
            </div>
          </div>

          {/* نماذج سريعة جاهزة */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">قوالب جاهزة سريعة</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("WHATSAPP")}
                className="rounded-xl text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                دعوة لجروب الواتساب 💬
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("STARTING_SOON")}
                className="rounded-xl text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold"
              >
                ⏰ الجلسة ستبدأ قريباً
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("STRIKE_WARNING")}
                className="rounded-xl text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold"
              >
                ⚠️ تنبيه انضباط وإنذار غياب
              </Button>
            </div>
          </div>

          {/* اختيار الجمهور المستهدف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الجمهور المستهدف</Label>
              <select
                value={broadcastAudience}
                onChange={(e) => setBroadcastAudience(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
              >
                <option value="ALL">جميع طلاب المنصة المسجلين 👥</option>
                <option value="ACTIVITY">المسجلون في ورشة / كورس محدد 🎓</option>
                <option value="SESSION">المسجلون في جلسة / محاضرة محددة 📍</option>
                <option value="STRIKES">الطلاب ذوو إنذارات الغياب (تحذير مباشر) ⚠️</option>
              </select>
            </div>

            {/* تفاصيل الجمهور المخصص */}
            {broadcastAudience === "ACTIVITY" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اختر الورشة / الكورس</Label>
                <select
                  value={broadcastActivityId}
                  onChange={(e) => setBroadcastActivityId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
                >
                  {data.activities.map((act) => (
                    <option key={act.id} value={act.id}>{act.title}</option>
                  ))}
                </select>
              </div>
            )}

            {broadcastAudience === "SESSION" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اختر المحاضرة / الجلسة</Label>
                <select
                  value={broadcastSessionId}
                  onChange={(e) => setBroadcastSessionId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
                >
                  {data.sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">درجة الأهمية والظهور</Label>
              <select
                value={broadcastPriority}
                onChange={(e) => setBroadcastPriority(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
              >
                <option value="URGENT">🚨 عاجل ومثبت كبانر بأعلى اللوحة (موصى به)</option>
                <option value="DIRECTIVE">📢 توجيه إداري رسمي</option>
                <option value="NORMAL">ℹ️ إشعار عادي في صندوق الوارد</option>
              </select>
            </div>
          </div>

          {/* محتوى الرسالة */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">عنوان التوجيه / الرسالة</Label>
            <Input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="مثال: رابط مجموعة الواتساب الرسمية لورشة الذكاء الاصطناعي"
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">نص التوجيه والتعليمات</Label>
            <Textarea
              rows={4}
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="اكتب التوجيه أو الرسالة التي ستصل للطلاب..."
              className="text-xs leading-6"
            />
          </div>

          {/* زر الإجراء السريع (رابط جروب واتساب أو تليجرام أو غيره) */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 space-y-3">
            <p className="text-xs font-extrabold text-emerald-500 flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              زر الإجراء السريع للطلاب (اختياري — مثل رابط جروب الواتساب)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">رابط الإجراء (URL)</Label>
                <Input
                  dir="ltr"
                  value={broadcastActionUrl}
                  onChange={(e) => setBroadcastActionUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/... أو رابط تكليف"
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">نص الزر للطلاب</Label>
                <Input
                  value={broadcastActionLabel}
                  onChange={(e) => setBroadcastActionLabel(e.target.value)}
                  placeholder="مثال: الانضمام لجروب الواتساب 💬"
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSendBroadcast}
            disabled={isPending || !broadcastTitle.trim() || !broadcastBody.trim()}
            className="w-full h-11 rounded-xl bg-gold text-night font-black text-sm shadow-md hover:brightness-105"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال وبث التوجيه للطلاب فوراً 🚀"}
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── تبويب 3: إنذارات الغياب وتقييد الأولوية ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "strikes" && (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <span>⚠️ سجل إنذارات الغياب والالتزام</span>
                <span className="rounded-full bg-red-500/15 text-red-400 px-2.5 py-0.5 text-xs font-bold border border-red-500/30">
                  {data.strikeStudents.length} طلاب
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                الطلاب الذين تراكمت لديهم غيابات بدون عذر. بعد 3 غيابات يتم تقييد الأولوية ونقلهم لقائمة الانتظار تلقائياً.
              </p>
            </div>
          </div>

          {data.strikeStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-foreground">لا يوجد طلاب عليهم إنذارات غياب حالياً!</p>
              <p className="text-xs">جميع الطلاب ملتزمون بالحضور ولم يسجل أي غياب مقلق.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 pr-2">الطالب</th>
                    <th className="py-2.5">الهاتف</th>
                    <th className="py-2.5">الفرقة والشعبة</th>
                    <th className="py-2.5 text-center">عدد الغيابات</th>
                    <th className="py-2.5 text-center">حالة الأولوية</th>
                    <th className="py-2.5 text-left pl-2">إجراء إداري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.strikeStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2">
                        <p className="font-bold text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.studentCode}</p>
                      </td>
                      <td className="py-3 text-muted-foreground" dir="ltr">{s.phone}</td>
                      <td className="py-3 text-muted-foreground">{s.grade} · {s.section}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${
                          s.absenceStrikes >= 3
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : s.absenceStrikes === 2
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-yellow-500/15 text-yellow-400"
                        }`}>
                          {s.absenceStrikes} غياب
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {s.attendanceRestricted ? (
                          <span className="rounded-full bg-red-500/10 text-red-400 px-2.5 py-0.5 text-[10px] font-black border border-red-500/20">
                            ⛔ مقيد (ينقل للانتظار)
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">
                            طبيعي
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-left pl-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleResetStrikes(s.id, s.name)}
                          className="h-8 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          قبول العذر وتصفير الإنذار
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── تبويب 4: تفتيش والبحث في ملفات الطلاب ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <form onSubmit={handleSearchStudents} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب، كود الكارنيه، البريد، أو رقم الهاتف..."
                className="h-10 pr-10 text-xs"
              />
            </div>
            <Button type="submit" disabled={isSearching} className="h-10 rounded-xl bg-gold text-night font-bold text-xs px-5">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "بحث"}
            </Button>
          </form>

          {studentSearchResults.length > 0 && (
            <div className="space-y-3 pt-3">
              <p className="text-xs font-bold text-muted-foreground">نتائج البحث ({studentSearchResults.length}):</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentSearchResults.map((st) => (
                  <div key={st.id} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground">{st.displayName}</p>
                        <p className="text-xs text-muted-foreground">{st.email} · {st.phone}</p>
                      </div>
                      <span className="rounded-full bg-gold/15 text-gold-light px-2.5 py-0.5 text-xs font-bold">
                        مستوى {st.level}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                      <span>الكود: {st.studentCode}</span>
                      <span>·</span>
                      <span>الفرقة: {st.grade}</span>
                      <span>·</span>
                      <span>الشعبة: {st.section}</span>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetStrikes(st.id, st.displayName)}
                        className="h-7 text-[10px] rounded-lg text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        تصفير الإنذارات
                      </Button>
                      <Link
                        href={`/admin/students/${st.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-muted"
                      >
                        الملف الكامل ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── تبويب 5: سجل أمان العمليات ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "audits" && (
        <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              <span>سجل الأمان والعمليات الإدارية الحديثة</span>
            </h2>
            <span className="text-xs text-muted-foreground">{data.recentAudits.length} عملية</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {data.recentAudits.map((l) => (
              <div key={l.id} className="flex items-start justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs">
                <div>
                  <p className="font-bold text-foreground">{l.summary}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    المنفذ: {l.actorName} · الإجراء: {l.action}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">
                  {formatCairoDate(l.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}