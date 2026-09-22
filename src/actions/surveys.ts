"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireActionUser, getCurrentUser } from "@/lib/auth";
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
  allowOther?: boolean;
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
  pinned?: boolean;
}

export interface UpdateSurveyInput {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  deadline?: string | null;
  status?: string;
  pinned?: boolean;
}

// ─── 1. تصويت المستخدم في الاستبيان ───────────────────────────────
export async function submitSurveyVote(
  surveyId: string,
  answers: Record<string, string | string[]>
): Promise<{ ok: boolean; error?: string; awardedPoints?: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: "يرجى تسجيل الدخول أولاً للمشاركة في الاستبيان" };
    }

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
          userId: user.id,
        },
      },
    });

    await db.dataResponse.upsert({
      where: {
        requestId_userId: {
          requestId: surveyId,
          userId: user.id,
        },
      },
      create: {
        requestId: surveyId,
        userId: user.id,
        answers: JSON.stringify(answers),
      },
      update: {
        answers: JSON.stringify(answers),
      },
    });

    let awardedPoints = 0;
    if (!existing && user.role === "STUDENT") {
      // منح 15 نقطة تشجيعية للطلاب عند المشاركة لأول مرة
      const seasonId = await stampSeasonId();
      await db.pointEvent.create({
        data: {
          userId: user.id,
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
      allowOther: q.allowOther ?? false,
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
          pinned: input.pinned ?? false,
          lockedComments: true, // الاستبيان الرسمي تصويت فقط بدون تعليقات
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
      after: { title: request.title, questionsCount: formattedFields.length, pinned: input.pinned },
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    return { ok: true, surveyId: request.id };
  } catch (err: any) {
    console.error("createSurvey error:", err);
    return { ok: false, error: err.message || "فشل إنشاء الاستبيان" };
  }
}

// ─── 2.1 تعديل استبيان قائم ──────────────────────────────────────
export async function updateSurvey(
  input: UpdateSurveyInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");

    if (!input.title?.trim()) {
      return { ok: false, error: "عنوان الاستبيان مطلوب" };
    }

    if (!input.questions || input.questions.length === 0) {
      return { ok: false, error: "يجب إضافة سؤال واحد على الأقل" };
    }

    const formattedFields = input.questions.map((q, idx) => ({
      id: q.id || `q_${idx + 1}`,
      type: q.type || "POLL_SINGLE",
      label: q.question.trim(),
      description: q.description?.trim() || null,
      options: q.options ? q.options.filter((o) => o.trim().length > 0) : [],
      allowOther: q.allowOther ?? false,
      required: true,
    }));

    const deadlineDate = input.deadline ? new Date(input.deadline) : null;

    await db.dataRequest.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        fields: JSON.stringify(formattedFields),
        deadline: deadlineDate,
        ...(input.status ? { status: input.status } : {}),
      },
    });

    // تحديث أي منشور مجتمع مرتبط به
    const linkedPosts = await db.communityPost.findMany({
      where: { links: { contains: input.id } },
    });

    for (const p of linkedPosts) {
      await db.communityPost.update({
        where: { id: p.id },
        data: {
          title: input.title.trim(),
          body: input.description?.trim() || p.body,
          ...(typeof input.pinned === "boolean" ? { pinned: input.pinned } : {}),
        },
      });
    }

    await logAudit({
      actor: admin,
      action: "SURVEY_UPDATED",
      entity: "DATA_REQUEST",
      entityId: input.id,
      summary: `تعديل استبيان: ${input.title}`,
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    revalidatePath(`/admin/surveys/${input.id}`);
    return { ok: true };
  } catch (err: any) {
    console.error("updateSurvey error:", err);
    return { ok: false, error: err.message || "فشل تعديل الاستبيان" };
  }
}

// ─── 2.2 تثبيت / إلغاء تثبيت الاستبيان في المجتمع ────────────────
export async function toggleSurveyPin(
  surveyId: string,
  pinned: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DATA_REQUESTS, "manage");

    const posts = await db.communityPost.findMany({
      where: { links: { contains: surveyId } },
    });

    if (posts.length === 0) {
      return { ok: false, error: "المنشور المرتبط بالاستبيان غير موجود في قسم المجتمع" };
    }

    for (const p of posts) {
      await db.communityPost.update({
        where: { id: p.id },
        data: { pinned },
      });
    }

    await logAudit({
      actor: admin,
      action: "SURVEY_PIN_TOGGLED",
      entity: "COMMUNITY_POST",
      entityId: posts[0].id,
      summary: `${pinned ? "تثبيت" : "إلغاء تثبيت"} استبيان «${posts[0].title}» في المجتمع`,
    });

    revalidatePath("/community");
    revalidatePath("/admin/surveys");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "فشل تغيير حالة التثبيت" };
  }
}

// ─── 3. تحليلات الاستبيان واتخاذ القرارات الذكية ─────────────────
export interface VoterInfo {
  userId: string;
  studentName: string;
  email: string;
  phone: string;
  studentCode: string;
  grade: string;
  gradeLabel: string;
  section: string;
  sectionLabel: string;
  gender: string;
  genderLabel: string;
  submittedAt: string;
  customText?: string;
}

export interface OptionStat {
  option: string;
  count: number;
  percentage: number;
  voters: VoterInfo[];
  isOther?: boolean;
}

export interface QuestionAnalytics {
  id: string;
  type: SurveyQuestionType;
  question: string;
  description?: string | null;
  allowOther?: boolean;
  totalAnswers: number;
  optionsStats: OptionStat[];
  otherAnswers?: { text: string; voter: VoterInfo }[];
  averageRating?: number;
  ratingBreakdown?: { star: number; count: number; percentage: number; voters: VoterInfo[] }[];
  textAnswers?: { answer: string; voter: VoterInfo }[];
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

export interface FullSurveyResponseRow {
  userId: string;
  studentName: string;
  email: string;
  phone: string;
  studentCode: string;
  grade: string;
  section: string;
  gender: string;
  submittedAt: string;
  answers: Record<string, any>;
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
  rawResponses: FullSurveyResponseRow[];
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

  // تفكيك الإجابات وبيانات الطلاب
  const parsedResponses = survey.responses.map((r) => {
    let answers: Record<string, any> = {};
    try {
      answers = JSON.parse(r.answers);
    } catch {
      answers = {};
    }

    const prof = r.user.profile;
    const gradeKey = prof?.grade || "UNKNOWN";
    const sectionKey = prof?.section || "UNKNOWN";
    const genderKey = prof?.gender || "UNKNOWN";

    return {
      userId: r.userId,
      studentName: prof?.fullName || r.user.displayName || r.user.email,
      email: r.user.email,
      phone: prof?.phone || "غير مسجل",
      studentCode: prof?.studentCode || "—",
      grade: gradeKey,
      gradeLabel: GRADE_LABELS[gradeKey] || (gradeKey === "UNKNOWN" ? "غير محدد" : gradeKey),
      section: sectionKey,
      sectionLabel: SECTION_LABELS[sectionKey] || (sectionKey === "UNKNOWN" ? "غير محدد" : sectionKey),
      gender: genderKey,
      genderLabel: GENDER_LABELS[genderKey] || (genderKey === "UNKNOWN" ? "غير محدد" : genderKey),
      submittedAt: r.submittedAt,
      answers,
    };
  });

  // 1. تحليلات كل سؤال مع كشف دقيق لكل من صوّت
  const questionsAnalytics: QuestionAnalytics[] = fields.map((field) => {
    const qId = field.id;
    const qType: SurveyQuestionType = field.type || "POLL_SINGLE";
    const qTitle = field.label || field.question || "سؤال";
    const options: string[] = field.options || [];
    const allowOther = !!field.allowOther;

    let totalAnswers = 0;
    const optionCounts: Record<string, number> = {};
    const optionVoters: Record<string, VoterInfo[]> = {};
    options.forEach((opt) => {
      optionCounts[opt] = 0;
      optionVoters[opt] = [];
    });

    const otherAnswersList: { text: string; voter: VoterInfo }[] = [];
    let ratingSum = 0;
    let ratingCount = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const ratingVoters: Record<number, VoterInfo[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const textAnswersList: { answer: string; voter: VoterInfo }[] = [];

    parsedResponses.forEach((resp) => {
      const val = resp.answers[qId];
      if (val === undefined || val === null || val === "") return;

      totalAnswers++;

      const voter: VoterInfo = {
        userId: resp.userId,
        studentName: resp.studentName,
        email: resp.email,
        phone: resp.phone,
        studentCode: resp.studentCode,
        grade: resp.grade,
        gradeLabel: resp.gradeLabel,
        section: resp.section,
        sectionLabel: resp.sectionLabel,
        gender: resp.gender,
        genderLabel: resp.genderLabel,
        submittedAt: resp.submittedAt.toISOString(),
      };

      const recordChoice = (v: string) => {
        const str = String(v).trim();
        if (str.startsWith("أخرى:") || str.startsWith("__OTHER__:") || str === "أخرى") {
          const custom = str.replace(/^(__OTHER__:|أخرى:\s*)/, "").trim();
          otherAnswersList.push({
            text: custom || "أخرى",
            voter: { ...voter, customText: custom || undefined },
          });
        } else if (optionCounts[str] !== undefined) {
          optionCounts[str] = (optionCounts[str] || 0) + 1;
          optionVoters[str].push(voter);
        } else {
          otherAnswersList.push({
            text: str,
            voter: { ...voter, customText: str },
          });
        }
      };

      if (qType === "POLL_SINGLE") {
        recordChoice(String(val));
      } else if (qType === "POLL_MULTI") {
        const arr = Array.isArray(val) ? val : [val];
        arr.forEach(recordChoice);
      } else if (qType === "RATING") {
        const num = Number(val);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          ratingSum += num;
          ratingCount++;
          ratingDistribution[num] = (ratingDistribution[num] || 0) + 1;
          ratingVoters[num].push(voter);
        }
      } else if (qType === "TEXT") {
        textAnswersList.push({
          answer: String(val),
          voter,
        });
      }
    });

    const optionsStats: OptionStat[] = options.map((opt) => ({
      option: opt,
      count: optionCounts[opt] || 0,
      percentage: totalAnswers > 0 ? Math.round(((optionCounts[opt] || 0) / totalAnswers) * 100) : 0,
      voters: optionVoters[opt] || [],
      isOther: false,
    }));

    if (otherAnswersList.length > 0) {
      optionsStats.push({
        option: "أخرى (مقترحات مخصصة)",
        count: otherAnswersList.length,
        percentage: totalAnswers > 0 ? Math.round((otherAnswersList.length / totalAnswers) * 100) : 0,
        voters: otherAnswersList.map((oa) => oa.voter),
        isOther: true,
      });
    }

    optionsStats.sort((a, b) => b.count - a.count);

    const leadingOption = optionsStats.length > 0 && optionsStats[0].count > 0 ? optionsStats[0].option : undefined;

    let averageRating: number | undefined = undefined;
    let ratingBreakdown: { star: number; count: number; percentage: number; voters: VoterInfo[] }[] | undefined = undefined;

    if (qType === "RATING") {
      averageRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
      ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: ratingDistribution[star] || 0,
        percentage: ratingCount > 0 ? Math.round(((ratingDistribution[star] || 0) / ratingCount) * 100) : 0,
        voters: ratingVoters[star] || [],
      }));
    }

    return {
      id: qId,
      type: qType,
      question: qTitle,
      description: field.description || null,
      allowOther,
      totalAnswers,
      optionsStats,
      otherAnswers: otherAnswersList,
      averageRating,
      ratingBreakdown,
      textAnswers: textAnswersList,
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

  // كشف الاستجابات الكامل للإكسيل والجداول
  const rawResponses: FullSurveyResponseRow[] = parsedResponses.map((r) => ({
    userId: r.userId,
    studentName: r.studentName,
    email: r.email,
    phone: r.phone,
    studentCode: r.studentCode,
    grade: r.gradeLabel,
    section: r.sectionLabel,
    gender: r.genderLabel,
    submittedAt: r.submittedAt.toISOString(),
    answers: r.answers,
  }));

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
    rawResponses,
  };
}

// ─── 3.1 جلب تفاصيل الاستبيان للصفحة المستقلة (/surveys/[id]) ───
export async function getSurveyDetails(surveyId: string) {
  try {
    const user = await getCurrentUser();
    const survey = await db.dataRequest.findUnique({
      where: { id: surveyId },
      include: {
        _count: { select: { responses: true } },
      },
    });

    if (!survey) return null;

    let fields: any[] = [];
    try {
      fields = JSON.parse(survey.fields);
    } catch {
      fields = [];
    }

    let userResponse: Record<string, any> | null = null;
    if (user) {
      const resp = await db.dataResponse.findUnique({
        where: {
          requestId_userId: {
            requestId: surveyId,
            userId: user.id,
          },
        },
      });
      if (resp) {
        try {
          userResponse = JSON.parse(resp.answers);
        } catch {
          userResponse = {};
        }
      }
    }

    // جلب الإحصائيات لعرض نتائج التصويت الفورية
    const allResponses = await db.dataResponse.findMany({
      where: { requestId: surveyId },
      select: { answers: true },
    });

    const questionsWithStats = fields.map((f, idx) => {
      const qId = f.id || `q_${idx + 1}`;
      const qType: SurveyQuestionType = f.type || "POLL_SINGLE";
      const options: string[] = Array.isArray(f.options) ? f.options : [];
      const allowOther = !!f.allowOther;

      const counts: Record<string, number> = {};
      options.forEach((opt) => (counts[opt] = 0));
      if (allowOther) counts["أخرى"] = 0;

      let totalAnswers = 0;

      allResponses.forEach((r) => {
        try {
          const ans = JSON.parse(r.answers);
          const val = ans[qId];
          if (val === undefined || val === null || val === "") return;
          totalAnswers++;

          const checkVal = (v: string) => {
            const trimmed = String(v).trim();
            if (trimmed.startsWith("أخرى:") || trimmed.startsWith("__OTHER__:") || trimmed === "أخرى") {
              counts["أخرى"] = (counts["أخرى"] || 0) + 1;
            } else if (counts[trimmed] !== undefined) {
              counts[trimmed] = (counts[trimmed] || 0) + 1;
            } else {
              counts[trimmed] = (counts[trimmed] || 0) + 1;
            }
          };

          if (Array.isArray(val)) {
            val.forEach(checkVal);
          } else {
            checkVal(val);
          }
        } catch {}
      });

      const optionsStats = Object.entries(counts).map(([opt, cnt]) => ({
        option: opt,
        count: cnt,
        percentage: totalAnswers > 0 ? Math.round((cnt / totalAnswers) * 100) : 0,
        isOther: opt === "أخرى",
      }));

      return {
        id: qId,
        type: qType,
        question: f.label || f.question || "",
        description: f.description || null,
        options,
        allowOther,
        optionsStats,
        userAnswer: userResponse ? userResponse[qId] : undefined,
      };
    });

    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      deadline: survey.deadline ? survey.deadline.toISOString() : null,
      createdAt: survey.createdAt.toISOString(),
      totalVotes: survey._count.responses,
      hasVoted: !!userResponse,
      userResponse,
      questions: questionsWithStats,
      isLoggedIn: !!user,
      currentUserId: user?.id,
    };
  } catch (err) {
    console.error("getSurveyDetails error:", err);
    return null;
  }
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
