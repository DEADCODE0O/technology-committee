"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogOut, Compass, ClipboardList, Users, Bell, Trophy, MessageCircle, Globe, Settings, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// ═══════════════════════════════════════════════════════════════
//  غلاف منطقة الطالب — «دي منصتك» وليست موقع تسجيل ورش
//  • الموبايل: شريط سفلي بـ 5 أقسام رئيسية وعصرية
//    (الرئيسية · استكشف الورش · الرسائل والتفاعل · مهامي · الإعدادات)
//  • حسابي: متاح عبر النقر على الصورة الشخصية في الشريط العلوي
//  • الرسائل: مدعومة بشارات أرقام حمراء نابضة للتنبيه الفوري
//  • الشاشات الكبيرة: شريط علوي غني وكامل
// ═══════════════════════════════════════════════════════════════

const NAV = [
  { key: "dashboard", label: "الرئيسية", href: "/panel", icon: LayoutDashboard, bottom: true },
  { key: "activities", label: "استكشف", href: "/activities", icon: Compass, bottom: true },
  { key: "messages", label: "الرسائل", href: "/messages", icon: MessageCircle, bottom: true },
  { key: "tasks", label: "مهامي", href: "/tasks", icon: ClipboardList, bottom: true },
  { key: "settings", label: "الإعدادات", href: "/settings", icon: Settings, bottom: true },
  { key: "profile", label: "حسابي", href: "/profile", icon: Users, bottom: false },
  { key: "leaderboard", label: "المتصدرون", href: "/leaderboard", icon: Trophy, bottom: false },
];

export function StudentShell({
  user,
  active,
  children,
  pendingCount = 0,
  unreadCount = 0,
  openTaskCount = 0,
  unreadMessagesCount = 0,
  hideBottomNav = false,
  chatMode = false,
}: {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    avatarFrameId?: string | null;
    level?: number;
    role?: string;
  };
  active: string;
  children: React.ReactNode;
  /** عدد طلبات البيانات التي تنتظر إجابة الطالب */
  pendingCount?: number;
  /** إشعارات غير مقروءة */
  unreadCount?: number;
  /** مهام مفتوحة بانتظار التسليم */
  openTaskCount?: number;
  /** رسائل خاصة غير مقروءة */
  unreadMessagesCount?: number;
  /** إخفاء شريط التنقل السفلي على الموبايل */
  hideBottomNav?: boolean;
  /** وضع الشات الخاص والمجموعات بملء الشاشة الديناميكية */
  chatMode?: boolean;
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── الشريط العلوي ── */}
      <header
        className={`sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl ${
          chatMode ? "hidden sm:block" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/panel" className="flex items-center gap-2.5" aria-label="لوحة الطالب">
            <Image src="/images/logo.png" alt="شعار اللجنة" width={40} height={40} className="h-9 w-9" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold text-foreground">منصتي</span>
              <span className="font-latin text-[8px] tracking-[0.25em] text-gold">TECHNOLOGY COMMITTEE</span>
            </span>
          </Link>

          {/* تنقل شاشات كبيرة */}
          <nav className="flex items-center gap-1.5" aria-label="قائمة الطالب">
            {NAV.map((n) => {
              const isCurrentActive = active === n.key || (n.key === "dashboard" && active === "panel");
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`relative hidden h-10 items-center gap-2 rounded-xl px-3.5 text-xs lg:text-sm font-bold transition-colors lg:inline-flex ${
                    isCurrentActive
                      ? "border border-gold/40 bg-gold/[0.12] text-gold-deep dark:text-gold-light"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {n.key === "tasks" && openTaskCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-extrabold text-night">
                      {openTaskCount > 9 ? "9+" : openTaskCount}
                    </span>
                  )}
                  {n.key === "messages" && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white animate-pulse">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* زر المشرف السريع إذا كان الحساب يملك صلاحيات إشرافية */}
            {user.role && user.role !== "STUDENT" && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold-deep dark:text-gold-light transition-all hover:bg-gold/20 shadow-sm"
                title="الانتقال إلى لوحة الإدارة"
              >
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span>لوحة الإشراف</span>
              </Link>
            )}

            {/* الإشعارات: أيقونة دائمة بشارة عدم القراءة */}
            <Link
              href="/notifications"
              aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/40 text-muted-foreground transition-colors hover:border-gold/30 hover:text-gold"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-extrabold text-night">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* محول المظهر (وضع النهار / الليل) */}
            <div className="flex items-center ms-1">
              <ThemeToggle />
            </div>

            {/* الملف الشخصي بالإطار وشارة القلب */}
            <div className="ms-1 flex items-center gap-2">
              <Link
                href="/profile"
                aria-label="الملف الشخصي"
                title={`${user.name} — الملف الشخصي`}
                className="flex items-center justify-center transition-transform hover:scale-105"
              >
                <AvatarWithFrame
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  frameId={user.avatarFrameId}
                  size="sm"
                  level={user.level}
                  showLevel={false}
                />
              </Link>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="ms-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* تنبيه وضع الطالب للمشرفين */}
      {user.role && user.role !== "STUDENT" && (
        <div className="border-b border-gold/25 bg-gradient-to-r from-gold/15 via-gold/10 to-gold/15 px-4 py-2 text-center text-xs font-medium text-foreground">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-gold-deep dark:text-gold-light font-bold text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
              <span>أنت في وضع الطالب — لديك صلاحيات إشرافية نشطة</span>
            </span>
            <Link
              href="/admin"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/20 px-3 py-1 text-xs font-extrabold text-gold-deep dark:text-gold-light hover:bg-gold/30 transition-all shadow-sm"
            >
              <span>دخول الإدارة</span>
              <span aria-hidden="true">⚡</span>
            </Link>
          </div>
        </div>
      )}

      <main
        className={
          chatMode
            ? "mx-auto w-full max-w-5xl flex-1 px-0 sm:px-4 lg:px-6 pt-0 sm:pt-3 pb-0 flex flex-col fixed inset-0 sm:relative sm:h-[calc(100dvh-4rem)] z-30 sm:z-auto overflow-hidden bg-background sm:bg-transparent"
            : "mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:py-8 lg:px-8 lg:pb-8"
        }
      >
        {children}
      </main>

      {/* ── شريط التنقل السفلي (الموبايل: 6 أقسام احترافية وسلسة) ── */}
      {!(hideBottomNav || chatMode) && (
        <nav
          aria-label="تنقل الطالب السفلي"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-2xl lg:hidden shadow-[0_-4px_25px_-5px_rgba(24,24,27,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid grid-cols-5 items-center px-1">
            {NAV.filter((n) => n.bottom).map((n) => {
              const isActive = active === n.key || (n.key === "dashboard" && active === "panel");
              return (
                <li key={n.key} className="relative">
                  <Link
                    href={n.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all duration-200 ${
                      isActive ? "text-gold-deep dark:text-gold-light scale-[1.04]" : "text-muted-foreground hover:text-foreground active:text-foreground"
                    }`}
                  >
                    <span
                      className={`relative flex h-8 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                        isActive
                          ? "bg-gold/[0.16] shadow-[0_0_14px_rgba(201,164,92,0.3)] text-gold-deep dark:text-gold-light"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <n.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110 text-gold-deep dark:text-gold-light" : ""}`} />
                      {n.key === "tasks" && openTaskCount > 0 && (
                        <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[8px] font-black text-night ring-1 ring-night">
                          {openTaskCount > 9 ? "9+" : openTaskCount}
                        </span>
                      )}
                      {n.key === "messages" && unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-white px-1 text-[8px] font-black shadow-sm ring-1 ring-background animate-pulse">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                      {n.key === "dashboard" && pendingCount > 0 && (
                        <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[8px] font-black text-night ring-1 ring-night">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </span>
                    <span className="truncate max-w-[72px] text-center leading-tight tracking-tight">
                      {n.label}
                    </span>
                    {isActive && (
                      <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_8px_rgba(201,164,92,0.9)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
