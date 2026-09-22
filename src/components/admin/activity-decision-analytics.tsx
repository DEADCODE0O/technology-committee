"use client";

import { useMemo } from "react";
import {
  Brain,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  Calendar,
  Download,
  BarChart3,
  Flame,
  ArrowDownRight,
  ShieldCheck,
} from "lucide-react";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";
import { toast } from "sonner";

interface RegistrationItem {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  grade: string | null;
  section: string | null;
  gender: string | null;
  status: string;
  userId: string | null;
  attendance: { present: boolean }[];
}

interface SessionItem {
  id: string;
  title: string;
  startsAt: string;
  seats: number;
  registrations: RegistrationItem[];
  attendance: { id: string }[];
}

interface ActivityDecisionAnalyticsProps {
  activity: {
    id: string;
    title: string;
    type: string;
    sessions: SessionItem[];
  };
}

export function ActivityDecisionAnalytics({ activity }: ActivityDecisionAnalyticsProps) {
  const {
    totalSeats,
    totalRegistered,
    totalPresent,
    attendanceRate,
    occupancyRate,
    sessionStats,
    retentionRate,
    dropOffRate,
    perfectAttendees,
    demographics,
    recommendations,
  } = useMemo(() => {
    let seatsSum = 0;
    let registeredSum = 0;
    let presentSum = 0;

    const studentSessionMap = new Map<string, { name: string; grade: string; section: string; phone: string; attendedSessions: number }>();

    const sessionsData = activity.sessions.map((sess, idx) => {
      seatsSum += sess.seats;
      const registered = sess.registrations.filter((r) => r.status === "REGISTERED");
      registeredSum += registered.length;

      const present = registered.filter((r) => r.attendance.some((a) => a.present));
      presentSum += present.length;

      // تتبع حضور كل طالب عبر الجلسات
      registered.forEach((r) => {
        const studentKey = r.userId || r.email || r.phone || r.fullName;
        const isPresent = r.attendance.some((a) => a.present);

        const current = studentSessionMap.get(studentKey) || {
          name: r.fullName,
          grade: r.grade || "UNKNOWN",
          section: r.section || "UNKNOWN",
          phone: r.phone || "",
          attendedSessions: 0,
        };

        if (isPresent) {
          current.attendedSessions += 1;
        }
        studentSessionMap.set(studentKey, current);
      });

      const rate = registered.length > 0 ? Math.round((present.length / registered.length) * 100) : 0;
      const occupancy = sess.seats > 0 ? Math.round((registered.length / sess.seats) * 100) : 0;

      return {
        id: sess.id,
        order: idx + 1,
        title: sess.title,
        startsAt: sess.startsAt,
        seats: sess.seats,
        registeredCount: registered.length,
        presentCount: present.length,
        absentCount: Math.max(0, registered.length - present.length),
        attendanceRate: rate,
        occupancyRate: occupancy,
      };
    });

    const overallAttendanceRate = registeredSum > 0 ? Math.round((presentSum / registeredSum) * 100) : 0;
    const overallOccupancyRate = seatsSum > 0 ? Math.round((registeredSum / seatsSum) * 100) : 0;

    // حساب معدل الاستبقاء والتسرب بين الجلسات الأولى والأخيرة
    let retention = 100;
    let dropOff = 0;
    if (sessionsData.length > 1 && sessionsData[0].presentCount > 0) {
      const firstPresent = sessionsData[0].presentCount;
      const lastPresent = sessionsData[sessionsData.length - 1].presentCount;
      retention = Math.round((lastPresent / firstPresent) * 100);
      dropOff = Math.max(0, 100 - retention);
    }

    // الطلاب الملتزمون بنسبة 100%
    const totalSessionsCount = activity.sessions.length;
    const perfectList: { name: string; grade: string; section: string; phone: string }[] = [];
    studentSessionMap.forEach((val) => {
      if (val.attendedSessions >= totalSessionsCount && totalSessionsCount > 0) {
        perfectList.push({
          name: val.name,
          grade: GRADE_LABELS[val.grade] || val.grade,
          section: SECTION_LABELS[val.section] || val.section,
          phone: val.phone,
        });
      }
    });

    // التوزيع الديموغرافي للمسجلين
    const gradeCounts: Record<string, number> = {};
    const sectionCounts: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};

    activity.sessions.forEach((s) => {
      s.registrations.forEach((r) => {
        if (r.status !== "REGISTERED") return;
        const g = r.grade || "UNKNOWN";
        const sec = r.section || "UNKNOWN";
        const gen = r.gender || "UNKNOWN";

        gradeCounts[g] = (gradeCounts[g] || 0) + 1;
        sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
        genderCounts[gen] = (genderCounts[gen] || 0) + 1;
      });
    });

    const formatBreakdown = (counts: Record<string, number>, labelMap: Record<string, string>) => {
      return Object.entries(counts).map(([k, cnt]) => ({
        label: labelMap[k] || (k === "UNKNOWN" ? "غير محدد" : k),
        count: cnt,
        percentage: registeredSum > 0 ? Math.round((cnt / registeredSum) * 100) : 0,
      })).sort((a, b) => b.count - a.count);
    };

    const byGrade = formatBreakdown(gradeCounts, GRADE_LABELS);
    const bySection = formatBreakdown(sectionCounts, SECTION_LABELS);
    const byGender = formatBreakdown(genderCounts, GENDER_LABELS);

    // 🤖 محرك القرارات الاستراتيجية والتوصيات
    const recs: { title: string; summary: string; action: string; severity: "SUCCESS" | "WARNING" | "INFO" }[] = [];

    // 1. قرار السعة والإقبال
    if (overallOccupancyRate >= 80) {
      recs.push({
        title: `🔥 إقبال استثنائي (نسبة الإشغال ${overallOccupancyRate}%)`,
        summary: `تم حجز معظم المقاعد المتاحة بالنشاط (${registeredSum} من أصل ${seatsSum} مقعد).`,
        action: `نوصي بفتح دفعة جديدة (Run #2) فوراً، أو زيادة عدد المقاعد بنسبة 25% لاستيعاب الطلاب الراغبين في الحضور.`,
        severity: "SUCCESS",
      });
    } else if (overallOccupancyRate < 45 && registeredSum > 0) {
      recs.push({
        title: `📢 فرصة لتعزيز التسجيل (نسبة الإشغال ${overallOccupancyRate}%)`,
        summary: `المقاعد الشاغرة ما زالت كثيرة (${seatsSum - registeredSum} مقعد متاح).`,
        action: `يُوصى بنشر مقتطف تعريفي أو فيديو تشويقي في مجتمع المنصة ومجموعات الدفعة، مع توضيح المكاسب العملية ونقاط XP الممنوحة.`,
        severity: "WARNING",
      });
    }

    // 2. قرار الحضور والالتزام
    if (overallAttendanceRate >= 75) {
      recs.push({
        title: `⭐ معدل حضور وتحويل مرتفع (${overallAttendanceRate}%)`,
        summary: `نسبة التزام الطلاب بالقدوم الفعلي للجلسات مرتفعة جداً مقارنة بالمسجلين.`,
        action: `استمرار نفس أسلوب التذكير والتنظيم، واعتماد المدرب والمكان الحاليين كمعيار للجلسات اللاحقة.`,
        severity: "SUCCESS",
      });
    } else if (overallAttendanceRate < 50 && registeredSum >= 5) {
      recs.push({
        title: `⚠️ تنبيه: فجوة بين التسجيل والحضور الفعلي (${overallAttendanceRate}%)`,
        summary: `أكثر من نصف المسجلين لم يحضروا الجلسات الفعلية.`,
        action: `تفعيل خاصية تأكيد الحضور قبل الموعد بـ 24 ساعة، وفرض سياسة حظر المقعد في حال الغياب المتكرر لإعطاء الفرصة لقائمة الانتظار.`,
        severity: "WARNING",
      });
    }

    // 3. قرار التسرب في الأنشطة متعددة المحاضرات
    if (sessionsData.length > 1 && dropOff > 20) {
      recs.push({
        title: `📉 تنبيه تسرب بين المحاضرات (انخفاض بنسبة ${dropOff}%)`,
        summary: `انخفض الحضور من ${sessionsData[0].presentCount} طالب في المحاضرة الأولى إلى ${sessionsData[sessionsData.length - 1].presentCount} في الأخيرة.`,
        action: `إرسال استبيان سريع للغائبين لمعرفة العوائق، توفير تسجيل مختصر للمحاضرة السابقة، وتخصيص مكافأة حضور متواصل (Streak Bonus).`,
        severity: "WARNING",
      });
    }

    // 4. قرار التكريم
    if (perfectList.length > 0) {
      recs.push({
        title: `🏆 تكريم الطلاب الملتزمين بنسبة 100% (${perfectList.length} طالب)`,
        summary: `أظهر هؤلاء الطلاب انضباطاً كاملاً وحضروا كافة الجلسات دون أي غياب.`,
        action: `إصدار شارة التفوق الأكاديمي تلقائياً ومنحهم +50 XP تقديراً لالتزامهم مع إدراجهم في كشف المتفوقين.`,
        severity: "INFO",
      });
    }

    // 5. قرار الفرقة الدراسية
    if (byGrade.length > 0 && byGrade[0].percentage >= 40) {
      recs.push({
        title: `🎯 الفئة الأكثر استهدافاً: ${byGrade[0].label} (${byGrade[0].percentage}%)`,
        summary: `تشكل هذه الفرقة النسبة الأكبر من الجمهور المهتم بهذا النشاط.`,
        action: `مراعاة جدول امتحانات ومحاضرات هذه الفرقة عند تحديد مواعيد الدفعات القادمة لضمان أقصى استفادة.`,
        severity: "INFO",
      });
    }

    return {
      totalSeats: seatsSum,
      totalRegistered: registeredSum,
      totalPresent: presentSum,
      attendanceRate: overallAttendanceRate,
      occupancyRate: overallOccupancyRate,
      sessionStats: sessionsData,
      retentionRate: retention,
      dropOffRate: dropOff,
      perfectAttendees: perfectList,
      demographics: {
        byGrade,
        bySection,
        byGender,
      },
      recommendations: recs,
    };
  }, [activity]);

  const exportCSV = () => {
    const rows: string[][] = [
      ["تقرير تحليلات النشاط واتخاذ القرار", activity.title],
      ["نوع النشاط", activity.type],
      ["إجمالي المقاعد", String(totalSeats)],
      ["إجمالي المسجلين", String(totalRegistered)],
      ["إجمالي الحضور الفعلي", String(totalPresent)],
      ["نسبة الحضور الفعلي", `${attendanceRate}%`],
      ["نسبة إشغال المقاعد", `${occupancyRate}%`],
      [],
      ["الجلسة / المحاضرة", "الموعد", "المقاعد", "المسجلون", "الحضور", "الغياب", "نسبة الحضور"],
    ];

    sessionStats.forEach((s) => {
      rows.push([
        s.title,
        new Date(s.startsAt).toLocaleDateString("ar-EG"),
        String(s.seats),
        String(s.registeredCount),
        String(s.presentCount),
        String(s.absentCount),
        `${s.attendanceRate}%`,
      ]);
    });

    rows.push([]);
    rows.push(["قائمة الطلاب الملتزمين بنسبة 100%"]);
    rows.push(["الاسم", "الفرقة", "الشعبة", "الهاتف"]);
    perfectAttendees.forEach((p) => {
      rows.push([p.name, p.grade, p.section, p.phone]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((e) => e.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_decision_${activity.id.slice(-6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير تقرير التحليلات والقرارات بنجاح! 📥");
  };

  return (
    <div className="space-y-6">
      {/* ── الرأس وزر التصدير ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-gold/30 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              لوحة التحليلات الذكية واتخاذ القرار 📊💡
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              مؤشرات الأداء الأكاديمي والتسرب السلوكي والتوصيات التنفيذية المباشرة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md shrink-0"
        >
          <Download className="h-4 w-4" />
          تصدير كشف التحليلات (CSV) 📥
        </button>
      </div>

      {/* ── بطاقات مؤشرات الأداء الرئيسية (KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1.5 text-2xl font-black text-foreground">{totalRegistered}</p>
          <p className="text-[11px] font-bold text-muted-foreground">طالب مسجل (من أصل {totalSeats} مقعد)</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
          <p className="mt-1.5 text-2xl font-black text-emerald-500">{totalPresent}</p>
          <p className="text-[11px] font-bold text-muted-foreground">حضور فعلي مسجل</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-gold" />
          <p className={`mt-1.5 text-2xl font-black ${attendanceRate >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
            {attendanceRate}%
          </p>
          <p className="text-[11px] font-bold text-muted-foreground">نسبة الحضور الفعلي</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Flame className="mx-auto h-5 w-5 text-gold" />
          <p className={`mt-1.5 text-2xl font-black ${occupancyRate >= 80 ? "text-gold" : "text-foreground"}`}>
            {occupancyRate}%
          </p>
          <p className="text-[11px] font-bold text-muted-foreground">نسبة إشغال الطاقة الاستيعابية</p>
        </div>
      </div>

      {/* 🤖 محرك التوصيات والقرارات الاستراتيجية التلقائية */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-gold/35 bg-gold/[0.06] p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold text-night">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                التوصيات والقرارات الاستراتيجية التلقائية (Executive Decisions) 🤖💡
              </h3>
              <p className="text-xs text-muted-foreground">
                قرارات تشغيلية وتنفيذية محسوبة ومبنية مباشرة على أرقام الحضور والتسجيل الفعلية
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  rec.severity === "SUCCESS"
                    ? "border-emerald-500/30 bg-card/90 dark:bg-card/70"
                    : rec.severity === "WARNING"
                    ? "border-amber-500/30 bg-card/90 dark:bg-card/70"
                    : "border-blue-500/30 bg-card/90 dark:bg-card/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  {rec.severity === "SUCCESS" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  {rec.severity === "WARNING" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  {rec.severity === "INFO" && <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />}
                  <h4 className="text-xs sm:text-sm font-black text-foreground">{rec.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.summary}</p>
                <div className="rounded-xl bg-muted/50 p-2.5 border border-border text-xs font-bold text-foreground">
                  <strong className="text-gold">القرار الموصى به: </strong>
                  {rec.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── مسار الحضور والتسرب عبر الجلسات (Funnel Tracker) ── */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gold" />
            مسار الحضور والتسرب عبر الجلسات والمحاضرات ({sessionStats.length})
          </h3>
          {sessionStats.length > 1 && (
            <span className="rounded-full bg-gold/15 text-gold px-3 py-1 text-[11px] font-black border border-gold/30">
              معدل الاستبقاء النهائي: {retentionRate}%
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessionStats.map((sess) => (
            <div
              key={sess.id}
              className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-gold/10 text-gold px-2.5 py-0.5 text-[10px] font-black border border-gold/20">
                  جلسة {sess.order}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(sess.startsAt))}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                {sess.title}
              </h4>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الحضور الفعلي:</span>
                  <span className="font-extrabold text-emerald-500">
                    {sess.presentCount} من {sess.registeredCount} ({sess.attendanceRate}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${sess.attendanceRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                  <span>إشغال المقاعد: {sess.occupancyRate}%</span>
                  <span>الغياب: {sess.absentCount} طالب</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── التوزيع الديموغرافي للمسجلين ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* حسب الفرقة */}
        <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gold" /> التوزيع حسب الفرقة الدراسية
          </h4>
          <div className="space-y-2">
            {demographics.byGrade.map((g) => (
              <div key={g.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className="text-foreground">{g.percentage}% ({g.count})</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${g.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* حسب الشعبة */}
        <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gold" /> التوزيع حسب الشعبة
          </h4>
          <div className="space-y-2">
            {demographics.bySection.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground">{s.percentage}% ({s.count})</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${s.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* حسب النوع */}
        <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gold" /> التوزيع حسب النوع
          </h4>
          <div className="space-y-2">
            {demographics.byGender.map((gn) => (
              <div key={gn.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">{gn.label}</span>
                  <span className="text-foreground">{gn.percentage}% ({gn.count})</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${gn.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── كشف شرف الطلاب الملتزمين بنسبة 100% ── */}
      {perfectAttendees.length > 0 && (
        <div className="rounded-3xl border border-emerald-500/30 bg-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm sm:text-base font-black text-foreground">
                كشف شرف الطلاب الملتزمين بنسبة 100% ({perfectAttendees.length} طالب)
              </h3>
            </div>
            <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-[11px] font-black border border-emerald-500/30">
              مؤهلون لمنح أوسمة التفوق 🎖️
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto custom-scrollbar">
            {perfectAttendees.map((stu, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20 text-xs"
              >
                <div>
                  <p className="font-extrabold text-foreground">{stu.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {stu.grade} · {stu.section}
                  </p>
                </div>
                {stu.phone && (
                  <span className="text-[10px] font-bold text-muted-foreground dir-ltr">{stu.phone}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
