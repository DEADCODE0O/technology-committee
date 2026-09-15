import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { NotificationsPanel } from "@/components/admin/notifications-panel";
import { parseTarget, describeTarget } from "@/lib/targeting";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();
  const canManage = canUser(user, MODULES.NOTIFICATIONS, "manage");

  const [notifications, sessions, driveAssets] = await Promise.all([
    db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reads: { select: { readAt: true } } },
    }),
    db.session.findMany({
      where: { activity: { publish: "PUBLISHED" }, status: { not: "CANCELLED" } },
      orderBy: { startsAt: "desc" },
      take: 30,
      include: { activity: { select: { title: true, type: true } } },
    }),
    db.driveAsset.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, title: true, url: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-50">الإشعارات</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          أرسل رسالة مهمة لجمهور مستهدف — الإشعار المهم يظهر بنرًا أعلى لوحة الطالب حتى يضغط «تم»
          ويبقى دائمًا في مركز إشعاراته للرجوع إلى رابط الجروب أو الرسالة وقتما شاء.
          يدعم <span className="font-bold text-gold-light">أزرارًا متعددة</span> و<span className="font-bold text-gold-light">صورًا</span> (درايف/رابط/رفع) ويمكنك
          <span className="font-bold text-zinc-300">تعديل</span> أي إشعار مرسل أو حذفه.
        </p>
      </div>

      <NotificationsPanel
        canManage={canManage}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          pinned: n.pinned,
          title: n.title,
          body: n.body,
          buttons: n.buttons,
          imageUrl: n.imageUrl,
          ctaLabel: n.ctaLabel,
          ctaUrl: n.ctaUrl,
          ctaNewTab: n.ctaNewTab,
          linkType: n.linkType,
          target: n.target,
          targetDesc: describeTarget(parseTarget(n.target), {
            grade: GRADE_LABELS, section: SECTION_LABELS, gender: GENDER_LABELS,
          }),
          expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
          readCount: n.reads.filter((rr) => rr.readAt).length,
        }))}
        runs={sessions.map((x) => ({ id: x.id, label: `${x.activity.title} — ${x.title}` }))}
        driveAssets={driveAssets}
      />
    </div>
  );
}
