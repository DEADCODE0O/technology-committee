import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════
//  GET /api/chat/poll — فحص وتحديث الرسائل الجديدة بنمط Delta Polling
//  مُصمم لتخفيض Egress الخاص بـ Supabase بنسبة 98%:
//  1. مستثنى من الـ Middleware (لا يستدعي Supabase Auth مرتين)
//  2. لا يطلب إلا الرسائل الأحدث من afterTime
//  3. عند عدم وجود رسائل جديدة، يُرجع 35 بايت فقط بدون أي joins
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "direct" | "room"
    const targetId = searchParams.get("targetId"); // otherUserId أو roomId
    const afterTimeStr = searchParams.get("afterTime");
    const afterId = searchParams.get("afterId");

    if (!type || !targetId) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }

    const afterDate = afterTimeStr ? new Date(afterTimeStr) : null;
    const isValidDate = afterDate && !isNaN(afterDate.getTime());

    // ─────────────────────────────────────────────────────────────
    // 1. المحادثات الخاصة (Direct Messages)
    // ─────────────────────────────────────────────────────────────
    if (type === "direct") {
      // فحص سريع: هل توجد أي رسائل جديدة بعد afterDate؟
      if (isValidDate) {
        const hasNew = await db.directMessage.findFirst({
          where: {
            OR: [
              { senderId: user.id, receiverId: targetId, deletedBySender: false },
              { senderId: targetId, receiverId: user.id, deletedByReceiver: false },
            ],
            createdAt: { gt: afterDate },
            ...(afterId ? { id: { not: afterId } } : {}),
          },
          select: { id: true },
        });

        // لا توجد أي رسائل جديدة → رد مصغر جداً بحجم 35 بايت، 0 بيانات منقولة
        if (!hasNew) {
          return NextResponse.json(
            { ok: true, hasNew: false },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
      }

      // توجد رسائل جديدة → جلب الرسائل الجديدة فقط (حتى 20 رسالة)
      const newMessages = await db.directMessage.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: targetId, deletedBySender: false },
            { senderId: targetId, receiverId: user.id, deletedByReceiver: false },
          ],
          ...(isValidDate ? { createdAt: { gt: afterDate } } : {}),
          ...(afterId ? { id: { not: afterId } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      });

      // وسم المقروء للرسائل الواردة
      const unreadIds = newMessages
        .filter((m) => m.senderId === targetId && !m.readAt)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await db.directMessage.updateMany({
          where: { id: { in: unreadIds } },
          data: { readAt: new Date() },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          hasNew: true,
          messages: newMessages.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            body: m.body,
            readAt: m.readAt,
            createdAt: m.createdAt.toISOString(),
            mine: m.senderId === user.id,
          })),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. غرف المجموعات (Group / Team Chat Rooms)
    // ─────────────────────────────────────────────────────────────
    if (type === "room") {
      if (isValidDate) {
        const hasNew = await db.chatMessage.findFirst({
          where: {
            roomId: targetId,
            createdAt: { gt: afterDate },
            ...(afterId ? { id: { not: afterId } } : {}),
            status: { in: ["VISIBLE", "DELETED"] },
          },
          select: { id: true },
        });

        if (!hasNew) {
          return NextResponse.json(
            { ok: true, hasNew: false },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
      }

      // جلب الرسائل الجديدة فقط
      const newMessages = await db.chatMessage.findMany({
        where: {
          roomId: targetId,
          ...(isValidDate ? { createdAt: { gt: afterDate } } : {}),
          ...(afterId ? { id: { not: afterId } } : {}),
          status: { in: ["VISIBLE", "DELETED"] },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          id: true,
          body: true,
          status: true,
          editedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              avatarFrameId: true,
              role: true,
              profile: { select: { fullName: true, gender: true } },
            },
          },
          replyTo: {
            select: {
              id: true,
              body: true,
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
      });

      return NextResponse.json(
        {
          ok: true,
          hasNew: true,
          messages: newMessages.map((m) => ({
            id: m.id,
            body: m.body,
            isDeleted: m.status === "DELETED",
            editedAt: m.editedAt ? m.editedAt.toISOString() : null,
            createdAt: m.createdAt.toISOString(),
            user: {
              id: m.user.id,
              username: m.user.username,
              displayName: m.user.displayName || m.user.profile?.fullName || "طالب",
              avatarUrl: m.user.avatarUrl,
              avatarFrameId: m.user.avatarFrameId,
              role: m.user.role,
              gender: m.user.profile?.gender || "MALE",
              level: 1, // المستوى محسوب بالفعل في الحالة الأولى للغرفة
            },
            replyTo: m.replyTo
              ? {
                  id: m.replyTo.id,
                  body: m.replyTo.body,
                  user: {
                    displayName:
                      m.replyTo.user.displayName ||
                      m.replyTo.user.profile?.fullName ||
                      "طالب",
                  },
                }
              : null,
          })),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  } catch (err) {
    console.error("Chat poll error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
