// ═══════════════════════════════════════════════════════════════
//  تعريفات ثيمات المنصة (Site-wide Seasonal Theme Definitions)
//  ملف نقي بلا أي استيراد لقاعدة البيانات — آمن للاستخدام في
//  مكونات العميل والخادم على حد سواء (كان مخلوطًا سابقًا مع
//  دوال الخادم داخل site-themes.ts فجرّح حزمة المتصفح)
// ═══════════════════════════════════════════════════════════════

export type SiteThemeId =
  | "default"
  | "ramadan"
  | "eid_fitr"
  | "eid_adha"
  | "new_year"
  | "hijri_new_year"
  | "national_day";

export interface SiteThemeDefinition {
  id: SiteThemeId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  badge: string;
  accentColor: string;
  secondaryColor: string;
  defaultBannerText: string;
  decorations: "none" | "crescent_lanterns" | "festive_confetti" | "sacred_stars" | "winter_stars" | "heritage_lanterns" | "emerald_ribbons";
}

export const SITE_THEMES: SiteThemeDefinition[] = [
  {
    id: "default",
    name: "الملكي التقني (الافتراضي)",
    tagline: "الأسود الفاحم والذهب الخالص",
    description: "الهوية الرسمية الفاخرة للجنة التكنولوجية — عمق داكن مع لمسات الذهب الأنيق والتوهج الهادئ.",
    icon: "🛡️",
    badge: "الرسمي",
    accentColor: "#c9a45c",
    secondaryColor: "#e6cb8b",
    defaultBannerText: "مرحبًا بكم في منصة اللجنة التكنولوجية — تجربة جامعية مختلفة.",
    decorations: "none",
  },
  {
    id: "ramadan",
    name: "أجواء رمضان المبارك",
    tagline: "نفحات الإيمان والزمرد والذهب",
    description: "ثيم روحاني فخم يمزج خضرة الزمرد الداكن بذهب الليالي الرمضانية وفوانيس وأهلة معلقة متحركة.",
    icon: "🌙",
    badge: "موسمي",
    accentColor: "#10b981",
    secondaryColor: "#eab308",
    defaultBannerText: "🌙 مبارك عليكم شهر رمضان المبارك — تقبل الله منا ومنكم صالح الأعمال.",
    decorations: "crescent_lanterns",
  },
  {
    id: "eid_fitr",
    name: "فرحة عيد الفطر السعيد",
    tagline: "بهجة الاحتفال والبريق المشرق",
    description: "ألوان احتفالية مشرقة مع بريق النجوم وزينة متحركة احتفاءً بعيد الفطر وجائزة الصائمين.",
    icon: "🎉",
    badge: "عيد",
    accentColor: "#f59e0b",
    secondaryColor: "#ec4899",
    defaultBannerText: "🎉 كل عام وأنتم بخير بمناسبة عيد الفطر السعيد — عساكم من عواده!",
    decorations: "festive_confetti",
  },
  {
    id: "eid_adha",
    name: "عيد الأضحى المبارك",
    tagline: "الفخامة والبركة والعنابي الملكي",
    description: "درجات العنابي الملكي المخملي الممزوج ببريق الذهب وأجواء العشر الأوائل والبركات العظيمة.",
    icon: "🕋",
    badge: "عيد",
    accentColor: "#e11d48",
    secondaryColor: "#d97706",
    defaultBannerText: "🕋 عيد أضحى مبارك — تقبل الله منا ومنكم صالح الأعمال والطاعات.",
    decorations: "sacred_stars",
  },
  {
    id: "new_year",
    name: "رأس السنة الميلادية (كوزميك)",
    tagline: "أزرق ياقوتي ثلجي وبريق المستقبل",
    description: "أجواء شتوية ملكية مع بريق النجوم والشهب وعداد استقبال العام الجديد بطاقة متجددة.",
    icon: "❄️",
    badge: "عام جديد",
    accentColor: "#38bdf8",
    secondaryColor: "#a855f7",
    defaultBannerText: "✨ عام ميلادي جديد سعيد ومليء بالنجاحات والإنجازات التقنية الرائعة!",
    decorations: "winter_stars",
  },
  {
    id: "hijri_new_year",
    name: "رأس السنة الهجرية",
    tagline: "عراقة التاريخ والبرونز الإسلامي",
    description: "لمسات الزخارف الإسلامية العريقة وألوان البرونز والذهب مع استشعار الهجرة الشريفة وبداية العام الهجري.",
    icon: "📜",
    badge: "عام هجري",
    accentColor: "#d97706",
    secondaryColor: "#14b8a6",
    defaultBannerText: "📜 كل عام وأنتم بخير بمناسبة حلول رأس السنة الهجرية الجديدة.",
    decorations: "heritage_lanterns",
  },
  {
    id: "national_day",
    name: "اليوم الوطني وفخر الإنجاز",
    tagline: "الزمرد والأصالة والعزّة",
    description: "ألوان الفخر والأمجاد مع تدرجات الأخضر الملكي والذهب الصافي وشعارات الطموح والريادة.",
    icon: "🇸🇦",
    badge: "فخر",
    accentColor: "#059669",
    secondaryColor: "#facc15",
    defaultBannerText: "🇸🇦 دمتِ يا بلادي رمزًا للفخر والمجد والعطاء والإنجاز المستمر!",
    decorations: "emerald_ribbons",
  },
];

export interface SiteThemeConfig {
  themeId: SiteThemeId;
  bannerText: string;
  showBanner: boolean;
  enableDecorations: boolean;
}

export const DEFAULT_SITE_THEME_CONFIG: SiteThemeConfig = {
  themeId: "default",
  bannerText: SITE_THEMES[0].defaultBannerText,
  showBanner: false,
  enableDecorations: true,
};
