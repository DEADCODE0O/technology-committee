"use client";

// ═══════════════════════════════════════════════════════════════
//  طلبات البيانات — إنشاء طلب موجه لمجموعة + عرض الاستجابات
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Save, ChevronDown, ChevronUp, ClipboardList, X, Lock, Unlock, Search } from "lucide-react";
import { createDataRequest, toggleDataRequestStatus, deleteDataRequest } from "@/actions/staff";
import { GRADES, SECTIONS, GENDERS, FORM_FIELD_TYPES } from "@/lib/constants";
import type { StudentTarget } from "@/lib/targeting";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const NEED_OPTIONS = ["SELECT", "RADIO", "CHECKBOX"];

type FieldDraft = { label: string; type: string; options: string[]; required: boolean };

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  mandatory: boolean;
  targetDesc: string;
  matchedCount: number;
  fields: { id: string; label: string; type: string; options?: string[]; required?: boolean }[];
  responses: { userId: string; name: string; email: string; answers: Record<string, string | string[]>; submittedAt: string }[];
};

type StudentPick = { id: string; name: string; email: string };

// ─── المكوّن الرئيسي ───────────────────────────────────────────

export function DataRequestManager({ requests, canManage }: { requests: RequestRow[]; canManage: boolean }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <Button
          onClick={() => setCreating((v) => !v)}
          className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night"
        >
          <Plus className="h-4 w-4" />
          طلب بيانات جديد
        </Button>
      )}

      {creating && <CreateRequestForm onDone={() => setCreating(false)} />}

      {requests.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-6 py-12 text-center text-sm text-zinc-500">
          لا طلبات بعد — أنشئ طلبًا لجمع بيانات جديدة من مجموعة محددة من الطلاب
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── نموذج الإنشاء ────────────────────────────────────────────

function CreateRequestForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [fields, setFields] = useState<FieldDraft[]>([{ label: "", type: "TEXT", options: [], required: false }]);

  // الاستهداف
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<"ANY" | "ATTENDED" | "NOT_ATTENDED">("ANY");
  const [talent, setTalent] = useState<"ANY" | "HAS" | "VERIFIED" | "NONE">("ANY");
  const [minPoints, setMinPoints] = useState("");
  const [pickedStudents, setPickedStudents] = useState<StudentPick[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentPick[] | null>(null);
  const [searching, setSearching] = useState(false);

  const toggleIn = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const addField = () => setFields((p) => [...p, { label: "", type: "TEXT", options: [], required: false }]);
  const updateField = (i: number, patch: Partial<FieldDraft>) => {
    setFields((p) => p.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };
  const removeField = (i: number) => setFields((p) => p.filter((_, idx) => idx !== i));

  const search = () => {
    const q = query.trim();
    if (q.length < 2) return toast.error("اكتب حرفين على الأقل");
    setSearching(true);
    fetch(`/api/admin/students-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: { students: StudentPick[] }) => setResults(data.students))
      .catch(() => toast.error("تعذر البحث"))
      .finally(() => setSearching(false));
  };

  const pickStudent = (s: StudentPick) => {
    if (!pickedStudents.find((p) => p.id === s.id)) setPickedStudents((p) => [...p, s]);
    setResults(null);
    setQuery("");
  };

  const submit = () => {
    if (title.trim().length < 3) return toast.error("اكتب عنوانًا واضحًا للطلب");
    const cleanFields = fields.filter((f) => f.label.trim().length > 0);
    if (cleanFields.length === 0) return toast.error("أضف سؤالاً واحدًا على الأقل");
    if (fields.some((f) => f.label.trim().length === 0)) return toast.error("فيه سؤال بنص فاضي — امسحه أو اكتبه");

    const target: StudentTarget = {
      grades,
      sections,
      genders,
      attendance,
      talent,
      minPoints: minPoints ? Math.max(1, Number(minPoints) || 0) : null,
      userIds: pickedStudents.map((s) => s.id),
      sessionId: null,
      runId: null,
      activityId: null,
      programId: null,
      teamId: null,
      scope: "REGISTERED",

    };

    startTransition(async () => {
      const res = await createDataRequest({
        title,
        description: description || undefined,
        fields: cleanFields,
        target,
        deadline: deadline || undefined,
        mandatory,
      });
      if (res.ok) {
        toast.success("تم إنشاء الطلب — سيظهر للطلاب المستهدفين في لوحتهم");
        onDone();
        router.refresh();
      } else toast.error(res.error || "تعذر الإنشاء");
    });
  };

  return (
    <div className="space-y-5 rounded-3xl border border-gold/25 bg-gold/[0.03] p-5">
      {/* الأساسيات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-zinc-300">عنوان الطلب <span className="text-gold">*</span></Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: درجات مادة قواعد البيانات" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-zinc-300">الموعد النهائي <span className="text-xs text-zinc-500">(اختياري)</span></Label>
          <Input dir="ltr" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-xl text-start" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-zinc-300">وصف للطالب</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: محتاجين نجمع درجات المادة لترشيح المتفوقين" className="h-11 rounded-xl" />
      </div>

      {/* إلزامي؟ */}
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/[0.03] px-4 py-3.5">
        <div className="min-w-0">
          <Label className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
            {mandatory ? <Lock className="h-3.5 w-3.5 text-gold" /> : <Unlock className="h-3.5 w-3.5 text-zinc-500" />}
            طلب إلزامي (يمنع دخول المنصة)
          </Label>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            عند التفعيل: الطالب المستهدف يُحوّل فور فتحه المنصة إلى صفحة البيانات المطلوبة ولا يدخل لوحته حتى يسلّمها —
            وعند الإيقاف: يظهر كطلب عادي في لوحته.
          </p>
        </div>
        <Switch checked={mandatory} onCheckedChange={setMandatory} />
      </div>

      <div className="rounded-2xl border border-gold/15 bg-gold/[0.03] px-4 py-3">
        <p className="text-sm font-bold text-gold-light">لا يُسأل الطالب مرتين</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">أي معلومة أجاب عنها طالب سابقًا تُستخدم تلقائيًا — من أجاب عن نفس الأسئلة من قبل لن يُسأل مجددًا وستظهر إجابته المحفوظة.</p>
      </div>

      {/* الأسئلة */}
      <div className="space-y-3 border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gold/80">أسئلة الطلب ({fields.length})</p>
          <Button onClick={addField} variant="outline" className="h-8 rounded-lg border-gold/30 bg-gold/[0.06] text-xs font-bold text-gold-light">
            <Plus className="h-3.5 w-3.5" />
            سؤال
          </Button>
        </div>
        {fields.map((f, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/[0.1] text-xs font-extrabold text-gold-light">{i + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-zinc-400">
                  إلزامي
                  <Switch checked={f.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                </label>
                <button onClick={() => removeField(i)} aria-label="حذف" className="rounded-lg p-1 text-red-300/60 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="نص السؤال" className="h-10 rounded-lg" />
              <Select dir="rtl" value={f.type} onValueChange={(v) => updateField(i, { type: v })}>
                <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {NEED_OPTIONS.includes(f.type) && (
              <div className="mt-2.5 space-y-1">
                <Label className="text-[11px] font-bold text-zinc-500">الخيارات (سطر لكل خيار)</Label>
                <textarea
                  value={f.options.join("\n")}
                  onChange={(e) => updateField(i, { options: e.target.value.split("\n") })}
                  rows={2}
                  placeholder={"ممتاز\nجيد جدًا\nجيد"}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* الاستهداف */}
      <div className="space-y-4 border-t border-white/[0.06] pt-4">
        <p className="text-xs font-bold text-gold/80">من يستهدفه الطلب؟ (اتركه كما هو لكل الطلاب)</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ChipGroup label="الفرقة" options={GRADES.map((g) => ({ value: g.value, label: g.label }))} selected={grades} onToggle={(v) => toggleIn(grades, setGrades, v)} />
          <ChipGroup label="الشعبة" options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))} selected={sections} onToggle={(v) => toggleIn(sections, setSections, v)} />
          <ChipGroup label="الجنس" options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} selected={genders} onToggle={(v) => toggleIn(genders, setGenders, v)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الحضور</Label>
            <Select dir="rtl" value={attendance} onValueChange={(v) => setAttendance(v as typeof attendance)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">الكل</SelectItem>
                <SelectItem value="ATTENDED">الحاضرون</SelectItem>
                <SelectItem value="NOT_ATTENDED">غير الحاضرين</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">المواهب</Label>
            <Select dir="rtl" value={talent} onValueChange={(v) => setTalent(v as typeof talent)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">الكل</SelectItem>
                <SelectItem value="HAS">لديهم مواهب</SelectItem>
                <SelectItem value="VERIFIED">مواهب موثقة</SelectItem>
                <SelectItem value="NONE">بدون مواهب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">المتفوقون (نقاط ≥)</Label>
            <Input dir="ltr" type="number" min={1} value={minPoints} onChange={(e) => setMinPoints(e.target.value)} placeholder="مثال: 100" className="h-11 rounded-xl text-start" />
          </div>
        </div>

        {/* طلاب محددون */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300">طلاب محددون <span className="text-xs text-zinc-500">(اختياري — يتقاطع مع الفلاتر أعلاه)</span></Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="ابحث بالاسم أو البريد..." className="h-10 rounded-xl pe-9" />
            </div>
            <Button onClick={search} disabled={searching} variant="outline" className="h-10 rounded-xl border-gold/30 bg-gold/[0.06] text-xs font-bold text-gold-light">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results && results.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
              {results.map((s) => (
                <li key={s.id}>
                  <button onClick={() => pickStudent(s)} className="w-full rounded-xl px-3 py-2 text-start hover:bg-gold/[0.06]">
                    <p className="text-xs font-bold text-zinc-200">{s.name}</p>
                    <p dir="ltr" className="text-start text-[10px] text-zinc-500">{s.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pickedStudents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pickedStudents.map((s) => (
                <button key={s.id} onClick={() => setPickedStudents((p) => p.filter((x) => x.id !== s.id))} className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.08] px-3 py-1 text-[11px] font-bold text-gold-light">
                  {s.name}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button onClick={submit} disabled={pending} className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        إنشاء الطلب
      </Button>
    </div>
  );
}

// ─── مجموعة شرائح قابلة للتحديد ───────────────────────────────

function ChipGroup({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-zinc-300">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`h-8 rounded-lg border px-2.5 text-[11px] font-bold transition-colors ${
                active ? "border-gold/40 bg-gold/[0.15] text-gold-light" : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── بطاقة طلب + الاستجابات ───────────────────────────────────

function RequestCard({ request, canManage }: { request: RequestRow; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showResponses, setShowResponses] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleStatus = () => {
    startTransition(async () => {
      const res = await toggleDataRequestStatus(request.id);
      if (res.ok) { toast.success(res.ok && request.status === "OPEN" ? "تم إغلاق الطلب" : "تم فتح الطلب"); router.refresh(); }
      else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  const doDelete = () => {
    startTransition(async () => {
      const res = await deleteDataRequest(request.id);
      if (res.ok) { toast.success("تم حذف الطلب"); setConfirmDelete(false); router.refresh(); }
      else toast.error(res.error || "تعذر الحذف");
    });
  };

  const deadlinePassed = request.deadline && new Date(request.deadline) < new Date();

  return (
    <li className="space-y-3 rounded-3xl border border-white/[0.06] bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-extrabold text-zinc-100">
            <ClipboardList className="h-4 w-4 text-gold/70" />
            {request.title}
          </p>
          {request.description && <p className="mt-1 text-xs leading-6 text-zinc-500">{request.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
            <span className={`rounded-md px-2 py-0.5 ${request.status === "OPEN" ? "border border-gold/25 bg-gold/[0.08] text-gold-light" : "border border-white/10 bg-white/[0.04] text-zinc-500"}`}>
              {request.status === "OPEN" ? "مفتوح" : "مغلق"}
            </span>
            {request.mandatory && (
              <span className="flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/[0.08] px-2 py-0.5 text-red-300">
                <Lock className="h-3 w-3" />
                إلزامي — يمنع دخول المنصة حتى الإجابة
              </span>
            )}
            <span className="rounded-md border border-sky-400/25 bg-sky-400/[0.06] px-2 py-0.5 text-sky-300">
              {request.targetDesc}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-400">
              {request.matchedCount} مستهدف
            </span>
            <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-0.5 text-emerald-300">
              {request.responses.length} استجابة
            </span>
            {request.deadline && (
              <span className={`rounded-md border px-2 py-0.5 ${deadlinePassed ? "border-red-500/25 bg-red-500/[0.06] text-red-300" : "border-white/10 bg-white/[0.04] text-zinc-400"}`}>
                حتى {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(request.deadline))}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button onClick={() => setShowResponses((v) => !v)} variant="outline" className="h-9 rounded-lg border-gold/30 bg-gold/[0.06] text-xs font-extrabold text-gold-light">
              {showResponses ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              الاستجابات
            </Button>
            <Button onClick={toggleStatus} disabled={pending} variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.03] text-xs font-bold text-zinc-300" title={request.status === "OPEN" ? "إغلاق الطلب" : "فتح الطلب"}>
              {request.status === "OPEN" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
            <Button onClick={() => setConfirmDelete(true)} variant="outline" className="h-9 rounded-lg border-red-400/20 bg-red-500/[0.04] text-xs font-bold text-red-300" title="حذف الطلب">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* جدول الاستجابات */}
      {showResponses && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-zinc-500">
                  <th className="px-3 py-2.5 text-start font-bold">الطالب</th>
                  {request.fields.map((f) => (
                    <th key={f.id} className="px-3 py-2.5 text-start font-bold">{f.label}</th>
                  ))}
                  <th className="px-3 py-2.5 text-start font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {request.responses.length === 0 ? (
                  <tr><td colSpan={request.fields.length + 2} className="px-3 py-6 text-center text-zinc-600">لا استجابات بعد</td></tr>
                ) : (
                  request.responses.map((r) => (
                    <tr key={r.userId} className="border-b border-white/[0.04]">
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-zinc-200">{r.name}</p>
                        <p dir="ltr" className="text-start text-[10px] text-zinc-600">{r.email}</p>
                      </td>
                      {request.fields.map((f) => {
                        const v = r.answers[f.id];
                        return (
                          <td key={f.id} className="px-3 py-2.5 text-zinc-300">
                            {v === undefined || v === null ? <span className="text-zinc-600">—</span> : Array.isArray(v) ? v.join("، ") : String(v)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-zinc-500">
                        {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(r.submittedAt))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-zinc-50">حذف طلب «{request.title}»؟</DialogTitle>
            <DialogDescription className="text-xs leading-6 text-zinc-500">
              سيُحذف الطلب مع {request.responses.length} استجابة مسجلة نهائيًا — لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button onClick={doDelete} disabled={pending} className="h-10 flex-1 rounded-xl bg-red-500/90 text-xs font-extrabold text-white">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              حذف نهائي
            </Button>
            <Button onClick={() => setConfirmDelete(false)} variant="outline" className="h-10 flex-1 rounded-xl border-white/10 text-xs font-bold text-zinc-300">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
