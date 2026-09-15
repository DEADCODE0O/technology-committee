import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { SeasonsManager } from "@/components/admin/seasons-manager";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  const user = await requireAdmin(MODULES.POINTS, "view");
  const canManage = canUser(user, MODULES.POINTS, "manage");

  const [seasons, quests, rewards, students, questDone, seasonXp, rewardGrants] = await Promise.all([
    db.season.findMany({ orderBy: { startAt: "desc" } }),
    db.quest.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { progress: { where: { completedAt: { not: null } } } } } } }),
    db.reward.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { awards: { where: { revokedAt: null } } } } } }),
    db.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE" },
      include: { profile: { select: { fullName: true } } },
      orderBy: { profile: { fullName: "asc" } },
    }),
    db.questProgress.groupBy({ by: ["questId"], where: { completedAt: { not: null } }, _count: true }),
    db.pointEvent.groupBy({ by: ["seasonId"], _sum: { points: true } }),
    db.studentReward.groupBy({ where: { revokedAt: null }, by: ["rewardId"], _count: true }),
  ]);

  const xpMap = new Map(seasonXp.map((s) => [s.seasonId, s._sum.points ?? 0]));
  const doneMap = new Map(questDone.map((q) => [q.questId, q._count]));
  const grantMap = new Map(rewardGrants.map((g) => [g.rewardId, g._count]));

  return (
    <SeasonsManager
      canManage={canManage}
      seasons={seasons.map((s) => ({
        id: s.id, name: s.name, startAt: s.startAt.toISOString(),
        endAt: s.endAt ? s.endAt.toISOString() : null, status: s.status,
        xp: xpMap.get(s.id) ?? 0,
      }))}
      quests={quests.map((q) => ({
        id: q.id, title: q.title, description: q.description, kind: q.kind,
        targetCount: q.targetCount, xpReward: q.xpReward, icon: q.icon, active: q.active,
        completed: doneMap.get(q.id) ?? 0,
      }))}
      rewards={rewards.map((r) => ({
        id: r.id, type: r.type, title: r.title, description: r.description, icon: r.icon,
        granted: grantMap.get(r.id) ?? 0,
      }))}
      students={students
        .filter((s) => s.profile)
        .map((s) => ({ id: s.id, name: s.profile!.fullName }))}
    />
  );
}
