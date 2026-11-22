import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  User as UserIcon,
  Hourglass,
  Ban,
  Archive,
} from "lucide-react";
import { db } from "@/lib/db";
import { GuestRegisterForm } from "@/components/platform/guest-register-form";
import ExternalRegistrationNotFound from "../not-found";
import { type DynField } from "@/components/platform/session-register-form";
import { Countdown } from "@/components/platform/countdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SmartImg } from "@/components/platform/smart-img";
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_LEVEL_LABELS,
} from "@/lib/constants";
import {
  getSessionState,
  decideRegistration,
  waitlistAvailable,
  sessionDisplayName,
  parseFormFieldOptions,
} from "@/lib/activities";
import { resolveImageSrc } from "@/lib/links";
import { formatCairoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

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
        include: { formFields: { orderBy: { order: "asc" } } },
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
  const seatsLeft =
    session.seats === 0 ? 0 : Math.max(0, session.seats - registeredCount);
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
  const presenterName = session.presenter || activity.presenter;

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
  const whatsappUrl = session.whatsappUrl || activity.whatsappUrl;
  const telegramUrl = session.telegramUrl || activity.telegramUrl;

  return (
    <div className="relative min-h-svh overflow-x-clip bg-background text-foreground">
      <div className="noise-overlay" aria-hidden="true" />
      <div
        className="gold-glow-bg pointer-events-none fixed inset-x-0 top-0 h-80 opacity-65"
        aria-hidden="true"
      />

      {/* شريط علوي مستقل بدون أي روابط أو إشارة للمنصة */}
      <header className="relative z-10 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.1] px-3 py-1 text-xs font-extrabold text-gold-deep dark:text-gold-light">
              <span>{ACTIVITY_TYPE_ICONS[activity.type]}</span>
              <span>{typeWord}</span>
            </span>
            {activity.level && ACTIVITY_LEVEL_LABELS[activity.level] && (
              <span className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                {ACTIVITY_LEVEL_LABELS[activity.level]}
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* تفاصيل الورشة / الجلسة */}
          <article className="min-w-0 space-y-6">
            {imgSrc && (
              <div className="relative aspect-video overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                {useNextImage ? (
                  <Image
                    src={sessionImg!}
                    alt={activity.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <SmartImg
                    src={imgSrc}
                    alt={activity.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-black leading-snug text-foreground sm:text-3xl">
                <span className="text-gold-gradient">{activity.title}</span>
              </h1>
              {sessionLabel && sessionLabel !== activity.title && (
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  {sessionLabel}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2.5 text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <CalendarDays className="h-3.5 w-3.5 text-gold" />
                  {formatDateAr(session.startsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-gold" />
                  {formatTimeAr(session.startsAt)}
                </span>
                {session.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <MapPin className="h-3.5 w-3.5 text-gold" />
                    {session.location}
                  </span>
                )}
                {presenterName && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <UserIcon className="h-3.5 w-3.5 text-gold" />
                    {presenterName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  {session.seats === 0
                    ? `${registeredCount} مسجل (مفتوح)`
                    : `${registeredCount} / ${session.seats} مقعد`}
                </span>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <h2 className="mb-2.5 text-sm font-extrabold text-gold-deep dark:text-gold-light">
                  عن {isCourse ? "المحاضرة" : typeWord === "فعالية" ? "الفعالية" : "الورشة"}
                </h2>
                <p className="whitespace-pre-line text-sm leading-8 text-foreground/90">
                  {session.description || activity.description}
                </p>
              </div>
            </div>

            {state !== "COMPLETED" && (
              <div>
                {session.registrationOpensAt && new Date() < session.registrationOpensAt ? (
                  <Countdown
                    to={session.registrationOpensAt.toISOString()}
                    prefix="يُفتح التسجيل بعد"
                    variant="blocks"
                    tone="gold"
                    subtitle="جهّز بياناتك — التسجيل سيُفتح تلقائيًا عند انتهاء العداد"
                  />
                ) : decision.reason === "FULL" ? (
                  <div className="rounded-3xl border border-rose-300/80 bg-rose-50 p-5 text-center dark:border-rose-500/30 dark:bg-rose-950/20">
                    <p className="text-base font-black text-rose-600 dark:text-rose-300">
                      اكتمل عدد المقاعد الأساسية!
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {canWaitlist
                        ? "يمكنك الانضمام لقائمة الانتظار، وسيتم ترقيتك تلقائيًا عند أي إلغاء."
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
                      session.seats > 0 && seatsLeft <= 5
                        ? `🔥 تنبيه: متبقي ${seatsLeft} مقاعد فقط!`
                        : "⚡ سارع بحجز مقعدك الآن"
                    }
                  />
                ) : (
                  <Countdown
                    to={session.startsAt.toISOString()}
                    prefix="يبدأ الموعد بعد"
                    variant="blocks"
                    tone="gold"
                  />
                )}
              </div>
            )}
          </article>

          {/* استمارة التسجيل المستقلة — بدون دخول أو إنشاء حساب */}
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            {state === "COMPLETED" ? (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <Archive className="mx-auto h-10 w-10 text-gold/60" />
                <p className="mt-3 text-lg font-extrabold text-foreground">
                  انتهى هذا الموعد
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  نعتذر، انتهت فعالية هذا الرابط.
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
                seatsLeft={seatsLeft}
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
