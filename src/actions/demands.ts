"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات استطلاعات رغبات وتوجهات الطلاب (Demand Wishlist & Polling)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStudentAction, requireActionUser, getCurrentUser } from "@/lib/auth";
import { MODULES } from "@/lib/permissions";

export interface DemandPollOption {
  id: string;
  label: string;
}

/**
 * جلب جميع الاستطلاعات مع نتائجها
 */
export async function getDemandPolls() {
  const user = await getCurrentUser();

  const polls = await db.demandPoll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      votes: {
        select: {
          id: true,
          userId: true,
          optionId: true,
          customSuggestion: true,
          createdAt: true,
        },
      },
    },
  });

  return polls.map((poll) => {
    let optionsList: DemandPollOption[] = [];
    try {
      optionsList = JSON.parse(poll.options);
    } catch {
      optionsList = [];
    }

    const totalVotes = poll.votes.length;
    const optionCounts: Record<string, number> = {};
    for (const vote of poll.votes) {
      optionCounts[vote.optionId] = (optionCounts[vote.optionId] || 0) + 1;
    }

    const userVote = user ? poll.votes.find((v) => v.userId === user.id) : null;

    const enrichedOptions = optionsList.map((opt) => {
      const count = optionCounts[opt.id] || 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        ...opt,
        votesCount: count,
        percentage,
      };
    });

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      targetGrade: poll.targetGrade,
      targetSection: poll.targetSection,
      totalVotes,
      options: enrichedOptions,
      hasVoted: Boolean(userVote),
      userSelectedOptionId: userVote?.optionId || null,
      suggestions: poll.votes.map((v) => v.customSuggestion).filter(Boolean) as string[],
      createdAt: poll.createdAt,
    };
  });
}

/**
 * تصويت الطالب على خيار في الاستطلاع
 */
export async function voteDemandPoll(pollId: string, optionId: string, customSuggestion?: string) {
  const user = await requireStudentAction();

  const poll = await db.demandPoll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("الاستطلاع غير موجود");
  if (poll.status !== "ACTIVE") throw new Error("هذا الاستطلاع مغلق حالياً");

  await db.demandPollVote.upsert({
    where: {
      pollId_userId: {
        pollId,
        userId: user.id,
      },
    },
    create: {
      pollId,
      userId: user.id,
      optionId,
      customSuggestion: customSuggestion?.trim() || null,
    },
    update: {
      optionId,
      customSuggestion: customSuggestion?.trim() || null,
    },
  });

  revalidatePath("/admin/analytics/demands");
  revalidatePath("/welcome");
  return { success: true, message: "تم تسجيل تصويتكم بنجاح" };
}

/**
 * إنشاء استطلاع رغبات جديد (إداري)
 */
export async function createDemandPoll(input: {
  title: string;
  description?: string;
  options: { id: string; label: string }[];
  targetGrade?: string;
  targetSection?: string;
}) {
  await requireActionUser(MODULES.DASHBOARD, "manage");

  if (!input.title?.trim()) throw new Error("عنوان الاستطلاع مطلوب");
  if (!input.options || input.options.length < 2) throw new Error("يجب توفير خيارين على الأقل للتصويت");

  const created = await db.demandPoll.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      options: JSON.stringify(input.options),
      targetGrade: input.targetGrade || "ALL",
      targetSection: input.targetSection || "ALL",
      status: "ACTIVE",
    },
  });

  revalidatePath("/admin/analytics/demands");
  return { success: true, pollId: created.id };
}

/**
 * إغلاق أو إعادة فتح الاستطلاع (إداري)
 */
export async function toggleDemandPollStatus(pollId: string) {
  await requireActionUser(MODULES.DASHBOARD, "manage");

  const poll = await db.demandPoll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("الاستطلاع غير موجود");

  const newStatus = poll.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
  await db.demandPoll.update({
    where: { id: pollId },
    data: { status: newStatus },
  });

  revalidatePath("/admin/analytics/demands");
  return { success: true, status: newStatus };
}
