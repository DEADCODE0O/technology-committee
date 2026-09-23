import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UserX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getConversationMessages } from "@/actions/messaging";
import { getStudentBadges } from "@/lib/student-badges";
import { StudentShell } from "@/components/student/student-shell";
import { DirectChatRoom } from "@/components/social/direct-chat-room";

export const dynamic = "force-dynamic";

export default async function ConversationPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [conversationData, badges] = await Promise.all([
    getConversationMessages(userId),
    getStudentBadges(user),
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
      unreadCount={badges.unreadCount}
      openTaskCount={badges.openTaskCount}
      unreadMessagesCount={badges.unreadMessagesCount}
      pendingCount={badges.pendingCount}
      chatMode={true}
    >
      <div className="w-full flex-1 flex flex-col h-full min-h-0">
        {!conversationData.ok || !conversationData.otherUser ? (
          <div className="rounded-3xl border border-border p-10 text-center bg-card my-auto max-w-md mx-auto">
            <UserX className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-extrabold text-foreground">
              {conversationData.error || "تعذر فتح هذه المحادثة"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              تأكد من أنك وصديقك قد قبلتما طلب الصداقة المتبادل لتتمكنا من المراسلة الخاصة.
            </p>
            <Link
              href="/friends"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all"
            >
              <ArrowRight className="h-4 w-4" />
              الانتقال لقائمة الأصدقاء
            </Link>
          </div>
        ) : (
          <DirectChatRoom
            otherUser={conversationData.otherUser}
            initialMessages={conversationData.messages}
            currentUserId={user.id}
          />
        )}
      </div>
    </StudentShell>
  );
}

