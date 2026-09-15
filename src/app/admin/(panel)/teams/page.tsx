import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { TeamManager } from "@/components/admin/team-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const user = await requireAdmin(MODULES.POINTS, "view");
  const canManage = canUser(user, MODULES.POINTS, "manage");

  const [teams, students, teamPoints] = await Promise.all([
    db.team.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        members: { include: { user: { include: { profile: { select: { fullName: true, grade: true } } } } } },
        achievements: { orderBy: { awardedAt: "desc" } },
      },
    }),
    db.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE" },
      orderBy: { profile: { fullName: "asc" } },
      select: { id: true, profile: { select: { fullName: true, grade: true } } },
    }),
    db.teamPointEvent.groupBy({ by: ["teamId"], _sum: { points: true } }),
  ]);

  const pointsMap = new Map(teamPoints.map((t) => [t.teamId, t._sum.points ?? 0]));

  return (
    <TeamManager
      canManage={canManage}
      students={students
        .filter((s) => s.profile)
        .map((s) => ({ id: s.id, name: s.profile!.fullName, grade: s.profile!.grade }))}
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        color: t.color,
        description: t.description,
        points: pointsMap.get(t.id) ?? 0,
        achievements: t.achievements.map((a) => ({ id: a.id, title: a.title, icon: a.icon })),
        members: t.members.map((m) => ({
          userId: m.userId,
          name: m.user.profile?.fullName ?? m.user.email,
          grade: m.user.profile?.grade ?? "",
          role: m.role,
        })),
      }))}
    />
  );
}
