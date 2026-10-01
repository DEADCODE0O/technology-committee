import Link from "next/link";
import { Palette, Sparkles, EyeOff, Settings, Info, Compass, BarChart3 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { getTalentsSectionVisible } from "@/lib/platform";
import { type AdminTalentRow } from "@/components/admin/talent-manager";
import {
  getTalentsAnalytics,
  getFilteredTalentsStudents,
} from "@/actions/talents-explorer";
import { TalentsExplorer } from "@/components/admin/talents-explorer";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  مركز استكشاف وتحليل المواهب والرغبات الطلابية — الإدارة
//  • تحليل البيانات واتخاذ القرارات الإدارية للمسارات والورش
//  • فلترة دقيقة ومتعددة الأبعاد للطلاب وأصحاب المواهب
//  • تصدير كشوف الإكسيل والتواصل الفوري عبر واتساب
//  • بنك المواهب المعروضة والمميزة في الموقع العام
// ═══════════════════════════════════════════════════════════════

export default async function AdminTalentsPage() {
  const admin = await requireAdmin(MODULES.TALENTS);
  const canManage = canUser(admin, MODULES.TALENTS, "manage");

  // جلب كافة البيانات في استعلامات متوازية
  const [
    talentRows,
    studentRows,
    sectionVisible,
    analytics,
    initialExplorer,
  ] = await Promise.all([
    db.talent.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { user: { include: { profile: true } } },
    }),
    db.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, grade: true } },
      },
    }),
    getTalentsSectionVisible(),
    getTalentsAnalytics(),
    getFilteredTalentsStudents({ page: 1, pageSize: 25 }),
  ]);

  const studentOptions = studentRows.map((u) => ({
    id: u.id,
    label: `${u.profile?.fullName ?? u.email}${
      u.profile?.grade ? ` — ${u.profile.grade}` : ""
    }`,
  }));

  const adminTalents: AdminTalentRow[] = talentRows.map((t) => ({
    id: t.id,
    userId: t.userId,
    personName: t.personName,
    personGrade: t.personGrade,
    personSection: t.personSection,
    studentLabel: t.user?.profile?.fullName ?? null,
    category: t.category,
    name: t.name,
    customName: t.customName,
    description: t.description,
    portfolioUrl: t.portfolioUrl,
    imageUrl: t.imageUrl,
    featured: t.featured,
  }));

  const featuredCount = adminTalents.filter((t) => t.featured).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ترويسة الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-zinc-50">
            <Compass className="h-6 w-6 text-gold" />
            مركز استكشاف المواهب والرغبات الطلابية
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            منظومة متكاملة لتحليل اهتمامات الطلاب، توجيه خطط الورش، استخراج الكشوف، والتواصل المباشر
          </p>
        </div>

        {/* مؤشر الحالة السريع */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 font-bold text-gold-light">
            {analytics.totalTalentsCount} موهبة مسجلة
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-300">
            {analytics.studentsWithTalentsPercentage}% نسبة الإقبال
          </span>
        </div>
      </div>

      {/* تنبيه حالة إتاحة القسم للطلاب في الواجهة */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
          sectionVisible
            ? "border-gold/20 bg-gold/[0.04]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        {sectionVisible ? (
          <>
            <Info className="h-4 w-4 shrink-0 text-gold/80" />
            <p className="flex-1 text-xs leading-6 text-zinc-300">
              <span className="font-bold text-gold-light">قسم المواهب معروض للطلاب</span> —{" "}
              {featuredCount} موهبة مميزة تظهر في الموقع العام وفي لوحة الطالب
            </p>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
            <p className="flex-1 text-xs leading-6 text-zinc-400">
              <span className="font-bold text-zinc-200">قسم المواهب مخفي حاليًا عن الطلاب</span> —{" "}
              يمكنك تفعيله في أي وقت من إعدادات المنصة
            </p>
          </>
        )}
        <Link
          href="/admin/settings"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 text-[11px] font-bold text-zinc-300 hover:border-gold/40 hover:text-gold-light"
        >
          <Settings className="h-3.5 w-3.5" />
          الإعدادات
        </Link>
      </div>

      {/* المكون التفاعلي الرئيسي ثلاثي الأقسام */}
      <TalentsExplorer
        analytics={analytics}
        initialStudents={initialExplorer.students}
        initialTotalCount={initialExplorer.totalCount}
        initialPage={initialExplorer.page}
        initialTotalPages={initialExplorer.totalPages}
        canManage={canManage}
        adminTalents={adminTalents}
        studentOptions={studentOptions}
        sectionVisible={sectionVisible}
      />
    </div>
  );
}
