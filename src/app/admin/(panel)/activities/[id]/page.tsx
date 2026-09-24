import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { ActivityForm } from "@/components/admin/activity-form";
import { SessionManager, type AdminSession } from "@/components/admin/session-manager";
import { RunManager, type AdminRun } from "@/components/admin/run-manager";
import { DeleteActivityButton } from "@/components/admin/delete-activity-button";
import { FormBuilder } from "@/components/admin/form-builder";
import type { FormFieldInput } from "@/actions/activities";
import {
  ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_SESSION_WORD,
} from "@/lib/constants";
import { getSessionState, decideRegistration, sessionDisplayName } from "@/lib/activities";
import { ImageWithPreview } from "@/components/admin/image-preview-modal";
import { ActivityDecisionAnalytics } from "@/components/admin/activity-decision-analytics";

export const dynamic = "force-dynamic";

export default async function AdminActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await requireAdmin();
  if (!canUser(user, MODULES.WORKSHOPS, "manage")) redirect("/admin/activities");

  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, name: true, icon: true } },
      formFields: { orderBy: { order: "asc" } },
      runs: { orderBy: { order: "asc" } },
      sessions: {
        orderBy: { startsAt: "asc" },
        include: {
          registrations: {
            where: { status: "REGISTERED" },
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              grade: true,
              section: true,
              gender: true,
              status: true,
              userId: true,
              attendance: { select: { present: true } },
            },
          },
          attendance: { where: { present: true }, select: { id: true, sessionId: true } },
        },
      },
    },
  });
  if (!activity) notFound();

  const programs = await db.program.findMany({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
    select: { id: true, name: true, icon: true },
  });

  const now = new Date();
  const sessionWord = ACTIVITY_TYPE_SESSION_WORD[activity.type] ?? "جلسة";
  const isCourse = activity.type === "COURSE";
  const canManage = canUser(user, MODULES.WORKSHOPS, "manage");

  const sessions: AdminSession[] = activity.sessions.map((s) => {
    const state = getSessionState(s, now);
    const decision = decideRegistration({
      session: {
        registrationOpensAt: s.registrationOpensAt,
        registrationClosesAt: s.registrationClosesAt,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        closingMode: s.closingMode,
        registrationOpen: s.registrationOpen,
      },
      registeredCount: s.registrations.length,
      seats: s.seats,
    });
    return {
      id: s.id,
      order: s.order,
      title: s.title,
      description: s.description,
      image: s.image,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt ? s.endsAt.toISOString() : null,
      location: s.location,
      presenter: s.presenter,
      onlineUrl: s.onlineUrl,
      onlineLabel: s.onlineLabel,
      materialUrl: s.materialUrl,
      materialLabel: s.materialLabel,
      whatsappUrl: s.whatsappUrl,
      telegramUrl: s.telegramUrl,
      status: s.status,
      qrToken: s.qrToken,
      seats: s.seats,
      registrationOpensAt: s.registrationOpensAt ? s.registrationOpensAt.toISOString() : null,
      registrationClosesAt: s.registrationClosesAt ? s.registrationClosesAt.toISOString() : null,
      closingMode: s.closingMode,
      registrationOpen: s.registrationOpen,
      allowGuests: s.allowGuests,
      allowAdminOverride: s.allowAdminOverride,
      registeredCount: s.registrations.length,
      presentCount: s.attendance.length,
      state,
    };
  });

  // بيانات التنفيذات/الدفعات
  const runs: AdminRun[] = (activity.runs ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    order: r.order,
    seats: r.seats,
    registrationOpensAt: r.registrationOpensAt ? r.registrationOpensAt.toISOString() : null,
    registrationClosesAt: r.registrationClosesAt ? r.registrationClosesAt.toISOString() : null,
    closingMode: r.closingMode,
    registrationOpen: r.registrationOpen,
    allowGuests: r.allowGuests,
    sessions: activity.sessions
      .filter((s) => s.runId === r.id)
      .map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt.toISOString(), runId: s.runId, registeredCount: s.registrations.length })),
  }));
  const unlinkedSessions = activity.sessions
    .filter((s) => !s.runId)
    .map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt.toISOString(), runId: null as string | null, registeredCount: s.registrations.length }));
  const runWord = isCourse ? "دفعة" : "تنفيذ";

  const openCount = sessions.filter((s) =>
    decideRegistration({
      session: {
        registrationOpensAt: s.registrationOpensAt ? new Date(s.registrationOpensAt) : null,
        registrationClosesAt: s.registrationClosesAt ? new Date(s.registrationClosesAt) : null,
        startsAt: new Date(s.startsAt),
        endsAt: s.endsAt ? new Date(s.endsAt) : null,
        closingMode: s.closingMode,
        registrationOpen: s.registrationOpen,
      },
      registeredCount: s.registeredCount,
      seats: s.seats,
    }, now).open
  ).length;
  const totalRegistered = sessions.reduce((sum, s) => sum + s.registeredCount, 0);

  const TABS = [
    { key: "sessions", label: isCourse ? `المحاضرات (${sessions.length})` : `المواعيد (${sessions.length})` },
    { key: "analytics", label: "تحليلات واتخاذ القرار 📊💡" },
    { key: "form", label: `أسئلة التسجيل (${activity.formFields.length})` },
    { key: "runs", label: isCourse ? `الدفعات (${runs.length})` : `التنفيذات (${runs.length})` },
    { key: "data", label: "بيانات النشاط" },
  ];
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as string) : "sessions";

  const initialFields: FormFieldInput[] = activity.formFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    options: f.options ? (JSON.parse(f.options) as string[]) : [],
    required: f.required,
    order: f.order,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {activity.image && (
            <div className="hidden sm:block shrink-0">
              <ImageWithPreview
                src={activity.image}
                alt={activity.title}
                title={`صورة النشاط: ${activity.title}`}
                className="group relative w-36 aspect-video overflow-hidden rounded-2xl border border-white/10 cursor-pointer shadow-lg bg-black/40"
                imgClassName="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href="/admin/activities" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-gold-light">
              ← كل الأنشطة
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">{ACTIVITY_TYPE_ICONS[activity.type]}</span>
              <h1 className="text-2xl font-extrabold text-zinc-50">{activity.title}</h1>
            <Link href={`/activities/${activity.id}`} target="_blank"
              className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1 text-[10px] font-extrabold text-gold-light hover:bg-gold/[0.12]">
              عرض صفحة الطلاب ↗
            </Link>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{ACTIVITY_TYPE_LABELS[activity.type]}{activity.program ? ` · ${activity.program.icon} ${activity.program.name}` : " · مستقل"}</span>
            <span>{sessions.length} {isCourse ? "محاضرات" : "مواعيد"}</span>
            <span className={openCount > 0 ? "text-emerald-400/80" : "text-zinc-500"}>
              {openCount > 0 ? `${openCount} مفتوحة للتسجيل` : "لا يوجد تسجيل مفتوح"}
            </span>
            <span>{totalRegistered} تسجيلًا إجمالًا</span>
          </p>
        </div>
      </div>
      <DeleteActivityButton activityId={activity.id} activityTitle={activity.title} />
    </div>

      {/* التابات */}
      <nav className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/activities/${activity.id}?tab=${t.key}`}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`inline-flex h-10 items-center rounded-xl px-4 text-xs font-extrabold transition-colors ${
              activeTab === t.key
                ? "border border-gold/40 bg-gold/[0.12] text-gold-light"
                : "border border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* المحتوى */}
      {activeTab === "runs" && (
        <RunManager
          activityId={activity.id}
          runs={runs}
          unlinkedSessions={unlinkedSessions}
          activityWord={runWord}
          canManage={canManage}
        />
      )}

      {activeTab === "sessions" && (
        canManage ? (
          <SessionManager
            activityId={activity.id}
            activityType={activity.type}
            activityTitle={activity.title}
            sessions={sessions}
            canManage={canManage}
            defaultLocation={sessions[0]?.location ?? ""}
          />
        ) : (
          <p className="rounded-2xl border border-white/[0.07] bg-surface p-6 text-center text-sm text-zinc-500">صلاحية العرض فقط</p>
        )
      )}

      {activeTab === "analytics" && (
        <ActivityDecisionAnalytics
          activity={{
            id: activity.id,
            title: activity.title,
            type: activity.type,
            sessions: activity.sessions.map((s) => ({
              id: s.id,
              title: s.title,
              startsAt: s.startsAt.toISOString(),
              seats: s.seats,
              registrations: s.registrations,
              attendance: s.attendance,
            })),
          }}
        />
      )}

      {activeTab === "form" && (
        canManage ? (
          <div className="space-y-4">
            <p className="rounded-2xl border border-gold/15 bg-gold/[0.03] px-4 py-3 text-xs leading-6 text-zinc-400">
              أسئلة التسجيل على مستوى النشاط — تُسأل للطالب مرة واحدة عند أول تسجيل (نظام «اسأل مرة واحدة»).
              مثال: «هل حضرت ورشًا سابقًا معنا؟» أو «من أي قسم بكلية التجارة؟»
            </p>
            <FormBuilder activityId={activity.id} initial={initialFields} />
          </div>
        ) : (
          <p className="rounded-2xl border border-white/[0.07] bg-surface p-6 text-center text-sm text-zinc-500">صلاحية العرض فقط</p>
        )
      )}

      {activeTab === "data" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <h2 className="mb-3 text-base font-extrabold text-zinc-100">بيانات النشاط</h2>
            <ActivityForm
              programs={programs}
              initial={{
                id: activity.id,
                type: activity.type,
                programId: activity.programId ?? "",
                title: activity.title,
                teaser: activity.teaser ?? "",
                description: activity.description,
                image: activity.image ?? "",
                presenter: activity.presenter ?? "",
                level: activity.level ?? "",
                publish: activity.publish,
              }}
            />
          </div>
          <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/[0.07] bg-surface p-5">
              <p className="text-sm font-extrabold text-zinc-100">كيف يعمل النظام الآن؟</p>
              <ul className="mt-3 space-y-2.5 text-xs leading-6 text-zinc-400">
                <li>• {isCourse ? "الكورس يضم محاضرات متعددة — كل محاضرة مثل ورشة مستقلة." : "الورشة لها موعد واحد — أعد تقديمها بموعد جديد وقتما شئت."}</li>
                <li>• لكل جلسة: مقاعد + موعد فتح/إغلاق تسجيل مستقل عن موعد الإقامة.</li>
                <li>• الطالب يشوف عدًّا تنازليًا (ساعات:دقائق:ثواني) حتى فتح أو إغلاق التسجيل.</li>
                <li>• التسجيل يجمع بيانات الطالب لتصديرها Excel وتقديم الكشف للنادي.</li>
                <li>• حضور كل جلسة بكود QR خاص بها من تاب «إدارة» بجانب كل جلسة.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
