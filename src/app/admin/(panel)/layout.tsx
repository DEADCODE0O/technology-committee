import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Zap,
  Medal,
  Palette,
  Settings,
  ScrollText,
  LogOut,
  ShieldCheck,
  Globe,
  ClipboardList,
  Bell,
  FolderOpen,
  Sparkles as Sparkles2,
  ClipboardCheck,
  MessagesSquare,
  Swords,
  Trophy,
  Eye,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES, type Module } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { AdminMobileNav, type AdminNavSerializedItem } from "@/components/admin/admin-mobile-nav";

// ═══════════════════════════════════════════════════════════════
//  هيكل لوحة الإدارة المنظم — 5 أقسام رئيسية مدمجة
//  ودعم كامل لتجربة مستخدم عالمية على الهاتف والحاسوب
// ═══════════════════════════════════════════════════════════════

interface MenuItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  iconKey: string;
  module: Module;
  category: string;
}

const MENU_CATEGORIES = [
  "الرئيسية والاستخبارات",
  "الأنشطة والتعليم",
  "الطلاب والمجتمع",
  "التحفيز والمنافسة",
  "النظام والحوكمة",
] as const;

const MENU: MenuItem[] = [
  // 1. الرئيسية والاستخبارات
  {
    key: "dashboard",
    label: "لوحة التحكم",
    href: "/admin",
    icon: <LayoutDashboard className="h-4.5 w-4.5" />,
    iconKey: "dashboard",
    module: MODULES.DASHBOARD,
    category: "الرئيسية والاستخبارات",
  },
  {
    key: "analytics",
    label: "الاستخبارات والقرارات",
    href: "/admin/analytics",
    icon: <TrendingUp className="h-4.5 w-4.5" />,
    iconKey: "analytics",
    module: MODULES.DASHBOARD,
    category: "الرئيسية والاستخبارات",
  },
  {
    key: "surveillance",
    label: "المراقبة والإشراف",
    href: "/admin/surveillance",
    icon: <Eye className="h-4.5 w-4.5" />,
    iconKey: "surveillance",
    module: MODULES.SURVEILLANCE,
    category: "الرئيسية والاستخبارات",
  },

  // 2. الأنشطة والتعليم
  {
    key: "activities",
    label: "الأنشطة والتنفيذات",
    href: "/admin/activities",
    icon: <FolderKanban className="h-4.5 w-4.5" />,
    iconKey: "activities",
    module: MODULES.WORKSHOPS,
    category: "الأنشطة والتعليم",
  },
  {
    key: "programs",
    label: "البرامج التعليمية",
    href: "/admin/programs",
    icon: <Sparkles2 className="h-4.5 w-4.5" />,
    iconKey: "programs",
    module: MODULES.PROGRAMS,
    category: "الأنشطة والتعليم",
  },
  {
    key: "tasks",
    label: "المهام والتكليفات",
    href: "/admin/tasks",
    icon: <ClipboardCheck className="h-4.5 w-4.5" />,
    iconKey: "tasks",
    module: MODULES.WORKSHOPS,
    category: "الأنشطة والتعليم",
  },

  // 3. الطلاب والمجتمع
  {
    key: "students",
    label: "شؤون الطلاب",
    href: "/admin/students",
    icon: <Users className="h-4.5 w-4.5" />,
    iconKey: "students",
    module: MODULES.STUDENTS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "community",
    label: "منشورات المجتمع",
    href: "/admin/community",
    icon: <MessagesSquare className="h-4.5 w-4.5" />,
    iconKey: "community",
    module: MODULES.NEWS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "surveys",
    label: "الاستبيانات والقرارات",
    href: "/admin/surveys",
    icon: <BarChart3 className="h-4.5 w-4.5" />,
    iconKey: "surveys",
    module: MODULES.DATA_REQUESTS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "talents",
    label: "بنك المواهب",
    href: "/admin/talents",
    icon: <Palette className="h-4.5 w-4.5" />,
    iconKey: "talents",
    module: MODULES.TALENTS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "dataRequests",
    label: "طلبات البيانات",
    href: "/admin/data-requests",
    icon: <ClipboardList className="h-4.5 w-4.5" />,
    iconKey: "dataRequests",
    module: MODULES.DATA_REQUESTS,
    category: "الطلاب والمجتمع",
  },

  // 4. التحفيز والمنافسة
  {
    key: "points",
    label: "نظام النقاط",
    href: "/admin/points",
    icon: <Zap className="h-4.5 w-4.5" />,
    iconKey: "points",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },
  {
    key: "badges",
    label: "الشارات والأوسمة",
    href: "/admin/badges",
    icon: <Medal className="h-4.5 w-4.5" />,
    iconKey: "badges",
    module: MODULES.BADGES,
    category: "التحفيز والمنافسة",
  },
  {
    key: "teams",
    label: "الفرق والمجموعات",
    href: "/admin/teams",
    icon: <Swords className="h-4.5 w-4.5" />,
    iconKey: "teams",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },
  {
    key: "seasons",
    label: "المواسم والإنجازات",
    href: "/admin/seasons",
    icon: <Trophy className="h-4.5 w-4.5" />,
    iconKey: "seasons",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },

  // 5. النظام والحوكمة
  {
    key: "admins",
    label: "إدارة المشرفين",
    href: "/admin/admins",
    icon: <ShieldCheck className="h-4.5 w-4.5" />,
    iconKey: "admins",
    module: MODULES.ADMINS,
    category: "النظام والحوكمة",
  },
  {
    key: "notifications",
    label: "مركز الإشعارات",
    href: "/admin/notifications",
    icon: <Bell className="h-4.5 w-4.5" />,
    iconKey: "notifications",
    module: MODULES.NOTIFICATIONS,
    category: "النظام والحوكمة",
  },
  {
    key: "drive",
    label: "مكتبة درايف",
    href: "/admin/drive",
    icon: <FolderOpen className="h-4.5 w-4.5" />,
    iconKey: "drive",
    module: MODULES.DRIVE,
    category: "النظام والحوكمة",
  },
  {
    key: "audit",
    label: "مركز التدقيق والأمان",
    href: "/admin/audit",
    icon: <ScrollText className="h-4.5 w-4.5" />,
    iconKey: "audit",
    module: MODULES.AUDIT,
    category: "النظام والحوكمة",
  },
  {
    key: "settings",
    label: "إعدادات المنصة",
    href: "/admin/settings",
    icon: <Settings className="h-4.5 w-4.5" />,
    iconKey: "settings",
    module: MODULES.SETTINGS,
    category: "النظام والحوكمة",
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // guard عام: أدمن أو تحويل
  await requireAdmin();

  // نعرض الهيكل فقط للأدوار الإدارية
  if (!user || !isAdminRole(user.role)) redirect("/admin/login");

  const visibleMenu = MENU.filter((m) => canUser(user, m.module, "view"));

  // إعداد بيانات ملاحة الموبايل بتسلسل منظم
  const serializedNavItems: AdminNavSerializedItem[] = visibleMenu.map((m) => ({
    key: m.key,
    label: m.label,
    href: m.href,
    iconKey: m.iconKey,
    category: m.category,
    badge:
      m.module === MODULES.SETTINGS && !canUser(user, MODULES.SETTINGS, "manage")
        ? "عرض"
        : undefined,
  }));

  return (
    <div className="flex min-h-svh bg-background">
      {/* ── القائمة الجانبية للحاسوب (Desktop Sidebar) ── */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-s border-border bg-card lg:flex">
        {/* الهيدر */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08]">
            <Image src="/images/logo.png" alt="" width={26} height={26} className="h-6.5 w-6.5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              مركز التحكم
            </p>
            <p className="font-latin text-[8px] tracking-[0.25em] text-gold-deep dark:text-gold/50">
              CONTROL CENTER
            </p>
          </div>
        </div>

        {/* قائمة الأقسام المجمعة */}
        <nav
          className="flex-1 space-y-4 overflow-y-auto px-3 py-3.5 custom-scrollbar"
          aria-label="قائمة الإدارة"
        >
          {MENU_CATEGORIES.map((category) => {
            const categoryItems = visibleMenu.filter((m) => m.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="space-y-1">
                <p className="px-2.5 text-[10px] font-black text-gold/80 uppercase tracking-wider">
                  {category}
                </p>
                <div className="space-y-0.5">
                  {categoryItems.map((m) => (
                    <Link
                      key={m.key}
                      href={m.href}
                      className="flex h-9.5 items-center gap-2.5 rounded-xl px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span className="text-gold shrink-0">{m.icon}</span>
                      <span className="truncate">{m.label}</span>
                      {m.module === MODULES.SETTINGS && !canUser(user, MODULES.SETTINGS, "manage") && (
                        <span className="ms-auto rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                          عرض
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
        {/* شريط علوي حديث متوافق تماماً مع الهواتف */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-6">
          {/* موبايل: زر الدرج الذكي + شعار */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <AdminMobileNav
              items={serializedNavItems}
              userEmail={user.email}
              userRoleLabel={ROLE_LABELS[user.role] ?? user.role}
            />
          </div>

          {/* ديسكتوب: مؤشر حالة النظام */}
          <div className="hidden lg:flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-extrabold text-muted-foreground">
              لوحة الإدارة التنفيذية — منصة اللجنة التكنولوجية
            </span>
          </div>

          {/* بيانات المشرف وأدوات الهيدر */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden text-end sm:block">
              <p className="max-w-[160px] truncate text-xs font-bold text-foreground/80" dir="ltr">
                {user.email}
              </p>
              <p className="text-[10px] font-bold text-gold-deep dark:text-gold/70">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
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
