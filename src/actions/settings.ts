"use server";

// ═══════════════════════════════════════════════════════════════
//  إجراءات إعدادات الطالب — على طريقة فيسبوك العصرية
//  • الحساب والمعلومات الشخصية (الاسم المعروض، اليوزرنيم، النبذة، الهاتف)
//  • الأمان وكلمة المرور (تغيير كلمة السر وتأكيدها)
//  • دعم كامل للـ Supabase Free Tier وبيئة التطوير المحلية
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireStudentAction, hashPassword, verifyPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/platform";
import { maskBannedWords } from "@/lib/content-filter";

export type UpdateSettingsState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * تحديث معلومات الحساب والملف الشخصي
 */
export async function updateStudentGeneralSettings(input: {
  displayName?: string;
  username?: string;
  bio?: string;
  phone?: string;
}): Promise<UpdateSettingsState> {
  try {
    const user = await requireStudentAction();

    const userUpdates: {
      displayName?: string | null;
      username?: string | null;
      bio?: string | null;
    } = {};

    // 1. فحص وتحديث الاسم المعروض (Display Name)
    if (typeof input.displayName === "string") {
      const trimmed = input.displayName.trim();
      if (trimmed.length > 0 && trimmed.length < 2) {
        return { ok: false, error: "الاسم المعروض يجب ألا يقل عن حرفين" };
      }
      if (trimmed.length > 50) {
        return { ok: false, error: "الاسم المعروض طويل جداً (الحد الأقصى 50 حرف)" };
      }
      userUpdates.displayName = trimmed ? await maskBannedWords(trimmed) : null;
    }

    // 2. فحص وتحديث اسم المستخدم (Username @handle)
    if (typeof input.username === "string") {
      const rawUser = input.username.trim().toLowerCase().replace(/^@/, "");
      if (rawUser.length > 0) {
        if (!/^[a-z0-9_]{3,30}$/.test(rawUser)) {
          return {
            ok: false,
            error: "اسم المستخدم يجب أن يتكون من 3 إلى 30 حرفاً إنجليزياً أو أرقاماً أو شرطة سفلية (_) فقط",
          };
        }
        // التحقق من التفرد
        const existing = await db.user.findFirst({
          where: {
            username: rawUser,
            id: { not: user.id },
          },
          select: { id: true },
        });
        if (existing) {
          return { ok: false, error: "اسم المستخدم هذا محجوز لطالب آخر — اختر اسماً مختلفاً" };
        }
        userUpdates.username = rawUser;
      } else {
        userUpdates.username = null;
      }
    }

    // 3. فحص وتحديث النبذة التعريفية (Bio)
    if (typeof input.bio === "string") {
      const cleanBio = input.bio.trim().slice(0, 160);
      userUpdates.bio = cleanBio ? await maskBannedWords(cleanBio) : null;
    }

    // 4. تحديث رقم الهاتف في الملف الشخصي إن وجد
    if (typeof input.phone === "string" && input.phone.trim()) {
      const cleanPhone = input.phone.trim();
      if (!/^01[0125][0-9]{8}$/.test(cleanPhone)) {
        return { ok: false, error: "رقم الهاتف غير صحيح — مثال: 01012345678" };
      }
      await db.studentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          fullName: userUpdates.displayName || user.displayName || "طالب",
          grade: "FIRST",
          section: "IS",
          gender: "MALE",
          phone: cleanPhone,
        },
        update: {
          phone: cleanPhone,
        },
      });
    }

    // تطبيق التحديثات على جدول المستخدم
    await db.user.update({
      where: { id: user.id },
      data: userUpdates,
    });

    await logAudit({
      actor: user,
      action: "PROFILE_UPDATED",
      entity: "USER",
      entityId: user.id,
      summary: "تحديث إعدادات وبيانات الحساب",
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
    revalidatePath("/panel");
    revalidatePath("/community");
    revalidatePath("/messages");

    return { ok: true, message: "تم حفظ التعديلات بنجاح 🎉" };
  } catch (err) {
    console.error("updateStudentGeneralSettings error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "تعذر حفظ الإعدادات" };
  }
}

/**
 * تغيير كلمة المرور للطالب
 */
export async function changeStudentPassword(input: {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}): Promise<UpdateSettingsState> {
  try {
    const user = await requireStudentAction();

    const currentPassword = input.currentPassword?.trim() || "";
    const newPassword = input.newPassword?.trim() || "";
    const confirmPassword = input.confirmPassword?.trim() || "";

    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف" };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: "كلمة المرور الجديدة وتأكيدها غير متطابقين" };
    }

    // في حال كان المستخدم مسجلاً ومعه كلمة سر سابقة، يجب التحقق من كلمة السر الحالية
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, passwordHash: true, provider: true },
    });

    if (!dbUser) return { ok: false, error: "المستخدم غير موجود" };

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { ok: false, error: "تعذر الاتصال بمزود الحسابات" };

      // إذا لم يكن مستخدم Google لأول مرة، نتحقق من كلمة السر الحالية
      if (dbUser.provider !== "GOOGLE" || dbUser.passwordHash) {
        if (!currentPassword) {
          return { ok: false, error: "يرجى كتابة كلمة المرور الحالية" };
        }
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: dbUser.email,
          password: currentPassword,
        });
        if (verifyErr) {
          return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };
        }
      }

      // تحديث كلمة المرور في Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        // محاولة استخدام Supabase Admin كبديل موثوق
        const supaAdmin = getSupabaseAdmin();
        if (supaAdmin) {
          const { error: adminErr } = await supaAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword,
          });
          if (adminErr) {
            return { ok: false, error: adminErr.message || "تعذر تحديث كلمة المرور" };
          }
        } else {
          return { ok: false, error: updateErr.message || "تعذر تحديث كلمة المرور" };
        }
      }

      // تحديث محلي احتياطي
      const newHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          provider: "EMAIL",
        },
      });
    } else {
      // وضع التطوير المحلي بدون Supabase
      if (dbUser.passwordHash) {
        if (!currentPassword) {
          return { ok: false, error: "يرجى كتابة كلمة المرور الحالية" };
        }
        const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
        if (!valid) {
          return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };
        }
      }

      const newHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          provider: "EMAIL",
        },
      });
    }

    await logAudit({
      actor: user,
      action: "PASSWORD_CHANGED",
      entity: "USER",
      entityId: user.id,
      summary: "قام الطالب بتغيير كلمة المرور الخاصة بحسابه",
    });

    revalidatePath("/settings");
    revalidatePath("/profile");

    return { ok: true, message: "تم تغيير كلمة المرور بنجاح! 🔒" };
  } catch (err) {
    console.error("changeStudentPassword error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "تعذر تغيير كلمة المرور" };
  }
}
