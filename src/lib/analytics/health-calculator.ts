// ═══════════════════════════════════════════════════════════════
//  حساب مؤشر صحة اللجنة الشامل (Committee Health Score - CHS / 100)
// ═══════════════════════════════════════════════════════════════

import { CommitteeHealthScore, HealthLevel, MomentumState } from './types';
import { clamp, round, calculateVelocity } from './statistics-engine';

interface HealthInputs {
  actualAttendanceRate: number; // 0 - 100%
  averageQualityRating: number;  // 1.0 - 5.0
  newStudentsCount: number;
  previousNewStudentsCount: number;
  activeStudentsCount: number;
  totalStudentsCount: number;
}

export function computeCommitteeHealthScore(inputs: HealthInputs): CommitteeHealthScore {
  // 1. مكون الالتزام بالحضور (Attendance Component) - الوزن: 35%
  // نسبة الحضور الفعلية مقارنة بالتسجيل
  const attendanceScore = clamp(inputs.actualAttendanceRate, 0, 100);

  // 2. مكون جودة المحاضرات والتقييم السري (Quality Component) - الوزن: 30%
  // تحويل التقييم (من 1 إلى 5) إلى نسبة مئوية (1 = 20%, 5 = 100%)
  const qualityRaw = inputs.averageQualityRating > 0 ? inputs.averageQualityRating : 4.0; // افتراضي إيجابي عند قلة التقييمات
  const qualityScore = clamp((qualityRaw / 5) * 100, 0, 100);

  // 3. مكون النمو واستقطاب الطلاب الجدد (Growth Component) - الوزن: 20%
  // مقارنة الطلاب الجدد المسجلين بالفترة السابقة
  const growthVelocity = calculateVelocity(inputs.newStudentsCount, inputs.previousNewStudentsCount);
  // تحويل السرعة إلى درجة من 100 (نمو 20% فأكثر = 100، انكماش -20% فأقل = 30)
  let growthScore = 70; // خط الأساس المستقر
  if (growthVelocity > 0) {
    growthScore = clamp(70 + (growthVelocity / 2), 70, 100);
  } else if (growthVelocity < 0) {
    growthScore = clamp(70 + (growthVelocity / 1.5), 20, 70);
  }

  // 4. مكون التفاعل والمشاركة الحية (Engagement Component) - الوزن: 15%
  const activeRate = inputs.totalStudentsCount > 0
    ? (inputs.activeStudentsCount / inputs.totalStudentsCount) * 100
    : 50;
  // التفاعل الطلابي في الجامعات يعتبر ممتازاً إذا تجاوز 30% - نعايره ليكون من 100
  const engagementScore = clamp((activeRate / 35) * 100, 0, 100);

  // الحساب المركب بالمعادلة الوزنية
  const weightedSum =
    (attendanceScore * 0.35) +
    (qualityScore * 0.30) +
    (growthScore * 0.20) +
    (engagementScore * 0.15);

  const finalScore = round(clamp(weightedSum, 0, 100), 0);

  // تحديد مستوى الصحة والتصنيف
  let level: HealthLevel = 'HEALTHY';
  let statusLabel = 'استقرار ونشاط إيجابي مستدام';
  let badgeColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';

  if (finalScore >= 88) {
    level = 'OPTIMAL';
    statusLabel = 'ازدهار ونمو استثنائي (Exceptional Peak)';
    badgeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  } else if (finalScore >= 72) {
    level = 'HEALTHY';
    statusLabel = 'استقرار إيجابي مستدام (Healthy Stability)';
    badgeColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  } else if (finalScore >= 55) {
    level = 'WARNING';
    statusLabel = 'مؤشرات تباطؤ تستوجب التدخل (Warning Phase)';
    badgeColor = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  } else {
    level = 'CRITICAL';
    statusLabel = 'خطر انحدار تشغيلي يستدعي خطة طوارئ (Critical Alert)';
    badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  }

  // حساب الزخم والسرعة الإجمالية (Momentum & Trend Derivative)
  const momentumVelocity = growthVelocity;
  let momentum: MomentumState = 'STEADY';
  if (momentumVelocity > 5) {
    momentum = 'RISING';
  } else if (momentumVelocity < -5) {
    momentum = 'DECLINING';
  }

  return {
    score: finalScore,
    level,
    statusLabel,
    badgeColor,
    momentum,
    momentumVelocity,
    breakdown: {
      attendance: {
        score: round(attendanceScore, 1),
        weight: 35,
        actualRate: round(inputs.actualAttendanceRate, 1),
      },
      quality: {
        score: round(qualityScore, 1),
        weight: 30,
        actualAvg: round(inputs.averageQualityRating, 1),
      },
      growth: {
        score: round(growthScore, 1),
        weight: 20,
        newUsersCount: inputs.newStudentsCount,
      },
      engagement: {
        score: round(engagementScore, 1),
        weight: 15,
        activeRate: round(activeRate, 1),
      },
    },
  };
}
