"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Trash2,
  Lock,
  Pin,
  Flag,
  Send,
  Loader2,
  CornerDownLeft,
  Share2,
} from "lucide-react";
import {
  StudentPostFeedItem,
  ReactionType,
  reactToStudentPost,
  commentOnStudentPost,
  deleteStudentPost,
  deleteStudentPostComment,
  toggleLockStudentPostComments,
  togglePinStudentPost,
} from "@/actions/student-posts";
import { reportEntity } from "@/actions/messaging";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EndorsementKey,
  ENDORSEMENTS,
  ENDORSEMENT_KEYS,
  normalizeEndorsement,
} from "@/lib/endorsements";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  GENERAL: { label: "عام", color: "bg-muted text-muted-foreground" },
  QUESTION: { label: "سؤال واستفسار ❓", color: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  ACHIEVEMENT: { label: "إنجاز وفخر 🏆", color: "bg-gold/15 text-gold border border-gold/30" },
  RESOURCE: { label: "مصدر تعليمي 📚", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
};

export function StudentPostCard({
  post,
  currentUserId,
  currentUserRole,
}: {
  post: StudentPostFeedItem;
  currentUserId?: string;
  currentUserRole?: string;
}) {
  const [reactionsSummary, setReactionsSummary] = useState(post.reactionsSummary);
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [isReactionHovered, setIsReactionHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(post.lockedComments);
  const [isPinned, setIsPinned] = useState(post.pinned);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isDeleted) return null;

  const isAdmin = currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN";
  const authorProfileLink = post.author.username
    ? `/p/${post.author.username}`
    : `/p/${post.author.id}`;

  const handleReaction = (type: EndorsementKey) => {
    // Optimistic update
    const prev = { ...reactionsSummary };
    const hadSame = reactionsSummary.myReaction === type;
    const newCounts = { ...reactionsSummary.counts };

    if (hadSame) {
      newCounts[type] = Math.max(0, (newCounts[type] || 1) - 1);
      setReactionsSummary({
        counts: newCounts,
        myReaction: null,
        total: Math.max(0, reactionsSummary.total - 1),
      });
    } else {
      if (reactionsSummary.myReaction) {
        newCounts[reactionsSummary.myReaction] = Math.max(0, (newCounts[reactionsSummary.myReaction] || 1) - 1);
      }
      newCounts[type] = (newCounts[type] || 0) + 1;
      setReactionsSummary({
        counts: newCounts,
        myReaction: type,
        total: reactionsSummary.myReaction ? reactionsSummary.total : reactionsSummary.total + 1,
      });
    }

    setIsReactionHovered(false);

    startTransition(async () => {
      const res = await reactToStudentPost(post.id, type);
      if (!res.ok) {
        setReactionsSummary(prev);
        toast.error(res.error || "فشل تسجيل التفاعل");
      }
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newComment.trim();
    if (!clean) return;

    startTransition(async () => {
      const res = await commentOnStudentPost(post.id, clean, replyingTo?.id);
      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        toast.success("تم إضافة تعليقك");
        // Add optimistic comment
        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id
                ? {
                    ...c,
                    replies: [
                      ...c.replies,
                      {
                        id: `temp-${Date.now()}`,
                        body: clean,
                        createdAt: new Date().toISOString(),
                        author: {
                          id: currentUserId || "",
                          username: null,
                          name: "أنت",
                          avatarUrl: null,
                          avatarFrameId: null,
                          level: 1,
                        },
                      },
                    ],
                  }
                : c
            )
          );
        } else {
          setComments((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              body: clean,
              createdAt: new Date().toISOString(),
              author: {
                id: currentUserId || "",
                username: null,
                name: "أنت",
                avatarUrl: null,
                avatarFrameId: null,
                level: 1,
              },
              replies: [],
            },
          ]);
        }
      } else {
        toast.error(res.error || "تعذر نشر التعليق");
      }
    });
  };

  const handleDeletePost = () => {
    if (!confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    startTransition(async () => {
      const res = await deleteStudentPost(post.id);
      if (res.ok) {
        setIsDeleted(true);
        toast.success("تم حذف المنشور");
      } else {
        toast.error(res.error || "تعذر حذف المنشور");
      }
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm("هل تريد حذف هذا التعليق؟")) return;
    startTransition(async () => {
      const res = await deleteStudentPostComment(commentId);
      if (res.ok) {
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies.filter((r) => r.id !== commentId),
            }))
        );
        toast.success("تم حذف التعليق");
      } else {
        toast.error(res.error || "تعذر حذف التعليق");
      }
    });
  };

  const handleToggleLock = () => {
    startTransition(async () => {
      const res = await toggleLockStudentPostComments(post.id);
      if (res.ok) {
        setIsLocked(!isLocked);
        toast.success(isLocked ? "تم فتح التعليقات" : "تم قفل التعليقات");
      } else {
        toast.error(res.error || "تعذر تعديل القفل");
      }
    });
  };

  const handleTogglePin = () => {
    startTransition(async () => {
      const res = await togglePinStudentPost(post.id);
      if (res.ok) {
        setIsPinned(!isPinned);
        toast.success(isPinned ? "تم إلغاء التثبيت" : "تم تثبيت المنشور بالأعلى");
      } else {
        toast.error(res.error || "تعذر التثبيت");
      }
    });
  };

  const cat = CATEGORY_LABELS[post.category] || CATEGORY_LABELS.GENERAL;

  return (
    <article className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 transition-all hover:border-gold/30">
      {/* شريط رأس المنشور */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={authorProfileLink} className="transition-transform hover:scale-105 shrink-0">
            <AvatarWithFrame
              avatarUrl={post.author.avatarUrl}
              name={post.author.name}
              frameId={post.author.avatarFrameId}
              size="md"
              level={post.author.level}
              showLevel
            />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <Link
                href={authorProfileLink}
                className="text-xs sm:text-sm font-extrabold text-foreground hover:text-gold transition-colors"
              >
                {post.author.name}
              </Link>
              <span className="text-[10px] font-black rounded-full bg-gold/15 text-gold px-2 py-0.2">
                مستوى {post.author.level}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              {post.author.username && <span dir="ltr">@{post.author.username}</span>}
              <span>·</span>
              <span>
                {new Date(post.createdAt).toLocaleDateString("ar-EG", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isPinned && (
            <span className="flex items-center gap-1 rounded-full bg-gold/15 border border-gold/40 text-gold px-2.5 py-0.5 text-[10px] font-black">
              <Pin className="h-3 w-3" />
              مثبت
            </span>
          )}

          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${cat.color}`}>
            {cat.label}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
              {(post.isOwner || isAdmin) && (
                <DropdownMenuItem
                  onClick={handleToggleLock}
                  className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-amber-500" />
                  {isLocked ? "فتح التعليقات" : "قفل التعليقات"}
                </DropdownMenuItem>
              )}

              {isAdmin && (
                <DropdownMenuItem
                  onClick={handleTogglePin}
                  className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Pin className="h-4 w-4 text-gold" />
                  {isPinned ? "إلغاء التثبيت" : "تثبيت في الأعلى"}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  startTransition(async () => {
                    const res = await reportEntity({
                      entityType: "STUDENT_POST",
                      entityId: post.id,
                      reason: "INAPPROPRIATE",
                    });
                    if (res.ok) toast.success("تم إرسال البلاغ للإشراف");
                  });
                }}
                className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-orange-500"
              >
                <Flag className="h-4 w-4" />
                إبلاغ عن المنشور
              </DropdownMenuItem>

              {(post.isOwner || isAdmin) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeletePost}
                    className="flex items-center gap-2 rounded-xl text-xs font-bold cursor-pointer text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف المنشور
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* متن المنشور */}
      <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {post.body}
      </p>

      {/* صورة مرفقة إن وجدت */}
      {post.imageUrl && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border">
          <Image
            src={post.imageUrl}
            alt="صورة المنشور"
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
          />
        </div>
      )}

      {/* شريط التقديرات الأكاديمية والتقنية */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/50 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {ENDORSEMENT_KEYS.map((k) => {
            const count = reactionsSummary.counts[k] || 0;
            if (count <= 0) return null;
            const meta = ENDORSEMENTS[k];
            const isMine = reactionsSummary.myReaction === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleReaction(k)}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs transition-all border ${
                  isMine
                    ? meta.activeRing
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
                title={`${meta.title} — ${count} طالب`}
              >
                <span>{meta.emoji}</span>
                <span className="font-extrabold">{count}</span>
                <span className="text-[10px] hidden sm:inline text-muted-foreground">{meta.label}</span>
              </button>
            );
          })}
          {reactionsSummary.total > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground ms-1">
              ({reactionsSummary.total} تقدير)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline font-bold"
        >
          {comments.length} تعليق
        </button>
      </div>

      {/* أزرار التفاعل الراقية */}
      <div className="relative flex items-center justify-between pt-1">
        {/* زر التقدير وقائمة التقديرات الراقية */}
        <div
          className="relative"
          onMouseEnter={() => setIsReactionHovered(true)}
          onMouseLeave={() => setIsReactionHovered(false)}
        >
          {/* شريط التقديرات الخمسة التقنية */}
          {isReactionHovered && (
            <div className="absolute -top-14 start-0 z-30 flex items-center gap-1 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {ENDORSEMENT_KEYS.map((rKey) => {
                const conf = ENDORSEMENTS[rKey];
                const isSelected = reactionsSummary.myReaction === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleReaction(rKey)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                      isSelected
                        ? conf.activeRing
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={`${conf.title} — ${conf.description}`}
                  >
                    <span className="text-base">{conf.emoji}</span>
                    <span className="text-[11px] hidden sm:inline">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {reactionsSummary.myReaction ? (
            <button
              type="button"
              onClick={() => handleReaction(reactionsSummary.myReaction!)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all border ${
                ENDORSEMENTS[reactionsSummary.myReaction].activeRing
              } hover:brightness-105`}
              title="انقر لإلغاء التقدير أو مرر لاختيار تقدير آخر"
            >
              <span>{ENDORSEMENTS[reactionsSummary.myReaction].emoji}</span>
              <span>{ENDORSEMENTS[reactionsSummary.myReaction].title}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleReaction("ROCKET")}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:border-gold/40 hover:text-foreground transition-all hover:bg-muted/40"
            >
              <span>✨</span>
              <span>منح تقدير</span>
            </button>
          )}
        </div>

        {/* زر التعليقات */}
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>تعليق ({comments.length})</span>
        </button>

        {/* مشاركة سريعة */}
        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
              toast.success("تم نسخ رابط المجتمع");
            }
          }}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>مشاركة</span>
        </button>
      </div>

      {/* قسم التعليقات المتداخلة */}
      {showComments && (
        <div className="space-y-4 pt-3 border-t border-border/60">
          {/* نموذج إضافة تعليق */}
          {isLocked ? (
            <p className="text-center text-xs text-muted-foreground italic py-2">
              🔒 التعليقات مقفلة على هذا المنشور.
            </p>
          ) : (
            <form onSubmit={handleAddComment} className="space-y-2">
              {replyingTo && (
                <div className="flex items-center justify-between text-xs bg-gold/10 px-3 py-1.5 rounded-xl text-gold">
                  <span>الرد على: <strong>{replyingTo.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-muted-foreground hover:text-foreground text-[10px]"
                  >
                    إلغاء
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? `اكتب ردك على ${replyingTo.name}...` : "اكتب تعليقاً..."}
                  maxLength={500}
                  className="flex-1 rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isPending}
                  className="rounded-xl bg-gold px-3.5 py-2 text-xs font-black text-night hover:bg-gold-light disabled:opacity-40 shadow-sm"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 -rotate-90" />}
                </button>
              </div>
            </form>
          )}

          {/* قائمة التعليقات والردود الشجرية */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* التعليق الأساسي */}
                <div className="flex items-start gap-2.5 group">
                  <AvatarWithFrame
                    avatarUrl={comment.author.avatarUrl}
                    name={comment.author.name}
                    frameId={comment.author.avatarFrameId}
                    size="sm"
                    level={comment.author.level}
                    showLevel={false}
                  />

                  <div className="flex-1 rounded-2xl bg-muted/50 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-foreground">
                        {comment.author.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>
                          {new Date(comment.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5"
                          title="حذف التعليق"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-foreground leading-5">{comment.body}</p>

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => setReplyingTo({ id: comment.id, name: comment.author.name })}
                        className="text-[10px] font-bold text-gold hover:underline flex items-center gap-1 pt-0.5"
                      >
                        <CornerDownLeft className="h-2.5 w-2.5" />
                        رد
                      </button>
                    )}
                  </div>
                </div>

                {/* الردود المتداخلة */}
                {comment.replies.length > 0 && (
                  <div className="pe-8 space-y-2 border-s-2 border-border/40 ms-4 ps-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2 group">
                        <AvatarWithFrame
                          avatarUrl={reply.author.avatarUrl}
                          name={reply.author.name}
                          frameId={reply.author.avatarFrameId}
                          size="xs"
                          level={reply.author.level}
                          showLevel={false}
                        />

                        <div className="flex-1 rounded-xl bg-muted/40 p-2.5 text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-[11px]">
                              {reply.author.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(reply.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5"
                              title="حذف الرد"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-foreground text-[11px]">{reply.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
