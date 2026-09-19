"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  Shield,
  Palette,
  LogOut,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  AtSign,
  Phone,
  FileText,
  Sparkles,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { updateStudentGeneralSettings, changeStudentPassword } from "@/actions/settings";
import { restoreAccountAvatarAction } from "@/actions/profile";
import { logoutAction } from "@/actions/auth";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { FrameWardrobeModal } from "@/components/profile/frame-wardrobe-modal";
import { useTheme } from "next-themes";

interface SettingsManagerProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    username: string | null;
    bio: string | null;
    avatarUrl: string | null;
    avatarFrameId: string | null;
    level: number;
    provider: string;
    profile: {
      fullName: string;
      grade: string;
      section: string;
      phone: string;
    } | null;
  };
}

const GRADE_LABELS: Record<string, string> = {
  FIRST: "الفرقة الأولى",
  SECOND: "الفرقة الثانية",
  THIRD: "الفرقة الثالثة",
  FOURTH: "الفرقة الرابعة",
};

const SECTION_LABELS: Record<string, string> = {
  IS: "نظم المعلومات الإدارية",
  COMMERCIAL: "العلوم التجارية والمحاسبة",
  TOURISM: "إدارة الفنادق والسياحة",
  LANGS: "اللغات والترجمة",
};

export function SettingsManager({ user }: SettingsManagerProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"general" | "security" | "appearance" | "session">("general");

  // General form state
  const [displayName, setDisplayName] = useState(user.displayName || user.profile?.fullName || "");
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [phone, setPhone] = useState(user.profile?.phone || "");
  const [generalFeedback, setGeneralFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPendingGeneral, startGeneralTransition] = useTransition();

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPendingPassword, startPasswordTransition] = useTransition();

  // Avatar & Frame state
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [isPendingAvatar, startAvatarTransition] = useTransition();
  const [avatarFeedback, setAvatarFeedback] = useState<string | null>(null);

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralFeedback(null);
    startGeneralTransition(async () => {
      const res = await updateStudentGeneralSettings({
        displayName,
        username,
        bio,
        phone,
      });
      if (res.ok) {
        setGeneralFeedback({ type: "success", msg: res.message || "تم حفظ التعديلات بنجاح" });
        router.refresh();
      } else {
        setGeneralFeedback({ type: "error", msg: res.error || "حدث خطأ أثناء الحفظ" });
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    startPasswordTransition(async () => {
      const res = await changeStudentPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (res.ok) {
        setPasswordFeedback({ type: "success", msg: res.message || "تم تغيير كلمة المرور بنجاح" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      } else {
        setPasswordFeedback({ type: "error", msg: res.error || "حدث خطأ" });
      }
    });
  };

  const handleRestoreGoogleAvatar = () => {
    setAvatarFeedback(null);
    startAvatarTransition(async () => {
      const res = await restoreAccountAvatarAction();
      if (res.ok) {
        setAvatarFeedback("تمت استعادة صورة الحساب بنجاح!");
        router.refresh();
      } else {
        setAvatarFeedback(res.error || "تعذر استعادة الصورة");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── الرأس التعريفي ── */}
      <div className="rounded-3xl border border-border bg-card/70 p-6 sm:p-7 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
          <div className="relative group cursor-pointer" onClick={() => setWardrobeOpen(true)}>
            <AvatarWithFrame
              avatarUrl={user.avatarUrl}
              name={displayName || user.profile?.fullName || user.email}
              frameId={user.avatarFrameId}
              size="xl"
              level={user.level}
              showLevel={true}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white">
              تغيير الإطار
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                {displayName || user.profile?.fullName || "الطالب"}
              </h1>
              {user.username && (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-extrabold text-gold border border-gold/30">
                  @{user.username}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {bio || "لا توجد نبذة تعريفية مضافة بعد — يمكنك إضافتها الآن لتعريف زملائك بك."}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] font-bold text-muted-foreground">
              <span className="rounded-xl bg-muted/60 px-2.5 py-1">
                {GRADE_LABELS[user.profile?.grade || "FIRST"] || "الفرقة الجامعية"}
              </span>
              <span>·</span>
              <span className="rounded-xl bg-muted/60 px-2.5 py-1">
                {SECTION_LABELS[user.profile?.section || "IS"] || "الشعبة الأكاديمية"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── شريط التبويبات بنمط Facebook Settings ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-border">
        {[
          { key: "general", label: "الحساب والبيانات", icon: User },
          { key: "security", label: "الأمان وكلمة المرور", icon: Shield },
          { key: "appearance", label: "المظهر وخزانة الإطارات", icon: Palette },
          { key: "session", label: "الجلسة والحساب", icon: LogOut },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all shrink-0 border ${
                isActive
                  ? "bg-gold text-night border-gold shadow-sm"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── محتوى التبويب الأول: الحساب والبيانات العامة ── */}
      {activeTab === "general" && (
        <form onSubmit={handleGeneralSubmit} className="rounded-3xl border border-border bg-card/60 p-6 space-y-5 shadow-sm">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground">بيانات الحساب الشخصية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              هذه البيانات تظهر لزملائك في المجتمع والشات والملف التعريفي.
            </p>
          </div>

          {generalFeedback && (
            <div
              className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-bold ${
                generalFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {generalFeedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{generalFeedback.msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* الاسم المعروض */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gold" />
                الاسم المعروض (الاسم المستعار للطلاب)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: أحمد مصطفى"
                maxLength={50}
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <span className="text-[10px] text-muted-foreground">
                الاسم الذي سيعرض بجانب منشوراتك ورسائلك.
              </span>
            </div>

            {/* اسم المستخدم الفريد */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-gold" />
                اسم المستخدم الفريد (Username)
              </label>
              <div className="relative">
                <span className="absolute start-3 top-2.5 text-xs text-muted-foreground font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ahmed_tech"
                  maxLength={30}
                  className="w-full rounded-2xl border border-border bg-background ps-8 pe-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  dir="ltr"
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                حروف إنجليزية وأرقام وشرطة سفلية فقط للبحث والمنشن.
              </span>
            </div>
          </div>

          {/* النبذة الشخصية (Bio) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-gold" />
              النبذة التعريفية (Bio)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب بضعة أسطر عن اهتماماتك التقنية، تطلعاتك، أو مهاراتك المفضلة..."
              maxLength={160}
              className="w-full rounded-2xl border border-border bg-background p-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold resize-none"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>ستظهر أعلى صفحتك الشخصية في المجتمع</span>
              <span>{bio.length} / 160</span>
            </div>
          </div>

          {/* رقم الهاتف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gold" />
                رقم الهاتف (للتواصل في الورش)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                maxLength={11}
                dir="ltr"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            {/* البريد الإلكتروني (للقراءة فقط) */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground">
                البريد الإلكتروني المعتمد
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                dir="ltr"
                className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-muted-foreground">
                الحساب مرتبط وموثق
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPendingGeneral}
              className="rounded-2xl bg-gold px-6 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md disabled:opacity-50"
            >
              {isPendingGeneral ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      )}

      {/* ── محتوى التبويب الثاني: الأمان وكلمة المرور ── */}
      {activeTab === "security" && (
        <form onSubmit={handlePasswordSubmit} className="rounded-3xl border border-border bg-card/60 p-6 space-y-5 shadow-sm">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground">الأمان وتغيير كلمة المرور</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              احرص على اختيار كلمة مرور قوية وغير مكررة لحماية حسابك الجامعي.
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-bold ${
                passwordFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {passwordFeedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{passwordFeedback.msg}</span>
            </div>
          )}

          {user.provider !== "GOOGLE" && (
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-gold" />
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة مرورك الحالية"
                className="w-full max-w-md rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4 text-[11px] text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">نصائح لكلمة مرور آمنة:</p>
            <p>• 8 أحرف على الأقل تمزج بين حروف كبيرة وصغيرة وأرقام.</p>
            <p>• لا تستخدم نفس كلمة المرور لحسابات أخرى بالكلية.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPendingPassword}
              className="rounded-2xl bg-gold px-6 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md disabled:opacity-50"
            >
              {isPendingPassword ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
            </button>
          </div>
        </form>
      )}

      {/* ── محتوى التبويب الثالث: المظهر وخزانة الإطارات ── */}
      {activeTab === "appearance" && (
        <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-6 shadow-sm">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground">المظهر والتخصيص</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              اختر الوضع الذي يناسب بصرك وخصص إطار صورتك الرمزية الذي يُميزك في المجتمع.
            </p>
          </div>

          {/* تبديل الثيم الداكن والفاتح */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-foreground">نمط العرض (المظهر)</h3>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all ${
                  theme === "dark"
                    ? "border-gold bg-gold/15 text-gold shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="h-5 w-5" />
                ليلي (داكن)
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all ${
                  theme === "light"
                    ? "border-gold bg-gold/15 text-gold shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="h-5 w-5" />
                نهاري (فاتح)
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all ${
                  theme === "system"
                    ? "border-gold bg-gold/15 text-gold shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Laptop className="h-5 w-5" />
                تلقائي
              </button>
            </div>
          </div>

          {/* خزانة الإطارات */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-gold" />
                  إطار الصورة الرمزية
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  افتح إطارات جديدة بارتفاع مستواك الجامعي ونقاط تفاعلك.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWardrobeOpen(true)}
                className="rounded-2xl border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-black text-gold hover:bg-gold/20 transition-all shadow-sm shrink-0"
              >
                فتح خزانة الإطارات 👘
              </button>
            </div>

            {/* صورة الحساب الأصلية */}
            {user.provider === "GOOGLE" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRestoreGoogleAvatar}
                  disabled={isPendingAvatar}
                  className="text-xs font-bold text-muted-foreground hover:text-gold transition-colors underline"
                >
                  {isPendingAvatar ? "جارٍ الاستعادة..." : "🔄 استعادة صورتي الأصلية من حساب Google"}
                </button>
                {avatarFeedback && (
                  <p className="mt-1 text-xs text-emerald-500 font-bold">{avatarFeedback}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── محتوى التبويب الرابع: الجلسة وتسجيل الخروج ── */}
      {activeTab === "session" && (
        <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-6 shadow-sm">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-foreground">إدارة الجلسة والحساب</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              يمكنك تسجيل الخروج بأمان من هذا الجهاز في أي وقت.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">الحالة الحالية:</span>
              <span className="flex items-center gap-1.5 text-emerald-500 font-black">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                جلسة نشطة ومؤمنة
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">البريد المسجل:</span>
              <span className="font-mono text-foreground" dir="ltr">{user.email}</span>
            </div>
          </div>

          <div className="pt-2">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-2xl bg-red-500/10 border border-red-500/30 px-6 py-3 text-xs font-black text-red-500 hover:bg-red-500/20 transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج من المنصة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة خزانة الإطارات المنبثقة */}
      <FrameWardrobeModal
        user={{
          fullName: displayName || user.profile?.fullName || "طالب",
          avatarUrl: user.avatarUrl,
          avatarFrameId: user.avatarFrameId,
          level: user.level,
          points: 0,
          provider: user.provider,
        }}
        externalOpen={wardrobeOpen}
        onExternalOpenChange={(open) => {
          setWardrobeOpen(open);
          if (!open) router.refresh();
        }}
      />
    </div>
  );
}
