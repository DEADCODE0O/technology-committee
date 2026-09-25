import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  Trophy,
  CheckCircle2,
  Calendar,
  Eye,
  Shield,
  ArrowRight,
  Flame,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, getUnverifiedSessionUser } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";
import { getStudentRank, getAvatarFramesVisible, getCharmHeartsVisible } from "@/lib/platform";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { UserCharmHeart } from "@/components/ui/user-charm-heart";
import { LeveledName } from "@/components/ui/leveled-name";
import { ProfileSocialActions } from "@/components/social/profile-social-actions";
import { StudentShell } from "@/components/student/student-shell";
import { getStudentBadges } from "@/lib/student-badges";
import {
  GRADE_LABELS,
  SECTION_LABELS,
  GENDER_LABELS,
  TALENT_CATEGORY_LABELS,
} from "@/lib/constants";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const clean = decodeURIComponent(username).replace(/^@/, "");
  const target = await db.user.findFirst({
    where: {
      OR: [{ username: clean }, { id: clean }],
      status: "ACTIVE",
    },
    select: {
      displayName: true,
      username: true,
      profile: { select: { fullName: true } },
    },
  });

  const name = target?.displayName || target?.profile?.fullName || clean;
  return {
    title: `${name} (@${target?.username || clean}) — مجتمع اللجنة التكنولوجية`,
    description: `الملف الشخصي للطالب ${name} في منصة اللجنة التكنولوجية.`,
  };
}

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  const unverified = await getUnverifiedSessionUser();
  if (unverified) {
    redirect(`/register/verify?email=${encodeURIComponent(unverified.email)}&notice=need_verification`);
  }

  const { username } = await props.params;
  const clean = decodeURIComponent(username).replace(/^@/, "");

  const [currentUser, targetUser] = await Promise.all([
    getCurrentUser(),
    db.user.findFirst({
      where: {
        OR: [{ username: clean }, { id: clean }],
        status: "ACTIVE",
      },
      include: {
        profile: true,
        streaks: true,
        badges: {
          include: { badge: true },
          orderBy: { awardedAt: "desc" },
          take: 6,
        },
        talents: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
        },
        registrations: {
          where: {
            attendance: { some: { present: true } },
          },
          include: {
            session: {
              select: {
                title: true,
                activity: { select: { title: true } },
              },
            },
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!targetUser || !targetUser.profile) {
    notFound();
  }

  const [progress, rank, avatarFramesVisible, heartsVisible] = await Promise.all([
    getStudentProgress(targetUser.id),
    getStudentRank(targetUser.id),
    getAvatarFramesVisible(),
    getCharmHeartsVisible(),
  ]);

  // فحص علاقة الصداقة مع الزائر إن كان مسجلاً
  let friendship = null;
  if (currentUser && currentUser.id !== targetUser.id) {
    const f = await db.friendship.findFirst({
      where: {
        OR: [
          { senderId: currentUser.id, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: currentUser.id },
        ],
      },
    });
    if (f) {
      friendship = {
        id: f.id,
        status: f.status,
        isSender: f.senderId === currentUser.id,
      };
    }
  }

  const isSelf = currentUser?.id === targetUser.id;
  const isViewerAdmin = currentUser ? isAdminRole(currentUser.role) : false;
  const profile = targetUser.profile;
  const displayName = targetUser.displayName || profile.fullName;
  const isFemale = profile.gender === "FEMALE";

  const profileContent = (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* شريط أدوات الأدمن للمراقبة */}
      {isViewerAdmin && !isSelf && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-500 font-extrabold">
            <Shield className="h-4 w-4" />
            <span>لوحة المراقبة الإدارية السرية: أنت تستعرض ملف هذا الطالب بصلاحيات الإدارة العليا</span>
          </div>
          <Link
            href={`/admin/surveillance?studentId=${targetUser.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 font-extrabold text-black hover:bg-amber-400 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            فتح سجل المراقبة والمحادثات
          </Link>
        </div>
      )}

      {/* بطاقة الحساب الرئيسية */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-surface p-6 sm:p-8 shadow-xl">
        <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
            <AvatarWithFrame
              avatarUrl={targetUser.avatarUrl}
              name={displayName}
              frameId={targetUser.avatarFrameId}
              framesVisible={avatarFramesVisible}
              size="2xl"
              level={progress.level}
              showLevel
            />

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xl sm:text-2xl font-black text-foreground">
                  <LeveledName name={displayName} level={progress.level} size="lg" showLevelChip={false} />
                  <UserCharmHeart
                    level={progress.level}
                    points={progress.xp}
                    size="md"
                    showTitle
                    visible={heartsVisible}
                  />
                </h1>
              </div>

              {/* اسم المستخدم الفريد */}
              {targetUser.username && (
                <p className="mt-1 text-xs font-mono font-bold text-gold-light/90" dir="ltr">
                  @{targetUser.username}
                </p>
              )}

              {/* الشارات الأساسية: الفرقة والشعبة والجنس */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-gold" />
                  {GRADE_LABELS[profile.grade] ?? "—"} · {SECTION_LABELS[profile.section] ?? "—"}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                    isFemale
                      ? "border-pink-500/40 bg-pink-500/10 text-pink-500 dark:text-pink-400"
                      : "border-blue-500/40 bg-blue-500/10 text-blue-500 dark:text-blue-400"
                  }`}
                >
                  {GENDER_LABELS[profile.gender] ?? "—"}
                </span>

                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-extrabold text-gold">
                  المستوى {progress.level} · الترتيب #{rank}
                </span>

                {targetUser.streaks && targetUser.streaks.currentStreak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-extrabold text-orange-400 shadow-sm">
                    <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400 animate-pulse" />
                    استمرارية {targetUser.streaks.currentStreak} {targetUser.streaks.currentStreak === 1 ? "يوم" : "أيام"}
                  </span>
                )}
              </div>

              {/* النبذة التعريفية */}
              {targetUser.bio && (
                <p className="mt-3 text-xs text-muted-foreground max-w-md leading-6 whitespace-pre-line">
                  {targetUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* أزرار التفاعل الاجتماعي */}
          <div className="shrink-0 flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
            <ProfileSocialActions
              targetUserId={targetUser.id}
              isSelf={isSelf}
              isLoggedIn={!!currentUser}
              friendship={friendship}
            />
          </div>
        </div>
      </section>

      {/* إحصائيات الإنجاز السريعة */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "مجموع النقاط", value: `${progress.xp} XP`, icon: Trophy, highlight: true },
          { label: "المستوى الحالي", value: `المستوى ${progress.level}`, icon: Sparkles },
          { label: "الأنشطة المنجزة", value: `${targetUser.registrations.length} نشاط`, icon: CheckCircle2 },
          { label: "الشارات المكتسبة", value: `${targetUser.badges.length} شارة`, icon: Trophy },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 text-center ${
              item.highlight
                ? "border-gold/30 bg-gold/[0.06]"
                : "border-border bg-card"
            }`}
          >
            <item.icon className="mx-auto h-5 w-5 text-gold" />
            <p className="mt-1.5 text-lg font-extrabold text-foreground">{item.value}</p>
            <p className="text-[11px] font-bold text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </section>

      {/* الشارات المكتسبة */}
      {targetUser.badges.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-gold" />
            الشارات والجوائز التقديرية ({targetUser.badges.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {targetUser.badges.map((sb) => (
              <div
                key={sb.badge.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/80 bg-muted/30"
              >
                <span className="text-2xl">{sb.badge.icon}</span>
                <div>
                  <h4 className="text-xs font-extrabold text-foreground">{sb.badge.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{sb.badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* المواهب المعتمدة */}
      {targetUser.talents.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-gold" />
            المواهب والمهارات ({targetUser.talents.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {targetUser.talents.map((t) => (
              <div key={t.id} className="p-3.5 rounded-2xl border border-border/80 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-foreground">{t.name}</h4>
                  <span className="text-[10px] rounded-full bg-gold/10 text-gold px-2 py-0.5 font-bold">
                    {TALENT_CATEGORY_LABELS[t.category] ?? t.category}
                  </span>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-5">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* الأنشطة والورش التي حضرها */}
      {targetUser.registrations.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-gold" />
            سجل المشاركة في أنشطة وورش اللجنة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {targetUser.registrations.map((reg) => (
              <div
                key={reg.id}
                className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/80 bg-muted/20"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {reg.session.activity.title} — {reg.session.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // إذا كان الزائر طالباً مسجلاً، نغلفه داخل StudentShell
  if (currentUser && currentUser.role === "STUDENT") {
    const badges = await getStudentBadges(currentUser);
    return (
      <StudentShell
        user={{
          name: currentUser.displayName || currentUser.profile?.fullName || currentUser.email,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl,
          avatarFrameId: currentUser.avatarFrameId,
        }}
        active="messages"
        unreadCount={badges.unreadCount}
        openTaskCount={badges.openTaskCount}
        unreadMessagesCount={badges.unreadMessagesCount}
        pendingCount={badges.pendingCount}
      >
        {profileContent}
      </StudentShell>
    );
  }

  // إذا كان زائراً عاماً
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <Link
          href="/welcome"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all"
        >
          تسجيل الدخول
        </Link>
      </div>
      {profileContent}
    </div>
  );
}

