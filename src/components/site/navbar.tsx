"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowLeft, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { navLinks, siteConfig } from "@/config/site";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavUser = { name: string; role: string } | null;

export function Navbar({ user, showTalents = false }: { user: NavUser; showTalents?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // خلفية داكنة أوضح عند التمرير
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // قفل تمرير الصفحة أثناء فتح قائمة الهاتف
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isAdmin = !!user && user.role !== "STUDENT";
  // روابط ظاهرة — المواهب تظهر فقط عند تفعيل القسم من الإعدادات
  const visibleLinks = showTalents ? navLinks : navLinks.filter((l) => l.href !== "/talents");

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/85 shadow-[0_4px_20px_-4px_rgba(24,24,27,0.06)] dark:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        {/* الشعار الرسمي */}
        <Link href="/welcome" className="flex items-center gap-3" aria-label={siteConfig.nameEn}>
          <Image
            src={siteConfig.logo}
            alt="شعار اللجنة التكنولوجية"
            width={64}
            height={64}
            className="h-10 w-10 lg:h-12 lg:w-12"
            priority
            loading="eager"
          />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className={`text-sm font-extrabold transition-colors duration-300 ${scrolled ? "text-foreground" : "text-foreground drop-shadow-none dark:text-white dark:drop-shadow-sm"}`}>
              اللجنة التكنولوجية
            </span>
            <span className="font-latin text-[9px] font-medium tracking-[0.28em] text-gold">
              {siteConfig.nameEn}
            </span>
          </span>
        </Link>

        {/* روابط الشاشات الكبيرة */}
        <ul className="hidden items-center gap-7 lg:flex">
          {visibleLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`group relative text-sm font-semibold transition-colors duration-300 hover:text-gold dark:hover:text-gold ${
                  scrolled ? "text-muted-foreground" : "text-foreground/90 drop-shadow-none dark:text-zinc-200 dark:drop-shadow-sm"
                }`}
              >
                {link.label}
                <span className="absolute -bottom-1.5 start-0 h-px w-0 bg-gold/70 transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* محول المظهر (وضع النهار / الليل) */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>

          {user ? (
            <>
              {/* المستخدم المسجل — زر لوحته */}
              <Link
                href={isAdmin ? "/admin" : "/panel"}
                className="hidden h-10 items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.08] px-4 text-sm font-bold text-gold transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 sm:inline-flex"
              >
                {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                <span className="max-w-[130px] truncate">{user.name}</span>
              </Link>
              <form action={logoutAction} className="hidden sm:block">
                <button
                  type="submit"
                  aria-label="تسجيل الخروج"
                  title="تسجيل الخروج"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-full border border-gold/40 bg-gold/[0.08] px-6 text-sm font-bold text-gold transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold/[0.15] sm:inline-flex"
              >
                تسجيل الدخول
              </Link>
            </>
          )}

          {/* زر قائمة الهاتف */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 text-foreground transition-colors hover:border-gold/30 hover:text-gold lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* قائمة الهاتف */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 top-16 z-40 flex flex-col bg-background/98 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex items-center justify-center py-4 border-b border-border">
              <ThemeToggle />
            </div>

            <ul className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-4">
              {visibleLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i + 0.08, duration: 0.45, ease: "easeOut" }}
                  className="w-full max-w-xs"
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex h-14 items-center justify-center rounded-2xl border border-border bg-card/40 text-base font-bold text-foreground transition-all active:scale-[0.98] hover:border-gold/30 hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}

              {user ? (
                <motion.li
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.45, ease: "easeOut" }}
                  className="mt-4 flex w-full max-w-xs items-center gap-2"
                >
                  <Link
                    href={isAdmin ? "/admin" : "/panel"}
                    onClick={() => setOpen(false)}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gold-light to-gold text-base font-extrabold text-night shadow-[0_10px_35px_-10px_rgba(201,164,92,0.6)] transition-transform active:scale-[0.98]"
                  >
                    {isAdmin ? <ShieldCheck className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
                    {isAdmin ? "لوحة الإدارة" : "لوحة التحكم"}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      aria-label="تسجيل الخروج"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/60 text-muted-foreground active:scale-[0.98]"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </form>
                </motion.li>
              ) : (
                <>
                  <motion.li
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.45, ease: "easeOut" }}
                    className="mt-5 w-full max-w-xs"
                  >
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/[0.1] text-base font-bold text-gold transition-all active:scale-[0.98]"
                    >
                      تسجيل الدخول
                    </Link>
                  </motion.li>
                </>
              )}
            </ul>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pb-8 text-center font-latin text-[10px] font-medium tracking-[0.35em] text-gold/50"
            >
              TECHNOLOGY COMMITTEE
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
