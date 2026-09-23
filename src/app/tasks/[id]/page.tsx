import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, ExternalLink, Award, Send, CheckCircle2, RotateCcw, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { getStudentBadges } from "@/lib/student-badges";
import { StudentShell } from "@/components/student/student-shell";
import { TaskSubmitForm } from "@/components/student/task-submit-form";
import { parseTaskPool, parseExternalLinks } from "@/lib/tasks";
import { TASK_SUBMISSION_TYPE_LABELS } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudent();

  const membership = await db.teamMember.findFirst({ where: { userId: user.id } });
  const assignment = await db.taskAssignment.findFirst({
    where: { taskId: id, OR: [{ userId: user.id }, ...(membership ? [{ teamId: membership.teamId }] : [])] },
    include: {
      task: { include: { activity: { select: { id: true, title: true } } } },
      team: { select: { name: true, icon: true } },
      submission: true,
    },
  });
  if (!assignment) notFound(); // مهمة غير موجهة إليه = غير موجودة (أسرع وأسلم)

  const task = assignment.task;
  const pool = parseTaskPool(task.pool);
  const variant = pool[assignment.variantIndex] ?? null;
  const displayTitle = variant?.title ?? task.title;
  const displayDesc = variant?.description ?? task.description;
  const links = parseExternalLinks(task.links);
  const sub = assignment.submission;
  const badges = await getStudentBadges(user);

  const duePassed = task.dueAt ? new Date() > task.dueAt : false;
  const canSubmit = task.status === "PUBLISHED" && (!sub || sub.status === "RETURNED" || sub.status === "SUBMITTED");

  return (
    <StudentShell
      user={{
        name: user.profile?.fullName ?? user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="tasks"
      unreadCount={badges.unreadCount}
      openTaskCount={badges.openTaskCount}
      unreadMessagesCount={badges.unreadMessagesCount}
      pendingCount={badges.pendingCount}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-gold-deep dark:hover:text-gold-light">
          <ArrowRight className="h-4 w-4" /> كل مهامي
        </Link>

        {/* بطاقة المهمة */}
        <article className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-gold/[0.1] px-2.5 py-1 text-[11px] font-extrabold text-gold-deep dark:text-gold-light border border-gold/20">
              {TASK_SUBMISSION_TYPE_LABELS[task.submissionType]}
              {assignment.team ? " · جماعية" : ""}
            </span>
            {task.activity && (
              <Link
                href={`/activities/${task.activity.id}`}
                className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                {task.activity.title}
              </Link>
            )}
            {task.xpReward > 0 && (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                <Award className="h-3 w-3" /> +{task.xpReward} XP
              </span>
            )}
          </div>

          <h1 className="mt-4 text-xl font-extrabold leading-9 text-foreground sm:text-2xl">{displayTitle}</h1>
          {assignment.team && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-gold" /> مهمة فريق «{assignment.team.icon} {assignment.team.name}» — أي عضو يسلّم باسم الفريق
            </p>
          )}
          <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-foreground/90">{displayDesc}</p>

          {task.dueAt && (
            <p
              className={`mt-4 flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold ${
                duePassed ? "bg-red-500/15 text-red-600 dark:text-red-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {duePassed ? "انتهى الموعد — تسليمك سيحسب متأخرًا" : `آخر موعد: ${new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "full", timeStyle: "short" }).format(task.dueAt)}`}
            </p>
          )}

          {/* روابط مساعدة موصوفة — لا URLs طويلة أمام الطالب */}
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={safeExternalUrl(l.url)}
                  target={l.newTab === false ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.08] px-3.5 py-2 text-xs font-extrabold text-gold-deep dark:text-gold-light transition-colors hover:bg-gold/[0.15]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                </a>
              ))}
            </div>
          )}
        </article>

        {/* التسليم */}
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            {sub?.status === "EVALUATED" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> نتيجة تقييمك
              </>
            ) : sub?.status === "RETURNED" ? (
              <>
                <RotateCcw className="h-5 w-5 text-red-500" /> أُعيدت للتعديل — سلّم مرة أخرى
              </>
            ) : sub ? (
              <>
                <Send className="h-5 w-5 text-gold" /> تسليمك — بانتظار التقييم
              </>
            ) : (
              <>
                <Send className="h-5 w-5 text-gold" /> سلّم مهمتك
              </>
            )}
          </h2>

          {sub?.status === "EVALUATED" ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                  {sub.score}/100
                </span>
                {sub.xpAwarded > 0 && (
                  <span className="flex items-center gap-1.5 rounded-2xl bg-gold/[0.1] px-4 py-2 text-sm font-extrabold text-gold-deep dark:text-gold-light">
                    <Award className="h-4 w-4" /> +{sub.xpAwarded} XP
                  </span>
                )}
                {sub.late && <span className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-300">متأخر</span>}
              </div>
              {sub.feedback && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-extrabold text-muted-foreground">ملاحظات المشرف:</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-7 text-foreground">{sub.feedback}</p>
                </div>
              )}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {sub.text && <p>نصك: {sub.text.slice(0, 200)}{sub.text.length > 200 ? "…" : ""}</p>}
                {sub.linkUrl && (
                  <a href={safeExternalUrl(sub.linkUrl)} target="_blank" rel="noopener noreferrer" className="block font-bold text-gold-deep dark:text-gold-light hover:underline" dir="ltr">
                    رابطك المرسل
                  </a>
                )}
                {sub.fileUrl && (
                  <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="block font-bold text-gold-deep dark:text-gold-light hover:underline">
                    ملفك المرسل
                  </a>
                )}
                <p>سُلّمت: {new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" }).format(sub.submittedAt)}</p>
              </div>
            </div>
          ) : (
            <>
              {sub && sub.status === "SUBMITTED" && (
                <p className="mt-2 rounded-xl bg-gold/[0.08] border border-gold/20 px-4 py-2.5 text-xs leading-6 text-gold-deep dark:text-gold-light font-bold">
                  سلّمت بالفعل — يمكنك تحديث التسليم قبل التقييم
                </p>
              )}
              {sub?.status === "RETURNED" && sub.feedback && (
                <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-4">
                  <p className="text-xs font-extrabold text-red-600 dark:text-red-300">سبب الإعادة:</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-7 text-foreground/90">{sub.feedback || "راجع التكليف وحسّن تسليمك"}</p>
                </div>
              )}
              {canSubmit ? (
                <div className="mt-4">
                  <TaskSubmitForm
                    taskId={task.id}
                    submissionType={task.submissionType}
                    needsVariant={task.distribution === "TASK_POOL"}
                    pool={pool}
                    canResubmit={!!sub}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">المهمة مغلقة ولا تقبل تسليمًا</p>
              )}
            </>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
