"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  PenSquare,
  Sparkles,
  Pin,
  Lock,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { StudentPostFeedItem } from "@/actions/student-posts";
import { StudentPostCard } from "./student-post-card";
import { CreatePostDialog } from "./create-post-dialog";
import { PostEngagement } from "./post-engagement";
import { MediaFrame, PostImage } from "./media-frame";
import { COMMUNITY_POST_TYPE_ICONS, COMMUNITY_POST_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { LeveledName } from "@/components/ui/leveled-name";

interface CommunityFeedViewProps {
  studentPosts: StudentPostFeedItem[];
  committeePosts: any[];
  currentUserId?: string;
  currentUserRole?: string;
  isStudent: boolean;
  heartsVisible?: boolean;
}

export function CommunityFeedView({
  studentPosts,
  committeePosts,
  currentUserId,
  currentUserRole,
  isStudent,
  heartsVisible = true,
}: CommunityFeedViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "STUDENTS" | "COMMITTEE" | "QUESTION" | "ACHIEVEMENT">("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // تصفية المنشورات
  const filteredStudentPosts = studentPosts.filter((p) => {
    if (filter === "ALL" || filter === "STUDENTS") return true;
    if (filter === "QUESTION" && p.category === "QUESTION") return true;
    if (filter === "ACHIEVEMENT" && p.category === "ACHIEVEMENT") return true;
    return false;
  });

  const showCommitteePosts = filter === "ALL" || filter === "COMMITTEE";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* رأس الصفحة وزر إنشاء منشور */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              مجتمع اللجنة التكنولوجية
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            تواصل، تفاعل، شارك أفكارك وإنجازاتك التقنية مع زملائك بالكلية.
          </p>
        </div>

        {isStudent && (
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md shrink-0"
          >
            <PenSquare className="h-4 w-4" />
            أنشئ منشوراً جديداً
          </button>
        )}
      </div>

      {/* شريط الفلاتر والتبويبات */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: "ALL", label: "الكل 🔥" },
          { key: "STUDENTS", label: `منشورات الطلاب (${studentPosts.length}) 👥` },
          { key: "COMMITTEE", label: `إعلانات اللجنة (${committeePosts.length}) 📢` },
          { key: "QUESTION", label: "أسئلة واستفسارات ❓" },
          { key: "ACHIEVEMENT", label: "إنجازات وفخر 🏆" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as any)}
            className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition-all shrink-0 border ${
              filter === tab.key
                ? "bg-gold text-night border-gold shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* خلاصة المنشورات */}
      <div className="space-y-6">
        {/* منشورات الطلاب */}
        {filteredStudentPosts.length > 0 && (
          <div className="space-y-4">
            {filteredStudentPosts.map((sp) => (
              <StudentPostCard
                key={sp.id}
                post={sp}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        )}

        {/* منشورات اللجنة الرسمية */}
        {showCommitteePosts && committeePosts.length > 0 && (
          <div className="space-y-4">
            {filter === "ALL" && filteredStudentPosts.length > 0 && (
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Megaphone className="h-4 w-4 text-gold" />
                <h3 className="text-xs font-extrabold text-muted-foreground">
                  إعلانات وأخبار اللجنة الرسمية
                </h3>
              </div>
            )}

            {committeePosts.map((p) => {
              const typeIcon = COMMUNITY_POST_TYPE_ICONS[p.type] ?? "📢";
              const typeLabel = COMMUNITY_POST_TYPE_LABELS[p.type] ?? "خبر";

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-3xl border border-white/[0.08] bg-card p-5 sm:p-7 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {p.createdBy ? (
                        <AvatarWithFrame
                          avatarUrl={p.createdBy.avatarUrl}
                          name={p.createdBy.displayName || p.createdBy.profile?.fullName || "مشرف"}
                          frameId={p.createdBy.avatarFrameId}
                          size="md"
                          level={p.creatorLevel}
                          showLevel={false}
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 text-xl">
                          📢
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-foreground">
                            {p.createdBy?.displayName || p.createdBy?.profile?.fullName || "إدارة اللجنة التكنولوجية"}
                          </span>
                          <span className="rounded-full bg-gold/15 text-gold px-2 py-0.2 text-[9px] font-black border border-gold/30">
                            رسمي
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {p.formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.pinned && (
                        <span className="flex items-center gap-1 rounded-full bg-gold/15 border border-gold/30 text-gold px-2.5 py-0.5 text-[10px] font-black">
                          <Pin className="h-3 w-3" />
                          مثبت
                        </span>
                      )}
                      <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground border border-border">
                        {typeIcon} {typeLabel}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base sm:text-lg font-black text-foreground">
                    {p.title}
                  </h2>

                  <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-zinc-300">
                    {p.body}
                  </p>

                  {p.media && (
                    <div className="mt-4">
                      <MediaFrame plan={p.media} title={p.title} />
                    </div>
                  )}

                  {p.imageUrl && !p.media && (
                    <div className="mt-4">
                      <PostImage url={p.imageUrl} alt={p.title} />
                    </div>
                  )}

                  <PostEngagement
                    postId={p.id}
                    initialLiked={p.liked}
                    likeCount={p.likesCount}
                    commentCount={p.commentsForStudent?.length || 0}
                    locked={p.lockedComments}
                    autoApproveComments={p.autoApproveComments}
                    canComment={isStudent}
                    comments={p.commentsForStudent || []}
                    heartsVisible={heartsVisible}
                  />
                </article>
              );
            })}
          </div>
        )}

        {filteredStudentPosts.length === 0 && (!showCommitteePosts || committeePosts.length === 0) && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-extrabold text-foreground">
              لا توجد منشورات في هذا القسم
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              كن أول من يبدأ بالنشر ومشاركة أفكاره مع زملائه باللجنة!
            </p>
          </div>
        )}
      </div>

      {/* نافذة إنشاء منشور */}
      <CreatePostDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
