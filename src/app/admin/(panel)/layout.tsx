import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Users, Zap, Medal, Palette, Settings, ScrollText, LogOut, ShieldCheck, Globe, ClipboardList, Bell, FolderOpen, Sparkles as Sparkles2, ClipboardCheck, MessagesSquare, Swords, Trophy, Eye, TrendingUp, BarChart3,
} from "lucide-react";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES, type Module } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";



// ═══════════════════════════════════════════════════════════════
//  هيكل لوحة الإدارة — نظام مستقل تمامًا عن الموقع العام
//  قائمة جانبية RTL + حماية بالأدوار
// ═══════════════════════════════════════════════════════════════

const MENU: { key: string; label: string; href: string; icon: React.ReactNode; module: Module }[] = [
  { key: "dashboard", label: "لوحة التحكم", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, module: MODULES.DASHBOARD },
  { key: "analytics", label: "الاستخبارات والقرارات", href: "/admin/analytics", icon: <TrendingUp className="h-5 w-5" />, module: MODULES.DASHBOARD },
  { key: "programs", label: "البرامج", href: "/admin/programs", icon: <Sparkles2 className="h-5 w-5" />, module: MODULES.PROGRAMS },
  { key: "activities", label: "الأنشطة والتنفيذات", href: "/admin/activities", icon: <FolderKanban className="h-5 w-5" />, module: MODULES.WORKSHOPS },
  { key: "tasks", label: "المهام والتكليفات", href: "/admin/tasks", icon: <ClipboardCheck className="h-5 w-5" />, module: MODULES.WORKSHOPS },
  { key: "students", label: "الطلاب", href: "/admin/students", icon: <Users className="h-5 w-5" />, module: MODULES.STUDENTS },
  { key: "points", label: "النقاط", href: "/admin/points", icon: <Zap className="h-5 w-5" />, module: MODULES.POINTS },
  { key: "seasons", label: "المواسم والإنجازات", href: "/admin/seasons", icon: <Trophy className="h-5 w-5" />, module: MODULES.POINTS },
  { key: "teams", label: "الفرق", href: "/admin/teams", icon: <Swords className="h-5 w-5" />, module: MODULES.POINTS },
  { key: "badges", label: "الشارات", href: "/admin/badges", icon: <Medal className="h-5 w-5" />, module: MODULES.BADGES },
  { key: "community", label: "المجتمع", href: "/admin/community", icon: <MessagesSquare className="h-5 w-5" />, module: MODULES.NEWS },
  { key: "surveys", label: "الاستبيانات والقرارات", href: "/admin/surveys", icon: <BarChart3 className="h-5 w-5" />, module: MODULES.DATA_REQUESTS },
  { key: "talents", label: "المواهب", href: "/admin/talents", icon: <Palette className="h-5 w-5" />, module: MODULES.TALENTS },
  { key: "notifications", label: "الإشعارات", href: "/admin/notifications", icon: <Bell className="h-5 w-5" />, module: MODULES.NOTIFICATIONS },
  { key: "drive", label: "مكتبة درايف", href: "/admin/drive", icon: <FolderOpen className="h-5 w-5" />, module: MODULES.DRIVE },
  { key: "dataRequests", label: "طلبات البيانات", href: "/admin/data-requests", icon: <ClipboardList className="h-5 w-5" />, module: MODULES.DATA_REQUESTS },
  { key: "surveillance", label: "المراقبة والإشراف", href: "/admin/surveillance", icon: <Eye className="h-5 w-5" />, module: MODULES.SURVEILLANCE },
  { key: "admins", label: "المشرفون", href: "/admin/admins", icon: <ShieldCheck className="h-5 w-5" />, module: MODULES.ADMINS },
  { key: "settings", label: "الإعدادات", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, module: MODULES.SETTINGS },
  { key: "audit", label: "مركز التدقيق", href: "/admin/audit", icon: <ScrollText className="h-5 w-5" />, module: MODULES.AUDIT },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // صفحة دخول الإدارة بدون الهيكل
  // (تُتعامل عبر مسارها الخاص — layout يفحص المسار الحالي)
  const user = await getCurrentUser();

  // guard عام: أدمن أو تحويل
  await requireAdmin();

  // نعرض الهيكل فقط للأدوار الإدارية
  if (!user || !isAdminRole(user.role)) redirect("/admin/login");

  const visibleMenu = MENU.filter((m) => canUser(user, m.module, "view"));

  return (
    <div className="flex min-h-svh bg-background">
      {/* ── القائمة الجانبية (RTL: يمين الشاشة) ── */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-s border-border bg-card lg:flex">
        {/* الهيدر */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08]">
            <Image src="/images/logo.png" alt="" width={26} height={26} className="h-6.5 w-6.5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              مركز التحكم
            </p>
            <p className="font-latin text-[8px] tracking-[0.25em] text-gold-deep dark:text-gold/50">CONTROL CENTER</p>
          </div>
        </div>

        {/* القائمة */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="قائمة الإدارة">
          {visibleMenu.map((m) => (
            <Link
              key={m.key}
              href={m.href}
              className="flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="text-gold-deep dark:text-gold/60">{m.icon}</span>
              {m.label}
              {m.module === MODULES.SETTINGS && !canUser(user, MODULES.SETTINGS, "manage") && (
                <span className="ms-auto rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">عرض</span>
              )}
            </Link>
          ))}
        </nav>

        {/* زيارة الموقع العام */}
        <div className="border-t border-border px-3 py-3">
          <Link
            href="/welcome"
            className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-gold-deep dark:hover:text-gold-light"
          >
            <Globe className="h-4 w-4" />
            عرض الموقع العام
          </Link>
        </div>
      </aside>

      {/* ── المحتوى ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* شريط علوي */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/images/logo.png" alt="" width={28} height={28} className="h-8 w-8" />
            <span className="text-sm font-extrabold text-foreground">مركز التحكم</span>
          </div>

          {/* قائمة أفقية للموبايل */}
          <nav className="flex min-w-0 items-center gap-1.5 overflow-x-auto lg:hidden" aria-label="قائمة الإدارة للموبايل">
            {visibleMenu.map((m) => (
              <Link
                key={m.key}
                href={m.href}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-muted-foreground"
              >
                <span className="text-gold-deep dark:text-gold/60">{m.icon}</span>
                {m.label}
              </Link>
            ))}
          </nav>

          {/* بيانات الأدمن */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden text-end sm:block">
              <p className="max-w-[160px] truncate text-xs font-bold text-foreground/80" dir="ltr">{user.email}</p>
              <p className="text-[10px] font-bold text-gold-deep dark:text-gold/70">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <AvatarWithFrame
              avatarUrl={user.avatarUrl}
              name={user.profile?.fullName ?? user.email}
              frameId={user.avatarFrameId}
              size="xs"
            />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
