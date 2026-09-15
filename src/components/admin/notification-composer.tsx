"use client";

// ═══════════════════════════════════════════════════════════════
//  مُرسل الإشعارات — استهداف الجمهور + أزرار متعددة + صورة + تثبيت
// ═══════════════════════════════════════════════════════════════

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Send, Eye, Pin, Link2, Plus, Trash2, Save, XCircle, ImagePlus, Upload, Sparkles } from "lucide-react";
import { sendNotification, updateNotification, previewNotificationTarget } from "@/actions/notifications";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GRADES, SECTIONS, GENDERS, NOTIFICATION_TYPES } from "@/lib/constants";
import { detectLinkType, resolveImageSrc } from "@/lib/links";
import { CtaLink } from "@/components/platform/cta-link";

type ButtonDraft = { label: string; url: string; newTab: boolean };

const MAX_BUTTONS = 4;

export type ComposerInitial = {
  type: string;
  pinned: boolean;
  title: string;
  body: string;
  buttons?: { label: string; url: string; newTab?: boolean }[];
  imageUrl?: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaNewTab: boolean;
  expiresAt: string;
  grades: string[];
  sections: string[];
  genders: string[];
  sessionId: string | null;
  talent: string;
  attendance: string;
};

export function NotificationComposer({
  runs,
  driveAssets,
  notificationId,
  initial,
  onDone,
}: {
  runs: { id: string; label: string }[];
  driveAssets: { id: string; title: string; url: string }[];
  notificationId?: string;
  initial?: ComposerInitial;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!notificationId;

  // الأزرار — من التعديل أو الزر القديم أو قائمة فارغة
  const initialButtons: ButtonDraft[] = initial?.buttons?.length
    ? initial.buttons.map((b) => ({ label: b.label, url: b.url, newTab: b.newTab !== false }))
    : initial?.ctaLabel && initial?.ctaUrl
      ? [{ label: initial.ctaLabel, url: initial.ctaUrl, newTab: initial.ctaNewTab }]
      : [];

  const [buttons, setButtons] = useState<ButtonDraft[]>(
    initialButtons.length ? initialButtons : [{ label: "", url: "", newTab: true }]
  );
  const [image, setImage] = useState(initial?.imageUrl ?? "");

  const [v, setV] = useState({
    type: initial?.type ?? "IMPORTANT",
    pinned: initial?.pinned ?? true,
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    expiresAt: initial?.expiresAt ?? "",
  });
  // الاستهداف
  const [grades, setGrades] = useState<string[]>(initial?.grades ?? []);
  const [sections, setSections] = useState<string[]>(initial?.sections ?? []);
  const [genders, setGenders] = useState<string[]>(initial?.genders ?? []);
  const [sessionTarget, setSessionTarget] = useState<string>(initial?.sessionId ?? "ALL");
  const [talent, setTalent] = useState(initial?.talent ?? "ANY");
  const [attendance, setAttendance] = useState(initial?.attendance ?? "ANY");

  const filledButtons = buttons.filter((b) => b.label.trim() && b.url.trim());
  const imgSrc = image.trim() ? resolveImageSrc(image) : null;

  const updateButton = (i: number, patch: Partial<ButtonDraft>) =>
    setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeButton = (i: number) =>
    setButtons((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const addButton = () => {
    if (buttons.length >= MAX_BUTTONS) return;
    setButtons((prev) => [...prev, { label: "", url: "", newTab: true }]);
  };

  const uploadImage = (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    fetch("/api/admin/upload", { method: "POST", body })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.url) {
          setImage(json.url);
          toast.success("تم رفع الصورة ✓");
        } else toast.error(json.error || "تعذر رفع الصورة");
      })
      .catch(() => toast.error("تعذر رفع الصورة"))
      .finally(() => setUploading(false));
  };

  const buildTarget = () => ({
    grades, sections, genders,
    attendance: attendance as "ANY" | "ATTENDED" | "NOT_ATTENDED",
    talent: talent as "ANY" | "HAS" | "VERIFIED" | "NONE",
    minPoints: null,
    userIds: [] as string[],
    sessionId: sessionTarget === "ALL" ? null : sessionTarget,
  });

  const doPreview = () => {
    startTransition(async () => {
      const res = await previewNotificationTarget(buildTarget());
      if (res.ok) setPreview(res.count ?? 0);
      else toast.error(res.error || "تعذر التقدير");
    });
  };

  const submit = () => {
    if (v.title.trim().length < 3) return toast.error("اكتب عنوانًا واضحًا للإشعار");
    // زر ناقص: نص بدون رابط أو رابط بدون نص
    for (const b of buttons) {
      const hasLabel = !!b.label.trim();
      const hasUrl = !!b.url.trim();
      if (hasLabel !== hasUrl) return toast.error("كل زر يحتاج نصًا ورابطًا معًا (أو احذفه)");
    }
    startTransition(async () => {
      const payload = {
        type: v.type,
        pinned: v.pinned,
        title: v.title,
        body: v.body || undefined,
        buttons: filledButtons.map((b) => ({ label: b.label.trim(), url: b.url.trim(), newTab: b.newTab })),
        imageUrl: image.trim() || undefined,
        expiresAt: v.expiresAt || undefined,
        target: buildTarget(),
      };
      // وضع التعديل — تحديث الإشعار القائم
      if (editing && notificationId) {
        const res = await updateNotification(notificationId, payload);
        if (res.ok) {
          toast.success(`تم حفظ التعديلات — يصل الآن إلى ${res.reached} طالبًا ✓`);
          setPreview(null);
          onDone?.();
          router.refresh();
        } else toast.error(res.error || "تعذر حفظ التعديلات");
        return;
      }
      // وضع الإنشاء
      const res = await sendNotification(payload);
      if (res.ok) {
        if (res.reached === 0) {
          toast.success("تم إرسال وحفظ الإشعار بنجاح (سيصل لجميع الطلاب الحاليين والجدد المطابقين للاستهداف) ✓");
        } else {
          toast.success(`تم الإرسال بنجاح — يصل الآن إلى ${res.reached} طالبًا ويصل لأي طالب جديد يطابق الفلتر ✓`);
        }
        setV((p) => ({ ...p, title: "", body: "" }));
        setButtons([{ label: "", url: "", newTab: true }]);
        setImage("");
        setPreview(null);
        router.refresh();
      } else toast.error(res.error || "تعذر الإرسال");
    });
  };

  const toggleIn = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <div className={`space-y-5 rounded-3xl border p-5 sm:p-6 ${editing ? "border-sky-400/30 bg-surface" : "border-gold/20 bg-surface"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`flex items-center gap-2 text-base font-extrabold ${editing ? "text-sky-300" : "text-gold-light"}`}>
          {editing ? <Save className="h-5 w-5" /> : <Send className="h-5 w-5" />} {editing ? "تعديل الإشعار" : "إرسال إشعار جديد"}
        </h3>
        {editing && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-red-300"
          >
            <XCircle className="h-3.5 w-3.5" /> إلغاء التعديل
          </button>
        )}
      </div>

      {/* ── نماذج سريعة للطلاب الجدد وقنوات التواصل الاجتماعي ── */}
      {!editing && (
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-gold-light flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-gold" />
              نماذج جاهزة للطلاب الجدد وقنوات التواصل:
            </span>
            <span className="text-[10px] text-zinc-400">انقر لتعبئة النموذج واستهداف الجمهور المطلوب فوراً</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setV((p) => ({
                  ...p,
                  type: "WELCOME",
                  pinned: true,
                  title: "انضم لجروب شباب اللجنة التكنولوجية 💬",
                  body: "أهلاً بك يا بطل! انضم لجروب الواتساب أو التيليجرام الخاص بالشباب لمتابعة الإعلانات والورش والأنشطة أولاً بأول.",
                }));
                setGenders(["MALE"]);
                setButtons([
                  { label: "جروب واتساب الشباب", url: "https://chat.whatsapp.com/", newTab: true },
                  { label: "قناة تيليجرام الشباب", url: "https://t.me/", newTab: true },
                ]);
                toast.success("تم اختيار نموذج جروب الشباب واستهداف الطلاب الذكور");
              }}
              className="flex items-center gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-3 text-start text-xs font-bold text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/40 transition-colors"
            >
              <span className="text-xl">👨‍💻</span>
              <div>
                <p className="font-extrabold text-blue-200">جروب الشباب</p>
                <p className="text-[10px] text-zinc-400">واتساب وتيليجرام (للشباب فقط)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setV((p) => ({
                  ...p,
                  type: "WELCOME",
                  pinned: true,
                  title: "انضمي لجروب طالبات اللجنة التكنولوجية 🌸",
                  body: "أهلاً بكِ في اللجنة التكنولوجية! انضمي لجروب الواتساب أو التيليجرام الخاص بالطالبات لمتابعة الفعاليات والورش والتواصل.",
                }));
                setGenders(["FEMALE"]);
                setButtons([
                  { label: "جروب واتساب البنات", url: "https://chat.whatsapp.com/", newTab: true },
                  { label: "قناة تيليجرام البنات", url: "https://t.me/", newTab: true },
                ]);
                toast.success("تم اختيار نموذج جروب البنات واستهداف الطالبات الإناث");
              }}
              className="flex items-center gap-2.5 rounded-xl border border-pink-500/20 bg-pink-500/[0.05] p-3 text-start text-xs font-bold text-pink-300 hover:bg-pink-500/10 hover:border-pink-500/40 transition-colors"
            >
              <span className="text-xl">🌸</span>
              <div>
                <p className="font-extrabold text-pink-200">جروب البنات</p>
                <p className="text-[10px] text-zinc-400">واتساب وتيليجرام (للبنات فقط)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setV((p) => ({
                  ...p,
                  type: "WELCOME",
                  pinned: true,
                  title: "تابع صفحات اللجنة التكنولوجية الرسمية 🚀",
                  body: "خليك على تواصل دائم وتابع التغطيات الحصرية، الصور، والملخصات على منصاتنا الرسمية.",
                }));
                setGenders([]);
                setButtons([
                  { label: "صفحتنا على فيسبوك", url: "https://facebook.com/", newTab: true },
                  { label: "حساب إنستغرام", url: "https://instagram.com/", newTab: true },
                  { label: "قناة يوتيوب", url: "https://youtube.com/", newTab: true },
                ]);
                toast.success("تم تجهيز نموذج صفحات التواصل الاجتماعي");
              }}
              className="flex items-center gap-2.5 rounded-xl border border-gold/25 bg-gold/[0.06] p-3 text-start text-xs font-bold text-gold-light hover:bg-gold/[0.12] hover:border-gold/40 transition-colors"
            >
              <span className="text-xl">🌐</span>
              <div>
                <p className="font-extrabold text-gold-pale">صفحات التواصل</p>
                <p className="text-[10px] text-zinc-400">فيسبوك، إنستغرام، يوتيوب</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setV((p) => ({
                  ...p,
                  type: "WELCOME",
                  pinned: true,
                  title: "دليل الطلاب والتعليمات الهامة 📋",
                  body: "أهلاً بكم جميعاً في اللجنة التكنولوجية! ننصحكم بالاطلاع على نظام النقاط والورش المتاحة واللوائح وطريقة تأكيد حضوركم في الفعاليات.",
                }));
                setGrades([]);
                setGenders([]);
                setSections([]);
                setButtons([
                  { label: "تصفح الفعاليات والورش", url: "/activities", newTab: false },
                  { label: "لوائح وتعليمات اللجنة", url: "/#rules", newTab: false },
                ]);
                toast.success("تم تجهيز دليل الطلاب (يستهدف جميع الطلاب الحاليين والجدد)");
              }}
              className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-start text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors"
            >
              <span className="text-xl">📋</span>
              <div>
                <p className="font-extrabold text-emerald-200">دليل الطلاب والتعليمات</p>
                <p className="text-[10px] text-zinc-400">نصائح وإرشادات لكل الطلاب (حاليين وجدد)</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* النوع + التثبيت */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-zinc-200">نوع الإشعار</Label>
          <Select value={v.type} onValueChange={(val) => setV((p) => ({ ...p, type: val }))}>
            <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.05] px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-200">
              <Pin className="h-4 w-4 text-gold" /> تثبيت أعلى لوحة الطالب
            </p>
            <p className="text-[11px] leading-5 text-zinc-500">بنر ذهبي يبقى حتى يضغط «تم» — ويظل في مركز الإشعارات للأبد</p>
          </div>
          <Switch
            checked={v.pinned}
            onCheckedChange={(chk) => setV((p) => ({ ...p, pinned: chk, type: chk && p.type === "INFO" ? "IMPORTANT" : p.type }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">العنوان <span className="text-gold">*</span></Label>
        <Input value={v.title} onChange={(e) => setV((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: جروب واتساب الكورس الجديد" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">النص (اختياري)</Label>
        <Textarea rows={3} value={v.body} onChange={(e) => setV((p) => ({ ...p, body: e.target.value }))} placeholder="كل التنبيهات والمواد هتنزل على الجروب — انضم قبل ما يقفل" />
      </div>

      {/* الصورة */}
      <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-300">
          <ImagePlus className="h-3.5 w-3.5 text-gold" /> صورة داخل الإشعار (اختياري)
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            dir="ltr"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="رابط صورة جوجل درايف «أي شخص لديه الرابط» أو أي رابط"
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
        {driveAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500">صور من مكتبة درايف:</span>
            {driveAssets.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setImage(a.url)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-gold/30 hover:text-gold-light"
              >
                🖼 {a.title}
              </button>
            ))}
          </div>
        )}
        {imgSrc && (
          <div className="flex items-center gap-3 rounded-xl border border-gold/15 bg-gold/[0.04] p-3">
            <img src={imgSrc} alt="معاينة الصورة" className="h-20 w-32 rounded-lg border border-gold/20 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-zinc-400">معاينة كما سيراها الطالب</p>
              <p className="mt-0.5 truncate text-[10px] text-zinc-600" dir="ltr">{image}</p>
            </div>
            <button type="button" onClick={() => setImage("")} className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* الأزرار المتعددة */}
      <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-300">
            <Link2 className="h-3.5 w-3.5 text-gold" /> أزرار الإجراء — حتى {MAX_BUTTONS} أزرار
          </p>
          <span className="text-[10px] font-bold text-zinc-600">{buttons.length}/{MAX_BUTTONS}</span>
        </div>

        {buttons.map((b, i) => {
          const linkType = b.url.trim() ? detectLinkType(b.url) : null;
          return (
            <div key={i} className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold text-zinc-400">الزر {i + 1}</p>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                    <Switch checked={b.newTab} onCheckedChange={(chk) => updateButton(i, { newTab: chk })} />
                    تاب جديد
                  </label>
                  <button
                    type="button"
                    onClick={() => removeButton(i)}
                    disabled={buttons.length <= 1}
                    aria-label={`حذف الزر ${i + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/[0.05] text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={b.label} onChange={(e) => updateButton(i, { label: e.target.value })} placeholder="نص الزر — مثال: انضم للجروب" className="h-10 text-sm" />
                <Input dir="ltr" value={b.url} onChange={(e) => updateButton(i, { url: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="h-10 text-xs" />
              </div>
              {b.label.trim() && b.url.trim() && (
                <div className="flex items-center gap-2 rounded-lg border border-gold/15 bg-gold/[0.03] px-3 py-2">
                  <span className="text-[10px] font-bold text-zinc-500">معاينة:</span>
                  <CtaLink label={b.label} url={b.url} linkType={linkType} newTab={b.newTab} />
                </div>
              )}
              {driveAssets.length > 0 && i === buttons.length - 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500">روابط سريعة:</span>
                  {driveAssets.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateButton(i, { url: a.url, label: b.label || a.title })}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-gold/30 hover:text-gold-light"
                    >
                      📁 {a.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {buttons.length < MAX_BUTTONS && (
          <button
            type="button"
            onClick={addButton}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/30 bg-gold/[0.02] text-xs font-bold text-gold-light transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
          >
            <Plus className="h-4 w-4" />
            إضافة زر آخر
          </button>
        )}
      </div>

      {/* الاستهداف */}
      <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-xs font-extrabold text-zinc-300">الجمهور المستهدف</p>

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-zinc-500">الفرقات (فارغ = الكل)</p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <label key={g.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 has-[:checked]:border-gold/40 has-[:checked]:bg-gold/[0.1] has-[:checked]:text-gold-light">
                <Checkbox checked={grades.includes(g.value)} onCheckedChange={() => toggleIn(grades, setGrades, g.value)} />
                {g.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-zinc-500">الشعب (فارغ = الكل)</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <label key={s.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 has-[:checked]:border-gold/40 has-[:checked]:bg-gold/[0.1] has-[:checked]:text-gold-light">
                <Checkbox checked={sections.includes(s.value)} onCheckedChange={() => toggleIn(sections, setSections, s.value)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">الجنس</Label>
            <Select value={genders[0] ?? "ANY"} onValueChange={(val) => setGenders(val === "ANY" ? [] : [val])}>
              <SelectTrigger dir="rtl" className="h-10 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">الكل</SelectItem>
                {GENDERS.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">المواهب</Label>
            <Select value={talent} onValueChange={setTalent}>
              <SelectTrigger dir="rtl" className="h-10 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">الكل</SelectItem>
                <SelectItem value="HAS">لديهم مواهب</SelectItem>
                <SelectItem value="VERIFIED">مواهب موثقة</SelectItem>
                <SelectItem value="NONE">بدون مواهب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">الحضور</Label>
            <Select value={attendance} onValueChange={setAttendance}>
              <SelectTrigger dir="rtl" className="h-10 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">الكل</SelectItem>
                <SelectItem value="ATTENDED">الحاضرون</SelectItem>
                <SelectItem value="NOT_ATTENDED">غير الحاضرين</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {runs.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">مشاركو جلسة محددة</Label>
            <Select value={sessionTarget} onValueChange={setSessionTarget}>
              <SelectTrigger dir="rtl" className="h-10 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الطلاب (بدون فلتر جلسة)</SelectItem>
                {runs.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={doPreview} disabled={pending} className="rounded-lg border-white/15 text-xs text-zinc-300">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            سيصل إلى كم طالب؟
          </Button>
          {preview !== null && (
            <span className="rounded-full border border-gold/30 bg-gold/[0.1] px-3 py-1 text-xs font-extrabold text-gold-light">
              {preview === 0 ? "لا أحد يطابق الفلاتر!" : `${preview} طالبًا`}
            </span>
          )}
        </div>
      </div>

      {/* انتهاء الصلاحية */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-zinc-200">يختفي من الطلاب بعد (اختياري)</Label>
        <Input type="datetime-local" dir="ltr" value={v.expiresAt} onChange={(e) => setV((p) => ({ ...p, expiresAt: e.target.value }))} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={submit} disabled={pending} className="h-12 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night hover:shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)]">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? <Save className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          {editing ? "حفظ التعديلات" : "إرسال الإشعار"}
        </Button>
        {editing && (
          <Button variant="outline" onClick={() => onDone?.()} disabled={pending} className="h-12 rounded-xl border-white/15 text-sm font-bold text-zinc-300">
            <XCircle className="h-4 w-4" /> إلغاء
          </Button>
        )}
      </div>
    </div>
  );
}
