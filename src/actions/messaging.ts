"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { maskBannedWords } from "@/lib/content-filter";
import { levelFromPoints } from "@/lib/constants";

/**
 * إرسال رسالة خاصة (بين الأصدقاء المعتمدين فقط)
 */
export async function sendDirectMessage(
  receiverId: string,
  rawBody: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const user = await requireStudentAction();
    const text = rawBody?.trim();
    if (!text) return { ok: false, error: "نص الرسالة فارغ" };
    if (text.length > 1000) return { ok: false, error: "الرسالة طويلة جداً (الحد الأقصى 1000 حرف)" };

    if (user.id === receiverId) {
      return { ok: false, error: "لا يمكنك مراسلة نفسك" };
    }

    // التحقق الصارم من وجود صداقة معتمدة بين الطرفين
    const friendship = await db.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (!friendship) {
      return { ok: false, error: "لا يمكن المراسلة إلا بعد قبول طلب الصداقة المتبادل بينكما" };
    }

    // فحص معدل الإرسال (حد أقصى 60 رسالة في الساعة لكل طالب لمنع السبام)
    const rl = rateLimit(`dm:${user.id}`, 60, 60 * 1000);
    if (!rl.ok) {
      return { ok: false, error: `أرسلت رسائل كثيرة جداً — حاول مجدداً بعد ${rl.retryAfterSec} ثانية` };
    }

    // تنقية وفلترة الكلمات المحظورة
    const cleanBody = await maskBannedWords(text);

    const message = await db.directMessage.create({
      data: {
        senderId: user.id,
        receiverId,
        body: cleanBody,
      },
    });

    // تحديث وقت آخر نشاط للطالب
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    revalidatePath(`/messages/${receiverId}`);
    revalidatePath("/messages");
    return { ok: true, messageId: message.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إرسال الرسالة" };
  }
}

/**
 * جلب رسائل المحادثة بين الطالب الحالي وطالب آخر
 */
export async function getConversationMessages(otherUserId: string, take = 50) {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, messages: [], error: "انتهت الجلسة" };

    // جلب معلومات الصديق
    const otherUser = await db.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarFrameId: true,
        lastActiveAt: true,
        profile: {
          select: {
            fullName: true,
            gender: true,
            grade: true,
            section: true,
          },
        },
        pointEvents: { select: { points: true } },
      },
    });

    if (!otherUser) {
      return { ok: false, messages: [], error: "المستخدم غير موجود" };
    }

    // فحص هل هما أصدقاء
    const friendship = await db.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.id },
        ],
      },
    });

    // جلب الرسائل
    const messages = await db.directMessage.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: otherUserId, deletedBySender: false },
          { senderId: otherUserId, receiverId: user.id, deletedByReceiver: false },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: Math.min(take, 100),
    });

    // وضع علامة مقروءة للرسائل الواردة غير المقروءة
    await db.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const otherPoints = otherUser.pointEvents.reduce((acc, e) => acc + e.points, 0);

    return {
      ok: true,
      friendshipStatus: friendship ? "ACCEPTED" : "NONE",
      otherUser: {
        id: otherUser.id,
        username: otherUser.username,
        displayName: otherUser.displayName || otherUser.profile?.fullName || "طالب",
        avatarUrl: otherUser.avatarUrl,
        avatarFrameId: otherUser.avatarFrameId,
        gender: otherUser.profile?.gender || "MALE",
        grade: otherUser.profile?.grade || "FIRST",
        section: otherUser.profile?.section || "IS",
        level: levelFromPoints(otherPoints),
        lastActiveAt: otherUser.lastActiveAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        body: m.body,
        readAt: m.readAt,
        createdAt: m.createdAt.toISOString(),
        mine: m.senderId === user.id,
      })),
    };
  } catch (err) {
    console.error("getConversationMessages error:", err);
    return { ok: false, messages: [], error: "تعذر تحميل المحادثة" };
  }
}

/**
 * جلب قائمة المحادثات النشطة مع آخر رسالة لكل محادثة
 */
export async function getConversationsList() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // جلب كل الأصدقاء المقبولين
    const friendships = await db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarFrameId: true,
            lastActiveAt: true,
            profile: { select: { fullName: true, gender: true } },
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
            lastActiveAt: true,
            profile: { select: { fullName: true, gender: true } },
            pointEvents: { select: { points: true } },
          },
        },
      },
    });

    const friendUsers = friendships.map((f) => (f.senderId === user.id ? f.receiver : f.sender));

    const conversations = await Promise.all(
      friendUsers.map(async (friend) => {
        // آخر رسالة
        const lastMsg = await db.directMessage.findFirst({
          where: {
            OR: [
              { senderId: user.id, receiverId: friend.id, deletedBySender: false },
              { senderId: friend.id, receiverId: user.id, deletedByReceiver: false },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        // عدد غير المقروءة الواردة
        const unreadCount = await db.directMessage.count({
          where: {
            senderId: friend.id,
            receiverId: user.id,
            readAt: null,
            deletedByReceiver: false,
          },
        });

        const points = friend.pointEvents.reduce((acc, e) => acc + e.points, 0);

        return {
          friend: {
            id: friend.id,
            username: friend.username,
            name: friend.displayName || friend.profile?.fullName || "طالب",
            gender: friend.profile?.gender || "MALE",
            avatarUrl: friend.avatarUrl,
            avatarFrameId: friend.avatarFrameId,
            level: levelFromPoints(points),
            lastActiveAt: friend.lastActiveAt,
          },
          lastMessage: lastMsg
            ? {
                body: lastMsg.body,
                createdAt: lastMsg.createdAt.toISOString(),
                mine: lastMsg.senderId === user.id,
                read: !!lastMsg.readAt,
              }
            : null,
          unreadCount,
        };
      })
    );

    // ترتيب المحادثات حسب تاريخ آخر رسالة
    return conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error("getConversationsList error:", err);
    return [];
  }
}

