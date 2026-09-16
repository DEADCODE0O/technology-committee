import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Rocket, Users, CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { RunManager, type AdminRun } from "@/components/admin/run-manager";
import { ManifestExportButton } from "@/components/admin/gate-add-form";
import { CLOSING_MODE_LABELS } from "@/lib/activities";

export const dynamic = "force-dynamic";

export default async function AdminRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin(MODULES.WORKSHOPS, "view");
  const canManage = canUser(user, MODULES.WORKSHOPS, "manage");

  const run = await db.run.findUnique({
    where: { id },
    include: {
      activity: { select: { id: true, title: true, type: true, program: { select: { id: true, name: true, icon: true } } } },
      sessions: {
        orderBy: { startsAt: "asc" },
        include: { registrations: { where: { status: "REGISTERED" }, select: { id: true, inManifest: true, userId: true } } },
      },
    },
  });
  if (!run) notFound();

  const isCourse = run.activity.type === "COURSE";
  const runWord = isCourse ? "دفعة" : "تنفيذ";
  const totalRegistered = run.sessions.reduce((sum, s) => sum + s.registrations.length, 0);

  const runs: AdminRun[] = [
    {
      id: run.id,
      title: run.title,
      description: run.description,
      order: run.order,
      seats: run.seats,
      registrationOpensAt: run.registrationOpensAt ? run.registrationOpensAt.toISOString() : null,
      registrationClosesAt: run.registrationClosesAt ? run.registrationClosesAt.toISOString() : null,
      closingMode: run.closingMode,
      registrationOpen: run.registrationOpen,
      allowGuests: run.allowGuests,
      sessions: run.sessions.map((s) => ({
        id: s.id, title: s.title, startsAt: s.startsAt.toISOString(), runId: s.runId, registeredCount: s.registrations.length,
      })),
    },
  ];

  return (
    <div className="space-y-6">
      <Link href={`/admin/activities/${run.activityId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-gold-light">
        <ArrowRight className="h-4 w-4" /> {run.activity.title}
      </Link>

      {/* رأس التنفيذ */}
      <section className="rounded-3xl border border-white/[0.07] bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-zinc-500">
              <span className="flex items-center gap-1"><Rocket className="h-3.5 w-3.5 text-gold/70" /> {runWord} رقم {run.order}</span>
              {run.activity.program && <span>{run.activity.program.icon} {run.activity.program.name}</span>}
              <span className="rounded-lg bg-white/[0.04] px-2 py-0.5">{CLOSING_MODE_LABELS[run.closingMode] ?? run.closingMode}</span>
            </div>
            <h1 className="mt-2 text-xl font-extrabold text-zinc-100">{run.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gold/60" /> {totalRegistered} تسجيلًا · {run.sessions.length} جلسات</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-gold/60" />
                {run.registrationOpensAt
                  ? `تسجيل: ${new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short" }).format(run.registrationOpensAt)} → ${run.registrationClosesAt ? new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short" }).format(run.registrationClosesAt) : "مفتوح"}`
                  : "بلا نافذة تسجيل"}
              </span>
            </div>
          </div>
          {/* كشف النادي: أعلى تصدير لكل جلسات التنفيذ */}
          <div className="flex flex-col gap-2">
            {run.sessions[0] && (
              <ManifestExportButton sessionId={run.sessions[0].id} activityTitle={`${run.activity.title} — ${run.title}`} />
            )}
            <p className="max-w-[240px] text-[10px] leading-4 text-zinc-600">
              {run.sessions.length > 1
                ? `الكشف يغطي أول جلسة (${run.sessions[0]?.title}) — صدّر الباقي من صفحة كل جلسة`
                : "كشف المشاركين الفعليين بحالة الحضور"}
            </p>
          </div>
        </div>
        {run.description && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400">{run.description}</p>}
      </section>

      {/* إدارة التنفيذ */}
      <RunManager
        activityId={run.activityId}
        runs={runs}
        unlinkedSessions={[]}
        activityWord={runWord}
        canManage={canManage}
      />
    </div>
  );
}
