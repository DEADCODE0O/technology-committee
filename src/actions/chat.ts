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
 * جلب قائمة غرف الدردشة الجماعية المتاحة
 */
export async function getChatRoomsList() {
  try {
    await ensureGeneralChatRoom();
    return await db.chatRoom.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  } catch (err) {
    console.error("getChatRoomsList error:", err);
    return [];
  }
}

/**
 * إرسال رسالة في شات جماعي
 */
export async function sendChatMessage(
  roomId: string,
  rawBody: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = rawBody?.trim();
    if (!text) return { ok: false, error: "الرسالة فارغة" };
    if (text.length > 500) return { ok: false, error: "الرسالة طويلة جداً (الحد الأقصى 500 حرف)" };

    const room = await db.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return { ok: false, error: "غرفة المحادثة غير موجودة" };

    // فحص معدل الإرسال (30 رسالة كل 5 دقائق لمنع الإغراق)
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
      },
    });

    // تحديث وقت آخر ظهور
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    revalidatePath("/chat");
    return { ok: true, messageId: message.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إرسال الرسالة" };
  }
}

/**
 * جلب رسائل الشات الجماعي لغرفة معينة
 */
export async function getChatRoomMessages(roomId: string, take = 60) {
  try {
    const messages = await db.chatMessage.findMany({
      where: {
        roomId,
        status: "VISIBLE",
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
      },
      orderBy: { createdAt: "asc" },
      take: Math.min(take, 100),
    });

    return messages.map((m) => {
      const points = m.user.pointEvents.reduce((acc, e) => acc + e.points, 0);
      return {
        id: m.id,
        body: m.body,
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
      };
    });
  } catch (err) {
    console.error("getChatRoomMessages error:", err);
    return [];
  }
}

