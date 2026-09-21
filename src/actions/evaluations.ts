"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات التقييم السري اللحظي للورش والمحاضرين
//  ملاحظات مشفرة وتظهر فقط للإدارة والدكتورة المشرفة لدعم اتخاذ القرار
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStudentAction, requireActionUser, getCurrentUser } from "@/lib/auth";
import { MODULES } from "@/lib/permissions";
import { round } from "@/lib/analytics/statistics-engine";

export interface SubmitEvaluationInput {
  sessionId: string;
  instructorRating: number;   // 1 - 5
  contentRating: number;      // 1 - 5
  organizationRating: number; // 1 - 5
  recommendScore?: number;    // 1 - 10
  privateFeedback?: string;   // ملاحظات سرية حرة
  strengths?: string;
  improvements?: string;
}

/**
 * إرسال تقييم سري لجلسة/ورشة حضرها الطالب
 */
export async function submitSessionEvaluation(input: SubmitEvaluationInput) {
  const user = await requireStudentAction();

  // التحقق من القيم المدخلة
  const inst = Math.min(Math.max(Number(input.instructorRating) || 5, 1), 5);
  const cont = Math.min(Math.max(Number(input.contentRating) || 5, 1), 5);
  const org = Math.min(Math.max(Number(input.organizationRating) || 5, 1), 5);
  const rec = input.recommendScore ? Math.min(Math.max(Number(input.recommendScore), 1), 10) : null;
  const overall = round((inst + cont + org) / 3, 1);

  // التحقق من وجود الجلسة
  const session = await db.session.findUnique({
    where: { id: input.sessionId },
    select: { id: true, title: true, activityId: true },
  });
  if (!session) {
    throw new Error("الجلسة المطلوبة غير موجودة");
  }

  // التحقق من أن الطالب مسجل في الجلسة أو حضرها
  const registration = await db.registration.findUnique({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: user.id,
      },
    },
  });

  if (!registration) {
    throw new Error("يمكن فقط للطلاب المسجلين في هذه الجلسة تقديم التقييم");
  }

  // حفظ أو تحديث التقييم
  const evaluation = await db.sessionEvaluation.upsert({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: user.id,
      },
    },
    create: {
      sessionId: input.sessionId,
      userId: user.id,
      instructorRating: inst,
      contentRating: cont,
      organizationRating: org,
      overallRating: overall,
      recommendScore: rec,
      privateFeedback: input.privateFeedback?.trim() || null,
      strengths: input.strengths?.trim() || null,
      improvements: input.improvements?.trim() || null,
    },
    update: {
      instructorRating: inst,
      contentRating: cont,
      organizationRating: org,
      overallRating: overall,
      recommendScore: rec,
      privateFeedback: input.privateFeedback?.trim() || null,
      strengths: input.strengths?.trim() || null,
      improvements: input.improvements?.trim() || null,
    },
  });

  // منح نقاط تشجيعية للطالب على مساهمته في تحسين الجودة (+5 نقاط)
  try {
    const existingBonus = await db.pointEvent.findFirst({
      where: {
        userId: user.id,
        sessionId: input.sessionId,
        ruleAction: "SESSION_EVALUATION_BONUS",
      },
    });

    if (!existingBonus) {
      const { stampSeasonId } = await import("@/lib/progress");
      const seasonId = await stampSeasonId();
      await db.pointEvent.create({
        data: {
          userId: user.id,
          points: 5,
          reason: `مكافأة المشاركة في التقييم السري لجلسة ${session.title}`,
          ruleAction: "SESSION_EVALUATION_BONUS",
          sessionId: input.sessionId,
          seasonId,
        },
      });
    }
  } catch (bonusErr) {
    console.warn("Could not award evaluation bonus points:", bonusErr);
  }

  revalidatePath(`/admin/analytics/workshops`);
  revalidatePath(`/admin/analytics`);
  revalidatePath(`/sessions/${input.sessionId}`);

  return {
    success: true,
    evaluationId: evaluation.id,
    message: "شكراً لك! تم استلام تقييمك وملاحظاتك بسرية تامة وتوجيهها لإدارة اللجنة لتطوير جودة الورش.",
  };
}

/**
 * جلب تقييم الطالب للجلسة الحالية إن وجد
 */
export async function getStudentEvaluation(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  return db.sessionEvaluation.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId: user.id,
      },
    },
    select: {
      id: true,
      instructorRating: true,
      contentRating: true,
      organizationRating: true,
      overallRating: true,
      recommendScore: true,
      privateFeedback: true,
      strengths: true,
      improvements: true,
      createdAt: true,
    },
  });
}
