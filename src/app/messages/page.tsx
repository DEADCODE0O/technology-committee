import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { levelFromPoints } from "@/lib/constants";
import { getUnifiedConversations } from "@/actions/messaging";
import { getStudentBadges } from "@/lib/student-badges";
import { getStudentProgress } from "@/lib/progress";
import { StudentShell } from "@/components/student/student-shell";
import { MessagingHub } from "@/components/social/messaging-hub";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الرسائل والمحادثات — منصة اللجنة التكنولوجية",
  description: "الدردشة الخاصة وشاتات الفرق والأنشطة في مجتمع اللجنة التكنولوجية.",
};

interface MessagesPageProps {
  searchParams?: Promise<{
    tab?: "conversations" | "requests" | "search";
  }>;
}

export default async function MessagesInboxPage(props: MessagesPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const requestedTab = searchParams.tab || "conversations";

  const [conversations, rawPendingRequests, badges, progress] = await Promise.all([
    getUnifiedConversations(),
    db.friendship.findMany({
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
    }),
    getStudentBadges(user),
    getStudentProgress(user.id).catch(() => ({ level: 1 })),
  ]);

  const pendingRequests = rawPendingRequests.map((req) => {
    const points = req.sender.pointEvents.reduce((acc, e) => acc + e.points, 0);
    return {
      id: req.id,
      senderId: req.sender.id,
      username: req.sender.username,
      name: req.sender.displayName || req.sender.profile?.fullName || "طالب بالكلية",
      gender: req.sender.profile?.gender || "MALE",
      grade: req.sender.profile?.grade || "FIRST",
      section: req.sender.profile?.section || "IS",
      avatarUrl: req.sender.avatarUrl,
      avatarFrameId: req.sender.avatarFrameId,
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
        level: progress.level,
      }}
      active="messages"
      unreadCount={badges.unreadCount}
      openTaskCount={badges.openTaskCount}
      unreadMessagesCount={badges.unreadMessagesCount}
      pendingCount={badges.pendingCount}
    >
      <MessagingHub
        conversations={conversations}
        initialPendingRequests={pendingRequests}
        currentUserId={user.id}
        initialTab={requestedTab}
      />
    </StudentShell>
  );
}
