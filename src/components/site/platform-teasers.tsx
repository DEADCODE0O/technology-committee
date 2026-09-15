import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, MessagesSquare, Sparkles, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { Countdown } from "@/components/platform/countdown";
import { getSessionState, getSessionDisplayPhase, decideRegistration, type RegistrationGate } from "@/lib/activities";
import { COMMUNITY_POST_TYPE_ICONS } from "@/lib/constants";
import { FEATURED_KIND_LABELS } from "@/lib/constants";
import { resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";

// ═══════════════════════════════════════════════════════════════
//  «المنصة حية» في اللاندنج — ما يحدث الآن فعلًا على المنصة:
//  أنشطة قادمة بنوافذ تسجيلها · لحظات المجتمع · الطلاب المميزون
//  أقسام تختفي بأمان حين لا بيانات — لا أقسام فارغة أبدًا
// ═══════════════════════════════════════════════════════════════

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export async function PlatformTeasers() {
  const now = new Date();

  // الأنشطة القادمة المنشورة (أقرب 3 بوقت بدء)
  const upcoming = await db.session.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gt: now },
      activity: { publish: "PUBLISHED" },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    include: {
      activity: { select: { id: true, title: true, type: true, image: true } },
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
  });

  // أحدث لحظات المجتمع (العامة فقط)
  const posts = await db.communityPost.findMany({
    where: { status: "PUBLISHED", target: null },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: { id: true, type: true, title: true, createdAt: true },
  });

  // الطلاب المميزون (بيانات عامة آمنة فقط)
  const featured = await db.studentProfile.findMany({
    where: { featured: true },
    take: 6,
    select: { userId: true, fullName: true, featuredKind: true, featuredNote: true },
  });

  const gate = (s: typeof upcoming[number]): RegistrationGate => ({
    session: {
      registrationOpensAt: s.registrationOpensAt,
      registrationClosesAt: s.registrationClosesAt,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      closingMode: s.closingMode,
      registrationOpen: s.registrationOpen,
    },
    registeredCount: s._count.registrations,
    seats: s.seats,
  });

  if (upcoming.length === 0 && posts.length === 0 && featured.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="live-platform">
      <div className="mb-8 text-center">
        <p className="font-latin text-[10px] tracking-[0.35em] text-gold/60">LIVE FROM THE PLATFORM</p>
        <h2 id="live-platform" className="mt-2 text-2xl font-extrabold text-zinc-100 sm:text-3xl">
          المنصة حية — شوف بنفسك
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-zinc-500">
          أنشطة بتُفتح تسجيلها دلوقتي · إنجازات بتتولد · طلاب بيتألقوا — القصة بتتكتب كل يوم
        </p>
      </div>

      {/* الأنشطة القادمة */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gold">
            <CalendarDays className="h-4 w-4" /> قادم قريبًا
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {upcoming.map((s) => {
              const phase = getSessionDisplayPhase(gate(s), now);
              const decision = decideRegistration(gate(s), now);
              const state = getSessionState(s, now);
              void state;
              const isRegistrationOpen = phase.phase === "REGISTRATION_OPEN";
              const countdownTo =
                "countdownTo" in phase
                  ? phase.countdownTo
                  : isRegistrationOpen && s.startsAt > now
                  ? s.startsAt
                  : undefined;
              const phaseText =
                phase.phase === "REGISTRATION_OPEN" ? (countdownTo ? "التسجيل مفتوح — يقفل قريبًا" : "التسجيل مفتوح الآن")
                : phase.phase === "BEFORE_REGISTRATION" ? "التسجيل يُفتح قريبًا"
                : decision.reason === "FULL" ? "اكتمل العدد"
                : "أعلن التفاصيل قريبًا";
              const isFull = decision.reason === "FULL";
              const seatsLeft = Math.max(0, s.seats - s._count.registrations);
              const isUrgent = isRegistrationOpen && countdownTo && (new Date(countdownTo).getTime() - now.getTime()) < 24 * 3600 * 1000;

              const cardImage = s.image || s.activity.image;
              const imgSrc = resolveImageSrc(cardImage);
              const useNextImage = !!cardImage && cardImage.startsWith("/");

              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className={`group flex flex-col justify-between rounded-3xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5 ${
                    isUrgent
                      ? "border-rose-500/30 bg-surface hover:border-rose-500/50 hover:shadow-[0_15px_30px_-15px_rgba(244,63,94,0.3)]"
                      : isRegistrationOpen
                      ? "border-emerald-500/25 bg-surface hover:border-emerald-500/45 hover:shadow-[0_15px_30px_-15px_rgba(16,185,129,0.25)]"
                      : "border-white/[0.07] bg-surface hover:border-gold/30 hover:bg-gold/[0.03]"
                  }`}
                >
                  <div>
                    {cardImage && (
                      <div className="relative mb-3.5 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.08]">
                        {useNextImage ? (
                          <Image src={cardImage} alt={s.activity.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : imgSrc ? (
                          <SmartImg src={imgSrc} alt={s.activity.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-transparent" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-extrabold text-zinc-500">{fmtDate(s.startsAt)}</p>
                      {isFull ? (
                        <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-black text-rose-300">
                          مكتمل
                        </span>
                      ) : isUrgent ? (
                        <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-black text-rose-300 animate-pulse">
                          🔥 يقفل قريباً
                        </span>
                      ) : isRegistrationOpen ? (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                          🟢 متاح الآن
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-base font-black leading-7 text-zinc-100 group-hover:text-gold-light">{s.activity.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{s.title}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    {countdownTo ? (
                      <Countdown to={countdownTo.toISOString()} prefix={isRegistrationOpen ? "يقفل بعد" : "يُفتح بعد"} variant="pill" tone={isRegistrationOpen ? "success" : "gold"} autoUrgent={true} />
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${isRegistrationOpen ? "text-emerald-400" : "text-zinc-400"}`}>
                          {phaseText}
                        </span>
                        {seatsLeft > 0 && <span className="text-[10px] text-zinc-500">{seatsLeft} مقعد متبقٍ</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/activities" className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-gold/80 hover:text-gold-light">
            كل الأنشطة <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* لحظات المجتمع */}
      {posts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
            <MessagesSquare className="h-4 w-4 text-gold/70" /> من المجتمع
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href="/community"
                className="group rounded-2xl border border-white/[0.06] bg-surface px-4 py-3.5 transition-colors hover:border-gold/25"
              >
                <p className="text-lg">{COMMUNITY_POST_TYPE_ICONS[p.type]}</p>
                <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-6 text-zinc-200 group-hover:text-gold-light">{p.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* الطلاب المميزون */}
      {featured.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-zinc-300">
            <Trophy className="h-4 w-4 text-gold/70" /> طلابنا المميزون
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((f) => (
              <div key={f.userId} className="rounded-2xl border border-gold/15 bg-gold/[0.04] p-4 text-center">
                <Sparkles className="mx-auto h-4 w-4 text-gold" />
                <p className="mt-2 text-sm font-extrabold text-zinc-100">{f.fullName}</p>
                <p className="mt-1 text-[11px] font-bold text-gold/80">{f.featuredKind ? FEATURED_KIND_LABELS[f.featuredKind] : "طالب مميز"}</p>
                {f.featuredNote && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">{f.featuredNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
