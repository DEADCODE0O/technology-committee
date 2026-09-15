import { ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { DataRequestManager } from "@/components/admin/data-request-manager";
import { describeTarget, findTargetedStudentIds, parseTarget } from "@/lib/targeting";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  طلبات البيانات — طلب بيانات جديدة من مجموعات محددة من الطلاب
// ═══════════════════════════════════════════════════════════════

function parseAnswers(raw: string): Record<string, string | string[]> {
  try {
    return JSON.parse(raw) as Record<string, string | string[]>;
  } catch {
    return {};
  }
}

export default async function AdminDataRequestsPage() {
  const admin = await requireAdmin(MODULES.DATA_REQUESTS);
  const canManage = canUser(admin, MODULES.DATA_REQUESTS, "manage");

  const requests = await db.dataRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { email: true } },
      responses: { include: { user: { include: { profile: true } } }, orderBy: { submittedAt: "desc" } },
    },
  });

  // عدد المستهدفين لكل طلب (للعرض)
  const withCounts = await Promise.all(
    requests.map(async (r) => ({
      ...r,
      matchedCount: (await findTargetedStudentIds(parseTarget(r.target))).length,
    }))
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-zinc-50">
          <ClipboardList className="h-6 w-6 text-gold" />
          طلبات البيانات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          اطلب بيانات جديدة من الطلاب — نقاط مواد، بيانات إضافية، استبيانات — موجهة لمجموعة بدقة
          (فرقة / شعبة / جنس / حاضرين / موهوبين / متفوقين / طلاب بعينهم)
        </p>
      </div>

      <DataRequestManager
        canManage={canManage}
        requests={withCounts.map((r) => {
          let fields: { id: string; label: string; type: string; options?: string[]; required?: boolean }[] = [];
          try { fields = JSON.parse(r.fields); } catch { fields = []; }
          return {
            id: r.id,
            title: r.title,
            description: r.description,
            status: r.status,
            deadline: r.deadline ? r.deadline.toISOString() : null,
            mandatory: r.mandatory,
            targetDesc: describeTarget(parseTarget(r.target), {
              grade: GRADE_LABELS,
              section: SECTION_LABELS,
              gender: GENDER_LABELS,
            }),
            matchedCount: r.matchedCount,
            fields,
            responses: r.responses.map((resp) => ({
              userId: resp.userId,
              name: resp.user.profile?.fullName ?? resp.user.email,
              email: resp.user.email,
              answers: parseAnswers(resp.answers),
              submittedAt: resp.submittedAt.toISOString(),
            })),
          };
        })}
      />
    </div>
  );
}
