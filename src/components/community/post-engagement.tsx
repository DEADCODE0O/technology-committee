"use client";

import { useState, useTransition } from "react";
import {
  Heart, MessageCircle, Loader2, Send, Trash2, Lock,
  CheckCircle2, CornerDownLeft, Pencil, X, Sparkles,
} from "lucide-react";
import { togglePostReaction, addComment, deleteMyComment, editComment } from "@/actions/community";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { UserCharmHeart } from "@/components/ui/user-charm-heart";
import { LeveledName } from "@/components/ui/leveled-name";

// ═══════════════════════════════════════════════════════════════
//  تفاعلات منشور متقدمة: قلب + تعليقات متداخلة (Threaded Replies)
//  + تعديل وحذف التعليقات + إشعار الاعتماد التلقائي
// ═══════════════════════════════════════════════════════════════

export type BadgeItem = {
  id: string;
  name: string;
  icon: string;
};

export type CommentItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
  pending: boolean;
  parentId?: string | null;
  avatarUrl?: string | null;
  avatarFrameId?: string | null;
  level?: number;
  badges?: BadgeItem[];
};

export function PostEngagement({
  postId,
  initialLiked,
  likeCount,
  commentCount,
  locked,
  autoApproveComments = false,
  canComment,
  comments,
  currentUserLevel,
  currentUserAvatarUrl,
  currentUserFrameId,
  currentUserBadges,
  heartsVisible = true,
}: {
  postId: string;
  initialLiked: boolean;
  likeCount: number;
  commentCount: number;
  locked: boolean;
  autoApproveComments?: boolean;
  canComment: boolean;
  comments: CommentItem[];
  currentUserLevel?: number;
  currentUserAvatarUrl?: string | null;
  currentUserFrameId?: string | null;
  currentUserBadges?: BadgeItem[];
  heartsVisible?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likeCount);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<CommentItem[]>(comments);
  const [pending, startTransition] = useTransition();

  // حالة الرد على تعليق محدد
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [replyText, setReplyText] = useState("");

  // حالة تعديل تعليق
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  function onLike() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await togglePostReaction(postId);
      if (!res.ok) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
        setMsg(res.error ?? "تعذر التفاعل");
      }
    });
  }

  function onComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await addComment(postId, text);
      if (res.ok) {
        setText("");
        setOpen(true);
        // إضافة مؤقتة متفائلة في حال الاعتماد الفوري
        if (autoApproveComments) {
          setLocalComments((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              author: "أنت",
              body: text.trim(),
              createdAt: new Date().toISOString(),
              mine: true,
              pending: false,
            },
          ]);
        }
      } else {
        setMsg(res.error ?? "تعذر إرسال التعليق");
      }
    });
  }

  function onSendReply(parentId: string) {
    if (!replyText.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await addComment(postId, replyText, parentId);
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        if (autoApproveComments) {
          setLocalComments((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              author: "أنت",
              body: replyText.trim(),
              createdAt: new Date().toISOString(),
              mine: true,
              pending: false,
              parentId,
            },
          ]);
        }
      } else {
        setMsg(res.error ?? "تعذر إرسال الرد");
      }
    });
  }

  function onSaveEdit(commentId: string) {
    if (!editingText.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await editComment(commentId, editingText.trim());
      if (res.ok) {
        setLocalComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, body: editingText.trim() } : c))
        );
        setEditingCommentId(null);
        setEditingText("");
      } else {
        setMsg(res.error ?? "تعذر حفظ التعديل");
      }
    });
  }

  function onDeleteComment(id: string) {
    startTransition(async () => {
      const res = await deleteMyComment(id);
      if (res.ok) setLocalComments((cs) => cs.filter((c) => c.id !== id && c.parentId !== id));
    });
  }

  // فرز التعليقات الأساسية والردود
  const rootComments = localComments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => localComments.filter((c) => c.parentId === parentId);

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onLike}
          aria-pressed={liked}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-all active:scale-95 ${
            liked
              ? "border-gold/50 bg-gold/[0.12] text-gold-light"
              : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-gold/25 hover:text-gold-light"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {count > 0 ? count : "أعجبني"}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-bold text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 ? `${commentCount} تعليقًا` : "التعليقات"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3.5">
          {locked ? (
            <p className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-3 text-xs font-bold text-zinc-500">
              <Lock className="h-3.5 w-3.5" /> التعليقات مقفلة على هذا المنشور
            </p>
          ) : canComment ? (
            <form onSubmit={onComment} className="space-y-2.5">
              <div className="flex items-center gap-2.5 px-1">
                <AvatarWithFrame
                  name="أنت"
                  avatarUrl={currentUserAvatarUrl}
                  frameId={currentUserFrameId}
                  size="sm"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <LeveledName name="أنت" level={currentUserLevel ?? 0} size="xs" />
                  {typeof currentUserLevel === "number" && heartsVisible && (
                    <UserCharmHeart level={currentUserLevel} size="xs" visible={heartsVisible} />
                  )}
                </div>
                {currentUserBadges && currentUserBadges.length > 0 && (
                  <div className="flex items-center gap-1.5 ms-auto">
                    {currentUserBadges.slice(0, 3).map((b) => (
                      <span
                        key={b.id}
                        title={b.name}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold bg-gold/[0.08] dark:bg-gold/10 text-gold-deep dark:text-gold-light border border-gold/30 shadow-sm"
                      >
                        <span className="text-xs leading-none">{b.icon || "🏆"}</span>
                        <span className="truncate max-w-[85px] hidden sm:inline">{b.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  placeholder="اكتب تعليقًا أو استفسارًا..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pending || !text.trim()}
                  aria-label="إرسال التعليق"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-night transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>
          ) : null}

          {msg && <p className="text-xs font-bold text-red-300">{msg}</p>}

          {canComment && !locked && (
            <div className="flex items-center gap-1.5 text-[11px] leading-5 text-zinc-500">
              {autoApproveComments ? (
                <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                  <Sparkles className="h-3 w-3" /> هذا المنشور يتيح النشر الفوري للتعليقات دون انتظار الإدارة
                </span>
              ) : (
                <span>تعليقك يظهر بعد مراجعة الإدارة للحفاظ على بيئة محترمة ونافعة</span>
              )}
            </div>
          )}

          {rootComments.length > 0 && (
            <ul className="space-y-3 pt-1">
              {rootComments.map((c) => {
                const replies = getReplies(c.id);
                const isReplying = replyingTo?.id === c.id;
                const isEditing = editingCommentId === c.id;

                return (
                  <li key={c.id} className="space-y-2 rounded-2xl bg-white/[0.025] p-3.5 border border-white/[0.05]">
                    {/* التعليق الأساسي */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                        <AvatarWithFrame
                          name={c.author}
                          avatarUrl={c.avatarUrl}
                          frameId={c.avatarFrameId}
                          size="sm"
                        />
                        <div className="min-w-0">
                          {c.badges && c.badges.length > 0 && (
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              {c.badges.slice(0, 3).map((b) => (
                                <span
                                  key={b.id}
                                  title={b.name}
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold bg-gold/[0.08] dark:bg-gold/10 text-gold-deep dark:text-gold-light border border-gold/30 shadow-sm"
                                >
                                  <span className="text-xs leading-none">{b.icon || "🏆"}</span>
                                  <span className="truncate max-w-[90px]">{b.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <LeveledName name={c.author} level={c.level ?? 0} size="xs" />
                            {typeof c.level === "number" && heartsVisible && (
                              <UserCharmHeart level={c.level} size="xs" visible={heartsVisible} />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(new Date(c.createdAt))}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.pending && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            <CheckCircle2 className="h-3 w-3" /> بانتظار الاعتماد
                          </span>
                        )}
                        {c.mine && (
                          <button
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingText(c.body);
                            }}
                            title="تعديل تعليقي"
                            className="text-zinc-500 transition-colors hover:text-gold-light"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {c.mine && (
                          <button
                            onClick={() => onDeleteComment(c.id)}
                            title="حذف تعليقي"
                            className="text-zinc-600 transition-colors hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2 rounded-xl bg-white/[0.04] p-2.5">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={2}
                          maxLength={1000}
                          className="w-full rounded-lg border border-white/10 bg-transparent p-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSaveEdit(c.id)}
                            disabled={pending || !editingText.trim()}
                            className="rounded-lg bg-gold px-3 py-1 text-xs font-extrabold text-night hover:bg-gold-light disabled:opacity-40"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">{c.body}</p>
                    )}

                    {/* زر الرد */}
                    {canComment && !locked && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            if (isReplying) {
                              setReplyingTo(null);
                              setReplyText("");
                            } else {
                              setReplyingTo({ id: c.id, author: c.author });
                              setReplyText("");
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-gold/80 hover:text-gold-light"
                        >
                          <CornerDownLeft className="h-3 w-3" />
                          {isReplying ? "إلغاء الرد" : "رد"}
                        </button>
                      </div>
                    )}

                    {/* نموذج كتابة الرد */}
                    {isReplying && (
                      <div className="mt-2.5 space-y-2 rounded-xl border border-gold/25 bg-gold/[0.03] p-3">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-gold-light">
                          <div className="flex items-center gap-2">
                            <AvatarWithFrame
                              name="أنت"
                              avatarUrl={currentUserAvatarUrl}
                              frameId={currentUserFrameId}
                              size="sm"
                            />
                            <span>الرد على {c.author}:</span>
                            {typeof currentUserLevel === "number" && heartsVisible && (
                              <UserCharmHeart level={currentUserLevel} size="xs" visible={heartsVisible} />
                            )}
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            maxLength={1000}
                            placeholder={`اكتب ردك على ${c.author}...`}
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSendReply(c.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => onSendReply(c.id)}
                            disabled={pending || !replyText.trim()}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-gold px-3.5 text-xs font-extrabold text-night hover:bg-gold-light disabled:opacity-40 cursor-pointer"
                          >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "إرسال"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* قائمة الردود المتداخلة (Nested Replies) */}
                    {replies.length > 0 && (
                      <div className="mt-3 space-y-2.5 border-s-2 border-gold/30 ps-3.5 ms-2.5">
                        {replies.map((reply) => {
                          const isReplyEditing = editingCommentId === reply.id;
                          return (
                            <div key={reply.id} className="rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                                  <AvatarWithFrame
                                    name={reply.author}
                                    avatarUrl={reply.avatarUrl}
                                    frameId={reply.avatarFrameId}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    {reply.badges && reply.badges.length > 0 && (
                                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                                        {reply.badges.slice(0, 3).map((b) => (
                                          <span
                                            key={b.id}
                                            title={b.name}
                                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold bg-gold/[0.08] dark:bg-gold/10 text-gold-deep dark:text-gold-light border border-gold/30 shadow-sm"
                                          >
                                            <span className="text-xs leading-none">{b.icon || "🏆"}</span>
                                            <span className="truncate max-w-[80px]">{b.name}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <LeveledName name={reply.author} level={reply.level ?? 0} size="xs" showLevelChip={false} />
                                      {typeof reply.level === "number" && heartsVisible && (
                                        <UserCharmHeart level={reply.level} size="xs" visible={heartsVisible} />
                                      )}
                                      <span className="rounded bg-gold/[0.12] dark:bg-gold/[0.1] px-1.5 py-0.5 text-[9px] font-bold text-gold-deep dark:text-gold">رد</span>
                                      <span className="text-[10px] text-zinc-500">
                                        {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(new Date(reply.createdAt))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {reply.pending && (
                                    <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                      بانتظار الاعتماد
                                    </span>
                                  )}
                                  {reply.mine && (
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(reply.id);
                                        setEditingText(reply.body);
                                      }}
                                      title="تعديل الرد"
                                      className="text-zinc-500 transition-colors hover:text-gold-light"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  )}
                                  {reply.mine && (
                                    <button
                                      onClick={() => onDeleteComment(reply.id)}
                                      title="حذف الرد"
                                      className="text-zinc-600 transition-colors hover:text-red-300"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isReplyEditing ? (
                                <div className="mt-2 space-y-2 rounded-xl bg-white/[0.04] p-2.5">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    rows={2}
                                    maxLength={1000}
                                    className="w-full rounded-lg border border-white/10 bg-transparent p-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => onSaveEdit(reply.id)}
                                      disabled={pending || !editingText.trim()}
                                      className="rounded-lg bg-gold px-3 py-1 text-xs font-extrabold text-night hover:bg-gold-light disabled:opacity-40"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-zinc-300">{reply.body}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
