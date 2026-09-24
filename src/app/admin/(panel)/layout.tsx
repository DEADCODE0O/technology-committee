import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LogOut,
  GraduationCap,
} from "lucide-react";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { ADMIN_NAV_ITEMS, type AdminNavItem } from "@/components/admin/admin-nav-data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // guard عام: أدمن أو تحويل
  if (!user) redirect("/login?returnTo=/admin");
  if (!isAdminRole(user.role)) redirect("/panel");
  await requireAdmin();

  // تصفية العناصر المتاحة للمشرف حسب الصلاحيات الدقيقة
  const visibleMenu: AdminNavItem[] = ADMIN_NAV_ITEMS
    .filter((m) => canUser(user, m.module, "view"))
    .map((m) => ({
      ...m,
      badge:
        m.module === MODULES.SETTINGS && !canUser(user, MODULES.SETTINGS, "manage")
          ? "عرض"
          : undefined,
    }));

  const userRoleText = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="flex min-h-svh bg-background">
      {/* ── القائمة الجانبية للشاشات الكبيرة (Desktop Sidebar) ── */}
      <AdminSidebar items={visibleMenu} userRoleLabel={userRoleText} />

      {/* ── المحتوى الرئيسي ومكونات الهيدر ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* شريط علوي حديث متوافق تماماً مع الهواتف والحواسيب */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-6">
          {/* موبايل: زر الدرج الذكي والتنقل السريع */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <AdminMobileNav
              items={visibleMenu}
              userEmail={user.email}
              userRoleLabel={userRoleText}
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
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/panel"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold-deep dark:text-gold-light transition-colors hover:bg-gold/20 shadow-sm"
              title="الانتقال إلى منصة الطالب"
            >
              <GraduationCap className="h-4 w-4 text-gold" />
              <span>منصة الطالب</span>
            </Link>
            <ThemeToggle />
            <div className="hidden text-end sm:block">
              <p className="max-w-[160px] truncate text-xs font-bold text-foreground/80" dir="ltr">
                {user.email}
              </p>
              <p className="text-[10px] font-bold text-gold-deep dark:text-gold/70">
                {userRoleText}
              </p>
            </div>
            <AvatarWithFrame
              avatarUrl={user.avatarUrl}
              name={user.profile?.fullName ?? user.email}
              frameId={user.avatarFrameId}
              size="xs"
            />
            <form action={logoutAction} className="hidden sm:block">
              <button
                type="submit"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-300 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pt-4 pb-24 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
