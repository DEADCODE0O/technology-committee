import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, QrCode, LogIn, Presentation } from "lucide-react";
import { getCurrentUser, getUnverifiedSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QrCheckinButton } from "@/components/platform/qr-checkin-button";
import { isAdminRole } from "@/lib/permissions";
import { getSessionState } from "@/lib/activities";

export const dynamic = "force-dynamic";

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const unverified = await getUnverifiedSessionUser();
  if (unverified) {
    redirect(`/register/verify?email=${encodeURIComponent(unverified.email)}&notice=need_verification`);
  }

  // كود الحضور خاص بكل جلسة (محاضرة/موعد ورشة)
  const session = await db.session.findUnique({
    where: { qrToken: token },
    include: { activity: true },
  });

  const user = await getCurrentUser();

  // زائر غير مسجل → صفحة دخول مع رجوع لنفس الصفحة
  if (!user) {
    redirect(`/login?returnTo=/checkin/${token}`);
  }

  // أدمن ماسح بالغلط → رسالة لطيفة
  if (isAdminRole(user.role)) {
    return (
      <CheckinLayout>
        <div className="rounded-3xl border border-white/[0.08] bg-surface p-8 text-center">
          <p className="text-lg font-extrabold text-zinc-100">كود الحضور للطلاب 🙂</p>
          <p className="mt-2 text-sm text-zinc-400">إنت داخل بحساب إداري — سجّل حضور الطلاب من لوحة الإدارة.</p>
          <Link href="/admin" className="mt-5 inline-flex h-11 items-center rounded-xl bg-gradient-to-b from-gold-light to-gold px-6 text-sm font-extrabold text-night">
            فتح لوحة الإدارة
          </Link>
        </div>
      </CheckinLayout>
    );
  }

  // ─── حالة الجلسة ───
  if (session) {
    if (session.status === "CANCELLED" || getSessionState(session) === "UPCOMING") {
      return (
        <CheckinLayout>
          <div className="rounded-3xl border border-red-500/25 bg-red-500/[0.06] p-8 text-center">
            <p className="text-lg font-extrabold text-red-300">{session.status === "CANCELLED" ? "هذه الجلسة ملغاة" : "الجلسة لم تبدأ بعد"}</p>
            <p className="mt-2 text-sm text-zinc-400">كود الحضور يعمل أثناء الجلسة أو بعدها.</p>
          </div>
        </CheckinLayout>
      );
    }

    const reg = await db.registration.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
      include: { attendance: true },
    });
    const already = reg?.attendance.some((a) => a.sessionId === session.id && a.present) === true;
    const notRegistered = !reg || reg.status !== "REGISTERED";

    return (
      <CheckinLayout>
        <div className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8">
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.1] text-gold">
              <Presentation className="h-8 w-8" />
            </span>
            <p className="text-xs font-bold text-gold-light">{session.activity.title}</p>
            <h1 className="mt-1 text-xl font-extrabold text-zinc-50 sm:text-2xl">{session.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">{session.location ?? ""}</p>
          </div>

          {already ? (
            <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/[0.08] p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
              <p className="mt-3 text-lg font-extrabold text-gold-light">حضورك مسجل ✦</p>
              <p className="mt-1 text-sm text-zinc-400">بالتوفيق في المحاضرة.</p>
            </div>
          ) : notRegistered ? (
            <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6 text-center">
              <LogIn className="mx-auto h-10 w-10 text-red-300" />
              <p className="mt-3 text-base font-extrabold text-red-300">أنت غير مسجل في هذه الجلسة</p>
              <p className="mt-1.5 text-sm leading-7 text-zinc-400">لازم تسجل في الجلسة الأول من صفحتها، وبعدين تمسح كود الحضور.</p>
              <Link href={`/sessions/${session.id}`} className="mt-4 inline-flex h-11 items-center rounded-xl border border-gold/40 bg-gold/[0.1] px-6 text-sm font-extrabold text-gold-light">
                صفحة التسجيل
              </Link>
            </div>
          ) : (
            <QrCheckinButton token={token} title={session.title} />
          )}
        </div>
      </CheckinLayout>
    );
  }

  // ─── كود غير صحيح ───
  return (
    <CheckinLayout>
      <div className="rounded-3xl border border-red-500/25 bg-red-500/[0.06] p-8 text-center">
        <QrCode className="mx-auto h-10 w-10 text-red-300" />
        <p className="mt-3 text-lg font-extrabold text-red-300">رابط حضور غير صحيح</p>
        <p className="mt-2 text-sm text-zinc-400">الكود اللي مسحته مش مرتبط بأي جلسة — اتأكد من كود الحضور.</p>
      </div>
    </CheckinLayout>
  );
}

function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="gold-glow-bg pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image src="/images/logo.png" alt="شعار اللجنة التكنولوجية" width={44} height={44} className="h-11 w-11" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-extrabold text-zinc-100">تسجيل حضور</span>
            <span className="font-latin text-[8px] tracking-[0.25em] text-gold/60">TECHNOLOGY COMMITTEE</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
