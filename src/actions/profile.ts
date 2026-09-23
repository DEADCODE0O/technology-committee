"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات ملف الطالب (تجهيز الإطارات، تخصيص المظهر)
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { purgeCacheTag } from "@/lib/cache/data-cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAvatarFrame, isFrameUnlocked } from "@/lib/avatar-frames";
import { getStudentLevel, logAudit } from "@/lib/platform";
import { MAX_TALENTS } from "@/lib/constants";
import { cleanAvatarUrl } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function invalidateUserCache(userId: string) {
  purgeCacheTag(`user-${userId}`);
}

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
      invalidateUserCache(user.id);
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

    invalidateUserCache(user.id);
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

export async function restoreAccountAvatarAction(): Promise<{
  ok: boolean;
  avatarUrl?: string | null;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    let googleAvatar: string | null = null;

    // 1) فحص جلسة Supabase الحالية
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
          if (typeof meta.avatar_url === "string" && meta.avatar_url) {
            googleAvatar = meta.avatar_url;
          } else if (typeof meta.picture === "string" && meta.picture) {
            googleAvatar = meta.picture;
          } else if (meta.picture && typeof meta.picture === "object" && "data" in meta.picture) {
            const picData = (meta.picture as { data?: { url?: string } }).data;
            if (picData && typeof picData.url === "string") {
              googleAvatar = picData.url;
            }
          }

          if (!googleAvatar && Array.isArray(authUser.identities)) {
            for (const identity of authUser.identities) {
              const idData = identity?.identity_data as Record<string, unknown> | undefined;
              if (idData) {
                if (typeof idData.avatar_url === "string" && idData.avatar_url) {
                  googleAvatar = idData.avatar_url;
                  break;
                } else if (typeof idData.picture === "string" && idData.picture) {
                  googleAvatar = idData.picture;
                  break;
                }
              }
            }
          }
        }
      }

      // إذا لم يُعثر عليها في الكوكيز، نبحث عبر Supabase Admin بواسطة معرف المستخدم أو البريد
      if (!googleAvatar) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceKey) {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const adminClient = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: adminUser } = await adminClient.auth.admin.getUserById(user.id);
            const userMeta = adminUser?.user?.user_metadata as Record<string, unknown> | undefined;
            if (userMeta) {
              if (typeof userMeta.avatar_url === "string") googleAvatar = userMeta.avatar_url;
              else if (typeof userMeta.picture === "string") googleAvatar = userMeta.picture;
            }
            if (!googleAvatar && adminUser?.user?.identities) {
              for (const identity of adminUser.user.identities) {
                const idData = identity?.identity_data as Record<string, unknown> | undefined;
                if (idData?.avatar_url && typeof idData.avatar_url === "string") {
                  googleAvatar = idData.avatar_url;
                  break;
                }
              }
            }
          } catch (e) {
            console.warn("[restoreAccountAvatarAction] admin lookup:", e);
          }
        }
      }
    }

    // 2) فحص صورة الحساب المخزنة في الكائن أو قاعدة البيانات
    if (!googleAvatar && user.accountAvatarUrl) {
      googleAvatar = user.accountAvatarUrl;
    }

    const cleanedAvatar = cleanAvatarUrl(googleAvatar);
    if (!cleanedAvatar) {
      return {
        ok: false,
        error: "لم يتم العثور على صورة شخصية مسجلة بحساب Google المرتبط بهذا الحساب.",
      };
    }

    // 3) حفظ رابط الصورة الفعلي الكامل في قاعدة البيانات
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: cleanedAvatar },
    });

    await logAudit({
      actor: user,
      action: "AVATAR_IMAGE_UPDATED",
      entity: "USER",
      entityId: user.id,
      summary: "استعادة صورة حساب Google الأصلية بنجاح",
      details: { restoredAvatarUrl: cleanedAvatar },
    });

    invalidateUserCache(user.id);
    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/panel");
    revalidatePath("/tasks");
    revalidatePath("/activities");
    revalidatePath("/leaderboard");
    revalidatePath("/community");
    revalidatePath("/welcome");
    revalidatePath("/");

    return { ok: true, avatarUrl: cleanedAvatar };
  } catch (err: unknown) {
    console.error("restoreAccountAvatarAction error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "حدث خطأ أثناء استعادة صورة الحساب",
    };
  }
}

export async function setAvatarUrlAction(
  avatarUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    let targetUrl: string | null = null;
    if (avatarUrl === "INITIALS") {
      targetUrl = "INITIALS";
    } else if (!avatarUrl || avatarUrl === "DEFAULT") {
      // إذا طُلب الافتراضي، نحاول استخدام صورة الحساب الرسمية إن وُجدت
      if (user.accountAvatarUrl) {
        targetUrl = cleanAvatarUrl(user.accountAvatarUrl);
      } else {
        targetUrl = "INITIALS";
      }
    } else {
      targetUrl = cleanAvatarUrl(avatarUrl);
    }

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: targetUrl },
    });

    await logAudit({
      actor: user,
      action: "AVATAR_IMAGE_UPDATED",
      entity: "USER",
      entityId: user.id,
      summary: targetUrl === "INITIALS"
        ? "تفعيل الحروف الأولى كصورة رمزية"
        : "تحديث الصورة الرمزية للملف الشخصي",
      details: { avatarUrl: targetUrl },
    });

    invalidateUserCache(user.id);
    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/panel");
    revalidatePath("/tasks");
    revalidatePath("/activities");
    revalidatePath("/leaderboard");
    revalidatePath("/community");
    revalidatePath("/welcome");
    revalidatePath("/");

    return { ok: true };
  } catch (err: unknown) {
    console.error("setAvatarUrlAction error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "حدث خطأ أثناء تحديث الصورة الرمزية" };
  }
}

/**
 * تحديث الاسم المعروض (الاسم المستعار للطلاب) والنبذة الشخصية
 */
export async function updateDisplayNameAndBio(data: {
  displayName?: string;
  bio?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

    const updatePayload: { displayName?: string | null; bio?: string | null } = {};

    if (typeof data.displayName === "string") {
      const clean = data.displayName.trim();
      if (clean.length > 0 && clean.length < 2) {
        return { ok: false, error: "الاسم المعروض يجب أن يتكون من حرفين على الأقل" };
      }
      updatePayload.displayName = clean || null;
    }

    if (typeof data.bio === "string") {
      updatePayload.bio = data.bio.trim().slice(0, 160) || null;
    }

    await db.user.update({
      where: { id: user.id },
      data: updatePayload,
    });

    invalidateUserCache(user.id);
    revalidatePath("/profile");
    revalidatePath("/panel");
    revalidatePath("/community");
    revalidatePath("/messages");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تحديث البيانات" };
  }
}

