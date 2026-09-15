"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck, Plus, Loader2, Trash2, Rocket, XCircle, Eye, Users,
  ChevronDown, ChevronUp, ExternalLink, Send, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveTask, publishTask, closeTask, deleteTaskDraft, previewTaskAudience } from "@/actions/tasks";
import type { StudentTarget } from "@/lib/targeting";
import {
  GRADES, SECTIONS, GENDERS,
  TASK_SUBMISSION_TYPES, TASK_DISTRIBUTIONS, TASK_STATUS_LABELS,
  TASK_SUBMISSION_TYPE_LABELS, TASK_DISTRIBUTION_LABELS,
} from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
//  مدير المهام — إنشاء/تعديل بمعاينة جمهور حية + نشر/إغلاق
//  «N طالبًا سيستلمون هذه المهمة» قبل النشر
// ═══════════════════════════════════════════════════════════════

export type TaskRow = {
  id: string;
  title: string;
  description?: string;
  status: string;
  distribution: string;
  submissionType: string;
  dueAt: string | null;
  xpReward: number;
  pointsReward?: number;
  pool?: string | null;
  links?: string | null;
  targetRaw?: string | null;
  seasonId?: string | null;
  activityId?: string | null;
  runId?: string | null;
  sessionId?: string | null;
  assignedCount: number;
  submittedCount: number;
  targetDesc: string;
  createdAt: string;
};

type PoolItem = { title: string; description: string };
type LinkItem = { label: string; url: string; newTab: boolean };

export function TaskManager({
  tasks,
  canManage,
  scopeOptions,
  seasons,
}: {
  tasks: TaskRow[];
  canManage: boolean;
  scopeOptions: {
    activities: { id: string; title: string; type: string }[];
    runs: { id: string; title: string; activityId: string }[];
    sessions: { id: string; title: string; activityId: string }[];
    teams: { id: string; name: string; icon: string }[];
  };
  seasons: { id: string; name: string; status: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── نموذج الإنشاء ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submissionType, setSubmissionType] = useState("TEXT");
  const [distribution, setDistribution] = useState("ONE_TASK_FOR_EVERYONE");
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [xpReward, setXpReward] = useState("20");
  const [pointsReward, setPointsReward] = useState("0");
  const [seasonId, setSeasonId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [runId, setRunId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [teamId, setTeamId] = useState("");

  // ── الاستهداف ──
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [scope, setScope] = useState<"REGISTERED" | "ATTENDED">("REGISTERED");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const needsPool = ["RANDOM_TASK_PER_STUDENT", "BALANCED_RANDOM", "TASK_POOL"].includes(distribution);

  const targetJson = useMemo(
    () =>
      JSON.stringify({
        grades,
        sections,
        genders,
        attendance: "ANY",
        talent: "ANY",
        minPoints: null,
        userIds: [],
        sessionId: sessionId || null,
        activityId: activityId || null,
        runId: runId || null,
        programId: null,
        teamId: teamId || null,
        scope,
      } satisfies StudentTarget),
    [grades, sections, genders, sessionId, activityId, runId, teamId, scope]
  );

  // معاينة الجمهور (debounced)
  useEffect(() => {
    if (!creating) return;
    const t = setTimeout(async () => {
      setAudienceLoading(true);
      const res = await previewTaskAudience(targetJson);
      setAudienceCount(res.ok ? (res.count ?? 0) : null);
      setAudienceLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [targetJson, creating]);

  function toggleIn(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetForm() {
    setEditingTaskId(null);
    setTitle("");
    setDescription("");
    setSubmissionType("TEXT");
    setDistribution("ONE_TASK_FOR_EVERYONE");
    setPool([]);
    setLinks([]);
    setDueAt("");
    setXpReward("20");
    setPointsReward("0");
    setSeasonId("");
    setActivityId("");
    setRunId("");
    setSessionId("");
    setTeamId("");
    setGrades([]);
    setSections([]);
    setGenders([]);
    setScope("REGISTERED");
    setAudienceCount(null);
  }

  function onStartEdit(task: TaskRow) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setSubmissionType(task.submissionType);
    setDistribution(task.distribution);
    try {
      setPool(task.pool ? JSON.parse(task.pool) : []);
    } catch {
      setPool([]);
    }
    try {
      setLinks(task.links ? JSON.parse(task.links) : []);
    } catch {
      setLinks([]);
    }
    setDueAt(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : "");
    setXpReward(String(task.xpReward ?? 20));
    setPointsReward(String(task.pointsReward ?? 0));
    setSeasonId(task.seasonId ?? "");
    setActivityId(task.activityId ?? "");
    setRunId(task.runId ?? "");
    setSessionId(task.sessionId ?? "");
    try {
      if (task.targetRaw) {
        const parsed = JSON.parse(task.targetRaw);
        setGrades(parsed.grades || []);
        setSections(parsed.sections || []);
        setGenders(parsed.genders || []);
        setScope(parsed.scope || "REGISTERED");
        setTeamId(parsed.teamId || "");
      } else {
        setGrades([]); setSections([]); setGenders([]); setScope("REGISTERED"); setTeamId("");
      }
    } catch {
      setGrades([]); setSections([]); setGenders([]); setScope("REGISTERED"); setTeamId("");
    }
    setCreating(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveTask({
        id: editingTaskId || undefined,
        title,
        description,
        submissionType,
        distribution,
        pool: pool.filter((p) => p.title.trim()),
        links: links.filter((l) => l.label.trim() && l.url.trim()),
        target: JSON.parse(targetJson),
        seasonId: seasonId || null,
        programId: null,
        activityId: activityId || null,
        runId: runId || null,
        sessionId: sessionId || null,
        dueAt: dueAt || null,
        xpReward: Number(xpReward) || 0,
        pointsReward: Number(pointsReward) || 0,
      });
      if (res.ok) {
        setCreating(false);
        resetForm();
        setMsg(editingTaskId ? "✓ تم تحديث المهمة بنجاح" : "✓ تم حفظ المهمة بنجاح");
        router.refresh();
      } else {
        setMsg(res.error ?? "تعذر الحفظ");
      }
    });
  }

  function onPublish(id: string) {
    if (!confirm("نشر المهمة سيجمّد قائمة المستلمين فورًا — التوزيع العشوائي يُختم ولا يتغير. متابعة؟")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await publishTask(id);
      setBusyId(null);
      setMsg(res.ok ? `✓ نُشرت المهمة إلى ${res.assigned} مستلمًا` : (res.error ?? "تعذر النشر"));
      router.refresh();
    });
  }

  function onClose(id: string) {
    if (!confirm("إغلاق المهمة يمنع التسليمات الجديدة — المتابع؟")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await closeTask(id);
      setBusyId(null);
      setMsg(res.ok ? "✓ أُغلقت المهمة" : (res.error ?? "تعذر الإغلاق"));
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm("حذف مسودة نهائي — متابع؟")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteTaskDraft(id);
      setBusyId(null);
      setMsg(res.ok ? "✓ حُذفت المسودة" : (res.error ?? "تعذر الحذف"));
      router.refresh();
    });
  }

  const input = "h-11 rounded-xl";

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-zinc-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.1] text-gold">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            المهام والتكليفات
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {tasks.filter((t) => t.status === "PUBLISHED").length} منشورة · {tasks.filter((t) => t.status === "DRAFT").length} مسودات · {tasks.filter((t) => t.status === "CLOSED").length} مغلقة
          </p>
        </div>
        {canManage && !creating && (
          <Button onClick={() => setCreating(true)} className="h-11 rounded-xl bg-gold font-extrabold text-night hover:bg-gold-light">
            <Plus className="h-4 w-4" /> مهمة جديدة
          </Button>
        )}
      </div>

      {msg && (
        <p className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm font-bold text-gold-light">{msg}</p>
      )}

      {/* نموذج الإنشاء */}
      {creating && (
        <form onSubmit={onSave} className="space-y-5 rounded-3xl border border-gold/25 bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-zinc-100">
                {editingTaskId ? "تعديل التكليف / المهمة" : "مهمة جديدة"}
              </h2>
              {editingTaskId && (
                <p className="mt-0.5 text-xs text-gold-light">يمكنك تعديل أي تفاصيل، الموعد، المكافآت أو الاستهداف وحفظها مباشرة</p>
              )}
            </div>
            <Button type="button" variant="ghost" onClick={() => { setCreating(false); resetForm(); }} className="h-9 rounded-lg text-zinc-400">
              <XCircle className="h-4 w-4" /> إلغاء
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">عنوان المهمة *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="مثال: تقرير عن محاضرة الذكاء الاصطناعي" className={input} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">آخر موعد للتسليم</Label>
              <Input type="datetime-local" dir="ltr" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={`${input} text-start`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">وصف التكليف *</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={8000} placeholder="اشرح المطلوب بوضوح — معايير التقييم وخطوات التسليم" required />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">طريقة التسليم</Label>
              <select value={submissionType} onChange={(e) => setSubmissionType(e.target.value)} className={`${input} w-full border border-white/10 bg-white/[0.02] px-3 text-sm`}>
                {TASK_SUBMISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold">التوزيع</Label>
              <select value={distribution} onChange={(e) => setDistribution(e.target.value)} className={`${input} w-full border border-white/10 bg-white/[0.02] px-3 text-sm`}>
                {TASK_DISTRIBUTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">XP</Label>
                <Input type="number" dir="ltr" min={0} max={1000} value={xpReward} onChange={(e) => setXpReward(e.target.value)} className={`${input} text-start`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold">نقاط</Label>
                <Input type="number" dir="ltr" min={0} max={1000} value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} className={`${input} text-start`} />
              </div>
            </div>
          </div>

          {/* بدائل المهام للتوزيع العشوائي */}
          {needsPool && (
            <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-zinc-300">بدائل المهام (بديلان على الأقل)</p>
                <Button type="button" variant="outline" onClick={() => setPool((p) => [...p, { title: "", description: "" }])} className="h-8 rounded-lg text-xs">
                  <Plus className="h-3.5 w-3.5" /> بديل
                </Button>
              </div>
              {pool.map((p, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-white/[0.06] p-3 md:grid-cols-[1fr_2fr_auto]">
                  <Input value={p.title} onChange={(e) => setPool((pp) => pp.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={`عنوان البديل ${i + 1}`} className="h-10 rounded-lg" />
                  <Input value={p.description} onChange={(e) => setPool((pp) => pp.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="وصف مختصر (اختياري)" className="h-10 rounded-lg" />
                  <Button type="button" variant="ghost" onClick={() => setPool((pp) => pp.filter((_, j) => j !== i))} className="h-10 w-10 rounded-lg p-0 text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {pool.length === 0 && <p className="text-xs text-zinc-500">أضف بديلين على الأقل ليقوم التوزيع العشوائي</p>}
            </div>
          )}

          {/* الروابط الخارجية */}
          <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-zinc-300">روابط مساعدة (تظهر للطالب بأسماء واضحة)</p>
              <Button type="button" variant="outline" onClick={() => setLinks((l) => [...l, { label: "", url: "", newTab: true }])} className="h-8 rounded-lg text-xs">
                <Plus className="h-3.5 w-3.5" /> رابط
              </Button>
            </div>
            {links.map((l, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-white/[0.06] p-3 md:grid-cols-[1fr_2fr_auto]">
                <Input value={l.label} onChange={(e) => setLinks((ll) => ll.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="انضم للجروب" className="h-10 rounded-lg" />
                <Input dir="ltr" value={l.url} onChange={(e) => setLinks((ll) => ll.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://..." className="h-10 rounded-lg text-start" />
                <Button type="button" variant="ghost" onClick={() => setLinks((ll) => ll.filter((_, j) => j !== i))} className="h-10 w-10 rounded-lg p-0 text-red-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* الاستهداف */}
          <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-xs font-extrabold text-zinc-300">الجمهور المستهدف</p>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold text-zinc-500">الموسم</Label>
                <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs">
                  <option value="">— بدون موسم —</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold text-zinc-500">نشاط مرتبط</Label>
                <select value={activityId} onChange={(e) => { setActivityId(e.target.value); setRunId(""); setSessionId(""); }} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs">
                  <option value="">— بدون —</option>
                  {scopeOptions.activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold text-zinc-500">تنفيذ مرتبط</Label>
                <select value={runId} onChange={(e) => { setRunId(e.target.value); setSessionId(""); }} disabled={!activityId} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs disabled:opacity-40">
                  <option value="">— بدون —</option>
                  {scopeOptions.runs.filter((r) => r.activityId === activityId).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold text-zinc-500">جلسة محددة</Label>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!activityId} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs disabled:opacity-40">
                  <option value="">— بدون —</option>
                  {scopeOptions.sessions.filter((s) => s.activityId === activityId).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>

            {(sessionId || runId || activityId) && (
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-zinc-500">نطاق النطاق:</span>
                {(["REGISTERED", "ATTENDED"] as const).map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-1.5 font-bold text-zinc-300">
                    <input type="radio" checked={scope === s} onChange={() => setScope(s)} className="accent-gold" />
                    {s === "REGISTERED" ? "المسجلون" : "الحاضرون فقط"}
                  </label>
                ))}
              </div>
            )}

            {/* فريق (لمهمة جماعية) */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold text-zinc-500">فريق (يحوّل المهمة لجماعية)</Label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs">
                  <option value="">— مهمة فردية —</option>
                  {scopeOptions.teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "الفرقة", items: GRADES, selected: grades, toggle: (v: string) => toggleIn(grades, setGrades, v) },
                { label: "الشعبة", items: SECTIONS, selected: sections, toggle: (v: string) => toggleIn(sections, setSections, v) },
                { label: "الجنس", items: GENDERS, selected: genders, toggle: (v: string) => toggleIn(genders, setGenders, v) },
              ].map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-[11px] font-extrabold text-zinc-400">{g.label} (فارغ = الكل)</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <label key={item.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-bold text-zinc-300">
                        <Checkbox checked={g.selected.includes(item.value)} onCheckedChange={() => g.toggle(item.value)} />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* معاينة الجمهور */}
            <div className="flex items-center gap-2.5 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
              {audienceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
              ) : (
                <Users className="h-4 w-4 text-gold" />
              )}
              <p className="text-sm font-extrabold text-gold-light">
                {audienceCount !== null ? `${audienceCount} طالبًا سيستلمون هذه المهمة` : "جارِ حساب الجمهور..."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending} className="h-12 flex-1 rounded-2xl bg-gold text-sm font-extrabold text-night hover:bg-gold-light sm:w-auto sm:px-10">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingTaskId ? "حفظ التعديلات" : "حفظ كمسودة"}
            </Button>
            <p className="self-center text-[11px] leading-5 text-zinc-500">
              {editingTaskId ? "التعديلات تُطبق فورًا على المهمة" : "النشر خطوة منفصلة بعد المراجعة"}
            </p>
          </div>
        </form>
      )}

      {/* قائمة المهام */}
      {tasks.length === 0 && !creating && (
        <div className="rounded-3xl border border-white/[0.06] bg-surface p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.06] text-2xl">📋</span>
          <h2 className="mt-4 text-base font-extrabold text-zinc-200">لا مهام بعد</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-7 text-zinc-500">أنشئ أول تكليف — حدد الجمهور بدقة ومعاينة حية لعدد المستلمين قبل النشر</p>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((t) => {
          const open = expanded === t.id;
          return (
            <div key={t.id} className="rounded-2xl border border-white/[0.07] bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button onClick={() => setExpanded(open ? null : t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  {open ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-zinc-100">{t.title}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      {TASK_STATUS_LABELS[t.status]} · {TASK_SUBMISSION_TYPE_LABELS[t.submissionType]} · {TASK_DISTRIBUTION_LABELS[t.distribution]}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStartEdit(t); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold/[0.06] text-gold transition-colors hover:bg-gold/[0.18]"
                      title="تعديل المهمة"
                      aria-label="تعديل المهمة"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {t.status === "PUBLISHED" && (
                    <Link href={`/admin/tasks/${t.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold/[0.1] px-3 text-xs font-extrabold text-gold">
                      <Send className="h-3.5 w-3.5" /> {t.submittedCount}/{t.assignedCount} تسليمًا
                    </Link>
                  )}
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                    t.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-300"
                    : t.status === "DRAFT" ? "bg-white/[0.05] text-zinc-400"
                    : "bg-zinc-700/30 text-zinc-500"
                  }`}>
                    {TASK_STATUS_LABELS[t.status]}
                  </span>
                </div>
              </div>

              {open && (
                <div className="space-y-3 border-t border-white/[0.06] p-4">
                  <p className="text-xs leading-6 text-zinc-400">
                    <Users className="me-1 inline h-3.5 w-3.5 text-gold/70" />
                    الجمهور: {t.targetDesc}
                    {t.dueAt && <span className="ms-3">· الموعد: {new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(new Date(t.dueAt))}</span>}
                    {t.xpReward > 0 && <span className="ms-3 text-emerald-300">+{t.xpReward} XP</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canManage && (
                      <Button
                        onClick={() => onStartEdit(t)}
                        variant="outline"
                        className="h-9 rounded-lg border-gold/35 bg-gold/[0.06] px-3.5 text-xs font-extrabold text-gold hover:bg-gold/[0.15]"
                      >
                        <Pencil className="h-3.5 w-3.5 me-1" /> تعديل المهمة
                      </Button>
                    )}
                    {t.status === "PUBLISHED" && (
                      <Link href={`/admin/tasks/${t.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 text-xs font-extrabold text-zinc-300 hover:border-gold/30">
                        <Eye className="h-3.5 w-3.5" /> التسليمات والتقييم
                      </Link>
                    )}
                    {canManage && t.status === "DRAFT" && (
                      <>
                        <Button onClick={() => onPublish(t.id)} disabled={busyId === t.id} className="h-9 rounded-lg bg-gold px-4 text-xs font-extrabold text-night hover:bg-gold-light">
                          {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} نشر الآن
                        </Button>
                        <Button onClick={() => onDelete(t.id)} disabled={busyId === t.id} variant="ghost" className="h-9 rounded-lg px-4 text-xs font-bold text-red-300 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" /> حذف
                        </Button>
                      </>
                    )}
                    {canManage && t.status === "PUBLISHED" && (
                      <Button onClick={() => onClose(t.id)} disabled={busyId === t.id} variant="outline" className="h-9 rounded-lg px-4 text-xs font-bold">
                        <XCircle className="h-3.5 w-3.5" /> إغلاق التسليم
                      </Button>
                    )}
                    {t.status === "PUBLISHED" && (
                      <Link href={`/tasks/${t.id}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3.5 text-xs font-bold text-zinc-400 hover:border-gold/30">
                        <ExternalLink className="h-3.5 w-3.5" /> معاينة كطالب
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
