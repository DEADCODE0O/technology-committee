"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireStudentAction, requireActionUser } from "@/lib/auth";
import { MODULES } from "@/lib/permissions";
import { stampSeasonId } from "@/lib/progress";
import { logAudit } from "@/lib/platform";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

// ─── أنواع الأسئلة المدعومة في الاستبيانات ────────────────────────
export type SurveyQuestionType = "POLL_SINGLE" | "POLL_MULTI" | "RATING" | "TEXT";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  target?: string;
  deadline?: string | null;
  postToCommunity?: boolean;
  bannerUrl?: string | null;
}

// ─── 1. تصويت الطالب في الاستبيان ───────────────────────────────
export async function submitSurveyVote(
  surveyId: string,
  answers: Record<string, string | string[]>
): Promise<{ ok: boolean; error?: string; awardedPoints?: number }> {
  try {
    const student = await requireStudentAction();

    const survey = await db.dataRequest.findUnique({
      where: { id: surveyId },
      select: { id: true, title: true, status: true, deadline: true },
    });

    if (!survey) {
      return { ok: false, error: "الاستبيان غير موجود" };
    }

    if (survey.status !== "OPEN") {
      return { ok: false, error: "هذا الاستبيان مغلق حالياً ولا يقبل إجابات جديدة" };
    }

    if (survey.deadline && new Date() > new Date(survey.deadline)) {
      return { ok: false, error: "انتهى الموعد النهائي للمشاركة في هذا الاستبيان" };
    }

    // فحص ما إذا كان قد صوت من قبل
    const existing = await db.dataResponse.findUnique({
      where: {
        requestId_userId: {
          requestId: surveyId,
          userId: student.id,
        },
      },
    });

    await db.dataResponse.upsert({
      where: {
        requestId_userId: {
          requestId: surveyId,
          userId: student.id,
        },
      },
      create: {
        requestId: surveyId,
        userId: student.id,
        answers: JSON.stringify(answers),
      },
      update: {
        answers: JSON.stringify(answers),
      },
    });

    let awardedPoints = 0;
    if (!existing) {
      // منح 15 نقطة تشجيعية للمشاركة لأول مرة
      const seasonId = await stampSeasonId();
      await db.pointEvent.create({
        data: {
          userId: student.id,
          points: 15,
          reason: `المشاركة في استبيان: ${survey.title}`,
          ruleAction: "COMMUNITY_SURVEY",
          seasonId,
        },
      });
      awardedPoints = 15;
    }

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    revalidatePath(`/admin/surveys/${surveyId}`);

    return { ok: true, awardedPoints };
  } catch (err: any) {
    console.error("submitSurveyVote error:", err);
    return { ok: false, error: err.message || "حدث خطأ أثناء حفظ تصويتك" };
  }
}

// ─── 2. إنشاء استبيان جديد (لوحة الإدارة) ─────────────────────────
export async function createSurvey(
  input: CreateSurveyInput
): Promise<{ ok: boolean; error?: string; surveyId?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");

    if (!input.title?.trim()) {
      return { ok: false, error: "عنوان الاستبيان مطلوب" };
    }

    if (!input.questions || input.questions.length === 0) {
      return { ok: false, error: "يجب إضافة سؤال واحد على الأقل في الاستبيان" };
    }

    // تنقية وتجهيز الأسئلة
    const formattedFields = input.questions.map((q, idx) => ({
      id: q.id || `q_${idx + 1}`,
      type: q.type || "POLL_SINGLE",
      label: q.question.trim(),
      description: q.description?.trim() || null,
      options: q.options ? q.options.filter((o) => o.trim().length > 0) : [],
      required: q.required ?? true,
    }));

    const deadlineDate = input.deadline ? new Date(input.deadline) : null;

    const request = await db.dataRequest.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        fields: JSON.stringify(formattedFields),
        mandatory: false,
        status: "OPEN",
        target: input.target || "{}",
        deadline: deadlineDate,
        createdById: admin.id,
      },
    });

    // إذا تم تحديد نشره في المجتمع
    if (input.postToCommunity) {
      await db.communityPost.create({
        data: {
          type: "SURVEY",
          title: input.title.trim(),
          body:
            input.description?.trim() ||
            "شاركونا آراءكم ومقترحاتكم في هذا الاستبيان الهام للمساعدة في اتخاذ القرارات وتطوير أنشطة اللجنة! 📊💡",
          imageUrl: input.bannerUrl?.trim() || null,
          links: JSON.stringify([{ label: "DATA_REQUEST", url: request.id }]),
          status: "PUBLISHED",
          pinned: false,
          createdById: admin.id,
        },
      });
    }

    await logAudit({
      actor: admin,
      action: "SURVEY_CREATED",
      entity: "DATA_REQUEST",
      entityId: request.id,
      summary: `إنشاء استبيان: ${request.title}`,
      after: { title: request.title, questionsCount: formattedFields.length },
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    return { ok: true, surveyId: request.id };
  } catch (err: any) {
    console.error("createSurvey error:", err);
    return { ok: false, error: err.message || "فشل إنشاء الاستبيان" };
  }
}

// ─── 3. تحليلات الاستبيان واتخاذ القرارات الذكية ─────────────────
export interface OptionStat {
  option: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  id: string;
  type: SurveyQuestionType;
  question: string;
  totalAnswers: number;
  optionsStats: OptionStat[];
  averageRating?: number;
  ratingBreakdown?: { star: number; count: number; percentage: number }[];
  textAnswers?: { answer: string; studentName: string; grade?: string; date: string }[];
  leadingOption?: string;
}

export interface DemographicBreakdown {
  label: string;
  count: number;
  percentage: number;
}

export interface StrategicDecisionRecommendation {
  type: "DECISIVE_WINNER" | "CLOSE_CALL" | "HIGH_SATISFACTION" | "NEEDS_IMPROVEMENT" | "DEMOGRAPHIC_VARIANCE" | "GENERAL";
  severity: "SUCCESS" | "WARNING" | "INFO";
  title: string;
  summary: string;
  actionableDecision: string;
}

export interface SurveyAnalyticsResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  deadline: string | null;
  totalResponses: number;
  questionsAnalytics: QuestionAnalytics[];
  demographics: {
    byGrade: DemographicBreakdown[];
    bySection: DemographicBreakdown[];
    byGender: DemographicBreakdown[];
  };
  recommendations: StrategicDecisionRecommendation[];
}

export async function getSurveyAnalytics(surveyId: string): Promise<SurveyAnalyticsResult | null> {
  const survey = await db.dataRequest.findUnique({
    where: { id: surveyId },
    include: {
      responses: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!survey) return null;

  let fields: any[] = [];
  try {
    fields = JSON.parse(survey.fields);
  } catch {
    fields = [];
  }

  const totalResponses = survey.responses.length;

  // تفكيك الإجابات
  const parsedResponses = survey.responses.map((r) => {
    let answers: Record<string, any> = {};
    try {
      answers = JSON.parse(r.answers);
    } catch {
      answers = {};
    }
    return {
      userId: r.userId,
      studentName: r.user.profile?.fullName || r.user.displayName || "طالب",
      grade: r.user.profile?.grade || "UNKNOWN",
      section: r.user.profile?.section || "UNKNOWN",
      gender: r.user.profile?.gender || "UNKNOWN",
      submittedAt: r.submittedAt,
      answers,
    };
  });

  // 1. تحليلات كل سؤال
  const questionsAnalytics: QuestionAnalytics[] = fields.map((field) => {
    const qId = field.id;
    const qType: SurveyQuestionType = field.type || "POLL_SINGLE";
    const qTitle = field.label || field.question || "سؤال";
    const options: string[] = field.options || [];

    let totalAnswers = 0;
    const optionCounts: Record<string, number> = {};
    options.forEach((opt) => (optionCounts[opt] = 0));

    let ratingSum = 0;
    let ratingCount = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const textAnswersList: { answer: string; studentName: string; grade?: string; date: string }[] = [];

    parsedResponses.forEach((resp) => {
      const val = resp.answers[qId];
      if (val === undefined || val === null || val === "") return;

      totalAnswers++;

      if (qType === "POLL_SINGLE") {
        const strVal = String(val).trim();
        optionCounts[strVal] = (optionCounts[strVal] || 0) + 1;
      } else if (qType === "POLL_MULTI") {
        const arr = Array.isArray(val) ? val : [val];
        arr.forEach((item: string) => {
          const strItem = String(item).trim();
          optionCounts[strItem] = (optionCounts[strItem] || 0) + 1;
        });
      } else if (qType === "RATING") {
        const num = Number(val);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          ratingSum += num;
          ratingCount++;
          ratingDistribution[num] = (ratingDistribution[num] || 0) + 1;
        }
      } else if (qType === "TEXT") {
        textAnswersList.push({
          answer: String(val),
          studentName: resp.studentName,
          grade: GRADE_LABELS[resp.grade] || resp.grade,
          date: new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(resp.submittedAt),
        });
      }
    });

    const optionsStats: OptionStat[] = Object.entries(optionCounts).map(([opt, cnt]) => ({
      option: opt,
      count: cnt,
      percentage: totalAnswers > 0 ? Math.round((cnt / totalAnswers) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const leadingOption = optionsStats.length > 0 && optionsStats[0].count > 0 ? optionsStats[0].option : undefined;

    let averageRating: number | undefined = undefined;
    let ratingBreakdown: { star: number; count: number; percentage: number }[] | undefined = undefined;

    if (qType === "RATING") {
      averageRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
      ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: ratingDistribution[star] || 0,
        percentage: ratingCount > 0 ? Math.round(((ratingDistribution[star] || 0) / ratingCount) * 100) : 0,
      }));
    }

    return {
      id: qId,
      type: qType,
      question: qTitle,
      totalAnswers,
      optionsStats,
      averageRating,
      ratingBreakdown,
      textAnswers: textAnswersList.slice(0, 30),
      leadingOption,
    };
  });

  // 2. التحليل الديموغرافي
  const gradeCounts: Record<string, number> = {};
  const sectionCounts: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};

  parsedResponses.forEach((r) => {
    gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1;
    sectionCounts[r.section] = (sectionCounts[r.section] || 0) + 1;
    genderCounts[r.gender] = (genderCounts[r.gender] || 0) + 1;
  });

  const byGrade: DemographicBreakdown[] = Object.entries(gradeCounts).map(([key, count]) => ({
    label: GRADE_LABELS[key] || (key === "UNKNOWN" ? "غير محدد" : key),
    count,
    percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  const bySection: DemographicBreakdown[] = Object.entries(sectionCounts).map(([key, count]) => ({
    label: SECTION_LABELS[key] || (key === "UNKNOWN" ? "غير محدد" : key),
    count,
    percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  const byGender: DemographicBreakdown[] = Object.entries(genderCounts).map(([key, count]) => ({
    label: GENDER_LABELS[key] || (key === "UNKNOWN" ? "غير محدد" : key),
    count,
    percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // 3. 🤖 محرك اتخاذ القرار والتوصيات الاستراتيجية الذكية
  const recommendations: StrategicDecisionRecommendation[] = [];

  questionsAnalytics.forEach((qa) => {
    if ((qa.type === "POLL_SINGLE" || qa.type === "POLL_MULTI") && qa.optionsStats.length > 1 && qa.totalAnswers >= 3) {
      const first = qa.optionsStats[0];
      const second = qa.optionsStats[1];

      if (first && first.percentage >= 50 && first.percentage - (second?.percentage || 0) >= 15) {
        recommendations.push({
          type: "DECISIVE_WINNER",
          severity: "SUCCESS",
          title: `حسم إحصائي في: "${qa.question}"`,
          summary: `حصل الخيار «${first.option}» على أغلبية ساحقة بنسبة ${first.percentage}% من الأصوات (${first.count} صوتًا).`,
          actionableDecision: `نوصي باعتماد «${first.option}» فوراً كقرار نهائي وتوجيه الموارد لتنفيذه بما يطابق رغبة الأغلبية.`,
        });
      } else if (first && second && Math.abs(first.percentage - second.percentage) <= 10) {
        recommendations.push({
          type: "CLOSE_CALL",
          severity: "WARNING",
          title: `تقارب وتنافس شديد في: "${qa.question}"`,
          summary: `النتائج متقاربة جداً بين «${first.option}» (${first.percentage}%) و «${second.option}» (${second.percentage}%).`,
          actionableDecision: `لا ننصح باختيار أحدهما وإلغاء الآخر؛ يُوصى بتوفير الخيارين في فترتين مختلفتين، أو عقد جولة تصويت مصغرة لحسم الاختيار.`,
        });
      }
    }

    if (qa.type === "RATING" && qa.averageRating !== undefined && qa.totalAnswers >= 3) {
      if (qa.averageRating >= 4.0) {
        recommendations.push({
          type: "HIGH_SATISFACTION",
          severity: "SUCCESS",
          title: `مؤشر رضا مرتفع (${qa.averageRating} / 5) في: "${qa.question}"`,
          summary: `قيّم الطلاب التجربة بتقييم ممتاز بمتوسط ${qa.averageRating} من 5 نجوم.`,
          actionableDecision: `استمرار العمل بنفس الخطة والمعايير الحالية وتوثيق عوامل النجاح لتكرارها في الفعاليات القادمة.`,
        });
      } else if (qa.averageRating < 3.2) {
        recommendations.push({
          type: "NEEDS_IMPROVEMENT",
          severity: "WARNING",
          title: `تنبيه: مؤشر الرضا منخفض (${qa.averageRating} / 5) في: "${qa.question}"`,
          summary: `حصل هذا السؤال على تقييم دون المتوسط (${qa.averageRating} من 5).`,
          actionableDecision: `مراجعة الملاحظات النصية فوراً، والتواصل مع الفئات غير الراضية لمعالجة نقاط الخلل وتحسين الخدمة.`,
        });
      }
    }
  });

  // توصية المشاركة الديموغرافية
  if (byGrade.length > 0 && totalResponses >= 5) {
    const topGrade = byGrade[0];
    recommendations.push({
      type: "DEMOGRAPHIC_VARIANCE",
      severity: "INFO",
      title: `الفرقة الأكثر تفاعلاً: ${topGrade.label}`,
      summary: `شكلت ${topGrade.label} نسبة ${topGrade.percentage}% من إجمالي المصوتين (${topGrade.count} طالب).`,
      actionableDecision: `مراعاة جدول ومواعيد ${topGrade.label} في الأنشطة المرتبطة بهذا الاستبيان لتحقيق أعلى نسبة استفادة.`,
    });
  }

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    status: survey.status,
    createdAt: survey.createdAt.toISOString(),
    deadline: survey.deadline ? survey.deadline.toISOString() : null,
    totalResponses,
    questionsAnalytics,
    demographics: {
      byGrade,
      bySection,
      byGender,
    },
    recommendations,
  };
}

// ─── 4. تبديل حالة الاستبيان (فتح / إغلاق) ───────────────────────
export async function toggleSurveyStatus(
  surveyId: string,
  newStatus: "OPEN" | "CLOSED"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");
    await db.dataRequest.update({
      where: { id: surveyId },
      data: { status: newStatus },
    });

    await logAudit({
      actor: admin,
      action: "SURVEY_STATUS_UPDATED",
      entity: "DATA_REQUEST",
      entityId: surveyId,
      summary: `تغيير حالة الاستبيان إلى ${newStatus}`,
      after: { status: newStatus },
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    revalidatePath(`/admin/surveys/${surveyId}`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "فشل تعديل حالة الاستبيان" };
  }
}

// ─── 5. حذف استبيان ──────────────────────────────────────────────
export async function deleteSurvey(surveyId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");

    // حذف أي منشورات مجتمع مرتبطة به
    const posts = await db.communityPost.findMany({
      where: {
        links: { contains: surveyId },
      },
    });

    for (const p of posts) {
      await db.communityPost.delete({ where: { id: p.id } });
    }

    await db.dataRequest.delete({
      where: { id: surveyId },
    });

    await logAudit({
      actor: admin,
      action: "SURVEY_DELETED",
      entity: "DATA_REQUEST",
      entityId: surveyId,
      summary: `حذف الاستبيان والمنشورات المرتبطة به`,
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "فشل حذف الاستبيان" };
  }
}
