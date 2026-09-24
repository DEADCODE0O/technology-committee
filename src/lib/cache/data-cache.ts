import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/platform";
import { getActiveSeason } from "@/lib/progress";
import { monthStart, semesterStart } from "@/lib/constants";

/**
 * ═══════════════════════════════════════════════════════════════
 *  طبقة كاش البيانات الذكية (Next.js Data Cache Layer)
 *  • تمنع استنزاف قاعدة بيانات Supabase نهائياً
 *  • تخدم آلاف الطلاب من كاش Vercel السريع بـ 0 بايت Egress
 *  • تُحدّث فورياً عبر revalidateTag عند أي تعديل إداري
 * ═══════════════════════════════════════════════════════════════
 */

export function purgeCacheTag(tag: string) {
  try {
    revalidateTag(tag, "max");
  } catch {}
}

function parseSessionDates<T extends Record<string, any>>(s: T): T {
  if (!s) return s;
  return {
    ...s,
    startsAt: s.startsAt ? (s.startsAt instanceof Date ? s.startsAt : new Date(s.startsAt)) : new Date(),
    endsAt: s.endsAt ? (s.endsAt instanceof Date ? s.endsAt : new Date(s.endsAt)) : null,
    registrationOpensAt: s.registrationOpensAt
      ? (s.registrationOpensAt instanceof Date ? s.registrationOpensAt : new Date(s.registrationOpensAt))
      : null,
    registrationClosesAt: s.registrationClosesAt
      ? (s.registrationClosesAt instanceof Date ? s.registrationClosesAt : new Date(s.registrationClosesAt))
      : null,
  };
}

function parseActivityDates<T extends Record<string, any>>(a: T): T {
  if (!a) return a;
  return {
    ...a,
    createdAt: a.createdAt ? (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)) : new Date(),
    sessions: Array.isArray(a.sessions) ? a.sessions.map(parseSessionDates) : [],
  };
}

// ── 1. كاش الأنشطة المنشورة للطلاب والزوار ──
const _getCachedPublishedActivities = unstable_cache(
  async () => {
    return db.activity.findMany({
      where: { publish: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        program: { select: { id: true, name: true, icon: true } },
        sessions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            image: true,
            order: true,
            startsAt: true,
            endsAt: true,
            seats: true,
            registrationOpensAt: true,
            registrationClosesAt: true,
            closingMode: true,
            registrationOpen: true,
            status: true,
            registrations: {
              where: { status: "REGISTERED" },
              select: { id: true },
            },
          },
        },
      },
    });
  },
  ["published-activities-list"],
  {
    revalidate: 300, // 5 دقائق كحد أقصى أو فوري عند revalidateTag("activities")
    tags: ["activities"],
  }
);

export async function getCachedPublishedActivities() {
  const list = await _getCachedPublishedActivities();
  return list.map(parseActivityDates);
}

// ── 2. كاش تفاصيل نشاط محدد ──
const _getCachedActivityById = (id: string) =>
  unstable_cache(
    async () => {
      return db.activity.findUnique({
        where: { id, publish: "PUBLISHED" },
        include: {
          program: true,
          sessions: {
            where: { status: { not: "CANCELLED" } },
            orderBy: { startsAt: "asc" },
            include: {
              registrations: {
                where: { status: "REGISTERED" },
                select: { id: true, userId: true },
              },
            },
          },
        },
      });
    },
    [`activity-detail-${id}`],
    {
      revalidate: 300,
      tags: ["activities", `activity-${id}`],
    }
  );

export async function getCachedActivityById(id: string) {
  const item = await _getCachedActivityById(id)();
  return item ? parseActivityDates(item) : null;
}

// ── 3. كاش البرامج المتاحة ──
export const getCachedPrograms = unstable_cache(
  async () => {
    return db.program.findMany({
      where: { status: "ACTIVE" },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { activities: { where: { publish: "PUBLISHED" } } } },
      },
    });
  },
  ["active-programs-list"],
  {
    revalidate: 600,
    tags: ["programs", "activities"],
  }
);

// ── 4. كاش المتصدرين لـ 6000 طالب ──
export const getCachedLeaderboardData = (
  tab: "overall" | "month" | "semester" | "season"
) =>
  unstable_cache(
    async () => {
      const season = await getActiveSeason();
      const from =
        tab === "month"
          ? monthStart()
          : tab === "semester"
          ? semesterStart()
          : undefined;
      const seasonId = tab === "season" ? season?.id ?? "__none__" : undefined;
      const rows = await getLeaderboard(from, 50, seasonId);

      // ترتيب الفرق
      const teamRows = await db.team.findMany({
        include: { _count: { select: { members: true } } },
      });
      const teamPoints = await db.teamPointEvent.groupBy({
        by: ["teamId"],
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
      });
      const pointsMap = new Map<string, number>();
      for (const p of teamPoints) {
        pointsMap.set(p.teamId, p._sum?.points ?? 0);
      }
      const rankedTeams = teamRows
        .map((t) => ({
          name: t.name,
          icon: t.icon,
          color: t.color,
          points: pointsMap.get(t.id) ?? 0,
          members: t._count.members,
        }))
        .sort((a, b) => b.points - a.points);

      return {
        season,
        rows,
        rankedTeams,
      };
    },
    [`leaderboard-${tab}`],
    {
      revalidate: 60, // يتجدد كل دقيقة كحد أقصى أو فوري عند revalidateTag("leaderboard")
      tags: ["leaderboard"],
    }
  )();

// ── 5. كاش بيانات ملف المستخدم السريع (60 ثانية) ──
export const getCachedUserById = (userId: string) =>
  unstable_cache(
    async () => {
      return db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
    },
    [`user-cached-${userId}`],
    {
      revalidate: 60, // 60 ثانية للمستخدم لتفادي تكرار الاستعلامات مع كل نقرة
      tags: [`user-${userId}`],
    }
  )();
