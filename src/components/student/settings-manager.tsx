"use client";

import { useState, useTransition, useRef } from "react";
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
  Camera,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { updateStudentGeneralSettings, changeStudentPassword } from "@/actions/settings";
import { restoreAccountAvatarAction, setAvatarUrlAction } from "@/actions/profile";
import { PRESET_AVATARS } from "@/lib/avatars";
import { logoutAction } from "@/actions/auth";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { FrameWardrobeInline } from "@/components/profile/frame-wardrobe-inline";
import { CharmHeartsGuideInline } from "@/components/ui/charm-hearts-guide-inline";
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

  // Avatar & Frame state
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [avatarFilter, setAvatarFilter] = useState<"ALL" | "BOY" | "GIRL">("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [isPendingAvatar, startAvatarTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);

            const maxSize = 512;
            canvas.width = maxSize;
            canvas.height = maxSize;

            const minDim = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - minDim) / 2;
            const sy = (img.naturalHeight - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressed = new File([blob], "avatar.webp", {
                    type: "image/webp",
                    lastModified: Date.now(),
                  });
                  resolve(compressed);
                } else {
                  resolve(file);
                }
              },
              "image/webp",
              0.85
            );
          } catch {
            resolve(file);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 20 ميجابايت");
      return;
    }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "تعذر رفع الصورة");
      }

      setCurrentAvatarUrl(data.url);
      toast.success("تم تحديث صورتك الشخصية بنجاح! 📸");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSelectPreset = (src: string) => {
    startAvatarTransition(async () => {
      const res = await setAvatarUrlAction(src);
      if (res.ok) {
        setCurrentAvatarUrl(src);
        toast.success("تم تعيين الشخصية الرمزية بنجاح!");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر تعيين الشخصية");
      }
    });
  };

  const handleRemoveAvatar = () => {
    startAvatarTransition(async () => {
      const res = await setAvatarUrlAction("INITIALS");
      if (res.ok) {
        setCurrentAvatarUrl(null);
        toast.success("تم حذف صورتك الشخصية والعودة للشعار البسيط");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر حذف الصورة");
      }
    });
  };

  const handleRestoreGoogleAvatar = () => {
    startAvatarTransition(async () => {
      const res = await restoreAccountAvatarAction();
      if (res.ok && res.avatarUrl) {
        setCurrentAvatarUrl(res.avatarUrl);
        toast.success("تمت استعادة صورة الحساب الأصلية من Google بنجاح! 📸");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر استعادة الصورة");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* مدخل رفع الصور المخفي — يفتح الكاميرا/المعرض مباشرة بدون أي نوافذ منبثقة */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── الرأس التعريفي ── */}
      <div className="rounded-3xl border border-border bg-card/70 p-6 sm:p-7 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="انقر لتغيير صورتك الشخصية مباشرة من جهازك"
            >
              <AvatarWithFrame
                avatarUrl={currentAvatarUrl}
                name={displayName || user.profile?.fullName || user.email}
                frameId={user.avatarFrameId}
                size="xl"
                level={user.level}
                showLevel={true}
              />
              <span
                className="absolute bottom-0 end-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#121b22] text-gold border border-gold/70 shadow-lg group-hover:scale-110 group-hover:bg-gold group-hover:text-night transition-all"
                title="تغيير الصورة الشخصية"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-gold hover:bg-gold/20 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>إطار التميز</span>
            </button>
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

          {/* ── خانة الصورة الشخصية المباشرة (طبيعية وبدون أي نوافذ منبثقة) ── */}
          <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="انقر لرفع صورة جديدة مباشرة من جهازك"
                >
                  <AvatarWithFrame
                    avatarUrl={currentAvatarUrl}
                    name={displayName || user.profile?.fullName || user.email}
                    frameId={user.avatarFrameId}
                    size="lg"
                    level={user.level}
                    showLevel
                  />
                  <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-night border border-background shadow-md group-hover:scale-110 transition-transform">
                    {isUploading || isPendingAvatar ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-foreground">الصورة الشخصية</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اختر صورة من هاتفك أو استعد صورة Google أو اختر شخصية كرتونية مباشرة.
                  </p>
                </div>
              </div>

              {/* أزرار الإجراءات المباشرة */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isUploading || isPendingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs font-black text-night hover:bg-gold/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <span>رفع صورة جديدة</span>
                </button>

                {(user.avatarUrl || user.provider === "GOOGLE") && (
                  <button
                    type="button"
                    disabled={isUploading || isPendingAvatar}
                    onClick={handleRestoreGoogleAvatar}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground hover:text-gold hover:border-gold/50 transition-all"
                    title="استعادة صورتك الأصلية من Google"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-gold" />
                    <span>صورة Google</span>
                  </button>
                )}

                {currentAvatarUrl && currentAvatarUrl !== "INITIALS" && (
                  <button
                    type="button"
                    disabled={isUploading || isPendingAvatar}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all"
                    title="إزالة الصورة والعودة للشعار البسيط"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>إزالة</span>
                  </button>
                )}
              </div>
            </div>

            {/* اختيار شخصية رمزية مباشرة وبشكل طبيعي داخل الصفحة */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  أو اختر شخصية رمزية جاهزة:
                </span>

                {/* تصنيف الشخصيات */}
                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60 text-[10px] font-bold">
                  {(["ALL", "BOY", "GIRL"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAvatarFilter(cat)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        avatarFilter === cat
                          ? "bg-gold text-night font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat === "ALL" ? "الكل" : cat === "BOY" ? "شباب" : "بنات"}
                    </button>
                  ))}
                </div>
              </div>

              {/* معرض الشخصيات الرمزية بشكل أفقي سلس */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar pt-1">
                {PRESET_AVATARS.filter(
                  (a) => avatarFilter === "ALL" || a.gender === avatarFilter
                ).map((preset) => {
                  const isSelected = currentAvatarUrl === preset.src;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isPendingAvatar}
                      onClick={() => handleSelectPreset(preset.src)}
                      className={`relative shrink-0 rounded-2xl p-1 transition-all group focus:outline-none ${
                        isSelected
                          ? "ring-2 ring-gold scale-105 bg-gold/10"
                          : "hover:scale-105 hover:bg-muted/50 border border-border/50"
                      }`}
                      title={preset.name}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted/30">
                        <Image
                          src={preset.src}
                          alt={preset.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-night text-[9px] font-black shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
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

          {/* ── خزانة إطارات التميز والمستويات المباشرة داخل الصفحة ── */}
          <div className="border-t border-border/70 pt-6">
            <FrameWardrobeInline
              user={{
                fullName: displayName || user.profile?.fullName || user.email,
                avatarUrl: currentAvatarUrl,
                avatarFrameId: user.avatarFrameId,
                level: user.level,
                points: 0,
              }}
              onFrameChanged={() => router.refresh()}
            />
          </div>

          {/* ── دليل مستويات التفاعل والقلوب المباشر داخل الصفحة ── */}
          <div className="border-t border-border/70 pt-6">
            <CharmHeartsGuideInline
              level={user.level}
            />
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
    </div>
  );
}
