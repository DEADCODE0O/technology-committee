// ═══════════════════════════════════════════════════════════════
//  دوال خادم ثيمات المنصة (Server-only)
//  ⚠️ لا تستورد هذا الملف من مكونات العميل — يحمل PrismaClient
//  التعريفات النقية (SITE_THEMES والأنواع) في site-theme-defs.ts
// ═══════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { SITE_THEMES, DEFAULT_SITE_THEME_CONFIG, type SiteThemeConfig } from "@/lib/site-theme-defs";

// إعادة تصدير الأنواع فقط (تُمحى وقت التجميع — لا تنشئ سلسلة استيراد لقاعدة البيانات)
export type { SiteThemeConfig, SiteThemeDefinition, SiteThemeId } from "@/lib/site-theme-defs";

/** جلب الإعداد الحالي للثيم الموسمي */
export async function getSiteTheme(): Promise<SiteThemeConfig> {
  try {
    const row = await db.setting.findUnique({ where: { key: "site_theme" } });
    if (!row?.value) return DEFAULT_SITE_THEME_CONFIG;
    const parsed = JSON.parse(row.value) as Partial<SiteThemeConfig>;
    return {
      themeId: parsed.themeId ?? DEFAULT_SITE_THEME_CONFIG.themeId,
      bannerText: parsed.bannerText ?? (SITE_THEMES.find((t) => t.id === parsed.themeId)?.defaultBannerText || DEFAULT_SITE_THEME_CONFIG.bannerText),
      showBanner: typeof parsed.showBanner === "boolean" ? parsed.showBanner : DEFAULT_SITE_THEME_CONFIG.showBanner,
      enableDecorations: typeof parsed.enableDecorations === "boolean" ? parsed.enableDecorations : DEFAULT_SITE_THEME_CONFIG.enableDecorations,
    };
  } catch {
    return DEFAULT_SITE_THEME_CONFIG;
  }
}

/** حفظ تكوين الثيم الموسمي */
export async function saveSiteTheme(config: Partial<SiteThemeConfig>): Promise<SiteThemeConfig> {
  const current = await getSiteTheme();
  const updated: SiteThemeConfig = {
    themeId: config.themeId ?? current.themeId,
    bannerText: config.bannerText !== undefined ? config.bannerText : current.bannerText,
    showBanner: config.showBanner !== undefined ? config.showBanner : current.showBanner,
    enableDecorations: config.enableDecorations !== undefined ? config.enableDecorations : current.enableDecorations,
  };

  await db.setting.upsert({
    where: { key: "site_theme" },
    create: { key: "site_theme", value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  return updated;
}
