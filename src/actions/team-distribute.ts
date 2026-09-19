"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";

const TEAM_COLORS = [
  "#c9a45c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ec4899", "#06b6d4", "#ef4444", "#14b8a6", "#6366f1"
];

const TEAM_ICONS = ["🛡️", "⚡", "🚀", "🔥", "💎", "🌟", "🎯", "👑", "🦁", "🦅"];

export interface DistributeStudentsInput {
  source: "ALL_STUDENTS" | "ACTIVITY" | "SESSION" | "CUSTOM";
  activityId?: string;
  sessionId?: string;
  userIds?: string[];

  method: "RANDOM" | "ORDERED" | "BALANCED";

  targetMode: "NEW_TEAMS" | "EXISTING_TEAMS";
  existingTeamIds?: string[];
  newTeamCount?: number;
  newTeamPrefix?: string;

  constraints?: {
    maxPerTeam?: number;
    genderBalance?: boolean;
  };
}

export interface DistributionResult {
  ok: boolean;
  message?: string;
  error?: string;
  teamsCount?: number;
  studentsDistributed?: number;
  rosters?: {
    teamId: string;
    teamName: string;
    members: { id: string; name: string; gender: string }[];
  }[];
}

/**
 * خوارزمية توزيع الطلاب الذكية على الفرق:
 * - عشوائي (Fisher-Yates)
 * - مرتب (أبجدياً)
 * - متوازن (مراعاة التكافؤ وتوازن الجنسين)
 */
export async function distributeStudentsToTeams(
  input: DistributeStudentsInput,
  dryRun = false
): Promise<DistributionResult> {
  try {
    const admin = await requireActionUser(MODULES.POINTS, "manage");

    // ── 1. جلب الطلاب المستهدفين ──
    let candidateUsers: { id: string; name: string; gender: string }[] = [];

    if (input.source === "ALL_STUDENTS") {
      const users = await db.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE" },
        include: { profile: true },
      });
      candidateUsers = users.map((u) => ({
        id: u.id,
        name: u.displayName || u.profile?.fullName || u.email,
        gender: u.profile?.gender || "MALE",
      }));
    } else if (input.source === "ACTIVITY" && input.activityId) {
      const registrations = await db.registration.findMany({
        where: {
          status: "REGISTERED",
          session: { activityId: input.activityId },
        },
        include: { user: { include: { profile: true } } },
      });
      const uniqueMap = new Map<string, { id: string; name: string; gender: string }>();
      for (const r of registrations) {
        if (!r.user || !r.userId) continue;
        if (!uniqueMap.has(r.userId)) {
          uniqueMap.set(r.userId, {
            id: r.user.id,
            name: r.user.displayName || r.user.profile?.fullName || r.user.email,
            gender: r.user.profile?.gender || "MALE",
          });
        }
      }
      candidateUsers = Array.from(uniqueMap.values());
    } else if (input.source === "SESSION" && input.sessionId) {
      const registrations = await db.registration.findMany({
        where: {
          sessionId: input.sessionId,
          status: "REGISTERED",
        },
        include: { user: { include: { profile: true } } },
      });
      for (const r of registrations) {
        if (!r.user || !r.userId) continue;
        candidateUsers.push({
          id: r.user.id,
          name: r.user.displayName || r.user.profile?.fullName || r.user.email,
          gender: r.user.profile?.gender || "MALE",
        });
      }
    } else if (input.source === "CUSTOM" && input.userIds && input.userIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: input.userIds } },
        include: { profile: true },
      });
      candidateUsers = users.map((u) => ({
        id: u.id,
        name: u.displayName || u.profile?.fullName || u.email,
        gender: u.profile?.gender || "MALE",
      }));
    }

    if (candidateUsers.length === 0) {
      return { ok: false, error: "لم يتم العثور على طلاب مستهدفين للتوزيع" };
    }

    // ── 2. تطبيق خوارزمية الترتيب والفرز ──
    let orderedStudents = [...candidateUsers];

    if (input.method === "ORDERED") {
      // ترتيب أبجدي حسب الاسم
      orderedStudents.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (input.method === "BALANCED" || input.constraints?.genderBalance) {
      // فصل حسب الجنس ثم تداخل متوازن
      const males = orderedStudents.filter((s) => s.gender !== "FEMALE");
      const females = orderedStudents.filter((s) => s.gender === "FEMALE");

      // خلط عشوائي لكل مجموعة
      for (let i = males.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [males[i], males[j]] = [males[j], males[i]];
      }
      for (let i = females.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [females[i], females[j]] = [females[j], females[i]];
      }

      // تداخل ذكي
      const interleaved: typeof orderedStudents = [];
      const maxLen = Math.max(males.length, females.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < males.length) interleaved.push(males[i]);
        if (i < females.length) interleaved.push(females[i]);
      }
      orderedStudents = interleaved;
    } else {
      // خلط عشوائي (Fisher-Yates)
      for (let i = orderedStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedStudents[i], orderedStudents[j]] = [orderedStudents[j], orderedStudents[i]];
      }
    }

    // ── 3. إعداد الفرق الهدف ──
    interface TargetTeam {
      id: string;
      name: string;
      members: { id: string; name: string; gender: string }[];
    }

    let targetTeams: TargetTeam[] = [];

    if (input.targetMode === "EXISTING_TEAMS" && input.existingTeamIds && input.existingTeamIds.length > 0) {
      const existing = await db.team.findMany({
        where: { id: { in: input.existingTeamIds } },
      });
      if (existing.length === 0) {
        return { ok: false, error: "الفرق المحددة غير موجودة" };
      }
      targetTeams = existing.map((t) => ({ id: t.id, name: t.name, members: [] }));
    } else {
      const teamCount = Math.max(2, input.newTeamCount || Math.ceil(orderedStudents.length / 5));
      const prefix = input.newTeamPrefix?.trim() || "فريق";

      if (dryRun) {
        // محاكاة فقط
        for (let i = 1; i <= teamCount; i++) {
          targetTeams.push({
            id: `temp-${i}`,
            name: `${prefix} ${i}`,
            members: [],
          });
        }
      } else {
        // إنشاء الفرق فعلياً في قاعدة البيانات مع شات تلقائي لكل فريق
        for (let i = 1; i <= teamCount; i++) {
          const color = TEAM_COLORS[(i - 1) % TEAM_COLORS.length];
          const icon = TEAM_ICONS[(i - 1) % TEAM_ICONS.length];
          const uniqueName = `${prefix} ${i} (${Date.now().toString().slice(-4)})`;

          const newTeam = await db.team.create({
            data: {
              name: uniqueName,
              color,
              icon,
              description: `فريق تم إنشاؤه عبر التوزيع الذكي (${input.method})`,
            },
          });

          // إنشاء شات الفريق
          await db.chatRoom.create({
            data: {
              name: `شات ${newTeam.name}`,
              type: "TEAM",
              teamId: newTeam.id,
              icon,
              description: `غرفة التنسيق والمحادثة لأعضاء ${newTeam.name}`,
            },
          });

          targetTeams.push({
            id: newTeam.id,
            name: newTeam.name,
            members: [],
          });
        }
      }
    }

    // ── 4. توزيع الطلاب بطريقة Round-Robin ──
    const maxPerTeam = input.constraints?.maxPerTeam || Infinity;

    let teamIdx = 0;
    for (const student of orderedStudents) {
      // إيجاد فريق لم يتجاوز الحد الأقصى
      let placed = false;
      for (let attempt = 0; attempt < targetTeams.length; attempt++) {
        const candidateTeam = targetTeams[(teamIdx + attempt) % targetTeams.length];
        if (candidateTeam.members.length < maxPerTeam) {
          candidateTeam.members.push(student);
          teamIdx = (teamIdx + attempt + 1) % targetTeams.length;
          placed = true;
          break;
        }
      }

      if (!placed) {
        // جميع الفرق ممتلئة بالحد الأقصى
        targetTeams[teamIdx % targetTeams.length].members.push(student);
        teamIdx = (teamIdx + 1) % targetTeams.length;
      }
    }

    // ── 5. الحفظ في قاعدة البيانات إن لم يكن معاينة ──
    if (!dryRun) {
      for (const t of targetTeams) {
        if (t.members.length > 0) {
          await db.teamMember.createMany({
            data: t.members.map((m, idx) => ({
              teamId: t.id,
              userId: m.id,
              role: idx === 0 ? "LEADER" : "MEMBER", // أول عضو يعين قائداً افتراضياً
            })),
            skipDuplicates: true,
          });
        }
      }

      await logAudit({
        actor: admin,
        action: "TEAM_MEMBER_SET",
        entity: "TEAM",
        entityId: targetTeams[0]?.id || "BULK",
        summary: `توزيع ذكي لـ ${orderedStudents.length} طالباً على ${targetTeams.length} فرق بنجاح (${input.method})`,
      });

      revalidatePath("/admin/teams");
      revalidatePath("/messages");
      revalidatePath("/panel");
    }

    return {
      ok: true,
      message: dryRun
        ? `معاينة التوزيع: ${orderedStudents.length} طالباً على ${targetTeams.length} فرق`
        : `تم توزيع ${orderedStudents.length} طالباً بنجاح على ${targetTeams.length} فرق!`,
      teamsCount: targetTeams.length,
      studentsDistributed: orderedStudents.length,
      rosters: targetTeams.map((t) => ({
        teamId: t.id,
        teamName: t.name,
        members: t.members,
      })),
    };
  } catch (err) {
    console.error("distributeStudentsToTeams error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "حدث خطأ أثناء توزيع الطلاب" };
  }
}
