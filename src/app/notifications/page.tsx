import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StudentShell } from "@/components/student/student-shell";
import { NotificationsList, type CenterNotification } from "@/components/platform/notifications-list";
import { getStudentBadges } from "@/lib/student-badges";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/notifications");
  if (user.role !== "STUDENT" && !user.profile) redirect("/admin");
  if (!user.profile) redirect("/profile/complete");

  const badges = await getStudentBadges(user);

  const items: CenterNotification[] = badges.notifications.map((n) => ({
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

  return (
    <StudentShell
      user={{
        name: user.profile.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="notifications"
      pendingCount={badges.pendingCount}
      unreadCount={badges.unreadCount}
      openTaskCount={badges.openTaskCount}
      unreadMessagesCount={badges.unreadMessagesCount}
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
