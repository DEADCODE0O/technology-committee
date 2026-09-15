import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { ADMIN_ROLES } from "@/lib/constants";
import { StaffTable } from "@/components/admin/staff-manager";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  صفحة المشرفين — ترقية الطلاب + صلاحيات دقيقة لكل مشرف
// ═══════════════════════════════════════════════════════════════

export default async function AdminStaffPage() {
  const admin = await requireAdmin(MODULES.ADMINS, "manage");
  const canManage = canUser(admin, MODULES.ADMINS, "manage");

  // كل الحسابات الإدارية (كل دور غير STUDENT معروف في قائمة الأدوار)
  const staff = await db.user.findMany({
    where: { role: { in: ADMIN_ROLES } },
    include: { profile: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
          <ShieldCheck className="h-6 w-6 text-gold" />
          المشرفون والصلاحيات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          رقّ أي طالب إلى مشرف وحدد ما يستطيع فعله بالضبط — كل وحدة بصلاحيتها الخاصة
        </p>
      </div>

      <div className="rounded-2xl border border-gold/15 bg-gold/[0.03] px-5 py-4 text-[11px] leading-6 text-zinc-500">
        «افتراضي الدور» يتبع الدور الوظيفي العام (مدير / مسؤول ورش / ...) — وأي اختيار آخر هنا يتجاوز
        الافتراضي لهذا المشرف وحده. المدير الأعلى يملك كل الصلاحيات دائمًا ولا يمكن تعديلها.
      </div>

      {staff.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-6 py-12 text-center text-sm text-zinc-500">
          لا يوجد مشرفون — رقّ أول مشرف من الزر بالأسفل
        </p>
      ) : (
        <StaffTable
          canManage={canManage}
          staff={staff.map((s) => ({
            id: s.id,
            email: s.email,
            role: s.role,
            status: s.status,
            customPermissions: s.customPermissions,
            name: s.profile?.fullName ?? null,
            isSelf: s.id === admin.id,
            isProtected: s.role === "SUPER_ADMIN",
          }))}
        />
      )}
    </div>
  );
}
