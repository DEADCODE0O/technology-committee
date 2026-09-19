import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChatRoomMessages } from "@/actions/chat";
import { getSocialCounters } from "@/actions/messaging";
import { GroupChatRoom } from "@/components/social/group-chat-room";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function ChatRoomPage(props: RoomPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { roomId } = await props.params;

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      team: { include: { members: true } },
      activity: {
        include: {
          sessions: {
            include: {
              registrations: {
                where: { userId: user.id, status: "REGISTERED" },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    notFound();
  }

  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  // فحص صلاحية الوصول لشات الفرق
  if (room.type === "TEAM" && room.team && !isAdmin) {
    const isMember = room.team.members.some((m) => m.userId === user.id);
    if (!isMember) {
      redirect("/messages");
    }
  }

  // فحص صلاحية الوصول لشات الأنشطة
  if (room.type === "ACTIVITY" && room.activity && !isAdmin) {
    const isRegistered = room.activity.sessions.some((s) => s.registrations.length > 0);
    if (!isRegistered) {
      redirect("/messages");
    }
  }

  const [initialMessages, socialCounters] = await Promise.all([
    getChatRoomMessages(room.id, 80),
    getSocialCounters(user.id),
  ]);

  return (
    <StudentShell
      user={{
        name: user.displayName || user.profile?.fullName || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="messages"
      unreadMessagesCount={socialCounters.totalSocialAlerts}
    >
      <div className="max-w-4xl mx-auto">
        <GroupChatRoom
          room={{
            id: room.id,
            name: room.name,
            description: room.description,
            icon: room.icon,
          }}
          initialMessages={initialMessages}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </StudentShell>
  );
}
