"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  Globe,
  LogOut,
  ExternalLink,
  LayoutDashboard,
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

  // منع تمرير صفحة الخلفية أثناء فتح القائمة بدون تعطيل اللمس
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
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

  return (
    <>
      {/* ── زر فتح القائمة في الهيدر للموبايل ── */}
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

      {/* ── الدرج الجانبي للموبايل ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* خلفية معتمة للإغلاق عند النقر في الخارج */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* حاوية القائمة المنسدلة من جهة اليمين في RTL */}
          <aside
            className="relative z-50 flex h-full w-76 sm:w-80 max-w-[85vw] flex-col bg-card border-e border-border shadow-2xl animate-in slide-in-from-start duration-250 ease-out"
            aria-label="قائمة لوحة التحكم للهاتف"
          >
            {/* 1. هيدر الدرج مع شعار اللجنة وزر الإغلاق */}
            <div className="flex items-center justify-between border-b border-border p-3.5 bg-muted/30">
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

            {/* 2. بطاقة الوصول السريع لمنصة الطالب (حسابي) للمشرف */}
            <div className="p-3 border-b border-border/80 bg-gold/[0.04]">
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

            {/* 3. شريط البحث الفوري */}
            <div className="p-3 border-b border-border bg-card">
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

            {/* 4. قائمة الأقسام المجمعة — دعم كامل للمس السلس بدون أي حظر */}
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

            {/* 5. فوتر القائمة: الموقع العام وبيانات المشرف وتسجيل الخروج مع مراعاة Safe Area */}
            <div className="border-t border-border p-3 bg-muted/20 space-y-2.5 pb-8 sm:pb-5">
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
        </div>
      )}
    </>
  );
}
