"use client";

// ═══════════════════════════════════════════════════════════════
//  قائمة لوحة الإدارة المتطورة للهواتف — تصميم فائق السلاسة في RTL
//  • انزلاق دقيق ومتوافق مع اتجاه الواجهة العربية (RTL) بدون قفزات
//  • شريط بحث ذكي بدون أي تداخل نصوص
//  • وصول فوري لمنصة وحساب الطالب (حسابي)
//  • أزرار لمس مريحة متوافقة مع إبهام اليد والـ Safe Area
// ═══════════════════════════════════════════════════════════════

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
  GraduationCap,
  LogOut,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

  // منع التمرير في الخلفية عند فتح القائمة مع الحفاظ على موضع الشاشة
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "unset";
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9.5 items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-3 text-xs font-black text-gold hover:bg-gold hover:text-night transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
          aria-label="فتح قائمة الإدارة"
        >
          <Menu className="h-4.5 w-4.5" />
          <span>القائمة</span>
        </button>

        {currentItem && (
          <span className="max-w-[120px] sm:max-w-[180px] truncate text-xs font-black text-foreground" title={currentItem.label}>
            {currentItem.label}
          </span>
        )}
      </div>

      {/* ── الدرج الجانبي للموبايل (Mobile Drawer) ── */}
      {isOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex justify-start bg-night/80 backdrop-blur-md transition-opacity duration-200"
        >
          {/* خلفية للإغلاق عند النقر في الخارج */}
          <div
            className="fixed inset-0 cursor-pointer"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative flex w-full max-w-[320px] sm:max-w-xs flex-col bg-card border-e border-border shadow-2xl h-full z-10 animate-in slide-in-from-right duration-300">
            {/* هيدر القائمة */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 shrink-0">
                  <Image src="/images/logo.png" alt="" width={24} height={24} className="h-6 w-6" />
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* بطاقة الوصول السريع لمنصة الطالب (حسابي) للمشرف */}
            <div className="p-3 border-b border-border/70 bg-gold/[0.04]">
              <Link
                href="/panel"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-gold/40 bg-gold/10 hover:bg-gold/20 p-2.5 text-xs font-black text-gold-deep dark:text-gold shadow-xs transition-all active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gold/20 text-gold">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span>منصة الطالب (حسابي)</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Link>
            </div>

            {/* شريط البحث الفوري المضبوط بدقة لـ RTL */}
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

            {/* قائمة الأقسام المجمعة */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar" aria-label="أقسام الإدارة">
              {groupedCategories.length > 0 ? (
                groupedCategories.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="flex items-center justify-between px-2.5 py-1">
                      <span className="text-[11px] font-black text-gold uppercase tracking-wider">
                        {group.name}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded-full">
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
                            className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition-all ${
                              isActive
                                ? "bg-gold text-night shadow-md"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                  isActive
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

            {/* فوتر القائمة مع رابط الموقع العام وتسجيل الخروج ومراعاة الـ Safe Area */}
            <div className="border-t border-border p-3 bg-muted/20 space-y-2 pb-6">
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
          </div>
        </div>
      )}
    </>
  );
}
