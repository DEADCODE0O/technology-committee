import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { SitePageShell } from "@/components/platform/site-page-shell";
import { StudentShell } from "@/components/student/student-shell";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";
import { getStudentBadges } from "@/lib/student-badges";
import { Countdown } from "@/components/platform/countdown";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_PLURAL, ACTIVITY_LEVEL_LABELS, ACTIVITY_TYPE_SESSION_WORD } from "@/lib/constants";
import { getSessionState, decideRegistration } from "@/lib/activities";
import { resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";

import { getCachedPublishedActivities, getCachedPrograms } from "@/lib/cache/data-cache";

export const dynamic = "force-dynamic";

type TypeFilter = "ALL" | "COURSE" | "WORKSHOP" | "EVENT";

type SessionLite = {
  id: string;
  title: string;
  image?: string | null;
  order: number;
  startsAt: Date;
  endsAt: Date | null;
  seats: number;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  closingMode: string;
  registrationOpen: boolean;
  status: string;
  registrations: { id: string }[];
};

type ActivityWithSessions = {
  id: string;
  title: string;
  teaser: string | null;
  image: string | null;
  type: string;
  level: string | null;
  createdAt: Date;
  program: { id: string; name: string; icon: string } | null;
  sessions: SessionLite[];
};

type Card = ActivityWithSessions & { focusSession: SessionLite | null };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "long" }).format(d);
}

// أكثر جلسة صلة بالعرض: جارية > أقرب قادمة > أحدث منتهية
function pickFocusSession(a: ActivityWithSessions, now: Date): SessionLite | null {
  const live = a.sessions.find((s) => s.status !== "CANCELLED" && getSessionState(s, now) === "ONGOING");
  if (live) return live;
  const upcoming = a.sessions
    .filter((s) => s.status !== "CANCELLED" && getSessionState(s, now) === "UPCOMING")
    .sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime())[0];
  if (upcoming) return upcoming;
  return a.sessions.filter((s) => s.status !== "CANCELLED").sort((x, y) => y.startsAt.getTime() - x.startsAt.getTime())[0] ?? null;
}

// تصنيف البطاقة من كل جلساتها
function classifyActivity(a: ActivityWithSessions, now: Date): "OPEN" | "UPCOMING" | "PAST" {
  const active = a.sessions.filter((s) => s.status !== "CANCELLED");
  if (active.length === 0) return "UPCOMING"; // نشاط بلا جلسات = قريبًا (تشويق)
  const hasOpen = active.some((s) => {
    const registered = s.registrations.length;
    return decideRegistration(
      {
        session: {
          registrationOpensAt: s.registrationOpensAt,
          registrationClosesAt: s.registrationClosesAt,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          closingMode: s.closingMode,
          registrationOpen: s.registrationOpen,
        },
        registeredCount: registered,
        seats: s.seats,
      },
      now
    ).open;
  });
  const hasFuture = active.some((s) => getSessionState(s, now) !== "COMPLETED");
  if (hasOpen) return "OPEN";
  if (hasFuture) return "UPCOMING";
  return "PAST";
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; program?: string }> | { type?: string; program?: string };
}) {
  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};
  const typeFilter: TypeFilter = (["COURSE", "WORKSHOP", "EVENT"] as const).includes(sp.type as "COURSE")
    ? (sp.type as TypeFilter)
    : "ALL";

  // الأنشطة المنشورة + جلساتها (المحاضرات/مواعيد الورش)
  let activities: any[] = [];
  let programs: any[] = [];

  try {
    const [allActivities, allPrograms] = await Promise.all([
      getCachedPublishedActivities(),
      getCachedPrograms(),
    ]);

    programs = allPrograms;
    activities = allActivities.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (sp.program && a.programId !== sp.program) return false;
      return true;
    });
  } catch (err) {
    console.error("ActivitiesPage data fetch error:", err);
  }

  // التجميع: التسجيل مفتوح الآن / قادم (تشويق) / من الأرشيف
  const now = new Date();
  const openNow: Card[] = [];
  const upcoming: Card[] = [];
  const past: Card[] = [];

  for (const a of activities as ActivityWithSessions[]) {
    const card: Card = { ...a, focusSession: pickFocusSession(a, now) };
    const cls = classifyActivity(a, now);
    if (cls === "OPEN") openNow.push(card);
    else if (cls === "UPCOMING") upcoming.push(card);
    else past.push(card);
  }
  upcoming.sort((x, y) => (x.focusSession?.startsAt.getTime() ?? Infinity) - (y.focusSession?.startsAt.getTime() ?? Infinity));
  openNow.sort((x, y) => (x.focusSession?.startsAt.getTime() ?? Infinity) - (y.focusSession?.startsAt.getTime() ?? Infinity));

  const TABS: { key: TypeFilter; label: string }[] = [
    { key: "ALL", label: "الكل" },
    ...ACTIVITY_TYPES.map((t) => ({ key: t.value as TypeFilter, label: t.plural })),
  ];

  const qs = (t: TypeFilter, program?: string) => {
    const params = new URLSearchParams();
    if (t !== "ALL") params.set("type", t);
    if (program) params.set("program", program);
    const s = params.toString();
    return s ? `/activities?${s}` : "/activities";
  };

  const user = await getCurrentUser();
  const isStudent = !!user && user.role === "STUDENT";

  let shellUser: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level?: number;
  } = { name: "", email: "" };
  let unreadCount = 0;
  let unreadMessagesCount = 0;
  let openTaskCount = 0;
  let pendingCount = 0;
  if (isStudent && user) {
    const [progress, badges] = await Promise.all([
      getStudentProgress(user.id),
      getStudentBadges(user),
    ]);
    shellUser = {
      name: user.profile?.fullName ?? user.email,
      email: user.email,
      avatarUrl: user.avatarUrl,
      avatarFrameId: user.avatarFrameId,
      level: progress.level,
    };
    unreadCount = badges.unreadCount;
    unreadMessagesCount = badges.unreadMessagesCount;
    openTaskCount = badges.openTaskCount;
    pendingCount = badges.pendingCount;
  }

  const activitiesContent = (
    <>
      {/* ── البرامج ── */}
      <section aria-label="البرامج">
        <h2 className="mb-3 text-base font-extrabold text-gold-deep dark:text-gold-light">البرامج</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Link href={qs(typeFilter)}
            className={`flex items-center gap-2.5 rounded-2xl border p-3.5 transition-colors ${
              !sp.program ? "border-gold/40 bg-gold/[0.10]" : "border-border bg-card hover:border-gold/30 shadow-xs"
            }`}>
            <span className="text-xl leading-none">✨</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-foreground">كل البرامج</p>
              <p className="text-[10px] text-muted-foreground">{activities.length} نشاطًا</p>
            </div>
          </Link>
          {programs.map((p) => (
            <Link key={p.id} href={qs(typeFilter, p.id)}
              className={`flex items-center gap-2.5 rounded-2xl border p-3.5 transition-colors ${
                sp.program === p.id ? "border-gold/40 bg-gold/[0.10]" : "border-border bg-card hover:border-gold/30 shadow-xs"
              }`}>
              <span className="text-xl leading-none">{p.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p._count.activities} نشاطًا</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── فلاتر النوع ── */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="نوع النشاط">
        {TABS.map((t) => (
          <Link key={t.key} href={qs(t.key, sp.program)} role="tab" aria-selected={typeFilter === t.key}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold transition-colors ${
              typeFilter === t.key
                ? "border border-gold/45 bg-gold/[0.14] text-gold-deep dark:text-gold-light"
                : "border border-border bg-card text-muted-foreground hover:border-gold/35 hover:text-gold-deep dark:hover:text-zinc-200"
            }`}>
            {t.key !== "ALL" && ACTIVITY_TYPE_ICONS[t.key]} {t.label}
          </Link>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-10 text-center shadow-xs">
          <p className="text-3xl">🗂️</p>
          <p className="mt-3 text-sm font-extrabold text-foreground">لا توجد أنشطة في هذا التصنيف حاليًا</p>
          <p className="mt-1 text-xs text-muted-foreground">تابعنا — أنشطة جديدة تُفتح باستمرار خلال العام</p>
        </div>
      )}

      {/* ── التسجيل مفتوح الآن ── */}
      {openNow.length > 0 && (
        <section className="mt-8" aria-label="التسجيل مفتوح الآن">
          <h2 className="mb-3 text-base font-extrabold text-emerald-700 dark:text-emerald-400">🔥 التسجيل مفتوح الآن — لا تفوّتها</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openNow.map((a) => <ActivityCard key={a.id} a={a} state="OPEN" now={now} />)}
          </div>
        </section>
      )}

      {/* ── قادم ── */}
      {upcoming.length > 0 && (
        <section className="mt-8" aria-label="أنشطة قادمة">
          <h2 className="mb-3 text-base font-extrabold text-gold-deep dark:text-gold-light">⏳ قادم قريبًا</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((a) => <ActivityCard key={a.id} a={a} state="UPCOMING" now={now} />)}
          </div>
        </section>
      )}

      {/* ── الأرشيف ── */}
      {past.length > 0 && (
        <section className="mt-8" aria-label="أنشطة منتهية">
          <h2 className="mb-3 text-base font-extrabold text-foreground">📚 من الأرشيف — فاتتك؟</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((a) => <ActivityCard key={a.id} a={a} state="PAST" now={now} />)}
          </div>
        </section>
      )}
    </>
  );

  if (isStudent) {
    return (
      <StudentShell
        user={shellUser}
        active="activities"
        unreadCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
        openTaskCount={openTaskCount}
        pendingCount={pendingCount}
      >
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            <span className="text-gold-gradient">اكتشف الأنشطة والبرامج</span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground font-medium">
            تصفح الكورسات وورش العمل والفعاليات المتاحة وسجّل مقعدك فورًا.
          </p>
        </div>
        {activitiesContent}
      </StudentShell>
    );
  }

  return (
    <SitePageShell title="الأنشطة والبرامج">
      {activitiesContent}
    </SitePageShell>
  );
}

function ActivityCard({ a, state, now }: { a: Card; state: "OPEN" | "UPCOMING" | "PAST"; now: Date }) {
  const s = a.focusSession;
  const registered = s?.registrations.length ?? 0;
  const seats = s?.seats ?? 0;
  const seatsLeft = Math.max(0, seats - registered);
  const occupancy = seats > 0 ? Math.min(1, registered / seats) : 0;
  const isAlmostFull = seats > 0 && (seatsLeft <= 5 || occupancy >= 0.85);
  const isFull = seats > 0 && seatsLeft === 0;
  const sessionWord = ACTIVITY_TYPE_SESSION_WORD[a.type] ?? "جلسة";
  // صورة المحاضرة أو النشاط: إن وُجدت صورة مخصصة للجلسة الحالية نعرضها، وإلا صورة النشاط
  const effectiveImage = (s && s.image) ? s.image : a.image;
  const imgSrc = resolveImageSrc(effectiveImage);
  const useNextImage = !!effectiveImage && effectiveImage.startsWith("/");
  const isTeaser = state === "UPCOMING" && !!a.teaser;

  // العدّ التنازلي المعروض على البطاقة — مربوط بجدول المواعيد الفعلي
  let countdown: { to: string; prefix: string; tone: "success" | "urgent" | "gold" } | null = null;
  if (s && state === "OPEN") {
    const targetDate = (s.registrationClosesAt && s.registrationClosesAt > now) ? s.registrationClosesAt : (s.startsAt > now ? s.startsAt : null);
    if (targetDate) {
      const hoursLeft = (targetDate.getTime() - now.getTime()) / (3600 * 1000);
      countdown = {
        to: targetDate.toISOString(),
        prefix: (s.registrationClosesAt && s.registrationClosesAt > now) ? "يقفل بعد" : "تبدأ بعد",
        tone: hoursLeft < 24 ? "urgent" : "success",
      };
    }
  } else if (s && state === "UPCOMING") {
    const openable = a.sessions.find((x) =>
      x.registrationOpensAt && x.registrationOpensAt > now && x.registrationClosesAt && x.registrationClosesAt > now
    ) ?? s;
    if (openable.registrationOpensAt && openable.registrationOpensAt > now) {
      countdown = { to: openable.registrationOpensAt.toISOString(), prefix: "يُفتح بعد", tone: "gold" };
    } else if (openable.registrationClosesAt && openable.registrationClosesAt > now) {
      countdown = { to: openable.registrationClosesAt.toISOString(), prefix: "يقفل بعد", tone: "success" };
    } else if (s.startsAt > now) {
      countdown = { to: s.startsAt.toISOString(), prefix: "تبدأ بعد", tone: "gold" };
    }
  }

  return (
    <Link href={`/activities/${a.id}`}
      className={`group overflow-hidden rounded-3xl border transition-all hover:-translate-y-1 ${
        state === "OPEN"
          ? isAlmostFull
            ? "border-rose-500/30 bg-card hover:border-rose-500/50 hover:shadow-[0_20px_50px_-20px_rgba(244,63,94,0.3)]"
            : "border-emerald-500/25 bg-card hover:border-emerald-500/45 hover:shadow-[0_20px_50px_-20px_rgba(16,185,129,0.25)]"
          : "border-border bg-card hover:border-gold/30 hover:shadow-[0_20px_50px_-20px_rgba(201,164,92,0.25)]"
      }`}>
      <div className="relative aspect-[16/9] overflow-hidden">
        {useNextImage ? (
          <Image src={a.image!} alt={a.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${state === "PAST" ? "grayscale-[0.4] opacity-75" : ""}`} />
        ) : imgSrc ? (
          <SmartImg src={imgSrc} alt={a.title}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${state === "PAST" ? "grayscale-[0.4] opacity-75" : ""}`} />
        ) : (
          <Image src="/images/hero-bg.webp" alt={a.title} fill sizes="(max-width: 640px) 100vw, 33vw"
            className={`object-cover ${state === "PAST" ? "grayscale-[0.4] opacity-75" : ""}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* الشارات العلوية: النوع والبرنامج */}
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5 z-10">
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-extrabold text-gold-light backdrop-blur border border-white/10">
            {ACTIVITY_TYPE_ICONS[a.type]} {ACTIVITY_TYPE_LABELS[a.type]}
          </span>
          {a.program && (
            <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-zinc-200 backdrop-blur border border-white/10">
              {a.program.icon} {a.program.name}
            </span>
          )}
        </div>

        {/* شارة الحالة التسويقية (أخضر مفتوح / أحمر عاجل ينتهي أو المقاعد قليلة) */}
        <div className="absolute end-3 top-3 z-10">
          {state === "OPEN" ? (
            isFull ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/80 px-3 py-1 text-[11px] font-black text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                مكتمل — انتظار
              </span>
            ) : isAlmostFull ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-950/90 px-3 py-1 text-[11px] font-black text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)] backdrop-blur animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                🔥 باقي {seatsLeft} مقاعد فقط!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/90 px-3 py-1 text-[11px] font-black text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                التسجيل مفتوح الآن
              </span>
            )
          ) : state === "UPCOMING" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/[0.15] px-2.5 py-1 text-[10px] font-bold text-gold-light backdrop-blur">
              ⏳ قريباً
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-zinc-200 backdrop-blur">
              انتهى
            </span>
          )}
        </div>

        <div className="absolute bottom-3 start-3 end-3">
          <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2">
            {isTeaser ? a.teaser : a.title}
          </h3>
        </div>
      </div>

      <div className="p-4">
        {s ? (
          state === "PAST" ? (
            <p className="text-xs text-muted-foreground">
              أُقيمت {fmtDate(s.startsAt)} · {registered} مشاركًا{a.sessions.length > 1 ? ` · ${a.sessions.length} ${a.type === "COURSE" ? "محاضرات" : "مواعيد"}` : ""}
            </p>
          ) : (
            <div className="space-y-2.5">
              {/* العد التنازلي التسويقي الملفت */}
              {countdown ? (
                <div className="pt-0.5">
                  <Countdown to={countdown.to} prefix={countdown.prefix} tone={countdown.tone} variant="pill" className="w-full justify-center" />
                </div>
              ) : isTeaser ? (
                <p className="text-xs font-bold text-gold-deep dark:text-gold-light">التفاصيل قريبًا — تابعنا 👀</p>
              ) : null}

              {/* شريط المقاعد والنسبة بالألوان (أخضر / أحمر عند الاقتراب) */}
              {seats > 0 && state === "OPEN" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-black ${isAlmostFull ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {isFull ? "اكتملت المقاعد" : isAlmostFull ? `⚡ فرصة أخيرة: متبقي ${seatsLeft} مقعد` : `🟢 متوفر ${seatsLeft} مقعد`}
                    </span>
                    <span className="text-muted-foreground font-bold">{registered} / {seats}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAlmostFull
                          ? "bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                          : occupancy >= 0.5
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400"
                      }`}
                      style={{ width: `${Math.round(occupancy * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                {a.type === "COURSE" && a.sessions.length > 1
                  ? `${a.sessions.length} محاضرات · `
                  : a.sessions.length > 1 ? `${a.sessions.length} مواعيد · ` : ""}
                يبدأ {fmtDate(s.startsAt)}
              </p>
            </div>
          )
        ) : (
          <p className="text-xs text-muted-foreground">لم تُعلن {sessionWord} بعد — تابعنا</p>
        )}
      </div>
    </Link>
  );
}
