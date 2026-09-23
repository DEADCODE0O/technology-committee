"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ShieldCheck,
  GraduationCap,
  Globe,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Users,
  BarChart3,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import {
  ADMIN_CATEGORIES,
  ADMIN_NAV_ICONS,
  type AdminNavItem,
} from "./admin-nav-data";

interface AdminMobileNavProps {
  items: AdminNavItem[];
  userEmail: string;
  userRoleLabel: string;
}

export function AdminMobileNav({ items, userEmail, userRoleLabel }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // إغلاق القائمة تلقائياً عند تغيير المسار
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // منع تمرير صفحة الخلفية أثناء فتح القائمة بدون تعطيل لمس القائمة نفسها
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // تصفية العناصر بناءً على البحث
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // اسم الصفحة الحالية لعرضه بجانب زر القائمة في الهيدر
  const currentItem = items.find((i) => isItemActive(i.href));

  // عناصر الشريط السفلي السريع
  const bottomShortcuts = [
    {
      key: "dashboard",
      label: "الرئيسية",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
    },
    {
      key: "students",
      label: "الطلاب",
      href: "/admin/students",
      icon: Users,
      isActive: pathname.startsWith("/admin/students"),
    },
    {
      key: "surveys",
      label: "الاستبيانات",
      href: "/admin/surveys",
      icon: BarChart3,
      isActive: pathname.startsWith("/admin/surveys"),
    },
    {
      key: "admins",
      label: "المشرفون",
      href: "/admin/admins",
      icon: ShieldCheck,
      isActive: pathname.startsWith("/admin/admins"),
    },
  ];

  return (
    <>
      {/* ── 1. زر فتح القائمة في الشريط العلوي (Mobile Header Trigger) ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9.5 items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-3 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          aria-label="فتح قائمة الإدارة"
        >
          <Menu className="h-4.5 w-4.5" />
          <span>القائمة</span>
        </button>

        {currentItem && (
          <span
            className="max-w-[130px] sm:max-w-[190px] truncate text-xs font-black text-foreground"
            title={currentItem.label}
          >
            {currentItem.label}
          </span>
        )}
      </div>

      {/* ── 2. الدرج الجانبي الكامل (Mobile Sidebar Drawer) ── */}
      {/* خلفية التعتيم المعزولة */}
      <div
        className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* لوح القائمة المنزلق بحساب دقيق من اليمين (Right: 0) متوافق 100% مع RTL */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 flex h-full w-[85vw] max-w-[320px] flex-col bg-card border-s border-border shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ willChange: "transform" }}
        aria-label="قائمة لوحة التحكم للهاتف"
      >
        {/* أ) هيدر القائمة: شعار اللجنة + عنوان + زر الإغلاق الواضح */}
        <div className="flex items-center justify-between border-b border-border p-3.5 bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9.5 w-9.5 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 shrink-0 shadow-2xs">
              <Image src="/images/logo.png" alt="" width={24} height={24} className="h-5.5 w-5.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5 truncate">
                <ShieldCheck className="h-4 w-4 text-gold shrink-0" />
                مركز التحكم
              </h3>
              <p className="text-[9px] text-muted-foreground font-latin tracking-wider truncate">
                ADMIN DASHBOARD
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ب) بطاقة وصول مباشر لمنصة وحساب الطالب */}
        <div className="p-3 border-b border-border/80 bg-gold/[0.04] shrink-0">
          <Link
            href="/panel"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold/20 p-2.5 text-xs font-black text-gold-deep dark:text-gold shadow-2xs transition-all active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/20 text-gold">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span>منصة الطالب (حسابي)</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Link>
        </div>

        {/* ج) شريط البحث الفوري */}
        <div className="p-3 border-b border-border bg-card shrink-0">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن أي قسم..."
              className="w-full rounded-xl border border-border bg-muted/40 ps-9 pe-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* د) قائمة الأقسام المجمعة — تمرير سلس وطبيعي 100% للمس */}
        <nav
          className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4 custom-scrollbar"
          aria-label="أقسام الإدارة"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {ADMIN_CATEGORIES.map((category) => {
            const categoryItems = filteredItems.filter((i) => i.category === category);
            if (categoryItems.length === 0) return null;

            const hasActive = categoryItems.some((i) => isItemActive(i.href));

            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      hasActive ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {category}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded-full">
                    {categoryItems.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {categoryItems.map((item) => {
                    const Icon = ADMIN_NAV_ICONS[item.iconKey] || LayoutDashboard;
                    const active = isItemActive(item.href);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-98 ${
                          active
                            ? "bg-gold text-night font-black shadow-md"
                            : "text-foreground/85 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-night/15 text-night"
                                : "bg-muted/80 text-gold"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                              active
                                ? "bg-night/20 text-night"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Search className="mx-auto h-8 w-8 opacity-40" />
              <p className="text-xs font-bold">لا توجد نتائج تطابق بحثك</p>
            </div>
          )}
        </nav>

        {/* هـ) فوتر القائمة: الموقع العام وبيانات المشرف وتسجيل الخروج مع مراعاة منطقة الأمان للهاتف */}
        <div className="border-t border-border p-3 bg-muted/20 space-y-2.5 pb-8 sm:pb-5 shrink-0">
          <Link
            href="/welcome"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-gold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gold" />
              زيارة الموقع العام
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center justify-between pt-1 px-1">
            <div className="min-w-0 flex-1 pe-2">
              <p className="truncate text-xs font-bold text-foreground" dir="ltr">
                {userEmail}
              </p>
              <p className="text-[10px] font-bold text-gold truncate">{userRoleLabel}</p>
            </div>

            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── 3. شريط التنقل السفلي السريع للموبايل (Mobile Bottom Navigation Bar) ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-xl lg:hidden px-2 shadow-2xl safe-area-pb"
        aria-label="شريط التنقل السريع للوحة الإدارة"
      >
        {bottomShortcuts.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-bold transition-all active:scale-95 ${
                active
                  ? "text-gold font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-gold/20 text-gold"
                    : "bg-transparent text-muted-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* زر فتح القائمة الجانبية الكاملة */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
            isOpen
              ? "text-gold font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="فتح القائمة الكاملة"
        >
          <div
            className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
              isOpen
                ? "bg-gold text-night font-black"
                : "bg-gold/15 text-gold"
            }`}
          >
            <Menu className="h-4.5 w-4.5" />
          </div>
          <span className="truncate">القائمة</span>
        </button>
      </nav>
    </>
  );
}
