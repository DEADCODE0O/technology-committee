import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trash2, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "تعليمات حذف البيانات | اللجنة التكنولوجية",
  description: "تعليمات وإرشادات طلب حذف بيانات المستخدم وحساب فيسبوك من منصة اللجنة التكنولوجية",
};

export default function DataDeletionPage() {
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
            <Trash2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">تعليمات حذف بيانات المستخدم</h1>
          <p className="mt-2 text-sm text-zinc-400">User Data Deletion Instructions (Facebook & Platform)</p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/[0.08] bg-zinc-900/60 p-6 backdrop-blur-xl sm:p-10">
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <ShieldCheck className="h-5 w-5" />
              <h2>حقك في حذف البيانات وخصوصيتك</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              وفقًا لسياسات خصوصية Meta / Facebook ولوائح حماية البيانات العامة، يحق لأي مستخدم مسجل عبر Facebook Login طلب إزالة كافة بياناته وحذف ارتباط حسابه بمنصة اللجنة التكنولوجية في أي وقت.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <CheckCircle2 className="h-5 w-5" />
              <h2>الطريقة الأولى: الحذف الفوري عبر إعدادات Facebook</h2>
            </div>
            <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-300 pr-2">
              <li>افتح حسابك على تطبيق أو موقع <strong>Facebook</strong>.</li>
              <li>انتقل إلى <strong>الإعدادات والخصوصية (Settings & Privacy)</strong> ثم اختر <strong>الإعدادات (Settings)</strong>.</li>
              <li>ابحث عن قسم <strong>التطبيقات ومواقع الويب (Apps and Websites)</strong>.</li>
              <li>ابحث عن تطبيق <strong>TECHNOLOGY COMMITTEE</strong> في قائمة التطبيقات النشطة.</li>
              <li>انقر على زر <strong>إزالة (Remove)</strong>.</li>
              <li>يمكنك اختيار إرسال طلب حذف كافة البيانات التي تم مشاركتها مع التطبيق من خلال خيار <strong>View Removed Apps & Request Data Deletion</strong>.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <Mail className="h-5 w-5" />
              <h2>الطريقة الثانية: طلب الحذف المباشر عبر البريد الإلكتروني</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              يمكنك أيضًا مراسلة إدارة المنصة مباشرة لحذف حسابك وبياناتك بالكامل من قواعد البيانات:
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
              <p className="mb-1 text-zinc-400">أرسل رسالة من بريدك المسجل إلى:</p>
              <p className="font-mono text-base font-bold text-gold" dir="ltr">am1560774@gmail.com</p>
              <p className="mt-2 text-xs text-zinc-400">
                بعنوان: <strong>طلب حذف بيانات حساب (Data Deletion Request)</strong>
                <br />
                يتم حذف جميع البيانات المرتبطة بالحساب نهائيًا خلال 48 ساعة من استلام الطلب وإشعارك بنجاح العملية.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-500">
          © 2026 اللجنة التكنولوجية — Technology Committee. جميع الحقوق محفوظة.
        </div>
      </main>
    </div>
  );
}
