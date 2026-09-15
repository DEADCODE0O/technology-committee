import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// روابط الورش القديمة → صفحة النشاط المحوّل إليها (عبر legacyWorkshopId)
export default async function OldWorkshopRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await db.activity.findUnique({
    where: { legacyWorkshopId: id },
    select: { id: true },
  });
  if (activity) redirect(`/activities/${activity.id}`);
  // ربما المعرف أصلاً معرف نشاط
  const byId = await db.activity.findUnique({ where: { id }, select: { id: true } });
  if (byId) redirect(`/activities/${id}`);
  redirect("/activities");
}
