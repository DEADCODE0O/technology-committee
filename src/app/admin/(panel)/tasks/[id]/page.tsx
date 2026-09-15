import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Users, Send, CheckCircle2, Clock, ExternalLink, FileText, Link2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MODULES } from "@/lib/permissions";
import { SubmissionEvaluator, EvaluatedBadge } from "@/components/admin/submission-evaluator";
import { parseTaskPool, parseExternalLinks } from "@/lib/tasks";
import { parseTarget, describeTarget } from "@/lib/targeting";
import {
  GRADE_LABELS, SECTION_LABELS, GENDER_LABELS,
  TASK_SUBMISSION_TYPE_LABELS, TASK_DISTRIBUTION_LABELS, TASK_STATUS_LABELS,
  TASK_SUBMISSION_STATUS_LABELS,
} from "@/lib/constants";
import { safeExternalUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

export default async function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(MODULES.WORKSHOPS, "view");

  const task = await db.task.findUnique({
    where: { id },
    include: {
      activity: { select: { id: true, title: true } },
      assignments: {
        orderBy: [{ status: "desc" }, { assignedAt: "asc" }],
        include: {
          user: { include: { profile: { select: { fullName: true, grade: true, section: true } } } },
          team: { select: { name: true, icon: true } },
          submission: true,
        },
      },
    },
  });
  if (!task) notFound();

  const pool = parseTaskPool(task.pool);
  const links = parseExternalLinks(task.links);
  const targetDesc = describeTarget(parseTarget(task.target), {
    grade: GRADE_LABELS, section: SECTION_LABELS, gender: GENDER_LABELS,
  });

  const withSub = task.assignments.filter((a) => a.submission);
  const pendingEval = withSub.filter((a) => a.submission!.status !== "EVALUATED");

  return (
    <div className="space-y-6">
      <Link href="/admin/tasks" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-gold-light">
        <ArrowRight className="h-4 w-4" /> كل المهام
      </Link>

      {/* رأس المهمة */}
      <section className="rounded-3xl border border-white/[0.07] bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
          <span className="rounded-lg bg-gold/[0.1] px-2.5 py-1 text-gold">{TASK_STATUS_LABELS[task.status]}</span>
          <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-400">{TASK_SUBMISSION_TYPE_LABELS[task.submissionType]}</span>
          <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-400">{TASK_DISTRIBUTION_LABELS[task.distribution]}</span>
          {task.xpReward > 0 && <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-300">+{task.xpReward} XP</span>}
          {task.activity && (
            <Link href={`/admin/activities/${task.activity.id}`} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-400 hover:text-zinc-200">
              {task.activity.title}
            </Link>
          )}
        </div>
        <h1 className="mt-3 text-xl font-extrabold text-zinc-100">{task.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-400">{task.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gold/60" /> {task.assignments.length} مكلَّفًا · {targetDesc}</span>
          {task.dueAt && (
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gold/60" /> الموعد: {new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short" }).format(task.dueAt)}</span>
          )}
          <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5 text-gold/60" /> {withSub.length} تسليمًا · {pendingEval.length} بانتظار التقييم</span>
        </div>
        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((l, i) => (
              <a key={i} href={safeExternalUrl(l.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-xs font-bold text-gold-light">
                <ExternalLink className="h-3 w-3" /> {l.label}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* بدائل المهام */}
      {pool.length > 1 && (
        <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
          <h2 className="text-sm font-extrabold text-zinc-200">بدائل المهمة ({pool.length})</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {pool.map((p, i) => (
              <li key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-xs font-extrabold text-zinc-200">#{i + 1} — {p.title}</p>
                {p.description && <p className="mt-1 text-[11px] leading-5 text-zinc-500">{p.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* التسليمات */}
      <section aria-labelledby="subs">
        <h2 id="subs" className="mb-3 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
          التكليفات والتسليمات ({task.assignments.length})
        </h2>
        {task.assignments.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-surface p-8 text-center text-sm text-zinc-500">
            لا مكلفين — المهمة لم تُنشر بعد (مسودة)
          </div>
        ) : (
          <div className="space-y-3">
            {task.assignments.map((a) => {
              const sub = a.submission;
              const name = a.user?.profile?.fullName ?? (a.team ? `${a.team.icon} ${a.team.name} (فريق)` : "—");
              const meta = a.user?.profile ? `${GRADE_LABELS[a.user.profile.grade] ?? ""} · ${SECTION_LABELS[a.user.profile.section] ?? ""}` : "";
              return (
                <article key={a.id} className="rounded-2xl border border-white/[0.07] bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-100">{name}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {meta}
                        {a.team && a.user ? ` · عضو فريق ${a.team.name}` : ""}
                        {pool.length > 1 && sub?.variantIndex === null && !sub && ` · البديل #${a.variantIndex + 1}`}
                        {sub?.variantIndex !== null && sub?.variantIndex !== undefined && pool.length > 1 ? ` · البديل #${sub.variantIndex + 1}` : ""}
                      </p>
                    </div>
                    {sub?.status === "EVALUATED" ? (
                      <EvaluatedBadge score={sub.score ?? 0} xp={sub.xpAwarded} late={sub.late} />
                    ) : (
                      <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                        sub ? "bg-gold/[0.1] text-gold" : "bg-white/[0.04] text-zinc-500"
                      }`}>
                        {sub ? (sub.late ? "سلّم متأخرًا" : TASK_SUBMISSION_STATUS_LABELS[sub.status]) : "لم يسلّم بعد"}
                      </span>
                    )}
                  </div>

                  {sub && (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1.5 rounded-2xl bg-white/[0.02] p-4 text-xs text-zinc-300">
                        {sub.text && (
                          <p className="whitespace-pre-line leading-6">
                            <FileText className="me-1 inline h-3.5 w-3.5 text-gold/60" />
                            {sub.text.length > 500 ? `${sub.text.slice(0, 500)}…` : sub.text}
                          </p>
                        )}
                        {sub.linkUrl && (
                          <div className="pt-1">
                            {sub.linkUrl.includes("drive.google.com") || sub.linkUrl.includes("docs.google.com") ? (
                              <a
                                href={safeExternalUrl(sub.linkUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.1] px-3.5 py-1.5 text-xs font-black text-gold-light hover:bg-gold/[0.2] transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                فتح ملف الطالب في Google Drive ↗
                              </a>
                            ) : (
                              <a
                                href={safeExternalUrl(sub.linkUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold text-gold/80 hover:underline"
                                dir="ltr"
                              >
                                <Link2 className="h-3.5 w-3.5" /> {sub.linkUrl.slice(0, 80)}
                              </a>
                            )}
                          </div>
                        )}
                        {sub.fileUrl && (
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-gold/80 hover:underline">
                            <FileText className="h-3.5 w-3.5" /> الملف المرفوع على السيرفر
                          </a>
                        )}
                        <p className="text-zinc-600">
                          سُلّم: {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(sub.submittedAt)}
                        </p>
                      </div>

                      {sub.status === "EVALUATED" ? (
                        sub.feedback && (
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                            <p className="text-[11px] font-extrabold text-emerald-300">ملاحظات التقييم:</p>
                            <p className="mt-1 whitespace-pre-line text-xs leading-6 text-emerald-100/80">{sub.feedback}</p>
                          </div>
                        )
                      ) : (
                        <SubmissionEvaluator submissionId={sub.id} defaultXp={task.xpReward} />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

void CheckCircle2;
