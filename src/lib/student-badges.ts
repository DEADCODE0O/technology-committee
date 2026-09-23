import "server-only";
import { db } from "@/lib/db";
import { getStudentNotifications, type StudentNotification } from "@/lib/notifications";
import { getSocialCounters } from "@/actions/messaging";

export interface StudentBadgesResult {
  unreadCount: number;
  openTaskCount: number;
  unreadMessagesCount: number;
  pendingCount: number;
  notifications: StudentNotification[];
  pinnedBanners: StudentNotification[];
  pinnedBanner: StudentNotification | null;
}

/**
 * دالة موحدة فائقة السرعة لجلب كافة شارات وعدادات الطالب
 * (الإشعارات غير المقروءة · المهام المفتوحة بانتظار التسليم · الرسائل والتنبيهات الاجتماعية)
 * لضمان ظهور الأرقام بدقة على الجوال والحاسوب في كافة صفحات المنصة
 */
export async function getStudentBadges(user: {
  id: string;
  profile: { grade: string; section: string; gender: string } | null;
}): Promise<StudentBadgesResult> {
  try {
    const [notificationsRes, socialRes, assignments, pendingDataCount] = await Promise.all([
      getStudentNotifications(user).catch(() => ({
        notifications: [],
        unreadCount: 0,
        pinnedBanner: null,
        pinnedBanners: [],
        pendingImportant: 0,
      })),
      getSocialCounters(user.id).catch(() => ({
        unreadMessagesCount: 0,
        pendingFriendRequestsCount: 0,
        totalSocialAlerts: 0,
      })),
      db.taskAssignment.findMany({
        where: {
          OR: [
            { userId: user.id },
            { team: { members: { some: { userId: user.id } } } },
          ],
          task: { status: "PUBLISHED" },
        },
        select: {
          submission: {
            select: { status: true },
          },
        },
      }).catch(() => []),
      db.dataResponse.count({
        where: {
          userId: user.id,
          request: { status: "OPEN", mandatory: true },
        },
      }).catch(() => 0),
    ]);

    const openTaskCount = assignments.filter(
      (a) => !a.submission || a.submission.status === "RETURNED"
    ).length;

    return {
      unreadCount: notificationsRes.unreadCount,
      openTaskCount,
      unreadMessagesCount: socialRes.totalSocialAlerts,
      pendingCount: pendingDataCount,
      notifications: notificationsRes.notifications,
      pinnedBanners: notificationsRes.pinnedBanners,
      pinnedBanner: notificationsRes.pinnedBanner,
    };
  } catch (err) {
    console.error("[getStudentBadges] error:", err);
    return {
      unreadCount: 0,
      openTaskCount: 0,
      unreadMessagesCount: 0,
      pendingCount: 0,
      notifications: [],
      pinnedBanners: [],
      pinnedBanner: null,
    };
  }
}
