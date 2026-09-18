import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Users, Sparkles, Clock, Check, CheckCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getConversationsList } from "@/actions/messaging";
import { StudentShell } from "@/components/student/student-shell";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الرسائل الخاصة — منصة اللجنة التكنولوجية",
  description: "الدردشة الخاصة الآمنة بين الأصدقاء في اللجنة التكنولوجية.",
};

export default async function MessagesInboxPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const conversations = await getConversationsList();

  return (
    <StudentShell
      user={{
        name: user.displayName || user.profile?.fullName || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="messages"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              الرسائل والمحادثات الخاصة 💬
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              محادثات فورية آمنة بينك وبين أصدقائك في اللجنة التكنولوجية.
            </p>
          </div>

          <Link
            href="/friends"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-2.5 text-xs font-extrabold text-night hover:bg-gold-light transition-all shadow-md shrink-0"
          >
            <Users className="h-4 w-4" />
            بدء محادثة من قائمة الأصدقاء
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-extrabold text-foreground">
              لا توجد محادثات نشطة بعد
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              أضف أصدقاء من زملائك بالكلية لبدء المراسلة الفورية وتبادل الأفكار والملفات.
            </p>
            <Link
              href="/friends"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all"
            >
              <Users className="h-4 w-4" />
              تصفح الأصدقاء
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            {conversations.map(({ friend, lastMessage, unreadCount }) => (
              <Link
                key={friend.id}
                href={`/messages/${friend.id}`}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/40 transition-colors gap-3.5 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AvatarWithFrame
                    avatarUrl={friend.avatarUrl}
                    name={friend.name}
                    frameId={friend.avatarFrameId}
                    size="md"
                    level={friend.level}
                    showLevel
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-gold transition-colors truncate">
                        {friend.name}
                      </h3>
                      {friend.username && (
                        <span className="text-[10px] font-mono text-muted-foreground truncate" dir="ltr">
                          @{friend.username}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                      {lastMessage ? (
                        <span className={unreadCount > 0 ? "font-bold text-foreground" : ""}>
                          {lastMessage.mine && "أنت: "}
                          {lastMessage.body}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/70">
                          لا توجد رسائل سابقة — انقر لبدء المحادثة
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {lastMessage && (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(lastMessage.createdAt).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}

                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-black text-night shadow">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}

