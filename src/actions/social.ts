"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction } from "@/lib/auth";
import { levelFromPoints } from "@/lib/constants";
import { isValidUsername, sanitizeUsername, isUsernameAvailable } from "@/lib/username";
import { createNotificationForUsers } from "@/lib/notifications";
import { parseTarget } from "@/lib/targeting";

const MAX_FRIENDS_LIMIT = 200;

/**
 * إرسال طلب صداقة
 */
export async function sendFriendRequest(receiverId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    if (user.id === receiverId) {
      return { ok: false, error: "لا يمكنك إرسال طلب صداقة لنفسك" };
    }

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      include: { profile: true },
    });
    if (!receiver || receiver.status === "SUSPENDED") {
      return { ok: false, error: "الطالب غير متاح" };
    }

    // فحص عدد الأصدقاء الحالي للمرسل والمستقبل
    const myFriendsCount = await db.friendship.count({
      where: {
        OR: [
          { senderId: user.id, status: "ACCEPTED" },
          { receiverId: user.id, status: "ACCEPTED" },
        ],
      },
    });
    if (myFriendsCount >= MAX_FRIENDS_LIMIT) {
      return { ok: false, error: `وصلت للحد الأقصى من الأصدقاء (${MAX_FRIENDS_LIMIT} صديق)` };
    }

    // فحص علاقة سابقة
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return { ok: false, error: "أنتما أصدقاء بالفعل" };
      }
      if (existing.status === "PENDING") {
        if (existing.senderId === user.id) {
          return { ok: false, error: "تم إرسال طلب الصداقة مسبقاً وبانتظار الموافقة" };
        } else {
          // الطرف الآخر كان قد أرسل لك طلباً بالفعل -> قبول تلقائي!
          await db.friendship.update({
            where: { id: existing.id },
            data: { status: "ACCEPTED" },
          });
          revalidatePath("/friends");
          revalidatePath(`/p/${receiver.username || ""}`);
          return { ok: true };
        }
      }
      if (existing.status === "BLOCKED") {
        return { ok: false, error: "تعذر إرسال طلب الصداقة" };
      }
      // إذا كان DECLINED يمكن إعادة المحاولة
      await db.friendship.update({
        where: { id: existing.id },
        data: {
          senderId: user.id,
          receiverId,
          status: "PENDING",
        },
      });
    } else {
      await db.friendship.create({
        data: {
          senderId: user.id,
          receiverId,
          status: "PENDING",
        },
      });
    }

    // إرسال إشعار للمستقبل مع إيضاح الاسم والجنس
    try {
      const senderName = user.displayName || user.profile?.fullName || "طالب باللجنة";
      const senderGender = user.profile?.gender === "FEMALE" ? "طالبة" : "طالب";
      await createNotificationForUsers({
        type: "COMMUNITY",
        title: "طلب صداقة جديد 👥",
        body: `أرسل لك الـ ${senderGender} «${senderName}» طلب صداقة. يمكنك قبوله للتواصل والدردشة الخاصة.`,
        linkUrl: `/friends`,
        linkLabel: "عرض طلبات الصداقة",
        target: { ...parseTarget("{}"), userIds: [receiverId] },
        createdById: user.id,
      });
    } catch (notifErr) {
      console.warn("Friend request notification error:", notifErr);
    }

    revalidatePath("/friends");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إرسال طلب الصداقة" };
  }
}

/**
 * الرد على طلب الصداقة (قبول أو رفض)
 */
export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    const friendship = await db.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        sender: {
          include: { profile: { select: { fullName: true } } },
        },
      },
    });

    if (!friendship || friendship.receiverId !== user.id) {
      return { ok: false, error: "طلب الصداقة غير موجود أو غير مصرح لك بالرد عليه" };
    }

    if (friendship.status !== "PENDING") {
      return { ok: false, error: "تم الرد على هذا الطلب مسبقاً" };
    }

    if (accept) {
      await db.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });

      // إشعار للمرسل بقبول الطلب
      try {
        const myName = user.displayName || user.profile?.fullName || "طالب";
        await createNotificationForUsers({
          type: "COMMUNITY",
          title: "تم قبول طلب الصداقة! 🎉",
          body: `وافق «${myName}» على طلب صداقتك. يمكنك الآن مراسلته والدردشة معه بحرية.`,
          linkUrl: `/messages/${user.id}`,
          linkLabel: "بدء محادثة",
          target: { ...parseTarget("{}"), userIds: [friendship.senderId] },
          createdById: user.id,
        });
      } catch (notifErr) {
        console.warn("Accept friend request notification error:", notifErr);
      }
    } else {
      await db.friendship.update({
        where: { id: friendshipId },
        data: { status: "DECLINED" },
      });
    }

    revalidatePath("/friends");
    revalidatePath("/messages");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "حدث خطأ أثناء معالجة الطلب" };
  }
}

/**
 * إزالة صديق
 */
export async function removeFriend(otherUserId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await db.friendship.deleteMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.id },
        ],
      },
    });

    revalidatePath("/friends");
    revalidatePath(`/p/${otherUserId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر إزالة الصداقة" };
  }
}

/**
 * البحث عن طلاب بالاسم أو الـ username
 */
export async function searchStudents(query: string) {
  try {
    const user = await getCurrentUser();
    const cleanQuery = query.trim().replace(/^@/, "");
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const students = await db.user.findMany({
      where: {
        status: "ACTIVE",
        role: "STUDENT",
        ...(user ? { id: { not: user.id } } : {}),
        OR: [
          { username: { contains: cleanQuery, mode: "insensitive" } },
          { displayName: { contains: cleanQuery, mode: "insensitive" } },
          { profile: { fullName: { contains: cleanQuery, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarFrameId: true,
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
      take: 25,
    });

    // جلب حالة الصداقة مع المستخدم الحالي إن كان مسجلاً
    let friendshipMap = new Map<string, { id: string; status: string; isSender: boolean }>();
    if (user) {
      const studentIds = students.map((s) => s.id);
      const friendships = await db.friendship.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: { in: studentIds } },
            { senderId: { in: studentIds }, receiverId: user.id },
          ],
        },
      });
      for (const f of friendships) {
        const otherId = f.senderId === user.id ? f.receiverId : f.senderId;
        friendshipMap.set(otherId, {
          id: f.id,
          status: f.status,
          isSender: f.senderId === user.id,
        });
      }
    }

    return students.map((s) => {
      const totalPoints = s.pointEvents.reduce((acc, e) => acc + e.points, 0);
      const fs = friendshipMap.get(s.id);
      return {
        id: s.id,
        username: s.username,
        displayName: s.displayName,
        fullName: s.profile?.fullName || "طالب",
        gender: s.profile?.gender || "MALE",
        grade: s.profile?.grade || "FIRST",
        section: s.profile?.section || "IS",
        avatarUrl: s.avatarUrl,
        avatarFrameId: s.avatarFrameId,
        level: levelFromPoints(totalPoints),
        friendship: fs ? { status: fs.status, isSender: fs.isSender } : null,
      };
    });
  } catch (err) {
    console.error("searchStudents error:", err);
    return [];
  }
}

/**
 * تحديث الملف الشخصي العام (الاسم المعروض والنبذة و @username)
 */
export async function updateMyPublicProfile(data: {
  displayName?: string;
  bio?: string;
  username?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();

    const updatePayload: { displayName?: string | null; bio?: string | null; username?: string } = {};

    if (typeof data.displayName === "string") {
      const cleanName = data.displayName.trim();
      updatePayload.displayName = cleanName ? cleanName.slice(0, 50) : null;
    }

    if (typeof data.bio === "string") {
      const cleanBio = data.bio.trim();
      updatePayload.bio = cleanBio ? cleanBio.slice(0, 160) : null;
    }

    if (data.username) {
      const cleanUsername = sanitizeUsername(data.username);
      const check = isValidUsername(cleanUsername);
      if (!check.valid) {
        return { ok: false, error: check.error };
      }
      const available = await isUsernameAvailable(cleanUsername, user.id);
      if (!available) {
        return { ok: false, error: "اسم المستخدم هذا مأخوذ بالفعل، اختر اسماً آخر" };
      }
      updatePayload.username = cleanUsername;
    }

    await db.user.update({
      where: { id: user.id },
      data: updatePayload,
    });

    revalidatePath("/profile");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تحديث الملف الشخصي" };
  }
}

