// ═══════════════════════════════════════════════════════════════
//  محرك رصد المخاطر والإنذار المبكر (Early Warning & Anomaly Detection)
// ═══════════════════════════════════════════════════════════════

import { EarlyWarningAlert } from './types';
import { round } from './statistics-engine';

interface SessionRiskInput {
  id: string;
  title: string;
  activityTitle: string;
  startsAt: Date;
  seats: number;
  registeredCount: number;
  attendedCount: number;
  status: string;
  averageRating: number | null;
  evaluationsCount: number;
}

export function detectEarlyRisks(sessions: SessionRiskInput[]): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];
  const now = new Date();

  for (const session of sessions) {
    const timeDiffMs = session.startsAt.getTime() - now.getTime();
    const hoursRemaining = timeDiffMs / (1000 * 60 * 60);

    // 1. فحص ضعف حجز المقاعد قبل موعد الورشة (Capacity Lag)
    if (session.status === 'SCHEDULED' && hoursRemaining > 0 && hoursRemaining <= 72) {
      const fillRate = session.seats > 0 ? (session.registeredCount / session.seats) * 100 : 100;
      if (fillRate < 40) {
        alerts.push({
          id: `lag-${session.id}`,
          type: 'CAPACITY_LAG',
          severity: hoursRemaining <= 24 ? 'HIGH' : 'MEDIUM',
          title: `ضعف الإقبال على ورشة قادمة: ${session.title}`,
          description: `متبقي ${round(hoursRemaining, 0)} ساعة على موعد الورشة، ونسبة حجز المقاعد لم تتجاوز ${round(fillRate, 0)}% (${session.registeredCount} من أصل ${session.seats} مقعد).`,
          targetId: session.id,
          targetName: session.title,
          metricValue: `${round(fillRate, 0)}% نسبة الحجز`,
          recommendation: 'نشر إعلان تذكيري فوري في تبويب المجتمع ومجموعات الواتساب الخاصة بالشعبة المستهدفة لتدارك المقاعد الشاغرة.',
          detectedAt: now,
        });
      }
    }

    // 2. فحص فجوة الحضور الفعلي والهدر (Attendance Gap)
    // إذا انتهت الجلسة وكان المسجلون أكثر من 15، ولكن الحضور أقل من 50%
    if ((session.status === 'DONE' || (session.status === 'SCHEDULED' && hoursRemaining < -2)) && session.registeredCount >= 15) {
      const attendanceRate = session.registeredCount > 0 ? (session.attendedCount / session.registeredCount) * 100 : 0;
      if (attendanceRate < 50) {
        alerts.push({
          id: `gap-${session.id}`,
          type: 'ATTENDANCE_GAP',
          severity: attendanceRate < 35 ? 'HIGH' : 'MEDIUM',
          title: `هدر مقاعد وفجوة حضور في: ${session.title}`,
          description: `سجّل ${session.registeredCount} طالباً بينما حضر ${session.attendedCount} فقط (${round(attendanceRate, 0)}% معدل الحضور الفعلي)، مما تسبب في حرمان طلاب آخرين.`,
          targetId: session.id,
          targetName: session.title,
          metricValue: `${round(attendanceRate, 0)}% حضور فعلي`,
          recommendation: 'تفعيل قائمة الانتظار تلقائياً وإلزام المتغيبين بتأكيد الحضور قبل الموعد بـ 12 ساعة لتفادي المقاعد المحجوزة الوهمية.',
          detectedAt: now,
        });
      }
    }

    // 3. فحص انخفاض الجودة أو وجود استياء (Quality Dip)
    if (session.evaluationsCount >= 3 && session.averageRating !== null && session.averageRating < 3.5) {
      alerts.push({
        id: `quality-${session.id}`,
        type: 'QUALITY_DIP',
        severity: session.averageRating < 2.8 ? 'CRITICAL' : 'HIGH',
        title: `مؤشر جودة منخفض: ${session.title}`,
        description: `متوسط التقييم السري للورشة انخفض إلى ${round(session.averageRating, 1)} من 5 بناءً على ${session.evaluationsCount} تقييم من الطلاب.`,
        targetId: session.id,
        targetName: session.title,
        metricValue: `${round(session.averageRating, 1)} / 5 نجوم`,
        recommendation: 'الاطلاع على الملاحظات السرية للورشة فوراً للوقوف على العيوب المذكورة (المحتوى أم أسلوب المحاضر أم سوء تنظيم القاعة).',
        detectedAt: now,
      });
    }
  }

  // ترتيب التنبيهات حسب الخطورة: CRITICAL ثم HIGH ثم MEDIUM
  const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1 };
  return alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
}
