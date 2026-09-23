"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Users,
  UserCheck,
  UserX,
  Crown,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Search,
  MessageCircle,
  Shield,
  HelpCircle,
} from "lucide-react";
import {
  createSessionTeam,
  updateSessionTeam,
  deleteSessionTeam,
  addSessionTeamMember,
  removeSessionTeamMember,
  setSessionTeamLeader,
} from "@/actions/teams";
import { distributeStudentsToTeams, type DistributionResult } from "@/actions/team-distribute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon, TelegramIcon } from "@/components/platform/community-links-card";

export interface TeamMemberData {
  userId: string;
  role: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
    level?: number;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    profile: {
      fullName: string;
      phone: string;
      gender: string;
      grade: string;
      section: string;
    } | null;
  };
}

export interface SessionTeamData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  whatsappUrl: string | null;
  telegramUrl: string | null;
  members: TeamMemberData[];
}

export interface CandidateStudent {
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  grade?: string | null;
  section?: string | null;
  attended: boolean;
  teamId: string | null;
}

const PRESET_COLORS = [
  "#c9a45c", "#3b82f6", "#10b981", "#8b5cf6",
  "#f59e0b", "#ec4899", "#06b6d4", "#ef4444"
];

const PRESET_ICONS = ["🛡️", "⚡", "🚀", "🔥", "💎", "🌟", "🎯", "👑", "🦁", "🦅"];

export function SessionTeamsManager({
  sessionId,
  activityId,
  sessionTitle,
  activityTitle,
  teams,
  candidates,
}: {
  sessionId: string;
  activityId: string;
  sessionTitle: string;
  activityTitle: string;
  teams: SessionTeamData[];
  candidates: CandidateStudent[];
}) {
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SessionTeamData | null>(null);
  const [addingMemberToTeamId, setAddingMemberToTeamId] = useState<string | null>(null);

  // Auto-distribute form state
  const [distSource, setDistSource] = useState<"SESSION_ATTENDEES" | "SESSION">("SESSION_ATTENDEES");
  const [distMethod, setDistMethod] = useState<"BALANCED" | "RANDOM" | "ORDERED">("BALANCED");
  const [distTeamCount, setDistTeamCount] = useState(4);
  const [distPrefix, setDistPrefix] = useState("فريق");
  const [distPreview, setDistPreview] = useState<DistributionResult | null>(null);
  const [distWhatsappUrls, setDistWhatsappUrls] = useState<string[]>([]);

  // Manual create form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#c9a45c");
  const [newTeamIcon, setNewTeamIcon] = useState("🛡️");
  const [newTeamWhatsapp, setNewTeamWhatsapp] = useState("");
  const [newTeamTelegram, setNewTeamTelegram] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#c9a45c");
  const [editIcon, setEditIcon] = useState("🛡️");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editTelegram, setEditTelegram] = useState("");

  // Add member modal search
  const [addMemberSearch, setAddMemberSearch] = useState("");

  // Calculations
  const attendedCandidates = candidates.filter((c) => c.attended);
  const assignedUserIds = new Set(teams.flatMap((t) => t.members.map((m) => m.userId)));
  const unassignedAttended = attendedCandidates.filter((c) => !assignedUserIds.has(c.userId));
  const unassignedAll = candidates.filter((c) => !assignedUserIds.has(c.userId));

  // Handlers
  const handleOpenEdit = (team: SessionTeamData) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditColor(team.color || "#c9a45c");
    setEditIcon(team.icon || "🛡️");
    setEditWhatsapp(team.whatsappUrl || "");
    setEditTelegram(team.telegramUrl || "");
  };

  const handleSaveEdit = () => {
    if (!editingTeam) return;
    if (!editName.trim()) return toast.error("اسم الفريق مطلوب");
    startTransition(async () => {
      const res = await updateSessionTeam({
        teamId: editingTeam.id,
        sessionId,
        name: editName,
        color: editColor,
        icon: editIcon,
        whatsappUrl: editWhatsapp,
        telegramUrl: editTelegram,
      });
      if (res.ok) {
        toast.success("تم تحديث بيانات الفريق بنجاح");
        setEditingTeam(null);
      } else {
        toast.error(res.error || "تعذر تحديث الفريق");
      }
    });
  };

  const handleDeleteTeam = (team: SessionTeamData) => {
    if (!confirm(`هل أنت متأكد من حذف «${team.name}»؟ سيتم إلغاء تعيين أعضائه.`)) return;
    startTransition(async () => {
      const res = await deleteSessionTeam({ teamId: team.id, sessionId });
      if (res.ok) {
        toast.success("تم حذف الفريق بنجاح");
      } else {
        toast.error(res.error || "تعذر حذف الفريق");
      }
    });
  };

  const handleCreateManualTeam = () => {
    if (!newTeamName.trim()) return toast.error("اسم الفريق مطلوب");
    startTransition(async () => {
      const res = await createSessionTeam({
        sessionId,
        activityId,
        name: newTeamName,
        color: newTeamColor,
        icon: newTeamIcon,
        whatsappUrl: newTeamWhatsapp,
        telegramUrl: newTeamTelegram,
        memberUserIds: selectedUserIds,
        leaderUserId: selectedUserIds[0],
      });
      if (res.ok) {
        toast.success("تم إنشاء الفريق بنجاح");
        setIsCreateOpen(false);
        setNewTeamName("");
        setSelectedUserIds([]);
        setNewTeamWhatsapp("");
        setNewTeamTelegram("");
      } else {
        toast.error(res.error || "تعذر إنشاء الفريق");
      }
    });
  };

  const handleRemoveMember = (teamId: string, userId: string, memberName: string) => {
    if (!confirm(`إزالة ${memberName} من الفريق؟`)) return;
    startTransition(async () => {
      const res = await removeSessionTeamMember({ teamId, sessionId, userId });
      if (res.ok) toast.success("تمت إزالة العضو");
      else toast.error(res.error || "تعذر إزالة العضو");
    });
  };

  const handleSetLeader = (teamId: string, userId: string) => {
    startTransition(async () => {
      const res = await setSessionTeamLeader({ teamId, sessionId, userId });
      if (res.ok) toast.success("تم تعيين قائد الفريق");
      else toast.error(res.error || "تعذر تعيين القائد");
    });
  };

  const handleAddMember = (teamId: string, userId: string) => {
    startTransition(async () => {
      const res = await addSessionTeamMember({ teamId, sessionId, userId });
      if (res.ok) {
        toast.success("تمت إضافة العضو للفريق");
        setAddingMemberToTeamId(null);
      } else {
        toast.error(res.error || "تعذر إضافة العضو");
      }
    });
  };

  // Auto-distribute handlers
  const handleDistributePreview = () => {
    startTransition(async () => {
      const res = await distributeStudentsToTeams(
        {
          source: distSource,
          sessionId,
          activityId,
          method: distMethod,
          targetMode: "NEW_TEAMS",
          newTeamCount: distTeamCount,
          newTeamPrefix: distPrefix,
          whatsappUrls: distWhatsappUrls,
          constraints: { genderBalance: distMethod === "BALANCED" },
        },
        true // dry run
      );
      if (res.ok) {
        setDistPreview(res);
        toast.info(res.message || "تم تجهيز المعاينة");
      } else {
        toast.error(res.error || "تعذر إعداد المعاينة");
      }
    });
  };

  const handleDistributeExecute = () => {
    if (!confirm(`هل أنت متأكد من إنشاء ${distTeamCount} فرق وتوزيع الطلاب؟`)) return;
    startTransition(async () => {
      const res = await distributeStudentsToTeams(
        {
          source: distSource,
          sessionId,
          activityId,
          method: distMethod,
          targetMode: "NEW_TEAMS",
          newTeamCount: distTeamCount,
          newTeamPrefix: distPrefix,
          whatsappUrls: distWhatsappUrls,
          constraints: { genderBalance: distMethod === "BALANCED" },
        },
        false // real
      );
      if (res.ok) {
        toast.success(res.message || "تم توزيع الطلاب بنجاح!");
        setIsDistributeOpen(false);
        setDistPreview(null);
      } else {
        toast.error(res.error || "حدث خطأ أثناء التوزيع");
      }
    });
  };

  // Copy WhatsApp rosters
  const handleCopyForWhatsApp = () => {
    if (teams.length === 0) return toast.error("لا توجد فرق لنسخها");
    let text = `📢 *توزيع الفرق — ${sessionTitle}*\n`;
    text += `ورشة: ${activityTitle}\n`;
    text += `═══════════════════════\n\n`;

    for (const team of teams) {
      text += `${team.icon} *${team.name}*\n`;
      if (team.whatsappUrl) {
        text += `💬 رابط جروب الواتساب: ${team.whatsappUrl}\n`;
      }
      text += `الأعضاء (${team.members.length}):\n`;
      team.members.forEach((m, idx) => {
        const name = m.user.profile?.fullName || m.user.displayName || m.user.email;
        const leaderTag = m.role === "LEADER" ? " (قائد الفريق 👑)" : "";
        text += `  ${idx + 1}. ${name}${leaderTag}\n`;
      });
      text += `\n`;
    }

    navigator.clipboard.writeText(text);
    toast.success("تم نسخ كشف الفرق مع روابط الواتساب لمشاركتها!");
  };

  return (
    <div className="space-y-6">
      {/* ── الشريط الإحصائي العلوي ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">عدد الفرق النشطة</p>
          <p className="mt-1 text-2xl font-black text-foreground">{teams.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">الطلاب الموزعون</p>
          <p className="mt-1 text-2xl font-black text-gold-deep dark:text-gold-light">
            {assignedUserIds.size} <span className="text-xs font-bold text-muted-foreground">طالب</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">حاضرون بلا فريق</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {unassignedAttended.length} <span className="text-xs font-bold text-muted-foreground">طالب</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">إجمالي الحاضرين</p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {attendedCandidates.length} <span className="text-xs font-bold text-muted-foreground">حاضر</span>
          </p>
        </div>
      </div>

      {/* ── أزرار التحكم والعمليات ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>🛡️ فرق العمل للورشة</span>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-light">
              {teams.length} فرق
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            توزيع الطلاب الحاضرين عشوائياً أو يدوياً، مع إنشاء جروب واتساب لكل فريق وتحديد قادة الفرق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setIsDistributeOpen(true);
              setDistPreview(null);
              // اقتراح عدد فرق بناء على عدد الحاضرين (كل 4 أو 5 طلاب بفريق)
              const count = Math.max(2, Math.round(attendedCandidates.length / 5)) || 3;
              setDistTeamCount(count);
            }}
            className="rounded-xl bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-extrabold text-xs h-10 gap-1.5 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            توزيع عشوائي ذكي
          </Button>

          <Button
            onClick={() => {
              setIsCreateOpen(true);
              setSelectedUserIds([]);
              setNewTeamName(`فريق ${teams.length + 1}`);
            }}
            variant="outline"
            className="rounded-xl border-border hover:bg-muted font-bold text-xs h-10 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            إنشاء فريق يدوي
          </Button>

          {teams.length > 0 && (
            <Button
              onClick={handleCopyForWhatsApp}
              variant="outline"
              className="rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs h-10 gap-1.5"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              نسخ الفرق للواتساب
            </Button>
          )}
        </div>
      </div>

      {/* ── بطاقات الفرق ── */}
      {teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 text-gold-light mb-4">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-foreground">لم يتم إنشاء أي فرق لهذه الجلسة بعد</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            اضغط على «توزيع عشوائي ذكي» لتقسيم الطلاب الحاضرين تلقائياً إلى فرق متوازنة، أو أنشئ فرقاً يدوياً وحدد روابط مجموعات الواتساب الخاصة بها.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              onClick={() => {
                setIsDistributeOpen(true);
                setDistPreview(null);
                setDistTeamCount(Math.max(2, Math.round(attendedCandidates.length / 5)) || 3);
              }}
              className="rounded-xl bg-gold text-night font-bold text-xs h-10 gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              بدء التوزيع الذكي للحاضرين
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const leader = team.members.find((m) => m.role === "LEADER");
            return (
              <div
                key={team.id}
                className="group relative flex flex-col justify-between rounded-3xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                style={{ borderColor: `${team.color}40` }}
              >
                {/* رأس بطاقة الفريق */}
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
                        style={{ backgroundColor: `${team.color}20`, border: `1px solid ${team.color}50` }}
                      >
                        {team.icon || "🛡️"}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-foreground truncate">{team.name}</h3>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          <span>{team.members.length} أعضاء</span>
                          {leader && (
                            <span className="text-gold-deep dark:text-gold-light font-bold">
                              · القائد: {leader.user.profile?.fullName || leader.user.displayName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(team)}
                        title="تعديل الفريق ورابط الجروب"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        title="حذف الفريق"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* رابط جروب الواتساب والتليجرام */}
                  <div className="my-3 space-y-1.5">
                    {team.whatsappUrl ? (
                      <a
                        href={team.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <WhatsAppIcon className="h-4 w-4" />
                          جروب واتساب الفريق
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleOpenEdit(team)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-gold/50 hover:text-gold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة رابط جروب واتساب للفريق
                      </button>
                    )}

                    {team.telegramUrl && (
                      <a
                        href={team.telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold text-sky-500 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <TelegramIcon className="h-3.5 w-3.5" />
                          قناة تليجرام
                        </span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    )}
                  </div>

                  {/* قائمة الأعضاء */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      أعضاء الفريق ({team.members.length})
                    </p>
                    {team.members.length === 0 ? (
                      <p className="text-center py-4 text-xs text-muted-foreground">لا يوجد أعضاء في هذا الفريق بعد</p>
                    ) : (
                      team.members.map((m) => {
                        const cand = candidates.find((c) => c.userId === m.userId);
                        const isLeader = m.role === "LEADER";
                        const name = m.user.profile?.fullName || m.user.displayName || m.user.email;
                        return (
                          <div
                            key={m.userId}
                            className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                              isLeader
                                ? "bg-gold/10 border border-gold/30 text-foreground"
                                : "bg-muted/40 hover:bg-muted/70 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs">{cand?.gender === "FEMALE" ? "👩" : "👨"}</span>
                              <div className="min-w-0">
                                <p className="font-bold truncate text-[11px] leading-snug flex items-center gap-1">
                                  <span>{name}</span>
                                  {isLeader && <Crown className="h-3 w-3 text-gold inline shrink-0" />}
                                </p>
                                <p className="text-[9px] text-muted-foreground truncate">
                                  {cand?.attended ? (
                                    <span className="text-emerald-500 font-bold">حضر الجلسة ✓</span>
                                  ) : (
                                    <span>مسجل</span>
                                  )}
                                  {cand?.section ? ` · ${cand.section}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isLeader && (
                                <button
                                  onClick={() => handleSetLeader(team.id, m.userId)}
                                  title="تعيين كقائد للفريق"
                                  className="rounded p-1 text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                                >
                                  <Crown className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(team.id, m.userId, name)}
                                title="إزالة من الفريق"
                                className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* زر إضافة عضو */}
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    onClick={() => {
                      setAddingMemberToTeamId(team.id);
                      setAddMemberSearch("");
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs font-bold text-muted-foreground hover:text-foreground h-8 gap-1.5 justify-center rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة عضو للفريق
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── نافذة التوزيع العشوائي الذكي ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isDistributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">توزيع الطلاب الذكي للورشة</h3>
                  <p className="text-xs text-muted-foreground">
                    تقسيم ذكي للطلاب على فرق متكافئة مع روابط الواتساب
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDistributeOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* الخيارات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* نطاق الطلاب */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">نطاق الطلاب المستهدفين</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setDistSource("SESSION_ATTENDEES"); setDistPreview(null); }}
                    className={`rounded-xl border p-2.5 text-xs text-right font-bold transition-all ${
                      distSource === "SESSION_ATTENDEES"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" />
                      <span>الحاضرون فقط ({attendedCandidates.length})</span>
                    </div>
                    <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">موصى به أثناء الورشة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setDistSource("SESSION"); setDistPreview(null); }}
                    className={`rounded-xl border p-2.5 text-xs text-right font-bold transition-all ${
                      distSource === "SESSION"
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>جميع المسجلين ({candidates.length})</span>
                    </div>
                    <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">قبل بدء الورشة</span>
                  </button>
                </div>
              </div>

              {/* خوارزمية التوزيع */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">معيار التوزيع</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setDistMethod("BALANCED"); setDistPreview(null); }}
                    className={`rounded-xl border py-2 text-xs text-center font-bold transition-all ${
                      distMethod === "BALANCED"
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    متوازن جندرياً ✨
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDistMethod("RANDOM"); setDistPreview(null); }}
                    className={`rounded-xl border py-2 text-xs text-center font-bold transition-all ${
                      distMethod === "RANDOM"
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    عشوائي بحت 🎲
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDistMethod("ORDERED"); setDistPreview(null); }}
                    className={`rounded-xl border py-2 text-xs text-center font-bold transition-all ${
                      distMethod === "ORDERED"
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    أبجدي 🔤
                  </button>
                </div>
              </div>

              {/* عدد الفرق */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">عدد الفرق المطلوبة</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={distTeamCount}
                  onChange={(e) => {
                    setDistTeamCount(Math.max(2, parseInt(e.target.value) || 2));
                    setDistPreview(null);
                  }}
                  className="h-10 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  تقريباً {Math.ceil((distSource === "SESSION_ATTENDEES" ? attendedCandidates.length : candidates.length) / distTeamCount || 1)} طالب بكل فريق
                </p>
              </div>

              {/* بادئة التسمية */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">بادئة اسم الفريق</Label>
                <Input
                  value={distPrefix}
                  onChange={(e) => { setDistPrefix(e.target.value); setDistPreview(null); }}
                  placeholder="فريق / مجموعة / Team"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* معاينة التوزيع */}
            {distPreview && distPreview.rosters && (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 max-h-72 overflow-y-auto">
                <p className="text-xs font-extrabold text-foreground flex items-center justify-between">
                  <span>معاينة الفرق الناتجة ({distPreview.teamsCount} فرق)</span>
                  <span className="text-[11px] text-emerald-500 font-normal">جاهز للاعتماد ✓</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {distPreview.rosters.map((roster, idx) => (
                    <div key={roster.teamId} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-foreground">{roster.teamName}</span>
                        <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 font-bold">
                          {roster.members.length} أعضاء
                        </span>
                      </div>

                      {/* إدخال رابط واتساب اختياري أثناء المعاينة */}
                      <Input
                        dir="ltr"
                        placeholder="رابط جروب واتساب (اختياري)..."
                        value={distWhatsappUrls[idx] || ""}
                        onChange={(e) => {
                          const updated = [...distWhatsappUrls];
                          updated[idx] = e.target.value;
                          setDistWhatsappUrls(updated);
                        }}
                        className="h-8 text-[11px] bg-background"
                      />

                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        {roster.members.map((m, mIdx) => (
                          <div key={m.id} className="flex items-center justify-between">
                            <span className="truncate">
                              {mIdx === 0 ? "👑 " : "• "}
                              {m.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground shrink-0">
                              {m.gender === "FEMALE" ? "أنثى" : "ذكر"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* أزرار الإجراء */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDistributeOpen(false)}
                className="rounded-xl text-xs h-10"
              >
                إلغاء
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDistributePreview}
                  disabled={isPending}
                  variant="outline"
                  className="rounded-xl text-xs h-10 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 font-bold"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إعداد / تجديد المعاينة 🔄"}
                </Button>

                {distPreview && (
                  <Button
                    onClick={handleDistributeExecute}
                    disabled={isPending}
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs h-10 shadow-sm"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "اعتماد وإنشاء الفرق الآن 🚀"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── نافذة إنشاء فريق يدوي ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">إنشاء فريق يدوي للورشة</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground">اسم الفريق</Label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="مثال: فريق الذكاء الاصطناعي 1"
                  className="h-10 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-foreground">الأيقونة</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PRESET_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewTeamIcon(ic)}
                        className={`h-8 w-8 rounded-lg text-sm transition-all ${
                          newTeamIcon === ic ? "bg-gold/20 border-2 border-gold scale-110" : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">اللون</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewTeamColor(col)}
                        className={`h-8 w-8 rounded-lg transition-all ${
                          newTeamColor === col ? "border-2 border-foreground scale-110" : ""
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">رابط مجموعة WhatsApp للفريق (اختياري)</Label>
                <Input
                  dir="ltr"
                  value={newTeamWhatsapp}
                  onChange={(e) => setNewTeamWhatsapp(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="h-10 text-xs mt-1"
                />
              </div>

              {/* اختيار الطلاب */}
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>اختيار أعضاء الفريق ({selectedUserIds.length} محددون)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">أول طالب يُعيّن كقائد افتراضياً</span>
                </Label>

                <div className="relative mt-1 mb-2">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="بحث في الطلاب الحاضرين أو المسجلين..."
                    className="h-9 pr-9 text-xs"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border p-2 bg-muted/20">
                  {candidates
                    .filter((c) =>
                      !manualSearch.trim() ||
                      c.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
                      (c.phone && c.phone.includes(manualSearch))
                    )
                    .map((c) => {
                      const isSelected = selectedUserIds.includes(c.userId);
                      const isAlreadyAssigned = assignedUserIds.has(c.userId);
                      return (
                        <label
                          key={c.userId}
                          className={`flex items-center justify-between rounded-lg p-2 text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-gold/15 border border-gold/30"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedUserIds((p) => [...p, c.userId]);
                                else setSelectedUserIds((p) => p.filter((id) => id !== c.userId));
                              }}
                              className="rounded border-border"
                            />
                            <div>
                              <p className="font-bold">{c.fullName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {c.phone} · {c.gender === "FEMALE" ? "أنثى" : "ذكر"}
                                {isAlreadyAssigned && " · (موزع في فريق آخر)"}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            c.attended ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                          }`}>
                            {c.attended ? "حضر الجلسة ✓" : "مسجل"}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-xs h-10">إلغاء</Button>
              <Button
                onClick={handleCreateManualTeam}
                disabled={isPending || !newTeamName.trim()}
                className="rounded-xl bg-gold text-night font-bold text-xs h-10"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء الفريق"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── نافذة تعديل بيانات ورابط الفريق ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">تعديل {editingTeam.name}</h3>
              <button onClick={() => setEditingTeam(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground">اسم الفريق</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-foreground">الأيقونة</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PRESET_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setEditIcon(ic)}
                        className={`h-8 w-8 rounded-lg text-sm transition-all ${
                          editIcon === ic ? "bg-gold/20 border-2 border-gold scale-110" : "bg-muted"
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">اللون</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setEditColor(col)}
                        className={`h-8 w-8 rounded-lg transition-all ${
                          editColor === col ? "border-2 border-foreground scale-110" : ""
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">رابط مجموعة WhatsApp للفريق</Label>
                <Input
                  dir="ltr"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="h-10 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">رابط قناة/مجموعة Telegram للفريق (اختياري)</Label>
                <Input
                  dir="ltr"
                  value={editTelegram}
                  onChange={(e) => setEditTelegram(e.target.value)}
                  placeholder="https://t.me/..."
                  className="h-10 text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setEditingTeam(null)} className="rounded-xl text-xs h-10">إلغاء</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isPending || !editName.trim()}
                className="rounded-xl bg-gold text-night font-bold text-xs h-10"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── نافذة إضافة عضو لفريق محدد ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {addingMemberToTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">إضافة طالب إلى الفريق</h3>
              <button onClick={() => setAddingMemberToTeamId(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="h-9 pr-9 text-xs"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl border border-border p-2 bg-muted/20">
              {candidates
                .filter((c) =>
                  !addMemberSearch.trim() ||
                  c.fullName.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                  (c.phone && c.phone.includes(addMemberSearch))
                )
                .map((c) => {
                  const targetTeam = teams.find((t) => t.id === addingMemberToTeamId);
                  const isAlreadyInThisTeam = targetTeam?.members.some((m) => m.userId === c.userId);
                  return (
                    <div
                      key={c.userId}
                      className="flex items-center justify-between rounded-lg p-2 text-xs bg-card hover:bg-muted transition-colors border border-border"
                    >
                      <div>
                        <p className="font-bold">{c.fullName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.phone} · {c.attended ? "حاضر ✓" : "مسجل"}
                        </p>
                      </div>

                      {isAlreadyInThisTeam ? (
                        <span className="text-[10px] text-muted-foreground">موجود بالفعل</span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleAddMember(addingMemberToTeamId, c.userId)}
                          className="h-7 text-[11px] rounded-lg bg-gold text-night font-bold"
                        >
                          إضافة
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="outline" onClick={() => setAddingMemberToTeamId(null)} className="rounded-xl text-xs h-9">إغلاق</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
