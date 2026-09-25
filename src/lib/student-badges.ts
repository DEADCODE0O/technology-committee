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

const badgesCache = new Map<string, { result: StudentBadgesResult; expiresAt: number }>();

export function clearBadgesCache(userId?: string) {
  if (userId) {
    badgesCache.delete(userId);
  } else {
    badgesCache.clear();
  }
}

/**
 * دالة موحدة فائقة السرعة لجلب كافة شارات وعدادات الطالب
 * (الإشعارات غير المقروءة · المهام المفتوحة بانتظار التسليم · الرسائل والتنبيهات الاجتماعية)
 * لضمان ظهور الأرقام بدقة على الجوال والحاسوب في كافة صفحات المنصة
 */
export async function getStudentBadges(user: {
  id: string;
  profile?: { grade: string; section: string; gender: string } | null;
}): Promise<StudentBadgesResult> {
  const nowMs = Date.now();
  const cached = badgesCache.get(user.id);
  if (cached && cached.expiresAt > nowMs) {
    return cached.result;
  }

  try {
    // 1. جلب عضوية الفريق للطالب لمطابقة استعلام صفحة المهام تماماً
    const membership = await db.teamMember
      .findFirst({
        where: { userId: user.id },
        select: { teamId: true },
      })
      .catch(() => null);

    const [notificationsRes, assignments, pendingDataCount] = await Promise.all([
      getStudentNotifications(user as any).catch(() => ({
        notifications: [],
        unreadCount: 0,
        pinnedBanner: null,
        pinnedBanners: [],
        pendingImportant: 0,
      })),
      db.taskAssignment
        .findMany({
          where: {
            OR: [
              { userId: user.id },
              ...(membership?.teamId ? [{ teamId: membership.teamId }] : []),
            ],
            task: { status: { in: ["PUBLISHED", "CLOSED"] } },
          },
          select: {
            submission: {
              select: { status: true },
            },
          },
        })
        .catch((e) => {
          console.error("[getStudentBadges] tasks error:", e);
          return [];
        }),
      // طلبات البيانات الإلزامية المعلقة بانتظار إجابة الطالب
      db.dataRequest
        .count({
          where: {
            status: "OPEN",
            mandatory: true,
            responses: {
              none: { userId: user.id },
            },
          },
        })
        .catch(() => 0),
    ]);

    const openTaskCount = assignments.filter(
      (a) => !a.submission || a.submission.status === "RETURNED"
    ).length;

    const finalResult: StudentBadgesResult = {
      unreadCount: notificationsRes.unreadCount,
      openTaskCount,
      unreadMessagesCount: 0,
      pendingCount: pendingDataCount,
      notifications: notificationsRes.notifications,
      pinnedBanners: notificationsRes.pinnedBanners,
      pinnedBanner: notificationsRes.pinnedBanner,
    };
    badgesCache.set(user.id, { result: finalResult, expiresAt: nowMs + 30 * 1000 });
    return finalResult;
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
