import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { ActivityForm } from "@/components/admin/activity-form";

export const dynamic = "force-dynamic";

export default async function NewActivityPage() {
  const user = await requireAdmin();
  if (!canUser(user, MODULES.WORKSHOPS, "manage")) redirect("/admin/activities");

  const programs = await db.program.findMany({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-50">نشاط جديد</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          أنشئ النشاط (كورس / ورشة / فعالية) ثم أضف تنفيذه الأول بمواعيده — يمكن إضافة دفعات وتنفيذات جديدة لاحقًا بنفس الوصف
        </p>
      </div>
      <ActivityForm programs={programs} />
      <p className="text-center text-xs text-zinc-600">بعد الإنشاء ستُوجَّه لصفحة النشاط لإضافة التنفيذ الأول</p>
    </div>
  );
}
