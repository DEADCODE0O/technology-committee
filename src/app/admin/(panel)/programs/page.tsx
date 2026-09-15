import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { MODULES } from "@/lib/permissions";
import { ProgramManager } from "@/components/admin/program-manager";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  const user = await requireAdmin();
  const canManage = canUser(user, MODULES.PROGRAMS, "manage");

  const programs = await db.program.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { activities: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-50">البرامج</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          المستوى الأعلى للتنظيم — كل برنامج يضم أنشطة (كورسات وورش وفعاليات).
          البرنامج اختياري: يمكن إنشاء نشاط مستقل وربطه ببرنامج لاحقًا.
        </p>
      </div>
      <ProgramManager
        canManage={canManage}
        programs={programs.map((p) => ({
          id: p.id, name: p.name, description: p.description, icon: p.icon,
          status: p.status, order: p.order, activitiesCount: p._count.activities,
        }))}
      />
    </div>
  );
}
