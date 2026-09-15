"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Pin, PinOff, EyeOff, Eye, Lock, LockOpen,
  CheckCircle2, XCircle, Trash, Pencil, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  saveCommunityPost, setCommunityPostState, deleteCommunityPost,
  moderateComment, editComment,
} from "@/actions/community";
import { COMMUNITY_POST_TYPES, COMMENT_STATUS_LABELS } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
//  مدير المجتمع — اللجنة هي الناشر الأساسي
//  إنشاء/تعديل منشور + تثبيت/إخفاء/قفل + إشراف وتعديل التعليقات
// ═══════════════════════════════════════════════════════════════

export type AdminPost = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  pinned: boolean;
  lockedComments: boolean;
  autoApproveComments?: boolean;
  imageUrl: string | null;
  mediaUrl: string | null;
  likes: number;
  createdAt: string;
  comments: { id: string; author: string; body: string; status: string; parentId?: string | null; createdAt: string; postId: string }[];
};

export function CommunityManager({ posts, canManage }: { posts: AdminPost[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openComments, setOpenComments] = useState<string | null>(null);

  // نموذج المنشور
  const [type, setType] = useState("NEWS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [lockedComments, setLockedComments] = useState(false);
  const [autoApproveComments, setAutoApproveComments] = useState(false);

  // تعديل تعليق مباشر
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditText, setCommentEditText] = useState("");

  function resetPostForm() {
    setEditingPostId(null);
    setTitle("");
    setBody("");
    setImageUrl("");
    setMediaUrl("");
    setPinned(false);
    setLockedComments(false);
    setAutoApproveComments(false);
    setType("NEWS");
  }

  function onStartEditPost(post: AdminPost) {
    setEditingPostId(post.id);
    setType(post.type);
    setTitle(post.title);
    setBody(post.body);
    setImageUrl(post.imageUrl ?? "");
    setMediaUrl(post.mediaUrl ?? "");
    setPinned(post.pinned);
    setLockedComments(post.lockedComments);
    setAutoApproveComments(post.autoApproveComments ?? false);
    setCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onStartEditComment(c: { id: string; body: string }) {
    setEditingCommentId(c.id);
    setCommentEditText(c.body);
  }

  function onSaveCommentEdit(commentId: string) {
    const text = commentEditText.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await editComment(commentId, text);
      if (res.ok) {
        setEditingCommentId(null);
        setCommentEditText("");
        setMsg("✓ تم تعديل نص التعليق بنجاح");
        router.refresh();
      } else {
        setMsg(res.error ?? "تعذر تعديل التعليق");
      }
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveCommunityPost({
        id: editingPostId || undefined,
        type, title, body,
        imageUrl: imageUrl || null,
        mediaUrl: mediaUrl || null,
        pinned, lockedComments,
        autoApproveComments,
      });
      if (res.ok) {
        setCreating(false);
        resetPostForm();
        setMsg(editingPostId ? "✓ تم تحديث المنشور بنجاح" : "✓ تم نشر المنشور بنجاح");
        router.refresh();
      } else setMsg(res.error ?? "تعذر الحفظ");
    });
  }

  function stateChange(postId: string, change: { hidden?: boolean; pinned?: boolean; locked?: boolean }, successMsg: string) {
    startTransition(async () => {
      const res = await setCommunityPostState(postId, change);
      setMsg(res.ok ? `✓ ${successMsg}` : (res.error ?? "تعذر التنفيذ"));
      router.refresh();
    });
  }

  function onModerate(commentId: string, action: "APPROVE" | "HIDE" | "DELETE") {
    startTransition(async () => {
      const res = await moderateComment(commentId, action);
      if (!res.ok) setMsg(res.error ?? "تعذر الإشراف");
      router.refresh();
    });
  }

  function onDeletePost(postId: string) {
    if (!confirm("حذف المنشور نهائيًا مع تعليقاته — متابع؟")) return;
    startTransition(async () => {
      const res = await deleteCommunityPost(postId);
      setMsg(res.ok ? "✓ حُذف المنشور" : (res.error ?? "تعذر الحذف"));
      router.refresh();
    });
  }

  const pendingComments = posts.flatMap((p) => p.comments.filter((c) => c.status === "PENDING").map((c) => ({ ...c, postTitle: p.title })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-100">المجتمع</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {posts.length} منشورًا · {pendingComments.length} تعليقًا بانتظار الاعتماد
          </p>
        </div>
        {canManage && !creating && (
          <Button onClick={() => setCreating(true)} className="h-11 rounded-xl bg-gold font-extrabold text-night hover:bg-gold-light">
            <Plus className="h-4 w-4" /> منشور جديد
          </Button>
        )}
      </div>

      {msg && <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm font-bold text-gold-light">{msg}</p>}

      {/* تعليقات بانتظار الاعتماد */}
      {pendingComments.length > 0 && (
        <section className="rounded-3xl border border-amber-500/25 bg-amber-500/[0.04] p-5" aria-labelledby="pending-comments">
          <h2 id="pending-comments" className="mb-3 text-sm font-extrabold text-amber-300">
            تعليقات بانتظار الاعتماد ({pendingComments.length})
          </h2>
          <div className="space-y-2.5">
            {pendingComments.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/[0.07] bg-surface p-4">
                <p className="text-xs font-extrabold text-zinc-300">{c.author} <span className="font-bold text-zinc-600">على «{c.postTitle}»</span></p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-zinc-400">{c.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => onModerate(c.id, "APPROVE")} disabled={pending} className="h-9 rounded-lg bg-emerald-500 px-4 text-xs font-extrabold text-white hover:bg-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
                  </Button>
                  <Button onClick={() => onStartEditComment(c)} disabled={pending} variant="outline" className="h-9 rounded-lg border-gold/30 px-3.5 text-xs font-bold text-gold-light hover:bg-gold/10">
                    <Pencil className="h-3.5 w-3.5" /> تعديل النص
                  </Button>
                  <Button onClick={() => onModerate(c.id, "HIDE")} disabled={pending} variant="outline" className="h-9 rounded-lg px-4 text-xs font-bold">
                    <EyeOff className="h-3.5 w-3.5" /> إخفاء
                  </Button>
                  <Button onClick={() => onModerate(c.id, "DELETE")} disabled={pending} variant="ghost" className="h-9 rounded-lg px-4 text-xs font-bold text-red-300">
                    <Trash className="h-3.5 w-3.5" /> حذف
                  </Button>
                </div>
                {editingCommentId === c.id && (
                  <div className="mt-3 space-y-2 rounded-xl border border-gold/25 bg-gold/[0.04] p-3">
                    <Label className="text-[11px] font-bold text-gold-light">تعديل نص التعليق:</Label>
                    <Textarea
                      rows={2}
                      value={commentEditText}
                      onChange={(e) => setCommentEditText(e.target.value)}
                      className="rounded-xl border-white/10 bg-white/[0.03] text-xs"
                      maxLength={1000}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onSaveCommentEdit(c.id)}
                        disabled={pending || !commentEditText.trim()}
                        className="h-8 rounded-lg bg-gold text-xs font-extrabold text-night hover:bg-gold-light"
                      >
                        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null} حفظ التعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCommentId(null)}
                        className="h-8 rounded-lg text-xs text-zinc-400"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* نموذج المنشور */}
      {creating && (
        <form onSubmit={onSave} className="space-y-4 rounded-3xl border border-gold/25 bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-zinc-100">
                {editingPostId ? "تعديل المنشور" : "منشور جديد"}
              </h2>
              {editingPostId && (
                <p className="mt-0.5 text-xs text-gold-light">يمكنك تعديل أي تفاصيل، روابط، صور، أو حالة التعليقات وحفظها مباشرة</p>
              )}
            </div>
            <Button type="button" variant="ghost" onClick={() => { setCreating(false); resetPostForm(); }} className="h-9 rounded-lg text-zinc-400">إلغاء</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">نوع المنشور</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm">
                {COMMUNITY_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">العنوان *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="مثال: فريقنا كسب المركز الأول في المسابقة" className="h-11 rounded-xl" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">النص *</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} placeholder="اكتب الخبر/الإنجاز/اللقطة..." required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">صورة (رابط درايف «أي شخص لديه الرابط» أو أي رابط)</Label>
              <Input dir="ltr" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl text-start" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">فيديو/وسيط (يوتيوب أو رابط مباشر mp4 — يظهر بمشغل مناسب تلقائيًا)</Label>
              <Input dir="ltr" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... أو https://.../video.mp4" className="h-11 rounded-xl text-start" />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-300">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-gold" /> تثبيت أعلى المجتمع
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-300">
              <input type="checkbox" checked={lockedComments} onChange={(e) => setLockedComments(e.target.checked)} className="accent-gold" /> قفل التعليقات
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gold-light">
              <input
                type="checkbox"
                checked={autoApproveComments}
                onChange={(e) => setAutoApproveComments(e.target.checked)}
                className="accent-gold"
              />
              السماح بالتعليق المباشر بدون موافقة مسبقة (اعتماد فوري)
            </label>
          </div>

          <Button type="submit" disabled={pending} className="h-12 rounded-2xl bg-gold px-8 text-sm font-extrabold text-night hover:bg-gold-light">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingPostId ? "حفظ التعديلات" : "نشر الآن"}
          </Button>
        </form>
      )}

      {/* المنشورات */}
      {posts.length === 0 && !creating && (
        <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.06] text-2xl">✨</span>
          <h2 className="mt-4 text-base font-extrabold text-zinc-200">المجتمع فاضي</h2>
          <p className="mt-1.5 text-sm text-zinc-500">انشر أول خبر أو إنجاز — الطلاب هيلاقوه في صفحة المجتمع مباشرة</p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((p) => {
          const open = openComments === p.id;
          return (
            <div key={p.id} className={`rounded-2xl border bg-surface ${p.status === "HIDDEN" ? "border-white/[0.04] opacity-60" : "border-white/[0.07]"}`}>
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-extrabold text-zinc-500">
                    <span className="text-base">{COMMUNITY_POST_TYPES.find((t) => t.value === p.type)?.icon ?? "📰"}</span>
                    {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(new Date(p.createdAt))}
                    {p.pinned && <Pin className="h-3 w-3 text-gold" />}
                    {p.status === "HIDDEN" && <span className="text-red-300">مخفي</span>}
                    {p.autoApproveComments && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        اعتماد تعليقات فوري
                      </span>
                    )}
                  </span>
                  {p.comments.filter((c) => c.status === "PENDING").length > 0 && (
                    <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-300">
                      {p.comments.filter((c) => c.status === "PENDING").length} تعليقًا للمراجعة
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-zinc-100">{p.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-zinc-500">{p.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">❤️ {p.likes}</span>
                  <button onClick={() => setOpenComments(open ? null : p.id)} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                    {p.comments.length} تعليقًا {open ? "▲" : "▼"}
                  </button>
                  {canManage && (
                    <span className="ms-auto flex flex-wrap gap-1.5">
                      <Button onClick={() => onStartEditPost(p)} variant="ghost" className="h-8 w-8 rounded-lg p-0 text-gold-light hover:bg-gold/15" title="تعديل المنشور">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => stateChange(p.id, { pinned: !p.pinned }, p.pinned ? "أُلغي التثبيت" : "ثُبّت")} variant="ghost" className="h-8 w-8 rounded-lg p-0 text-gold/70" title={p.pinned ? "إلغاء التثبيت" : "تثبيت"}>
                        {p.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button onClick={() => stateChange(p.id, { hidden: p.status !== "HIDDEN" }, p.status !== "HIDDEN" ? "أُخفي" : "أُظهر")} variant="ghost" className="h-8 w-8 rounded-lg p-0 text-zinc-400" title={p.status !== "HIDDEN" ? "إخفاء" : "إظهار"}>
                        {p.status !== "HIDDEN" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button onClick={() => stateChange(p.id, { locked: !p.lockedComments }, p.lockedComments ? "فُتحت التعليقات" : "قُلفت التعليقات")} variant="ghost" className="h-8 w-8 rounded-lg p-0 text-zinc-400" title={p.lockedComments ? "فتح التعليقات" : "قفل التعليقات"}>
                        {p.lockedComments ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button onClick={() => onDeletePost(p.id)} variant="ghost" className="h-8 w-8 rounded-lg p-0 text-red-300" title="حذف">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  )}
                </div>
              </div>

              {open && p.comments.length > 0 && (
                <ul className="space-y-2 border-t border-white/[0.06] p-4">
                  {p.comments.map((c) => (
                    <li key={c.id} className={`rounded-xl border p-3.5 ${c.status === "PENDING" ? "border-amber-500/20 bg-amber-500/[0.04]" : c.status === "HIDDEN" ? "border-white/[0.04] bg-white/[0.01] opacity-60" : "border-white/[0.06] bg-white/[0.02]"} ${c.parentId ? "ms-4 border-s-2 border-s-gold/40" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-extrabold text-zinc-300">
                          {c.author}
                          {c.parentId && <span className="text-[10px] text-zinc-500 font-normal ms-1.5">(رد متداخل)</span>}
                        </p>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${c.status === "PENDING" ? "bg-amber-500/10 text-amber-300" : c.status === "HIDDEN" ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                            {COMMENT_STATUS_LABELS[c.status]}
                          </span>
                          <button onClick={() => onStartEditComment(c)} className="text-zinc-500 hover:text-gold-light" title="تعديل نص التعليق">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {c.status !== "APPROVED" && (
                            <button onClick={() => onModerate(c.id, "APPROVE")} className="text-emerald-400 hover:text-emerald-300" title="اعتماد">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {c.status === "APPROVED" && (
                            <button onClick={() => onModerate(c.id, "HIDE")} className="text-zinc-500 hover:text-amber-300" title="إخفاء">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => onModerate(c.id, "DELETE")} className="text-zinc-600 hover:text-red-300" title="حذف">
                            <Trash className="h-4 w-4" />
                          </button>
                        </span>
                      </div>
                      {editingCommentId === c.id ? (
                        <div className="mt-2.5 space-y-2 rounded-xl border border-gold/25 bg-gold/[0.04] p-3">
                          <Label className="text-[11px] font-bold text-gold-light">تعديل نص التعليق:</Label>
                          <Textarea
                            rows={2}
                            value={commentEditText}
                            onChange={(e) => setCommentEditText(e.target.value)}
                            className="rounded-xl border-white/10 bg-white/[0.03] text-xs"
                            maxLength={1000}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => onSaveCommentEdit(c.id)}
                              disabled={pending || !commentEditText.trim()}
                              className="h-8 rounded-lg bg-gold text-xs font-extrabold text-night hover:bg-gold-light"
                            >
                              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null} حفظ التعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCommentId(null)}
                              className="h-8 rounded-lg text-xs text-zinc-400"
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-zinc-400">{c.body}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
