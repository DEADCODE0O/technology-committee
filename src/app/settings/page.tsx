import { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";
import { getStudentNotifications } from "@/lib/notifications";
import { getSocialCounters } from "@/actions/messaging";
import { StudentShell } from "@/components/student/student-shell";
import { SettingsManager } from "@/components/student/settings-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الإعدادات — منصة اللجنة التكنولوجية",
  description: "تعديل بيانات الحساب، الأمان، وتخصيص المظهر",
};

export default async function SettingsPage() {
  const user = await requireStudent();

  const [progress, notifications, socialCounters] = await Promise.all([
    getStudentProgress(user.id).catch(() => ({ level: 1 })),
    getStudentNotifications(user).catch(() => ({ unreadCount: 0 })),
    getSocialCounters(user.id).catch(() => ({ totalSocialAlerts: 0 })),
  ]);

  const shellUser = {
    name: user.displayName || user.profile?.fullName || user.email,
    email: user.email,
    avatarUrl: user.avatarUrl,
    avatarFrameId: user.avatarFrameId,
    level: progress.level,
  };

  return (
    <StudentShell
      user={shellUser}
      active="settings"
      unreadCount={notifications.unreadCount}
      unreadMessagesCount={socialCounters.totalSocialAlerts}
    >
      <SettingsManager
        user={{
          id: user.id,
          email: user.email,
          displayName: user.displayName ?? null,
          username: user.username ?? null,
          bio: user.bio ?? null,
          avatarUrl: user.avatarUrl ?? null,
          avatarFrameId: user.avatarFrameId ?? null,
          level: progress.level,
          provider: user.provider ?? "EMAIL",
          profile: user.profile
            ? {
                fullName: user.profile.fullName,
                grade: user.profile.grade,
                section: user.profile.section,
                phone: user.profile.phone,
              }
            : null,
        }}
      />
    </StudentShell>
  );
}
