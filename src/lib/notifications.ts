// ═══════════════════════════════════════════════════════════════
//  محرك الإشعارات — وجهة نظر الطالب
//  الإشعار يُرسل لجمهور (target) — وحالة القراءة/الإغفال لكل طالب
//  الإشعار المهم المثبت يظهر بنرًا أعلى لوحة الطالب حتى «تم»
//  ويبقى دائمًا في مركز الإشعارات للرجوع إليه في أي وقت
// ═══════════════════════════════════════════════════════════════

import "server-only";
import { db } from "@/lib/db";
import { parseTarget, type StudentTarget } from "@/lib/targeting";

export type StudentNotification = {
  id: string;
  type: string;
  pinned: boolean;
  title: string;
  body: string | null;
  buttons: string | null; // JSON أزرار متعددة [{label, url, newTab}]
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaNewTab: boolean;
  linkType: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null; // «تم» على البنر — يختفي البنر ويبقى بالمركز
};

export type StudentNotificationsResult = {
  notifications: StudentNotification[];
  unreadCount: number;
  pinnedBanner: StudentNotification | null; // الإشعار المثبت غير المُغفَل الأحدث
  pinnedBanners: StudentNotification[]; // قائمة البنرات المثبتة والترحيبية الأحدث (حتى 3)
  pendingImportant: number;
};

type TargetableUser = {
  id: string;
  profile: { grade: string; section: string; gender: string } | null;
};

// هل الطالب ضمن جمهور الإشعار؟ (بدون استعلامات — للعرض في الذاكرة)
function userMatchesTarget(user: TargetableUser, target: StudentTarget, attendedSet: Set<string>): boolean {
  if (target.userIds.length && !target.userIds.includes(user.id)) return false;
  if (target.grades.length && user.profile?.grade && !target.grades.includes(user.profile.grade)) return false;
  if (target.sections.length && user.profile?.section && !target.sections.includes(user.profile.section)) return false;
  if (target.genders.length && user.profile?.gender && !target.genders.includes(user.profile.gender)) return false;
  if (target.attendance === "ATTENDED" && !attendedSet.has(user.id)) return false;
  if (target.attendance === "NOT_ATTENDED" && attendedSet.has(user.id)) return false;
  return true;
}

// جلب إشعارات الطالب مع حالة القراءة — المصدر الوحيد لكل واجهات الطالب
export async function getStudentNotifications(user: {
  id: string;
  profile: { grade: string; section: string; gender: string } | null;
}): Promise<StudentNotificationsResult> {
  const [all, reads, attendedRows] = await Promise.all([
    db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 200, // سقف وافٍ لمنصة جامعية
    }),
    db.notificationRead.findMany({ where: { userId: user.id } }),
    db.attendance.findMany({ where: { present: true }, select: { registration: { select: { userId: true } } } }),
  ]);

  const attendedSet = new Set(attendedRows.map((a) => a.registration.userId).filter(Boolean) as string[]);
  const now = new Date();

  const visible: StudentNotification[] = [];
  for (const n of all) {
    // انتهت صلاحيته؟ يختفي من الطالب نهائيًا
    if (n.expiresAt && n.expiresAt < now) continue;
    const target = parseTarget(n.target);
    // فلتر الجلسة يحتاج استعلامًا — نسأله فقط إذا كان مضبوطًا (نادر)
    if (target.sessionId) {
      const inSession = await db.registration.findFirst({
        where: { sessionId: target.sessionId, userId: user.id, status: "REGISTERED" },
        select: { id: true },
      });
      if (!inSession) continue;
    }
    if (!userMatchesTarget(user, target, attendedSet)) continue;

    const read = reads.find((r) => r.notificationId === n.id);
    visible.push({
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
      expiresAt: n.expiresAt,
      createdAt: n.createdAt,
      readAt: read?.readAt ?? null,
      dismissedAt: read?.dismissedAt ?? null,
    });
  }

  const unreadCount = visible.filter((n) => !n.readAt).length;
  const pendingImportant = visible.filter((n) => !n.readAt && (n.pinned || n.type === "IMPORTANT" || n.type === "WELCOME")).length;
  // البنرات: الإشعارات المثبتة أو المهمة أو الترحيبية غير المُغفَلة — الأحدث أولًا
  const pinnedBanners = visible.filter(
    (n) => (n.pinned || n.type === "IMPORTANT" || n.type === "WELCOME") && !n.dismissedAt && (!n.expiresAt || n.expiresAt > now)
  ).slice(0, 3);
  const bannerCandidate = pinnedBanners[0] ?? null;

  return { notifications: visible, unreadCount, pinnedBanner: bannerCandidate, pinnedBanners, pendingImportant };
}

// تعليم إشعار كمقروء (عند فتحه أو الضغط على CTA)
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await db.notificationRead.upsert({
    where: { userId_notificationId: { userId, notificationId } },
    create: { userId, notificationId, readAt: new Date() },
    update: { readAt: new Date() },
  });
}

// تعليم الكل كمقروء (عند فتح مركز الإشعارات)
export async function markAllNotificationsRead(userId: string, ids: string[]): Promise<void> {
  for (const notificationId of ids) {
    await markNotificationRead(userId, notificationId);
  }
}

// «تم» على البنر — يخفي البنر ويبقي الإشعار بالمركز مقروءًا
export async function dismissNotification(userId: string, notificationId: string): Promise<void> {
  await db.notificationRead.upsert({
    where: { userId_notificationId: { userId, notificationId } },
    create: { userId, notificationId, readAt: new Date(), dismissedAt: new Date() },
    update: { readAt: new Date(), dismissedAt: new Date() },
  });
}

// ═══════════════════════════════════════════════════════════════
//  إنشاء إشعار موجه لقائمة مستخدمين (يستخدمه محرك المهام
//  والتقييمات تلقائيًا) — audience JSON موحّد + زر اختياري
// ═══════════════════════════════════════════════════════════════

export async function createNotificationForUsers(params: {
  type: string; // INFO | IMPORTANT | ANNOUNCEMENT | TASK | COMMUNITY | POINTS
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  ctaNewTab?: boolean;
  target: StudentTarget;
  createdById: string;
  pinned?: boolean;
}): Promise<string | null> {
  try {
    const isInternal = params.linkUrl?.startsWith("/");
    const notification = await db.notification.create({
      data: {
        type: params.type,
        pinned: params.pinned ?? false,
        title: params.title.slice(0, 120),
        body: params.body?.slice(0, 2000) ?? null,
        ctaLabel: params.linkLabel ?? null,
        ctaUrl: params.linkUrl ?? null,
        ctaNewTab: params.ctaNewTab ?? (isInternal ? false : true),
        target: JSON.stringify(params.target),
        createdById: params.createdById,
      },
    });
    return notification.id;
  } catch (err) {
    console.error("createNotificationForUsers error:", err);
    return null;
  }
}
