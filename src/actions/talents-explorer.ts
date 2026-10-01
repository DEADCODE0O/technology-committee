"use server";

// ═══════════════════════════════════════════════════════════════
//  مركز استكشاف وتحليل المواهب والرغبات الطلابية — خادم البيانات
//  • تحليل البيانات واتخاذ القرارات الإدارية للمسارات والورش
//  • فلترة دقيقة ومتعددة الأبعاد للطلاب وأصحاب المواهب
//  • جلب وتحديث حالة المواهب والتصدير
// ═══════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  TALENT_OPTIONS,
  talentLabel,
  JOIN_REASONS,
  JOIN_REASON_LABELS,
  GRADE_LABELS,
  SECTION_LABELS,
  GENDER_LABELS,
} from "@/lib/constants";
import { logAudit } from "@/lib/platform";

export type CategoryStat = {
  category: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
};

export type TopTalentStat = {
  category: string;
  name: string;
  label: string;
  count: number;
  percentage: number;
};

export type JoinReasonStat = {
  reason: string;
  label: string;
  count: number;
  percentage: number;
};

export type DemographicBreakdown = {
  byGrade: Record<string, number>;
  bySection: Record<string, number>;
  byGender: Record<string, number>;
};

export type StrategicInsight = {
  title: string;
  icon: string;
  type: "URGENT_DEMAND" | "CLUB_RECOMMENDATION" | "EVENT_OPPORTUNITY" | "TALENT_POOL";
  message: string;
  statBadge: string;
  category: string;
  talentName?: string;
};

export type TalentsAnalyticsSummary = {
  totalStudents: number;
  studentsWithTalentsCount: number;
  studentsWithTalentsPercentage: number;
  totalTalentsCount: number;
  categoriesBreakdown: CategoryStat[];
  topTalents: TopTalentStat[];
  joinReasonsBreakdown: JoinReasonStat[];
  demographics: DemographicBreakdown;
  strategicInsights: StrategicInsight[];
};

export type StudentTalentItem = {
  id: string;
  category: string;
  name: string;
  customName: string | null;
  label: string;
  description: string | null;
  portfolioUrl: string | null;
  status: string;
  featured: boolean;
  createdAt: string;
};

export type ExplorerStudentRow = {
  id: string;
  email: string;
  fullName: string;
  grade: string;
  gradeLabel: string;
  section: string;
  sectionLabel: string;
  gender: string;
  genderLabel: string;
  phone: string;
  studentCode: string | null;
  avatarUrl: string | null;
  avatarFrameId: string | null;
  discoverySource: string | null;
  joinReasons: string[];
  joinReasonsLabels: string[];
  talents: StudentTalentItem[];
  talentsCount: number;
  matchedTalent?: StudentTalentItem;
  createdAt: string;
};

export type TalentsFilterParams = {
  category?: string;
  talentName?: string;
  joinReason?: string;
  grade?: string;
  section?: string;
  gender?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

/**
 * جلب التحليلات الإحصائية الشاملة للمواهب والرغبات
 */
export async function getTalentsAnalytics(): Promise<TalentsAnalyticsSummary> {
  await requireAdmin(MODULES.TALENTS);

  const [totalStudents, allTalents, allProfiles] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.talent.findMany({
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                grade: true,
                section: true,
                gender: true,
              },
            },
          },
        },
      },
    }),
    db.studentProfile.findMany({
      select: {
        userId: true,
        joinReasons: true,
        grade: true,
        section: true,
        gender: true,
      },
    }),
  ]);

  const uniqueStudentIds = new Set<string>();
  const catCount: Record<string, number> = {};
  const talentNameCount: Record<string, { category: string; count: number; customName?: string } > = {};
  const byGrade: Record<string, number> = { FIRST: 0, SECOND: 0, THIRD: 0, FOURTH: 0 };
  const bySection: Record<string, number> = { IS: 0, COMMERCIAL: 0, TOURISM: 0, LANGS: 0 };
  const byGender: Record<string, number> = { MALE: 0, FEMALE: 0 };

  allTalents.forEach((t) => {
    if (t.userId) uniqueStudentIds.add(t.userId);

    // Categories
    catCount[t.category] = (catCount[t.category] || 0) + 1;

    // Names
    const key = `${t.category}:::${t.name}${t.customName ? `:::${t.customName}` : ""}`;
    if (!talentNameCount[key]) {
      talentNameCount[key] = { category: t.category, count: 0, customName: t.customName || undefined };
    }
    talentNameCount[key].count += 1;

    // Demographics
    const g = t.user?.profile?.grade;
    if (g && byGrade[g] !== undefined) byGrade[g] += 1;
    const s = t.user?.profile?.section;
    if (s && bySection[s] !== undefined) bySection[s] += 1;
    const gen = t.user?.profile?.gender;
    if (gen && byGender[gen] !== undefined) byGender[gen] += 1;
  });

  const totalTalentsCount = allTalents.length;
  const studentsWithTalentsCount = uniqueStudentIds.size;
  const studentsWithTalentsPercentage =
    totalStudents > 0 ? Math.round((studentsWithTalentsCount / totalStudents) * 100) : 0;

  // فئات المواهب مرتبة بالنسبة
  const categoriesBreakdown: CategoryStat[] = TALENT_CATEGORIES.map((c) => {
    const count = catCount[c.value] || 0;
    const percentage = totalTalentsCount > 0 ? Math.round((count / totalTalentsCount) * 100) : 0;
    return {
      category: c.value,
      label: c.label,
      icon: c.icon,
      count,
      percentage,
    };
  })
    .filter((c) => c.count > 0 || c.category !== "OTHER")
    .sort((a, b) => b.count - a.count);

  // المواهب الأعلى طلباً
  const topTalents: TopTalentStat[] = Object.entries(talentNameCount)
    .map(([key, data]) => {
      const parts = key.split(":::");
      const category = parts[0];
      const name = parts[1];
      const custom = parts[2] || undefined;
      const label = talentLabel(category, name, custom);
      const percentage =
        totalStudents > 0 ? Math.round((data.count / totalStudents) * 100) : 0;
      return {
        category,
        name,
        label,
        count: data.count,
        percentage,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // رغبات الانضمام وتطلعات الطلاب
  const reasonCountMap: Record<string, number> = {};
  allProfiles.forEach((p) => {
    if (!p.joinReasons) return;
    try {
      const arr = JSON.parse(p.joinReasons);
      if (Array.isArray(arr)) {
        arr.forEach((r) => {
          const val = typeof r === "string" ? r.split(":")[0] : "";
          if (val) {
            reasonCountMap[val] = (reasonCountMap[val] || 0) + 1;
          }
        });
      }
    } catch {}
  });

  const joinReasonsBreakdown: JoinReasonStat[] = JOIN_REASONS.map((r) => {
    const count = reasonCountMap[r.value] || 0;
    const percentage =
      totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
    return {
      reason: r.value,
      label: r.label,
      count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count);

  // توصيات ذكية لصناع القرار
  const strategicInsights: StrategicInsight[] = [];

  // إحصائية التكنولوجيا والبرمجة
  const techTalentsCount = catCount["COURSES_TECH"] || 0;
  if (techTalentsCount > 0) {
    strategicInsights.push({
      title: "أولوية قصوى لورش الذكاء الاصطناعي والبرمجة",
      icon: "💻",
      type: "URGENT_DEMAND",
      message: `تم رصد ${techTalentsCount} طالباً متجهين للتكنولوجيا والكورسات البرمجية، متصدرين القائمة بالذكاء الاصطناعي والبرمجة. يُوصى فوراً بفتح مسارات تدريبية معتمدة على دفعتين لاستيعاب الإقبال.`,
      statBadge: `${techTalentsCount} طالب مهتم`,
      category: "COURSES_TECH",
    });
  }

  // إحصائية الرياضة
  const sportsCount = catCount["SPORTS"] || 0;
  if (sportsCount > 0) {
    strategicInsights.push({
      title: "جاهزية لتنظيم بطولات كرة القدم والسباحة",
      icon: "⚽",
      type: "EVENT_OPPORTUNITY",
      message: `يوجد ${sportsCount} طالباً مسجلين في الأنشطة الرياضية (خاصة كرة القدم والسباحة وبناء الأجسام). يمثل هؤلاء قاعدة جاهزة لبطولة المعهد الرياضية الرسمية.`,
      statBadge: `${sportsCount} رياضي مسجل`,
      category: "SPORTS",
    });
  }

  // إحصائية الفنون والميديا
  const mediaCount = (allTalents.filter(t => ["PHOTOGRAPHY", "VIDEO_EDITING", "DESIGN_GRAPHIC"].includes(t.name))).length;
  if (mediaCount > 0) {
    strategicInsights.push({
      title: "نواة فريق إعلام وصناع محتوى المعهد",
      icon: "📸",
      type: "CLUB_RECOMMENDATION",
      message: `تم رصد ${mediaCount} طالباً لديهم مهارات التصوير والمونتاج وتصميم الجرافيك. فرصة ذهبية لتشكيل وتدريب الفريق الإعلامي الرسمي للأنشطة والاتحاد.`,
      statBadge: `${mediaCount} صانع ميديا`,
      category: "COURSES_TECH",
    });
  }

  // إحصائية المسرح والأداء
  const theaterCount = catCount["PERFORMING_ARTS"] || 0;
  if (theaterCount > 0) {
    strategicInsights.push({
      title: "قاعدة موهوبة لفريق المسرح والإنشاد",
      icon: "🎭",
      type: "TALENT_POOL",
      message: `يتوفر ${theaterCount} طالباً في مجالات التمثيل، الإنشاد، والموسيقى، مؤهلين لبدء تجارب أداء مهرجان المسرح السنوي.`,
      statBadge: `${theaterCount} موهبة فنية`,
      category: "PERFORMING_ARTS",
    });
  }

  return {
    totalStudents,
    studentsWithTalentsCount,
    studentsWithTalentsPercentage,
    totalTalentsCount,
    categoriesBreakdown,
    topTalents,
    joinReasonsBreakdown,
    demographics: {
      byGrade,
      bySection,
      byGender,
    },
    strategicInsights,
  };
}

/**
 * جلب قائمة الطلاب المطابقين لشروط الفلترة المتقدمة
 */
export async function getFilteredTalentsStudents(
  params: TalentsFilterParams = {}
): Promise<{
  students: ExplorerStudentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await requireAdmin(MODULES.TALENTS);

  const {
    category = "ALL",
    talentName = "ALL",
    joinReason = "ALL",
    grade = "ALL",
    section = "ALL",
    gender = "ALL",
    status = "ALL",
    q = "",
    page = 1,
    pageSize = 25,
  } = params;

  // جلب كافة الطلاب مع ملفاتهم ومواهبهم
  const whereUser: Record<string, unknown> = {
    role: "STUDENT",
    status: "ACTIVE",
  };

  const profileWhere: Record<string, unknown> = {};
  if (grade !== "ALL") profileWhere.grade = grade;
  if (section !== "ALL") profileWhere.section = section;
  if (gender !== "ALL") profileWhere.gender = gender;

  if (q.trim()) {
    const query = q.trim();
    whereUser.OR = [
      { email: { contains: query } },
      { profile: { is: { fullName: { contains: query } } } },
      { profile: { is: { phone: { contains: query } } } },
      { profile: { is: { studentCode: { contains: query } } } },
    ];
  }

  if (Object.keys(profileWhere).length > 0) {
    whereUser.profile = { is: profileWhere };
  }

  // فلتر المواهب على مستوى الاستعلام
  const talentFilter: Record<string, unknown> = {};
  if (category !== "ALL") talentFilter.category = category;
  if (talentName !== "ALL") talentFilter.name = talentName;
  if (status === "VERIFIED") talentFilter.status = "VERIFIED";
  else if (status === "PENDING") talentFilter.status = "PENDING";
  else if (status === "FEATURED") talentFilter.featured = true;

  if (Object.keys(talentFilter).length > 0) {
    whereUser.talents = { some: talentFilter };
  }

  // جلب الطلاب المطابقين
  const rawUsers = await db.user.findMany({
    where: whereUser,
    include: {
      profile: true,
      talents: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // تصفية إضافية لرغبات الانضمام بالذاكرة (لأنها حقل JSON نصي)
  let filtered = rawUsers;
  if (joinReason !== "ALL") {
    filtered = filtered.filter((u) => {
      if (!u.profile?.joinReasons) return false;
      try {
        const arr = JSON.parse(u.profile.joinReasons);
        return Array.isArray(arr) && arr.some((item) => {
          if (typeof item === "string") {
            return item === joinReason || item.startsWith(`${joinReason}:`);
          }
          return false;
        });
      } catch {
        return false;
      }
    });
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const students: ExplorerStudentRow[] = paged.map((u) => {
    let joinReasonsList: string[] = [];
    if (u.profile?.joinReasons) {
      try {
        const parsed = JSON.parse(u.profile.joinReasons);
        if (Array.isArray(parsed)) {
          joinReasonsList = parsed.map((item) =>
            typeof item === "string" ? item : ""
          ).filter(Boolean);
        }
      } catch {}
    }

    const joinReasonsLabels = joinReasonsList.map((r) => {
      const parts = r.split(":");
      const base = JOIN_REASON_LABELS[parts[0]] || parts[0];
      return parts[1] ? `${base} (${parts[1]})` : base;
    });

    const talentsList: StudentTalentItem[] = (u.talents || []).map((t) => ({
      id: t.id,
      category: t.category,
      name: t.name,
      customName: t.customName,
      label: talentLabel(t.category, t.name, t.customName),
      description: t.description,
      portfolioUrl: t.portfolioUrl,
      status: t.status,
      featured: t.featured,
      createdAt: t.createdAt.toISOString(),
    }));

    // تحديد الموهبة المتطابقة مع الفلتر الحالي إن وُجدت
    let matchedTalent: StudentTalentItem | undefined;
    if (talentName !== "ALL") {
      matchedTalent = talentsList.find((t) => t.name === talentName);
    } else if (category !== "ALL") {
      matchedTalent = talentsList.find((t) => t.category === category);
    }

    return {
      id: u.id,
      email: u.email,
      fullName: u.profile?.fullName || "طالب بدون اسم",
      grade: u.profile?.grade || "FIRST",
      gradeLabel: GRADE_LABELS[u.profile?.grade || ""] || u.profile?.grade || "غير محدد",
      section: u.profile?.section || "IS",
      sectionLabel: SECTION_LABELS[u.profile?.section || ""] || u.profile?.section || "غير محدد",
      gender: u.profile?.gender || "MALE",
      genderLabel: GENDER_LABELS[u.profile?.gender || ""] || u.profile?.gender || "غير محدد",
      phone: u.profile?.phone || "",
      studentCode: u.profile?.studentCode || null,
      avatarUrl: u.avatarUrl,
      avatarFrameId: u.avatarFrameId,
      discoverySource: u.profile?.discoverySource || null,
      joinReasons: joinReasonsList,
      joinReasonsLabels,
      talents: talentsList,
      talentsCount: talentsList.length,
      matchedTalent,
      createdAt: u.createdAt.toISOString(),
    };
  });

  return {
    students,
    totalCount,
    page: currentPage,
    pageSize,
    totalPages,
  };
}

/**
 * تحديث سريع لحالة الموهبة (توثيق / تمييز) مباشرة من الجدول
 */
export async function updateTalentStatusDirectly(
  talentId: string,
  newStatus: "VERIFIED" | "PENDING" | "REJECTED"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin(MODULES.TALENTS);
    if (!canUser(admin, MODULES.TALENTS, "manage")) {
      return { ok: false, error: "ليس لديك صلاحية تعديل المواهب" };
    }

    const talent = await db.talent.findUnique({
      where: { id: talentId },
      include: { user: { include: { profile: true } } },
    });
    if (!talent) return { ok: false, error: "الموهبة غير موجودة" };

    await db.talent.update({
      where: { id: talentId },
      data: {
        status: newStatus,
        featured: newStatus === "VERIFIED" ? talent.featured : false,
      },
    });

    await logAudit({
      actor: admin,
      action: "TALENT_STATUS_UPDATE",
      entity: "TALENT",
      entityId: talentId,
      summary: `تحديث حالة موهبة ${talent.user?.profile?.fullName || talent.personName || ""}: ${newStatus}`,
    });

    revalidatePath("/admin/talents");
    return { ok: true };
  } catch (err: unknown) {
    const e = err as Error;
    return { ok: false, error: e.message || "فشل التحديث" };
  }
}

/**
 * تبديل حالة تمييز الموهبة (Featured)
 */
export async function toggleTalentFeaturedDirectly(
  talentId: string
): Promise<{ ok: boolean; featured?: boolean; error?: string }> {
  try {
    const admin = await requireAdmin(MODULES.TALENTS);
    if (!canUser(admin, MODULES.TALENTS, "manage")) {
      return { ok: false, error: "ليس لديك صلاحية تعديل المواهب" };
    }

    const talent = await db.talent.findUnique({
      where: { id: talentId },
      include: { user: { include: { profile: true } } },
    });
    if (!talent) return { ok: false, error: "الموهبة غير موجودة" };

    const nextFeatured = !talent.featured;
    await db.talent.update({
      where: { id: talentId },
      data: {
        featured: nextFeatured,
        status: nextFeatured ? "VERIFIED" : talent.status,
      },
    });

    await logAudit({
      actor: admin,
      action: "TALENT_FEATURED_TOGGLE",
      entity: "TALENT",
      entityId: talentId,
      summary: `${nextFeatured ? "تمييز" : "إلغاء تمييز"} موهبة ${talent.user?.profile?.fullName || talent.personName || ""}`,
    });

    revalidatePath("/admin/talents");
    return { ok: true, featured: nextFeatured };
  } catch (err: unknown) {
    const e = err as Error;
    return { ok: false, error: e.message || "فشل التحديث" };
  }
}
