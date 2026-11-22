import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  History,
  User as UserIcon,
  Hourglass,
  Ban,
  Archive,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { GuestRegisterForm } from "@/components/platform/guest-register-form";
import { type DynField } from "@/components/platform/session-register-form";
import { Countdown } from "@/components/platform/countdown";
import { CtaLink } from "@/components/platform/cta-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SmartImg } from "@/components/platform/smart-img";
import { ImagePreviewButton } from "@/components/platform/image-preview-button";
import ExternalRegistrationNotFound from "../not-found";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "@/lib/constants";
import {
  getSessionState,
  decideRegistration,
  waitlistAvailable,
  sessionDisplayName,
  parseFormFieldOptions,
} from "@/lib/activities";
import { isDriveLink, safeExternalUrl, resolveImageSrc } from "@/lib/links";
import { formatCairoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "/images/hero-bg.webp";

function formatDateAr(d: Date): string {
  return formatCairoDate(d, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeAr(d: Date): string {
  return formatCairoDate(d, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const session = await db.session.findUnique({
    where: { externalToken: token },
    include: { activity: true },
  });

  if (
    !session ||
    session.status === "CANCELLED" ||
    (session.activity.publish !== "PUBLISHED" && session.activity.publish !== "UNLISTED")
  ) {
    return {
      title: "الرابط غير متاح",
      description: "رابط التسجيل غير متاح أو منتهي.",
      robots: { index: false, follow: false },
      openGraph: {
        title: "الرابط غير متاح",
        description: "رابط التسجيل غير متاح أو منتهي.",
        type: "website",
        images: [],
      },
      twitter: {
        card: "summary",
        title: "الرابط غير متاح",
        description: "رابط التسجيل غير متاح أو منتهي.",
        images: [],
      },
    };
  }

  const label = sessionDisplayName(session, session.activity.type);
  const fullTitle =
    label && label !== session.activity.title
      ? `${session.activity.title} — ${label}`
      : session.activity.title;
  const desc = (session.description || session.activity.description).slice(0, 160);
  const metaImage = resolveImageSrc(session.image || session.activity.image);

  return {
    title: fullTitle,
    description: desc,
    robots: { index: false, follow: false },
    openGraph: {
      title: fullTitle,
      description: desc,
      type: "website",
      images: metaImage ? [metaImage] : [],
    },
    twitter: {
      card: metaImage ? "summary_large_image" : "summary",
      title: fullTitle,
      description: desc,
      images: metaImage ? [metaImage] : [],
    },
  };
}

export default async function ExternalSessionRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await db.session.findUnique({
    where: { externalToken: token },
    include: {
      activity: {
        include: {
          program: true,
          formFields: { orderBy: { order: "asc" } },
        },
      },
      registrations: {
        where: { status: "REGISTERED" },
        select: { id: true },
      },
    },
  });

  if (
    !session ||
    session.status === "CANCELLED" ||
    (session.activity.publish !== "PUBLISHED" && session.activity.publish !== "UNLISTED")
  ) {
    return <ExternalRegistrationNotFound />;
  }

  const activity = session.activity;
  const registeredCount = session.registrations.length;
  const isUnlimitedSeats =
    session.seats <= 0 ||
    session.closingMode === "OPEN_UNLIMITED" ||
    session.closingMode === "BY_DATE";
  const seatsLeft = isUnlimitedSeats
    ? 999999
    : Math.max(0, session.seats - registeredCount);
  const state = getSessionState(session);
  const gate = {
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
  };
  const decision = decideRegistration(gate);
  const canWaitlist = decision.reason === "FULL" && waitlistAvailable(gate);
  const sessionLabel = sessionDisplayName(session, activity.type);
  const typeWord = ACTIVITY_TYPE_LABELS[activity.type] ?? "نشاط";
  const isCourse = activity.type === "COURSE";
  const presenterName = session.presenter ?? activity.presenter;

  const fields: DynField[] = activity.formFields.map((f) => {
    const parsed = parseFormFieldOptions(f.options);
    return {
      id: f.id,
      label: f.label,
      type: f.type,
      options: parsed.choices,
      section: parsed.section,
      allowCustom: parsed.allowCustom,
      required: f.required,
    };
  });

  const sessionImg = session.image || activity.image;
  const imgSrc = resolveImageSrc(sessionImg);
  const useNextImage = !!sessionImg && sessionImg.startsWith("/");
  const isTeaserOnly = state === "UPCOMING" && !!activity.teaser;
  const whatsappUrl = session.whatsappUrl || activity.whatsappUrl;
  const telegramUrl = session.telegramUrl || activity.telegramUrl;

  return (
    <div className="relative min-h-svh overflow-x-clip bg-background text-foreground">
      <div className="noise-overlay" aria-hidden="true" />
      <div
        className="gold-glow-bg pointer-events-none fixed inset-x-0 top-0 h-72 opacity-65"
        aria-hidden="true"
      />

      {/* مفتاح تبديل المظهر في الزاوية فقط — بدون أي شعار أو روابط للمنصة */}
      <div className="fixed start-4 top-4 z-40 sm:start-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        {/* مسار نصي خالص بدون أي روابط */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {activity.program && (
            <>
              <span>
                {activity.program.icon} {activity.program.name}
              </span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="font-bold text-foreground">{activity.title}</span>
          {sessionLabel && sessionLabel !== activity.title && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-bold text-gold-deep dark:text-gold-light">
                {sessionLabel}
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── المحتوى الأساسي — مطابق تمامًا لتصميم صفحة الجلسة الداخلية ── */}
          <article className="min-w-0">
            {/* الصورة الرئيسية — بنسبة 16:9 الكاملة */}
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/[0.07] bg-night/40">
              {useNextImage ? (
                <Image
                  src={sessionImg!}
                  alt={session.title || activity.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className={`object-cover object-center ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`}
                />
              ) : imgSrc ? (
                <SmartImg
                  src={imgSrc}
                  alt={session.title || activity.title}
                  className={`h-full w-full object-cover object-center ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`}
                />
              ) : (
                <Image
                  src={FALLBACK_IMAGE}
                  alt={session.title || activity.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className={`object-cover object-center ${state === "COMPLETED" ? "opacity-80 grayscale-[0.35]" : ""}`}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-transparent" />

              {sessionImg && (
                <div className="absolute top-4 end-4 z-20">
                  <ImagePreviewButton
                    src={sessionImg}
                    alt={session.title || activity.title}
                    title={`بوستر ${sessionLabel}: ${session.title || activity.title}`}
                    label="عرض البوستر كاملًا"
                  />
                </div>
              )}

              {/* شارة الحالة العلوية البارزة */}
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
                ) : decision.open &&
                  session.registrationClosesAt &&
                  new Date(session.registrationClosesAt).getTime() - Date.now() < 24 * 3600 * 1000 ? (
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
                <h1 className="text-2xl font-extrabold leading-relaxed text-white sm:text-3xl">
                  {isCourse
                    ? `${activity.title} — ${sessionLabel}`
                    : isTeaserOnly
                    ? activity.teaser
                    : activity.title}
                </h1>
              </div>
            </div>

            {/* بطاقات المعلومات مع مؤشرات المقاعد بالأخضر/الأحمر */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="التاريخ" value={formatDateAr(session.startsAt)} />
              <InfoCard
                icon={<Clock className="h-5 w-5" />}
                label="الوقت"
                value={
                  session.endsAt
                    ? `${formatTimeAr(session.startsAt)} — ${formatTimeAr(session.endsAt)}`
                    : formatTimeAr(session.startsAt)
                }
              />
              {session.location && (
                <InfoCard icon={<MapPin className="h-5 w-5" />} label="المكان" value={session.location} />
              )}
              <div
                className={`rounded-2xl border p-4 transition-colors ${
                  state === "COMPLETED"
                    ? "border-border bg-card"
                    : seatsLeft <= 5 && seatsLeft > 0
                    ? "border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      seatsLeft <= 5 && state !== "COMPLETED"
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        : "bg-gold/15 text-gold"
                    }`}
                  >
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">المقاعد المتاحة</p>
                    <p className="mt-0.5 text-sm font-black text-foreground">
                      {state === "COMPLETED" ? (
                        `${registeredCount} مسجلاً`
                      ) : isUnlimitedSeats ? (
                        <>
                          <span>{registeredCount} مسجلاً</span>
                          <span className="ms-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            (مقاعد مفتوحة للجميع ∞)
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {registeredCount} / {session.seats} مقعد
                          </span>
                          {seatsLeft <= 5 && seatsLeft > 0 ? (
                            <span className="ms-2 text-xs font-black text-rose-600 dark:text-rose-400 animate-pulse">
                              (باقي {seatsLeft} فقط!)
                            </span>
                          ) : seatsLeft === 0 ? (
                            <span className="ms-2 text-xs font-black text-rose-600 dark:text-rose-400">
                              (مكتمل)
                            </span>
                          ) : (
                            <span className="ms-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ({seatsLeft} متبقٍ)
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {presenterName && (
                <InfoCard
                  icon={<UserIcon className="h-5 w-5" />}
                  label="المقدم"
                  value={presenterName}
                  className="sm:col-span-2"
                />
              )}
            </div>

            {/* العد التنازلي التسويقي */}
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
                    <p className="text-base font-black text-rose-600 dark:text-rose-300">
                      اكتمل عدد المقاعد الأساسية!
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {canWaitlist
                        ? "يمكنك الانضمام لقائمة الانتظار، وسيتم ترقيتك تلقائياً عند أي إلغاء."
                        : "نعتذر، تم إغلاق التسجيل لاكتمال المقاعد."}
                    </p>
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
                      !isUnlimitedSeats && seatsLeft <= 5
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
                    subtitle="تأكد من الحضور في الموعد المحدد"
                  />
                ) : (
                  <div className="rounded-3xl border border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-center shadow-[0_8px_24px_-12px_rgba(5,120,85,0.2)] dark:shadow-none">
                    <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                      الجلسة جارية الآن! 🟢
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* الوصف */}
            {!isTeaserOnly && (
              <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <h2 className="mb-3 text-base font-extrabold text-gold-deep dark:text-gold-light">
                  عن {isCourse ? "المحاضرة" : typeWord === "فعالية" ? "الفعالية" : "الورشة"}
                </h2>
                <p className="whitespace-pre-line text-sm leading-8 text-foreground/90 dark:text-zinc-200">
                  {session.description || activity.description}
                </p>
                {(session.materialUrl || session.onlineUrl) && (
                  <div className="mt-4 flex flex-wrap gap-2.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                    {session.materialUrl && (
                      <CtaLink
                        label={session.materialLabel || "مواد الجلسة"}
                        url={session.materialUrl}
                        linkType={isDriveLink(session.materialUrl) ? "DRIVE" : undefined}
                        size="md"
                      />
                    )}
                    {session.onlineUrl && (
                      <a
                        href={safeExternalUrl(session.onlineUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:border-gold/40 dark:hover:border-gold/30"
                      >
                        {session.onlineLabel || "انضم أونلاين"}
                      </a>
                    )}
                  </div>
                )}
              </section>
            )}
          </article>

          {/* ── العمود الجانبي: استمارة التسجيل بدون أي تسجيل دخول أو إنشاء حساب ── */}
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            {state === "COMPLETED" ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <Archive className="mx-auto h-10 w-10 text-gold/60" />
                <p className="mt-3 text-lg font-extrabold text-foreground">
                  انتهت هذه الجلسة
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  نعتذر، تم إغلاق التسجيل لانتهاء موعد الجلسة.
                </p>
              </div>
            ) : decision.reason === "NOT_YET_OPEN" ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <Hourglass className="mx-auto h-10 w-10 text-gold/80" />
                <p className="mt-3 text-lg font-extrabold text-foreground">
                  التسجيل لم يُفتح بعد
                </p>
                {session.registrationOpensAt && (
                  <Countdown
                    to={session.registrationOpensAt.toISOString()}
                    prefix="يُفتح بعد"
                    tone="gold"
                    className="mt-2 block text-sm font-extrabold text-gold-deep dark:text-gold-light"
                  />
                )}
              </div>
            ) : !decision.open && !canWaitlist ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <Ban className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-lg font-extrabold text-foreground">
                  التسجيل {decision.reason === "FULL" ? "ممتلئ" : "مغلق"}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {decision.message}
                </p>
              </div>
            ) : (
              <GuestRegisterForm
                sessionId={session.id}
                sessionTitle={`${activity.title}${sessionLabel !== activity.title ? ` — ${sessionLabel}` : ""}`}
                fields={fields}
                isFull={decision.reason === "FULL"}
                seatsLeft={isUnlimitedSeats ? 0 : seatsLeft}
                externalToken={token}
                whatsappUrl={whatsappUrl}
                telegramUrl={telegramUrl}
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm ${className ?? ""}`}
    >
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
