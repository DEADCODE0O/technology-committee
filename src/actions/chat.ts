"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { maskBannedWords } from "@/lib/content-filter";
import { levelFromPoints } from "@/lib/constants";

/**
 * التأكد من وجود غرفة الشات العام الافتراضية
 */
export async function ensureGeneralChatRoom() {
  let room = await db.chatRoom.findFirst({
    where: { type: "GENERAL" },
  });

  if (!room) {
    room = await db.chatRoom.create({
      data: {
        name: "شات مجتمع اللجنة التكنولوجية",
        type: "GENERAL",
        description: "شات عام لجميع طلاب اللجنة التكنولوجية للتعارف والنقاشات التقنية المفيدة.",
        icon: "💬",
      },
    });
  }

  return room;
}

/**
 * الحصول على أو إنشاء غرفة شات لنشاط/ورشة/كورس
 */
export async function getOrCreateActivityChatRoom(activityId: string) {
  try {
    const activity = await db.activity.findUnique({
      where: { id: activityId },
      include: { chatRooms: true },
    });
    if (!activity) return null;

    let room = activity.chatRooms[0];
    if (!room) {
      room = await db.chatRoom.create({
        data: {
          name: `شات ${activity.title}`,
          type: "ACTIVITY",
          activityId: activity.id,
          icon: "💬",
          description: `المحادثة الجماعية الرسمية للمشاركين في: ${activity.title}`,
        },
      });
    }
    return room;
  } catch (err) {
    console.error("getOrCreateActivityChatRoom error:", err);
    return null;
  }
}

/**
 * الحصول على أو إنشاء غرفة شات لفريق
 */
export async function getOrCreateTeamChatRoom(teamId: string) {
  try {
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { chatRooms: true },
    });
    if (!team) return null;

    let room = team.chatRooms[0];
    if (!room) {
      room = await db.chatRoom.create({
        data: {
          name: `شات فريق ${team.name}`,
          type: "TEAM",
          teamId: team.id,
          icon: team.icon || "🛡️",
          description: `المحادثة الخاصة والتنسيق الداخلي لأعضاء فريق ${team.name}`,
        },
      });
    }
    return room;
  } catch (err) {
    console.error("getOrCreateTeamChatRoom error:", err);
    return null;
  }
}

/**
 * جلب قائمة غرف الدردشة الجماعية المتاحة للمستخدم الحالي
 */
export async function getMyChatRooms() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // الغرفة العامة
    await ensureGeneralChatRoom();

    // غرف الفرق التي ينتمي إليها المستخدم
    const teamMemberships = await db.teamMember.findMany({
      where: { userId: user.id },
      include: { team: { include: { chatRooms: true } } },
    });

    // غرف الأنشطة المسجل بها
    const registrations = await db.registration.findMany({
      where: { userId: user.id, status: "REGISTERED" },
      include: { session: { include: { activity: { include: { chatRooms: true } } } } },
    });

    const roomIds = new Set<string>();

    // إضافة غرف الفرق
    for (const m of teamMemberships) {
      if (m.team.chatRooms[0]) {
        roomIds.add(m.team.chatRooms[0].id);
      }
    }

    // إضافة غرف الأنشطة
    for (const r of registrations) {
      if (r.session.activity.chatRooms[0]) {
        roomIds.add(r.session.activity.chatRooms[0].id);
      }
    }

    // جلب جميع الغرف
    return await db.chatRoom.findMany({
      where: {
        OR: [
          { type: "GENERAL" },
          { id: { in: Array.from(roomIds) } },
        ],
      },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("getMyChatRooms error:", err);
    return [];
  }
}

/**
 * إرسال رسالة في شات جماعي مع دعم الرد على رسالة
 */
export async function sendChatMessage(
  roomId: string,
  rawBody: string,
  replyToId?: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = rawBody?.trim();
    if (!text) return { ok: false, error: "الرسالة فارغة" };
    if (text.length > 500) return { ok: false, error: "الرسالة طويلة جداً (الحد الأقصى 500 حرف)" };

    const room = await db.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false, error: "غرفة المحادثة غير موجودة" };

    // فحص صلاحية الوصول لشات الفرق
    if (room.type === "TEAM" && room.teamId) {
      const isMember = await db.teamMember.findFirst({
        where: { teamId: room.teamId, userId: user.id },
      });
      if (!isMember && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        return { ok: false, error: "هذا الشات مخصص لأعضاء الفريق فقط" };
      }
    }

    // فحص معدل الإرسال (30 رسالة كل 5 دقائق)
    const rl = rateLimit(`chat:${user.id}`, 30, 5 * 60 * 1000);
    if (!rl.ok) {
      return { ok: false, error: `هدئ سرعتك قليلاً — يمكنك الإرسال بعد ${rl.retryAfterSec} ثانية` };
    }

    // تنقية الكلمات المحظورة
    const cleanBody = await maskBannedWords(text);

    const message = await db.chatMessage.create({
      data: {
        roomId,
        userId: user.id,
        body: cleanBody,
        replyToId: replyToId || null,
      },
    });

    // تحديث وقت آخر ظهور
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    revalidatePath(`/messages/room/${roomId}`);
    revalidatePath("/messages");
    return { ok: true, messageId: message.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إرسال الرسالة" };
  }
}

/**
 * تعديل رسالة شات (خلال 15 دقيقة)
 */
export async function editChatMessage(
  messageId: string,
  newBody: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = newBody?.trim();
    if (!text) return { ok: false, error: "الرسالة لا يمكن أن تكون فارغة" };
    if (text.length > 500) return { ok: false, error: "الرسالة طويلة جداً" };

    const message = await db.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) return { ok: false, error: "الرسالة غير موجودة" };

    if (message.userId !== user.id) {
      return { ok: false, error: "لا يمكنك تعديل رسائل الآخرين" };
    }

    // فحص الوقت: 15 دقيقة فقط
    const diffMin = (Date.now() - message.createdAt.getTime()) / (1000 * 60);
    if (diffMin > 15) {
      return { ok: false, error: "انتهت مهلة تعديل الرسالة (15 دقيقة)" };
    }

    const cleanBody = await maskBannedWords(text);
    await db.chatMessage.update({
      where: { id: messageId },
      data: {
        body: cleanBody,
        editedAt: new Date(),
      },
    });

    revalidatePath(`/messages/room/${message.roomId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تعديل الرسالة" };
  }
}

/**
 * حذف رسالة شات (من قبل صاحبها أو المشرف)
 */
export async function deleteChatMessage(
  messageId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const message = await db.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) return { ok: false, error: "الرسالة غير موجودة" };

    const isOwner = message.userId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { ok: false, error: "غير مصرح لك بحذف هذه الرسالة" };
    }

    await db.chatMessage.update({
      where: { id: messageId },
      data: { status: "DELETED", body: "تم حذف هذه الرسالة" },
    });

    revalidatePath(`/messages/room/${message.roomId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حذف الرسالة" };
  }
}

/**
 * جلب رسائل الشات الجماعي لغرفة معينة
 */
export async function getChatRoomMessages(roomId: string, take = 80) {
  try {
    const messages = await db.chatMessage.findMany({
      where: {
        roomId,
        status: { in: ["VISIBLE", "DELETED"] },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarFrameId: true,
            role: true,
            profile: { select: { fullName: true, gender: true } },
            pointEvents: { select: { points: true } },
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: Math.min(take, 100),
    });

    return messages.map((m) => {
      const points = m.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
      return {
        id: m.id,
        body: m.body,
        isDeleted: m.status === "DELETED",
        editedAt: m.editedAt ? m.editedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          username: m.user.username,
          name: m.user.displayName || m.user.profile?.fullName || "طالب",
          avatarUrl: m.user.avatarUrl,
          avatarFrameId: m.user.avatarFrameId,
          role: m.user.role,
          level: levelFromPoints(points),
        },
        replyTo: m.replyTo
          ? {
              id: m.replyTo.id,
              authorName: m.replyTo.user.displayName || m.replyTo.user.profile?.fullName || "طالب",
              snippet: m.replyTo.status === "DELETED" ? "رسالة محذوفة" : m.replyTo.body.slice(0, 60),
            }
          : null,
      };
    });
  } catch (err) {
    console.error("getChatRoomMessages error:", err);
    return [];
  }
}
