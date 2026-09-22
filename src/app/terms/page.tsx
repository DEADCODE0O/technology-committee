import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "شروط الخدمة والاستخدام | اللجنة التكنولوجية",
  description: "شروط وضوابط استخدام منصة اللجنة التكنولوجية للأنشطة الطلابية",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-zinc-200 selection:bg-gold/30 selection:text-white">
      {/* Glow Layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="gold-glow-bg absolute -top-40 left-1/2 h-96 w-full -translate-x-1/2 opacity-40 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/welcome" className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="شعار اللجنة" width={40} height={40} className="h-10 w-10" />
            <div>
              <span className="block text-sm font-extrabold text-white">اللجنة التكنولوجية</span>
              <span className="block text-[9px] font-medium tracking-widest text-gold/80">TECHNOLOGY COMMITTEE</span>
            </div>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-200 transition-colors hover:bg-white/[0.08]"
          >
            <span>العودة لتسجيل الدخول</span>
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">شروط الخدمة وسياسة الاستخدام</h1>
          <p className="mt-2 text-sm text-zinc-400">Terms of Service — آخر تحديث: سبتمبر 2026</p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/[0.08] bg-zinc-900/60 p-6 backdrop-blur-xl sm:p-10">
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <CheckCircle2 className="h-5 w-5" />
              <h2>1. قبول الشروط</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              باستخدامك لمنصة اللجنة التكنولوجية أو تسجيل الدخول عبر وسائل التسجيل المعتمدة (مثل Facebook أو Google)، فإنك توافق على الالتزام بجميع القواعد والشروط الأكاديمية والتنظيمية الموضحة هنا.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <ShieldCheck className="h-5 w-5" />
              <h2>2. الاستخدام الأكاديمي والطلابي</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              المنصة مخصصة لدعم المسار التعليمي والأنشطة الطلابية والتدريبية بالمعهد. يُشترط أن تكون جميع البيانات المدخلة صحيحة ومطابقة لبيانات الطالب الأكاديمية.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <AlertTriangle className="h-5 w-5" />
              <h2>3. قواعد السلوك والانضباط</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              يُحظر تمامًا استخدام المنصة في أي سلوك مسيء أو نشر محتوى غير لائق أو مخالف للقيم الأكاديمية واللوائح الجامعية. تحتفظ إدارة اللجنة بالحق الكامل في تعليق أو حظر أي حساب يخالف هذه المعايير.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <FileText className="h-5 w-5" />
              <h2>4. حقوق الملكية الفكرية</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              جميع محتويات المنصة من تصاميم وهوية وشعارات ومواد تدريبية هي ملك للجنة التكنولوجية، ولا يجوز إعادة نشرها أو استخدامها لأغراض تجارية دون إذن رسمي مسبق.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-500">
          © 2026 اللجنة التكنولوجية — Technology Committee. جميع الحقوق محفوظة.
        </div>
      </main>
    </div>
  );
}
