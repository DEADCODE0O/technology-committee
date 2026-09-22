import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Lock, UserCheck, Trash2, Mail } from "lucide-react";

export const metadata = {
  title: "سياسة الخصوصية | اللجنة التكنولوجية",
  description: "سياسة الخصوصية وحماية بيانات المستخدمين في منصة اللجنة التكنولوجية",
};

export default function PrivacyPage() {
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
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">سياسة الخصوصية وحماية البيانات</h1>
          <p className="mt-2 text-sm text-zinc-400">Privacy Policy — آخر تحديث: سبتمبر 2026</p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/[0.08] bg-zinc-900/60 p-6 backdrop-blur-xl sm:p-10">
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <Lock className="h-5 w-5" />
              <h2>1. مقدمة والتزام بالخصوصية</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              نحن في <strong>اللجنة التكنولوجية (Technology Committee)</strong> نلتزم التزامًا تامًا بحماية خصوصية بيانات الطلاب والزوار. توضح هذه السياسة كيف نجمع ونستخدم ونحمي بياناتك عند استخدامك لمنصتنا أو تسجيل الدخول عبر الخدمات المعتمدة مثل Google أو Facebook.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <UserCheck className="h-5 w-5" />
              <h2>2. البيانات التي نجمعها</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              عند تسجيل الدخول أو إنشاء حساب عبر <strong>Facebook Login</strong> أو <strong>Google</strong> أو التسجيل المباشر، فإننا نجمع فقط المعلومات الأساسية الضرورية لتشغيل الحساب:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-zinc-300 pr-2">
              <li><strong>الاسم الأساسي:</strong> لتخصيص تجربتك والتعرف عليك داخل المنصة والأنشطة.</li>
              <li><strong>البريد الإلكتروني:</strong> للتحقق من هوية صاحب الحساب واسترجاع كلمة المرور وإرسال الإشعارات الأكاديمية.</li>
              <li><strong>الصورة الشخصية (Avatar):</strong> لعرضها في الملف الشخصي ولوحة المتصدرين.</li>
              <li><strong>معرّف الحساب الموحد (Provider ID):</strong> لربط تسجيلك المستقبلي بنفس الحساب بأمان.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <ShieldCheck className="h-5 w-5" />
              <h2>3. كيف نستخدم بياناتك</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              تُستخدم البيانات المجمعة حصريًا للأغراض الأكاديمية والأنشطة الطلابية داخل المعهد:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-zinc-300 pr-2">
              <li>إدارة التسجيل في الورش التدريبية والفعاليات والمسابقات.</li>
              <li>احتساب نقاط الحضور والمهام والشارات والرتب التكريمية.</li>
              <li><strong>لا نقوم أبدًا</strong> ببيع أو مشاركة أو تداول بياناتك مع أي جهات خارجية أو إعلانية تجارية.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <Trash2 className="h-5 w-5" />
              <h2>4. حذف البيانات (Data Deletion)</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              يحق لك في أي وقت طلب حذف حسابك وبياناتك بالكامل من المنصة. يمكنك مراجعة دليل حذف البيانات بالتفصيل عبر صفحة{" "}
              <Link href="/data-deletion" className="font-bold text-gold underline underline-offset-4 hover:text-gold-light">
                تعليمات حذف البيانات (Data Deletion Instructions)
              </Link>
              ، أو مراسلتنا مباشرة.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-bold text-gold">
              <Mail className="h-5 w-5" />
              <h2>5. التواصل مع إدارة المنصة</h2>
            </div>
            <p className="text-sm leading-7 text-zinc-300">
              إذا كان لديك أي استفسار أو طلب يتعلق بخصوصيتك أو بياناتك، يمكنك التواصل مع مسؤول المنصة عبر البريد الإلكتروني الرسمي:
            </p>
            <p className="text-sm font-semibold text-gold" dir="ltr">
              am1560774@gmail.com
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
