import {
  Mail, Phone, GraduationCap, Users, IdCard, HelpCircle, Heart,
  KeyRound, Palette, Sparkles, Trophy, Flame, Send, CheckCircle2, Swords, Gift, CalendarDays, Crown, LogIn,
} from "lucide-react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentShell } from "@/components/student/student-shell";
import { ChangePasswordForm } from "@/components/student/change-password-form";
import { getStudentProgress } from "@/lib/progress";
import { getStudentRank, getAvatarFramesVisible, getCharmHeartsVisible } from "@/lib/platform";
import { getAvatarFrame, TIER_CONFIG } from "@/lib/avatar-frames";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { UserCharmHeart } from "@/components/ui/user-charm-heart";
import { LeveledName } from "@/components/ui/leveled-name";
import { getAccountFlair } from "@/lib/account-style";
import { FrameWardrobeModal } from "@/components/profile/frame-wardrobe-modal";
import { AddTalentModal } from "@/components/student/add-talent-modal";
import { DeleteTalentButton } from "@/components/student/delete-talent-button";
import {
  GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, DISCOVERY_LABELS,
  JOIN_REASON_LABELS, TALENT_STATUS_LABELS, talentLabel, TALENT_CATEGORY_LABELS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function parseJoinReasons(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function ProfilePage() {
  const user = await requireStudent();
  const profile = user.profile!;

  const [
    talents,
    userRow,
    progress,
    rank,
    badges,
    rewards,
    questRows,
    teamMembership,
    attendedHistory,
    avatarFramesVisible,
    heartsVisible,
  ] = await Promise.all([
    db.talent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, avatarUrl: true, avatarFrameId: true, provider: true } }),
    getStudentProgress(user.id),
    getStudentRank(user.id),
    db.studentBadge.findMany({ where: { userId: user.id }, include: { badge: true }, orderBy: { awardedAt: "desc" } }),
    db.studentReward.findMany({
      where: { userId: user.id, revokedAt: null },
      include: { reward: true },
      orderBy: { awardedAt: "desc" },
    }),
    db.questProgress.findMany({
      where: { userId: user.id },
      include: { quest: true },
    }),
    db.teamMember.findFirst({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
            achievements: { orderBy: { awardedAt: "desc" }, take: 3 },
          },
        },
      },
    }),
    db.registration.findMany({
      where: { userId: user.id },
      include: {
        attendance: true,
        session: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            activity: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getAvatarFramesVisible(),
    getCharmHeartsVisible(),
  ]);
  const hasPassword = Boolean(userRow?.passwordHash);
  const joinReasons = parseJoinReasons(profile.joinReasons);
  const activeQuests = questRows.filter((q) => q.quest.active);
  const attendedList = attendedHistory.filter((r) => r.attendance.some((a: { present: boolean }) => a.present));
  const equippedFrame = getAvatarFrame(userRow?.avatarFrameId);
  const accountFlair = getAccountFlair(progress.level);

  return (
    <StudentShell
      user={{
        name: profile.fullName,
        email: user.email,
        avatarUrl: userRow?.avatarUrl,
        avatarFrameId: userRow?.avatarFrameId,
        level: progress.level,
      }}
      active="profile"
    >
      <div className="space-y-6">
        {/* ── بطاقة الحساب الملكية والإطار النشط ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-surface p-6 sm:p-7 shadow-lg">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-50" aria-hidden="true" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                name={profile.fullName}
                frameId={userRow?.avatarFrameId}
                size="2xl"
                level={progress.level}
                showLevel
              />
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <LeveledName name={profile.fullName} level={progress.level} size="lg" showLevelChip={false} truncate={false} />
                    <UserCharmHeart
                      level={progress.level}
                      points={progress.xp}
                      size="md"
                      showTitle
                      visible={heartsVisible}
                    />
                  </h1>
                </div>
                <p className="mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <GraduationCap className="h-4 w-4 text-gold" />
                  {GRADE_LABELS[profile.grade] ?? "—"} · {SECTION_LABELS[profile.section] ?? "—"}
                </p>
                {/* لقب المرتبة + وصف مرحلة مظهر الحساب المتدرج */}
                <p className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.07] dark:bg-gold/[0.08] px-3 py-1 text-[11px] font-extrabold text-gold-deep dark:text-gold-light">
                    <Crown className="h-3 w-3" />
                    {accountFlair.rankTitle} — مستوى {progress.level}
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 max-w-md leading-6">
                  {accountFlair.stageDescription}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center sm:items-end gap-2.5">
              <FrameWardrobeModal
                user={{
                  fullName: profile.fullName,
                  avatarUrl: user.avatarUrl,
                  accountAvatarUrl: user.accountAvatarUrl,
                  avatarFrameId: userRow?.avatarFrameId,
                  level: progress.level,
                  points: progress.xp,
                  provider: user.provider,
                }}
              />
              <span className="text-[11px] font-bold text-zinc-500">
                الترتيب العام: #{rank}
              </span>
            </div>
          </div>
        </section>

        {/* ── رحلتي: التقدم الكامل ── */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-surface p-6 sm:p-7" aria-labelledby="sec-journey">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-50" aria-hidden="true" />
          <div className="relative">
            <h2 id="sec-journey" className="flex items-center gap-2 text-lg font-extrabold text-zinc-50">
              <Trophy className="h-5 w-5 text-gold" /> رحلتي
              {progress.seasonName && (
                <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">{progress.seasonName}</span>
              )}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Trophy, label: "XP كلي", value: `${progress.xp}`, sub: `المستوى ${progress.level}`, highlight: true },
                { icon: CheckCircle2, label: "حضور", value: `${progress.attendedCount}`, sub: "نشاطًا", highlight: false },
                { icon: Send, label: "مهام مُنجزة", value: `${progress.tasksCompleted}`, sub: "مهمة", highlight: false },
                { icon: Flame, label: "استمرارية", value: `${progress.streakWeeks}`, sub: "أسبوعًا", highlight: false },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 ${
                  s.highlight
                    ? "border-emerald-300/80 dark:border-emerald-500/25 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-500/[0.08] dark:to-white/[0.02] shadow-[0_8px_22px_-10px_rgba(5,120,85,0.25)] dark:shadow-none"
                    : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]"
                }`}>
                  <s.icon className={`mx-auto h-5 w-5 ${s.highlight ? "text-emerald-600 dark:text-emerald-400" : "text-gold"}`} />
                  <p className={`mt-1.5 text-xl font-extrabold ${s.highlight ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-900 dark:text-zinc-100"}`}>{s.value}</p>
                  <p className={`text-[11px] font-bold ${s.highlight ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-zinc-600 dark:text-zinc-500"}`}>{s.label} · {s.sub}</p>
                </div>
              ))}
            </div>
            {progress.nextLevel && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-400">المستوى {progress.level}</span>
                  <span className="text-zinc-500">التالي: {progress.nextLevel} · #{rank} في الترتيب</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-gradient-to-l from-gold-light to-gold" style={{ width: `${progress.progressToNext}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── الإنجازات النشطة ── */}
        {activeQuests.length > 0 && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-quests">
            <h2 id="sec-quests" className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <Sparkles className="h-5 w-5 text-gold/80" /> تحدياتك النشطة
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeQuests.map((q) => {
                const done = !!q.completedAt;
                const pct = Math.min(100, Math.round((q.count / q.quest.targetCount) * 100));
                return (
                  <div key={q.questId} className={`rounded-2xl border p-4 ${done ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-zinc-100">{q.quest.icon} {q.quest.title}</p>
                      <span className={`shrink-0 text-[11px] font-extrabold ${done ? "text-emerald-300" : "text-zinc-500"}`}>
                        {done ? "اكتمل ✓" : `${q.count}/${q.quest.targetCount}`}
                      </span>
                    </div>
                    {!done && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {q.quest.xpReward > 0 && (
                      <p className="mt-2 text-[11px] font-bold text-gold/70">+{q.quest.xpReward} XP عند الإتمام</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── الشارات والمكافآت (دائمة الظهور دائماً) ── */}
        {(badges.length > 0 || rewards.length > 0) && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-badges">
            <h2 id="sec-badges" className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <Trophy className="h-5 w-5 text-gold/80" /> شاراتي ومكافآتي
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div key={b.badgeId} className="flex items-center gap-2.5 rounded-2xl border border-gold/20 bg-gold/[0.05] px-4 py-3" title={b.badge.description}>
                  <span className="text-xl">{b.badge.icon}</span>
                  <span className="text-sm font-extrabold text-gold-pale">{b.badge.name}</span>
                </div>
              ))}
              {rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3" title={r.reward.description ?? ""}>
                  <span className="text-xl">{r.reward.icon}</span>
                  <span className="text-sm font-extrabold text-emerald-200">{r.reward.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── فريقي ── */}
        {teamMembership && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-team">
            <h2 id="sec-team" className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <Swords className="h-5 w-5 text-gold/80" /> فريقي
            </h2>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <span className="text-2xl">{teamMembership.team.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-zinc-100">{teamMembership.team.name}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {teamMembership.role === "LEADER" ? "قائد الفريق · " : ""}{teamMembership.team._count.members} أعضاء
                </p>
              </div>
              {teamMembership.team.achievements.length > 0 && (
                <div className="hidden shrink-0 gap-1.5 sm:flex">
                  {teamMembership.team.achievements.map((a) => (
                    <span key={a.id} title={a.title} className="text-lg">{a.icon}</span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── سجل المشاركات ── */}
        {attendedList.length > 0 && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-history">
            <h2 id="sec-history" className="mb-4 flex items-center gap-2 text-base font-extrabold text-zinc-100">
              <CalendarDays className="h-5 w-5 text-gold/80" /> أنشطة حضرتها
            </h2>
            <ul className="space-y-2.5">
              {attendedList.slice(0, 10).map((r) => (
                <li key={r.id}>
                  <Link href={`/sessions/${r.session.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-gold/25">
                    <span className="min-w-0 truncate text-sm font-bold text-zinc-200">{r.session.activity.title} — {r.session.title}</span>
                    <span className="shrink-0 text-[11px] text-zinc-500">
                      {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(r.session.startsAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── بياناتك ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-personal">
            <h2 id="sec-personal" className="mb-5 text-lg font-extrabold text-zinc-50">بياناتك الأساسية</h2>
            <div className="space-y-3">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={user.email} mono />
              <InfoRow
                icon={<LogIn className="h-4 w-4" />}
                label="طريقة التسجيل"
                value={
                  userRow?.provider === "GOOGLE"
                    ? "مسجل بحساب Google"
                    : userRow?.provider === "FACEBOOK"
                    ? "مسجل بحساب Facebook"
                    : "بالبريد وكلمة السر"
                }
              />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="رقم الهاتف" value={profile.phone} mono />
              <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="الفرقة" value={GRADE_LABELS[profile.grade] ?? "—"} />
              <InfoRow icon={<Users className="h-4 w-4" />} label="الشعبة" value={SECTION_LABELS[profile.section] ?? "—"} />
              <InfoRow icon={<Users className="h-4 w-4" />} label="الجنس" value={GENDER_LABELS[profile.gender] ?? "—"} />
              {profile.studentCode && <InfoRow icon={<IdCard className="h-4 w-4" />} label="كود الطالب" value={profile.studentCode} mono />}
            </div>
            <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] leading-5 text-zinc-500">
              للتعديل على بياناتك الأساسية (فرقة/شعبة/هاتف) تواصل مع إدارة اللجنة — عشان تظل البيانات موثقة.
            </p>
          </section>

        <div className="space-y-6">
          {/* ── البيانات الإضافية ── */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-extra">
            <h2 id="sec-extra" className="mb-5 text-lg font-extrabold text-zinc-50">بيانات إضافية</h2>
            <div className="space-y-3">
              <InfoRow
                icon={<HelpCircle className="h-4 w-4" />}
                label="عرفت اللجنة عن طريق"
                value={profile.discoverySource ? DISCOVERY_LABELS[profile.discoverySource] ?? "—" : "—"}
              />
              {joinReasons.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-2.5 flex items-center gap-2 text-xs font-bold text-zinc-500">
                    <Heart className="h-3.5 w-3.5 text-gold/70" />
                    أسباب انضمامك
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {joinReasons.map((r) => (
                      <span key={r} className="rounded-full border border-gold/20 bg-gold/[0.06] px-3 py-1 text-[11px] font-bold text-gold-pale">
                        {r.startsWith("OTHER:") ? r.slice(6) : JOIN_REASON_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── المواهب ── */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-talents">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="sec-talents" className="flex items-center gap-2 text-lg font-extrabold text-zinc-50">
                  <Palette className="h-5 w-5 text-gold/80" />
                  مواهبك
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  أضف مواهبك ومهاراتك لتظهر في ملفك وتشارك في برامج وأنشطة اللجنة
                </p>
              </div>
              <AddTalentModal currentCount={talents.length} />
            </div>

            {talents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gold/20 bg-gold/[0.02] px-4 py-6 text-center">
                <p className="text-sm font-bold text-zinc-300">لا توجد مواهب مضافة لملفك بعد</p>
                <p className="mt-1 text-xs text-zinc-500">شاركنا مواهبك ومهاراتك البرمجية أو الفنية أو الرياضية</p>
                <div className="mt-4 flex justify-center">
                  <AddTalentModal currentCount={0} />
                </div>
              </div>
            )}
            {talents.length > 0 && (
              <ul className="space-y-3">
                {talents.map((t) => (
                  <li key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        {t.featured && <Sparkles className="h-4 w-4 text-gold" />}
                        {talentLabel(t.category, t.name, t.customName)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${
                          t.status === "VERIFIED"
                            ? "border border-gold/30 bg-gold/[0.1] text-gold-light"
                            : t.status === "PENDING"
                              ? "border border-zinc-600/30 bg-white/[0.02] text-zinc-400"
                              : "border border-red-500/25 bg-red-500/[0.06] text-red-300"
                        }`}>
                          {TALENT_STATUS_LABELS[t.status]}
                        </span>
                        <DeleteTalentButton talentId={t.id} />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{TALENT_CATEGORY_LABELS[t.category]}</p>
                    {t.description && <p className="mt-2 text-xs leading-6 text-zinc-400">{t.description}</p>}
                    {t.portfolioUrl && (
                      <a
                        href={t.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block font-mono text-[11px] text-gold/80 hover:text-gold hover:underline"
                        dir="ltr"
                      >
                        {t.portfolioUrl}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── تغيير كلمة السر ── */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-6" aria-labelledby="sec-pass">
            <h2 id="sec-pass" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-zinc-50">
              <KeyRound className="h-5 w-5 text-gold/80" />
              تغيير كلمة السر
            </h2>
            <ChangePasswordForm hasPassword={hasPassword} />
          </section>
        </div>
        </div>
      </div>
    </StudentShell>
  );
}

void Gift;

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
        <span className="text-gold/70">{icon}</span>
        {label}
      </span>
      <span dir={mono ? "ltr" : "rtl"} className={`truncate text-sm font-bold text-zinc-200 ${mono ? "text-start" : ""}`}>
        {value}
      </span>
    </div>
  );
}
