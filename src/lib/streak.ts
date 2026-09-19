import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════
// نظام الاستمرارية اليومية (Daily Streak)
// يحفز الطلاب على تسجيل الدخول يومياً والتفاعل لاكتساب أصدقاء ونقاط
// ═══════════════════════════════════════════════════════════════

/**
 * الحصول على تاريخ اليوم بتوقيت مصر كصيغة YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // e.g. "2026-09-18"
}

/**
 * الحصول على تاريخ الأمس بتوقيت مصر
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  bonusPointsEarned: number;
};

/**
 * تسجيل الزيارة اليومية وتحديث الاستمرارية
 */
export async function recordDailyActivity(userId: string): Promise<StreakResult> {
  const fallback: StreakResult = {
    currentStreak: 1,
    longestStreak: 1,
    isNewDay: false,
    bonusPointsEarned: 0,
  };

  try {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // تحديث وقت آخر ظهور دائماً
    await db.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    const existing = await db.dailyStreak.findUnique({
      where: { userId },
    });

    if (!existing) {
      const created = await db.dailyStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });
      return {
        currentStreak: created.currentStreak,
        longestStreak: created.longestStreak,
        isNewDay: true,
        bonusPointsEarned: 2,
      };
    }

    // إذا سجل بالفعل اليوم
    if (existing.lastActiveDate === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        isNewDay: false,
        bonusPointsEarned: 0,
      };
    }

    let nextStreak = 1;
    if (existing.lastActiveDate === yesterday) {
      // استمرار السلسلة
      nextStreak = existing.currentStreak + 1;
    } else {
      // انقطاع السلسلة والبدء من جديد
      nextStreak = 1;
    }

    const nextLongest = Math.max(existing.longestStreak, nextStreak);

    const updated = await db.dailyStreak.update({
      where: { userId },
      data: {
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        lastActiveDate: today,
      },
    });

    // مكافأة الحفاظ على السلسلة: +2 XP أساسي، ومكافأة مضاعفة كل 7 أيام متتالية (+10 XP)
    let bonus = 2;
    if (nextStreak > 0 && nextStreak % 7 === 0) {
      bonus += 10;
    }

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      isNewDay: true,
      bonusPointsEarned: bonus,
    };
  } catch (err) {
    console.warn("[recordDailyActivity] non-fatal error:", err);
    return fallback;
  }
}

/**
 * جلب معلومات الـ Streak الخاصة بالطالب
 */
export async function getStudentStreak(userId: string) {
  try {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const streak = await db.dailyStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        isActiveToday: false,
        isAtRisk: false,
      };
    }

    const isActiveToday = streak.lastActiveDate === today;
    // معرض لخطر فقدان السلسلة إذا كان آخر نشاط أمس ولم يدخل اليوم بعد
    const isAtRisk = streak.lastActiveDate === yesterday;

    // إذا فاته يوم كامل أو أكثر، فإن السلسلة الحالية ستصبح 0 في العرض
    const displayStreak = isActiveToday || isAtRisk ? streak.currentStreak : 0;

    return {
      currentStreak: displayStreak,
      longestStreak: streak.longestStreak,
      isActiveToday,
      isAtRisk,
    };
  } catch (err) {
    console.warn("[getStudentStreak] non-fatal error:", err);
    return {
      currentStreak: 0,
      longestStreak: 0,
      isActiveToday: false,
      isAtRisk: false,
    };
  }
}

