import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { SessionManager, type AdminSession } from "@/components/admin/session-manager";
import { ParticipantsTable, type ParticipantRow } from "@/components/admin/participants-table";
import { GateAddForm, ManifestExportButton } from "@/components/admin/gate-add-form";
import { AttendanceBoard, type AttendanceRowData } from "@/components/admin/attendance-board";
import { getSessionState, decideRegistration, sessionDisplayName } from "@/lib/activities";
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_SESSION_WORD } from "@/lib/constants";
import { formatCairoDate } from "@/lib/dates";
import { SessionTeamsManager } from "@/components/admin/session-teams-manager";
import { WhatsAppIcon, TelegramIcon } from "@/components/platform/community-links-card";

export const dynamic = "force-dynamic";

export default async function AdminSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await requireAdmin();

  const session = await db.session.findUnique({
    where: { id },
    include: {
      activity: { include: { program: { select: { name: true, icon: true } } } },
      registrations: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: { attendance: true },
      },
    },
  });
  if (!session) notFound();

  const canManage = canUser(user, MODULES.WORKSHOPS, "manage");
  const canAttendance = canUser(user, MODULES.ATTENDANCE, "manage");
  const state = getSessionState(session);
  const activity = session.activity;
  const isCourse = activity.type === "COURSE";
  const sessionWord = ACTIVITY_TYPE_SESSION_WORD[activity.type] ?? "جلسة";
  const sessionLabel = sessionDisplayName(session, activity.type);
  const registeredCount = session.registrations.filter((r) => r.status === "REGISTERED").length;
  const decision = decideRegistration({
    session: {
      registrationOpensAt: session.registrationOpensAt,
      registrationClosesAt: session.registrationClosesAt,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      closingMode: session.closingMode,
      registrationOpen: session.registrationOpen,
    },
    registeredCount,
    seats: session.seats,
  });

  const teams = await db.team.findMany({
    where: { sessionId: session.id },
    include: {
      members: {
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const candidateStudents = session.registrations
    .filter((r) => r.status === "REGISTERED" && r.userId)
    .map((r) => {
      const attended = r.attendance.some((a) => a.sessionId === session.id && a.present);
      const teamMembership = teams.find((t) => t.members.some((m) => m.userId === r.userId));
      return {
        userId: r.userId!,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        gender: r.gender,
        grade: r.grade,
        section: r.section,
        attended,
        teamId: teamMembership?.id ?? null,
      };
    });

  const TABS = [
    { key: "details", label: "بيانات الجلسة" },
    { key: "participants", label: `المشاركون (${registeredCount}/${session.seats})` },
    { key: "attendance", label: "الحضور وQR" },
    { key: "teams", label: `فرق الورشة (${teams.length})` },
  ];
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as string) : "details";

  // بيانات تاب المشاركين
  const formFields = await db.formField.findMany({
    where: { activityId: activity.id },
    orderBy: { order: "asc" },
  });
  const participants: ParticipantRow[] = session.registrations.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    grade: r.grade,
    section: r.section,
    gender: r.gender,
    studentCode: r.studentCode,
    source: r.source,
    status: r.status,
    waitlistOrder: r.waitlistOrder,
    answers: r.answers
      ? (() => {
          try {
            const parsed = JSON.parse(r.answers) as Record<string, string | string[]>;
            return Object.entries(parsed).map(([fieldId, value]) => {
              const f = formFields.find((ff) => ff.id === fieldId);
              return { fieldId, label: f?.label ?? "سؤال", type: f?.type ?? "TEXT", value };
            });
          } catch {
            return null;
          }
        })()
      : null,
    attended: r.attendance.some((a) => a.present) ? true : r.attendance.length > 0 ? false : null,
  }));

  // بيانات تاب الحضور
  const attendanceRows: AttendanceRowData[] = session.registrations
    .filter((r) => r.status === "REGISTERED")
    .map((r) => {
      const att = r.attendance.find((a) => a.sessionId === session.id) ?? null;
      return {
        registrationId: r.id,
        fullName: r.fullName,
        grade: r.grade,
        source: r.source,
        present: att ? att.present : null,
        method: att?.method ?? null,
      };
    });

  const adminSession: AdminSession = {
    id: session.id,
    order: session.order,
    title: session.title,
    description: session.description,
    image: session.image,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt ? session.endsAt.toISOString() : null,
    location: session.location,
    presenter: session.presenter,
    onlineUrl: session.onlineUrl,
    onlineLabel: session.onlineLabel,
    materialUrl: session.materialUrl,
    materialLabel: session.materialLabel,
    whatsappUrl: session.whatsappUrl,
    telegramUrl: session.telegramUrl,
    status: session.status,
    qrToken: session.qrToken,
    seats: session.seats,
    registrationOpensAt: session.registrationOpensAt ? session.registrationOpensAt.toISOString() : null,
    registrationClosesAt: session.registrationClosesAt ? session.registrationClosesAt.toISOString() : null,
    closingMode: session.closingMode,
    registrationOpen: session.registrationOpen,
    allowGuests: session.allowGuests,
    allowAdminOverride: session.allowAdminOverride,
    registeredCount,
    presentCount: session.registrations.filter(
      (r) => r.status === "REGISTERED" && r.attendance.some((a) => a.sessionId === session.id && a.present)
    ).length,
    state,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* الرأس */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/activities/${activity.id}`} className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-gold-light">
            ← {activity.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl">{ACTIVITY_TYPE_ICONS[activity.type]}</span>
            <h1 className="text-2xl font-extrabold text-zinc-50">{sessionLabel}</h1>
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
              state === "ONGOING" ? "border border-gold/40 bg-gold/[0.12] text-gold-light"
              : state === "UPCOMING" ? "border border-white/10 bg-white/[0.03] text-zinc-400"
              : "border border-white/10 bg-white/[0.02] text-zinc-500"
            }`}>
              {state === "ONGOING" ? "جارية الآن" : state === "UPCOMING" ? "قادمة" : "منتهية"}
            </span>
            <Link href={`/sessions/${session.id}`} target="_blank"
              className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1 text-[10px] font-extrabold text-gold-light hover:bg-gold/[0.12]">
              صفحة الطلاب ↗
            </Link>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{formatCairoDate(session.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</span>
            {session.location && <span>📍 {session.location}</span>}
            <span>👥 {registeredCount}/{session.seats}</span>
            <span className={decision.open ? "text-emerald-400/80" : "text-amber-400/80"}>
              {decision.open ? "التسجيل مفتوح" : decision.message}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            التسجيل: {session.registrationOpensAt ? `يُفتح ${formatCairoDate(session.registrationOpensAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}` : "متاح"}
            {session.registrationClosesAt ? ` · يقفل ${formatCairoDate(session.registrationClosesAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}` : ""}
          </p>
        </div>
      </div>

      {/* بانر روابط جروبات التواصل للأدمن */}
      {(session.whatsappUrl || session.telegramUrl || activity.whatsappUrl || activity.telegramUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <WhatsAppIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">
                {session.whatsappUrl || session.telegramUrl
                  ? "مجموعة تواصل مخصصة لهذه الجلسة مفعّلة 💬"
                  : "مجموعة التواصل موروثة من الورشة العامة 💬"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                تظهر تلقائياً للطلاب المقبولين فقط في صفحة المحاضرة والورشة.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(session.whatsappUrl || activity.whatsappUrl) && (
              <a
                href={(session.whatsappUrl || activity.whatsappUrl)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                فتح جروب الواتساب ↗
              </a>
            )}
            {(session.telegramUrl || activity.telegramUrl) && (
              <a
                href={(session.telegramUrl || activity.telegramUrl)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 shadow-sm"
              >
                <TelegramIcon className="h-3.5 w-3.5" />
                فتح التليجرام ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* التابات */}
      <nav className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/sessions/${session.id}?tab=${t.key}`}
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
      {activeTab === "details" && (
        canManage ? (
          <SessionManager
            activityId={activity.id}
            activityType={activity.type}
            activityTitle={activity.title}
            sessions={[adminSession]}
            canManage={canManage}
            defaultLocation={session.location ?? ""}
          />
        ) : (
          <p className="rounded-2xl border border-white/[0.07] bg-surface p-6 text-center text-sm text-zinc-500">
            صلاحية العرض فقط — بيانات الجلسة تحتاج صلاحية الإدارة
          </p>
        )
      )}

      {activeTab === "participants" && canManage && (
        <div className="mb-4 space-y-4">
          <GateAddForm sessionId={session.id} />
        </div>
      )}

      {activeTab === "participants" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold text-zinc-500">كشف النادي = المشاركون الفعليون المرسلون للنادي قبل النشاط (بحالة الحضور النهائية)</p>
          <ManifestExportButton sessionId={session.id} activityTitle={`${activity.title} — ${session.title}`} />
        </div>
      )}

      {activeTab === "participants" && (
        <ParticipantsTable
          sessionId={session.id}
          participants={participants}
          canManage={canManage}
          hasFormFields={formFields.length > 0}
        />
      )}

      {activeTab === "attendance" && (
        <AttendanceBoard
          sessionId={session.id}
          sessionTitle={session.title}
          sessionToken={session.qrToken}
          sessionState={state}
          rows={attendanceRows}
          canManage={canAttendance}
        />
      )}

      {activeTab === "teams" && (
        <SessionTeamsManager
          sessionId={session.id}
          activityId={activity.id}
          sessionTitle={sessionLabel}
          activityTitle={activity.title}
          teams={teams.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            color: t.color,
            icon: t.icon,
            whatsappUrl: t.whatsappUrl,
            telegramUrl: t.telegramUrl,
            members: t.members.map((m) => ({
              userId: m.userId,
              role: m.role,
              user: {
                id: m.user.id,
                displayName: m.user.displayName,
                email: m.user.email,
                level: 1,
                avatarUrl: m.user.avatarUrl,
                avatarFrameId: m.user.avatarFrameId,
                profile: m.user.profile
                  ? {
                      fullName: m.user.profile.fullName,
                      phone: m.user.profile.phone,
                      gender: m.user.profile.gender,
                      grade: m.user.profile.grade,
                      section: m.user.profile.section,
                    }
                  : null,
              },
            })),
          }))}
          candidates={candidateStudents}
        />
      )}
    </div>
  );
}
