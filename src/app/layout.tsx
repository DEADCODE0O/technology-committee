import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Toaster } from "sonner";
import { getSiteTheme } from "@/lib/site-themes";
import { SITE_THEMES } from "@/lib/site-theme-defs";
import { getAvatarFramesVisible } from "@/lib/platform";
import { SeasonalBanner } from "@/components/seasonal/seasonal-banner";
import { SeasonalDecorations } from "@/components/seasonal/seasonal-decorations";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { getCurrentUser } from "@/lib/auth";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "النهاية والبداية | منصة الأنشطة والورش",
  description:
    "منصة النهاية والبداية — مساحة مستقلة للورش التطبيقية، البرامج التعليمية، المسارات الإبداعية وتنمية المهارات.",
  keywords: [
    "النهاية والبداية",
    "THE END & THE BEGINNING",
    "ورش عمل",
    "برامج تعليمية",
    "تطوير المهارات",
    "منصة تعليمية",
  ],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "النهاية والبداية — THE END & THE BEGINNING",
    description:
      "منصة النهاية والبداية — مساحة مستقلة للورش التطبيقية والبرامج التعليمية وتنمية المهارات.",
    type: "website",
    images: ["/images/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050a18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const reqHost = (h.get("x-forwarded-host") || h.get("host") || "").split(":")[0].trim().toLowerCase();
  const extHost = (process.env.NEXT_PUBLIC_EXTERNAL_REG_HOST || "k9m4x2v8q7.vercel.app").trim().toLowerCase();
  const isExternalDomain = Boolean(extHost && reqHost === extHost);

  const [themeConfig, avatarFramesVisible, currentUser] = await Promise.all([
    getSiteTheme(),
    getAvatarFramesVisible(),
    isExternalDomain ? Promise.resolve(null) : getCurrentUser(),
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
        className="font-sans antialiased bg-background text-foreground transition-colors duration-200"
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider defaultLocale="ar">
            {!isExternalDomain && currentUser?.isImpersonated && (
              <ImpersonationBanner
                studentName={currentUser.profile?.fullName || currentUser.suggestedName || currentUser.email}
                studentEmail={currentUser.email}
              />
            )}
            {!isExternalDomain && themeConfig.showBanner && themeConfig.bannerText && (
              <SeasonalBanner
                text={themeConfig.bannerText}
                icon={activeThemeDef.icon}
                accentColor={activeThemeDef.accentColor}
              />
            )}
            {!isExternalDomain &&
              themeConfig.enableDecorations &&
              activeThemeDef.id !== "default" &&
              activeThemeDef.decorations !== "none" && (
                <SeasonalDecorations
                  theme={{
                    id: activeThemeDef.id,
                    decorations: activeThemeDef.decorations,
                  }}
                />
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

        {/* ── Facebook JavaScript SDK ── */}
        {!isExternalDomain && (
          <Script id="facebook-jssdk" strategy="afterInteractive">
            {`
              window.fbAsyncInit = function() {
                FB.init({
                  appId      : '1625840098924106',
                  cookie     : true,
                  xfbml      : true,
                  version    : 'v19.0'
                });
                FB.AppEvents.logPageView();
              };
              (function(d, s, id){
                 var js, fjs = d.getElementsByTagName(s)[0];
                 if (d.getElementById(id)) {return;}
                 js = d.createElement(s); js.id = id;
                 js.src = "https://connect.facebook.net/ar_AR/sdk.js";
                 fjs.parentNode.insertBefore(js, fjs);
               }(document, 'script', 'facebook-jssdk'));
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
