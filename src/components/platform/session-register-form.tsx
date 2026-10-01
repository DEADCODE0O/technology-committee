"use client";

// ═══════════════════════════════════════════════════════════════
//  فورم التسجيل الذكي واستمارة المواهب والاستبيان الديناميكي
//  • تجميع الأسئلة في أقسام أنيقة (Sections)
//  • دعم الاختيار المتعدد ودعم "أخرى - اذكرها"
//  • إمكانية تعديل الإجابات للطالب المسجل في أي وقت دون فقدان المقعد
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Hourglass,
  Loader2,
  Sparkles,
  Edit3,
  Layers,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { registerToSession, cancelRegistration, updateRegistrationAnswers } from "@/actions/registrations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SessionFeedbackDialog } from "@/components/platform/session-feedback-dialog";

export type DynField = {
  id: string;
  label: string;
  type: string;
  options: string[];
  section?: string;
  allowCustom?: boolean;
  required: boolean;
};

type ProfilePreview = {
  fullName: string;
  phone: string;
  grade: string;
  section: string;
  studentCode: string | null;
};

type ExistingReg = {
  id: string;
  status: string;
  answers?: string | null;
} | null;

export function SessionRegisterForm({
  sessionId,
  sessionTitle,
  fields,
  profile,
  existing,
  isFull,
  waitlistPos,
  seatsLeft,
}: {
  sessionId: string;
  sessionTitle: string;
  fields: DynField[];
  profile: ProfilePreview;
  existing: ExistingReg;
  isFull: boolean;
  waitlistPos: number | null;
  seatsLeft: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // استخراج الإجابات السابقة إن وجدت
  const initialAnswers = useMemo(() => {
    if (!existing?.answers) return {};
    try {
      const parsed = JSON.parse(existing.answers);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }, [existing?.answers]);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [fileBusy, setFileBusy] = useState<string | null>(null);

  const setAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers((p) => ({ ...p, [fieldId]: value }));
  };

  // تجميع الأسئلة حسب الأقسام
  const groupedFields = useMemo(() => {
    const groups: { section: string; fields: DynField[] }[] = [];
    const sectionMap = new Map<string, DynField[]>();

    fields.forEach((f) => {
      const secName = (f.section || "").trim() || "الأسئلة العامة";
      if (!sectionMap.has(secName)) {
        sectionMap.set(secName, []);
      }
      sectionMap.get(secName)!.push(f);
    });

    sectionMap.forEach((fList, secName) => {
      groups.push({ section: secName, fields: fList });
    });

    return groups;
  }, [fields]);

  // رفع ملف إذا وجد سؤال من نوع ملف
  const uploadAnswerFile = async (fieldId: string, file: File) => {
    setFileBusy(fieldId);
    try {
      const fd = new FormData();
      fd.append("fieldId", fieldId);
      fd.append("file", file);
      const res = await fetch("/api/sessions/upload-answer", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "تعذر رفع الملف");
      setAnswer(fieldId, json.url);
      toast.success("تم رفع الملف بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الملف");
    } finally {
      setFileBusy(null);
    }
  };

  // إرسال التسجيل لأول مرة
  const submitNewRegistration = () => {
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) {
          toast.error(`السؤال «${f.label}» إلزامي`);
          return;
        }
      }
    }
    startTransition(async () => {
      const res = await registerToSession(sessionId, answers);
      if (res.ok) {
        router.refresh();
        if (res.restrictedNotice) {
          toast.warning(res.restrictedNotice, { duration: 7000 });
        } else {
          toast.success(res.waitlisted ? "أُضفت لقائمة الانتظار بنجاح" : "تم حجز مقعدك بنجاح!");
        }
      } else {
        toast.error(res.error || "تعذر التسجيل");
      }
    });
  };

  // تحديث إجابات التسجيل القائم (للطالب المسجل)
  const submitUpdateAnswers = () => {
    if (!existing) return;
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) {
          toast.error(`السؤال «${f.label}» إلزامي`);
          return;
        }
      }
    }
    startTransition(async () => {
      const res = await updateRegistrationAnswers(existing.id, answers);
      if (res.ok) {
        toast.success("تم تحديث خياراتك واستجابتك بنجاح!");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تحديث الخيارات");
      }
    });
  };

  // ═════════════════════════════════════════════════════════════
  // حالة الطالب المسجل بالفعل
  // ═════════════════════════════════════════════════════════════
  if (existing && !isEditing) {
    return (
      <div className="rounded-3xl border border-gold/25 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        {existing.status === "WAITLISTED" ? (
          <div className="flex items-start gap-3.5">
            <div className="rounded-2xl bg-gold/10 p-3 text-gold">
              <Hourglass className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-black text-base text-gold-light">أنت في قائمة الانتظار</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                ترتيبك الحالي: <strong className="text-foreground">رقم {waitlistPos}</strong> — في حال توفر مقعد شاغر سيتم ترقيتك تلقائياً وإشعارك هنا.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3.5">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-black text-base text-emerald-600 dark:text-gold-light">
                مقعدك محجوز بنجاح ✦
              </p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                بانتظارك في موعد الورشة. تم حفظ بياناتك واختياراتك بنجاح.
              </p>
            </div>
          </div>
        )}

        {/* عرض ملخص الخيارات التي سجلها الطالب إن وجدت */}
        {fields.length > 0 && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                استجابتك ورغباتك المسجلة في الورشة
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-8 border-gold/30 bg-gold/[0.05] text-gold-light hover:bg-gold/15 text-xs font-bold"
              >
                <Edit3 className="ml-1 h-3.5 w-3.5" />
                تعديل خياراتي
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((f) => {
                const val = answers[f.id];
                const displayVal = Array.isArray(val) ? val.join("، ") : (val as string) || "لم يُحدد";
                return (
                  <div key={f.id} className="text-xs flex items-baseline justify-between gap-2 border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground font-medium">{f.label}:</span>
                    <span className="font-bold text-foreground text-left max-w-[60%] truncate">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border">
          {fields.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="border-border text-xs font-bold"
            >
              <Edit3 className="ml-1 h-3.5 w-3.5 text-gold" />
              تعديل الاستمارة
            </Button>
          )}

          <SessionFeedbackDialog
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            triggerButtonText="تقييم الورشة والملاحظات السرية"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("هل أنت متأكد من إلغاء التسجيل في هذه الجلسة؟")) return;
              startTransition(async () => {
                const res = await cancelRegistration(existing.id);
                if (res.ok) {
                  toast.success("تم إلغاء التسجيل");
                  router.refresh();
                } else {
                  toast.error(res.error || "تعذر الإلغاء");
                }
              });
            }}
            className="text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 mr-auto"
          >
            إلغاء الحجز
          </Button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // استمارة التسجيل أو التعديل
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-foreground">
            {isEditing ? "تعديل رغباتك واستجابتك في الورشة" : "التسجيل في هذه الجلسة"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEditing ? "يمكنك تحديث المواهب والاهتمامات وسيتم حفظها فوراً" : "اختر اهتماماتك ومواهبك وسجّل حضورك"}
          </p>
        </div>

        {isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground"
          >
            إلغاء التعديل
          </Button>
        )}
      </div>

      {/* بيانات الطالب الأساسية (للتأكيد فقط) */}
      {!isEditing && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="mb-2 text-xs font-bold text-gold-deep dark:text-gold-light">
            بياناتك الشخصية المسجلة بالمنصة:
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <InfoRow label="الاسم" value={profile.fullName} />
            <InfoRow label="الهاتف" value={profile.phone} />
            <InfoRow label="الفرقة والشعبة" value={`${profile.grade} — ${profile.section}`} />
            {profile.studentCode && <InfoRow label="كود الطالب" value={profile.studentCode} />}
          </div>
        </div>
      )}

      {/* أقسام الاستمارة والأسئلة الديناميكية */}
      {fields.length > 0 && (
        <div className="space-y-6">
          {groupedFields.map((group, gIdx) => (
            <div
              key={group.section}
              className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4"
            >
              {/* ترويسة القسم */}
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold text-xs font-black">
                  {gIdx + 1}
                </span>
                <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-gold" />
                  {group.section}
                </h4>
              </div>

              {/* أسئلة هذا القسم */}
              <div className="space-y-4">
                {group.fields.map((f) => {
                  const currentVal = answers[f.id];
                  const currentArr = Array.isArray(currentVal) ? currentVal : [];

                  return (
                    <div key={f.id} className="space-y-2 rounded-xl bg-background/50 p-3 border border-border/40">
                      <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                        <span>
                          {f.label} {f.required && <span className="text-gold">*</span>}
                        </span>
                        {f.type === "CHECKBOX" && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (يمكنك اختيار أكثر من خيار)
                          </span>
                        )}
                      </Label>

                      {/* نصوص عادية */}
                      {f.type === "TEXT" && (
                        <Input
                          value={(currentVal as string) ?? ""}
                          onChange={(e) => setAnswer(f.id, e.target.value)}
                          placeholder="اكتب إجابتك هنا..."
                          className="h-10 text-xs"
                        />
                      )}

                      {f.type === "LONGTEXT" && (
                        <Textarea
                          rows={3}
                          value={(currentVal as string) ?? ""}
                          onChange={(e) => setAnswer(f.id, e.target.value)}
                          placeholder="اكتب تفاصيلك هنا..."
                          className="text-xs"
                        />
                      )}

                      {/* قائمة منسدلة أو اختيار وحيد */}
                      {(f.type === "SELECT" || f.type === "RADIO") && f.options.length > 0 && (
                        <div className="space-y-2">
                          <Select
                            value={(currentVal as string) ?? ""}
                            onValueChange={(v) => setAnswer(f.id, v)}
                          >
                            <SelectTrigger dir="rtl" className="w-full text-xs h-10">
                              <SelectValue placeholder="اختر من القائمة..." />
                            </SelectTrigger>
                            <SelectContent>
                              {f.options.map((o) => (
                                <SelectItem key={o} value={o} className="text-xs">
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* خيار حر إضافي إن وجد */}
                          {f.allowCustom && (
                            <div className="pt-1.5 flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground shrink-0">أو حدد بنفسك:</span>
                              <Input
                                placeholder="اكتب خياراً آخر ترغب به..."
                                value={typeof currentVal === "string" && !f.options.includes(currentVal) ? currentVal : ""}
                                onChange={(e) => setAnswer(f.id, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* اختيار متعدد (CHECKBOX) مع دعم خيار حر */}
                      {f.type === "CHECKBOX" && f.options.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {f.options.map((o) => {
                              const isChecked = currentArr.includes(o);
                              return (
                                <label
                                  key={o}
                                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    isChecked
                                      ? "border-gold/50 bg-gold/10 text-gold-light shadow-sm"
                                      : "border-border bg-muted/20 text-muted-foreground hover:border-border/80"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(chk) => {
                                      const arr = currentArr.slice();
                                      if (chk) {
                                        if (!arr.includes(o)) arr.push(o);
                                      } else {
                                        const idx = arr.indexOf(o);
                                        if (idx > -1) arr.splice(idx, 1);
                                      }
                                      setAnswer(f.id, arr);
                                    }}
                                  />
                                  <span>{o}</span>
                                </label>
                              );
                            })}
                          </div>

                          {/* حقل مخصص لكتابة أخرى من عندك */}
                          {f.allowCustom && (
                            <div className="mt-2 rounded-xl border border-dashed border-border p-2.5 bg-muted/10">
                              <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                                ✏️ ترغب بإضافة فن أو موهبة أخرى غير مذكورة أعلاه؟
                              </span>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="اكتب موهبتك الإضافية..."
                                  value={customInputs[f.id] || ""}
                                  onChange={(e) => setCustomInputs((p) => ({ ...p, [f.id]: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const val = (customInputs[f.id] || "").trim();
                                    if (!val) return;
                                    const arr = currentArr.slice();
                                    if (!arr.includes(val)) {
                                      arr.push(val);
                                      setAnswer(f.id, arr);
                                      setCustomInputs((p) => ({ ...p, [f.id]: "" }));
                                      toast.success(`تمت إضافة «${val}» لاختياراتك`);
                                    }
                                  }}
                                  className="h-8 text-xs font-bold shrink-0"
                                >
                                  إضافة
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ملفات */}
                      {f.type === "FILE" && (
                        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                          <Input
                            type="file"
                            accept="application/pdf,image/*"
                            disabled={fileBusy === f.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadAnswerFile(f.id, file);
                            }}
                            className="h-9 text-xs"
                          />
                          {fileBusy === f.id && <p className="text-[11px] text-gold animate-pulse">جاري رفع الملف...</p>}
                          {typeof currentVal === "string" && currentVal && (
                            <p className="text-xs font-bold text-emerald-500">✓ تم حفظ الملف</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* زر الحفظ / التسجيل */}
      <Button
        onClick={isEditing ? submitUpdateAnswers : submitNewRegistration}
        disabled={pending}
        className="w-full h-12 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-sm font-black text-white shadow-md transition-all"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isEditing ? (
          <>
            <Save className="ml-2 h-4 w-4" />
            حفظ تعديلات الاستمارة
          </>
        ) : isFull ? (
          "انضم لقائمة الانتظار"
        ) : (
          `تأكيد التسجيل${seatsLeft > 0 && seatsLeft < 900000 ? ` (${seatsLeft} متبقٍ)` : ""}`
        )}
      </Button>

      {isFull && !isEditing && (
        <p className="text-center text-xs text-muted-foreground">
          المقاعد ممتلئة — سيتم ترقيتك تلقائياً في حال اعتذار أي مشارك.
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2 border border-border/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}
