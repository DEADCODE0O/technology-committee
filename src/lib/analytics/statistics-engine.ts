// ═══════════════════════════════════════════════════════════════
//  محرك العمليات الرياضية والإحصائية (Mathematical & Statistical Core)
// ═══════════════════════════════════════════════════════════════

/**
 * حساب المتوسط الحسابي (Mean)
 */
export function mean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return sum / values.length;
}

/**
 * حساب الانحراف المعياري (Standard Deviation)
 */
export function stdDev(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * قياس السرعة الرياضية للتغير (Velocity / Momentum Derivative)
 * يحسب النسبة المئوية للنمو أو الانحدار بين فترتين
 */
export function calculateVelocity(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const velocity = ((current - previous) / previous) * 100;
  return round(velocity, 1);
}

/**
 * قياس مؤشر صافي الترويج (Net Promoter Score - NPS)
 * التقييم من 1 إلى 10:
 * - مروجون (Promoters): 9 - 10
 * - محايدون (Passives): 7 - 8
 * - منتقدون (Detractors): 1 - 6
 * NPS = % المروجين - % المنتقدين (تتراوح بين -100 و +100)
 */
export function calculateNPS(scores: (number | null | undefined)[]): {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
} {
  const validScores = scores.filter((s): s is number => typeof s === 'number' && s >= 1 && s <= 10);
  const total = validScores.length;

  if (total === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const score of validScores) {
    if (score >= 9) promoters++;
    else if (score >= 7) passives++;
    else detractors++;
  }

  const promoterPct = (promoters / total) * 100;
  const detractorPct = (detractors / total) * 100;
  const nps = round(promoterPct - detractorPct, 1);

  return {
    nps,
    promoters,
    passives,
    detractors,
    total,
  };
}

/**
 * حساب مسار التسرب والاحتفاظ عبر الجلسات (Retention & Churn Funnel)
 */
export function calculateRetentionFunnel(
  sessions: { sessionOrder: number; attendedCount: number }[]
): {
  step: number;
  count: number;
  retentionRate: number; // النسبة مقارنة بالجلسة الأولى
  stepRetentionRate: number; // النسبة مقارنة بالجلسة السابقة مباشرة
  dropOffRate: number; // معدل الفقد
}[] {
  if (!sessions || sessions.length === 0) return [];

  // ترتيب الجلسات تصاعدياً حسب رقم المحاضرة
  const sorted = [...sessions].sort((a, b) => a.sessionOrder - b.sessionOrder);
  const baseline = sorted[0].attendedCount || 1;

  return sorted.map((session, index) => {
    const prevCount = index === 0 ? baseline : (sorted[index - 1].attendedCount || 1);
    const count = session.attendedCount;
    const retentionRate = round((count / baseline) * 100, 1);
    const stepRetentionRate = round((count / prevCount) * 100, 1);
    const dropOffRate = round(100 - stepRetentionRate, 1);

    return {
      step: session.sessionOrder,
      count,
      retentionRate: clamp(retentionRate, 0, 100),
      stepRetentionRate: clamp(stepRetentionRate, 0, 100),
      dropOffRate: clamp(dropOffRate, 0, 100),
    };
  });
}

/**
 * تقييد قيمة داخل حدين
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * تقريب رقم لعدد محدد من الخانات العشرية
 */
export function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
