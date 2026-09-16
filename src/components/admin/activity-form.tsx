"use client";

// ═══════════════════════════════════════════════════════════════
//  نموذج النشاط (كورس/ورشة/فعالية) — إنشاء وتعديل
//  الصورة: رفع على السيرفر أو رابط (جوجل درايف/خارجي) — بلا مكتبة جاهزة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Save, ImagePlus, Link2, Upload, X, Maximize2 } from "lucide-react";
import { saveActivity, type ActivityInput } from "@/actions/activities";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTIVITY_TYPES, ACTIVITY_PUBLISH, ACTIVITY_LEVELS } from "@/lib/constants";
import { ImagePreviewModal } from "@/components/admin/image-preview-modal";

export type ActivityFormValues = {
  id?: string;
  type: string;
  programId: string; // "" = بدون برنامج
  title: string;
  teaser: string;
  description: string;
  image: string;
  presenter: string;
  level: string; // "" = بدون
  publish: string;
};

export function ActivityForm({
  initial,
  programs,
}: {
  initial?: ActivityFormValues;
  programs: { id: string; name: string; icon: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [v, setV] = useState<ActivityFormValues>(
    initial ?? { type: "WORKSHOP", programId: "", title: "", teaser: "", description: "", image: "", presenter: "", level: "", publish: "PUBLISHED" }
  );

  // رفع صورة على السيرفر
  const uploadImage = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون حتى 4MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "تعذر رفع الصورة");
      setV((p) => ({ ...p, image: json.url! }));
      toast.success("تم رفع الصورة ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => setV((p) => ({ ...p, image: "" }));

  const submit = () => {
    if (v.title.trim().length < 3) return toast.error("عنوان النشاط قصير جدًا");
    if (v.description.trim().length < 10) return toast.error("الوصف قصير جدًا — اكتب 10 أحرف على الأقل");
    startTransition(async () => {
      const input: ActivityInput = {
        id: v.id,
        type: v.type,
        programId: v.programId || null,
        title: v.title,
        teaser: v.teaser || undefined,
        description: v.description,
        image: v.image || undefined,
        presenter: v.presenter || undefined,
        level: v.level || undefined,
        publish: v.publish,
      };
      const res = await saveActivity(input);
      if (res.ok && res.id) {
        toast.success(v.id ? "تم حفظ التعديلات" : "تم إنشاء النشاط — أضف محاضراته أو مواعيده");
        // بعد الإنشاء ننتقل لصفحة النشاط لإضافة الجلسات (لا يمكن تمرير دوال من مكونات السيرفر)
        if (v.id) router.refresh();
        else router.push(`/admin/activities/${res.id}`);
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  // معاينة الصورة: المرفوعة (مسار محلي) أو الرابط (درايف/خارجي) عبر البروكسي
  const isLocal = v.image.startsWith("/");
  const previewSrc = v.image ? (isLocal ? v.image : `/api/img?u=${encodeURIComponent(v.image)}`) : null;

  return (
    <div className="space-y-5 rounded-3xl border border-white/[0.07] bg-surface p-5 sm:p-6">
      {/* النوع + البرنامج */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">نوع النشاط</Label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setV((p) => ({ ...p, type: t.value }))}
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-extrabold transition-colors ${
                  v.type === t.value
                    ? "border-gold/40 bg-gold/[0.12] text-gold-light"
                    : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-gold/25"
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">البرنامج (اختياري)</Label>
          <Select value={v.programId || "NONE"} onValueChange={(val) => setV((p) => ({ ...p, programId: val === "NONE" ? "" : val }))}>
            <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue placeholder="بدون برنامج — نشاط مستقل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">بدون برنامج — نشاط مستقل</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-5 text-zinc-500">يمكن ربط النشاط ببرنامج لاحقًا أو تركه مستقلًا</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">عنوان النشاط <span className="text-gold">*</span></Label>
        <Input value={v.title} onChange={(e) => setV((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: أساسيات الذكاء الاصطناعي" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">رسالة التشويق (اختياري — تظهر قبل كشف التفاصيل)</Label>
        <Input value={v.teaser} onChange={(e) => setV((p) => ({ ...p, teaser: e.target.value }))} placeholder="مثال: شيء مميز قادم... 🔥" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">الوصف <span className="text-gold">*</span></Label>
        <Textarea rows={5} value={v.description} onChange={(e) => setV((p) => ({ ...p, description: e.target.value }))} placeholder="وصف النشاط الدائم — يظهر في كل محاضراته ومواعيده" />
        <p className="text-[11px] text-zinc-500">الوصف على مستوى النشاط نفسه — تفاصيل كل محاضرة/موعد تُضبط من صفحة النشاط</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">المقدم</Label>
          <Input value={v.presenter} onChange={(e) => setV((p) => ({ ...p, presenter: e.target.value }))} placeholder="مثال: أ. أحمد ماهر" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">المستوى</Label>
          <Select value={v.level || "NONE"} onValueChange={(val) => setV((p) => ({ ...p, level: val === "NONE" ? "" : val }))}>
            <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue placeholder="بدون مستوى" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">بدون مستوى</SelectItem>
              {ACTIVITY_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* الصورة: رفع أو رابط فقط + معاينة */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5 text-sm font-bold text-zinc-200">
          <ImagePlus className="h-4 w-4 text-gold" /> صورة النشاط
        </Label>

        {/* المعاينة */}
        {previewSrc && (
          <div className="group relative overflow-hidden rounded-2xl border border-gold/25">
            <img src={previewSrc} alt="معاينة صورة النشاط" className="aspect-[16/7] w-full object-cover" />
            <div className="absolute end-2 top-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-night/80 px-3 py-1.5 text-xs font-black text-gold-light backdrop-blur hover:bg-gold hover:text-night transition-colors"
                title="فحص وتكبير وتحميل الصورة"
              >
                <Maximize2 className="h-3.5 w-3.5" /> فحص وتكبير وتحميل
              </button>
              <button
                type="button"
                onClick={clearImage}
                title="إزالة الصورة"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-night/80 text-red-300 backdrop-blur transition-colors hover:bg-red-500/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <span className="absolute bottom-2 start-2 rounded-full bg-night/70 px-2.5 py-1 text-[10px] font-bold text-zinc-300 backdrop-blur">
              {isLocal ? "صورة مرفوعة على السيرفر" : "صورة من رابط خارجي"}
            </span>
          </div>
        )}

        {/* طريقتا الإضافة */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">ارفع صورة من جهازك</Label>
            <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/30 bg-gold/[0.03] text-xs font-bold text-gold-light transition-colors hover:bg-gold/[0.08]">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "جاري الرفع..." : "اختر صورة (JPG / PNG / WEBP — حتى 4MB)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); e.currentTarget.value = ""; }}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">أو الصق رابط صورة</Label>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-zinc-500" />
              <Input
                dir="ltr"
                value={v.image.startsWith("/") ? "" : v.image}
                onChange={(e) => setV((p) => ({ ...p, image: e.target.value }))}
                placeholder="https://drive.google.com/file/d/..."
                className="text-xs"
              />
            </div>
            <p className="text-[10px] leading-4 text-zinc-500">
              لصور درايف: شارك الملف «أي شخص لديه الرابط» ثم الصق الرابط هنا
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">حالة النشر</Label>
        <Select value={v.publish} onValueChange={(val) => setV((p) => ({ ...p, publish: val }))}>
          <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIVITY_PUBLISH.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={submit}
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {v.id ? "حفظ التعديلات" : "إنشاء النشاط"}
      </Button>

      {/* نافذة فحص وتكبير وتحميل الصورة */}
      <ImagePreviewModal
        isOpen={showPreviewModal}
        src={v.image || null}
        title={`صورة النشاط: ${v.title || "النشاط"}`}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
}
