import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Flame,
  CalendarRange,
  GraduationCap,
  Swords,
  Sparkles,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { SitePageShell, EmptyState } from "@/components/platform/site-page-shell";
import { StudentShell } from "@/components/student/student-shell";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/platform";
import { getActiveSeason, getStudentProgress } from "@/lib/progress";
import { getCurrentUser } from "@/lib/auth";
import { getStudentBadges } from "@/lib/student-badges";
import { monthStart, semesterStart, GRADE_LABELS, SECTION_LABELS } from "@/lib/constants";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { LeveledName } from "@/components/ui/leveled-name";

export const dynamic = "force-dynamic";

type Tab = "overall" | "month" | "semester" | "season";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overall", label: "الترتيب الكلي", icon: <Crown className="h-4 w-4" /> },
  { key: "season", label: "الموسم النشط", icon: <Trophy className="h-4 w-4" /> },
  { key: "month", label: "هذا الشهر", icon: <Flame className="h-4 w-4" /> },
  { key: "semester", label: "هذا الترم", icon: <CalendarRange className="h-4 w-4" /> },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab =
    tab === "month" || tab === "semester" || tab === "season" ? tab : "overall";

  let season: Awaited<ReturnType<typeof getActiveSeason>> = null;
  let rows: LeaderboardEntry[] = [];
  let rankedTeams: { name: string; icon: string; color: string; points: number; members: number }[] = [];

  try {
    season = await getActiveSeason();
    const from =
      activeTab === "month" ? monthStart() : activeTab === "semester" ? semesterStart() : undefined;
    const seasonId = activeTab === "season" ? season?.id ?? "__none__" : undefined;
    rows = await getLeaderboard(from, 50, seasonId);

    // ترتيب الفرق
    const teamRows = await db.team.findMany({
      include: { _count: { select: { members: true } } },
    });
    const teamPoints = await db.teamPointEvent.groupBy({
      by: ["teamId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
    });
    const tMap = new Map(teamPoints.map((t) => [t.teamId, t._sum.points ?? 0]));
    rankedTeams = teamRows
      .map((t) => ({
        name: t.name,
        icon: t.icon,
        color: t.color,
        points: tMap.get(t.id) ?? 0,
        members: t._count.members,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  } catch (err) {
    console.error("LeaderboardPage data fetch error:", err);
  }

  // إعداد منصة التتويج بدقة مطلقة
  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const third = rows[2] ?? null;
  const remainingRows = rows.slice(3);

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

  const leaderboardContent = (
    <>
      {/* ── فترات الترتيب (التابات) ── */}
      <div className="mb-10 flex flex-wrap justify-center gap-2.5" role="tablist" aria-label="فترات الترتيب">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overall" ? "/leaderboard" : `/leaderboard?tab=${t.key}`}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-xs sm:text-sm font-extrabold transition-all shadow-sm ${
              activeTab === t.key
                ? "border-gold/60 bg-gold/[0.15] text-gold-deep dark:text-gold-light shadow-[0_0_20px_-5px_rgba(201,164,92,0.4)]"
                : "border-border bg-card text-muted-foreground hover:border-gold/30 hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8 text-gold" />}
          title="لا توجد نقاط مسجلة في هذه الفترة بعد"
          hint="احضر أول ورشة عمل أو أنجز مهمة لتظهر على لوحة المتصدرين وتنافس على المراكز الأولى."
        />
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              منصة التتويج الأولمبية الملكية (Podium)
              تتكيف بذكاء حسب عدد المتصدرين (طالب واحد، طالبان، أو ثلاثة فأكثر)
              ═══════════════════════════════════════════════════════════════ */}

          {/* حالة 1: طالب واحد فقط متصدر المنصة */}
          {rows.length === 1 && first && (
            <div className="mb-14 flex flex-col items-center">
              <div className="relative w-full max-w-md rounded-3xl border-2 border-gold/60 bg-gradient-to-b from-surface via-[#14120e] to-surface p-6 sm:p-8 text-center shadow-[0_0_60px_-10px_rgba(201,164,92,0.4)]">
                {/* توهج خلفي */}
                <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-20 h-44 opacity-80" />

                {/* تاج المركز الأول */}
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-gold-light shadow-lg">
                  <Crown className="h-8 w-8 text-gold" />
                </div>

                <span className="inline-block rounded-full bg-gold/20 px-3 py-1 text-[11px] font-black text-gold-light border border-gold/40 mb-4">
                  🥇 بطل المنصة — المركز الأول
                </span>

                {/* الصورة الرمزية بالإطار المتحرك */}
                <div className="my-3 flex justify-center">
                  <AvatarWithFrame
                    name={first.fullName}
                    avatarUrl={first.avatarUrl}
                    frameId={first.avatarFrameId}
                    size="2xl"
                    level={first.level}
                    showLevel
                  />
                </div>

                <h3 className="mt-3 flex items-center justify-center">
                  <LeveledName name={first.fullName} level={first.level} size="xl" showLevelChip={false} truncate={false} />
                </h3>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-400">
                  <GraduationCap className="h-3.5 w-3.5 text-gold" />
                  {GRADE_LABELS[first.grade] ?? "—"} — {SECTION_LABELS[first.section] ?? "—"}
                </p>

                {/* عداد النقاط */}
                <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/[0.08] py-3.5 px-6">
                  <span className="text-3xl font-black text-gold-deep dark:text-gold-light sm:text-4xl">
                    {first.points}
                  </span>
                  <span className="ms-2 text-xs font-extrabold text-gold/80">نقطة XP</span>
                </div>
              </div>
            </div>
          )}

          {/* حالة 2: طالبان اثنان على المنصة */}
          {rows.length === 2 && first && second && (
            <div className="mb-14 grid grid-cols-1 sm:grid-cols-2 items-end gap-6 max-w-2xl mx-auto">
              {/* المركز الثاني */}
              <div className="flex flex-col items-center">
                <div className="w-full rounded-3xl border border-zinc-500/40 bg-surface p-5 text-center shadow-lg">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-700/30 text-zinc-300">
                    <Medal className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-extrabold text-zinc-300 border border-zinc-600/40">
                    🥈 المركز الثاني
                  </span>
                  <div className="my-3 flex justify-center">
                    <AvatarWithFrame
                      name={second.fullName}
                      avatarUrl={second.avatarUrl}
                      frameId={second.avatarFrameId}
                      size="xl"
                      level={second.level}
                      showLevel
                    />
                  </div>
                  <h3 className="flex items-center justify-center">
                    <LeveledName name={second.fullName} level={second.level} size="md" showLevelChip={false} />
                  </h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{GRADE_LABELS[second.grade] ?? "—"}</p>
                  <p className="mt-3 text-xl font-black text-zinc-200">{second.points} <span className="text-xs font-bold text-zinc-500">نقطة</span></p>
                </div>
              </div>

              {/* المركز الأول */}
              <div className="flex flex-col items-center">
                <div className="w-full rounded-3xl border-2 border-gold/60 bg-gradient-to-b from-surface to-[#14120e] p-6 text-center shadow-[0_0_40px_-10px_rgba(201,164,92,0.4)]">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold-light">
                    <Crown className="h-7 w-7 text-gold" />
                  </div>
                  <span className="rounded-full bg-gold/20 px-3 py-1 text-[11px] font-black text-gold-light border border-gold/40">
                    🥇 المركز الأول
                  </span>
                  <div className="my-3 flex justify-center">
                    <AvatarWithFrame
                      name={first.fullName}
                      avatarUrl={first.avatarUrl}
                      frameId={first.avatarFrameId}
                      size="2xl"
                      level={first.level}
                      showLevel
                    />
                  </div>
                  <h3 className="flex items-center justify-center">
                    <LeveledName name={first.fullName} level={first.level} size="lg" showLevelChip={false} />
                  </h3>
                  <p className="mt-0.5 text-[11px] text-zinc-400">{GRADE_LABELS[first.grade] ?? "—"}</p>
                  <p className="mt-3 text-2xl font-black text-gold-deep dark:text-gold-light">{first.points} <span className="text-xs font-bold text-zinc-400">نقطة</span></p>
                </div>
              </div>
            </div>
          )}

          {/* حالة 3: ثلاثة طلاب فأكثر */}
          {rows.length >= 3 && first && second && third && (
            <>
              {/* 📱 عرض الهواتف الذكية (< sm): ترتيب فاخر ومريح دون تكدس */}
              <div className="sm:hidden space-y-4 mb-10" aria-label="أفضل ثلاثة طلاب على الموبايل">
                {/* 🥇 بطل المنصة - المركز الأول */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-gold/70 bg-gradient-to-b from-surface via-[#16130b] to-surface p-5 text-center shadow-[0_0_40px_-10px_rgba(201,164,92,0.45)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-black text-gold-light border border-gold/50 shadow-sm">
                      <Crown className="h-4 w-4 text-gold inline" />
                      🥇 بطل المنصة — المركز الأول
                    </span>
                    <span className="text-xl font-black text-gold-light">#1</span>
                  </div>

                  <div className="my-3 flex justify-center">
                    <AvatarWithFrame
                      name={first.fullName}
                      avatarUrl={first.avatarUrl}
                      frameId={first.avatarFrameId}
                      size="xl"
                      level={first.level}
                      showLevel
                    />
                  </div>

                  <h3 className="text-lg font-black text-zinc-50 flex items-center justify-center gap-1.5">
                    <LeveledName name={first.fullName} level={first.level} size="md" showLevelChip={false} />
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {GRADE_LABELS[first.grade] ?? "—"} — {SECTION_LABELS[first.section] ?? "—"}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gold/15 border border-gold/40 px-5 py-2">
                    <span className="text-2xl font-black text-gold-light">{first.points}</span>
                    <span className="text-xs font-bold text-zinc-400">نقطة تميز</span>
                  </div>
                </div>

                {/* 🥈 المركز الثاني و 🥉 المركز الثالث */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 🥈 المركز الثاني */}
                  <div className="rounded-2xl border border-zinc-500/40 bg-surface/90 p-3.5 text-center shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-extrabold text-zinc-300 border border-zinc-600/40">
                        🥈 المركز الثاني
                      </span>
                      <span className="text-sm font-black text-zinc-400">#2</span>
                    </div>

                    <div className="my-2 flex justify-center">
                      <AvatarWithFrame
                        name={second.fullName}
                        avatarUrl={second.avatarUrl}
                        frameId={second.avatarFrameId}
                        size="md"
                        level={second.level}
                        showLevel
                      />
                    </div>

                    <h3 className="text-xs font-bold truncate text-foreground">
                      {second.fullName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {GRADE_LABELS[second.grade] ?? "—"}
                    </p>
                    <p className="mt-2 text-sm font-black text-zinc-200">
                      {second.points} <span className="text-[10px] text-zinc-500">نقطة</span>
                    </p>
                  </div>

                  {/* 🥉 المركز الثالث */}
                  <div className="rounded-2xl border border-amber-700/40 bg-surface/90 p-3.5 text-center shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-700/40">
                        🥉 المركز الثالث
                      </span>
                      <span className="text-sm font-black text-amber-500">#3</span>
                    </div>

                    <div className="my-2 flex justify-center">
                      <AvatarWithFrame
                        name={third.fullName}
                        avatarUrl={third.avatarUrl}
                        frameId={third.avatarFrameId}
                        size="md"
                        level={third.level}
                        showLevel
                      />
                    </div>

                    <h3 className="text-xs font-bold truncate text-foreground">
                      {third.fullName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {GRADE_LABELS[third.grade] ?? "—"}
                    </p>
                    <p className="mt-2 text-sm font-black text-amber-400">
                      {third.points} <span className="text-[10px] text-zinc-500">نقطة</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 🖥️ عرض الشاشات الأكبر (>= sm): المنصة الأولمبية الكاملة 2 - 1 - 3 */}
              <div className="hidden sm:grid sm:grid-cols-3 items-end gap-6 max-w-4xl mx-auto mb-14" aria-label="أفضل ثلاثة طلاب">
              {/* 🥈 المركز الثاني (يسار الأول أولمبياً) */}
              <div className="flex flex-col items-center">
                <div className="w-full rounded-2xl sm:rounded-3xl border border-zinc-500/40 bg-surface/90 p-3 sm:p-5 text-center shadow-lg transition-transform hover:-translate-y-1">
                  <div className="mx-auto mb-1.5 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-zinc-700/30 text-zinc-300">
                    <Medal className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-zinc-300 border border-zinc-600/40">
                    المركز الثاني
                  </span>
                  <div className="my-2 sm:my-3 flex justify-center">
                    <AvatarWithFrame
                      name={second.fullName}
                      avatarUrl={second.avatarUrl}
                      frameId={second.avatarFrameId}
                      size="lg"
                      level={second.level}
                      showLevel
                    />
                  </div>
                  <h3 className="flex items-center justify-center">
                    <LeveledName name={second.fullName} level={second.level} size="sm" showLevelChip={false} />
                  </h3>
                  <p className="hidden sm:block mt-0.5 text-[11px] text-zinc-500">
                    {GRADE_LABELS[second.grade] ?? "—"} — {SECTION_LABELS[second.section] ?? "—"}
                  </p>
                  <p className="mt-2 text-sm sm:text-lg font-black text-zinc-200">
                    {second.points} <span className="text-[10px] sm:text-xs font-bold text-zinc-500">نقطة</span>
                  </p>
                </div>
                {/* منصة الارتفاع */}
                <div className="h-16 sm:h-24 w-full rounded-b-2xl border-x border-b border-zinc-500/30 bg-gradient-to-b from-zinc-800/50 to-zinc-900/80 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-zinc-400">#2</span>
                </div>
              </div>

              {/* 🥇 المركز الأول (المنتصف — مرفوع ومتوج) */}
              <div className="flex flex-col items-center">
                <div className="relative w-full rounded-2xl sm:rounded-3xl border-2 border-gold/70 bg-gradient-to-b from-surface via-[#16130b] to-surface p-3.5 sm:p-6 text-center shadow-[0_0_50px_-10px_rgba(201,164,92,0.45)] transition-transform hover:-translate-y-1">
                  <div className="mx-auto mb-1.5 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gold/25 text-gold-light shadow-md">
                    <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-gold" />
                  </div>
                  <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-gold-light border border-gold/50 shadow-sm">
                    🥇 المركز الأول
                  </span>
                  <div className="my-2 sm:my-3 flex justify-center">
                    <AvatarWithFrame
                      name={first.fullName}
                      avatarUrl={first.avatarUrl}
                      frameId={first.avatarFrameId}
                      size="xl"
                      level={first.level}
                      showLevel
                    />
                  </div>
                  <h3 className="truncate text-sm sm:text-lg font-black text-zinc-50 flex items-center justify-center gap-1.5">
                    <span>{first.fullName}</span>
                  </h3>
                  <p className="hidden sm:block mt-0.5 text-[11px] text-zinc-400">
                    {GRADE_LABELS[first.grade] ?? "—"} — {SECTION_LABELS[first.section] ?? "—"}
                  </p>
                  <p className="mt-2 text-base sm:text-2xl font-black text-gold-deep dark:text-gold-light">
                    {first.points} <span className="text-[10px] sm:text-xs font-bold text-zinc-400">نقطة</span>
                  </p>
                </div>
                {/* منصة الارتفاع الأكثر علواً */}
                <div className="h-24 sm:h-36 w-full rounded-b-2xl border-x-2 border-b-2 border-gold/50 bg-gradient-to-b from-gold/20 via-gold/10 to-night flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-4xl font-black text-gold-deep dark:text-gold-light">#1</span>
                  <span className="text-[10px] font-bold text-gold/70">البطل</span>
                </div>
              </div>

              {/* 🥉 المركز الثالث (يمين الأول أولمبياً) */}
              <div className="flex flex-col items-center">
                <div className="w-full rounded-2xl sm:rounded-3xl border border-amber-700/40 bg-surface/90 p-3 sm:p-5 text-center shadow-lg transition-transform hover:-translate-y-1">
                  <div className="mx-auto mb-1.5 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-900/30 text-amber-500">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-amber-400 border border-amber-700/40">
                    المركز الثالث
                  </span>
                  <div className="my-2 sm:my-3 flex justify-center">
                    <AvatarWithFrame
                      name={third.fullName}
                      avatarUrl={third.avatarUrl}
                      frameId={third.avatarFrameId}
                      size="lg"
                      level={third.level}
                      showLevel
                    />
                  </div>
                  <h3 className="flex items-center justify-center">
                    <LeveledName name={third.fullName} level={third.level} size="sm" showLevelChip={false} />
                  </h3>
                  <p className="hidden sm:block mt-0.5 text-[11px] text-zinc-500">
                    {GRADE_LABELS[third.grade] ?? "—"} — {SECTION_LABELS[third.section] ?? "—"}
                  </p>
                  <p className="mt-2 text-sm sm:text-lg font-black text-amber-400">
                    {third.points} <span className="text-[10px] sm:text-xs font-bold text-zinc-500">نقطة</span>
                  </p>
                </div>
                {/* منصة الارتفاع */}
                <div className="h-12 sm:h-16 w-full rounded-b-2xl border-x border-b border-amber-700/30 bg-gradient-to-b from-amber-950/40 to-zinc-900/80 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-500">#3</span>
                </div>
              </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              بقية قائمة المتصدرين (المراكز من 4 فما فوق)
              ═══════════════════════════════════════════════════════════════ */}
          {remainingRows.length > 0 && (
            <div className="mt-8 space-y-2.5">
              <h3 className="text-sm font-extrabold text-zinc-400 px-2 mb-3">
                بقية قائمة النخبة (المراكز التالية)
              </h3>
              <ol className="overflow-hidden rounded-3xl border border-white/[0.08] divide-y divide-white/[0.04]">
                {remainingRows.map((r, i) => {
                  const rank = i + 4;
                  const isTopTen = rank <= 10;
                  return (
                    <li
                      key={r.userId}
                      className={`flex items-center gap-3.5 sm:gap-5 px-4 py-3.5 sm:px-6 transition-colors hover:bg-white/[0.03] ${
                        i % 2 === 0 ? "bg-surface" : "bg-white/[0.01]"
                      }`}
                    >
                      {/* رقم الترتيب */}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-black ${
                          isTopTen
                            ? "bg-gold/[0.14] text-gold-deep dark:text-gold-light border border-gold/30"
                            : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
                        }`}
                      >
                        #{rank}
                      </span>

                      {/* الصورة الرمزية بالإطار النشط */}
                      <AvatarWithFrame
                        name={r.fullName}
                        avatarUrl={r.avatarUrl}
                        frameId={r.avatarFrameId}
                        size="md"
                        level={r.level}
                        showLevel
                      />

                      {/* الاسم وبيانات الفرقة */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <LeveledName name={r.fullName} level={r.level} size="sm" />
                          {isTopTen && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-[9px] font-extrabold text-gold-deep dark:text-gold-light">
                              <Sparkles className="h-2.5 w-2.5" />
                              Top 10
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] sm:text-xs text-zinc-500">
                          {GRADE_LABELS[r.grade] ?? "—"} — {SECTION_LABELS[r.section] ?? "—"}
                        </p>
                      </div>

                      {/* رصيد النقاط */}
                      <div className="shrink-0 text-end">
                        <span className="text-sm sm:text-base font-black text-gold-deep dark:text-gold-light">
                          {r.points}
                        </span>
                        <span className="ms-1 text-[10px] font-bold text-zinc-500">نقطة</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-zinc-500 leading-6">
            ✨ يتم تحديث الترتيب لحظياً مع كل نقطة مكتسبة — الترتيب التاريخي محفوظ لكل موسم، وفرصتك للصعود مستمرة!
          </p>
        </>
      )}

      {/* ── ترتيب الفرق التنافسية ── */}
      {rankedTeams.length > 0 && (
        <section className="mt-14" aria-labelledby="teams-rank">
          <h2
            id="teams-rank"
            className="mb-4 flex items-center justify-center gap-2 text-base font-extrabold text-zinc-200"
          >
            <Swords className="h-5 w-5 text-gold" /> ترتيب الفرق التنافسية
          </h2>
          <ol className="overflow-hidden rounded-3xl border border-white/[0.08] divide-y divide-white/[0.04]">
            {rankedTeams.map((t, i) => (
              <li
                key={t.name}
                className={`flex items-center gap-4 px-4 py-3.5 sm:px-6 transition-colors hover:bg-white/[0.03] ${
                  i % 2 === 0 ? "bg-surface" : "bg-white/[0.01]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-black ${
                    i < 3
                      ? "bg-gold/[0.14] text-gold-light border border-gold/30"
                      : "bg-white/[0.04] text-zinc-400"
                  }`}
                >
                  #{i + 1}
                </span>
                <span className="text-2xl" aria-hidden="true">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-extrabold text-zinc-100">{t.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{t.members} عضو نشط</p>
                </div>
                <div className="shrink-0 text-end">
                  <span className="text-sm sm:text-base font-black text-gold-light">{t.points}</span>
                  <span className="ms-1 text-[10px] font-bold text-zinc-500">نقطة</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );

  if (isStudent) {
    return (
      <StudentShell
        user={shellUser}
        active="leaderboard"
        unreadCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
        openTaskCount={openTaskCount}
        pendingCount={pendingCount}
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            <span className="text-gold-gradient">الطلاب المتصدرون</span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-2xl font-medium">
            كل مشاركة لك قيمة — حضور، إنجاز، وموهبة. اصنع سمعتك واعتلِ عرش المتصدرين.
          </p>
        </div>
        {leaderboardContent}
      </StudentShell>
    );
  }

  return (
    <SitePageShell
      title="الطلاب المتصدرون"
      subtitle="كل مشاركة لك قيمة — حضور، إنجاز، وموهبة. اصنع سمعتك واعتلِ عرش المتصدرين."
    >
      {leaderboardContent}
    </SitePageShell>
  );
}
