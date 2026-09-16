"use client";

// ═══════════════════════════════════════════════════════════════
//  مدير المواهب (إدارة) — الإدارة وحدها تضيف وتعدل وتحذف
//  - ربط بطالب مسجل أو اسم حر
//  - صورة: رابط جوجل درايف «أي شخص لديه الرابط» أو أي رابط أو رفع على السيرفر
//  - تمييز للظهور في الموقع العام
// ═══════════════════════════════════════════════════════════════

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, XCircle, ImagePlus, Upload, Trash2, Pencil, Sparkles, Search } from "lucide-react";
import { createTalentAdmin, updateTalentAdmin, deleteTalentAdmin, type TalentAdminInput } from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TALENT_CATEGORIES, TALENT_OPTIONS, GRADES, SECTIONS } from "@/lib/constants";
import { resolveImageSrc } from "@/lib/links";
import { ImageWithPreview } from "@/components/admin/image-preview-modal";

export type AdminTalentRow = {
  id: string;
  userId: string | null;
  personName: string | null;
  personGrade: string | null;
  personSection: string | null;
  studentLabel: string | null; // اسم الطالب إن وُجد حساب
  category: string;
  name: string;
  customName: string | null;
  description: string | null;
  portfolioUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
};

type FormState = {
  id?: string;
  userId: string; // "FREE" = اسم حر
  personName: string;
  personGrade: string;
  personSection: string;
  category: string;
  name: string;
  customName: string;
  description: string;
  portfolioUrl: string;
  imageUrl: string;
  featured: boolean;
};

const emptyForm = (): FormState => ({
  userId: "FREE", personName: "", personGrade: "", personSection: "",
  category: "PERFORMING", name: "", customName: "", description: "", portfolioUrl: "", imageUrl: "",
  featured: false,
});

export function TalentManager({
  talents,
  students,
}: {
  talents: AdminTalentRow[];
  students: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [v, setV] = useState<FormState>(emptyForm());
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = TALENT_OPTIONS[v.category] ?? [];

  const openCreate = () => { setV(emptyForm()); setEditingId(null); setFormOpen(true); };
  const openEdit = (t: AdminTalentRow) => {
    setV({
      id: t.id,
      userId: t.userId ?? "FREE",
      personName: t.personName ?? "",
      personGrade: t.personGrade ?? "",
      personSection: t.personSection ?? "",
      category: t.category,
      name: t.name,
      customName: t.customName ?? "",
      description: t.description ?? "",
      portfolioUrl: t.portfolioUrl ?? "",
      imageUrl: t.imageUrl ?? "",
      featured: t.featured,
    });
    setEditingId(t.id);
    setFormOpen(true);
  };

  const uploadImage = (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    fetch("/api/admin/upload", { method: "POST", body })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.url) {
          setV((p) => ({ ...p, imageUrl: json.url }));
          toast.success("تم رفع الصورة ✓");
        } else toast.error(json.error || "تعذر رفع الصورة");
      })
      .catch(() => toast.error("تعذر رفع الصورة"))
      .finally(() => setUploading(false));
  };

  const submit = () => {
    if (!v.name) return toast.error("اختر الموهبة");
    if (v.name === "OTHER" && v.customName.trim().length < 2) return toast.error("اكتب اسم الموهبة");
    if (v.userId === "FREE" && v.personName.trim().length < 3) return toast.error("اكتب الاسم الحر (3 أحرف على الأقل)");
    if (v.userId === "FREE" && !v.personGrade) return toast.error("اختر فرقة صاحب الموهبة");

    startTransition(async () => {
      const input: TalentAdminInput = {
        id: v.id,
        userId: v.userId === "FREE" ? undefined : v.userId,
        personName: v.userId === "FREE" ? v.personName.trim() : undefined,
        personGrade: v.userId === "FREE" ? v.personGrade : undefined,
        personSection: v.userId === "FREE" ? v.personSection : undefined,
        category: v.category,
        name: v.name,
        customName: v.name === "OTHER" ? v.customName.trim() : undefined,
        description: v.description.trim() || undefined,
        portfolioUrl: v.portfolioUrl.trim() || undefined,
        imageUrl: v.imageUrl.trim() || undefined,
        featured: v.featured,
      };
      const res = v.id ? await updateTalentAdmin(input as TalentAdminInput & { id: string }) : await createTalentAdmin(input);
      if (res.ok) {
        toast.success(v.id ? "تم حفظ التعديلات ✓" : "تمت إضافة الموهبة ✓");
        setFormOpen(false);
        setV(emptyForm());
        setEditingId(null);
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  const remove = (t: AdminTalentRow) => {
    if (!confirm(`حذف موهبة «${t.studentLabel ?? t.personName ?? ""}» نهائيًا؟`)) return;
    startTransition(async () => {
      const res = await deleteTalentAdmin(t.id);
      if (res.ok) { toast.success("تم الحذف"); router.refresh(); }
      else toast.error(res.error || "تعذر الحذف");
    });
  };

  const filtered = query.trim()
    ? talents.filter((t) =>
        (t.studentLabel ?? t.personName ?? "").includes(query.trim()) ||
        (t.customName ?? t.name).includes(query.trim()))
    : talents;

  return (
    <div className="space-y-5">
      {/* شريط الإجراءات */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => (formOpen && !editingId ? setFormOpen(false) : openCreate())}
          disabled={pending}
          className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
        >
          <Plus className="h-4 w-4" />
          إضافة موهبة
        </Button>
        <div className="relative min-w-44 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو الموهبة..." className="h-11 rounded-xl ps-9 text-sm" />
        </div>
        <span className="text-xs font-bold text-zinc-500">{talents.length} موهبة</span>
      </div>

      {/* النموذج */}
      {formOpen && (
        <div className={`space-y-5 rounded-3xl border p-5 sm:p-6 ${editingId ? "border-sky-400/30 bg-surface" : "border-gold/20 bg-surface"}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={`flex items-center gap-2 text-base font-extrabold ${editingId ? "text-sky-300" : "text-gold-light"}`}>
              {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingId ? "تعديل الموهبة" : "موهبة جديدة"}
            </h3>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setEditingId(null); setV(emptyForm()); }}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-red-300"
            >
              <XCircle className="h-3.5 w-3.5" /> إغلاق
            </button>
          </div>

          {/* صاحب الموهبة: طالب مسجل أو اسم حر */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">صاحب الموهبة</Label>
              <Select value={v.userId} onValueChange={(val) => setV((p) => ({ ...p, userId: val }))}>
                <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">✍️ اسم حر (غير مسجل)</SelectItem>
                  {students.map((st) => (<SelectItem key={st.id} value={st.id}>🎓 {st.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {v.userId === "FREE" ? (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الاسم <span className="text-gold">*</span></Label>
                <Input value={v.personName} onChange={(e) => setV((p) => ({ ...p, personName: e.target.value }))} placeholder="اسم صاحب الموهبة" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الطالب</Label>
                <div className="flex h-11 items-center rounded-xl border border-gold/25 bg-gold/[0.06] px-3 text-sm font-bold text-gold-light">
                  {students.find((st) => st.id === v.userId)?.label ?? "—"}
                </div>
              </div>
            )}
          </div>

          {v.userId === "FREE" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الفرقة</Label>
                <Select value={v.personGrade || "NONE"} onValueChange={(val) => setV((p) => ({ ...p, personGrade: val === "NONE" ? "" : val }))}>
                  <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue placeholder="اختر الفرقة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون</SelectItem>
                    {GRADES.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-zinc-200">الشعبة</Label>
                <Select value={v.personSection || "NONE"} onValueChange={(val) => setV((p) => ({ ...p, personSection: val === "NONE" ? "" : val }))}>
                  <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue placeholder="اختر الشعبة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون</SelectItem>
                    {SECTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* الموهبة */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">تصنيف الموهبة</Label>
              <Select value={v.category} onValueChange={(val) => setV((p) => ({ ...p, category: val, name: val === "OTHER" ? "OTHER" : "" }))}>
                <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TALENT_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">الموهبة <span className="text-gold">*</span></Label>
              {v.category !== "OTHER" && options.length > 0 ? (
                <Select value={v.name} onValueChange={(val) => setV((p) => ({ ...p, name: val }))}>
                  <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue placeholder="اختر الموهبة" /></SelectTrigger>
                  <SelectContent>
                    {options.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={v.name === "OTHER" ? v.customName : v.name} onChange={(e) => setV((p) => ({ ...p, name: "OTHER", customName: e.target.value }))} placeholder="اكتب اسم الموهبة" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">وصف مختصر (اختياري)</Label>
            <Textarea rows={2} value={v.description} onChange={(e) => setV((p) => ({ ...p, description: e.target.value }))} placeholder="نبذة عن الموهبة والإنجازات..." />
          </div>

          {/* الصورة */}
          <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-300">
              <ImagePlus className="h-3.5 w-3.5 text-gold" /> صورة الطالب (اختياري)
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                dir="ltr"
                value={v.imageUrl}
                onChange={(e) => setV((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="رابط جوجل درايف «أي شخص لديه الرابط» أو أي رابط صورة"
                className="text-xs"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-11 shrink-0 rounded-xl border-white/15 text-xs font-bold text-zinc-300"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                رفع من جهازك
              </Button>
            </div>
            {v.imageUrl && (
              <div className="flex items-center gap-3 rounded-xl border border-gold/15 bg-gold/[0.04] p-3">
                <ImageWithPreview
                  src={v.imageUrl}
                  alt="معاينة موهبة"
                  title={`صورة الموهبة: ${v.personName || "الموهبة"}`}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gold/25 cursor-pointer"
                  imgClassName="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-500" dir="ltr">{v.imageUrl}</p>
                <button type="button" onClick={() => setV((p) => ({ ...p, imageUrl: "" }))} className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="text-[11px] leading-5 text-zinc-500">
              يدعم: رابط درايف (اجعل الصلاحية «أي شخص لديه الرابط») · أي رابط صورة مباشر · أو رفعها على السيرفر (JPG/PNG/WEBP حتى 4MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">رابط أعمال / بورتفوليو (اختياري)</Label>
            <Input dir="ltr" value={v.portfolioUrl} onChange={(e) => setV((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://..." className="text-xs" />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.05] px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-200">
                <Sparkles className="h-4 w-4 text-gold" /> تمييز — تظهر في الموقع العام
              </p>
              <p className="text-[11px] text-zinc-500">المواهب المميزة فقط تظهر للطلاب في قسم المواهب</p>
            </div>
            <Switch checked={v.featured} onCheckedChange={(chk) => setV((p) => ({ ...p, featured: chk }))} />
          </div>

          <Button onClick={submit} disabled={pending} className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]">
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {editingId ? "حفظ التعديلات" : "إضافة الموهبة"}
          </Button>
        </div>
      )}

      {/* القائمة */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-6 py-14 text-center">
          <p className="text-lg font-bold text-zinc-300">{talents.length === 0 ? "لسه مفيش مواهب — أضف أول موهبة من الزر فوق" : "لا نتائج للبحث"}</p>
          {talents.length === 0 && <p className="mt-2 text-sm text-zinc-500">الإدارة وحدها تضيف المواهب — الطلاب لا يرسلون طلبات</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const imgSrc = resolveImageSrc(t.imageUrl);
            const initials = (t.studentLabel ?? t.personName ?? "؟").split(" ").slice(0, 2).map((w) => w[0]).join(" ");
            return (
              <div key={t.id} className="overflow-hidden rounded-3xl border border-white/[0.06] bg-surface">
                {imgSrc ? (
                  <div className="relative h-36 w-full overflow-hidden">
                    <ImageWithPreview
                      src={t.imageUrl}
                      alt={t.studentLabel ?? t.personName ?? ""}
                      title={`موهبة: ${t.studentLabel ?? t.personName ?? ""}`}
                      className="group relative h-full w-full overflow-hidden cursor-pointer"
                      imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {t.featured && (
                      <span className="pointer-events-none absolute start-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-night/80 px-2 py-1 text-[10px] font-extrabold text-gold-light backdrop-blur">
                        <Sparkles className="h-3 w-3" /> مميزة
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex h-20 items-center gap-3 border-b border-white/[0.06] px-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gradient-to-b from-gold/15 to-transparent text-sm font-extrabold text-gold-light">{initials}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-100">{t.studentLabel ?? t.personName ?? "—"}</p>
                      <p className="text-[11px] text-zinc-500">{t.userId ? "طالب مسجل" : "اسم حر"}</p>
                    </div>
                    {t.featured && <Sparkles className="ms-auto h-4 w-4 shrink-0 text-gold" />}
                  </div>
                )}
                <div className="space-y-2 p-5">
                  {imgSrc && (
                    <p className="truncate text-sm font-extrabold text-zinc-100">
                      {t.studentLabel ?? t.personName ?? "—"}
                      {t.featured && <Sparkles className="ms-1.5 inline h-3.5 w-3.5 text-gold" />}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-xs font-extrabold text-gold-light">
                    {t.name === "OTHER" ? (t.customName ?? "موهبة أخرى") : (TALENT_OPTIONS[t.category] ?? []).find((o) => o.value === t.name)?.label ?? t.name}
                  </span>
                  {t.description && <p className="text-xs leading-6 text-zinc-400">{t.description}</p>}
                  <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <button onClick={() => openEdit(t)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 text-[11px] font-extrabold text-zinc-300 hover:border-gold/40 hover:text-gold-light">
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </button>
                    <button onClick={() => remove(t)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-2.5 text-[11px] font-extrabold text-red-300/70 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" /> حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
