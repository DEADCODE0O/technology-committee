"use server";

// ═══════════════════════════════════════════════════════════════
//  استعادة كلمة السر — عبر Supabase Auth الرسمي
//  1) طلب الاستعادة: بريد → رابط آمن في إيميل المستخدم
//  2) تعيين كلمة سر جديدة بعد فتح الرابط (جلسة مؤقتة من الكود)
//  في وضع التطوير المحلي (بدون Supabase): رسالة إرشادية —
//  الإدارة تعيد الكلمة من لوحة المشرفين كالمعتاد.
// ═══════════════════════════════════════════════════════════════

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** أصل الموقع الحالي (من الطلب أو متغير الموقع الرسمي) */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type ResetRequestResult = {
  ok: boolean;
  error?: string;
  message?: string;
  devNotice?: boolean; // true = الميزة تحتاج إعداد Supabase
};

// ── 1) طلب استعادة كلمة السر ────────────────────────────────

export async function requestPasswordReset(rawEmail: string): Promise<ResetRequestResult> {
  try {
    const email = (rawEmail || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, error: "أدخل بريدًا إلكترونيًا صحيحًا" };

    // حماية من السبام: 5 طلبات لكل IP في الساعة
    const ip = clientIp(await headers());
    const limit = rateLimit(`reset:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return { ok: false, error: waitMessage(limit.retryAfterSec) };

    // وضع التطوير المحلي — بدون Supabase لا بريد يُرسل
    if (!isSupabaseConfigured()) {
      return {
        ok: true,
        devNotice: true,
        message:
          "استعادة كلمة السر بالبريد تعمل بعد ربط المنصة بـ Supabase (دليل DEPLOY.md). حاليًا: تواصل مع إدارة اللجنة وسيعيدونها لك من لوحة المشرفين.",
      };
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "تعذر إرسال الطلب — حاول مرة أخرى" };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await siteOrigin()}/auth/reset-password`,
    });
    if (error) {
      const msg = error.message ?? "";
      if (/rate limit/i.test(msg)) {
        return { ok: false, error: "محاولات كثيرة — انتظر قليلًا ثم حاول مجددًا" };
      }
      console.error("resetPasswordForEmail error:", error);
    }

    // رسالة موحدة دائمًا — لا نكشف إن كان البريد مسجلًا أم لا (أمان)
    return {
      ok: true,
      message: "إن كان هذا البريد مسجلًا لدينا فستصلك رسالة خلال دقائق تحتوي رابط تعيين كلمة سر جديدة",
    };
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

// ── 2) تعيين كلمة السر الجديدة (بعد فتح رابط الإيميل) ─────────

export type NewPasswordResult = { ok: boolean; error?: string };

export async function setNewPassword(newPassword: string, confirmPassword: string): Promise<NewPasswordResult> {
  try {
    if ((newPassword || "").length < 8) {
      return { ok: false, error: "كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل" };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: "الكلمتان غير متطابقتين" };
    }

    if (!isSupabaseConfigured()) {
      return { ok: false, error: "هذه الخطوة تعمل عبر Supabase — راجع دليل النشر DEPLOY.md" };
    }

    // يجب أن تكون الجلسة المؤقتة نشطة (من رابط الإيميل)
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "رابط الاستعادة غير صالح أو منتهي — اطلب رابطًا جديدًا" };

    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "تعذر التحديث — حاول مرة أخرى" };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message ?? "";
      if (/same password/i.test(msg)) {
        return { ok: false, error: "الكلمة الجديدة مطابقة للقديمة — اختر كلمة مختلفة" };
      }
      if (/recovery|session|expired/i.test(msg)) {
        return { ok: false, error: "انتهت صلاحية رابط الاستعادة — اطلب رابطًا جديدًا" };
      }
      console.error("setNewPassword error:", error);
      return { ok: false, error: "تعذر تعيين كلمة السر — حاول مرة أخرى" };
    }

    // مستخدم Google عيّن كلمة سر لأول مرة؟ حدّث الإشارة المحلية
    if (!user.role || user.role === "STUDENT") {
      await db.user.updateMany({
        where: { id: user.id, provider: "GOOGLE" },
        data: { provider: "EMAIL" },
      });
    }

    return { ok: true };
  } catch (err) {
    console.error("setNewPassword error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

/** بعد نجاح التعيين — لوجهة المستخدم الطبيعية */
export async function redirectToHome(): Promise<void> {
  const user = await getCurrentUser();
  redirect(user && isAdminRole(user.role) ? "/admin" : "/panel");
}
