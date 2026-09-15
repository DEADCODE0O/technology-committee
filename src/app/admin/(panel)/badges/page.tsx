import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { Medal } from "lucide-react";
import { BadgeEditor } from "@/components/admin/badge-editor";
import { ensureDefaults } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const admin = await requireAdmin(MODULES.BADGES);
  const canManage = canUser(admin, MODULES.BADGES, "manage");
  await ensureDefaults();

  const badges = await db.badge.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
          <Medal className="h-6 w-6 text-gold" />
          الشارات والإنجازات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">شارات رمزية تمنحها للطلاب — تظهر في ملفاتهم ولوحة الطالب</p>
      </div>

      <BadgeEditor
        badges={badges.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          holders: b._count.students,
        }))}
        canManage={canManage}
      />
    </div>
  );
}
