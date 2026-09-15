"use client";

// جدول المشاركين + التسجيل اليدوي + تصدير Excel

import { useState, useTransition, Fragment } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Download, XCircle, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { adminCancelRegistration, adminPromoteRegistration, addManualRegistration } from "@/actions/registrations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GRADES, SECTIONS, GENDERS, GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, REGISTRATION_SOURCE_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";

export type ParticipantRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  grade: string | null;
  section: string | null;
  gender: string | null;
  studentCode: string | null;
  source: string;
  status: string;
  waitlistOrder: number | null;
  answers: { fieldId: string; label: string; type: string; value: string | string[] }[] | null;
  attended: boolean | null; // null = لم يحدد
};

export function ParticipantsTable({
  sessionId,
  participants,
  canManage,
  hasFormFields,
}: {
  sessionId: string;
  participants: ParticipantRow[];
  canManage: boolean;
  hasFormFields: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [exportQ, setExportQ] = useState("");
  const [exportGrade, setExportGrade] = useState("");
  const [exportSection, setExportSection] = useState("");
  const [exportGender, setExportGender] = useState("");
  const [exportStatus, setExportStatus] = useState("REGISTERED");
  const [exportSource, setExportSource] = useState("");

  const exportHref = () => {
    const p = new URLSearchParams();
    if (exportQ.trim()) p.set("q", exportQ.trim());
    if (exportGrade) p.set("grade", exportGrade);
    if (exportSection) p.set("section", exportSection);
    if (exportGender) p.set("gender", exportGender);
    if (exportStatus) p.set("status", exportStatus);
    if (exportSource) p.set("source", exportSource);
    return `/api/admin/sessions/${sessionId}/export${p.toString() ? `?${p.toString()}` : ""}`;
  };
  const doCancel = (reg: ParticipantRow) => {
    if (!confirm(`إلغاء تسجيل «${reg.fullName}»؟ أول قائمة الانتظار هيترقّى تلقائيًا.`)) return;
    setBusyId(reg.id);
    adminCancelRegistration(reg.id)
      .then((res) => {
        if (res.ok) { toast.success("تم إلغاء التسجيل"); router.refresh(); }
        else toast.error(res.error || "تعذر الإلغاء");
      })
      .finally(() => setBusyId(null));
  };

  const doPromote = (reg: ParticipantRow) => {
    setBusyId(reg.id);
    adminPromoteRegistration(reg.id)
      .then((res) => {
        if (res.ok) { toast.success("تمت الترقية لمقعد فعلي"); router.refresh(); }
        else toast.error(res.error || "تعذر الترقية");
      })
      .finally(() => setBusyId(null));
  };

  const registered = participants.filter((p) => p.status === "REGISTERED");
  const waitlisted = participants.filter((p) => p.status === "WAITLISTED");
  const cancelled = participants.filter((p) => p.status === "CANCELLED");

  return (
    <div className="space-y-4">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-gold-light">{registered.length} مسجل</span>
          {waitlisted.length > 0 && <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-400">{waitlisted.length} قائمة انتظار</span>}
          {cancelled.length > 0 && <span className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-zinc-600">{cancelled.length} ملغي</span>}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button
              onClick={() => setManualOpen(true)}
              variant="outline"
              className="h-10 rounded-xl border-gold/40 bg-gold/[0.08] text-xs font-extrabold text-gold-light hover:bg-gold/[0.15]"
            >
              <UserPlus className="h-4 w-4" />
              تسجيل يدوي
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="rounded-2xl border border-white/[0.06] bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold text-zinc-200">خيارات تصدير Excel</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">الفلاتر هنا تحدد من يدخل ملف التصدير فقط.</p>
            </div>
            <a href={exportHref()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-gold-light to-gold px-3.5 text-xs font-extrabold text-night">
              <Download className="h-3.5 w-3.5" /> تصدير حسب الفلاتر
            </a>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <Input value={exportQ} onChange={(e) => setExportQ(e.target.value)} placeholder="اسم / هاتف / بريد / كود" className="h-10 rounded-xl" />
            <Select value={exportGrade} onValueChange={setExportGrade}><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="كل الفرق" /></SelectTrigger><SelectContent>{GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
            <Select value={exportSection} onValueChange={setExportSection}><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="كل الشعب" /></SelectTrigger><SelectContent>{SECTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
            <Select value={exportGender} onValueChange={setExportGender}><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="كل الفئات" /></SelectTrigger><SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
            <Select value={exportStatus} onValueChange={setExportStatus}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="REGISTERED">مسجلون فقط</SelectItem><SelectItem value="WAITLISTED">قائمة الانتظار</SelectItem><SelectItem value="CANCELLED">ملغى</SelectItem><SelectItem value="ALL">كل الحالات</SelectItem></SelectContent></Select>
            <Select value={exportSource} onValueChange={setExportSource}><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="كل المصادر" /></SelectTrigger><SelectContent><SelectItem value="ACCOUNT">حساب</SelectItem><SelectItem value="GUEST">ضيف</SelectItem><SelectItem value="MANUAL">يدوي</SelectItem></SelectContent></Select>
          </div>
        </div>
      )}


      {/* الجدول */}
      {participants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center text-sm text-zinc-500">
          مفيش تسجيلات لسه — أول طالب يسجل هيظهر هنا
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-xs">
                  <th className="px-4 py-3 text-start font-bold text-zinc-500">الطالب</th>
                  <th className="px-4 py-3 text-start font-bold text-zinc-500">الهاتف</th>
                  <th className="px-4 py-3 text-start font-bold text-zinc-500">الفرقة / الشعبة</th>
                  <th className="px-4 py-3 text-start font-bold text-zinc-500">المصدر</th>
                  <th className="px-4 py-3 text-start font-bold text-zinc-500">الحالة</th>
                  {canManage && <th className="px-4 py-3 text-start font-bold text-zinc-500">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {[...registered, ...waitlisted, ...cancelled].map((p) => (
                  <Fragment key={p.id}>
                    <tr className={`border-b border-white/[0.04] ${p.status === "CANCELLED" ? "opacity-45" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.answers && (
                            <button
                              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                              aria-label="إجابات الأسئلة"
                              className="rounded p-1 text-gold/60 hover:bg-gold/10 hover:text-gold"
                            >
                              {expanded === p.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <div>
                            <p className="font-bold text-zinc-100">{p.fullName}</p>
                            {p.studentCode && <p className="text-[10px] text-zinc-600" dir="ltr">كود: {p.studentCode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" dir="ltr"><span className="text-start">{p.phone ?? "—"}</span></td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.grade ? `${GRADE_LABELS[p.grade] ?? "—"} / ${SECTION_LABELS[p.section ?? ""] ?? "—"}` : "—"}
                        {p.gender && <span className="ms-1 text-zinc-600">({GENDER_LABELS[p.gender]})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          p.source === "ACCOUNT"
                            ? "border border-gold/25 bg-gold/[0.06] text-gold-light"
                            : p.source === "GUEST"
                            ? "border border-sky-400/25 bg-sky-400/[0.08] text-sky-300"
                            : "border border-white/10 bg-white/[0.02] text-zinc-400"
                        }`}>
                          {REGISTRATION_SOURCE_LABELS[p.source]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          p.status === "REGISTERED"
                            ? "border border-gold/25 bg-gold/[0.06] text-gold-light"
                            : p.status === "WAITLISTED"
                              ? "border border-zinc-500/25 bg-white/[0.02] text-zinc-300"
                              : "border border-red-500/20 bg-red-500/[0.04] text-red-300/70"
                        }`}>
                          {REGISTRATION_STATUS_LABELS[p.status]}{p.status === "WAITLISTED" && p.waitlistOrder ? ` #${p.waitlistOrder}` : ""}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {busyId === p.id && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
                            {p.status === "WAITLISTED" && (
                              <button onClick={() => doPromote(p)} title="ترقية لمقعد" className="rounded-lg border border-gold/30 bg-gold/[0.06] p-1.5 text-gold-light hover:bg-gold/[0.15]">
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {p.status !== "CANCELLED" && (
                              <button onClick={() => doCancel(p)} title="إلغاء التسجيل" className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-1.5 text-red-300/70 hover:bg-red-500/10 hover:text-red-300">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {expanded === p.id && p.answers && (
                      <tr className="border-b border-white/[0.04] bg-gold/[0.02]">
                        <td colSpan={canManage ? 6 : 5} className="px-6 py-3">
                          <p className="mb-2 text-[11px] font-bold text-gold/80">إجابات أسئلة الورشة:</p>
                          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {Array.isArray(p.answers) ? p.answers.map((a) => (
                              <li key={a.fieldId} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                                <span className="font-bold text-zinc-500">{a.label}:</span>{" "}
                                <span className="font-bold text-zinc-200">{Array.isArray(a.value) ? a.value.join("، ") : a.value}</span>
                              </li>
                            )) : null}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* التسجيل اليدوي */}
      {canManage && (
        <ManualRegistrationDialog
          sessionId={sessionId}
          open={manualOpen}
          onOpenChange={setManualOpen}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

// ─── نافذة التسجيل اليدوي ────────────────────────────────────

function ManualRegistrationDialog({
  sessionId, open, onOpenChange, onDone,
}: { sessionId: string; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState("");
  const [studentCode, setStudentCode] = useState("");

  const submit = () => {
    startTransition(async () => {
      const res = await addManualRegistration({ sessionId, fullName, phone, email, grade, section, gender, studentCode });
      if (res.ok) {
        toast.success(res.waitlisted ? "أُضيف لقائمة الانتظار (المقاعد ممتلئة)" : "تم التسجيل اليدوي بنجاح");
        setFullName(""); setPhone(""); setEmail(""); setGrade(""); setSection(""); setGender(""); setStudentCode("");
        onOpenChange(false);
        onDone();
      } else toast.error(res.error || "تعذر التسجيل");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg rounded-3xl border-white/10 bg-surface">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-zinc-50">تسجيل يدوي — طالب بدون حساب</DialogTitle>
          <DialogDescription className="text-xs leading-6 text-zinc-500">
            بياناته تتخزن مع تسجيله في الورشة — <span className="text-zinc-400">بدون إنشاء حساب</span> ويظهر في التقارير بمصدر «تسجيل يدوي»
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold text-zinc-300">الاسم الكامل <span className="text-gold">*</span></Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد محمد علي" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الهاتف <span className="text-gold">*</span></Label>
            <Input dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="h-11 rounded-xl text-start" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">البريد (اختياري)</Label>
            <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl text-start" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الفرقة <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الشعبة <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={section} onValueChange={setSection}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">الجنس <span className="text-gold">*</span></Label>
            <Select dir="rtl" value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">كود الطالب (اختياري)</Label>
            <Input dir="ltr" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="h-11 rounded-xl text-start" />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={pending || !fullName || !phone || !grade || !section || !gender}
          className="mt-2 h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          تسجيل الطالب
        </Button>
      </DialogContent>
    </Dialog>
  );
}
