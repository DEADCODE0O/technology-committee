// ═══════════════════════════════════════════════════════════════
//  محرك المفاضلة واتخاذ القرارات ومصفوفة بوسطن (BCG & Decision Engine)
// ═══════════════════════════════════════════════════════════════

import { WorkshopBCGItem, BCGQuadrant, DecisionCandidate } from './types';
import { round } from './statistics-engine';

export interface RawWorkshopStat {
  id: string;
  activityId: string;
  title: string;
  activityType: string;
  presenter: string | null;
  seats: number;
  registeredCount: number;
  attendedCount: number;
  averageRating: number | null;
  evaluationsCount: number;
}

/**
 * تصنيف الورش وفق مصفوفة بوسطن لتقييم الأداء (BCG Performance Matrix)
 * المحور الأول: الإقبال والحضور الفعلي
 * المحور الثاني: الجودة والرضا السري للطلاب
 */
export function classifyBCGWorkshops(workshops: RawWorkshopStat[]): WorkshopBCGItem[] {
  return workshops.map((w) => {
    const attendanceRate = w.registeredCount > 0 ? (w.attendedCount / w.registeredCount) * 100 : 0;
    const fillRate = w.seats > 0 ? (w.registeredCount / w.seats) * 100 : 0;
    const avgRating = w.averageRating !== null && w.averageRating > 0 ? w.averageRating : 4.0; // افتراضي للورش الجديدة

    // المعايير: إقبال مرتفع إذا كان معدل الحضور أو الامتلاء >= 60%
    const isHighDemand = fillRate >= 60 || attendanceRate >= 55;
    // جودة مرتفعة إذا كان التقييم >= 4.0
    const isHighQuality = avgRating >= 4.0;

    let category: BCGQuadrant = 'CASH_COW';
    let categoryLabel = 'ركيزة أساسية (Cash Cow)';
    let badgeClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    let recommendation = '';

    if (isHighDemand && isHighQuality) {
      category = 'STAR';
      categoryLabel = 'ورشة نجمة (Star)';
      badgeClass = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      recommendation = 'ورشة فائقة النجاح؛ إقبال مرتفع ورضا استثنائي من الطلاب. التوصية: تكرارها فوراً، رفع سعة المقاعد، وتكريم المحاضر.';
    } else if (isHighDemand && !isHighQuality) {
      category = 'CASH_COW';
      categoryLabel = 'ركيزة إقبال (Cash Cow)';
      badgeClass = 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      recommendation = 'تشهد إقبالاً كبيراً ومطلوبة، لكن تقييم الجودة بحاجة للتحسين. التوصية: الإبقاء عليها مع تطوير الجانب العملي وتنظيم القاعة.';
    } else if (!isHighDemand && isHighQuality) {
      category = 'QUESTION_MARK';
      categoryLabel = 'فرصة ضائعة (Question Mark)';
      badgeClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      recommendation = 'المحتوى ممتاز وتقييم من حضرها مرتفع، لكن الإقبال العام محدود. العيب في التوقيت أو التسويق. التوصية: تغيير موعدها وتكثيف الترويج.';
    } else {
      category = 'RISK';
      categoryLabel = 'ورشة خطر (Risk)';
      badgeClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      recommendation = 'إقبال ضعيف وتقييم سلبي؛ تمثل هدراً لموارد اللجنة والجهد. التوصية: إيقافها فوراً، ومراجعة أسلوب المحاضر والمحتوى كلياً.';
    }

    return {
      id: w.id,
      activityId: w.activityId,
      title: w.title,
      activityType: w.activityType,
      presenter: w.presenter,
      seats: w.seats,
      registeredCount: w.registeredCount,
      attendedCount: w.attendedCount,
      attendanceRate: round(attendanceRate, 1),
      fillRate: round(fillRate, 1),
      averageRating: round(avgRating, 1),
      evaluationsCount: w.evaluationsCount,
      category,
      categoryLabel,
      badgeClass,
      recommendation,
    };
  });
}

/**
 * محاكاة المفاضلة بين خيارات الأنشطة (Decision Trade-Off Simulator)
 */
export function simulateTradeOff(
  optionA: { title: string; category: string; demandScore: number; historicalAttendanceRate: number; expectedRating: number; complexity: 'LOW' | 'MEDIUM' | 'HIGH' },
  optionB: { title: string; category: string; demandScore: number; historicalAttendanceRate: number; expectedRating: number; complexity: 'LOW' | 'MEDIUM' | 'HIGH' }
): {
  winner: 'A' | 'B' | 'TIE';
  candidateA: DecisionCandidate;
  candidateB: DecisionCandidate;
  rationale: string;
} {
  const complexityWeight = { LOW: 1.0, MEDIUM: 0.85, HIGH: 0.7 };

  // حساب درجة الجدارة والملاءمة (Suitability Score) من 100
  // معادلة: (الطلب * 0.4) + (الحضور المتوقع * 0.3) + (الرضا المتوقع * 20 * 0.2) + (عامل البساطة والجاهزية * 10)
  const calcScore = (opt: typeof optionA) => {
    const demandPart = opt.demandScore * 0.40;
    const attendancePart = opt.historicalAttendanceRate * 0.30;
    const satisfactionPart = (opt.expectedRating * 20) * 0.20;
    const complexityPart = complexityWeight[opt.complexity] * 10;
    return round(demandPart + attendancePart + satisfactionPart + complexityPart, 1);
  };

  const scoreA = calcScore(optionA);
  const scoreB = calcScore(optionB);

  const candidateA: DecisionCandidate = {
    id: 'opt-a',
    title: optionA.title,
    category: optionA.category,
    demandScore: optionA.demandScore,
    historicalAttendanceRate: optionA.historicalAttendanceRate,
    estimatedSatisfaction: optionA.expectedRating,
    implementationComplexity: optionA.complexity,
    suitabilityScore: scoreA,
    pros: [
      optionA.demandScore >= 70 ? 'طلب مرتفع جداً بين رغبات الطلاب' : 'إقبال متوسط ومستقر',
      optionA.historicalAttendanceRate >= 65 ? 'معدل التزام تاريخي مرتفع بالحضور' : 'يحتاج تأكيد حضور',
      optionA.complexity === 'LOW' ? 'سهولة تنظيمية وتوفر قاعات ومحاضرين' : 'تتطلب تجهيزات تقنية خاصة',
    ],
    cons: [
      optionA.demandScore < 60 ? 'نسبة الطلب عليها أقل من الخيار البديل' : 'ضغط حجز متوقع',
      optionA.complexity === 'HIGH' ? 'تتطلب جهداً تنظيمياً ومتابعة مكثفة' : '',
    ].filter(Boolean),
    verdict: scoreA >= scoreB ? 'الخيار الأرجح إحصائياً' : 'خيار بديل ثانوي',
  };

  const candidateB: DecisionCandidate = {
    id: 'opt-b',
    title: optionB.title,
    category: optionB.category,
    demandScore: optionB.demandScore,
    historicalAttendanceRate: optionB.historicalAttendanceRate,
    estimatedSatisfaction: optionB.expectedRating,
    implementationComplexity: optionB.complexity,
    suitabilityScore: scoreB,
    pros: [
      optionB.demandScore >= 70 ? 'طلب جماهيري مرتفع وقوي' : 'إقبال نوعي متخصص',
      optionB.historicalAttendanceRate >= 65 ? 'التزام أكاديمي ممتاز' : 'معدل التزام معقول',
      optionB.complexity === 'LOW' ? 'جاهزية سريعة للتنفيذ' : 'قيمة تعليمية متقدمة',
    ],
    cons: [
      optionB.demandScore < 60 ? 'طلب محدود نسبياً مقارنة بالأول' : '',
      optionB.complexity === 'HIGH' ? 'صعوبة في توفير المعامل أو التراخيص' : '',
    ].filter(Boolean),
    verdict: scoreB > scoreA ? 'الخيار الأرجح إحصائياً' : 'خيار بديل ثانوي',
  };

  let winner: 'A' | 'B' | 'TIE' = 'TIE';
  let rationale = '';

  if (scoreA > scoreB) {
    winner = 'A';
    rationale = `الخيار الأول «${optionA.title}» يتفوق بمؤشر جدارة قدره (${scoreA} مقابل ${scoreB}) بفضل توازن حجم الطلب وسهولة التنفيذ ومعدل الحضور التاريخي.`;
  } else if (scoreB > scoreA) {
    winner = 'B';
    rationale = `الخيار الثاني «${optionB.title}» يتفوق بمؤشر جدارة قدره (${scoreB} مقابل ${scoreA})، مما يجعله القرار الأكثر استثماراً لجهود اللجنة.`;
  } else {
    rationale = `الخياران متقاربان جداً بالأرقام (${scoreA} نقطة)؛ يمكن تنفيذهما بالتتابع أو طرح استطلاع فوري للطلاب لحسم القرار.`;
  }

  return { winner, candidateA, candidateB, rationale };
}
