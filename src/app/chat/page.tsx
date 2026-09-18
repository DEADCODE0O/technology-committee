import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureGeneralChatRoom, getChatRoomMessages } from "@/actions/chat";
import { GroupChatRoom } from "@/components/social/group-chat-room";
import { StudentShell } from "@/components/student/student-shell";
import { MessageSquare, Users, Sparkles, Shield } from "lucide-react";

export const metadata = {
  title: "الشات العام | مجتمع اللجنة التكنولوجية",
  description: "الدردشة الجماعية المباشرة لطلاب وأعضاء اللجنة التكنولوجية",
};

export default async function GeneralChatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/chat");
  }

  const room = await ensureGeneralChatRoom();
  const initialMessages = await getChatRoomMessages(room.id, 70);

  return (
    <StudentShell
      user={{
        name: user.displayName || user.profile?.fullName || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="chat"
    >
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-inner">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-foreground">
                  الشات العام لمجتمع اللجنة
                </h1>
                <span className="text-[10px] font-black rounded-full bg-gold/15 text-gold px-2.5 py-0.5 border border-gold/30">
                  مباشر
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تبادل الخبرات، اسأل زملاءك، وتعرّف على المبرمجين والمبدعين في مجتمعنا التقني
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground self-end sm:self-center">
            <span className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              بيئة آمنة ومفلترة
            </span>
          </div>
        </div>

        {/* غرفة الشات التفاعلية */}
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