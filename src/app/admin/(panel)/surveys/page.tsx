import { BarChart3 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { SurveyManager } from "@/components/admin/survey-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الاستبيانات واستطلاعات الرأي | مركز التحكم",
  description: "إنشاء الاستبيانات وتحليل أصوات الطلاب واتخاذ القرارات الذكية",
};

export default async function AdminSurveysPage() {
  const admin = await requireAdmin(MODULES.DATA_REQUESTS);
  const canManage = canUser(admin, MODULES.DATA_REQUESTS, "manage");

  const [surveys, surveyPosts] = await Promise.all([
    db.dataRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
    }),
    db.communityPost.findMany({
      where: { type: "SURVEY" },
      select: { id: true, links: true, pinned: true },
    }),
  ]);

  const formatted = surveys.map((s) => {
    let questionsCount = 0;
    let parsedFields: any[] = [];
    try {
      const parsed = JSON.parse(s.fields);
      parsedFields = Array.isArray(parsed) ? parsed : [];
      questionsCount = parsedFields.length;
    } catch {
      questionsCount = 0;
    }

    const linkedPost = surveyPosts.find((p) => p.links?.includes(s.id));

    return {
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      deadline: s.deadline ? s.deadline.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      responsesCount: s._count.responses,
      questionsCount,
      pinned: linkedPost?.pinned ?? false,
      questions: parsedFields.map((f, idx) => ({
        id: f.id || `q_${idx + 1}`,
        type: f.type || "POLL_SINGLE",
        question: f.label || "",
        options: Array.isArray(f.options) ? f.options : [],
        allowOther: !!f.allowOther,
      })),
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">
              الاستبيانات واستطلاعات الرأي 📊
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              نظام الاستبيانات التفاعلية في المجتمع مع محرك ذكي لتحليل البيانات ودعم اتخاذ القرارات التنفيذية
            </p>
          </div>
        </div>
      </div>

      <SurveyManager initialSurveys={formatted} canManage={canManage} />
    </div>
  );
}
