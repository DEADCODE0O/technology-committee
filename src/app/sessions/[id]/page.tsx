import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays, Clock, MapPin, Users, History, User as UserIcon,
  Hourglass, LogIn, Ban, Archive, CircleCheck, ChevronRight, Crown, Shield,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";
import { getStudentBadges } from "@/lib/student-badges";
import { StudentShell } from "@/components/student/student-shell";
import { SitePageShell } from "@/components/platform/site-page-shell";
import { SessionRegisterForm, type DynField } from "@/components/platform/session-register-form";
import { GuestRegisterForm } from "@/components/platform/guest-register-form";
import { Countdown } from "@/components/platform/countdown";
import { CtaLink } from "@/components/platform/cta-link";
import { GRADE_LABELS, SECTION_LABELS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "@/lib/constants";
import { isAdminRole } from "@/lib/permissions";
import { getSessionState, decideRegistration, sessionDisplayName } from "@/lib/activities";
import { isDriveLink, safeExternalUrl, resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";
import { formatCairoDate } from "@/lib/dates";
import { CommunityLinksCard, WhatsAppIcon, TelegramIcon } from "@/components/platform/community-links-card";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "/images/hero-bg.webp";

function formatDateAr(d: Date): string {
  return formatCairoDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTimeAr(d: Date): string {
  return formatCairoDate(d, { hour: "numeric", minute: "2-digit", hour12: true });
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await db.session.findUnique({
    where: { id },
    include: {
      activity: { include: { program: true, formFields: { orderBy: { order: "asc" } } } },
      registrations: { where: { status: "REGISTERED" }, select: { id: true } },
    },
  });

  if (!session || session.activity.publish !== "PUBLISHED") notFound();

  const user = await getCurrentUser();
  const activity = session.activity;
  const registeredCount = session.registrations.length;
  const seatsLeft = Math.max(0, session.seats - registeredCount);
  const state = getSessionState(session);
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
  const canBypass = !!user && isAdminRole(user.role) && session.allowAdminOverride;
  const sessionLabel = sessionDisplayName(session, activity.type);
  const typeWord = ACTIVITY_TYPE_LABELS[activity.type] ?? "نشاط";
  const isCourse = activity.type === "COURSE";

  // أسئلة النشاط (تُسأل مرة واحدة)
  const fields: DynField[] = activity.formFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    options: f.options ? (JSON.parse(f.options) as string[]) : [],
    required: f.required,
  }));

  // تسجيل الطالب الحالي في هذه الجلسة (إن وجد) + حضوره
  let existing: { id: string; status: string } | null = null;
  let waitlistPos: number | null = null;
  let myAttended = false;
  if (user && user.role === "STUDENT") {
    const reg = await db.registration.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
      include: { attendance: { where: { sessionId: session.id } } },
    });
    if (reg && reg.status !== "CANCELLED") {
      existing = { id: reg.id, status: reg.status };
      waitlistPos = reg.waitlistOrder;
      myAttended = reg.attendance.some((a) => a.present);
    }
  }

  const isRegisteredInSession = existing?.status === "REGISTERED" || (!!user && isAdminRole(user.role));
  const whatsappUrl = session.whatsappUrl || activity.whatsappUrl;
  const telegramUrl = session.telegramUrl || activity.telegramUrl;

  // جلب فريق الطالب الخاص بهذه الجلسة (إن وُجد)
  const myTeam = user
    ? await db.team.findFirst({
        where: {
          sessionId: session.id,
          members: { some: { userId: user.id } },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  role: true,
                  avatarUrl: true,
                  avatarFrameId: true,
                  profile: { select: { fullName: true } },
                },
              },
            },
            orderBy: { role: "desc" },
          },
        },
      })
    : null;

  // الصورة: المرفوعة على السيرفر أو من الرابط (درايف/خارجي) للمحاضرة أو النشاط
  const sessionImg = session.image || activity.image;
  const imgSrc = resolveImageSrc(sessionImg);
  const useNextImage = !!sessionImg && sessionImg.startsWith("/");
  const isTeaserOnly = state === "UPCOMING" && !!activity.teaser;

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

  const sessionContent = (
    <>
      {/* مسار التنقل */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="مسار التنقل">
        <Link href="/activities" className="hover:text-gold-deep dark:hover:text-gold-light">الأنشطة</Link>
        <ChevronRight className="h-3 w-3" />
        {activity.program && (
          <>
            <span className="text-muted-foreground">{activity.program.icon} {activity.program.name}</span>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <Link href={`/activities/${activity.id}`} className="font-bold text-foreground hover:text-gold-deep dark:hover:text-gold-light">
          {activity.title}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gold-deep dark:text-gold-light font-bold">{sessionLabel}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── المحتوى الأساسي ── */}
        <article className="min-w-0">
          {/* الصورة الرئيسية */}
          <div className="relative aspect-[16/8] overflow-hidden rounded-3xl border border-white/[0.07]">
            {useNextImage ? (
              <Image src={sessionImg!} alt={session.title || activity.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw"
                className={`object-cover ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`} />
            ) : imgSrc ? (
              <SmartImg src={imgSrc} alt={session.title || activity.title}
                className={`h-full w-full object-cover ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`} />
            ) : (
              <Image src={FALLBACK_IMAGE} alt={session.title || activity.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw"
                className={`object-cover ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-transparent" />

            {/* شارة الحالة العلوية البارزة بالألوان الحية */}
            <div className="absolute start-4 top-4 z-10 flex flex-wrap gap-2">
              {state === "COMPLETED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-night/80 px-3.5 py-1.5 text-xs font-bold text-zinc-300 backdrop-blur">
                  <History className="h-3.5 w-3.5" />
                  منتهٍ
                </span>
              ) : state === "ONGOING" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-night shadow-[0_0_25px_rgba(16,185,129,0.55)] animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-night animate-ping" />
                  جارٍ الآن ⚡
                </span>
              ) : decision.open && session.registrationClosesAt && new Date(session.registrationClosesAt).getTime() - Date.now() < 24 * 3600 * 1000 ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-black text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  🔥 فرصة أخيرة — يغلق قريباً!
                </span>
              ) : decision.open ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-950/90 px-3.5 py-1.5 text-xs font-black text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  التسجيل متاح الآن 🟢
                </span>
              ) : decision.reason === "FULL" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/90 px-3.5 py-1.5 text-xs font-black text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur">
                  مكتمل — قائمة الانتظار
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-extrabold text-night shadow-lg">
                  <Hourglass className="h-3.5 w-3.5" />
                  يبدأ قريبًا
                </span>
              )}
            </div>

            <div className="absolute bottom-5 start-5 end-5">
              <p className="mb-1 text-xs font-bold text-gold-light">
                {ACTIVITY_TYPE_ICONS[activity.type]} {typeWord}
                {activity.program ? ` · ${activity.program.name}` : ""}
              </p>
              <h2 className="text-2xl font-extrabold leading-relaxed text-white sm:text-3xl">
                {isCourse ? `${activity.title} — ${sessionLabel}` : isTeaserOnly ? activity.teaser : activity.title}
              </h2>
            </div>
          </div>

          {/* بطاقات المعلومات مع مؤشرات المقاعد بالأخضر/الأحمر */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="التاريخ" value={formatDateAr(session.startsAt)} />
            <InfoCard icon={<Clock className="h-5 w-5" />} label="الوقت"
              value={session.endsAt ? `${formatTimeAr(session.startsAt)} — ${formatTimeAr(session.endsAt)}` : formatTimeAr(session.startsAt)} />
            {session.location && (
              <InfoCard icon={<MapPin className="h-5 w-5" />} label="المكان" value={session.location} />
            )}
            <div className={`rounded-2xl border p-4 transition-colors ${
              state === "COMPLETED"
                ? "border-border bg-card"
                : seatsLeft <= 5 && seatsLeft > 0
                ? "border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm"
                : "border-border bg-card"
            }`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  seatsLeft <= 5 && state !== "COMPLETED" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-gold/15 text-gold"
                }`}>
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-muted-foreground">المقاعد المتاحة</p>
                  <p className="mt-0.5 text-sm font-black text-foreground">
                    {state === "COMPLETED" ? (
                      `${registeredCount} مسجلاً`
                    ) : (
                      <>
                        <span>{registeredCount} / {session.seats} مقعد</span>
                        {seatsLeft <= 5 && seatsLeft > 0 ? (
                          <span className="ms-2 text-xs font-black text-rose-600 dark:text-rose-400 animate-pulse">(باقي {seatsLeft} فقط!)</span>
                        ) : seatsLeft === 0 ? (
                          <span className="ms-2 text-xs font-black text-rose-600 dark:text-rose-400">(مكتمل)</span>
                        ) : (
                          <span className="ms-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">({seatsLeft} متبقٍ)</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {(session.presenter ?? activity.presenter) && (
              <InfoCard icon={<UserIcon className="h-5 w-5" />} label="المقدم" value={session.presenter ?? activity.presenter!} className="sm:col-span-2" />
            )}
          </div>

          {/* العد التنازلي التسويقي الفاخر (Blocks) */}
          {state !== "COMPLETED" && (
            <div className="mt-6">
              {session.registrationOpensAt && new Date() < session.registrationOpensAt ? (
                <Countdown
                  to={session.registrationOpensAt.toISOString()}
                  prefix="يُفتح التسجيل بعد"
                  variant="blocks"
                  tone="gold"
                  subtitle="جهّز بياناتك — التسجيل سيُفتح تلقائياً عند انتهاء العداد"
                />
              ) : decision.reason === "FULL" ? (
                <div className="rounded-3xl border border-rose-300/80 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-5 text-center shadow-[0_8px_24px_-12px_rgba(190,18,60,0.2)] dark:shadow-none">
                  <p className="text-base font-black text-rose-600 dark:text-rose-300">اكتمل عدد المقاعد الأساسية!</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">يمكنك الانضمام لقائمة الانتظار، وسيتم ترقيتك تلقائياً عند أي إلغاء.</p>
                </div>
              ) : decision.open ? (
                <Countdown
                  to={
                    session.registrationClosesAt && new Date() < session.registrationClosesAt
                      ? session.registrationClosesAt.toISOString()
                      : session.startsAt.toISOString()
                  }
                  prefix={
                    session.registrationClosesAt && new Date() < session.registrationClosesAt
                      ? "ينتهي التسجيل خلال"
                      : "التسجيل متاح الآن — تبدأ بعد"
                  }
                  variant="blocks"
                  tone={
                    session.registrationClosesAt && new Date() < session.registrationClosesAt
                      ? "success"
                      : "gold"
                  }
                  autoUrgent={true}
                  subtitle={
                    seatsLeft <= 5
                      ? `🔥 تنبيه: متبقي ${seatsLeft} مقاعد فقط قبل إغلاق القبول!`
                      : "⚡ سارع بحجز مقعدك وتأكيد انضمامك معنا"
                  }
                />
              ) : state === "UPCOMING" ? (
                <Countdown
                  to={session.startsAt.toISOString()}
                  prefix="يبدأ موعد الجلسة بعد"
                  variant="blocks"
                  tone="gold"
                  subtitle="تأكد من الحضور في الموعد ومسح كود QR لتسجيل حضورك"
                />
              ) : (
                <div className="rounded-3xl border border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-center shadow-[0_8px_24px_-12px_rgba(5,120,85,0.2)] dark:shadow-none">
                  <p className="text-base font-black text-emerald-700 dark:text-emerald-300">الجلسة جارية الآن! 🟢</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">سجّل حضورك بمسح كود الـ QR عند الدخول لحصد النقاط والشارات.</p>
                </div>
              )}
            </div>
          )}

          {/* مجتمعات واتساب وتليجرام للجلسة */}
          {(whatsappUrl || telegramUrl) && (
            <div className="mt-6">
              <CommunityLinksCard
                whatsappUrl={whatsappUrl}
                telegramUrl={telegramUrl}
                isRegistered={isRegisteredInSession}
                itemTitle={sessionLabel}
                type={isCourse ? "محاضرة" : typeWord}
              />
            </div>
          )}

          {/* بطاقة فريق العمل المخصص للطالب في هذه الجلسة */}
          {myTeam && (
            <div
              className="mt-6 rounded-3xl border bg-card p-5 sm:p-6 shadow-sm overflow-hidden relative"
              style={{ borderColor: `${myTeam.color}50` }}
            >
              <div
                className="absolute top-0 right-0 left-0 h-1.5"
                style={{ backgroundColor: myTeam.color }}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner shrink-0"
                    style={{ backgroundColor: `${myTeam.color}20`, border: `1px solid ${myTeam.color}50` }}
                  >
                    {myTeam.icon || "🛡️"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-foreground">
                        فريقك في الورشة: {myTeam.name}
                      </h3>
                      {myTeam.members.find((m) => m.userId === user?.id)?.role === "LEADER" ? (
                        <span className="rounded-full bg-gold/20 text-gold-light border border-gold/40 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                          <Crown className="h-3 w-3" /> أنت قائد الفريق
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[10px] font-bold">
                          عضو في الفريق
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      تم توزيعك ضمن هذا الفريق للعمل الجماعي وتطبيق مهام وتكليفات الورشة.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {myTeam.whatsappUrl && (
                    <a
                      href={myTeam.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      جروب واتساب الفريق 💬
                    </a>
                  )}
                  {myTeam.telegramUrl && (
                    <a
                      href={myTeam.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] px-3 py-2 text-xs font-black text-white shadow-sm"
                    >
                      <TelegramIcon className="h-3.5 w-3.5" />
                      تليجرام الفريق
                    </a>
                  )}
                </div>
              </div>

              {/* زملاؤك في الفريق */}
              <div className="mt-4">
                <p className="text-xs font-extrabold text-foreground mb-2.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  <span>زملاؤك في الفريق ({myTeam.members.length} أعضاء):</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {myTeam.members.map((m) => {
                    const isLeader = m.role === "LEADER";
                    const isMe = m.userId === user?.id;
                    const name = m.user.profile?.fullName || m.user.displayName || "طالب";
                    return (
                      <div
                        key={m.userId}
                        className={`flex items-center gap-2.5 rounded-xl p-2 text-xs transition-colors border ${
                          isMe
                            ? "bg-gold/10 border-gold/40 text-foreground font-bold"
                            : "bg-muted/30 border-border text-foreground"
                        }`}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs">
                          {isLeader ? "👑" : "🛡️"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-[11px] leading-tight">
                            {name} {isMe && "(أنت)"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {isLeader ? "قائد الفريق" : "عضو في الفريق"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* الوصف */}
          {!isTeaserOnly && (
            <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="mb-3 text-base font-extrabold text-gold-deep dark:text-gold-light">عن {isCourse ? "المحاضرة" : typeWord === "فعالية" ? "الفعالية" : "الورشة"}</h3>
              <p className="whitespace-pre-line text-sm leading-8 text-foreground/90 dark:text-zinc-200">
                {session.description || activity.description}
              </p>
              {(session.materialUrl || session.onlineUrl) && (
                <div className="mt-4 flex flex-wrap gap-2.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                  {session.materialUrl && (
                    <CtaLink label={session.materialLabel || "مواد الجلسة"} url={session.materialUrl} linkType={isDriveLink(session.materialUrl) ? "DRIVE" : undefined} size="md" />
                  )}
                  {session.onlineUrl && (
                    <a href={safeExternalUrl(session.onlineUrl)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:border-gold/40 dark:hover:border-gold/30">
                      {session.onlineLabel || "انضم أونلاين"}
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          {/* جلسات أخرى لنفس النشاط (الكورس: باقي المحاضرات) */}
          {isCourse && (
            <OtherSessions sessionId={session.id} activityId={activity.id} />
          )}
        </article>

        {/* ── العمود الجانبي: التسجيل ── */}
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          {state === "COMPLETED" ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
              <Archive className="mx-auto h-10 w-10 text-gold/60" />
              <p className="mt-3 text-lg font-extrabold text-foreground">انتهت هذه الجلسة</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {isCourse ? "محاضرات أخرى من نفس الكورس قد تُفتح قريبًا — تابع صفحة الكورس." : "موعد جديد من نفس النشاط قد يُفتح قريبًا — تابع صفحة الأنشطة."}
              </p>
              <Link href={`/activities/${activity.id}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.08] px-5 text-sm font-bold text-gold-deep dark:text-gold-light">
                {isCourse ? "كل المحاضرات" : "صفحة النشاط"}
              </Link>
            </div>
          ) : myAttended ? (
            <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/[0.06] p-6 text-center shadow-sm">
              <CircleCheck className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-lg font-extrabold text-emerald-800 dark:text-emerald-400">حضورك مسجل ✓</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">تم تسجيل حضورك في هذه الجلسة — استمر!</p>
            </div>
          ) : decision.reason === "NOT_YET_OPEN" ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
              <Hourglass className="mx-auto h-10 w-10 text-gold/80" />
              <p className="mt-3 text-lg font-extrabold text-foreground">التسجيل لم يُفتح بعد</p>
              {session.registrationOpensAt && (
                <Countdown to={session.registrationOpensAt.toISOString()} prefix="يُفتح بعد" tone="gold" className="mt-2 block text-sm font-extrabold text-gold-deep dark:text-gold-light" />
              )}
            </div>
          ) : !decision.open && !canBypass ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
              <Ban className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-lg font-extrabold text-foreground">التسجيل {decision.reason === "FULL" ? "ممتلئ" : "مغلق"}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {decision.reason === "FULL"
                  ? "المقاعد اكتملت — سجّل بياناتك لتضعك المنصة في قائمة الانتظار، أول إلغاء يرقّيك تلقائيًا."
                  : decision.message}
              </p>
            </div>
          ) : !user ? (
            <div className="space-y-5">
              {!session.allowGuests ? (
                <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                  <LogIn className="mx-auto h-10 w-10 text-gold" />
                  <p className="mt-3 text-lg font-extrabold text-foreground">عشان تحجز مقعدك</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">هذه الجلسة للأعضاء — لديك حساب؟ سجّل دخولك. جديد عندنا؟ حسابك يستغرق دقيقة.</p>
                  <div className="mt-5 flex flex-col gap-2.5">
                    <Link href={`/login?returnTo=/sessions/${session.id}`}
                      className="flex h-12 items-center justify-center rounded-xl border border-gold/40 bg-gold/[0.08] text-sm font-bold text-gold-deep dark:text-gold-light transition-colors hover:bg-gold/[0.15]">
                      تسجيل الدخول
                    </Link>
                    <Link href={`/register?returnTo=/sessions/${session.id}`}
                      className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night transition-all hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]">
                      إنشاء حساب جديد
                    </Link>
                  </div>
                </div>
              ) : (
                <GuestRegisterForm
                  sessionId={session.id}
                  sessionTitle={`${activity.title} — ${sessionLabel}`}
                  fields={fields}
                  isFull={decision.reason === "FULL"}
                  seatsLeft={seatsLeft}
                />
              )}
              {session.allowGuests && (
                <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-sm">
                  <p className="text-sm font-bold text-foreground">عضو عندنا أو عايز حساب؟</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">الأعضاء يجمعون نقاطًا وشارات ومستويات في كل نشاط</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Link href={`/login?returnTo=/sessions/${session.id}`}
                      className="flex h-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.06] text-xs font-bold text-gold-deep dark:text-gold-light transition-colors hover:bg-gold/[0.12]">
                      تسجيل الدخول
                    </Link>
                    <Link href={`/register?returnTo=/sessions/${session.id}`}
                      className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-xs font-bold text-foreground transition-colors hover:border-gold/30">
                      إنشاء حساب جديد
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : user.profile ? (
            <>
              {canBypass && !decision.open && (
                <div className="mb-3 rounded-2xl border border-gold/20 bg-gold/[0.05] p-3 text-xs leading-6 text-gold-deep dark:text-gold-light">
                  أنت داخل بحساب إداري — يمكنك التسجيل متجاوزًا قيود الطلاب (هذه الجلسة تسمح بالتجاوز الإداري).
                </div>
              )}
              <SessionRegisterForm
                sessionId={session.id}
                sessionTitle={`${activity.title} — ${sessionLabel}`}
                fields={fields}
                profile={{
                  fullName: user.profile.fullName,
                  phone: user.profile.phone,
                  grade: GRADE_LABELS[user.profile.grade] ?? "",
                  section: SECTION_LABELS[user.profile.section] ?? "",
                  studentCode: user.profile.studentCode ?? null,
                }}
                existing={existing}
                isFull={decision.reason === "FULL"}
                waitlistPos={waitlistPos}
                seatsLeft={seatsLeft}
              />
            </>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
              <p className="text-lg font-extrabold text-foreground">أكمل بيانات حسابك أولًا</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">لا يمكن التسجيل قبل وجود الاسم العربي والفرقة والشعبة والجنس والهاتف في ملفك.</p>
              <Link href="/profile/complete" className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-b from-gold-light to-gold px-6 text-sm font-extrabold text-night">
                إكمال البيانات
              </Link>
            </div>
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
        unreadMessagesCount={unreadMessagesCount}
        openTaskCount={openTaskCount}
        pendingCount={pendingCount}
      >
        {sessionContent}
      </StudentShell>
    );
  }

  return (
    <SitePageShell title={`${typeWord} — ${sessionLabel}`}>
      {sessionContent}
    </SitePageShell>
  );
}

// جلسات أخرى من نفس النشاط (تنقل سريع بين المحاضرات)
async function OtherSessions({ sessionId, activityId }: { sessionId: string; activityId: string }) {
  const siblings = await db.session.findMany({
    where: { activityId, status: { not: "CANCELLED" } },
    orderBy: { startsAt: "asc" },
    select: { id: true, order: true, title: true, startsAt: true },
  });
  const others = siblings.filter((s) => s.id !== sessionId);
  if (others.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-base font-extrabold text-gold-deep dark:text-gold-light">محاضرات أخرى من نفس الكورس</h3>
      <div className="space-y-2.5">
        {others.map((s) => {
          const done = s.startsAt < new Date();
          return (
            <Link key={s.id} href={`/sessions/${s.id}`}
              className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                done ? "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/15" : "border-gold/30 dark:border-gold/20 bg-gold/[0.05] dark:bg-gold/[0.04] hover:border-gold/50 dark:hover:border-gold/40 shadow-[0_4px_14px_-8px_rgba(150,113,31,0.25)]"
              }`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-extrabold ${
                done ? "border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400" : "border-gold/40 dark:border-gold/30 bg-gold/10 text-gold-deep dark:text-gold"
              }`}>
                {s.order}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">
                  {formatCairoDate(s.startsAt, { weekday: "short", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true })}
                  {done ? " · انتهت" : ""}
                </p>
              </div>
              <span className={`rounded-xl px-3.5 py-2 text-[11px] font-extrabold transition-colors ${
                done
                  ? "border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400"
                  : "border border-emerald-400/60 dark:border-gold/25 bg-emerald-50 dark:bg-gold/[0.08] text-emerald-700 dark:text-gold-light group-hover:bg-emerald-100 dark:group-hover:bg-gold/[0.18]"
              }`}>
                {done ? "التفاصيل" : "التسجيل"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function InfoCard({
  icon, label, value, className,
}: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm ${className ?? ""}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 dark:border-gold/20 bg-gold/[0.08] dark:bg-gold/[0.07] text-gold">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
