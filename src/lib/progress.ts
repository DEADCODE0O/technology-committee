import "server-only";

// ═══════════════════════════════════════════════════════════════
//  نظام تقدم الطالب — XP / الموسم / الاستمرارية / الإنجازات
//  النقاط = XP (عملة واحدة) · المستوى مشتق · الـStreak من الحضور
//  لا نقاط لأفعال بلا معنى (مشاهدة صفحات / تحديث متكرر)
// ═══════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { levelFromPoints, nextLevelProgress } from "./constants";

export { levelFromPoints, nextLevelProgress };

// ─── الموسم الجاري ─────────────────────────────────────────

export async function getActiveSeason() {
  const now = new Date();
  return db.season.findFirst({
    where: { status: "ACTIVE", startAt: { lte: now } },
    orderBy: { startAt: "desc" },
  });
}

/** ختم الموسم على أي حدث نقاط — يُستدعى عند كل منح */
export async function stampSeasonId(): Promise<string | null> {
  const season = await getActiveSeason();
  return season?.id ?? null;
}

// ─── ملخص تقدم الطالب ──────────────────────────────────────

export type StudentProgressSummary = {
  xp: number;
  level: number;
  nextLevel: number | null;
  progressToNext: number;
  seasonXp: number;
  seasonName: string | null;
  streakWeeks: number;
  attendedCount: number;
  tasksCompleted: number;
  questsCompleted: number;
};

export async function getStudentProgress(userId: string): Promise<StudentProgressSummary> {
  const season = await getActiveSeason();
  const [allAgg, seasonAgg, attendance, tasksDone, quests] = await Promise.all([
    db.pointEvent.aggregate({ where: { userId }, _sum: { points: true } }),
    season
      ? db.pointEvent.aggregate({ where: { userId, seasonId: season.id }, _sum: { points: true } })
      : Promise.resolve({ _sum: { points: null as number | null } }),
    db.attendance.findMany({
      where: { present: true, registration: { userId } },
      select: { markedAt: true, createdAt: true },
    }),
    db.taskAssignment.count({ where: { userId, status: "EVALUATED" } }),
    db.questProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { questId: true },
    }),
  ]);

  const xp = allAgg._sum.points ?? 0;
  const { current, next, progress } = nextLevelProgress(xp);
  const dates = attendance
    .map((a) => (a.markedAt ?? a.createdAt))
    .map((d) => new Date(d).getTime());

  return {
    xp,
    level: current,
    nextLevel: next,
    progressToNext: progress,
    seasonXp: seasonAgg._sum.points ?? 0,
    seasonName: season?.name ?? null,
    streakWeeks: computeStreakWeeks(dates),
    attendedCount: attendance.length,
    tasksCompleted: tasksDone,
    questsCompleted: quests.length,
  };
}

// ─── الاستمرارية (Streak) ───────────────────────────────────
// أسابيع متتالية فيها مشاركة فعلية (حضور) — لا تُكافئ مجرد الزيارات
// الأسبوع يبدأ السبت (مصر) — لو غاب أسبوعًا تنكسر السلسلة

export function weekKey(ts: number): number {
  // ISO day: السبت=6 ... الجمعة=5 (نحسب بداية الأسبوع من السبت)
  const d = new Date(ts);
  const day = d.getDay(); // 0=الأحد
  const daysSinceSaturday = (day + 1) % 7; // السبت=0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceSaturday);
  return Math.floor(start.getTime() / 86400000 / 7);
}

export function computeStreakWeeks(dates: number[]): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map(weekKey));
  const nowWeek = weekKey(Date.now());
  // نبدأ من آخر أسبوع فيه مشاركة (لو غاب هذا الأسبوع لم تنكسر بعد)
  let cursor = nowWeek;
  if (!weeks.has(cursor)) cursor -= 1;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor -= 1;
  }
  return streak;
}

// ─── تقييم الإنجازات (Quests) تلقائيًا ──────────────────────
// يُستدعى بعد أحداث: حضور · تسليم مهمة · تسجيل فعالية/مسابقة

export type QuestEventType = "ATTEND" | "TASK_DONE" | "JOIN_EVENT" | "COMPETITION";

/** يعيد عدد الإنجازات المكتملة حديثًا (للإشعار/التقييم) */
export async function evaluateQuests(userId: string, event: QuestEventType, category: string): Promise<number> {
  const activeQuests = await db.quest.findMany({ where: { active: true } });
  let newlyCompleted = 0;

  for (const quest of activeQuests) {
    // نوع الحدث يطابق نوع الإنجاز؟
    const matches: Record<string, QuestEventType[]> = {
      ATTEND_COUNT: ["ATTEND"],
      TASK_COUNT: ["TASK_DONE"],
      JOIN_EVENT: ["JOIN_EVENT"],
      COMPETITION: ["COMPETITION"],
      STREAK_WEEKS: ["ATTEND", "TASK_DONE", "JOIN_EVENT", "COMPETITION"],
    };
    if (!matches[quest.kind]?.includes(event)) continue;

    // إحصاء العدّاد الحقيقي (لا نثق بعدّاد متزايد فقط)
    let count = 0;
    if (quest.kind === "ATTEND_COUNT") {
      count = await db.attendance.count({
        where: {
          present: true,
          registration: { userId },
          session: { activity: { type: { in: ["WORKSHOP", "COURSE", "ORGANIZATION", "OTHER", "VISIT"] } } },
        },
      });
    } else if (quest.kind === "TASK_COUNT") {
      count = await db.taskAssignment.count({ where: { userId, status: { in: ["SUBMITTED", "EVALUATED"] } } });
    } else if (quest.kind === "JOIN_EVENT") {
      count = await db.registration.count({
        where: { userId, status: { in: ["REGISTERED", "WAITLISTED"] }, session: { activity: { type: "EVENT" } } },
      });
    } else if (quest.kind === "COMPETITION") {
      count = await db.registration.count({
        where: { userId, status: { in: ["REGISTERED", "WAITLISTED"] }, session: { activity: { type: "COMPETITION" } } },
      });
    } else if (quest.kind === "STREAK_WEEKS") {
      const atts = await db.attendance.findMany({
        where: { present: true, registration: { userId } },
        select: { markedAt: true, createdAt: true },
      });
      count = computeStreakWeeks(atts.map((a) => new Date(a.markedAt ?? a.createdAt).getTime()));
    }

    if (count >= quest.targetCount) {
      // مكتمل — سجّل مرة واحدة وامنح الـXP مرة واحدة
      const existing = await db.questProgress.findUnique({
        where: { questId_userId: { questId: quest.id, userId } },
      });
      if (!existing?.completedAt) {
        await db.questProgress.upsert({
          where: { questId_userId: { questId: quest.id, userId } },
          create: { questId: quest.id, userId, count, completedAt: new Date() },
          update: { count, completedAt: existing?.completedAt ?? new Date() },
        });
        // منح XP الإنجاز — مع فحص مضاد للتكرار عبر ruleAction فريد
        const already = await db.pointEvent.findFirst({
          where: { userId, ruleAction: `QUEST_${quest.id}` },
        });
        if (!already) {
          const seasonId = await stampSeasonId();
          await db.pointEvent.create({
            data: {
              userId,
              points: quest.xpReward,
              reason: `إنجاز: ${quest.title}`,
              ruleAction: `QUEST_${quest.id}`,
              seasonId,
              createdById: userId, // منح آلي
            },
          });
        }
        newlyCompleted++;
      } else if (existing.count !== count) {
        await db.questProgress.update({
          where: { questId_userId: { questId: quest.id, userId } },
          data: { count },
        });
      }
    }
  }
  void category;
  return newlyCompleted;
}
