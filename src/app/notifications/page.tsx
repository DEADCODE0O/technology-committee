import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StudentShell } from "@/components/student/student-shell";
import { NotificationsList, type CenterNotification } from "@/components/platform/notifications-list";
import { getStudentNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/notifications");
  if (user.role !== "STUDENT") redirect("/admin");
  if (!user.profile) redirect("/profile/complete");

  const { notifications, unreadCount, pendingImportant } = await getStudentNotifications(user);
  // مركز الإشعارات يوثّق الزيارة — لكن نعرضه كما جلبناه (التعليم يتم بالتفاعل)
  void pendingImportant;

  const items: CenterNotification[] = notifications.map((n) => ({
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
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }));

  // عدد طلبات البيانات المعلقة (شارة القائمة)
  const pendingCount = await db.dataResponse.count({
    where: {
      userId: user.id,
      request: { status: "OPEN", mandatory: true },
    },
  }).catch(() => 0);

  return (
    <StudentShell
      user={{
        name: user.profile.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
      active="notifications"
      pendingCount={pendingCount}
      unreadCount={unreadCount}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-zinc-50">الإشعارات</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            كل رسائل اللجنة المهمة وروابط الجروبات والمهام — تبقى هنا دائمًا وترجع إليها وقتما تشاء.
          </p>
        </header>
        <NotificationsList notifications={items} />
      </div>
    </StudentShell>
  );
}
