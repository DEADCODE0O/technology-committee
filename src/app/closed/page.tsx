import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  MessageCircle,
  Phone,
  Copy,
  ShieldAlert,
  ArrowUpRight,
  Lock,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/platform/community-links-card";
import { ClosedContactActions } from "@/components/platform/closed-contact-actions";

export const metadata: Metadata = {
  title: "تم إغلاق المنصة | اللجنة التكنولوجية",
  description:
    "تعتذر اللجنة التكنولوجية من جميع الطلاب بسبب توقف المنصة عن العمل، وذلك وفقاً لتوجيهات من إدارة الأنشطة الطلابية، وذلك لحماية الطلاب من التشتت بين المصادر المختلفة.",
};

export default function ClosedPlatformPage() {
  const phoneNumber = "01552370838";
  const whatsappUrl = `https://wa.me/201552370838?text=${encodeURIComponent(
    "السلام عليكم، أرغب في الانضمام إلى اللجنة التكنولوجية"
  )}`;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-background text-foreground selection:bg-amber-500/20 selection:text-amber-300">
      {/* خلفية جمالية خافتة بتأثيرات ذهبية ودخانية متوافقة مع هوية المنصة */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-gradient-to-b from-amber-500/10 via-amber-700/5 to-transparent blur-3xl opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-t from-emerald-500/10 to-transparent blur-3xl opacity-50"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl mx-auto space-y-6">
        {/* بطاقة الشعار والجهة الرسمية */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-surface border border-white/10 shadow-2xl overflow-hidden p-3 group">
            <Image
              src="/images/logo.png"
              alt="شعار اللجنة التكنولوجية"
              width={72}
              height={72}
              className="object-contain drop-shadow"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>بيان رسمي للطلاب · اللجنة التكنولوجية</span>
          </div>
        </div>

        {/* البطاقة الرئيسية للرسالة */}
        <div className="relative rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/40 text-center space-y-6">
          {/* العنوان الرئيسي */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-50 tracking-tight">
              تم إغلاق المنصة
            </h1>
            <div className="h-1 w-16 mx-auto rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />
          </div>

          {/* نص الاعتذار والبيان الرسمي */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:p-5 text-right sm:text-center">
            <p className="text-sm sm:text-base leading-relaxed font-semibold text-zinc-200">
              تعتذر اللجنة التكنولوجية من جميع الطلاب بسبب توقف المنصة عن العمل،
              وذلك وفقاً لتوجيهات من إدارة الأنشطة الطلابية، وذلك لحماية الطلاب من
              التشتت بين المصادر المختلفة.
            </p>
            <p className="mt-3 text-xs sm:text-sm font-bold text-amber-400">
              نشكر جداً تفهمكم.
            </p>
          </div>

          {/* قسم الانضمام والتواصل مع اللجنة */}
          <div className="pt-2 border-t border-white/[0.08] space-y-4">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-zinc-400">
                للانضمام إلى اللجنة التكنولوجية تواصل مع الرقم التالي:
              </p>
              <div className="inline-block font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-wider dir-ltr">
                {phoneNumber}
              </div>
            </div>

            {/* الأزرار التفاعلية (زر واتساب كبير + أزرار مساعدة) */}
            <ClosedContactActions
              phoneNumber={phoneNumber}
              whatsappUrl={whatsappUrl}
            />
          </div>
        </div>

        {/* تذييل الصفحة وحقوق اللجنة مع رابط سري لأدمن المنصة */}
        <footer className="flex flex-col items-center justify-center gap-2 text-center text-xs text-zinc-500">
          <p className="font-semibold">
            © {new Date().getFullYear()} اللجنة التكنولوجية — اتحاد الطلاب
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors opacity-40 hover:opacity-100"
            title="بوابة الإدارة"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>بوابة الإدارة</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}
