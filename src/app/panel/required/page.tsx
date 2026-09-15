import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ClipboardList, Lock, LogOut, Sparkles, CheckCircle2 } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getStudentGate } from "@/lib/gate";
import { logoutAction } from "@/actions/auth";
import { StudentCodeGateForm } from "@/components/student/student-code-gate-form";
import { DataResponseForm, type RespField } from "@/components/student/data-response-form";

export const dynamic = "force-dynamic";

function formatDateAr(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

// ═══════════════════════════════════════════════════════════════
//  بوابة البيانات المطلوبة — تظهر فور فتح المنصة عندما تكون
//  هناك بيانات إلزامية (طلب بيانات / كود طالب) لم تُسلَّم بعد.
//  الطالب يظل هنا حتى يكملها — لا مفر إلا التسليم أو الخروج.
// ═══════════════════════════════════════════════════════════════

export default async function RequiredDataPage() {
  const user = await requireStudent({ skipRequiredGate: true });
  const gate = await getStudentGate(user);

  // كل شيء مكتمل؟ لا سبب للبقاء هنا
  if (!gate.blocked) redirect("/panel");

  const profile = user.profile!;
  const remaining = (gate.needsStudentCode ? 1 : 0) + gate.mandatoryRequests.length;

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="noise-overlay" aria-hidden="true" />

      {/* رأس الصفحة — بلا أي تنقل هروب */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/panel/required" className="flex items-center gap-2.5" aria-label="البيانات المطلوبة">
            <Image src="/images/logo.png" alt="شعار اللجنة" width={40} height={40} className="h-9 w-9" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold text-zinc-100">البيانات المطلوبة</span>
              <span className="font-latin text-[8px] tracking-[0.25em] text-gold/60">TECHNOLOGY COMMITTEE</span>
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-zinc-400 transition-colors hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        {/* بطاقة التوضيح */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gold/[0.04] p-6 sm:p-8">
          <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-night/60 px-3.5 py-1.5 text-xs font-bold text-gold-light">
              <Lock className="h-3.5 w-3.5" />
              مطلوبة قبل استخدام المنصة
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-relaxed text-zinc-50 sm:text-3xl">
              أهلاً {profile.fullName.split(" ")[0]} — عندنا {remaining === 1 ? "طلب واحد ينتظرك" : `${remaining} طلبات تنتظرك`}
            </h1>
            <p className="mt-3 text-sm leading-loose text-zinc-400">
              اللجنة محتاجة منك بيانات مهمة قبل ما تكمل استخدام المنصة — بمجرد ما تسلّمها هتقدر تدخل لوحتك
              وتتابع ورشك ونقاطك بشكل طبيعي. الطلبات دي إلزامية ومفعّلة الآن.
            </p>
          </div>
        </section>

        {/* كود الطالب */}
        {gate.needsStudentCode && (
          <section className="mt-6 rounded-3xl border border-white/[0.07] bg-surface p-6 sm:p-8">
            <StudentCodeGateForm hint={gate.codeHint} pattern={gate.codePattern} />
          </section>
        )}

        {/* الطلبات الإلزامية */}
        {gate.mandatoryRequests.map((r, i) => (
          <section key={r.id} className="mt-6 rounded-3xl border border-white/[0.07] bg-surface p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-base font-extrabold text-zinc-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/30 bg-gold/[0.1] text-xs font-extrabold text-gold-light">
                    {i + 1}
                  </span>
                  {r.title}
                </p>
                {r.description && <p className="mt-2 text-xs leading-6 text-zinc-500">{r.description}</p>}
              </div>
              {r.deadline && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/[0.05] px-3 py-1 text-[11px] font-bold text-red-300">
                  <ClipboardList className="h-3 w-3" />
                  قبل {formatDateAr(r.deadline)}
                </span>
              )}
            </div>
            <DataResponseForm requestId={r.id} fields={r.fields as RespField[]} initialAnswers={{}} disabled={false} />
          </section>
        ))}

        {/* تلميح أخير */}
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-zinc-600">
          <Sparkles className="h-3.5 w-3.5 text-gold/50" />
          بعد تسليم كل المطلوب سيتم تحويلك تلقائيًا إلى لوحتك
        </p>
      </main>

      <footer className="border-t border-white/[0.06] py-5">
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
          <CheckCircle2 className="h-3 w-3 text-gold/40" />
          منصة أنشطة اللجنة التكنولوجية
        </p>
      </footer>
    </div>
  );
}
