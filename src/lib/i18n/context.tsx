"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Locale } from "./translations";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKeyPath = NestedKeyOf<typeof translations.ar>;

interface LanguageContextType {
  locale: Locale;
  dir: "rtl" | "ltr";
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "tc_lang";

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale] = useState<Locale>("ar");

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${STORAGE_KEY}=ar; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  const setLocale = () => {};
  const toggleLocale = () => {};

  const t = (path: string): string => {
    const parts = path.split(".");
    let currentAr: any = translations.ar;
    let currentActive: any = translations[locale];

    for (const part of parts) {
      if (currentActive && currentActive[part] !== undefined) {
        currentActive = currentActive[part];
      } else {
        currentActive = undefined;
      }

      if (currentAr && currentAr[part] !== undefined) {
        currentAr = currentAr[part];
      } else {
        currentAr = undefined;
      }
    }

    if (typeof currentActive === "string") return currentActive;
    if (typeof currentAr === "string") return currentAr;
    return path;
  };

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRtl = locale === "ar";

  return (
    <LanguageContext.Provider
      value={{
        locale,
        dir,
        isRtl,
        setLocale,
        toggleLocale,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: "ar" as Locale,
      dir: "rtl" as const,
      isRtl: true,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (path: string) => path,
    };
  }
  return context;
}
