"use client";

// ═══════════════════════════════════════════════════════════════
//  مكتبة روابط جوجل درايف — أرفع مرة من حسابك واستخدم في كل مكان
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, X, Save, Copy, ExternalLink } from "lucide-react";
import { saveDriveAsset, deleteDriveAsset } from "@/actions/drive";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRIVE_KINDS, LINK_TYPE_ICONS } from "@/lib/constants";
import { detectLinkType } from "@/lib/links";

export type AdminDriveAsset = {
  id: string;
  title: string;
  url: string;
  kind: string;
  note: string | null;
  createdAt: string;
};

export function DriveManager({ assets, canManage }: { assets: AdminDriveAsset[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminDriveAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", kind: "FILE", note: "" });

  const openAdd = () => { setEditing(null); setAdding(true); setForm({ title: "", url: "", kind: "FILE", note: "" }); };
  const openEdit = (a: AdminDriveAsset) => {
    setEditing(a); setAdding(true);
    setForm({ title: a.title, url: a.url, kind: a.kind, note: a.note ?? "" });
  };

  const submit = () => {
    if (form.title.trim().length < 2) return toast.error("اكتب عنوانًا للمرفق");
    if (!form.url.trim()) return toast.error("الصق رابط الملف");
    startTransition(async () => {
      const res = await saveDriveAsset({ id: editing?.id, ...form });
      if (res.ok) {
        toast.success(editing ? "تم الحفظ" : "تمت إضافة المرفق للمكتبة");
        setAdding(false); setEditing(null);
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  const remove = (a: AdminDriveAsset) => {
    if (!confirm(`حذف «${a.title}» من المكتبة؟ (الرابط نفسه في درايف لن يتأثر)`)) return;
    startTransition(async () => {
      const res = await deleteDriveAsset(a.id);
      if (res.ok) { toast.success("تم الحذف"); router.refresh(); }
      else toast.error(res.error || "تعذر الحذف");
    });
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("تم نسخ الرابط")).catch(() => toast.error("تعذر النسخ"));
  };

  const detected = form.url ? detectLinkType(form.url) : null;

  return (
    <div className="space-y-4">
      {assets.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center">
          <p className="text-sm font-bold text-zinc-300">المكتبة فاضية</p>
          <p className="mt-1 text-xs leading-6 text-zinc-500">
            ارفع الملف على جوجل درايف من حسابك، شاركه «أي شخص لديه الرابط»، ثم أضفه هنا —
            واستخدمه بعدها في الإشعارات ومواد المحاضرات وصور الأنشطة
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {assets.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-surface p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.07] text-lg">
                {LINK_TYPE_ICONS[detectLinkType(a.url)] ?? "📁"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{a.title}</p>
                <p className="truncate text-[11px] text-zinc-500" dir="ltr">{a.url}</p>
                {a.note && <p className="mt-0.5 truncate text-[11px] text-zinc-600">{a.note}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => copy(a.url)} title="نسخ الرابط" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-gold-light">
                <Copy className="h-4 w-4" />
              </button>
              <a href={a.url} target="_blank" rel="noreferrer" title="فتح" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-gold-light">
                <ExternalLink className="h-4 w-4" />
              </a>
              {canManage && (
                <>
                  <button onClick={() => openEdit(a)} title="تعديل" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-gold-light">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a)} title="حذف" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="space-y-4 rounded-3xl border border-gold/25 bg-surface p-5">
          <h3 className="text-sm font-extrabold text-gold-light">{editing ? "تعديل المرفق" : "مرفق جديد"}</h3>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">العنوان <span className="text-gold">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: شرائح محاضرة HTML" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">الرابط <span className="text-gold">*</span></Label>
            <Input dir="ltr" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://drive.google.com/file/d/..." className="text-xs" />
            {detected && <p className="text-[11px] font-bold text-gold/70">تم التعرف: {LINK_TYPE_ICONS[detected]} {detected === "DRIVE" ? "رابط جوجل درايف ✓" : detected}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">النوع</Label>
              <Select value={form.kind} onValueChange={(val) => setForm((p) => ({ ...p, kind: val }))}>
                <SelectTrigger dir="rtl" className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRIVE_KINDS.map((k) => (<SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">ملاحظة (اختياري)</Label>
              <Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="مثال: تجديده كل ترم" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending} className="h-11 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
            </Button>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }} className="h-11 rounded-xl border-white/15 text-sm text-zinc-300">
              <X className="h-4 w-4" /> إلغاء
            </Button>
          </div>
        </div>
      ) : (
        canManage && (
          <Button onClick={openAdd} variant="outline" className="h-11 w-full rounded-xl border-gold/30 bg-gold/[0.06] text-sm font-extrabold text-gold-light hover:bg-gold/[0.12]">
            <Plus className="h-4 w-4" /> إضافة رابط درايف
          </Button>
        )
      )}
    </div>
  );
}
