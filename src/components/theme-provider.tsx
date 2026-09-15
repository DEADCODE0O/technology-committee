"use client";

import * as React from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "tc_theme";
const THEME_EVENT = "tc_theme_change";

// ── متجر خارجي متزامن (useSyncExternalStore) ──
// نمط React الرسمي لقراءة مصدر خارجي (localStorage) دون آثار جانبية داخل useEffect
function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function getServerSnapshot(): Theme {
  return "dark";
}

// تطبيق الفئة على عنصر html (آمن لأنه يعمل بعد الترطيب فقط)
function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(t);
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  attribute?: string;
  enableSystem?: boolean;
}) {
  // القراءة الحية من localStorage — تتفق مع سكريبت منع FOUC في layout
  const stored = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme: Theme = stored === "light" ? "light" : defaultTheme === "light" ? "light" : "dark";

  React.useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
    // إشعار كل النوافذ والمكونات المشتركة في المتجر
    window.dispatchEvent(new Event(THEME_EVENT));
    applyThemeClass(newTheme);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
