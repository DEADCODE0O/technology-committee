"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

// ── حالة الترطيب الآمنة عبر useSyncExternalStore ──
// (البديل الرسمي لنمط setMounted داخل useEffect — يمنع الخطأ ووميض الواجهة)
function useIsClient() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-9 w-9 rounded-xl border border-border bg-card/60 text-muted-foreground ${className || ""}`}
        aria-label="تبديل المظهر"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`h-9 w-9 rounded-xl border border-border bg-card/50 hover:bg-accent text-foreground transition-all duration-300 ${className || ""}`}
      title={isDark ? "تفعيل وضع النهار (Light Mode)" : "تفعيل الوضع الليلي (Dark Mode)"}
      aria-label={isDark ? "تفعيل وضع النهار (Light Mode)" : "تفعيل الوضع الليلي (Dark Mode)"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-gold hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 text-gold-deep hover:-rotate-12 transition-transform" />
      )}
    </Button>
  );
}
