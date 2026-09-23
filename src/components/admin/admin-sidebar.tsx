"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Search,
  X,
  ChevronDown,
  GraduationCap,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import {
  ADMIN_CATEGORIES,
  ADMIN_NAV_ICONS,
  type AdminNavItem,
} from "./admin-nav-data";

interface AdminSidebarProps {
  items: AdminNavItem[];
  userRoleLabel: string;
}

export function AdminSidebar({ items, userRoleLabel }: AdminSidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // تحديد الفئة النشطة تلقائياً لفتحها افتراضياً
  const activeCategory = useMemo(() => {
    const matched = items.find((i) => isItemActive(i.href));
    return matched ? matched.category : ADMIN_CATEGORIES[0];
  }, [items, pathname]);

  // حالة فتح/طي الأقسام — القسم النشط مفتوح افتراضياً
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ADMIN_CATEGORIES.forEach((cat) => {
      initial[cat] = true; // جميع الأقسام مفتوحة افتراضياً لسهولة التصفح
    });
    return initial;
  });

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

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

  return (
    <aside className="sticky top-0 hidden h-svh w-72 shrink-0 flex-col border-e border-border bg-card/95 backdrop-blur-md lg:flex">
      {/* ── هيدر القائمة الجانبية ── */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 shadow-xs">
          <Image src="/images/logo.png" alt="شعار اللجنة" width={26} height={26} className="h-6 w-6" priority />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gold shrink-0" />
            <h2 className="text-sm font-black text-foreground truncate">مركز التحكم</h2>
          </div>
          <div className="flex items-center justify-between gap-1 text-[9px] text-muted-foreground font-latin">
            <span className="tracking-wider">ADMIN PANEL</span>
            <span className="rounded bg-gold/10 px-1 py-0.2 text-[8px] font-bold text-gold-deep dark:text-gold">
              {userRoleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── شريط البحث السريع في أقسام لوحة الإدارة ── */}
      <div className="border-b border-border/80 p-2.5 bg-muted/20">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث فوري في الأقسام..."
            className="w-full rounded-xl border border-border/70 bg-background/80 ps-8 pe-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── قائمة الأقسام مع دعم الطي والتوسيع وتمييز العنصر النشط ── */}
      <nav
        className="flex-1 space-y-3 overflow-y-auto px-2.5 py-3 custom-scrollbar"
        aria-label="قائمة لوحة التحكم الرئيسية"
      >
        {ADMIN_CATEGORIES.map((category) => {
          const categoryItems = filteredItems.filter((m) => m.category === category);
          if (categoryItems.length === 0) return null;

          const isExpanded = searchQuery.trim().length > 0 || !!expandedCategories[category];
          const hasActiveItem = categoryItems.some((m) => isItemActive(m.href));

          return (
            <div key={category} className="space-y-1">
              {/* ترويسة الفئة مع زر الطي والتوسيع */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
              >
                <span className={`flex items-center gap-1.5 ${hasActiveItem ? "text-gold font-black" : ""}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasActiveItem ? "bg-gold" : "bg-muted-foreground/40"}`} />
                  {category}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground/70 bg-muted px-1.5 py-0.2 rounded-full font-bold">
                    {categoryItems.length}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${
                      isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </div>
              </button>

              {/* عناصر الفئة */}
              {isExpanded && (
                <div className="space-y-0.5 pe-0.5 ps-1">
                  {categoryItems.map((m) => {
                    const Icon = ADMIN_NAV_ICONS[m.iconKey] || LayoutDashboard;
                    const active = isItemActive(m.href);

                    return (
                      <Link
                        key={m.key}
                        href={m.href}
                        prefetch={false}
                        className={`group relative flex h-9 items-center justify-between rounded-xl px-2.5 text-xs font-bold transition-all ${
                          active
                            ? "bg-gold/15 text-gold-deep dark:text-gold-light border-s-3 border-gold font-black shadow-xs"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              active
                                ? "bg-gold/25 text-gold-deep dark:text-gold"
                                : "text-muted-foreground group-hover:text-gold"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">{m.label}</span>
                        </div>

                        {m.badge && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                              active
                                ? "bg-gold/30 text-gold-deep dark:text-gold"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-6 text-center text-muted-foreground space-y-1.5">
            <Search className="mx-auto h-6 w-6 opacity-40" />
            <p className="text-xs font-bold">لا توجد نتائج تطابق بحثك</p>
          </div>
        )}
      </nav>

      {/* ── فوتر القائمة: منصة الطالب والموقع العام ── */}
      <div className="border-t border-border p-2.5 space-y-1 bg-muted/10">
        <Link
          href="/panel"
          prefetch={false}
          className="flex h-9 items-center justify-between rounded-xl border border-gold/35 bg-gold/10 px-3 text-xs font-black text-gold-deep dark:text-gold transition-all hover:bg-gold/20 shadow-2xs"
          title="الانتقال إلى منصة الطالب وحسابي"
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-gold shrink-0" />
            <span>منصة الطالب (حسابي)</span>
          </div>
          <span className="text-[10px] text-gold/80 bg-gold/15 px-1.5 py-0.2 rounded-md font-latin">
            PORTAL
          </span>
        </Link>
        <Link
          href="/welcome"
          prefetch={false}
          className="flex h-8.5 items-center gap-2.5 rounded-xl px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>عرض الموقع العام</span>
        </Link>
      </div>
    </aside>
  );
}
