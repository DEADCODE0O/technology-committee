import Link from "next/link";
import { ClipboardList, Clock, Send, CheckCircle2, Award, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { getStudentNotifications } from "@/lib/notifications";
import { StudentShell } from "@/components/student/student-shell";
import { parseTaskPool, parseExternalLinks } from "@/lib/tasks";
import { TASK_SUBMISSION_TYPE_LABELS, TASK_DISTRIBUTION_LABELS } from "@/lib/constants";
import { submitTask } from "@/actions/tasks";

export const dynamic = "force-dynamic";

function fmtDue(d: Date | null): string {
  if (!d) return "بلا موعد محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
  }).format(d);
}

function dueTone(d: Date | null): "danger" | "warn" | "ok" {
  if (!d) return "ok";
  const hours = (d.getTime() - Date.now()) / 3600000;
  if (hours < 0) return "danger";
  if (hours < 24) return "warn";
  return "ok";
}

export default async function MyTasksPage() {
  const user = await requireStudent();

  // تكليفاتي (فردي أو فريقي) للمهام المنشورة
  const membership = await db.teamMember.findFirst({ where: { userId: user.id } });
  const assignments = await db.taskAssignment.findMany({
    where: {
      OR: [{ userId: user.id }, ...(membership ? [{ teamId: membership.teamId }] : [])],
      task: { status: { in: ["PUBLISHED", "CLOSED"] } },
    },
    include: {
      task: {
        include: { activity: { select: { title: true } } },
      },
      team: { select: { name: true, icon: true } },
      submission: true,
    },
    orderBy: { task: { publishedAt: "desc" } },
  });

  const open = assignments.filter((a) => !a.submission || a.submission.status === "RETURNED");
  const submitted = assignments.filter((a) => a.submission && a.submission.status !== "EVALUATED");
  const evaluated = assignments.filter((a) => a.submission?.status === "EVALUATED");

  const notifications = await getStudentNotifications(user);
  void submitTask;

  return (
    <StudentShell
      user={{
        name: user.profile?.fullName ?? user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarFrameId: user.avatarFrameId,
      }}
      active="tasks"
      unreadCount={notifications.unreadCount}
      openTaskCount={open.length}
    >
      <div className="space-y-6">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.1] text-gold">
                <ClipboardList className="h-5 w-5" />
              </span>
              مهامي
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {open.length > 0
                ? `عندك ${open.length} ${open.length === 1 ? "مهمة بانتظار تسليمك" : "مهام بانتظار تسليمك"}`
                : "مفيش مهام دلوقتي — استمتع بالأنشطة 🎯"}
            </p>
          </div>
        </div>

        {/* الحالة الفارغة */}
        {assignments.length === 0 && (
          <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-gold/20 bg-gold/[0.06] text-3xl">🎯</span>
            <h2 className="mt-5 text-lg font-extrabold text-zinc-200">مفيش مهام دلوقتي</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-zinc-500">
              كل ما اللجنة تكلفك بمهمة هتلاقيها هنا فورًا مع إشعار يوصلك — في الوقت ده، اكتشف الأنشطة وشارك تعلّم وأنجز.
            </p>
            <Link
              href="/activities"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-gold px-6 text-sm font-extrabold text-night transition-transform hover:scale-[1.02]"
            >
              اكتشف الأنشطة
            </Link>
          </div>
        )}

        {/* بانتظار تسليمك */}
        {open.length > 0 && (
          <section aria-label="مهام بانتظار التسليم">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gold">
              <Clock className="h-4 w-4" /> بانتظار تسليمك ({open.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {open.map((a) => {
                const pool = parseTaskPool(a.task.pool);
                const variant = pool[a.variantIndex] ?? null;
                const tone = dueTone(a.task.dueAt);
                const links = parseExternalLinks(a.task.links);
                return (
                  <Link
                    key={a.id}
                    href={`/tasks/${a.task.id}`}
                    className="group rounded-3xl border border-white/[0.07] bg-surface p-5 transition-all hover:border-gold/30 hover:bg-gold/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-extrabold leading-7 text-zinc-100 group-hover:text-gold-light">
                        {variant ? variant.title : a.task.title}
                        {a.team && (
                          <span className="ms-2 rounded-lg bg-white/[0.05] px-2 py-0.5 align-middle text-[11px] font-bold text-zinc-400">
                            {a.team.icon} {a.team.name}
                          </span>
                        )}
                      </h3>
                      <span
                        className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-extrabold ${
                          tone === "danger"
                            ? "bg-red-500/15 text-red-300"
                            : tone === "warn"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/10 text-emerald-300/80"
                        }`}
                      >
                        {a.task.dueAt
                          ? tone === "danger"
                            ? "تجاوز الموعد"
                            : `الموعد: ${fmtDue(a.task.dueAt)}`
                          : "بلا موعد"}
                      </span>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-[13px] leading-6 text-zinc-400">
                      {(variant?.description ?? a.task.description).replace(/\n/g, " ")}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-zinc-400">
                        {TASK_SUBMISSION_TYPE_LABELS[a.task.submissionType]}
                      </span>
                      {pool.length > 1 && (
                        <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-zinc-400">
                          {TASK_DISTRIBUTION_LABELS[a.task.distribution]}
                        </span>
                      )}
                      {links.length > 0 && (
                        <span className="rounded-lg bg-gold/[0.08] px-2 py-1 text-gold/80">
                          {links.length} روابط مساعدة
                        </span>
                      )}
                      {a.task.xpReward > 0 && (
                        <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-300">
                          +{a.task.xpReward} XP
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* سلّمت بانتظار التقييم */}
        {submitted.length > 0 && (
          <section aria-label="مهام سلّمتها">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-zinc-400">
              <Send className="h-4 w-4" /> سلّمتها — بانتظار التقييم ({submitted.length})
            </h2>
            <div className="space-y-2.5">
              {submitted.map((a) => (
                <Link
                  key={a.id}
                  href={`/tasks/${a.task.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-surface px-4 py-3.5 transition-colors hover:border-gold/25"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-zinc-200">{a.task.title}</span>
                  <span className="shrink-0 rounded-lg bg-gold/[0.1] px-2.5 py-1 text-[11px] font-extrabold text-gold">
                    {a.submission?.late ? "سلّمت متأخرًا" : "بانتظار التقييم"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* قُيّمت */}
        {evaluated.length > 0 && (
          <section aria-label="مهام قُيّمت">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-emerald-400/80">
              <CheckCircle2 className="h-4 w-4" /> قُيّمت ({evaluated.length})
            </h2>
            <div className="space-y-2.5">
              {evaluated.map((a) => (
                <Link
                  key={a.id}
                  href={`/tasks/${a.task.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-surface px-4 py-3.5 transition-colors hover:border-gold/25"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-zinc-200">{a.task.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {a.submission && a.submission.xpAwarded > 0 && (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-extrabold text-emerald-300">
                        <Award className="h-3 w-3" /> +{a.submission.xpAwarded}
                      </span>
                    )}
                    <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300">
                      {a.submission?.score}/100
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </StudentShell>
  );
}
