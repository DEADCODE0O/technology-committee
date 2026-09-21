// ═══════════════════════════════════════════════════════════════
//  نظام الاستخبارات ودعم اتخاذ القرار (CEIDS / DSS) - أنواع البيانات
// ═══════════════════════════════════════════════════════════════

export type HealthLevel = 'OPTIMAL' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
export type MomentumState = 'RISING' | 'STEADY' | 'DECLINING';
export type BCGQuadrant = 'STAR' | 'CASH_COW' | 'QUESTION_MARK' | 'RISK';

export interface CommitteeHealthScore {
  score: number; // 0 - 100
  level: HealthLevel;
  statusLabel: string;
  badgeColor: string;
  momentum: MomentumState;
  momentumVelocity: number; // نسبة التغير المئوية مقارنة بالفترة السابقة
  breakdown: {
    attendance: { score: number; weight: number; actualRate: number };
    quality: { score: number; weight: number; actualAvg: number };
    growth: { score: number; weight: number; newUsersCount: number };
    engagement: { score: number; weight: number; activeRate: number };
  };
}

export interface WorkshopBCGItem {
  id: string;
  activityId: string;
  title: string;
  activityType: string;
  presenter: string | null;
  seats: number;
  registeredCount: number;
  attendedCount: number;
  attendanceRate: number; // % الحضور من المسجلين
  fillRate: number; // % امتلاء المقاعد
  averageRating: number; // 1.0 - 5.0
  evaluationsCount: number;
  category: BCGQuadrant;
  categoryLabel: string;
  badgeClass: string;
  recommendation: string;
}

export type RiskType =
  | 'CAPACITY_LAG'      // ضعف حجز المقاعد قبل الموعد
  | 'ATTENDANCE_GAP'     // فجوة بين المسجلين والحضور الفعلي
  | 'QUALITY_DIP'        // تدني تقييم الورشة أو المحاضر
  | 'CONTENT_FATIGUE'    // تشبع وتراجع الإقبال على موضوع مكرر
  | 'RETENTION_LEAK';    // تسرب مفاجئ في كورس متعدد الجلسات

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface EarlyWarningAlert {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  metricValue?: string;
  recommendation: string;
  detectedAt: Date;
}

export interface DemographicDistribution {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface SessionQualityRadarData {
  sessionId: string;
  sessionTitle: string;
  activityTitle: string;
  presenter: string | null;
  totalEvaluations: number;
  nps: number; // -100 إلى +100
  metrics: {
    instructor: number;     // 1 - 5
    content: number;        // 1 - 5
    organization: number;   // 1 - 5
    overall: number;        // 1 - 5
    recommendRate: number;  // % الطلاب المستعدين للتوصية
  };
  confidentialComments: {
    id: string;
    instructorRating: number;
    contentRating: number;
    organizationRating: number;
    privateFeedback: string | null;
    strengths: string | null;
    improvements: string | null;
    createdAt: Date;
  }[];
}

export interface DecisionCandidate {
  id: string;
  title: string;
  category: string;
  demandScore: number; // 0 - 100
  historicalAttendanceRate: number; // %
  estimatedSatisfaction: number; // 1 - 5
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  suitabilityScore: number; // 0 - 100
  pros: string[];
  cons: string[];
  verdict: string;
}

export interface ExecutiveDashboardData {
  healthScore: CommitteeHealthScore;
  totalStudents: number;
  totalRegistrations: number;
  totalAttendedSessions: number;
  overallAttendanceRate: number;
  averageSatisfaction: number;
  alerts: EarlyWarningAlert[];
  bcgWorkshops: WorkshopBCGItem[];
  recentEvaluationsCount: number;
  topDemands: { topic: string; votes: number; percentage: number }[];
  weeklyAttendanceTrend: { week: string; registered: number; attended: number }[];
}
