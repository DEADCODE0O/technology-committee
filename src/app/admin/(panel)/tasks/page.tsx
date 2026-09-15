import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { TaskManager } from "@/components/admin/task-manager";
import { parseTarget, describeTarget } from "@/lib/targeting";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const user = await requireAdmin(MODULES.WORKSHOPS, "view");
  const canManage = canUser(user, MODULES.WORKSHOPS, "manage");

  const [tasks, activities, runs, sessions, teams, seasons] = await Promise.all([
    db.task.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { assignments: true } } },
    }),
    db.activity.findMany({
      where: { publish: { in: ["PUBLISHED", "DRAFT"] } },
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
    db.run.findMany({ select: { id: true, title: true, activityId: true }, orderBy: { order: "asc" } }),
    db.session.findMany({ select: { id: true, title: true, activityId: true }, orderBy: { order: "asc" } }),
    db.team.findMany({ select: { id: true, name: true, icon: true }, orderBy: { name: "asc" } }),
    db.season.findMany({ select: { id: true, name: true, status: true }, orderBy: { startAt: "desc" } }),
  ]);

  const submittedCounts = await db.taskAssignment.groupBy({
    by: ["taskId"],
    where: { status: { in: ["SUBMITTED", "EVALUATED"] } },
    _count: true,
  });
  const submittedMap = new Map(submittedCounts.map((s) => [s.taskId, s._count]));
  const assignedMap = new Map(tasks.map((t) => [t.id, t._count.assignments]));

  const rows = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    distribution: t.distribution,
    submissionType: t.submissionType,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    xpReward: t.xpReward,
    pointsReward: t.pointsReward,
    pool: t.pool,
    links: t.links,
    targetRaw: t.target,
    seasonId: t.seasonId,
    activityId: t.activityId,
    runId: t.runId,
    sessionId: t.sessionId,
    assignedCount: assignedMap.get(t.id) ?? 0,
    submittedCount: submittedMap.get(t.id) ?? 0,
    targetDesc: describeTarget(parseTarget(t.target), { grade: GRADE_LABELS, section: SECTION_LABELS, gender: GENDER_LABELS }),
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <TaskManager
      tasks={rows}
      canManage={canManage}
      scopeOptions={{
        activities,
        runs,
        sessions,
        teams,
      }}
      seasons={seasons}
    />
  );
}
