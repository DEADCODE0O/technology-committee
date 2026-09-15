"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات ملف الطالب (تجهيز الإطارات، تخصيص المظهر)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAvatarFrame, isFrameUnlocked } from "@/lib/avatar-frames";
import { getStudentLevel, logAudit } from "@/lib/platform";
import { MAX_TALENTS } from "@/lib/constants";

export async function equipAvatarFrame(
  frameId: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    // إلغاء تجهيز الإطار (العودة للوضع البسيط)
    if (!frameId) {
      await db.user.update({
        where: { id: user.id },
        data: { avatarFrameId: null },
      });
      await logAudit({
        actor: user,
        action: "AVATAR_FRAME_UNEQUIPPED",
        entity: "USER",
        entityId: user.id,
        summary: "إلغاء تجهيز إطار الصورة الرمزية",
      });
      revalidatePath("/profile");
      revalidatePath("/leaderboard");
      revalidatePath("/community");
      revalidatePath("/panel");
      return { ok: true };
    }

    const frame = getAvatarFrame(frameId);
    if (!frame) return { ok: false, error: "الإطار المطلوب غير موجود" };

    // التحقق من صلاحية الفتح حسب مستوى الطالب
    const { level } = await getStudentLevel(user.id);
    const unlocked = isFrameUnlocked(frame, level, true);
    if (!unlocked) {
      return {
        ok: false,
        error: `هذا الإطار مغلق — ${frame.unlockHint}`,
      };
    }

    await db.user.update({
      where: { id: user.id },
      data: { avatarFrameId: frameId },
    });

    await logAudit({
      actor: user,
      action: "AVATAR_FRAME_EQUIPPED",
      entity: "USER",
      entityId: user.id,
      summary: `تجهيز إطار الصورة الرمزية: «${frame.name}» (المستوى ${level})`,
      details: { frameId, level },
    });

    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    revalidatePath("/community");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "تعذر حفظ الإطار",
    };
  }
}

// ─── إدارة مواهب الطالب من الملف الشخصي ───────────────────────

export async function addStudentTalentAction(data: {
  category: string;
  name: string;
  customName?: string;
  description?: string;
  portfolioUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    const count = await db.talent.count({ where: { userId: user.id } });
    if (count >= MAX_TALENTS) {
      return { ok: false, error: `الحد الأقصى للمواهب هو ${MAX_TALENTS} مواهب` };
    }

    if (!data.category) return { ok: false, error: "اختر تصنيف الموهبة" };
    if (!data.name) return { ok: false, error: "اختر الموهبة من القائمة" };

    let customName: string | null = null;
    if (data.name.includes("OTHER") || data.name === "OTHER") {
      const custom = (data.customName || "").trim();
      if (custom.length < 2) return { ok: false, error: "اكتب اسم الموهبة بوضوح" };
      customName = custom;
    }

    // منع تكرار نفس الموهبة لنفس الطالب
    const existing = await db.talent.findFirst({
      where: {
        userId: user.id,
        category: data.category,
        name: data.name,
        customName,
      },
    });
    if (existing) {
      return { ok: false, error: "هذه الموهبة مسجلة بالفعل في ملفك" };
    }

    // جلب بيانات الطالب الأساسية
    const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });

    await db.talent.create({
      data: {
        userId: user.id,
        personName: profile?.fullName || null,
        personGrade: profile?.grade || null,
        personSection: profile?.section || null,
        category: data.category,
        name: data.name,
        customName,
        description: (data.description || "").trim() || null,
        portfolioUrl: (data.portfolioUrl || "").trim() || null,
        status: "PENDING",
      },
    });

    await logAudit({
      actor: user,
      action: "TALENT_ADDED",
      entity: "TALENT",
      entityId: user.id,
      summary: `إضافة موهبة جديدة للملف: ${customName || data.name}`,
    });

    revalidatePath("/profile");
    revalidatePath("/talents");
    return { ok: true };
  } catch (err) {
    console.error("addStudentTalentAction error:", err);
    return { ok: false, error: "حدث خطأ أثناء إضافة الموهبة" };
  }
}

export async function deleteStudentTalentAction(talentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    const talent = await db.talent.findUnique({ where: { id: talentId } });
    if (!talent || talent.userId !== user.id) {
      return { ok: false, error: "الموهبة غير موجودة أو لا تملك صلاحية حذفها" };
    }

    await db.talent.delete({ where: { id: talentId } });
    await logAudit({
      actor: user,
      action: "TALENT_DELETED",
      entity: "TALENT",
      entityId: talentId,
      summary: `حذف موهبة من الملف الشخصي`,
    });

    revalidatePath("/profile");
    revalidatePath("/talents");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "تعذر حذف الموهبة" };
  }
}
