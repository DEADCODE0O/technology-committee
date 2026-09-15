import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardList, CalendarClock, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { findTargetedStudentIds, parseTarget } from "@/lib/targeting";
import { makeDataKey } from "@/lib/validation";
import { StudentShell } from "@/components/student/student-shell";
import { DataResponseForm, type RespField } from "@/components/student/data-response-form";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  صفحة طلب بيانات — الطالب يجيب على طلب اللجنة الموجه له
// ═══════════════════════════════════════════════════════════════

function formatDateAr(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function formatSavedValue(raw: string): string {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.join("، ") : String(v);
  } catch {
    return raw;
  }
}

export default async function StudentDataRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const profile = user.profile!;
  const { id } = await params;

  const request = await db.dataRequest.findUnique({ where: { id } });
  if (!request) notFound();

  // هل الطالب مستهدف بهذا الطلب؟
  const targetedIds = await findTargetedStudentIds(parseTarget(request.target));
  if (!targetedIds.includes(user.id)) notFound();

  let fields: RespField[] = [];
  try { fields = JSON.parse(request.fields); } catch { fields = []; }

  const [existing, saved] = await Promise.all([
    db.dataResponse.findUnique({
      where: { requestId_userId: { requestId: id, userId: user.id } },
    }),
    // البيانات المحفوظة تُستخدم دائمًا — لا يُسأل الطالب مجددًا
    db.studentData.findMany({ where: { userId: user.id } }),
  ]);

  let initialAnswers: Record<string, string | string[]> = {};
  if (existing) {
    try { initialAnswers = JSON.parse(existing.answers); } catch { initialAnswers = {}; }
  }

  const savedMap = new Map(saved.map((x) => [x.key, x.value]));
  const savedFields: Array<{ id: string; label: string; value: string }> = [];
  const pendingFields: RespField[] = [];
  for (const f of fields as Array<RespField & { key?: string }>) {
    const raw = !existing ? savedMap.get(f.key || makeDataKey(f.label)) : undefined;
    if (raw !== undefined) {
      savedFields.push({ id: f.id, label: f.label, value: raw });
      try { initialAnswers[f.id] = JSON.parse(raw); } catch { initialAnswers[f.id] = raw; }
    } else {
      pendingFields.push(f);
    }
  }
  const allReused = !existing && fields.length > 0 && pendingFields.length === 0;

  const deadlinePassed = request.deadline && new Date(request.deadline) < new Date();
  const disabled = request.status !== "OPEN" || !!deadlinePassed;

  return (
    <StudentShell user={{ name: profile.fullName, email: user.email }} active="dashboard">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/panel" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-gold-light">
          <ArrowRight className="h-3.5 w-3.5" />
          العودة للوحة
        </Link>

        <section className="rounded-3xl border border-gold/20 bg-surface p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08] text-gold">
              <ClipboardList className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-extrabold text-zinc-50">{request.title}</h1>
          </div>
          {request.description && (
            <p className="mt-3 text-sm leading-7 text-zinc-400">{request.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {request.status === "OPEN" && !deadlinePassed ? (
              <span className="rounded-md border border-gold/25 bg-gold/[0.08] px-2 py-0.5 text-gold-light">مفتوح للإجابة</span>
            ) : (
              <span className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-2 py-0.5 text-red-300">
                {deadlinePassed ? "انتهى الموعد النهائي" : "مغلق"}
              </span>
            )}
            {request.deadline && (
              <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-400">
                <CalendarClock className="h-3 w-3" />
                حتى {formatDateAr(new Date(request.deadline))}
              </span>
            )}
            {existing && (
              <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-0.5 text-emerald-300">
                أجبت — يمكنك التعديل
              </span>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.06] bg-surface p-5 sm:p-6">
          {existing ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
              <p className="mt-3 text-base font-extrabold text-zinc-100">تم استلام بياناتك بالفعل</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">لن نطلب منك نفس البيانات مرة أخرى إلا إذا أرسلت الإدارة طلبًا جديدًا لجمعها مرة أخرى.</p>
            </div>
          ) : allReused ? (
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-6">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-gold" />
                <p className="mt-3 text-base font-extrabold text-gold-light">بياناتك محفوظة بالفعل</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">تم استخدام المعلومات الموجودة في ملفك بدل إعادة سؤالك عنها.</p>
              </div>
              <div className="mt-5 space-y-2">
                {savedFields.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-[11px] font-bold text-zinc-500">{item.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-zinc-200">{formatSavedValue(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">لا أسئلة في هذا الطلب</p>
          ) : (
            <>
              {savedFields.length > 0 && (
                <div className="mb-5 rounded-2xl border border-gold/15 bg-gold/[0.03] p-4">
                  <p className="mb-2 text-xs font-extrabold text-gold-light">بيانات استخدمناها من ملفك</p>
                  <div className="space-y-1.5">
                    {savedFields.map((item) => <p key={item.id} className="text-xs text-zinc-400"><span className="font-bold text-zinc-300">{item.label}:</span> {formatSavedValue(item.value)}</p>)}
                  </div>
                </div>
              )}
              <DataResponseForm requestId={request.id} fields={pendingFields} initialAnswers={initialAnswers} disabled={disabled} />
            </>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
