import { Settings, IdCard, Info, Palette, Sparkles, Heart } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import {
  getStudentCodeConfig,
  getTalentsSectionVisible,
  getAvatarFramesVisible,
  getCharmHeartsVisible,
} from "@/lib/platform";
import { getSiteTheme } from "@/lib/site-themes";
import { GRADES, GRADE_LABELS } from "@/lib/constants";
import { StudentCodeSettings } from "@/components/admin/student-code-settings";
import { TalentsSectionSettings } from "@/components/admin/talents-section-settings";
import { SeasonalThemeSettings } from "@/components/admin/seasonal-theme-settings";
import { GamificationSettings } from "@/components/admin/gamification-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin(MODULES.SETTINGS);
  const canManage = canUser(admin, MODULES.SETTINGS, "manage");
  const [config, talentsVisible, siteThemeConfig, avatarFramesVisible, heartsVisible] = await Promise.all([
    getStudentCodeConfig(),
    getTalentsSectionVisible(),
    getSiteTheme(),
    getAvatarFramesVisible(),
    getCharmHeartsVisible(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
          <Settings className="h-6 w-6 text-gold" />
          إعدادات المنصة
        </h1>
        <p className="mt-1 text-sm text-zinc-500">إعدادات يغيرها SUPER ADMIN فقط — بدون لمس أي كود</p>
      </div>

      {/* إطارات الصور والقلوب */}
      <section className="rounded-3xl border border-white/[0.06] bg-surface p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-zinc-100">
            <Sparkles className="h-5 w-5 text-gold/80" />
            إعدادات إطارات الصور والقلوب (Frames & Charm Hearts)
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-zinc-500">
            التحكم المباشر في إظهار أو إخفاء الإطارات الزخرفية للصور وقلوب التفاعل والمستويات على مستوى المنصة فورياً للطلاب والزوار.
          </p>
        </div>

        {canManage ? (
          <GamificationSettings
            initialAvatarFramesVisible={avatarFramesVisible}
            initialCharmHeartsVisible={heartsVisible}
          />
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
            إطارات الصور: {avatarFramesVisible ? "ظاهرة" : "مخفية"} · القلوب: {heartsVisible ? "ظاهرة" : "مخفية"} — التعديل متاح لـ SUPER ADMIN
          </p>
        )}
      </section>

      {/* كود الطالب */}
      <section className="rounded-3xl border border-white/[0.06] bg-surface p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-zinc-100">
            <IdCard className="h-5 w-5 text-gold/80" />
            إعدادات كود الطالب
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-zinc-500">
            بتحدد إمتى يُطلب كود الطالب عند التسجيل — حسب الفرقة. تقدر تغيّر القاعدة أي وقت (مثلًا لما تصلك كارنيهات الفرقة الأولى)
            والقاعدة تُطبق فورًا على التسجيلات الجديدة بدون أي تعديل برمجي.
          </p>
        </div>

        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold/20 bg-gold/[0.04] px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold/80" />
          <p className="text-xs leading-6 text-zinc-400">
            <span className="font-bold text-gold-light">الحالة الحالية: {config.requiredGrades.length === 0 ? "معطل تمامًا" : `مطلوب لـ ${config.requiredGrades.length} فرق`}</span>
            <br />
            {config.requiredGrades.length === 0
              ? "النظام لا يطلب كود الطالب من أي فرقة — تمامًا كما قررت. الحقل موجود في قاعدة البيانات وجاهز للتشغيل."
              : `يُطلب حاليًا من: ${config.requiredGrades.map((g) => GRADE_LABELS[g] ?? g).join("، ")}`}
          </p>
        </div>

        {canManage ? (
          <StudentCodeSettings
            requiredGrades={config.requiredGrades}
            pattern={config.pattern}
            hint={config.hint}
            grades={GRADES.map((g) => ({ value: g.value, label: g.label }))}
          />
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
            صلاحياتك للعرض فقط — التعديل متاح لـ SUPER ADMIN
          </p>
        )}
      </section>

      {/* قسم المواهب */}
      <section className="rounded-3xl border border-white/[0.06] bg-surface p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-zinc-100">
            <Palette className="h-5 w-5 text-gold/80" />
            قسم المواهب
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-zinc-500">
            إظهار أو إخفاء قسم المواهب للطلاب — تُدار المواهب نفسها من <span className="font-bold text-gold-light">لوحة المواهب</span> (الإدارة وحدها تضيفها مع صور الطلاب)
          </p>
        </div>
        {canManage ? (
          <TalentsSectionSettings visible={talentsVisible} />
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
            القسم {talentsVisible ? "ظاهر" : "مخفي"} — التعديل متاح لـ SUPER ADMIN
          </p>
        )}
      </section>

      {/* ثيمات ومناسبات الموقع العامة */}
      <section className="rounded-3xl border border-white/[0.06] bg-surface p-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-zinc-100">
            <Sparkles className="h-5 w-5 text-gold/80" />
            إدارة ثيمات ومناسبات المنصة
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-zinc-500">
            تحكم كامل في مظهر وهوية المنصة خلال المناسبات والأعياد (رمضان المبارك، الأعياد، رأس السنة الميلادية والهجرية، واليوم الوطني).
            تغيير الثيم يطبق فورياً على كامل صفحات الموقع مع شريط تهنئة علوي وزينة هادئة.
          </p>
        </div>

        {canManage ? (
          <SeasonalThemeSettings currentConfig={siteThemeConfig} />
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
            الثيم الحالي: {siteThemeConfig.themeId} — التعديل متاح لـ SUPER ADMIN
          </p>
        )}
      </section>

      {/* معلومات النظام */}
      <section className="rounded-3xl border border-white/[0.06] bg-surface p-6">
        <h2 className="mb-4 text-lg font-extrabold text-zinc-100">معلومات المنصة</h2>
        <ul className="space-y-2.5 text-xs">
          <li className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-2.5">
            <span className="font-bold text-zinc-500">الإصدار</span>
            <span className="font-bold text-zinc-200">منصة أنشطة الطلاب v1.0</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-2.5">
            <span className="font-bold text-zinc-500">المصادقة</span>
            <span className="font-bold text-zinc-200">بريد + كلمة سر (بدون OTP)</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-2.5">
            <span className="font-bold text-zinc-500">الأدوار المتاحة</span>
            <span className="font-bold text-zinc-200">مدير أعلى · مدير · مسؤول ورش · مسؤول محتوى · مشاهد</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
