"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  LayoutDashboard,
  TrendingUp,
  FolderKanban,
  Sparkles,
  ClipboardCheck,
  Users,
  Zap,
  Trophy,
  Swords,
  Medal,
  MessagesSquare,
  BarChart3,
  Palette,
  Bell,
  FolderOpen,
  ClipboardList,
  Eye,
  ShieldCheck,
  Settings,
  ScrollText,
  Globe,
  ChevronDown,
  LogOut,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { logoutAction } from "@/actions/auth";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  analytics: TrendingUp,
  surveillance: Eye,
  activities: FolderKanban,
  programs: Sparkles,
  tasks: ClipboardCheck,
  students: Users,
  community: MessagesSquare,
  surveys: BarChart3,
  talents: Palette,
  dataRequests: ClipboardList,
  points: Zap,
  badges: Medal,
  teams: Swords,
  seasons: Trophy,
  admins: ShieldCheck,
  notifications: Bell,
  drive: FolderOpen,
  audit: ScrollText,
  settings: Settings,
};

export interface AdminNavSerializedItem {
  key: string;
  label: string;
  href: string;
  iconKey: string;
  category: string;
  badge?: string;
}

interface AdminMobileNavProps {
  items: AdminNavSerializedItem[];
  userEmail: string;
  userRoleLabel: string;
}

export function AdminMobileNav({ items, userEmail, userRoleLabel }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  // إغلاق القائمة تلقائياً عند تغيير المسار
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // منع التمرير في الخلفية عند فتح القائمة
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

  // تجميع العناصر حسب الفئات
  const groupedCategories = useMemo(() => {
    const groups: { name: string; items: AdminNavSerializedItem[] }[] = [];
    const categoryOrder = [
      "الرئيسية والاستخبارات",
      "الأنشطة والتعليم",
      "الطلاب والمجتمع",
      "التحفيز والمنافسة",
      "النظام والحوكمة",
    ];

    categoryOrder.forEach((catName) => {
      const catItems = filteredItems.filter((i) => i.category === catName);
      if (catItems.length > 0) {
        groups.push({ name: catName, items: catItems });
      }
    });

    // أي عناصر أخرى غير مصنفة
    const otherItems = filteredItems.filter((i) => !categoryOrder.includes(i.category));
    if (otherItems.length > 0) {
      groups.push({ name: "أقسام أخرى", items: otherItems });
    }

    return groups;
  }, [filteredItems]);

  // اسم الصفحة الحالية لعرضه في الهيدر
  const currentItem = items.find((i) => i.href === pathname);

  return (
    <>
      {/* ── زر فتح القائمة في الهيدر للموبايل ── */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-sm active:scale-95"
          aria-label="فتح قائمة الإدارة"
        >
          <Menu className="h-5 w-5" />
          <span>القائمة</span>
        </button>

        {currentItem && (
          <span className="max-w-[130px] sm:max-w-[200px] truncate text-xs font-black text-foreground">
            {currentItem.label}
          </span>
        )}
      </div>

      {/* ── الدرج الجانبي للموبايل (Mobile Drawer) ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-night/80 backdrop-blur-md transition-opacity duration-200">
          {/* خلفية للإغلاق عند النقر في الخارج */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative flex w-full max-w-xs sm:max-w-sm flex-col bg-card border-s border-border shadow-2xl h-full z-10 animate-in slide-in-from-right duration-300">
            {/* هيدر القائمة */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15">
                  <Image src="/images/logo.png" alt="" width={24} height={24} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    مركز التحكم
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-latin tracking-wider">
                    TECH COMMITTEE ADMIN
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* شريط البحث الفوري */}
            <div className="p-3 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن أي قسم أو أداة..."
                  className="w-full rounded-xl border border-border bg-muted/30 pe-9 ps-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* قائمة الأقسام المجمعة */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar" aria-label="أقسام الإدارة">
              {groupedCategories.length > 0 ? (
                groupedCategories.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="flex items-center justify-between px-2.5 py-1">
                      <span className="text-[11px] font-black text-gold uppercase tracking-wider">
                        {group.name}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-full">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = ICONS[item.iconKey] || LayoutDashboard;
                        const isActive = pathname === item.href;

                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                              isActive
                                ? "bg-gold text-night shadow-md"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`shrink-0 ${
                                  isActive ? "text-night" : "text-gold"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span>{item.label}</span>
                            </div>

                            {item.badge && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                  isActive
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
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs font-bold">لا توجد نتائج تطابق بحثك</p>
                </div>
              )}
            </nav>

            {/* فوتر القائمة */}
            <div className="border-t border-border p-3 bg-muted/20 space-y-2">
              <Link
                href="/welcome"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-black text-muted-foreground hover:bg-muted hover:text-gold transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gold" />
                  زيارة الموقع العام
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <div className="flex items-center justify-between pt-1 px-1">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground" dir="ltr">
                    {userEmail}
                  </p>
                  <p className="text-[10px] font-bold text-gold">{userRoleLabel}</p>
                </div>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
