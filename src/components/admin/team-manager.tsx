"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Users, Zap, Award, Crown, UserMinus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveTeam, deleteTeam, setTeamMember, removeTeamMember, addTeamPoints, addTeamAchievement } from "@/actions/teams";
import { SmartTeamDistributeModal } from "./smart-team-distribute-modal";

// ═══════════════════════════════════════════════════════════════
//  مدير الفرق — إنشاء · أعضاء (قائد واحد) · نقاط · إنجازات
// ═══════════════════════════════════════════════════════════════

export type TeamRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  points: number;
  achievements: { id: string; title: string; icon: string }[];
  members: { userId: string; name: string; grade: string; role: string }[];
};

export type StudentOption = { id: string; name: string; grade: string };

export function TeamManager({
  teams,
  students,
  canManage,
}: {
  teams: TeamRow[];
  students: StudentOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // إنشاء فريق
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛡️");
  const [description, setDescription] = useState("");

  // إضافة عضو
  const [pointsTeam, setPointsTeam] = useState("");
  const [pointsValue, setPointsValue] = useState("10");
  const [pointsReason, setPointsReason] = useState("");

  // إنجاز
  const [achTeam, setAchTeam] = useState("");
  const [achTitle, setAchTitle] = useState("");

  // توزيع ذكي
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? (success ? `✓ ${success}` : "✓ تم") : (res.error ?? "تعذر التنفيذ"));
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-zinc-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.1] text-gold">
              <Users className="h-5 w-5" />
            </span>
            الفرق
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{teams.length} فريقًا · ترتيب الفرق يظهر في صفحة المتصدرين</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDistributeModalOpen(true)}
              className="h-11 rounded-xl bg-purple-600 font-extrabold text-white hover:bg-purple-500 shadow-md"
            >
              <Sparkles className="h-4 w-4" /> التوزيع الذكي للطلاب
            </Button>
            <Button onClick={() => setCreating((c) => !c)} className="h-11 rounded-xl bg-gold font-extrabold text-night hover:bg-gold-light">
              <Plus className="h-4 w-4" /> فريق جديد
            </Button>
          </div>
        )}
      </div>

      <SmartTeamDistributeModal
        isOpen={distributeModalOpen}
        onClose={() => setDistributeModalOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {msg && <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm font-bold text-gold-light">{msg}</p>}

      {/* إنشاء فريق */}
      {creating && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveTeam({ name, icon, description }), `أُنشئ فريق «${name}»`);
            setName(""); setIcon("🛡️"); setDescription(""); setCreating(false);
          }}
          className="grid gap-4 rounded-3xl border border-gold/25 bg-surface p-5 md:grid-cols-[100px_1fr_2fr_auto]"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">الأيقونة</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="h-11 rounded-xl text-center text-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">اسم الفريق *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثال: فريق الذكاء الاصطناعي" className="h-11 rounded-xl" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">الوصف</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} placeholder="وصف مختصر (اختياري)" className="h-11 rounded-xl" />
          </div>
          <Button type="submit" disabled={pending} className="h-11 self-end rounded-xl bg-gold font-extrabold text-night">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إنشاء
          </Button>
        </form>
      )}

      {/* الفرق */}
      {teams.length === 0 && (
        <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.06] text-2xl">🛡️</span>
          <h2 className="mt-4 text-base font-extrabold text-zinc-200">لا فرق بعد</h2>
          <p className="mt-1.5 text-sm text-zinc-500">أنشئ فريقًا وأضف الأعضاء — الفرق تتنافس بترتيب خاص في المتصدرين</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {teams.map((t) => (
          <article key={t.id} className="rounded-3xl border border-white/[0.07] bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-zinc-100">{t.name}</h3>
                  <p className="text-[11px] text-zinc-500">{t.members.length} أعضاء · {t.points} نقطة</p>
                </div>
              </div>
              {canManage && (
                <Button
                  onClick={() => confirm(`حذف فريق «${t.name}»؟`) && run(() => deleteTeam(t.id), "حُذف الفريق")}
                  variant="ghost" className="h-8 w-8 shrink-0 rounded-lg p-0 text-red-300" title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {t.description && <p className="mt-2 text-xs leading-6 text-zinc-500">{t.description}</p>}

            {/* الأعضاء */}
            {t.members.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {t.members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {m.role === "LEADER" && <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />}
                      <span className="truncate text-xs font-bold text-zinc-200">{m.name}</span>
                    </span>
                    {canManage && (
                      <span className="flex shrink-0 gap-1.5">
                        {m.role !== "LEADER" && (
                          <button
                            onClick={() => run(() => setTeamMember({ teamId: t.id, userId: m.userId, role: "LEADER" }), "عُيّن قائدًا")}
                            className="text-zinc-500 hover:text-gold" title="تعيين قائدًا"
                          >
                            <Crown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => confirm(`إزالة ${m.name} من الفريق؟`) && run(() => removeTeamMember(t.id, m.userId), "أُزيل العضو")}
                          className="text-zinc-600 hover:text-red-300" title="إزالة"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* إنجازات */}
            {t.achievements.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {t.achievements.map((a) => (
                  <span key={a.id} className="rounded-lg bg-gold/[0.08] px-2.5 py-1 text-[11px] font-bold text-gold-light" title={a.title}>
                    {a.icon} {a.title}
                  </span>
                ))}
              </div>
            )}

            {/* أدوات إدارة */}
            {canManage && (
              <div className="mt-4 grid gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
                <div className="flex gap-2">
                  <select value="" onChange={(e) => {
                    if (e.target.value) run(() => setTeamMember({ teamId: t.id, userId: e.target.value, role: "MEMBER" }), "أُضيف العضو");
                  }} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs">
                    <option value="">+ إضافة عضو...</option>
                    {students
                      .filter((s) => !t.members.some((m) => m.userId === s.id))
                      .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number" dir="ltr" placeholder="نقاط" value={pointsTeam === t.id ? pointsValue : ""}
                    onFocus={() => setPointsTeam(t.id)}
                    onChange={(e) => { setPointsTeam(t.id); setPointsValue(e.target.value); }}
                    className="h-9 w-20 rounded-lg text-start text-xs"
                  />
                  <Input
                    placeholder="سبب النقاط" value={pointsTeam === t.id ? pointsReason : ""}
                    onFocus={() => setPointsTeam(t.id)}
                    onChange={(e) => { setPointsTeam(t.id); setPointsReason(e.target.value); }}
                    className="h-9 min-w-0 flex-1 rounded-lg text-xs"
                  />
                  <Button
                    onClick={() => pointsTeam === t.id && run(() => addTeamPoints({ teamId: t.id, points: Number(pointsValue) || 0, reason: pointsReason || "تميز" }), "أُضيفت النقاط")}
                    variant="outline" className="h-9 shrink-0 rounded-lg px-3 text-xs font-bold text-gold"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Input
                    placeholder="إنجاز جديد للفريق..." value={achTeam === t.id ? achTitle : ""}
                    onFocus={() => setAchTeam(t.id)}
                    onChange={(e) => { setAchTeam(t.id); setAchTitle(e.target.value); }}
                    className="h-9 min-w-0 flex-1 rounded-lg text-xs"
                  />
                  <Button
                    onClick={() => achTeam === t.id && run(() => addTeamAchievement({ teamId: t.id, title: achTitle || "إنجاز" }), "سُجل الإنجاز")}
                    variant="outline" className="h-9 shrink-0 rounded-lg px-3 text-xs font-bold"
                  >
                    <Award className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

    </div>
  );
}
