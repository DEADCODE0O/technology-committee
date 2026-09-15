"use server";

// ═══════════════════════════════════════════════════════════════
//  توثيق رقم الهاتف المصري عبر OTP
//  • الكود: 6 أرقام، صلاحية 10 دقائق، يُخزَّن SHA-256 (لا نصًا صريحًا)
//  • إعادة الإرسال: فترة انتظار 60 ثانية + حد 5 أكواد/ساعة لكل رقم
//  • الإدخال: 5 محاولات كحد أقصى ثم يُبطَل الكود
//  • الحالة الرسمية: StudentProfile.phoneVerified في قاعدة البيانات —
//    لا يُعتبر الرقم موثقًا لمجرد قبول الواجهة له
// ═══════════════════════════════════════════════════════════════

import { createHash, randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireStudentAction } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { sendSms, isSmsDevMode } from "@/lib/sms";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

const PHONE_RE = /^01[0125][0-9]{8}$/;
const CODE_TTL_MIN = 10;
const RESEND_COOLDOWN_SEC = 60;
const MAX_PER_HOUR = 5;
const ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  const secret = process.env.AUTH_SECRET || "otp-dev-secret";
  return createHash("sha256").update(`${phone}:${code}:${secret}`).digest("hex");
}

export type SendOtpResult = {
  ok: boolean;
  error?: string;
  retryAfter?: number; // ثوان حتى إتاحة إعادة الإرسال
  /** الكود في وضع التطوير فقط (SMS_MODE=console وبلا مزوّد حقيقي) */
  devCode?: string;
};

// ── إرسال كود التوثيق إلى رقم الطالب المسجل ──────────────────

export async function sendPhoneOtp(): Promise<SendOtpResult> {
  try {
    const user = await requireStudentAction();
    if (!user.profile) return { ok: false, error: "أكمل بياناتك أولًا" };
    if (user.profile.phoneVerified) return { ok: false, error: "رقمك موثق بالفعل ✓" };

    const phone = user.profile.phone;
    if (!PHONE_RE.test(phone)) {
      return { ok: false, error: "رقم الهاتف في ملفك غير صحيح — تواصل مع الإدارة لتصحيحه" };
    }

    // حماية سبام: حد عام لكل IP (15/ساعة)
    const ip = clientIp(await headers());
    const ipLimit = rateLimit(`otp:ip:${ip}`, 15, 60 * 60 * 1000);
    if (!ipLimit.ok) return { ok: false, error: waitMessage(ipLimit.retryAfterSec) };

    // فترة انتظار بين كل إرسالين (60 ثانية)
    const latest = await db.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SEC) {
        return {
          ok: false,
          error: `انتظر قليلًا قبل طلب كود جديد`,
          retryAfter: Math.ceil(RESEND_COOLDOWN_SEC - elapsed),
        };
      }
    }

    // حد أقصى 5 أكواد/ساعة لكل رقم
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourCount = await db.otpCode.count({
      where: { phone, createdAt: { gte: hourAgo } },
    });
    if (hourCount >= MAX_PER_HOUR) {
      return { ok: false, error: "وصلت الحد الأقصى للأكواد هذا الساعة — حاول بعد ساعة" };
    }

    // توليد الكود وتخزينه مُشفّرًا (وإبطال الأكواد السابقة للرقم)
    const code = String(randomInt(100000, 999999));
    await db.otpCode.updateMany({
      where: { phone, consumed: false },
      data: { consumed: true },
    });
    await db.otpCode.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        purpose: "PHONE_VERIFY",
        attempts: ATTEMPTS,
        expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
      },
    });

    const sms = await sendSms(phone, `كود توثيق هاتفك في منصة اللجنة التكنولوجية: ${code} — صالح ${CODE_TTL_MIN} دقائق`);
    if (!sms.ok) return { ok: false, error: sms.error ?? "تعذر إرسال الرسالة" };

    await logAudit({
      actor: user,
      action: "OTP_SENT",
      entity: "STUDENT",
      entityId: user.id,
      summary: `إرسال كود توثيق للهاتف ${phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")}`,
    });

    revalidatePath("/panel");
    revalidatePath("/profile");

    return {
      ok: true,
      // وضع التطوير (بلا مزوّد SMS حقيقي): أظهر الكود ليكمل الطالب التوثيق
      devCode: sms.devMode && isSmsDevMode() ? code : undefined,
    };
  } catch (err) {
    console.error("sendPhoneOtp error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ── التحقق من الكود وتوثيق الرقم رسميًا ────────────────────────

export type VerifyOtpResult = { ok: boolean; error?: string; attemptsLeft?: number };

export async function verifyPhoneOtp(rawCode: string): Promise<VerifyOtpResult> {
  try {
    const user = await requireStudentAction();
    if (!user.profile) return { ok: false, error: "أكمل بياناتك أولًا" };
    if (user.profile.phoneVerified) return { ok: true };

    const phone = user.profile.phone;
    const code = (rawCode || "").replace(/\D/g, "");
    if (code.length !== 6) return { ok: false, error: "اكتب الكود المكوّن من 6 أرقام" };

    // حماية تخمين: 10 محاولات إدخال لكل IP في 15 دقيقة
    const ip = clientIp(await headers());
    const ipLimit = rateLimit(`otp-verify:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.ok) return { ok: false, error: waitMessage(ipLimit.retryAfterSec) };

    const record = await db.otpCode.findFirst({
      where: { phone, consumed: false },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return { ok: false, error: "اطلب كودًا جديدًا أولًا" };

    if (record.expiresAt < new Date()) {
      await db.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
      return { ok: false, error: "انتهت صلاحية الكود — اطلب كودًا جديدًا" };
    }
    if (record.attempts <= 0) {
      await db.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
      return { ok: false, error: "استنفدت المحاولات — اطلب كودًا جديدًا" };
    }

    // مقارنة الهاش
    if (record.codeHash !== hashCode(phone, code)) {
      const attemptsLeft = record.attempts - 1;
      await db.otpCode.update({ where: { id: record.id }, data: { attempts: attemptsLeft } });
      if (attemptsLeft <= 0) {
        return { ok: false, error: "استنفدت المحاولات — اطلب كودًا جديدًا" };
      }
      return { ok: false, error: "الكود غير صحيح", attemptsLeft };
    }

    // ✓ صحيح — التوثيق الرسمي في قاعدة البيانات
    await db.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
    await db.studentProfile.update({
      where: { userId: user.id },
      data: { phoneVerified: true },
    });

    await logAudit({
      actor: user,
      action: "PHONE_VERIFIED",
      entity: "STUDENT",
      entityId: user.id,
      summary: `وثّق رقم هاتفه عبر OTP: ${phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")}`,
    });

    revalidatePath("/panel");
    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    console.error("verifyPhoneOtp error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
