"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DoorOpen, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gateAddToSession } from "@/actions/attendance";
import { GRADES, SECTIONS, GENDERS } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
//  بوابة النادي: طالب وصل غير مسجل؟ أضِفه هنا فورًا (GATE_ADDED)
//  يُدرج في كشف النادي مباشرة ثم سجّل حضوره من لوحة الحضور
// ═══════════════════════════════════════════════════════════════

export function GateAddForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await gateAddToSession({
        sessionId, fullName, phone: phone || undefined,
        grade: grade || undefined, section: section || undefined,
        gender: gender || undefined, studentCode: studentCode || undefined,
      });
      if (res.ok) {
        setMsg(`✓ أُضيف «${fullName}» عند البوابة — سجّل حضوره الآن من القائمة`);
        setFullName(""); setPhone(""); setStudentCode("");
        router.refresh();
      } else {
        setMsg(res.error ?? "تعذر الإضافة");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold text-gold-light">
          <DoorOpen className="h-4 w-4" /> بوابة النادي — إضافة طالب غير مسجل
        </p>
        <Button onClick={() => setOpen((o) => !o)} variant="outline" className="h-9 rounded-lg text-xs font-extrabold">
          {open ? "إغلاق" : "إضافة عند البوابة"}
        </Button>
      </div>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">الاسم *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required className="h-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">الهاتف</Label>
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="h-10 rounded-lg text-start" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs">
              <option value="">الفرقة —</option>
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs">
              <option value="">الشعبة —</option>
              {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs">
              <option value="">الجنس —</option>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">كود الطالب (اختياري)</Label>
            <Input dir="ltr" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="h-10 rounded-lg text-start" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="h-10 w-full rounded-lg bg-gold text-xs font-extrabold text-night hover:bg-gold-light">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} إضافة للكشف
            </Button>
          </div>
          {msg && <p className="text-xs font-bold text-gold-light sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}

// زر تصدير كشف النادي الرسمي
export function ManifestExportButton({ sessionId, activityTitle }: { sessionId: string; activityTitle: string }) {
  return (
    <a
      href={`/api/admin/sessions/${sessionId}/export?manifest=1&status=ALL`}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 text-xs font-extrabold text-gold-light transition-colors hover:bg-gold/[0.15]"
      title={`كشف النادي الرسمي لـ ${activityTitle}`}
    >
      <FileSpreadsheet className="h-4 w-4" /> كشف النادي
    </a>
  );
}
