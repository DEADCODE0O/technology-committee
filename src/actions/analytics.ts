"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات مجمع التحليلات والاستخبارات التنفيذية (CEIDS Analytics)
// ═══════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MODULES } from "@/lib/permissions";
import {
  ExecutiveDashboardData,
  SessionQualityRadarData,
  DemographicDistribution,
} from "@/lib/analytics/types";
import { computeCommitteeHealthScore } from "@/lib/analytics/health-calculator";
import { detectEarlyRisks } from "@/lib/analytics/risk-detector";
import { classifyBCGWorkshops, RawWorkshopStat } from "@/lib/analytics/decision-engine";
import { mean, calculateNPS, calculateRetentionFunnel, round } from "@/lib/analytics/statistics-engine";

const GRADE_LABELS: Record<string, string> = {
  FIRST: "الفرقة الأولى",
  SECOND: "الفرقة الثانية",
  THIRD: "الفرقة الثالثة",
  FOURTH: "الفرقة الرابعة",
};

const SECTION_LABELS: Record<string, string> = {
  IS: "نظم المعلومات الإدارية",
  COMMERCIAL: "شعبة التجارة والمحاسبة",
  TOURISM: "إدارة الضيافة والسياحة",
  LANGS: "اللغات والترجمة",
};

/**
 * جلب بيانات غرفة القيادة التنفيذية (Executive Cockpit)
 */
export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  await requireAdmin(MODULES.DASHBOARD, "view");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 1. استعلامات الطلاب
  const [
    totalStudents,
    newStudentsCount,
    previousNewStudentsCount,
    activeStudentsCount,
    profiles,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: thirtyDaysAgo } } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    db.user.count({ where: { role: "STUDENT", lastActiveAt: { gte: thirtyDaysAgo } } }),
    db.studentProfile.findMany({
      select: { grade: true, section: true, gender: true, joinReasons: true },
    }),
  ]);

  // 2. استعلامات الجلسات والورش والتسجيل والحضور
  const sessions = await db.session.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      activity: { select: { id: true, title: true, type: true } },
      registrations: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          attendance: { select: { present: true, markedAt: true } },
        },
      },
      evaluations: {
        select: {
          id: true,
          overallRating: true,
          instructorRating: true,
          contentRating: true,
          organizationRating: true,
          recommendScore: true,
        },
      },
    },
  });

  // تجميع إحصائيات الحضور والتقييم
  let totalRegistrations = 0;
  let totalAttendedSessions = 0;
  const allRatings: number[] = [];

  const rawWorkshopStats: RawWorkshopStat[] = sessions.map((s) => {
    const regCount = s.registrations.filter((r) => r.status === "REGISTERED").length;
    let attendCount = 0;
    for (const reg of s.registrations) {
      if (reg.attendance?.some((a) => a.present)) {
        attendCount++;
      }
    }

    totalRegistrations += regCount;
    totalAttendedSessions += attendCount;

    const evalScores = s.evaluations.map((e) => e.overallRating);
    allRatings.push(...evalScores);

    const avgRating = evalScores.length > 0 ? mean(evalScores) : null;

    return {
      id: s.id,
      activityId: s.activityId,
      title: s.title || s.activity.title,
      activityType: s.activity.type,
      presenter: s.presenter,
      seats: s.seats,
      registeredCount: regCount,
      attendedCount: attendCount,
      averageRating: avgRating,
      evaluationsCount: s.evaluations.length,
    };
  });

  const overallAttendanceRate = totalRegistrations > 0
    ? round((totalAttendedSessions / totalRegistrations) * 100, 1)
    : 0;

  const averageSatisfaction = allRatings.length > 0 ? round(mean(allRatings), 1) : 4.2;

  // 3. حساب مؤشر صحة اللجنة الشامل (CHS)
  const healthScore = computeCommitteeHealthScore({
    actualAttendanceRate: overallAttendanceRate,
    averageQualityRating: averageSatisfaction,
    newStudentsCount,
    previousNewStudentsCount,
    activeStudentsCount,
    totalStudentsCount: totalStudents,
  });

  // 4. فحص واكتشاف المخاطر المبكرة
  const riskInputs = sessions.map((s) => {
    const regCount = s.registrations.filter((r) => r.status === "REGISTERED").length;
    let attendCount = 0;
    for (const reg of s.registrations) {
      if (reg.attendance?.some((a) => a.present)) attendCount++;
    }
    const evalScores = s.evaluations.map((e) => e.overallRating);
    return {
      id: s.id,
      title: s.title || s.activity.title,
      activityTitle: s.activity.title,
      startsAt: s.startsAt,
      seats: s.seats,
      registeredCount: regCount,
      attendedCount: attendCount,
      status: s.status,
      averageRating: evalScores.length > 0 ? mean(evalScores) : null,
      evaluationsCount: s.evaluations.length,
    };
  });
  const alerts = detectEarlyRisks(riskInputs);

  // 5. تصنيف مصفوفة بوسطن للورش
  const bcgWorkshops = classifyBCGWorkshops(rawWorkshopStats);

  // 6. استخراج رغبات الطلاب من الاستطلاعات وملفات الطلاب
  const polls = await db.demandPoll.findMany({
    where: { status: "ACTIVE" },
    include: { votes: true },
    take: 1,
    orderBy: { createdAt: "desc" },
  });

  const topDemands: { topic: string; votes: number; percentage: number }[] = [];
  if (polls.length > 0) {
    const activePoll = polls[0];
    let opts: { id: string; label: string }[] = [];
    try {
      opts = JSON.parse(activePoll.options);
    } catch {
      opts = [];
    }
    const totalVotes = activePoll.votes.length;
    for (const opt of opts) {
      const vCount = activePoll.votes.filter((v) => v.optionId === opt.id).length;
      topDemands.push({
        topic: opt.label,
        votes: vCount,
        percentage: totalVotes > 0 ? Math.round((vCount / totalVotes) * 100) : 0,
      });
    }
    topDemands.sort((a, b) => b.votes - a.votes);
  }

  // 7. اتجاهات الحضور الأسبوعية (آخر 6 أسابيع)
  const weeklyAttendanceTrend: { week: string; registered: number; attended: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    const weekSessions = sessions.filter((s) => s.startsAt >= wStart && s.startsAt < wEnd);
    let regTotal = 0;
    let attTotal = 0;
    for (const ws of weekSessions) {
      regTotal += ws.registrations.length;
      attTotal += ws.registrations.filter((r) => r.attendance.some((a) => a.present)).length;
    }
    weeklyAttendanceTrend.push({
      week: `أسبوع ${6 - i}`,
      registered: regTotal,
      attended: attTotal,
    });
  }

  const recentEvaluationsCount = await db.sessionEvaluation.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return {
    healthScore,
    totalStudents,
    totalRegistrations,
    totalAttendedSessions,
    overallAttendanceRate,
    averageSatisfaction,
    alerts,
    bcgWorkshops,
    recentEvaluationsCount,
    topDemands,
    weeklyAttendanceTrend,
  };
}

/**
 * جلب التحليل المجهري لجلسة معينة وتقييماتها السرية ورادار الجودة
 */
export async function getWorkshopDeepAnalytics(targetSessionId?: string): Promise<{
  sessionsList: { id: string; title: string; startsAt: Date }[];
  currentSession: SessionQualityRadarData | null;
  retentionFunnel: { step: number; count: number; retentionRate: number; dropOffRate: number }[];
}> {
  await requireAdmin(MODULES.DASHBOARD, "view");

  const sessions = await db.session.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      activityId: true,
      activity: { select: { title: true, type: true } },
      presenter: true,
      order: true,
    },
    take: 30,
  });

  if (sessions.length === 0) {
    return { sessionsList: [], currentSession: null, retentionFunnel: [] };
  }

  const selectedSessionId = targetSessionId || sessions[0].id;
  const targetSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // جلب تقييمات الجلسة المحددة مع الملاحظات السرية
  const evaluations = await db.sessionEvaluation.findMany({
    where: { sessionId: targetSession.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      instructorRating: true,
      contentRating: true,
      organizationRating: true,
      overallRating: true,
      recommendScore: true,
      privateFeedback: true,
      strengths: true,
      improvements: true,
      createdAt: true,
    },
  });

  const instScores = evaluations.map((e) => e.instructorRating);
  const contScores = evaluations.map((e) => e.contentRating);
  const orgScores = evaluations.map((e) => e.organizationRating);
  const overallScores = evaluations.map((e) => e.overallRating);
  const recScores = evaluations.map((e) => e.recommendScore);

  const npsResult = calculateNPS(recScores);

  const radarData: SessionQualityRadarData = {
    sessionId: targetSession.id,
    sessionTitle: targetSession.title,
    activityTitle: targetSession.activity.title,
    presenter: targetSession.presenter,
    totalEvaluations: evaluations.length,
    nps: npsResult.nps,
    metrics: {
      instructor: instScores.length > 0 ? round(mean(instScores), 1) : 4.5,
      content: contScores.length > 0 ? round(mean(contScores), 1) : 4.5,
      organization: orgScores.length > 0 ? round(mean(orgScores), 1) : 4.5,
      overall: overallScores.length > 0 ? round(mean(overallScores), 1) : 4.5,
      recommendRate: evaluations.length > 0 ? round((npsResult.promoters / evaluations.length) * 100, 0) : 90,
    },
    confidentialComments: evaluations.map((e) => ({
      id: e.id,
      instructorRating: e.instructorRating,
      contentRating: e.contentRating,
      organizationRating: e.organizationRating,
      privateFeedback: e.privateFeedback,
      strengths: e.strengths,
      improvements: e.improvements,
      createdAt: e.createdAt,
    })),
  };

  // فحص مسار التسرب للجلسات التابعة لنفس النشاط
  const siblingSessions = await db.session.findMany({
    where: { activityId: targetSession.activityId },
    orderBy: { order: "asc" },
    include: {
      registrations: {
        include: {
          attendance: { where: { present: true } },
        },
      },
    },
  });

  const funnelInput = siblingSessions.map((s) => ({
    sessionOrder: s.order || 1,
    attendedCount: s.registrations.filter((r) => r.attendance.length > 0).length,
  }));

  const retentionFunnel = calculateRetentionFunnel(funnelInput);

  return {
    sessionsList: sessions.map((s) => ({ id: s.id, title: `${s.activity.title} - ${s.title}`, startsAt: s.startsAt })),
    currentSession: radarData,
    retentionFunnel,
  };
}

/**
 * جلب التوزيعات الديموغرافية لجمهور الطلاب
 */
export async function getDemographicAnalytics(): Promise<{
  gradeDistribution: DemographicDistribution[];
  sectionDistribution: DemographicDistribution[];
  genderDistribution: DemographicDistribution[];
}> {
  await requireAdmin(MODULES.DASHBOARD, "view");

  const profiles = await db.studentProfile.findMany({
    select: { grade: true, section: true, gender: true },
  });

  const total = profiles.length || 1;

  // توزيع الفرق
  const gradeCounts: Record<string, number> = {};
  // توزيع الشعب
  const sectionCounts: Record<string, number> = {};
  // توزيع الجنس
  const genderCounts: Record<string, number> = {};

  for (const p of profiles) {
    gradeCounts[p.grade] = (gradeCounts[p.grade] || 0) + 1;
    sectionCounts[p.section] = (sectionCounts[p.section] || 0) + 1;
    genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1;
  }

  const gradeColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];
  const gradeDistribution: DemographicDistribution[] = ["FIRST", "SECOND", "THIRD", "FOURTH"].map((g, idx) => ({
    key: g,
    label: GRADE_LABELS[g] || g,
    count: gradeCounts[g] || 0,
    percentage: round(((gradeCounts[g] || 0) / total) * 100, 1),
    color: gradeColors[idx % gradeColors.length],
  }));

  const sectionColors = ["#06b6d4", "#ec4899", "#84cc16", "#f97316"];
  const sectionDistribution: DemographicDistribution[] = ["IS", "COMMERCIAL", "TOURISM", "LANGS"].map((s, idx) => ({
    key: s,
    label: SECTION_LABELS[s] || s,
    count: sectionCounts[s] || 0,
    percentage: round(((sectionCounts[s] || 0) / total) * 100, 1),
    color: sectionColors[idx % sectionColors.length],
  }));

  const genderDistribution: DemographicDistribution[] = [
    {
      key: "MALE",
      label: "ذكور",
      count: genderCounts["MALE"] || 0,
      percentage: round(((genderCounts["MALE"] || 0) / total) * 100, 1),
      color: "#3b82f6",
    },
    {
      key: "FEMALE",
      label: "إناث",
      count: genderCounts["FEMALE"] || 0,
      percentage: round(((genderCounts["FEMALE"] || 0) / total) * 100, 1),
      color: "#ec4899",
    },
  ];

  return {
    gradeDistribution,
    sectionDistribution,
    genderDistribution,
  };
}
