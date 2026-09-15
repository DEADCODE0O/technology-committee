"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Loader2, Megaphone, Palette } from "lucide-react";
import { updateSiteThemeSettings } from "@/actions/admin";
import { SITE_THEMES, type SiteThemeConfig, type SiteThemeId } from "@/lib/site-theme-defs";

export function SeasonalThemeSettings({
  currentConfig,
}: {
  currentConfig: SiteThemeConfig;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedThemeId, setSelectedThemeId] = useState<SiteThemeId>(currentConfig.themeId);
  const [bannerText, setBannerText] = useState(currentConfig.bannerText);
  const [showBanner, setShowBanner] = useState(currentConfig.showBanner);
  const [enableDecorations, setEnableDecorations] = useState(currentConfig.enableDecorations);

  const handleApplyTheme = (themeId: SiteThemeId) => {
    const themeDef = SITE_THEMES.find((t) => t.id === themeId);
    const newBannerText = bannerText === currentConfig.bannerText && themeDef
      ? themeDef.defaultBannerText
      : bannerText;

    setSelectedThemeId(themeId);
    if (themeDef && (!bannerText || bannerText === currentConfig.bannerText)) {
      setBannerText(themeDef.defaultBannerText);
    }

    startTransition(async () => {
      const res = await updateSiteThemeSettings({
        themeId,
        bannerText: newBannerText,
        showBanner,
        enableDecorations,
      });
      if (res.ok) {
        toast.success(`تم تفعيل ثيم «${themeDef?.name ?? themeId}» بنجاح على كامل الموقع!`);
      } else {
        toast.error(res.error || "تعذر حفظ إعدادات الثيم");
      }
    });
  };

  const handleSaveBannerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSiteThemeSettings({
        themeId: selectedThemeId,
        bannerText,
        showBanner,
        enableDecorations,
      });
      if (res.ok) {
        toast.success("تم تحديث إعدادات شريط المناسبة والزينة بنجاح!");
      } else {
        toast.error(res.error || "تعذر حفظ الإعدادات");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── بطاقات الثيمات المتاحة ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_THEMES.map((theme) => {
          const isActive = selectedThemeId === theme.id;
          return (
            <div
              key={theme.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isActive
                  ? "border-gold bg-gold/[0.08] shadow-[0_0_30px_-5px_rgba(201,164,92,0.3)]"
                  : "border-white/[0.08] bg-surface hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{theme.icon}</span>
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-100">{theme.name}</h3>
                      <p className="text-[11px] font-bold text-zinc-400">{theme.tagline}</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-extrabold border"
                    style={{
                      backgroundColor: `${theme.accentColor}20`,
                      borderColor: `${theme.accentColor}50`,
                      color: theme.accentColor,
                    }}
                  >
                    {theme.badge}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-400">
                  {theme.description}
                </p>

                {/* ألوان الهوية */}
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 font-bold">اللمسات:</span>
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: theme.accentColor }}
                    title={theme.accentColor}
                  />
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: theme.secondaryColor }}
                    title={theme.secondaryColor}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                {isActive ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gold/20 py-2 text-xs font-extrabold text-gold-light">
                    <CheckCircle2 className="h-4 w-4 text-gold" />
                    الثيم المفعل حالياً
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApplyTheme(theme.id)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-bold text-zinc-300 hover:border-gold/40 hover:bg-gold/10 hover:text-gold-light transition-all disabled:opacity-50"
                  >
                    {isPending ? "جاري التفعيل..." : "تفعيل هذا الثيم"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── تخصيص شريط التهنئة والزينة ── */}
      <form
        onSubmit={handleSaveBannerSettings}
        className="rounded-2xl border border-white/[0.08] bg-surface p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-extrabold text-zinc-100">
            شريط التهنئة وزينة المناسبة
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1">
              نص التهنئة أو الإعلان الموسمي (يظهر أعلى الموقع):
            </label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="مثال: 🌙 مبارك عليكم شهر رمضان المبارك..."
              className="w-full rounded-xl border border-white/10 bg-night/80 px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showBanner}
                onChange={(e) => setShowBanner(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-night text-gold focus:ring-gold"
              />
              إظهار شريط التهنئة أعلى كافة صفحات الموقع
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDecorations}
                onChange={(e) => setEnableDecorations(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-night text-gold focus:ring-gold"
              />
              تفعيل عناصر الزينة الاحتفالية الخفيفة (الهلال، النجوم)
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                حفظ إعدادات التهنئة
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
