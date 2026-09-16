import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SitePageShell } from "@/components/platform/site-page-shell";
import { StudentShell } from "@/components/student/student-shell";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";
import { getStudentNotifications } from "@/lib/notifications";
import { Countdown } from "@/components/platform/countdown";
import {
  ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS, ACTIVITY_LEVEL_LABELS, ACTIVITY_TYPE_SESSION_WORD,
} from "@/lib/constants";
import { getSessionState, decideRegistration, sessionDisplayName } from "@/lib/activities";
import { resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";
import { ChevronRight, MapPin, Users, CalendarDays, Clock } from "lucide-react";
import { formatCairoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return formatCairoDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(d: Date) {
  return formatCairoDate(d, { hour: "numeric", minute: "2-digit", hour12: true });
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      program: true,
      sessions: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { startsAt: "asc" },
        include: { registrations: { where: { status: "REGISTERED" }, select: { id: true } } },
      },
    },
  });

  if (!activity || activity.publish === "DRAFT" || activity.publish === "ARCHIVED") notFound();

  const typeWord = ACTIVITY_TYPE_LABELS[activity.type] ?? "نشاط";
  const sessionWord = ACTIVITY_TYPE_SESSION_WORD[activity.type] ?? "جلسة";
  const now = new Date();

  // كل جلسة بحالتها وقرار تسجيلها
  const sessions = activity.sessions.map((s) => {
    const state = getSessionState(s, now);
    const registered = s.registrations.length;
    const decision = decideRegistration({
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
    });
    return { ...s, state, registered, decision, label: sessionDisplayName(s, activity.type) };
  });
  const live = sessions.filter((s) => s.state === "ONGOING");
  const upcoming = sessions.filter((s) => s.state === "UPCOMING");
  const past = sessions.filter((s) => s.state === "COMPLETED");

  const imgSrc = resolveImageSrc(activity.image);
  const useNextImage = !!activity.image && activity.image.startsWith("/");
  const totalSeats = sessions.reduce((sum, s) => sum + s.seats, 0);
  const totalRegistered = sessions.reduce((sum, s) => sum + s.registered, 0);

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
  if (isStudent && user) {
    const [progress, notifs] = await Promise.all([
      getStudentProgress(user.id),
      getStudentNotifications(user),
    ]);
    shellUser = {
      name: user.profile?.fullName ?? user.email,
      email: user.email,
      avatarUrl: user.avatarUrl,
      avatarFrameId: user.avatarFrameId,
      level: progress.level,
    };
    unreadCount = notifs.unreadCount;
  }

  const detailContent = (
    <>
      {/* مسار التنقل */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-500" aria-label="مسار التنقل">
        <Link href="/activities" className="hover:text-gold-deep dark:hover:text-gold-light">الأنشطة</Link>
        <ChevronRight className="h-3 w-3" />
        {activity.program && (
          <>
            <Link href={`/activities?program=${activity.program.id}`} className="hover:text-gold-deep dark:hover:text-gold-light">
              {activity.program.icon} {activity.program.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="font-bold text-gold-deep dark:text-gold-light">{activity.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0">
          {/* الصورة — المرفوعة أو من الرابط (درايف/خارجي) عبر المحوّل */}
          <div className="relative aspect-[16/8] overflow-hidden rounded-3xl border border-white/[0.07]">
            {useNextImage ? (
              <Image src={activity.image!} alt={activity.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
            ) : imgSrc ? (
              <SmartImg src={imgSrc} alt={activity.title} className="h-full w-full object-cover" />
            ) : (
              <Image src="/images/hero-bg.webp" alt={activity.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-5 start-5 end-5">
              <p className="mb-1 text-xs font-bold text-gold-light">
                {ACTIVITY_TYPE_ICONS[activity.type]} {typeWord}
                {activity.level ? ` · ${ACTIVITY_LEVEL_LABELS[activity.level]}` : ""}
                {activity.program ? ` · ${activity.program.name}` : ""}
              </p>
              <h1 className="text-2xl font-extrabold leading-relaxed text-white sm:text-3xl">{activity.title}</h1>
            </div>
          </div>

          {/* الوصف */}
          <section className="mt-6 rounded-3xl border border-white/[0.06] bg-surface p-5 sm:p-6">
            <h2 className="mb-3 text-base font-extrabold text-gold-light">عن {typeWord === "كورس" ? "الكورس" : typeWord === "فعالية" ? "الفعالية" : "الورشة"}</h2>
            <p className="whitespace-pre-line text-sm leading-8 text-zinc-300">{activity.description}</p>
            {activity.presenter && (
              <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm font-bold text-zinc-200">
                المقدم: <span className="text-gold-light">{activity.presenter}</span>
              </p>
            )}
          </section>

          {/* الجلسات — كل محاضرة تعامل معاملة الورشة */}
          <section className="mt-6">
            <h2 className="mb-3 text-base font-extrabold text-gold-light">
              {activity.type === "COURSE" ? `المحاضرات (${sessions.length})` : sessions.length > 1 ? `المواعيد (${sessions.length})` : "موعد الإقامة"}
            </h2>

            {sessions.length === 0 && (
              <div className="rounded-3xl border border-white/[0.07] bg-surface p-8 text-center">
                <p className="text-sm font-bold text-zinc-300">{activity.teaser ?? "لم يُعلن الموعد بعد"}</p>
                <p className="mt-1 text-xs text-zinc-500">تابعنا — أول ما يُفتح التسجيل هتلاقيه هنا</p>
              </div>
            )}

            {[
              { list: live, title: "🔥 جارية الآن" },
              { list: upcoming, title: "⏳ قادمة — سجّل مقعدك" },
              { list: past, title: "📚 انتهت" },
            ].map(({ list, title }) =>
              list.length > 0 ? (
                <div key={title} className="mb-5">
                  <h3 className="mb-2.5 text-sm font-extrabold text-zinc-800 dark:text-zinc-300">{title}</h3>
                  <div className="space-y-2.5">
                    {list.map((s) => (
                      <Link key={s.id} href={`/sessions/${s.id}`}
                        className="group flex flex-wrap items-center gap-3 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(32,29,25,0.08)] dark:shadow-none transition-all hover:border-emerald-400/60 dark:hover:border-gold/30 hover:shadow-[0_10px_28px_-10px_rgba(5,120,85,0.22)] dark:hover:shadow-none">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                            {activity.type === "COURSE" ? `${s.order}. ${s.label}` : s.label}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-500">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDate(s.startsAt)}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(s.startsAt)}</span>
                            {s.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location}</span>}
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.registered} / {s.seats}</span>
                          </div>
                          {s.state !== "COMPLETED" && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {s.decision.reason === "NOT_YET_OPEN" && s.registrationOpensAt && now < s.registrationOpensAt ? (
                                <Countdown to={s.registrationOpensAt.toISOString()} prefix="التسجيل يُفتح بعد" tone="gold" variant="pill" />
                              ) : s.decision.open ? (
                                s.registrationClosesAt && now < s.registrationClosesAt ? (
                                  <Countdown to={s.registrationClosesAt.toISOString()} prefix="يقفل بعد" tone="success" autoUrgent={true} variant="pill" />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 shadow-[0_2px_10px_-3px_rgba(5,120,85,0.3)] dark:shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    التسجيل مفتوح الآن
                                  </span>
                                )
                              ) : s.decision.reason === "FULL" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/70 px-3 py-1 text-[11px] font-black text-rose-600 dark:text-rose-300">
                                  مكتمل — قائمة انتظار
                                </span>
                              ) : (
                                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.06] px-2.5 py-1 text-[10px] font-extrabold text-zinc-600 dark:text-zinc-400">{s.decision.message}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                          s.state === "COMPLETED"
                            ? "border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400"
                            : s.decision.open
                            ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_20px_-4px_rgba(5,150,105,0.55)] group-hover:shadow-[0_9px_28px_-5px_rgba(5,150,105,0.7)] group-hover:from-emerald-300 group-hover:to-emerald-500"
                            : s.decision.reason === "FULL"
                            ? "border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50"
                            : "border border-gold/40 dark:border-gold/25 bg-gold/[0.08] dark:bg-gold/[0.08] text-gold-deep dark:text-gold-light group-hover:bg-gold/[0.18]"
                        }`}>
                          {s.state === "COMPLETED" ? "التفاصيل" : s.decision.open ? "احجز الآن" : s.decision.reason === "FULL" ? "قائمة الانتظار" : "التفاصيل"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </section>
        </article>

        {/* ── الجانبي ── */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-white/[0.07] bg-surface p-5">
            <p className="text-xs font-bold text-zinc-500">النوع</p>
            <p className="mt-1 text-sm font-extrabold text-zinc-100">{ACTIVITY_TYPE_ICONS[activity.type]} {typeWord}</p>
            {activity.program && (
              <>
                <p className="mt-3 text-xs font-bold text-zinc-500">البرنامج</p>
                <Link href={`/activities?program=${activity.program.id}`} className="mt-1 block text-sm font-extrabold text-gold-light hover:underline">
                  {activity.program.icon} {activity.program.name}
                </Link>
              </>
            )}
            {activity.level && (
              <>
                <p className="mt-3 text-xs font-bold text-zinc-500">المستوى</p>
                <p className="mt-1 text-sm font-extrabold text-zinc-100">{ACTIVITY_LEVEL_LABELS[activity.level]}</p>
              </>
            )}
            <p className="mt-3 text-xs font-bold text-zinc-500">{activity.type === "COURSE" ? "المحاضرات" : "المواعيد"}</p>
            <p className="mt-1 text-sm font-extrabold text-zinc-100">{sessions.length}</p>
            {sessions.length > 0 && (
              <>
                <p className="mt-3 text-xs font-bold text-zinc-500">إجمالي التسجيلات</p>
                <p className="mt-1 text-sm font-extrabold text-zinc-100">{totalRegistered} / {totalSeats} مقعد</p>
              </>
            )}
          </div>

          {upcoming[0] && (
            <Link href={`/sessions/${upcoming[0].id}`}
              className="block rounded-3xl border border-emerald-300/80 dark:border-gold/35 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-gold/[0.1] dark:via-surface dark:to-surface p-5 shadow-[0_12px_32px_-14px_rgba(5,120,85,0.25)] dark:shadow-none transition-all hover:border-emerald-400 dark:hover:border-gold/60 hover:shadow-[0_18px_40px_-14px_rgba(5,120,85,0.35)] dark:hover:shadow-[0_15px_35px_-10px_rgba(201,164,92,0.3)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-gold/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-gold-light">
                ⭐ أقرب {sessionWord === "محاضرة" ? "محاضرة" : "موعد"}
              </span>
              <p className="mt-2 text-base font-black text-zinc-900 dark:text-zinc-100">{upcoming[0].label}</p>
              <div className="mt-3">
                {upcoming[0].decision.reason === "NOT_YET_OPEN" && upcoming[0].registrationOpensAt ? (
                  <Countdown to={upcoming[0].registrationOpensAt.toISOString()} prefix="التسجيل يُفتح بعد" tone="gold" variant="pill" />
                ) : upcoming[0].registrationClosesAt && upcoming[0].registrationClosesAt > now ? (
                  <Countdown to={upcoming[0].registrationClosesAt.toISOString()} prefix="يقفل بعد" tone="success" autoUrgent={true} variant="pill" />
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    التسجيل متاح الآن
                  </span>
                )}
              </div>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-gold-light group-hover:underline">
                احجز مقعدك الآن ←
              </p>
            </Link>
          )}
        </aside>
      </div>
    </>
  );

  if (isStudent) {
    return (
      <StudentShell
        user={shellUser}
        active="activities"
        unreadCount={unreadCount}
      >
        {detailContent}
      </StudentShell>
    );
  }

  return (
    <SitePageShell title={`${typeWord} — ${activity.title}`}>
      {detailContent}
    </SitePageShell>
  );
}
