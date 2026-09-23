"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { logAudit } from "@/lib/platform";
import { levelFromPoints } from "@/lib/constants";

/**
 * فحص صلاحية الدخول لمركز المراقبة والإشراف
 */
async function requireSurveillanceAuth() {
  const admin = await requireAdmin();
  const user = await getCurrentUser();
  if (!user || !canUser(user, MODULES.SURVEILLANCE, "view")) {
    throw new Error("ليس لديك صلاحية الوصول لمركز المراقبة والإشراف.");
  }
  return user;
}

/**
 * البحث عن طالب لمراقبة نشاطه أو محادثاته
 */
export async function searchStudentsForSurveillance(query: string) {
  await requireSurveillanceAuth();
  const q = query.trim();
  if (!q) return [];

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { profile: { fullName: { contains: q, mode: "insensitive" } } },
        { profile: { studentCode: { contains: q, mode: "insensitive" } } },
        { profile: { phone: { contains: q } } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      avatarFrameId: true,
      lastActiveAt: true,
      createdAt: true,
      profile: {
        select: {
          fullName: true,
          gender: true,
          grade: true,
          section: true,
          phone: true,
          studentCode: true,
        },
      },
      pointEvents: { select: { points: true } },
      _count: {
        select: {
          messagesSent: true,
          messagesReceived: true,
          chatMessages: true,
        },
      },
    },
    take: 25,
    orderBy: { createdAt: "desc" },
  });

  return students.map((s) => {
    const points = s.pointEvents.reduce((acc, e) => acc + e.points, 0);
    return {
      id: s.id,
      username: s.username,
      displayName: s.displayName || s.profile?.fullName || "طالب",
      email: s.email,
      phone: s.profile?.phone || "غير مسجل",
      studentCode: s.profile?.studentCode || "—",
      gender: s.profile?.gender || "غير محدد",
      grade: s.profile?.grade || "—",
      section: s.profile?.section || "—",
      avatarUrl: s.avatarUrl,
      avatarFrameId: s.avatarFrameId,
      level: levelFromPoints(points),
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      stats: {
        sentDirectMessages: s._count.messagesSent,
        receivedDirectMessages: s._count.messagesReceived,
        publicChatMessages: s._count.chatMessages,
      },
    };
  });
}

/**
 * جلب قائمة المحادثات الخاصة لطالب معين
 */
export async function getStudentConversationsForAdmin(targetStudentId: string) {
  await requireSurveillanceAuth();

  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: targetStudentId },
        { receiverId: targetStudentId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          avatarFrameId: true,
          profile: { select: { fullName: true, gender: true, phone: true, studentCode: true } },
          pointEvents: { select: { points: true } },
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          avatarFrameId: true,
          profile: { select: { fullName: true, gender: true, phone: true, studentCode: true } },
          pointEvents: { select: { points: true } },
        },
      },
    },
  });

  // تجميع المحادثات حسب الطالب الآخر
  const convMap = new Map<string, {
    otherUser: {
      id: string;
      username: string | null;
      displayName: string;
      avatarUrl: string | null;
      avatarFrameId: string | null;
      phone: string;
      studentCode: string;
      gender: string;
      level: number;
    };
    totalMessages: number;
    lastMessage: {
      body: string;
      senderId: string;
      createdAt: Date;
    };
  }>();

  for (const m of messages) {
    const isSender = m.senderId === targetStudentId;
    const other = isSender ? m.receiver : m.sender;

    if (!convMap.has(other.id)) {
      const points = other.pointEvents.reduce((acc, e) => acc + e.points, 0);
      convMap.set(other.id, {
        otherUser: {
          id: other.id,
          username: other.username,
          displayName: other.displayName || other.profile?.fullName || "طالب",
          avatarUrl: other.avatarUrl,
          avatarFrameId: other.avatarFrameId,
          phone: other.profile?.phone || "—",
          studentCode: other.profile?.studentCode || "—",
          gender: other.profile?.gender || "غير محدد",
          level: levelFromPoints(points),
        },
        totalMessages: 1,
        lastMessage: {
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt,
        },
      });
    } else {
      const existing = convMap.get(other.id)!;
      existing.totalMessages += 1;
    }
  }

  return Array.from(convMap.values());
}

/**
 * وضع المراقب الخفي (Shadow Mode):
 * جلب أرشيف الرسائل بالكامل بين طالبين بدون التأثير على حالة القراءة (readAt)
 * وبدون تسجيل أي أثر يدل على دخول الإدارة على المحادثة!
 */
export async function getTranscriptBetweenStudents(
  studentAId: string,
  studentBId: string
) {
  await requireSurveillanceAuth();

  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: studentAId, receiverId: studentBId },
        { senderId: studentBId, receiverId: studentAId },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          avatarFrameId: true,
          profile: { select: { fullName: true } },
        },
      },
    },
    take: 200,
  });

  // جلب بيانات الطالبين للترويسة
  const [studentA, studentB] = await Promise.all([
    db.user.findUnique({
      where: { id: studentAId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        avatarFrameId: true,
        profile: { select: { fullName: true, phone: true, studentCode: true } },
      },
    }),
    db.user.findUnique({
      where: { id: studentBId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        avatarFrameId: true,
        profile: { select: { fullName: true, phone: true, studentCode: true } },
      },
    }),
  ]);

  return {
    studentA: studentA
      ? {
          id: studentA.id,
          name: studentA.displayName || studentA.profile?.fullName || studentA.email,
          username: studentA.username,
          phone: studentA.profile?.phone || "—",
          studentCode: studentA.profile?.studentCode || "—",
          avatarUrl: studentA.avatarUrl,
        }
      : null,
    studentB: studentB
      ? {
          id: studentB.id,
          name: studentB.displayName || studentB.profile?.fullName || studentB.email,
          username: studentB.username,
          phone: studentB.profile?.phone || "—",
          studentCode: studentB.profile?.studentCode || "—",
          avatarUrl: studentB.avatarUrl,
        }
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.displayName || m.sender.profile?.fullName || "طالب",
      senderAvatar: m.sender.avatarUrl,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt ? m.readAt.toISOString() : null,
      status: m.deletedBySender ? "DELETED_BY_SENDER" : m.deletedByReceiver ? "DELETED_BY_RECEIVER" : "VISIBLE",
    })),
  };
}

/**
 * جلب رسائل الشات العام للإدارة مع إمكانية التحكم والإشراف
 */
export async function getRecentChatMessagesForAdmin(take = 100) {
  await requireSurveillanceAuth();

  const messages = await db.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 200),
    include: {
      room: { select: { id: true, name: true, type: true } },
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          avatarFrameId: true,
          profile: { select: { fullName: true, phone: true, studentCode: true } },
          pointEvents: { select: { points: true } },
        },
      },
    },
  });

  return messages.map((m) => {
    const points = m.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
    return {
      id: m.id,
      body: m.body,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      room: m.room,
      user: {
        id: m.user.id,
        username: m.user.username,
        name: m.user.displayName || m.user.profile?.fullName || m.user.email,
        email: m.user.email,
        phone: m.user.profile?.phone || "—",
        studentCode: m.user.profile?.studentCode || "—",
        avatarUrl: m.user.avatarUrl,
        avatarFrameId: m.user.avatarFrameId,
        level: levelFromPoints(points),
      },
    };
  });
}

/**
 * إخفاء أو استعادة رسالة في الشات العام
 */
export async function toggleChatMessageVisibility(
  messageId: string,
  hidden: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireSurveillanceAuth();

    const msg = await db.chatMessage.findUnique({
      where: { id: messageId },
      include: { user: { select: { email: true } } },
    });

    if (!msg) return { ok: false, error: "الرسالة غير موجودة" };

    const newStatus = hidden ? "HIDDEN" : "VISIBLE";
    await db.chatMessage.update({
      where: { id: messageId },
      data: { status: newStatus },
    });

    await logAudit({
      actor: admin,
      action: hidden ? "chat.message.hide" : "chat.message.restore",
      entity: "ChatMessage",
      entityId: messageId,
      summary: `${hidden ? "إخفاء" : "استعادة"} رسالة في الشات العام بواسطة الإدارة`,
      details: {
        messageId,
        authorEmail: msg.user.email,
        snippet: msg.body.slice(0, 80),
      },
      before: { status: msg.status },
      after: { status: newStatus },
    });

    revalidatePath("/chat");
    revalidatePath("/admin/surveillance");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "فشل تعديل حالة الرسالة" };
  }
}

/**
 * جلب قائمة البلاغات المقدمة من الطلاب
 */
export async function getReportsList() {
  await requireSurveillanceAuth();

  const reports = await db.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });

  return reports.map((r) => ({
    id: r.id,
    reporterId: r.reporterId,
    reporterName: r.reporter.displayName || r.reporter.profile?.fullName || r.reporter.email,
    entityType: r.entityType,
    entityId: r.entityId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  }));
}

/**
 * معالجة بلاغ (مراجعة أو تجاهل)
 */
export async function resolveReport(
  reportId: string,
  action: "REVIEWED" | "DISMISSED"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireSurveillanceAuth();

    await db.report.update({
      where: { id: reportId },
      data: {
        status: action,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });

    await logAudit({
      actor: admin,
      action: `report.${action.toLowerCase()}`,
      entity: "Report",
      entityId: reportId,
      summary: `معالجة بلاغ بحالة: ${action}`,
    });

    revalidatePath("/admin/surveillance");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "فشل معالجة البلاغ" };
  }
}

/**
 * بيانات مركز العمليات والمراقبة الحية
 */
export async function getLiveOperationsData() {
  await requireSurveillanceAuth();

  const [
    recentAttendance,
    recentRegistrations,
    strikeStudents,
    recentAudits,
    activities,
    sessions,
  ] = await Promise.all([
    // 1. تسجيلات الحضور بالـ QR الحية
    db.attendance.findMany({
      where: { present: true },
      include: {
        registration: {
          select: {
            fullName: true,
            phone: true,
            studentCode: true,
            gender: true,
            grade: true,
            section: true,
            user: { select: { id: true, displayName: true, avatarUrl: true, avatarFrameId: true } },
          },
        },
        session: {
          select: { id: true, title: true, activity: { select: { id: true, title: true, type: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 35,
    }),

    // 2. أحدث التسجيلات
    db.registration.findMany({
      include: {
        session: {
          select: { id: true, title: true, activity: { select: { id: true, title: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 35,
    }),

    // 3. الطلاب ذوو إنذارات الغياب وتقييد الحضور
    db.user.findMany({
      where: {
        role: "STUDENT",
        OR: [
          { unexcusedAbsences: { gt: 0 } },
          { attendanceRestricted: true },
        ],
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        avatarFrameId: true,
        unexcusedAbsences: true,
        attendanceRestricted: true,
        lastActiveAt: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            studentCode: true,
            grade: true,
            section: true,
            gender: true,
          },
        },
      },
      orderBy: [{ unexcusedAbsences: "desc" }, { attendanceRestricted: "desc" }],
      take: 50,
    }),

    // 4. سجل الأمان والعمليات
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 35,
    }),

    // 5. الأنشطة لاختيار الجمهور
    db.activity.findMany({
      select: { id: true, title: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),

    // 6. الجلسات لاختيار الجمهور
    db.session.findMany({
      select: { id: true, title: true, startsAt: true, activity: { select: { title: true } } },
      orderBy: { startsAt: "desc" },
      take: 25,
    }),
  ]);

  return {
    recentAttendance: recentAttendance.map((a) => ({
      id: a.id,
      studentName: a.registration.fullName,
      studentPhone: a.registration.phone || "—",
      studentCode: a.registration.studentCode || "—",
      grade: a.registration.grade || "—",
      section: a.registration.section || "—",
      gender: a.registration.gender || "—",
      sessionTitle: a.session?.title || "—",
      activityTitle: a.session?.activity?.title || "—",
      activityType: a.session?.activity?.type || "WORKSHOP",
      method: a.method || "QR",
      attendedAt: (a.markedAt || a.createdAt).toISOString(),
      avatarUrl: a.registration.user?.avatarUrl || null,
      level: 1,
    })),
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      phone: r.phone || "—",
      studentCode: r.studentCode || "—",
      grade: r.grade || "—",
      section: r.section || "—",
      gender: r.gender || "—",
      status: r.status,
      source: r.source,
      waitlistOrder: r.waitlistOrder,
      sessionTitle: r.session.title,
      activityTitle: r.session.activity.title,
      createdAt: r.createdAt.toISOString(),
    })),
    strikeStudents: strikeStudents.map((s) => ({
      id: s.id,
      name: s.profile?.fullName || s.displayName || s.email,
      phone: s.profile?.phone || "—",
      studentCode: s.profile?.studentCode || "—",
      grade: s.profile?.grade || "—",
      section: s.profile?.section || "—",
      gender: s.profile?.gender || "—",
      absenceStrikes: s.unexcusedAbsences,
      attendanceRestricted: s.attendanceRestricted,
      avatarUrl: s.avatarUrl,
    })),
    recentAudits: recentAudits.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      summary: l.summary,
      actorName: l.actorEmail || "النظام",
      createdAt: l.createdAt.toISOString(),
    })),
    activities,
    sessions: sessions.map((s) => ({
      id: s.id,
      title: `${s.activity.title} — ${s.title}`,
      startsAt: s.startsAt.toISOString(),
    })),
  };
}

/**
 * إرسال رسالة أو توجيه إداري جماعي (مع رابط جروب أو تكليف)
 */
export async function sendAdministrativeBroadcast(input: {
  audience: "ALL" | "ACTIVITY" | "SESSION" | "STRIKES";
  activityId?: string;
  sessionId?: string;
  title: string;
  body: string;
  priority: "NORMAL" | "URGENT" | "DIRECTIVE";
  actionUrl?: string;
  actionLabel?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireSurveillanceAuth();
    if (!input.title?.trim()) return { ok: false, error: "عنوان التوجيه مطلوب" };
    if (!input.body?.trim()) return { ok: false, error: "نص التوجيه مطلوب" };

    // تجهيز هدف الاستهداف (Target JSON)
    let targetObj: Record<string, any> = { userIds: [] };

    if (input.audience === "ACTIVITY" && input.activityId) {
      targetObj = { activityId: input.activityId };
    } else if (input.audience === "SESSION" && input.sessionId) {
      targetObj = { sessionId: input.sessionId };
    } else if (input.audience === "STRIKES") {
      const strikeUsers = await db.user.findMany({
        where: { role: "STUDENT", OR: [{ unexcusedAbsences: { gt: 0 } }, { attendanceRestricted: true }] },
        select: { id: true },
      });
      targetObj = { userIds: strikeUsers.map((u) => u.id) };
    }

    const isUrgent = input.priority === "URGENT" || input.priority === "DIRECTIVE";
    const notificationType = input.priority === "URGENT" ? "IMPORTANT" : "ANNOUNCEMENT";
    const actionUrl = input.actionUrl?.trim() || null;
    const actionLabel = input.actionLabel?.trim() || (actionUrl?.includes("chat.whatsapp.com") ? "انضم لجروب الواتساب 💬" : "فتح الرابط ↗");
    const linkType = actionUrl?.includes("whatsapp") || actionUrl?.includes("wa.me") ? "WHATSAPP" : actionUrl?.includes("t.me") ? "TELEGRAM" : "LINK";

    const created = await db.notification.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        type: notificationType,
        pinned: isUrgent, // يظهر بنراً عاجلاً بأعلى لوحة الطالب حتى إغلاقه
        ctaUrl: actionUrl,
        ctaLabel: actionUrl ? actionLabel : null,
        ctaNewTab: true,
        linkType,
        target: JSON.stringify(targetObj),
        createdById: admin.id,
      },
    });

    await logAudit({
      actor: admin,
      action: "ADMIN_BROADCAST_SENT",
      entity: "Notification",
      entityId: created.id,
      summary: `إرسال توجيه جماعي: «${input.title}» (${input.audience})`,
    });

    revalidatePath("/panel");
    revalidatePath("/admin/surveillance");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "فشل إرسال التوجيه" };
  }
}

/**
 * تصفير إنذارات الغياب وإلغاء تقييد الحضور لطالب
 */
export async function resetStudentAbsenceStrikes(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireSurveillanceAuth();
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) return { ok: false, error: "الطالب غير موجود" };

    await db.user.update({
      where: { id: userId },
      data: {
        unexcusedAbsences: 0,
        attendanceRestricted: false,
        absenceWarnings: 0,
      },
    });

    await logAudit({
      actor: admin,
      action: "ABSENCE_STRIKES_RESET",
      entity: "User",
      entityId: userId,
      summary: `تصفير إنذارات الغياب للطالب: ${user.profile?.fullName || user.displayName || user.email}`,
    });

    revalidatePath("/admin/surveillance");
    revalidatePath(`/admin/students/${userId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "فشل تصفير الإنذارات" };
  }
}