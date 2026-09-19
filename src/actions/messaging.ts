"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { maskBannedWords } from "@/lib/content-filter";
import { levelFromPoints } from "@/lib/constants";
import { ensureGeneralChatRoom } from "./chat";

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
 * حذف رسالة خاصة من جانب المستخدم فقط
 */
export async function deleteDirectMessage(messageId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const message = await db.directMessage.findUnique({ where: { id: messageId } });
    if (!message) return { ok: false, error: "الرسالة غير موجودة" };

    if (message.senderId === user.id) {
      await db.directMessage.update({
        where: { id: messageId },
        data: { deletedBySender: true },
      });
    } else if (message.receiverId === user.id) {
      await db.directMessage.update({
        where: { id: messageId },
        data: { deletedByReceiver: true },
      });
    } else {
      return { ok: false, error: "غير مصرح لك بحذف هذه الرسالة" };
    }

    revalidatePath("/messages");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حذف الرسالة" };
  }
}

/**
 * مسح سجل المحادثة الخاصة بالكامل من جانب المستخدم فقط
 */
export async function clearDirectConversation(otherUserId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await Promise.all([
      db.directMessage.updateMany({
        where: { senderId: user.id, receiverId: otherUserId },
        data: { deletedBySender: true },
      }),
      db.directMessage.updateMany({
        where: { senderId: otherUserId, receiverId: user.id },
        data: { deletedByReceiver: true },
      }),
    ]);

    revalidatePath("/messages");
    revalidatePath(`/messages/${otherUserId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر مسح المحادثة" };
  }
}

/**
 * حظر مستخدم (صديق)
 */
export async function blockUser(otherUserId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await db.friendship.updateMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.id },
        ],
      },
      data: { status: "BLOCKED" },
    });

    revalidatePath("/messages");
    revalidatePath(`/messages/${otherUserId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حظر المستخدم" };
  }
}

/**
 * إبلاغ عن محتوى (رسالة، شات، منشور، تعليق)
 */
export async function reportEntity(input: {
  entityType: "MESSAGE" | "CHAT_MESSAGE" | "POST" | "COMMENT" | "STUDENT_POST" | "PROFILE";
  entityId: string;
  reason: "INAPPROPRIATE" | "SPAM" | "HARASSMENT" | "OTHER";
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await db.report.create({
      data: {
        reporterId: user.id,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        details: input.details?.slice(0, 250) || null,
      },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إرسال البلاغ" };
  }
}

/**
 * جلب رسائل المحادثة بين الطالب الحالي وطالب آخر
 */
export async function getConversationMessages(otherUserId: string, take = 60) {
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
        OR: [
          { senderId: user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.id },
        ],
      },
    });

    // جلب الرسائل غير المحذوفة من جانب هذا المستخدم
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
      friendshipStatus: friendship?.status || "NONE",
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

export interface UnifiedConversation {
  id: string;
  type: "DIRECT" | "TEAM" | "ACTIVITY";
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  avatarFrameId?: string | null;
  level?: number;
  icon?: string;
  color?: string;
  href: string;
  lastMessage: {
    body: string;
    createdAt: string;
    mine?: boolean;
    read?: boolean;
  } | null;
  unreadCount: number;
}

/**
 * جلب قائمة المحادثات الموحدة:
 * 1. محادثات الأصدقاء الخاصة
 * 2. شاتات الفرق المنتمي إليها الطالب
 * 3. شاتات الأنشطة والورش المسجل بها الطالب
 */
export async function getUnifiedConversations(): Promise<UnifiedConversation[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const items: UnifiedConversation[] = [];

    // ── 1. محادثات الأصدقاء ──
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
            profile: { select: { fullName: true } },
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
            profile: { select: { fullName: true } },
            pointEvents: { select: { points: true } },
          },
        },
      },
    });

    const friendUsers = friendships.map((f) => (f.senderId === user.id ? f.receiver : f.sender));

    await Promise.all(
      friendUsers.map(async (friend) => {
        const lastMsg = await db.directMessage.findFirst({
          where: {
            OR: [
              { senderId: user.id, receiverId: friend.id, deletedBySender: false },
              { senderId: friend.id, receiverId: user.id, deletedByReceiver: false },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const unreadCount = await db.directMessage.count({
          where: {
            senderId: friend.id,
            receiverId: user.id,
            readAt: null,
            deletedByReceiver: false,
          },
        });

        const points = friend.pointEvents.reduce((acc, e) => acc + e.points, 0);

        items.push({
          id: friend.id,
          type: "DIRECT",
          title: friend.displayName || friend.profile?.fullName || "طالب",
          subtitle: friend.username ? `@${friend.username}` : undefined,
          avatarUrl: friend.avatarUrl,
          avatarFrameId: friend.avatarFrameId,
          level: levelFromPoints(points),
          href: `/messages/${friend.id}`,
          lastMessage: lastMsg
            ? {
                body: lastMsg.body,
                createdAt: lastMsg.createdAt.toISOString(),
                mine: lastMsg.senderId === user.id,
                read: !!lastMsg.readAt,
              }
            : null,
          unreadCount,
        });
      })
    );

    // ── 2. شاتات الفرق ──
    const teamMemberships = await db.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            chatRooms: {
              include: {
                messages: {
                  where: { status: "VISIBLE" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  include: {
                    user: {
                      select: {
                        displayName: true,
                        profile: { select: { fullName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const tm of teamMemberships) {
      const team = tm.team;
      let room = team.chatRooms[0];
      if (!room) {
        room = await db.chatRoom.create({
          data: {
            name: `شات فريق ${team.name}`,
            type: "TEAM",
            teamId: team.id,
            icon: team.icon || "🛡️",
            description: `المحادثة الخاصة لأعضاء فريق ${team.name}`,
          },
          include: {
            messages: {
              where: { status: "VISIBLE" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                user: {
                  select: {
                    displayName: true,
                    profile: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        });
      }

      const lastMsg = room.messages?.[0];
      items.push({
        id: room.id,
        type: "TEAM",
        title: team.name,
        subtitle: "شات الفريق",
        icon: team.icon || "🛡️",
        color: team.color || "#c9a45c",
        href: `/messages/room/${room.id}`,
        lastMessage: lastMsg
          ? {
              body: `${lastMsg.user.displayName || lastMsg.user.profile?.fullName || "عضو"}: ${lastMsg.body}`,
              createdAt: lastMsg.createdAt.toISOString(),
            }
          : null,
        unreadCount: 0,
      });
    }

    // ── 3. شاتات الأنشطة والورش ──
    const registrations = await db.registration.findMany({
      where: { userId: user.id, status: "REGISTERED" },
      include: {
        session: {
          include: {
            activity: {
              include: {
                chatRooms: {
                  include: {
                    messages: {
                      where: { status: "VISIBLE" },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                      include: {
                        user: {
                          select: {
                            displayName: true,
                            profile: { select: { fullName: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const seenActivityIds = new Set<string>();
    for (const reg of registrations) {
      const act = reg.session.activity;
      if (seenActivityIds.has(act.id)) continue;
      seenActivityIds.add(act.id);

      let room = act.chatRooms[0];
      if (!room) {
        room = await db.chatRoom.create({
          data: {
            name: `شات ${act.title}`,
            type: "ACTIVITY",
            activityId: act.id,
            icon: "💬",
            description: `المحادثة الرسمية للمشاركين في: ${act.title}`,
          },
          include: {
            messages: {
              where: { status: "VISIBLE" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                user: {
                  select: {
                    displayName: true,
                    profile: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        });
      }

      const lastMsg = room.messages?.[0];
      items.push({
        id: room.id,
        type: "ACTIVITY",
        title: act.title,
        subtitle: "شات النشاط",
        icon: "💬",
        href: `/messages/room/${room.id}`,
        lastMessage: lastMsg
          ? {
              body: `${lastMsg.user.displayName || lastMsg.user.profile?.fullName || "طالب"}: ${lastMsg.body}`,
              createdAt: lastMsg.createdAt.toISOString(),
            }
          : null,
        unreadCount: 0,
      });
    }

    // ترتيب المحادثات حسب تاريخ آخر رسالة
    return items.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error("getUnifiedConversations error:", err);
    return [];
  }
}

/**
 * متوافق مع الاستخدامات السابقة
 */
export async function getConversationsList() {
  return await getUnifiedConversations();
}

export type SocialCounters = {
  unreadMessagesCount: number;
  pendingFriendRequestsCount: number;
  totalSocialAlerts: number;
};

/**
 * جلب عدادات الرسائل وطلبات الصداقة بسرعة فائقة عبر الفهارس
 */
export async function getSocialCounters(explicitUserId?: string): Promise<SocialCounters> {
  try {
    let userId = explicitUserId;
    if (!userId) {
      const user = await getCurrentUser();
      userId = user?.id;
    }
    if (!userId) {
      return { unreadMessagesCount: 0, pendingFriendRequestsCount: 0, totalSocialAlerts: 0 };
    }

    const [unreadMessagesCount, pendingFriendRequestsCount] = await Promise.all([
      db.directMessage.count({
        where: { receiverId: userId, readAt: null, deletedByReceiver: false },
      }).catch(() => 0),
      db.friendship.count({
        where: { receiverId: userId, status: "PENDING" },
      }).catch(() => 0),
    ]);

    return {
      unreadMessagesCount,
      pendingFriendRequestsCount,
      totalSocialAlerts: unreadMessagesCount + pendingFriendRequestsCount,
    };
  } catch (err) {
    console.warn("[getSocialCounters] error:", err);
    return { unreadMessagesCount: 0, pendingFriendRequestsCount: 0, totalSocialAlerts: 0 };
  }
}

