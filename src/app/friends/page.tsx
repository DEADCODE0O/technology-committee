import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { levelFromPoints } from "@/lib/constants";
import { StudentShell } from "@/components/student/student-shell";
import { FriendsManager, FriendItem, PendingRequestItem } from "@/components/social/friends-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الأصدقاء والتواصل — منصة اللجنة التكنولوجية",
  description: "تواصل مع زملائك باللجنة التكنولوجية وتبادل الصداقة والرسائل الخاصة.",
};

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // 1. جلب الأصدقاء الحاليين (المقبولين)
  const acceptedFriendships = await db.friendship.findMany({
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
      },
      receiver: {
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friendsList: FriendItem[] = acceptedFriendships.map((f) => {
    const friend = f.senderId === user.id ? f.receiver : f.sender;
    const points = friend.pointEvents.reduce((acc, e) => acc + e.points, 0);
    return {
      id: f.id,
      userId: friend.id,
      username: friend.username,
      name: friend.displayName || friend.profile?.fullName || "طالب",
      gender: friend.profile?.gender || "MALE",
      grade: friend.profile?.grade || "FIRST",
      section: friend.profile?.section || "IS",
      avatarUrl: friend.avatarUrl,
      avatarFrameId: friend.avatarFrameId,
      level: levelFromPoints(points),
    };
  });

  // 2. جلب طلبات الصداقة الواردة المعلقة
  const incomingRequests = await db.friendship.findMany({
    where: {
      receiverId: user.id,
      status: "PENDING",
    },
    include: {
      sender: {
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
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingRequestsList: PendingRequestItem[] = incomingRequests.map((req) => {
    const sender = req.sender;
    const points = sender.pointEvents.reduce((acc, e) => acc + e.points, 0);
    return {
      id: req.id,
      senderId: sender.id,
      username: sender.username,
      name: sender.displayName || sender.profile?.fullName || "طالب",
      gender: sender.profile?.gender || "MALE",
      grade: sender.profile?.grade || "FIRST",
      section: sender.profile?.section || "IS",
      avatarUrl: sender.avatarUrl,
      avatarFrameId: sender.avatarFrameId,
      level: levelFromPoints(points),
      createdAt: req.createdAt.toISOString(),
    };
  });

  return (
    <StudentShell
      user={{
        name: user.displayName || user.profile?.fullName || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="friends"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            شبكة الأصدقاء والزملاء 👥
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            تعرف على زملائك بالكلية واللجنة، أرسل طلبات الصداقة، وتبادل الأفكار والخبرات في بيئة تعليمية راقية.
          </p>
        </div>

        <FriendsManager
          initialFriends={friendsList}
          initialPendingRequests={pendingRequestsList}
          currentUserId={user.id}
        />
      </div>
    </StudentShell>
  );
}

