import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cairo, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { getSiteTheme } from "@/lib/site-themes";
import { SITE_THEMES } from "@/lib/site-theme-defs";
import { getAvatarFramesVisible } from "@/lib/platform";
import { SeasonalBanner } from "@/components/seasonal/seasonal-banner";
import { SeasonalDecorations } from "@/components/seasonal/seasonal-decorations";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import "./globals.css";

// الخط العربي الأساسي للموقع
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

// خط لاتيني أنيق للتفاصيل البصرية الصغيرة (TECHNOLOGY COMMITTEE ...)
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "اللجنة التكنولوجية | تجربة جامعية مختلفة",
  description:
    "خُض تجربة جديدة وعِش حياة جامعية بشكل مختلف — كورسات، ورش، ندوات، رحلات، حفلات ومسابقات. جميع برامجنا وأنشطتنا مجانية للطلاب.",
  keywords: [
    "اللجنة التكنولوجية",
    "Technology Committee",
    "أنشطة طلابية",
    "كورسات مجانية",
    "ورش عمل",
    "تجربة جامعية",
  ],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "اللجنة التكنولوجية — TECHNOLOGY COMMITTEE",
    description:
      "خُض تجربة جديدة وعِش حياة جامعية بشكل مختلف. جميع برامجنا وأنشطتنا مجانية للطلاب.",
    type: "website",
    images: ["/images/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [themeConfig, avatarFramesVisible] = await Promise.all([
    getSiteTheme(),
    getAvatarFramesVisible(),
  ]);
  const activeThemeDef = SITE_THEMES.find((t) => t.id === themeConfig.themeId) || SITE_THEMES[0];

  return (
    <html
      lang="ar"
      dir="rtl"
      data-site-theme={themeConfig.themeId}
      data-avatar-frames={avatarFramesVisible ? "visible" : "hidden"}
      suppressHydrationWarning
    >
      <head>
        {/* تهيئة المظهر قبل أول رسم — يمنع وميض الوضع الخطأ (FOUC) لمستخدمي وضع النهار */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tc_theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t)}else{document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
      </head>
      <body
        className={`${cairo.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground transition-colors duration-200`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider defaultLocale="ar">
            {themeConfig.showBanner && themeConfig.bannerText && (
              <SeasonalBanner
                text={themeConfig.bannerText}
                icon={activeThemeDef.icon}
                accentColor={activeThemeDef.accentColor}
              />
            )}
            {themeConfig.enableDecorations && (
              <SeasonalDecorations theme={activeThemeDef} />
            )}
            {children}
            <Toaster
              position="top-center"
              richColors
              toastOptions={{
                style: {
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-cairo)",
                },
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
