import Link from "next/link";
import { Palette, Sparkles, EyeOff, Settings, Info } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { getTalentsSectionVisible } from "@/lib/platform";
import { TalentManager, type AdminTalentRow } from "@/components/admin/talent-manager";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  إدارة المواهب — الإدارة وحدها تضيف/تعدل/تحذف المواهب
//  الطالب لا يرسل طلبات مواهب بعد الآن
// ═══════════════════════════════════════════════════════════════

export default async function AdminTalentsPage() {
  const admin = await requireAdmin(MODULES.TALENTS);
  const canManage = canUser(admin, MODULES.TALENTS, "manage");

  const [talentRows, studentRows, sectionVisible] = await Promise.all([
    db.talent.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { user: { include: { profile: true } } },
    }),
    db.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, email: true, profile: { select: { fullName: true, grade: true } } },
    }),
    getTalentsSectionVisible(),
  ]);

  const students = studentRows.map((u) => ({
    id: u.id,
    label: `${u.profile?.fullName ?? u.email}${u.profile?.grade ? ` — ${u.profile.grade}` : ""}`,
  }));

  const talents: AdminTalentRow[] = talentRows.map((t) => ({
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

  const featuredCount = talents.filter((t) => t.featured).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
          <Palette className="h-6 w-6 text-gold" />
          إدارة المواهب
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          الإدارة وحدها تضيف المواهب وتعدّلها — <span className="text-gold-light">{featuredCount}</span> مميزة تظهر في الموقع العام
        </p>
      </div>

      {/* حالة القسم */}
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3.5 ${sectionVisible ? "border-gold/20 bg-gold/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
        {sectionVisible ? (
          <>
            <Info className="h-4 w-4 shrink-0 text-gold/80" />
            <p className="flex-1 text-xs leading-6 text-zinc-400">
              <span className="font-bold text-gold-light">قسم المواهب ظاهر للطلاب</span> — المواهب المميزة تظهر في الموقع العام وفي لوحة الطالب
            </p>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
            <p className="flex-1 text-xs leading-6 text-zinc-400">
              <span className="font-bold text-zinc-200">قسم المواهب مخفي حاليًا</span> — الطالب لا يرى القسم إطلاقًا حتى تفعّله من الإعدادات
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

      {canManage ? (
        <TalentManager talents={talents} students={students} />
      ) : (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
          صلاحياتك للعرض فقط — التعديل يتطلب صلاحية الإدارة
        </p>
      )}

      <p className="flex items-center gap-1.5 text-center text-xs text-zinc-600">
        <Sparkles className="h-3.5 w-3.5" />
        المواهب المميزة فقط (بدون الحاجة لمراجعة) تظهر للطلاب في الموقع العام ولوحة الطالب عند تفعيل القسم
      </p>
    </div>
  );
}
