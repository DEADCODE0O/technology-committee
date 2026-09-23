import { ScrollText, User as UserIcon, FolderKanban, Zap, Settings as SettingsIcon, Palette, GraduationCap, UserCog, ClipboardList, Undo2, Ban, ClipboardCheck, MessagesSquare, Trophy, Swords, Rocket, Search, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUndoableAction } from "@/lib/undo-registry";
import { UndoButton } from "@/components/admin/undo-button";
import { AuditExportDropdown } from "@/components/admin/audit-export-dropdown";

export const dynamic = "force-dynamic";

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  STUDENT: <UserIcon className="h-4 w-4" />,
  USER: <UserCog className="h-4 w-4" />,
  REGISTRATION: <UserCog className="h-4 w-4" />,
  WORKSHOP: <FolderKanban className="h-4 w-4" />,
  ACTIVITY: <FolderKanban className="h-4 w-4" />,
  RUN: <Rocket className="h-4 w-4" />,
  SESSION: <FolderKanban className="h-4 w-4" />,
  TASK: <ClipboardCheck className="h-4 w-4" />,
  SEASON: <Trophy className="h-4 w-4" />,
  QUEST: <Trophy className="h-4 w-4" />,
  REWARD: <Trophy className="h-4 w-4" />,
  TEAM: <Swords className="h-4 w-4" />,
  COMMUNITY_POST: <MessagesSquare className="h-4 w-4" />,
  POINT_EVENT: <Zap className="h-4 w-4" />,
  POINT_RULE: <Zap className="h-4 w-4" />,
  SETTING: <SettingsIcon className="h-4 w-4" />,
  TALENT: <Palette className="h-4 w-4" />,
  BADGE: <GraduationCap className="h-4 w-4" />,
  DATA_REQUEST: <ClipboardList className="h-4 w-4" />,
  AUDIT_LOG: <Undo2 className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  STUDENT_REGISTERED: "انضمام طالب",
  STUDENT_REGISTERED_GOOGLE: "انضمام عبر Google",
  PROFILE_COMPLETED: "إكمال بيانات",
  WORKSHOP_CREATED: "إنشاء ورشة",
  WORKSHOP_UPDATED: "تعديل ورشة",
  WORKSHOP_STATUS_CHANGED: "تغيير حالة ورشة",
  WORKSHOP_DELETED: "حذف مسودة ورشة",
  ACTIVITY_CREATED: "إنشاء نشاط",
  ACTIVITY_UPDATED: "تعديل نشاط",
  ACTIVITY_DELETED: "حذف نشاط",
  RUN_CREATED: "إنشاء تنفيذ",
  RUN_UPDATED: "تعديل تنفيذ",
  RUN_DELETED: "حذف تنفيذ",
  SESSION_RUN_SET: "ربط جلسة بتنفيذ",
  SESSION_SAVED: "حفظ جلسة",
  SESSION_DELETED: "حذف جلسة",
  TASK_CREATED: "إنشاء مهمة",
  TASK_UPDATED: "تعديل مهمة",
  TASK_PUBLISHED: "نشر مهمة",
  TASK_CLOSED: "إغلاق مهمة",
  TASK_SUBMITTED: "تسليم مهمة",
  TASK_EVALUATED: "تقييم تسليم",
  TASK_RETURNED: "إعادة تسليم",
  TASK_DELETED: "حذف مهمة",
  SURVEY_CREATED: "إنشاء استبيان",
  SURVEY_UPDATED: "تعديل استبيان",
  SURVEY_VOTED: "تصويت في استبيان",
  SURVEY_STATUS_UPDATED: "تغيير حالة استبيان",
  SURVEY_PIN_TOGGLED: "تثبيت/إلغاء استبيان",
  STUDENT_POST_CREATED: "منشور طالب جديد",
  STUDENT_POST_DELETED: "حذف منشور طالب",
  POST_ENDORSED: "إشادة تقنية بمنشور",
  POST_ENDORSEMENT_REMOVED: "إلغاء إشادة تقنية",
  SEASON_CREATED: "إنشاء موسم",
  SEASON_UPDATED: "تعديل موسم",
  SEASON_ENDED: "إنهاء موسم",
  QUEST_CREATED: "إنشاء إنجاز",
  QUEST_UPDATED: "تعديل إنجاز",
  QUEST_DELETED: "حذف إنجاز",
  REWARD_CREATED: "إنشاء مكافأة",
  REWARD_UPDATED: "تعديل مكافأة",
  REWARD_GRANTED: "منح مكافأة",
  REWARD_REVOKED: "سحب مكافأة",
  STUDENT_FEATURED: "تمييز طالب",
  STUDENT_UNFEATURED: "إلغاء تمييز",
  TEAM_CREATED: "إنشاء فريق",
  TEAM_UPDATED: "تعديل فريق",
  TEAM_DELETED: "حذف فريق",
  TEAM_MEMBER_SET: "تعيين عضو فريق",
  TEAM_MEMBER_REMOVED: "إزالة عضو",
  TEAM_POINTS_ADDED: "نقاط فريق",
  TEAM_ACHIEVEMENT_ADDED: "إنجاز فريق",
  COMMUNITY_POST_CREATED: "منشور جديد",
  COMMUNITY_POST_UPDATED: "تعديل منشور",
  COMMUNITY_POST_STATE: "تغيير حالة منشور",
  COMMUNITY_POST_PIN_TOGGLED: "تثبيت/إلغاء منشور",
  COMMUNITY_POST_DELETED: "حذف منشور",
  COMMENT_APPROVED: "اعتماد تعليق",
  COMMENT_HIDED: "إخفاء تعليق",
  COMMENT_DELETED: "حذف تعليق",
  FORM_FIELDS_SAVED: "حفظ أسئلة التسجيل",
  WORKSHOP_REGISTERED: "تسجيل في ورشة",
  WAITLIST_JOINED: "انضمام لقائمة انتظار",
  WAITLIST_PROMOTED: "ترقية من الانتظار",
  ADMIN_PROMOTED_REGISTRATION: "ترقية من الانتظار (إدارة)",
  REGISTRATION_CANCELLED: "إلغاء تسجيل",
  ADMIN_CANCELLED_REGISTRATION: "إلغاء تسجيل (إدارة)",
  MANUAL_REGISTRATION: "تسجيل يدوي",
  ATTENDANCE_SET: "تحديد حضور",
  ATTENDANCE_ALL_PRESENT: "حضور الجميع",
  QR_CHECKIN: "حضور عبر QR الذكي",
  EXCEL_EXPORTED: "تصدير Excel",
  POINT_RULE_SAVED: "حفظ قاعدة نقاط",
  POINT_RULE_TOGGLED: "تبديل قاعدة نقاط",
  POINTS_ADDED: "إضافة/خصم نقاط",
  POINTS_REVERSED: "عكس نقاط",
  POINTS_BULK: "نقاط جماعية",
  POINT_EVENT_DELETED: "حذف حدث نقاط",
  BADGE_SAVED: "حفظ شارة",
  BADGE_AWARDED: "منح شارة",
  BADGE_REVOKED: "سحب شارة",
  TALENT_STATUS: "حالة موهبة",
  TALENT_FEATURED: "تمييز موهبة",
  TALENT_ADDED: "إضافة موهبة",
  STUDENT_STATUS: "حالة طالب",
  STUDENT_UPDATED: "تعديل بيانات طالب",
  STUDENT_CODE_SUBMITTED: "تسليم كود الطالب",
  PASSWORD_RESET: "إعادة تعيين كلمة سر",
  PASSWORD_CHANGED: "تغيير كلمة سر",
  SETTINGS_SAVED: "حفظ إعدادات",
  STAFF_ROLE_SET: "تعيين/تعديل مشرف",
  STAFF_DEMOTED: "تنزيل مشرف إلى طالب",
  STAFF_STATUS_TOGGLED: "تنشيط/تعليق حساب مشرف",
  STAFF_PASSWORD_RESET: "إعادة تعيين كلمة سر مشرف",
  DATA_REQUEST_CREATED: "إنشاء استبيان/طلب بيانات",
  DATA_REQUEST_STATUS: "حالة استبيان/طلب",
  DATA_REQUEST_DELETED: "حذف استبيان/طلب",
  DATA_RESPONSE_SUBMITTED: "إجابة طالب على استبيان",
  NOTIFICATION_CREATED: "إرسال إشعار",
  NOTIFICATION_UPDATED: "تعديل إشعار",
  NOTIFICATION_DELETED: "حذف إشعار",
  ACTION_UNDONE: "تراجع عن عملية",
};

const FILTER_ENTITIES = ["", "DATA_REQUEST", "STUDENT", "ACTIVITY", "RUN", "SESSION", "TASK", "COMMUNITY_POST", "TEAM", "SEASON", "POINT_EVENT", "TALENT", "NOTIFICATION", "SETTING", "REGISTRATION"];

type Filters = {
  q?: string; actor?: string; action?: string; entity?: string; entityId?: string;
  from?: string; to?: string; success?: string; page?: string;
};

function buildWhere(f: Filters) {
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (f.q?.trim()) {
    and.push({
      OR: [
        { summary: { contains: f.q.trim() } },
        { action: { contains: f.q.trim().toUpperCase() } },
        { actorEmail: { contains: f.q.trim() } },
        { reason: { contains: f.q.trim() } },
      ],
    });
  }
  if (f.actor?.trim()) and.push({ actorEmail: { contains: f.actor.trim() } });
  if (f.action?.trim()) and.push({ action: { contains: f.action.trim().toUpperCase() } });
  if (f.entity) and.push({ entity: f.entity });
  if (f.entityId?.trim()) and.push({ entityId: f.entityId.trim() });
  if (f.from) and.push({ createdAt: { gte: new Date(f.from) } });
  if (f.to) and.push({ createdAt: { lte: new Date(`${f.to}T23:59:59`) } });
  if (f.success === "0") and.push({ success: false });
  if (f.success === "1") and.push({ success: true });

  if (and.length === 1) Object.assign(where, and[0]);
  else if (and.length > 1) where.AND = and;
  return where;
}

function parseJsonSafe(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const admin = await requireAdmin();
  const canUndo = admin.role === "SUPER_ADMIN" || admin.role === "ADMIN";

  const f = await searchParams;
  const page = Math.max(1, Number(f.page ?? 1) || 1);
  const PAGE_SIZE = 30;
  const where = buildWhere(f);

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const undoneIds = new Set(
    (
      await db.auditLog.findMany({
        where: { action: "ACTION_UNDONE", entityId: { in: logs.map((l) => l.id) } },
        select: { entityId: true },
      })
    ).map((u) => u.entityId ?? "")
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // رابط يحافظ على الفلاتر
  const keep = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && k !== "page") params.set(k, String(v));
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  };

  const hasFilters = !!(f.q || f.actor || f.action || f.entity || f.entityId || f.from || f.to || f.success);

  const currentLogsForExport = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    actorEmail: l.actorEmail,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    success: l.success,
    summary: l.summary,
  }));

  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v && k !== "page") queryParams.set(k, String(v));
  }
  const queryString = queryParams.toString();

  const CATEGORIES = [
    { label: "الكل", entity: "" },
    { label: "الاستبيانات", entity: "DATA_REQUEST" },
    { label: "ورش العمل والأنشطة", entity: "ACTIVITY" },
    { label: "المهام والتقييمات", entity: "TASK" },
    { label: "المجتمع والمنشورات", entity: "COMMUNITY_POST" },
    { label: "النقاط والمكافآت", entity: "POINT_EVENT" },
    { label: "الحضور والغياب", entity: "REGISTRATION" },
    { label: "المشرفون والحوكمة", entity: "USER" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-foreground">
            <ScrollText className="h-6 w-6 text-gold" />
            مركز التدقيق
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مين عمل إيه، إمتى، وعلى مين — {total.toLocaleString("ar-EG")} عملية مطابقة
            {hasFilters ? " لفلاترك" : " مسجلة"}
          </p>
        </div>
        <AuditExportDropdown currentLogs={currentLogsForExport} queryString={queryString} />
      </div>

      {/* ── أزرار التصنيفات السريعة ── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        {CATEGORIES.map((cat) => {
          const isActive = (f.entity ?? "") === cat.entity;
          return (
            <a
              key={cat.label}
              href={keep({ entity: cat.entity, page: "1" })}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-gold text-night shadow-sm font-extrabold"
                  : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </a>
          );
        })}
      </div>

      {/* ── الفلاتر ── */}
      <form method="GET" className="grid gap-3 rounded-3xl border border-white/[0.08] bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="فلاتر التدقيق">
        <div className="space-y-1">
          <label htmlFor="f-q" className="text-[11px] font-extrabold text-zinc-400">بحث نصي</label>
          <input id="f-q" name="q" defaultValue={f.q ?? ""} placeholder="ملخص · سبب · إجراء..." className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="f-actor" className="text-[11px] font-extrabold text-zinc-400">المنفّذ (بريد)</label>
          <input id="f-actor" name="actor" dir="ltr" defaultValue={f.actor ?? ""} placeholder="admin@..." className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-start text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="f-action" className="text-[11px] font-extrabold text-zinc-400">الإجراء</label>
          <input id="f-action" name="action" dir="ltr" defaultValue={f.action ?? ""} placeholder="TASK_PUBLISHED" className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-start text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="f-entity" className="text-[11px] font-extrabold text-zinc-400">الكيان</label>
          <select id="f-entity" name="entity" defaultValue={f.entity ?? ""} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-sm">
            {FILTER_ENTITIES.map((e) => (
              <option key={e} value={e}>{e === "" ? "— الكل —" : e}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="f-entityId" className="text-[11px] font-extrabold text-zinc-400">معرّف الكيان</label>
          <input id="f-entityId" name="entityId" dir="ltr" defaultValue={f.entityId ?? ""} placeholder="cuid..." className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-start text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label htmlFor="f-from" className="text-[11px] font-extrabold text-zinc-400">من تاريخ</label>
            <input id="f-from" name="from" type="date" dir="ltr" defaultValue={f.from ?? ""} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-start text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="f-to" className="text-[11px] font-extrabold text-zinc-400">إلى تاريخ</label>
            <input id="f-to" name="to" type="date" dir="ltr" defaultValue={f.to ?? ""} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-start text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="f-success" className="text-[11px] font-extrabold text-zinc-400">الحالة</label>
          <select id="f-success" name="success" defaultValue={f.success ?? ""} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-sm">
            <option value="">— الكل —</option>
            <option value="1">ناجحة</option>
            <option value="0">فاشلة</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold text-xs font-extrabold text-night hover:bg-gold-light">
            <Search className="h-3.5 w-3.5" /> تصفية
          </button>
          {hasFilters && (
            <a href="/admin/audit" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-zinc-400 hover:border-red-400/30 hover:text-red-300">
              <X className="h-3.5 w-3.5" /> مسح
            </a>
          )}
        </div>
      </form>

      {logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-6 py-16 text-center">
          <p className="text-lg font-bold text-zinc-300">{hasFilters ? "لا نتائج مطابقة للفلاتر" : "السجل فاضي"}</p>
          {hasFilters && <p className="mt-2 text-sm text-zinc-500">جرب تخفيف الفلاتر أو مسحها</p>}
        </div>
      ) : (
        <ol className="relative space-y-3 border-s border-white/[0.08] ps-5">
          {logs.map((log) => {
            const undoable = isUndoableAction(log.action);
            const undone = undoneIds.has(log.id);
            const isUndoEntry = log.action === "ACTION_UNDONE";
            const before = parseJsonSafe(log.before);
            const after = parseJsonSafe(log.after);
            const details = parseJsonSafe(log.details);
            const hasDetails = !!(before || after || details || log.reason || log.correlationId);
            return (
              <li key={log.id} className="relative">
                <span className={`absolute -start-[26px] top-4 flex h-5 w-5 items-center justify-center rounded-full border bg-night ${
                  isUndoEntry ? "border-sky-400/40 text-sky-300" : !log.success ? "border-red-400/40 text-red-300" : "border-gold/30 text-gold/80"
                }`}>
                  {ENTITY_ICONS[log.entity] ?? <ScrollText className="h-3 w-3" />}
                </span>
                <div className={`rounded-2xl border px-4 py-3 ${
                  isUndoEntry
                    ? "border-sky-400/20 bg-sky-400/[0.04]"
                    : !log.success
                      ? "border-red-400/25 bg-red-500/[0.04]"
                      : undone
                        ? "border-white/[0.04] bg-white/[0.01] opacity-70"
                        : "border-white/[0.06] bg-surface"
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`min-w-0 flex-1 text-sm font-bold ${undone ? "text-zinc-500 line-through decoration-zinc-600" : "text-zinc-200"}`}>
                      {log.summary}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        isUndoEntry
                          ? "border-sky-400/30 bg-sky-400/[0.08] text-sky-300"
                          : !log.success
                            ? "border-red-400/30 bg-red-500/[0.06] text-red-300"
                            : "border-white/10 bg-white/[0.02] text-zinc-500"
                      }`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      {undone && (
                        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                          <Ban className="h-3 w-3" /> مُتراجع عنها
                        </span>
                      )}
                      {canUndo && undoable && !undone && <UndoButton auditId={log.id} summary={log.summary} />}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    <span dir="ltr">{log.actorEmail ?? "النظام"}</span>
                    {" · "}
                    {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(log.createdAt)}
                  </p>

                  {/* تفاصيل الحدث: قبل/بعد/السبب/الارتباط */}
                  {hasDetails && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-extrabold text-gold/70 hover:text-gold">تفاصيل الحدث ▾</summary>
                      <div className="mt-2 space-y-2 rounded-xl bg-black/30 p-3 text-[11px] leading-6 text-zinc-400">
                        {log.reason && <p><span className="font-extrabold text-zinc-300">السبب:</span> {log.reason}</p>}
                        {log.correlationId && <p dir="ltr"><span className="font-extrabold text-zinc-300">Correlation:</span> {log.correlationId}</p>}
                        {log.entityId && <p dir="ltr"><span className="font-extrabold text-zinc-300">Entity ID:</span> {log.entityId}</p>}
                        {before !== null && (
                          <div>
                            <p className="font-extrabold text-red-300/80">قبل:</p>
                            <pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-lg bg-white/[0.03] p-2 text-[10px] text-zinc-500">{JSON.stringify(before, null, 2)}</pre>
                          </div>
                        )}
                        {after !== null && (
                          <div>
                            <p className="font-extrabold text-emerald-300/80">بعد:</p>
                            <pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-lg bg-white/[0.03] p-2 text-[10px] text-zinc-500">{JSON.stringify(after, null, 2)}</pre>
                          </div>
                        )}
                        {details !== null && (
                          <div>
                            <p className="font-extrabold text-zinc-300">تفاصيل إضافية:</p>
                            <pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-lg bg-white/[0.03] p-2 text-[10px] text-zinc-500">{JSON.stringify(details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs">
          {page > 1 && (
            <a href={keep({ page: String(page - 1) })} className="rounded-xl border border-white/[0.1] px-4 py-2 font-bold text-zinc-300 hover:border-gold/30">
              الأحدث
            </a>
          )}
          <span className="rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-2 font-extrabold text-gold-light">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a href={keep({ page: String(page + 1) })} className="rounded-xl border border-white/[0.1] px-4 py-2 font-bold text-zinc-300 hover:border-gold/30">
              الأقدم
            </a>
          )}
        </div>
      )}
    </div>
  );
}
