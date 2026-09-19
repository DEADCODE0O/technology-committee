import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UserX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getConversationMessages, getSocialCounters } from "@/actions/messaging";
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

  const [conversationData, socialCounters] = await Promise.all([
    getConversationMessages(userId),
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
        {!conversationData.ok || !conversationData.otherUser ? (
          <div className="rounded-3xl border border-border p-10 text-center bg-card">
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

