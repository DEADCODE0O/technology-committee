"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Sparkles,
  Flame,
  Swords,
  CalendarDays,
  CheckCircle2,
  Send,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Crown,
  Heart,
  ChevronLeft,
} from "lucide-react";
import { CharmHeartsGuideInline } from "@/components/ui/charm-hearts-guide-inline";

interface QuestItem {
  questId: string;
  count: number;
  completedAt: Date | null;
  quest: {
    title: string;
    description: string | null;
    icon: string;
    targetCount: number;
    xpReward: number;
    active: boolean;
  };
}

interface BadgeItem {
  badgeId: string;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

interface RewardItem {
  id: string;
  reward: {
    id: string;
    title: string;
    description: string | null;
    icon: string;
  };
}

interface AttendedItem {
  id: string;
  session: {
    id: string;
    title: string;
    startsAt: Date;
    activity: { title: string };
  };
}

interface TeamInfo {
  role: string;
  team: {
    id: string;
    name: string;
    icon: string;
    _count: { members: number };
    achievements: { id: string; title: string; icon: string }[];
  };
}

interface ProfileTabsProps {
  progress: {
    level: number;
    xp: number;
    attendedCount: number;
    tasksCompleted: number;
    streakWeeks: number;
    seasonName?: string | null;
    nextLevel?: number | null;
    progressToNext?: number;
  };
  badges: BadgeItem[];
  rewards: RewardItem[];
  activeQuests: QuestItem[];
  attendedList: AttendedItem[];
  teamMembership: TeamInfo | null;
  heartsVisible: boolean;
}

export function ProfileTabs({
  progress,
  badges,
  rewards,
  activeQuests,
  attendedList,
  teamMembership,
  heartsVisible,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "badges" | "activities" | "team">(
    "overview"
  );

  const tabs = [
    { id: "overview", label: "نظرة عامة والتقدم", icon: Trophy, badge: null },
    {
      id: "badges",
      label: "الأوسمة والمكافآت",
      icon: Sparkles,
      badge: badges.length + rewards.length > 0 ? `${badges.length + rewards.length}` : null,
    },
    {
      id: "activities",
      label: "الورش والحضور",
      icon: CalendarDays,
      badge: attendedList.length > 0 ? `${attendedList.length}` : null,
    },
    ...(teamMembership
      ? [{ id: "team", label: "فريق العمل", icon: Swords, badge: "عضو" }]
      : []),
  ] as const;

  return (
    <div className="space-y-6">
      {/* ── شريط التبويبات المتوافق 100% مع الموبايل (Segmented Control) ── */}
      <div className="flex rounded-2xl border border-border/80 bg-muted/30 p-1.5 backdrop-blur-sm overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-sm border border-gold/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-gold" : "text-muted-foreground"}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isActive
                      ? "bg-gold text-black"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── المحتوى حسب التبويب المختار ── */}
      {/* 1. تبويب نظرة عامة والتقدم */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* شريط التقدم للمستوى القادم */}
          {progress.nextLevel && (
            <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-bold mb-3">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Crown className="h-4 w-4 text-gold" />
                  المستوى الحالي: <strong className="text-gold font-black">{progress.level}</strong>
                </span>
                <span className="text-muted-foreground text-xs">
                  المستوى القادم: {progress.nextLevel} (باقي {100 - (progress.progressToNext || 0)}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted/60 p-0.5 border border-border/50">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-gold-light via-gold to-gold-deep transition-all duration-500 shadow-sm"
                  style={{ width: `${progress.progressToNext || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* التحديات والمهام النشطة */}
          <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
                <Flame className="h-5 w-5 text-amber-500" /> المهام والتحديات النشطة
              </h3>
              <span className="text-xs font-bold text-muted-foreground">
                {activeQuests.length} مهام متاحة
              </span>
            </div>

            {activeQuests.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeQuests.map((q) => {
                  const done = !!q.completedAt;
                  const pct = Math.min(100, Math.round((q.count / q.quest.targetCount) * 100));
                  return (
                    <div
                      key={q.questId}
                      className={`rounded-2xl border p-4 transition-all ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                          : "border-border bg-muted/20 hover:border-gold/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                          <span>{q.quest.icon}</span> {q.quest.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            done
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? "مكتمل ✓" : `${q.count}/${q.quest.targetCount}`}
                        </span>
                      </div>
                      {!done && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gold transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {q.quest.xpReward > 0 && (
                        <p className="mt-2 text-[10px] font-bold text-gold">
                          +{q.quest.xpReward} XP مكافأة
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لا توجد تحديات نشطة حالياً. ترقب الأنشطة القادمة!
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. تبويب الأوسمة والمكافآت */}
      {activeTab === "badges" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* الشارات المكتسبة */}
          <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
              <Sparkles className="h-5 w-5 text-gold" /> شارات التميز الأكاديمي ({badges.length})
            </h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {badges.map((b) => (
                  <div
                    key={b.badgeId}
                    className="flex flex-col items-center text-center gap-2 rounded-2xl border border-gold/25 bg-gold/[0.06] p-4 shadow-sm hover:-translate-y-0.5 transition-all"
                  >
                    <span className="text-3xl">{b.badge.icon}</span>
                    <div>
                      <p className="text-xs font-black text-gold-deep dark:text-gold-light">
                        {b.badge.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {b.badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لم تحصل على شارات بعد. شارك في ورش العمل والأنشطة للحصول على شارات التميز!
              </p>
            )}
          </div>

          {/* المكافآت الممنوحة */}
          {rewards.length > 0 && (
            <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
                <Crown className="h-5 w-5 text-emerald-500" /> المكافآت التقديرية ({rewards.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rewards.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 shadow-sm"
                  >
                    <span className="text-2xl shrink-0">{r.reward.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {r.reward.title}
                      </p>
                      {r.reward.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {r.reward.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* دليل قلوب التفاعل والمستويات */}
          {heartsVisible && (
            <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm">
              <CharmHeartsGuideInline level={progress.level} points={progress.xp} />
            </div>
          )}
        </div>
      )}

      {/* 3. تبويب الورش والأنشطة */}
      {activeTab === "activities" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
                <CalendarDays className="h-5 w-5 text-gold" /> أنشطة وورش حضرتها مؤخراً
              </h3>
              <span className="text-xs font-bold text-muted-foreground">
                {attendedList.length} نشاطاً
              </span>
            </div>

            {attendedList.length > 0 ? (
              <ul className="space-y-2.5">
                {attendedList.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/sessions/${r.session.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3.5 transition-all hover:border-gold/40 hover:bg-muted/40 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                          {r.session.activity.title} — {r.session.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Intl.DateTimeFormat("ar-EG", {
                            dateStyle: "medium",
                          }).format(new Date(r.session.startsAt))}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" /> حضر
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لم تسجل حضوراً في أي أنشطة بعد. تصفح الورش المتاحة وسجل الآن!
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4. تبويب فريق العمل */}
      {activeTab === "team" && teamMembership && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
              <Swords className="h-5 w-5 text-gold" /> فريقي التنفيذي
            </h3>
            <div className="flex items-center gap-4 rounded-2xl border border-gold/20 bg-gold/[0.04] p-5">
              <span className="text-4xl">{teamMembership.team.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-foreground">
                  {teamMembership.team.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {teamMembership.role === "LEADER" ? "👑 قائد الفريق · " : "عضو الفريق · "}
                  {teamMembership.team._count.members} أعضاء
                </p>
              </div>
            </div>

            {teamMembership.team.achievements.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-black text-muted-foreground mb-2">إنجازات الفريق:</h4>
                <div className="flex flex-wrap gap-2">
                  {teamMembership.team.achievements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-bold"
                    >
                      <span>{a.icon}</span>
                      <span>{a.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
