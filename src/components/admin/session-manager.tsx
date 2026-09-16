"use client";

// ═══════════════════════════════════════════════════════════════
//  مدير الجلسات (المحاضرات/مواعيد الورش) — وحدة التسجيل في v4
//  كل جلسة: مقاعدها + نافذة تسجيلها + QR حضورها + موادها
// ═══════════════════════════════════════════════════════════════

import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, QrCode, Link2, Printer, Users, ShieldCheck, Maximize2, Download, Eye, Image as ImageIcon } from "lucide-react";
import { saveSession, deleteSession, toggleSessionRegistration } from "@/actions/activities";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SESSION_STATUSES, ACTIVITY_TYPE_SESSION_WORD } from "@/lib/constants";
import { detectLinkType, resolveImageSrc } from "@/lib/links";
import { CLOSING_MODES } from "@/lib/activities";
import { toLocalInput, toUtcIso, formatCairoDate } from "@/lib/dates";
import { ImagePreviewModal } from "@/components/admin/image-preview-modal";

export type AdminSession = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  image?: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  presenter: string | null;
  onlineUrl: string | null;
  onlineLabel: string | null;
  materialUrl: string | null;
  materialLabel: string | null;
  status: string;
  qrToken: string;
  // التسجيل
  seats: number;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  closingMode: string;
  registrationOpen: boolean;
  allowGuests: boolean;
  allowAdminOverride: boolean;
  registeredCount: number;
  presentCount: number;
  state: "UPCOMING" | "ONGOING" | "COMPLETED";
};

type FormState = {
  title: string;
  description: string;
  image: string;
  startsAt: string;
  endsAt: string;
  location: string;
  presenter: string;
  onlineUrl: string;
  onlineLabel: string;
  materialUrl: string;
  materialLabel: string;
  status: string;
  // التسجيل
  seats: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  closingMode: string;
  registrationOpen: boolean;
  allowGuests: boolean;
  allowAdminOverride: boolean;
};

export function SessionManager({
  activityId,
  activityType,
  activityTitle,
  sessions,
  canManage,
  defaultLocation,
}: {
  activityId: string;
  activityType: string;
  activityTitle: string;
  sessions: AdminSession[];
  canManage: boolean;
  defaultLocation: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [adding, setAdding] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);

  const sessionWord = ACTIVITY_TYPE_SESSION_WORD[activityType] ?? "جلسة";
  const isCourse = activityType === "COURSE";

  const publicOrigin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => null
  );

  const emptyForm = (): FormState => {
    const next = new Date(Date.now() + 24 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      title: isCourse ? `المحاضرة ${sessions.length + 1}: ` : "",
      description: "",
      image: "",
      startsAt: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T17:00`,
      endsAt: "",
      location: defaultLocation,
      presenter: "",
      onlineUrl: "", onlineLabel: "",
      materialUrl: "", materialLabel: "",
      status: "SCHEDULED",
      seats: "50",
      registrationOpensAt: "",
      registrationClosesAt: "",
      closingMode: "EITHER",
      registrationOpen: true,
      allowGuests: true,
      allowAdminOverride: true,
    };
  };

  const [form, setForm] = useState<FormState>(emptyForm);

  const openAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm());
  };

  const openEdit = (s: AdminSession) => {
    setEditing(s);
    setAdding(true);
    setForm({
      title: s.title,
      description: s.description ?? "",
      image: s.image ?? "",
      startsAt: toLocalInput(s.startsAt),
      endsAt: toLocalInput(s.endsAt),
      location: s.location ?? defaultLocation,
      presenter: s.presenter ?? "",
      onlineUrl: s.onlineUrl ?? "",
      onlineLabel: s.onlineLabel ?? "",
      materialUrl: s.materialUrl ?? "",
      materialLabel: s.materialLabel ?? "",
      status: s.status,
      seats: String(s.seats),
      registrationOpensAt: toLocalInput(s.registrationOpensAt),
      registrationClosesAt: toLocalInput(s.registrationClosesAt),
      closingMode: s.closingMode,
      registrationOpen: s.registrationOpen,
      allowGuests: s.allowGuests,
      allowAdminOverride: s.allowAdminOverride,
    });
  };

  const submit = () => {
    if (form.title.trim().length < 3 && isCourse) return toast.error("عنوان المحاضرة قصير جدًا");
    if (!form.startsAt) return toast.error("حدد موعد الجلسة");
    startTransition(async () => {
      const res = await saveSession({
        id: editing?.id,
        activityId,
        title: form.title,
        description: form.description || undefined,
        image: form.image || undefined,
        startsAt: toUtcIso(form.startsAt) || form.startsAt,
        endsAt: toUtcIso(form.endsAt) || undefined,
        location: form.location || undefined,
        presenter: form.presenter || undefined,
        onlineUrl: form.onlineUrl || undefined,
        onlineLabel: form.onlineLabel || undefined,
        materialUrl: form.materialUrl || undefined,
        materialLabel: form.materialLabel || undefined,
        status: form.status,
        seats: Number(form.seats) || 50,
        registrationOpensAt: toUtcIso(form.registrationOpensAt) || undefined,
        registrationClosesAt: toUtcIso(form.registrationClosesAt) || undefined,
        closingMode: form.closingMode,
        registrationOpen: form.registrationOpen,
        allowGuests: form.allowGuests,
        allowAdminOverride: form.allowAdminOverride,
      });
      if (res.ok) {
        toast.success(editing ? "تم حفظ الجلسة" : isCourse ? "تمت إضافة المحاضرة" : "تم تحديد موعد الورشة");
        setAdding(false);
        setEditing(null);
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  const remove = (s: AdminSession) => {
    if (!confirm(`حذف «${s.title}»؟ (إن كان عليها حضور استخدم «ملغاة» بدلًا من الحذف)`)) return;
    startTransition(async () => {
      const res = await deleteSession(s.id);
      if (res.ok) { toast.success("تم الحذف"); router.refresh(); }
      else toast.error(res.error || "تعذر الحذف");
    });
  };

  const sessionQrUrl = (token: string) => (publicOrigin ? `${publicOrigin}/checkin/${token}` : null);

  return (
    <div className="space-y-4">
      {/* قائمة الجلسات */}
      {sessions.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-10 text-center">
          <p className="text-sm font-bold text-zinc-300">
            {isCourse ? "لا توجد محاضرات بعد" : "لم يُحدد موعد الورشة بعد"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {isCourse
              ? "أضف محاضرات الكورس — لكل محاضرة مقاعدها ونافذة تسجيلها وعدّها التنازلي"
              : "حدد موعد الورشة ومقاعدها ونافذة تسجيلها — الطلاب يشوفون عدًّا تنازليًا"}
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {sessions.map((s) => (
          <li key={s.id} className={`rounded-2xl border p-4 ${s.status === "CANCELLED" ? "border-red-400/20 bg-red-500/[0.03]" : s.state === "COMPLETED" ? "border-white/[0.06] bg-white/[0.02]" : "border-gold/20 bg-gold/[0.04]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {s.image && (
                  <button
                    type="button"
                    onClick={() => setPreviewImg({ src: s.image!, title: `${sessionWord}: ${s.title}` })}
                    className="group relative shrink-0 h-14 w-14 overflow-hidden rounded-xl border border-white/10 hover:border-gold/40 transition-colors cursor-pointer"
                    title="فحص وتكبير وتحميل صورة الجلسة"
                  >
                    <img src={resolveImageSrc(s.image) || s.image} alt={s.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="h-4 w-4 text-gold-light" />
                    </span>
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-extrabold ${s.status === "CANCELLED" ? "text-zinc-400 line-through" : "text-zinc-100"}`}>
                      {isCourse && `${s.order}. `}{s.title}
                    </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    s.state === "ONGOING" ? "border border-gold/40 bg-gold/[0.12] text-gold-light"
                    : s.state === "UPCOMING" ? "border border-white/10 bg-white/[0.03] text-zinc-400"
                    : "border border-white/10 bg-white/[0.02] text-zinc-500"
                  }`}>
                    {s.state === "ONGOING" ? "جارية" : s.state === "UPCOMING" ? "قادمة" : "منتهية"}
                  </span>
                  {!s.registrationOpen && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">التسجيل مغلق يدويًا</span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                  <span>{formatCairoDate(s.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}</span>
                  {s.location && <span>📍 {s.location}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.registeredCount}/{s.seats}</span>
                  {s.presentCount > 0 && <span className="text-gold/80">✓ {s.presentCount} حاضروا</span>}
                </p>
                {/* نافذة التسجيل */}
                <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                  التسجيل: {s.registrationOpensAt ? `يُفتح ${formatCairoDate(s.registrationOpensAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}` : "دائمًا متاح"}
                  {s.registrationClosesAt ? ` · يقفل ${formatCairoDate(s.registrationClosesAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}` : ""}
                  {" · "}{CLOSING_MODES.find((m) => m.value === s.closingMode)?.label ?? s.closingMode}
                </p>
                {(s.materialUrl || s.onlineUrl) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.materialUrl && (
                      <a href={s.materialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-gold/30">
                        📁 {s.materialLabel || "المواد"} {detectLinkType(s.materialUrl) === "DRIVE" ? "(درايف)" : ""}
                      </a>
                    )}
                    {s.onlineUrl && (
                      <a href={s.onlineUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-gold/30">
                        🔗 {s.onlineLabel || "أونلاين"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Link2Quick href={`/admin/sessions/${s.id}`} label="إدارة" />
                {canManage && (
                  <>
                    <button onClick={() => setQrFor(qrFor === s.id ? null : s.id)} title="كود QR للجلسة"
                      className={`rounded-lg border p-2 transition-colors ${qrFor === s.id ? "border-gold/40 bg-gold/[0.15] text-gold-light" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-gold-light"}`}>
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(s)} title="تعديل" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition-colors hover:text-gold-light">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(s)} title="حذف" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition-colors hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* QR الجلسة */}
            {qrFor === s.id && sessionQrUrl(s.qrToken) && (
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-gold/20 bg-night/60 p-4">
                <div className="rounded-xl bg-white p-2">
                  <img src={`/api/qr?data=${encodeURIComponent(sessionQrUrl(s.qrToken)!)}&size=180`} alt={`QR — ${s.title}`} width={180} height={180} className="h-auto w-[160px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-gold-light">كود حضور هذه الجلسة</p>
                  <p className="mt-1 break-all rounded-lg bg-white/[0.03] px-2 py-1.5 text-[10px] text-zinc-500" dir="ltr">{sessionQrUrl(s.qrToken)}</p>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="mt-2 rounded-lg border-white/15 text-xs text-zinc-300">
                    <Printer className="h-3.5 w-3.5" /> طباعة
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* نموذج الإضافة/التعديل */}
      {adding ? (
        <div className="space-y-4 rounded-3xl border border-gold/25 bg-surface p-5">
          <h3 className="text-sm font-extrabold text-gold-light">
            {editing ? "تعديل الجلسة" : isCourse ? "محاضرة جديدة" : `تحديد ${sessionWord}`}
          </h3>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">
              {isCourse ? "عنوان المحاضرة" : "عنوان الجلسة (اختياري)"} {isCourse && <span className="text-gold">*</span>}
            </Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={isCourse ? "مثال: المدخل إلى الذكاء الاصطناعي" : activityTitle} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">
              صورة مخصصة للمحاضرة / الجلسة (اختياري)
            </Label>
            <Input
              value={form.image}
              onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
              placeholder="رابط صورة مباشر أو رابط Google Drive (إن تُركت فارغة تُعرض صورة الورشة الرئيسية)"
              dir="ltr"
            />
            {form.image && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.04] p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={resolveImageSrc(form.image) || form.image}
                    alt="معاينة"
                    className="h-10 w-16 rounded-lg border border-white/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200">معاينة صورة الجلسة</p>
                    <p className="truncate text-[10px] text-zinc-500 max-w-[240px]" dir="ltr">{form.image}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewImg({ src: form.image, title: form.title || "صورة الجلسة" })}
                  className="h-8 gap-1.5 rounded-lg border-gold/30 bg-gold/[0.1] text-xs font-bold text-gold-light hover:bg-gold/20"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> فحص وتكبير وتحميل
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">موعد الجلسة <span className="text-gold">*</span></Label>
              <Input type="datetime-local" dir="ltr" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">النهاية (اختياري)</Label>
              <Input type="datetime-local" dir="ltr" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">المكان</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="مثال: قاعة النشاط بالنادي" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">المحاضر (اختياري)</Label>
              <Input value={form.presenter} onChange={(e) => setForm((p) => ({ ...p, presenter: e.target.value }))} />
            </div>
          </div>

          {/* ── التسجيل: كل جلسة معاملة الورشة ── */}
          <div className="space-y-4 rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
            <p className="text-xs font-extrabold text-gold-light">التسجيل في هذه الجلسة — مستقل عن موعد الإقامة</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-300">فتح التسجيل (اختياري)</Label>
                <Input type="datetime-local" dir="ltr" value={form.registrationOpensAt} onChange={(e) => setForm((p) => ({ ...p, registrationOpensAt: e.target.value }))} />
                <p className="text-[10px] text-zinc-500">قبلها يظهر للطالب «التسجيل يُفتح بعد» مع عد تنازلي</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-300">إغلاق التسجيل (اختياري)</Label>
                <Input type="datetime-local" dir="ltr" value={form.registrationClosesAt} onChange={(e) => setForm((p) => ({ ...p, registrationClosesAt: e.target.value }))} />
                <p className="text-[10px] text-zinc-500">عدّ تنازلي تسويقي حتى الإغلاق</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-300">عدد المقاعد</Label>
                <Input type="number" min={1} max={1000} dir="ltr" value={form.seats} onChange={(e) => setForm((p) => ({ ...p, seats: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-300">وضع إغلاق التسجيل</Label>
              <Select value={form.closingMode} onValueChange={(val) => setForm((p) => ({ ...p, closingMode: val }))}>
                <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLOSING_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-5 text-zinc-500">{CLOSING_MODES.find((m) => m.value === form.closingMode)?.hint}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs font-bold text-zinc-200">التسجيل مفتوح</p>
                <Switch checked={form.registrationOpen} onCheckedChange={(chk) => setForm((p) => ({ ...p, registrationOpen: chk }))} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs font-bold text-zinc-200">السماح بالضيوف</p>
                <Switch checked={form.allowGuests} onCheckedChange={(chk) => setForm((p) => ({ ...p, allowGuests: chk }))} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="flex items-center gap-1 text-xs font-bold text-zinc-200"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> تجاوز الإدارة</p>
                <Switch checked={form.allowAdminOverride} onCheckedChange={(chk) => setForm((p) => ({ ...p, allowAdminOverride: chk }))} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-zinc-200">الوصف (اختياري — يظهر بدل وصف النشاط)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>

          {/* مواد الجلسة — رابط درايف */}
          <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-300">
              <Link2 className="h-3.5 w-3.5 text-gold" /> مواد ومواقع الجلسة (اختياري)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">رابط المواد (جوجل درايف أو غيره)</Label>
                <Input dir="ltr" value={form.materialUrl} onChange={(e) => setForm((p) => ({ ...p, materialUrl: e.target.value }))} placeholder="https://drive.google.com/file/d/..." className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">اسم الزر للطلاب</Label>
                <Input value={form.materialLabel} onChange={(e) => setForm((p) => ({ ...p, materialLabel: e.target.value }))} placeholder="شرائح المحاضرة" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">رابط البث (إن وجد)</Label>
                <Input dir="ltr" value={form.onlineUrl} onChange={(e) => setForm((p) => ({ ...p, onlineUrl: e.target.value }))} placeholder="https://meet.google.com/..." className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">اسم زر البث</Label>
                <Input value={form.onlineLabel} onChange={(e) => setForm((p) => ({ ...p, onlineLabel: e.target.value }))} placeholder="انضم أونلاين" className="text-xs" />
              </div>
            </div>
          </div>

          {editing && (
            <div className="space-y-2">
              <Label className="text-sm font-bold text-zinc-200">حالة الجلسة</Label>
              <Select value={form.status} onValueChange={(val) => setForm((p) => ({ ...p, status: val }))}>
                <SelectTrigger dir="rtl" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending} className="h-11 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "حفظ" : isCourse ? "إضافة المحاضرة" : "حفظ الموعد"}
            </Button>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }} className="h-11 rounded-xl border-white/15 text-sm text-zinc-300">
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        canManage && (
          <Button onClick={openAdd} variant="outline" className="h-11 w-full rounded-xl border-gold/30 bg-gold/[0.06] text-sm font-extrabold text-gold-light hover:bg-gold/[0.12]">
            <Plus className="h-4 w-4" />
            {isCourse ? "إضافة محاضرة" : `تحديد ${sessionWord}`}
          </Button>
        )
      )}

      {/* نافذة فحص وتكبير وتحميل الصور */}
      <ImagePreviewModal
        isOpen={!!previewImg}
        src={previewImg?.src ?? null}
        title={previewImg?.title}
        onClose={() => setPreviewImg(null)}
      />
    </div>
  );
}

function Link2Quick({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex h-9 items-center rounded-xl border border-gold/30 bg-gold/[0.08] px-3.5 text-[11px] font-extrabold text-gold-light transition-colors hover:bg-gold/[0.16]">
      {label}
    </a>
  );
}
