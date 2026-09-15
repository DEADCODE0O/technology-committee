"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Trophy, Sparkles, Gift, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveSeason, endSeason, saveQuest, deleteQuest, saveReward, grantReward } from "@/actions/progress";
import {
  SEASON_STATUS_LABELS, QUEST_KINDS, QUEST_KIND_LABELS, REWARD_TYPES, REWARD_TYPE_LABELS,
} from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
//  المواسم والإنجازات والمكافآت — ثلاث تبويبات في صفحة واحدة
// ═══════════════════════════════════════════════════════════════

export type SeasonRow = { id: string; name: string; startAt: string; endAt: string | null; status: string; xp: number };
export type QuestRow = { id: string; title: string; description: string | null; kind: string; targetCount: number; xpReward: number; icon: string; active: boolean; completed: number };
export type RewardRow = { id: string; type: string; title: string; description: string | null; icon: string; granted: number };
export type StudentOption = { id: string; name: string };

export function SeasonsManager({
  seasons, quests, rewards, students, canManage,
}: {
  seasons: SeasonRow[];
  quests: QuestRow[];
  rewards: RewardRow[];
  students: StudentOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"seasons" | "quests" | "rewards">("seasons");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // موسم جديد
  const [sName, setSName] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");

  // إنجاز جديد
  const [qTitle, setQTitle] = useState("");
  const [qKind, setQKind] = useState("ATTEND_COUNT");
  const [qTarget, setQTarget] = useState("2");
  const [qXp, setQXp] = useState("50");
  const [qIcon, setQIcon] = useState("🎯");

  // مكافأة جديدة + منح
  const [rType, setRType] = useState("BADGE");
  const [rTitle, setRTitle] = useState("");
  const [rIcon, setRIcon] = useState("🎁");
  const [grantRewardId, setGrantRewardId] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantNote, setGrantNote] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, reset?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg(`✓ ${success}`);
        reset?.();
        router.refresh();
      } else {
        setMsg(res.error ?? "تعذر التنفيذ");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-zinc-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.1] text-gold">
            <Trophy className="h-5 w-5" />
          </span>
          المواسم والإنجازات
        </h1>
        <p className="mt-1 text-sm text-zinc-400">التنافس بالموسم · تحديات تلقائية · مكافآت تُمنح وتُسحب بسجل كامل</p>
      </div>

      {msg && <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm font-bold text-gold-light">{msg}</p>}

      {/* التبويبات */}
      <div className="flex gap-2" role="tablist">
        {[
          { key: "seasons", label: "المواسم", icon: <Trophy className="h-4 w-4" /> },
          { key: "quests", label: "الإنجازات", icon: <Sparkles className="h-4 w-4" /> },
          { key: "rewards", label: "المكافآت", icon: <Gift className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${
              tab === t.key ? "border-gold/40 bg-gold/[0.12] text-gold-light" : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── المواسم ── */}
      {tab === "seasons" && (
        <div className="space-y-4">
          {canManage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveSeason({ name: sName, startAt: sStart, endAt: sEnd || null }), "أُنشئ الموسم", () => { setSName(""); setSStart(""); setSEnd(""); });
              }}
              className="grid gap-4 rounded-3xl border border-gold/25 bg-surface p-5 md:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">اسم الموسم *</Label>
                <Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="الموسم الأول 2026/2027" className="h-11 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">البداية *</Label>
                <Input type="date" dir="ltr" value={sStart} onChange={(e) => setSStart(e.target.value)} className="h-11 rounded-xl text-start" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">النهاية</Label>
                <Input type="date" dir="ltr" value={sEnd} onChange={(e) => setSEnd(e.target.value)} className="h-11 rounded-xl text-start" />
              </div>
              <Button type="submit" disabled={pending} className="h-11 self-end rounded-xl bg-gold font-extrabold text-night">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إنشاء
              </Button>
              <p className="text-[11px] text-zinc-500 md:col-span-4">
                تفعيل موسم جديد ينهي الموسم الجاري تلقائيًا — الترتيب التاريخي محفوظ دائمًا في «الترتيب الكلي»
              </p>
            </form>
          )}

          <div className="space-y-3">
            {seasons.length === 0 && (
              <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center text-sm text-zinc-500">لا مواسم بعد</div>
            )}
            {seasons.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-surface p-4">
                <div>
                  <p className="text-sm font-extrabold text-zinc-100">{s.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(s.startAt))}
                    {s.endAt ? ` — ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(s.endAt))}` : " — مفتوح"}
                    · {s.xp} XP مُنحت
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                    s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300"
                    : s.status === "UPCOMING" ? "bg-white/[0.05] text-zinc-400" : "bg-zinc-700/30 text-zinc-500"
                  }`}>
                    {SEASON_STATUS_LABELS[s.status]}
                  </span>
                  {canManage && s.status === "ACTIVE" && (
                    <Button onClick={() => confirm("إنهاء الموسم الآن؟ الترتيب التاريخي يُحفظ") && run(() => endSeason(s.id), "أُنهي الموسم")} variant="outline" className="h-9 rounded-lg px-3 text-xs font-bold">
                      <Flag className="h-3.5 w-3.5" /> إنهاء
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── الإنجازات ── */}
      {tab === "quests" && (
        <div className="space-y-4">
          {canManage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveQuest({ title: qTitle, kind: qKind, targetCount: Number(qTarget) || 1, xpReward: Number(qXp) || 50, icon: qIcon }), "أُنشئ الإنجاز", () => { setQTitle(""); });
              }}
              className="grid gap-4 rounded-3xl border border-gold/25 bg-surface p-5 md:grid-cols-[60px_2fr_1.5fr_80px_80px_auto]"
            >
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold">أيقونة</Label>
                <Input value={qIcon} onChange={(e) => setQIcon(e.target.value)} maxLength={4} className="h-11 rounded-xl text-center text-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">العنوان *</Label>
                <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="احضر 3 أنشطة" className="h-11 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">النوع</Label>
                <select value={qKind} onChange={(e) => setQKind(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm">
                  {QUEST_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">الهدف</Label>
                <Input type="number" dir="ltr" min={1} max={100} value={qTarget} onChange={(e) => setQTarget(e.target.value)} className="h-11 rounded-xl text-start" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">XP</Label>
                <Input type="number" dir="ltr" min={1} max={1000} value={qXp} onChange={(e) => setQXp(e.target.value)} className="h-11 rounded-xl text-start" />
              </div>
              <Button type="submit" disabled={pending} className="h-11 self-end rounded-xl bg-gold font-extrabold text-night">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {quests.length === 0 && (
              <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center text-sm text-zinc-500 sm:col-span-2">
                لا إنجازات بعد — أضف تحديًا (مثال: احضر 3 أنشطة = +50XP) يُقيَّم تلقائيًا مع كل مشاركة
              </div>
            )}
            {quests.map((q) => (
              <div key={q.id} className={`rounded-2xl border p-4 ${q.active ? "border-white/[0.07] bg-surface" : "border-white/[0.04] bg-surface opacity-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-zinc-100">{q.icon} {q.title}</p>
                  {canManage && (
                    <button onClick={() => confirm("حذف الإنجاز؟") && run(() => deleteQuest(q.id), "حُذف الإنجاز")} className="text-zinc-600 hover:text-red-300" title="حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {QUEST_KIND_LABELS[q.kind]} · الهدف {q.targetCount} · +{q.xpReward} XP · أكمله {q.completed} طالبًا
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── المكافآت ── */}
      {tab === "rewards" && (
        <div className="space-y-4">
          {canManage && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => saveReward({ type: rType, title: rTitle, icon: rIcon }), "أُنشئت المكافأة", () => { setRTitle(""); });
                }}
                className="grid gap-4 rounded-3xl border border-gold/25 bg-surface p-5 md:grid-cols-[60px_1fr_1.5fr_auto]"
              >
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold">أيقونة</Label>
                  <Input value={rIcon} onChange={(e) => setRIcon(e.target.value)} maxLength={4} className="h-11 rounded-xl text-center text-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold">النوع</Label>
                  <select value={rType} onChange={(e) => setRType(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm">
                    {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold">العنوان *</Label>
                  <Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="شهادة تفوق — دفعة سبتمبر" className="h-11 rounded-xl" required />
                </div>
                <Button type="submit" disabled={pending} className="h-11 self-end rounded-xl bg-gold font-extrabold text-night">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {/* منح مكافأة */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => grantReward({ rewardId: grantRewardId, userId: grantUserId, note: grantNote || undefined }), "مُنحت المكافأة", () => { setGrantNote(""); });
                }}
                className="grid gap-4 rounded-3xl border border-white/[0.1] bg-white/[0.02] p-5 md:grid-cols-2"
              >
                <p className="text-xs font-extrabold text-zinc-300 md:col-span-2">منح مكافأة لطالب (مع إشعار فوري)</p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold">المكافأة</Label>
                  <select value={grantRewardId} onChange={(e) => setGrantRewardId(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm" required>
                    <option value="">— اختر —</option>
                    {rewards.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold">الطالب</Label>
                  <select value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 text-sm" required>
                    <option value="">— اختر —</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-extrabold">ملاحظة (اختياري)</Label>
                  <Input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} maxLength={300} placeholder="بسبب التميز في..." className="h-11 rounded-xl" />
                </div>
                <Button type="submit" disabled={pending} className="h-11 rounded-xl bg-gold font-extrabold text-night md:col-span-2 md:w-fit md:px-8">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} منح
                </Button>
              </form>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {rewards.length === 0 && (
              <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center text-sm text-zinc-500 sm:col-span-2">لا مكافآت معرّفة بعد</div>
            )}
            {rewards.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/[0.07] bg-surface p-4">
                <p className="text-sm font-extrabold text-zinc-100">{r.icon} {r.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {REWARD_TYPE_LABELS[r.type]} · {r.description ?? "بلا وصف"} · مُنحت {r.granted} مرة
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
