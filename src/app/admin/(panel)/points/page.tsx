import { Zap } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { PointRuleEditor } from "@/components/admin/point-rule-editor";
import { BulkPointsForm, DeletePointEventButton, ReversePointEventButton } from "@/components/admin/points-tools";
import { ensureDefaults } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPointsPage() {
  const admin = await requireAdmin(MODULES.POINTS);
  const canManage = canUser(admin, MODULES.POINTS, "manage");

  // أول مرة: زرع القواعد الافتراضية
  await ensureDefaults();

  const rules = await db.pointRule.findMany({ orderBy: { points: "desc" } });
  const recentEvents = await db.pointEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { include: { profile: true } }, session: { select: { title: true, activity: { select: { title: true } } } }, createdBy: { select: { email: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
            <Zap className="h-6 w-6 text-gold" />
            نظام النقاط
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            قواعد قابلة للتعديل + منح وخصم جماعي لمجموعات + التراجع عن أي منح/خصم بحدث معاكس — كل شيء موثق في سجل العمليات
          </p>
        </div>
        {canManage && <BulkPointsForm />}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {/* القواعد */}
        <section className="min-w-0 rounded-3xl border border-white/[0.06] bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
            <Zap className="h-5 w-5 text-gold/80" />
            قواعد النقاط
          </h2>
          <p className="mb-4 rounded-xl border border-gold/15 bg-gold/[0.04] px-4 py-3 text-[11px] leading-5 text-zinc-500">
            قاعدة «حضور ورشة» تُطبق تلقائيًا عند تسجيل الحضور (يدويًا أو QR) — مرة واحدة لكل طالب في كل ورشة.
          </p>
          <PointRuleEditor rules={rules.map((r) => ({ action: r.action, label: r.label, points: r.points, active: r.active }))} canManage={canManage} />
        </section>

        {/* آخر الأحداث */}
        <section className="min-w-0 rounded-3xl border border-white/[0.06] bg-surface p-5">
          <h2 className="mb-4 text-base font-extrabold text-zinc-100">آخر عمليات النقاط</h2>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-zinc-600">مفيش عمليات بعد</p>
          ) : (
            <ul className="max-h-[430px] space-y-2 overflow-y-auto">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-200">{e.user.profile?.fullName ?? e.user.email}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                      {e.reason}{e.session ? ` · ${e.session.activity.title} — ${e.session.title}` : ""} · {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(e.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                      e.points > 0 ? "border border-gold/30 bg-gold/[0.08] text-gold-light" : "border border-red-500/20 bg-red-500/[0.05] text-red-300"
                    }`}>
                      {e.points > 0 ? `+${e.points}` : e.points}
                    </span>
                    {canManage && (
                      <>
                        <ReversePointEventButton eventId={e.id} points={e.points} studentName={e.user.profile?.fullName ?? e.user.email} />
                        <DeletePointEventButton eventId={e.id} studentName={e.user.profile?.fullName ?? e.user.email} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
