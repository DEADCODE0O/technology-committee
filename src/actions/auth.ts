"use server";

// ═══════════════════════════════════════════════════════════════
//  عمليات المصادقة: التسجيل / الدخول / الخروج
//  كل التحقق يتم على السيرفر — الواجهة مجرد عرض
// ═══════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  getSessionUserId,
  getCurrentUser,
} from "@/lib/auth";
import { logAudit, getStudentCodeConfig } from "@/lib/platform";
import { isAdminRole } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, resetRateLimit, clientIp, waitMessage } from "@/lib/rate-limit";
import { headers } from "next/headers";
import {
  GRADES, SECTIONS, GENDERS, DISCOVERY_SOURCES, JOIN_REASONS,
  TALENT_CATEGORIES, ROLES, MAX_TALENTS,
} from "@/lib/constants";
import { EMAIL_RE, normalizeArabicName, isValidArabicFullName, normalizePhone, validateStudentCodeFormat, safeRedirectUrl } from "@/lib/validation";
import { validateRegistrationEmail } from "@/lib/email-domains";

// ─── التسجيل ─────────────────────────────────────────────────

// موهبة واحدة داخل قائمة المواهب (التسجيل يدعم عدة مواهب)
export type TalentEntry = {
  category: string;
  name: string;
  customName?: string;
  description?: string;
};

export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  grade: string;
  section: string;
  gender: string;
  phone: string;
  studentCode?: string;
  discoverySource?: string;
  joinReasons?: string[];
  joinReasonOther?: string;
  hasTalent?: boolean;
  // الجديد: قائمة مواهب (حتى MAX_TALENTS)
  talents?: TalentEntry[];
  // حقول قديمة للتوافق (موهبة واحدة) — تُستخدم فقط لو talents فارغة
  talentCategory?: string;
  talentName?: string;
  talentCustomName?: string;
  talentDescription?: string;
};

export type ActionResult = { ok: boolean; error?: string; needsEmailConfirm?: boolean; email?: string };

const gradeValues = GRADES.map((g) => g.value as string);
const sectionValues = SECTIONS.map((s) => s.value as string);
const genderValues = GENDERS.map((g) => g.value as string);
const discoveryValues = DISCOVERY_SOURCES.map((d) => d.value as string);
const reasonValues = JOIN_REASONS.map((j) => j.value as string);
const talentCatValues = TALENT_CATEGORIES.map((t) => t.value as string);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerStudent(data: RegisterData): Promise<ActionResult> {
  try {
    const email = normalizeEmail(data.email || "");

    // حماية من الاندفاع: حد تسجيل لكل IP (120 محاولة/ساعة) — يكفي الاستخدام والتجارب الشرعية
    const ip = clientIp(await headers());
    const ipLimit = rateLimit(`register:ip:${ip}`, 120, 60 * 60 * 1000);
    if (!ipLimit.ok) return { ok: false, error: waitMessage(ipLimit.retryAfterSec) };

    // ── التحقق الأساسي وحظر البريد المؤقت ──
    const emailValidation = validateRegistrationEmail(email);
    if (!emailValidation.ok) return { ok: false, error: emailValidation.error };
    if ((data.password || "").length < 8) return { ok: false, error: "كلمة السر يجب أن تكون 8 أحرف على الأقل" };

    const fullName = normalizeArabicName(data.fullName || "");
    if (!isValidArabicFullName(fullName)) return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };

    if (!gradeValues.includes(data.grade)) return { ok: false, error: "اختر الفرقة من القائمة" };
    if (!sectionValues.includes(data.section)) return { ok: false, error: "اختر الشعبة من القائمة" };
    if (!genderValues.includes(data.gender)) return { ok: false, error: "اختر الجنس من القائمة" };

    const phone = normalizePhone(data.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم الهاتف غير صحيح — مثال صحيح: 01012345678" };

    // ── كود الطالب (قواعد الإعدادات — التحقق على السيرفر) ──
    const codeConfig = await getStudentCodeConfig();
    const codeRequired = codeConfig.requiredGrades.includes(data.grade);
    let studentCode: string | undefined;
    if (codeRequired) {
      const code = (data.studentCode || "").trim();
      if (!code) return { ok: false, error: "كود الطالب مطلوب لفرقتك حسب إعدادات اللجنة" };
      const codeCheck = validateStudentCodeFormat(code, data.grade);
      if (!codeCheck.ok) return { ok: false, error: codeCheck.error! };
      const exists = await db.studentProfile.findFirst({
        where: { studentCode: code },
        include: { user: true },
      });
      if (exists && exists.user.email.toLowerCase() !== email.toLowerCase()) {
        return { ok: false, error: "كود الطالب مسجل بالفعل لطالب آخر — تواصل مع الإدارة" };
      }
      studentCode = code;
    }

    // ── مصدر التعارف: التنسيق للفرقة الأولى فقط (على مستوى النظام) ──
    let discoverySource: string | undefined;
    if (data.discoverySource) {
      if (!discoveryValues.includes(data.discoverySource)) {
        return { ok: false, error: "مصدر التعارف غير صحيح" };
      }
      if (data.discoverySource === "TANSIQ" && data.grade !== "FIRST") {
        return { ok: false, error: "خيار التنسيق متاح للفرقة الأولى فقط" };
      }
      discoverySource = data.discoverySource;
    }

    // ── أسباب الانضمام ──
    let joinReasons: string[] = [];
    if (data.joinReasons && data.joinReasons.length > 0) {
      for (const r of data.joinReasons) {
        if (!reasonValues.includes(r)) return { ok: false, error: "أحد أسباب الانضمام غير صحيح" };
      }
      if (data.joinReasons.includes("OTHER")) {
        const other = (data.joinReasonOther || "").trim();
        if (other.length < 3) return { ok: false, error: "اكتب سببك في خانة «أخرى»" };
        joinReasons = [...data.joinReasons.filter((r) => r !== "OTHER"), `OTHER:${other}`];
      } else {
        joinReasons = data.joinReasons;
      }
    }

    // ── المواهب (تدعم أكثر من موهبة) ──
    const talentRecords: { category: string; name: string; customName: string | null; description: string | null }[] = [];
    if (data.talents && data.talents.length > 0) {
      const rawEntries = data.talents.slice(0, MAX_TALENTS);
      const seen = new Set<string>();
      for (const entry of rawEntries) {
        if (!entry.category || !entry.name) continue;
        let customName: string | null = null;
        if (entry.name === "OTHER" || entry.name.startsWith("OTHER_")) {
          const custom = (entry.customName || "").trim();
          if (custom.length < 2) continue;
          customName = custom;
        }
        const dedupeKey = `${entry.category}|${entry.name}|${customName ?? ""}`.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        talentRecords.push({
          category: entry.category,
          name: entry.name,
          customName,
          description: (entry.description || "").trim() || null,
        });
      }
    }

    // ── التأكد من عدم تكرار البريد ──
    let existing = await db.user.findUnique({ where: { email }, include: { profile: true } });
    if (existing?.profile) {
      if (existing.provider === "GOOGLE") {
        return {
          ok: false,
          error: "هذا البريد مسجل بالفعل عبر Google — يرجى استخدام زر «تسجيل الدخول بحساب Google»",
        };
      }
      return { ok: false, error: "هذا البريد الإلكتروني مسجل بالفعل — يمكنك تسجيل الدخول مباشرة بكلمة السر الخاصة بك" };
    }

    // ══ وضع Supabase: الهوية في Supabase Auth + الصف بنفس UUID ══
    if (isSupabaseConfigured()) {
      const supaAdmin = getSupabaseAdmin();
      let finalUserId: string | null = null;

      if (supaAdmin) {
        // إنشاء المستخدم وتأكيد بريده فوراً في Supabase Auth دون استعلامات حصر بطيئة
        const { data: createdUser, error: createErr } = await supaAdmin.auth.admin.createUser({
          email,
          password: data.password,
          email_confirm: true,
        });

        if (createdUser?.user) {
          finalUserId = createdUser.user.id;
        } else if (/already|exists/i.test(createErr?.message || "")) {
          // الحساب موجود مسبقاً في Supabase Auth ولكن غير موجود في صفحة db.user
          // نسجل الدخول للتأكد من كلمة السر واستخراج المعرف بأمان تام
          const supabase = await createSupabaseServerClient();
          if (supabase) {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email,
              password: data.password,
            });
            if (signInData?.user) {
              finalUserId = signInData.user.id;
            }
          }
        } else {
          console.error("[registerStudent] supaAdmin.createUser error:", createErr);
        }
      }

      // إذا تعذر استخدام supaAdmin كحالة نادرة جداً
      if (!finalUserId) {
        const supabase = await createSupabaseServerClient();
        if (!supabase) return { ok: false, error: "تعذر إنشاء الحساب — حاول مرة أخرى" };
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: data.password,
        });
        if (signUpData?.user) {
          finalUserId = signUpData.user.id;
        } else {
          console.error("[registerStudent] fallback signUp failed:", signUpError);
          return { ok: false, error: "تعذر إنشاء الحساب حالياً — حاول مرة أخرى بعد قليل" };
        }
      }

      if (!finalUserId) {
        return { ok: false, error: "تعذر إنشاء الحساب — حاول مرة أخرى" };
      }

      const studentUserId: string = finalUserId;

      // التأكد من عدم وجود تضارب معرفات قديم
      if (existing && existing.id !== studentUserId) {
        const hasRegs = await db.registration.count({ where: { userId: existing.id } });
        if (hasRegs === 0) {
          await db.studentProfile.deleteMany({ where: { userId: existing.id } });
          await db.talent.deleteMany({ where: { userId: existing.id } });
          await db.dailyStreak.deleteMany({ where: { userId: existing.id } });
          await db.user.delete({ where: { id: existing.id } }).catch(() => {});
          existing = null;
        }
      }

      let user = await db.user.findUnique({ where: { id: studentUserId } });
      if (!user) {
        user = await db.user.create({
          data: {
            id: studentUserId,
            email,
            passwordHash: null,
            provider: "EMAIL",
            role: ROLES.STUDENT,
            status: "ACTIVE",
            profile: {
              create: {
                fullName,
                grade: data.grade,
                section: data.section,
                gender: data.gender,
                phone,
                phoneVerified: true,
                studentCode: studentCode ?? null,
                discoverySource: discoverySource ?? null,
                joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
              },
            },
            ...(talentRecords.length
              ? {
                  talents: {
                    create: talentRecords.map((t) => ({
                      category: t.category,
                      name: t.name,
                      customName: t.customName,
                      description: t.description,
                      status: "PENDING",
                    })),
                  },
                }
              : {}),
          },
          include: { profile: true },
        });
      } else {
        await db.studentProfile.upsert({
          where: { userId: studentUserId },
          create: {
            userId: studentUserId,
            fullName,
            grade: data.grade,
            section: data.section,
            gender: data.gender,
            phone,
            phoneVerified: true,
            studentCode: studentCode ?? null,
            discoverySource: discoverySource ?? null,
            joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
          },
          update: {
            fullName,
            grade: data.grade,
            section: data.section,
            gender: data.gender,
            phone,
            studentCode: studentCode ?? null,
            discoverySource: discoverySource ?? null,
            joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
          },
        });
      }

      await logAudit({
        action: "STUDENT_REGISTERED",
        entity: "STUDENT",
        entityId: user.id,
        summary: `انضمام طالب جديد: ${fullName}`,
      });

      // تسجيل دخول فوري وتثبيت الجلسة
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        await supabase.auth.signInWithPassword({ email, password: data.password }).catch((e: unknown) => {
          console.warn("[registerStudent] signInWithPassword error:", e);
        });
      }
      await createSession(user.id);
      revalidatePath("/", "layout");

      return { ok: true, needsEmailConfirm: false };
    }

    // ══ وضع التطوير المحلي: bcrypt + جلسة JWT مباشرة ══
    const passwordHash = await hashPassword(data.password);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: ROLES.STUDENT,
        status: "ACTIVE",
        profile: {
          create: {
            fullName,
            grade: data.grade,
            section: data.section,
            gender: data.gender,
            phone,
            phoneVerified: true,
            studentCode: studentCode ?? null,
            discoverySource: discoverySource ?? null,
            joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
          },
        },
        ...(talentRecords.length
          ? {
              talents: {
                create: talentRecords.map((t) => ({
                  category: t.category,
                  name: t.name,
                  customName: t.customName,
                  description: t.description,
                  status: "PENDING",
                })),
              },
            }
          : {}),
      },
      include: { profile: true, talents: true },
    });

    await logAudit({
      action: "STUDENT_REGISTERED",
      entity: "STUDENT",
      entityId: user.id,
      summary: `انضمام طالب جديد: ${fullName}`,
    });

    await createSession(user.id);
    revalidatePath("/", "layout");
    return { ok: true, needsEmailConfirm: false };
  } catch (err) {
    console.error("registerStudent error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

// ─── التحقق من كود الـ OTP عبر البريد الإلكتروني ───────────
export async function verifySignupOtp({
  email,
  code,
  returnTo,
}: {
  email: string;
  code: string;
  returnTo?: string;
}): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  try {
    const normEmail = normalizeEmail(email || "");
    const trimmedCode = (code || "").replace(/\D/g, "");

    if (!normEmail || !EMAIL_RE.test(normEmail)) {
      return { ok: false, error: "البريد الإلكتروني غير صحيح" };
    }
    if (trimmedCode.length !== 6) {
      return { ok: false, error: "رمز التحقق يجب أن يتكون من 6 أرقام" };
    }

    const safeTarget = safeRedirectUrl(returnTo, "/panel");

    // ══ وضع Supabase: التحقق الرسمي من كود الـ OTP المكون من 6 أرقام ══
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { ok: false, error: "تعذر الاتصال بخدمة المصادقة" };

      const { data, error } = await supabase.auth.verifyOtp({
        email: normEmail,
        token: trimmedCode,
        type: "signup",
      });

      if (error || !data.user) {
        console.error("verifyOtp error:", error);
        const msg = error?.message || "";
        if (/expired/i.test(msg)) {
          return { ok: false, error: "انتهت صلاحية رمز التحقق — اطلب رمزًا جديدًا عبر زر «إعادة الإرسال»" };
        }
        return { ok: false, error: "رمز التحقق غير صحيح — تأكد من إدخال الأرقام الـ 6 كما وصلتك في بريدك" };
      }

      await createSession(data.user.id);

      await logAudit({
        action: "STUDENT_CONFIRMED_EMAIL",
        entity: "STUDENT",
        entityId: data.user.id,
        summary: `تم تفعيل حساب الطالب وتأكيد بريده عبر OTP: ${normEmail}`,
      });

      revalidatePath("/", "layout");
      return { ok: true, redirectTo: safeTarget };
    }

    // ══ وضع التطوير المحلي: تفعيل فوري مع جلسة محلية ══
    if (trimmedCode !== "123456") {
      return { ok: false, error: "رمز التحقق غير صحيح (رمز التجربة في وضع التطوير: 123456)" };
    }
    const user = await db.user.findUnique({ where: { email: normEmail } });
    if (!user) return { ok: false, error: "الحساب غير مسجل" };

    await createSession(user.id);
    revalidatePath("/", "layout");
    return { ok: true, redirectTo: safeTarget };
  } catch (err) {
    console.error("verifySignupOtp error:", err);
    return { ok: false, error: "حدث خطأ أثناء التحقق من الرمز — حاول مرة أخرى" };
  }
}

// ─── إعادة إرسال كود الـ OTP ──────────────────────────────────
export async function resendSignupOtp({
  email,
}: {
  email: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const normEmail = normalizeEmail(email || "");
    if (!normEmail || !EMAIL_RE.test(normEmail)) {
      return { ok: false, error: "البريد الإلكتروني غير صحيح" };
    }

    // حد لمنع الإغراق: طلب واحد كل 15 ثانية
    const limit = rateLimit(`resend-otp:${normEmail}`, 1, 15 * 1000);
    if (!limit.ok) {
      return { ok: false, error: `يرجى الانتظار ${limit.retryAfterSec} ثانية قبل طلب رمز جديد` };
    }

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { ok: false, error: "تعذر الاتصال بخدمة المصادقة" };

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normEmail,
      });

      if (error) {
        console.error("resendOtp error:", error);
        const msg = error.message || "";
        if (/rate limit/i.test(msg)) {
          return { ok: false, error: "تم إرسال رمز مؤخراً — يرجى مراجعة بريدك الإلكتروني أو الانتظار دقيقة" };
        }
        return { ok: false, error: "تعذر إعادة إرسال الرمز حالياً — يرجى المحاولة بعد قليل" };
      }

      return { ok: true };
    }

    // وضع التطوير المحلي
    console.log(`[DEV MODE] Resent verification OTP to ${normEmail}: 123456`);
    return { ok: true };
  } catch (err) {
    console.error("resendSignupOtp error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

// ─── الدخول ──────────────────────────────────────────────────

export type LoginState = {
  error?: string;
  redirectTo?: string;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const email = normalizeEmail(String(formData.get("email") || ""));
    const password = String(formData.get("password") || "");

    if (!EMAIL_RE.test(email)) return { error: "أدخل بريدًا إلكترونيًا صحيحًا" };
    if (!password) return { error: "أدخل كلمة السر" };

    // حماية من التخمين: حد موسع لتسهيل التجارب والفحص دون حظر المستخدم
    const ip = clientIp(await headers());
    const emailLimit = rateLimit(`login:email:${email}`, 500, 15 * 60 * 1000);
    if (!emailLimit.ok) return { error: waitMessage(emailLimit.retryAfterSec) };
    if (ip !== "unknown") {
      const ipLimit = rateLimit(`login:ip:${ip}`, 1000, 15 * 60 * 1000);
      if (!ipLimit.ok) return { error: waitMessage(ipLimit.retryAfterSec) };
    }

    const user = await db.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user) return { error: "هذا البريد الإلكتروني غير مسجل — يمكنك إنشاء حساب جديد أولاً" };
    if (user.status === "SUSPENDED") return { error: "هذا الحساب معلق — تواصل مع إدارة اللجنة" };

    // تحديد الوجهة المناسبة
    const rawReturnTo = String(formData.get("returnTo") || "").trim();
    let targetUrl: string;

    if (isAdminRole(user.role)) {
      targetUrl = rawReturnTo.startsWith("/admin") ? rawReturnTo : "/admin";
    } else {
      if (
        rawReturnTo &&
        rawReturnTo.startsWith("/") &&
        !rawReturnTo.startsWith("//") &&
        !rawReturnTo.startsWith("/admin") &&
        rawReturnTo !== "/login" &&
        rawReturnTo !== "/register"
      ) {
        targetUrl = rawReturnTo;
      } else {
        targetUrl = !user.profile && user.role === ROLES.STUDENT ? "/profile/complete" : "/panel";
      }
    }

    // ══ وضع Supabase: التحقق عبر Supabase Auth الرسمي ══
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { error: "حدث خطأ غير متوقع أثناء الدخول — حاول مرة أخرى" };

      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // إذا كان الحساب غير مفعل البريد، نقوم بتفعيله تلقائيًا عبر المشرف بمعرّفه المباشر وإعادة المحاولة
      if (signInError && /email not confirmed/i.test(signInError.message || "")) {
        const supaAdmin = getSupabaseAdmin();
        if (supaAdmin && user) {
          await supaAdmin.auth.admin.updateUserById(user.id, { email_confirm: true }).catch(() => {});
          const retry = await supabase.auth.signInWithPassword({ email, password });
          signInData = retry.data;
          signInError = retry.error;
        }
      }

      // فحص محلي وتزامن فوري: إذا فشل الدخول بـ Supabase وكانت كلمة السر صحيحة في قاعدة البيانات
      if ((signInError || !signInData?.user) && user.passwordHash) {
        const matchesLocalHash = await verifyPassword(password, user.passwordHash);
        if (matchesLocalHash) {
          const supaAdmin = getSupabaseAdmin();
          if (supaAdmin) {
            await supaAdmin.auth.admin.updateUserById(user.id, {
              password,
              email_confirm: true,
            }).catch(() => {});
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.data?.user) {
              signInData = retry.data;
              signInError = null;
            }
          }
          // حتى لو تعذر Supabase في هذه اللحظة، نعتمد المصادقة الموثقة عبر الجلسة المحلية
          if (!signInData?.user) {
            resetRateLimit(`login:email:${email}`);
            await createSession(user.id);
            return { redirectTo: targetUrl };
          }
        }
      }

      if (signInError || !signInData?.user) {
        const msg = signInError?.message ?? "";
        console.warn(`[loginAction] signInWithPassword error for ${email}:`, msg);
        if (/rate limit/i.test(msg)) {
          return { error: "تم استهلاك حد المحاولات المؤقت من مزود الحسابات — يرجى الانتظار دقيقة أو الدخول بحساب Google" };
        }
        // دخول فاشل — إنهاء أي جلسة جزئية
        await supabase.auth.signOut().catch(() => {});
        if (user.provider === "GOOGLE") {
          return { error: "كلمة السر غير صحيحة — إذا لم تكن قد عيّنت كلمة سر بعد، يمكنك تسجيل الدخول مباشرة بضغطة واحدة عبر زر «تسجيل الدخول بحساب Google» أعلاه" };
        }
        if (user.provider === "FACEBOOK") {
          return { error: "هذا الحساب مسجّل عبر Facebook" };
        }
        return { error: "كلمة السر غير صحيحة — تأكد من كتابتها بشكل سليم أو استخدم «نسيت كلمة السر»" };
      }

      // التأكد من توثيق البريد
      if (!signInData.user.email_confirmed_at && !signInData.user.confirmed_at) {
        const supaAdmin = getSupabaseAdmin();
        if (supaAdmin) {
          await supaAdmin.auth.admin.updateUserById(signInData.user.id, { email_confirm: true }).catch(() => {});
        }
      }

      // نجاح — تصفير عداد البريد حتى لا يتأثر مستخدم شرعي
      resetRateLimit(`login:email:${email}`);

      // تأكيد الجلسة المحلية أيضاً كضمان إضافي للثقة
      await createSession(user.id);

      // إذا كان طالباً وملفه لم يكتمل بعد، نوجّهه فوراً لصفحة إكمال البيانات
      if (user.role === ROLES.STUDENT && !user.profile) {
        return { redirectTo: "/profile/complete" };
      }

      return { redirectTo: targetUrl };
    }

    // ══ وضع التطوير المحلي: bcrypt ══
    const valid = await verifyPassword(password, user.passwordHash || "");
    if (!valid) {
      if (user.provider === "GOOGLE") {
        return { error: "كلمة السر غير صحيحة — إذا لم تكن قد عيّنت كلمة سر بعد، يمكنك تسجيل الدخول بضغطة واحدة عبر زر Google أعلاه" };
      }
      return { error: "كلمة السر غير صحيحة — تأكد من كتابتها بشكل سليم أو استخدم «نسيت كلمة السر»" };
    }

    // نجاح — تصفير عداد البريد حتى لا يتأثر مستخدم شرعي
    resetRateLimit(`login:email:${email}`);

    await createSession(user.id);

    if (user.role === ROLES.STUDENT && !user.profile) {
      return { redirectTo: "/profile/complete" };
    }

    return { redirectTo: targetUrl };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("loginAction error:", err);
    return { error: "حدث خطأ غير متوقع أثناء الدخول — حاول مرة أخرى" };
  }
}

// ─── إضافة موهبة من الملف الشخصي ─────────────────────
// الطالب يقدر يضيف مواهب جديدة في أي وقت (حتى MAX_TALENTS)

export type AddTalentData = {
  category: string;
  name: string;
  customName?: string;
  description?: string;
};

export async function addMyTalent(data: AddTalentData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.role !== ROLES.STUDENT) return { ok: false, error: "هذه الميزة للطلاب فقط" };

    if (!data.category || !talentCatValues.includes(data.category)) {
      return { ok: false, error: "اختر تصنيف الموهبة" };
    }
    if (!data.name) return { ok: false, error: "اختر الموهبة" };

    let customName: string | null = null;
    if (data.name === "OTHER") {
      const custom = (data.customName || "").trim();
      if (custom.length < 2) return { ok: false, error: "اكتب اسم الموهبة" };
      customName = custom;
    }

    // حد أقصى للمواهب في الملف
    const count = await db.talent.count({ where: { userId: user.id } });
    if (count >= MAX_TALENTS) return { ok: false, error: `وصلت للحد الأقصى (${MAX_TALENTS} مواهب)` };

    // منع تكرار نفس الموهبة
    const dup = await db.talent.findFirst({
      where: { userId: user.id, category: data.category, name: data.name, customName },
    });
    if (dup) return { ok: false, error: "دي مسجلة بالفعل في ملفك" };

    await db.talent.create({
      data: {
        userId: user.id,
        category: data.category,
        name: data.name,
        customName,
        description: (data.description || "").trim() || null,
        status: "PENDING",
      },
    });

    await logAudit({
      action: "TALENT_ADDED",
      entity: "TALENT",
      entityId: user.id,
      summary: `أضاف موهبة: ${customName ?? data.name}`,
    });

    revalidatePath("/profile");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    console.error("addMyTalent error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

// ─── الخروج ──────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getSessionUserId()) !== null;
}

// ─── تسليم كود الطالب من داخل المنصة ─────────────────────────
// يطلبه منه البوابة عندما تكون مفعّلة لفرقته ولم يسجّله بعد
// (نفس منطق التسجيل: التحقق + منع التكرار بين الطلاب)

export async function saveMyStudentCode(rawCode: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.role !== ROLES.STUDENT || !user.profile) {
      return { ok: false, error: "هذه العملية للطلاب فقط" };
    }

    const code = (rawCode || "").trim();
    const config = await getStudentCodeConfig();
    const codeCheck = validateStudentCodeFormat(code, user.profile.grade);
    if (!codeCheck.ok) return { ok: false, error: codeCheck.error! };
    if (!config.requiredGrades.includes(user.profile.grade)) {
      return { ok: false, error: "كود الطالب غير مطلوب لفرقتك حاليًا" };
    }
    if (user.profile.studentCode) return { ok: true };

    const exists = await db.studentProfile.findFirst({ where: { studentCode: code } });
    if (exists) return { ok: false, error: "هذا الكود مسجل لطالب آخر — تأكد من كتابته صحيحًا" };

    await db.studentProfile.update({
      where: { userId: user.id },
      data: { studentCode: code },
    });

    await logAudit({
      action: "STUDENT_CODE_SUBMITTED",
      entity: "STUDENT",
      entityId: user.id,
      summary: `سجّل كود الطالب من المنصة: ${user.profile.fullName}`,
    });

    revalidatePath("/panel");
    revalidatePath("/panel/required");
    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    console.error("saveMyStudentCode error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}

// ─── إكمال بيانات مستخدم Google الجديد ─────────────────────
// أنشأ حسابه عبر Google — يكمل بيانات الطالب (مرة واحدة)

export type CompleteProfileData = {
  fullName: string;
  grade: string;
  section: string;
  gender: string;
  phone: string;
  studentCode?: string;
  discoverySource?: string;
  joinReasons?: string[];
  joinReasonOther?: string;
  hasTalent?: boolean;
  talents?: TalentEntry[];
};

export async function completeGoogleProfile(data: CompleteProfileData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.role !== ROLES.STUDENT) return { ok: false, error: "هذه الخطوة للطلاب فقط" };

    const existing = await db.studentProfile.findUnique({ where: { userId: user.id } });
    if (existing) return { ok: true };

    const fullName = normalizeArabicName(data.fullName || "");
    if (!isValidArabicFullName(fullName)) return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };
    if (!gradeValues.includes(data.grade)) return { ok: false, error: "اختر الفرقة من القائمة" };
    if (!sectionValues.includes(data.section)) return { ok: false, error: "اختر الشعبة من القائمة" };
    if (!genderValues.includes(data.gender)) return { ok: false, error: "اختر الجنس من القائمة" };

    const phone = normalizePhone(data.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم الهاتف غير صحيح — مثال صحيح: 01012345678" };

    // كود الطالب
    const codeConfig = await getStudentCodeConfig();
    const codeRequired = codeConfig.requiredGrades.includes(data.grade);
    let studentCode: string | undefined;
    if (codeRequired) {
      const code = (data.studentCode || "").trim();
      if (!code) return { ok: false, error: "كود الطالب مطلوب لفرقتك حسب إعدادات اللجنة" };
      const codeCheck = validateStudentCodeFormat(code, data.grade);
      if (!codeCheck.ok) return { ok: false, error: codeCheck.error! };
      const existsCode = await db.studentProfile.findFirst({ where: { studentCode: code } });
      if (existsCode) return { ok: false, error: "كود الطالب مسجل بالفعل — تواصل مع الإدارة" };
      studentCode = code;
    }

    // مصدر التعارف
    let discoverySource: string | undefined;
    if (data.discoverySource) {
      if (!discoveryValues.includes(data.discoverySource)) {
        return { ok: false, error: "مصدر التعارف غير صحيح" };
      }
      if (data.discoverySource === "TANSIQ" && data.grade !== "FIRST") {
        return { ok: false, error: "خيار التنسيق متاح للفرقة الأولى فقط" };
      }
      discoverySource = data.discoverySource;
    }

    // أسباب الانضمام
    let joinReasons: string[] = [];
    if (data.joinReasons && data.joinReasons.length > 0) {
      for (const r of data.joinReasons) {
        if (!reasonValues.includes(r)) return { ok: false, error: "أحد أسباب الانضمام غير صحيح" };
      }
      if (data.joinReasons.includes("OTHER")) {
        const other = (data.joinReasonOther || "").trim();
        if (other.length < 3) return { ok: false, error: "اكتب سببك في خانة «أخرى»" };
        joinReasons = [...data.joinReasons.filter((r) => r !== "OTHER"), `OTHER:${other}`];
      } else {
        joinReasons = data.joinReasons;
      }
    }

    // المواهب
    const talentRecords: { category: string; name: string; customName: string | null; description: string | null }[] = [];
    if (data.talents && data.talents.length > 0) {
      const rawEntries = data.talents.slice(0, MAX_TALENTS);
      const seen = new Set<string>();
      for (const entry of rawEntries) {
        if (!entry.category || !entry.name) continue;
        let customName: string | null = null;
        if (entry.name === "OTHER" || entry.name.startsWith("OTHER_")) {
          const custom = (entry.customName || "").trim();
          if (custom.length < 2) continue;
          customName = custom;
        }
        const dedupeKey = `${entry.category}|${entry.name}|${customName ?? ""}`.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        talentRecords.push({
          category: entry.category,
          name: entry.name,
          customName,
          description: (entry.description || "").trim() || null,
        });
      }
    }

    await db.$transaction(async (tx) => {
      await tx.studentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          fullName,
          grade: data.grade,
          section: data.section,
          gender: data.gender,
          phone,
          phoneVerified: true,
          studentCode: studentCode ?? null,
          discoverySource: discoverySource ?? null,
          joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
        },
        update: {
          fullName,
          grade: data.grade,
          section: data.section,
          gender: data.gender,
          phone,
          studentCode: studentCode ?? null,
          discoverySource: discoverySource ?? null,
          joinReasons: joinReasons.length ? JSON.stringify(joinReasons) : null,
        },
      });

      if (talentRecords.length > 0) {
        await tx.talent.createMany({
          data: talentRecords.map((t) => ({
            userId: user.id,
            category: t.category,
            name: t.name,
            customName: t.customName,
            description: t.description,
            status: "PENDING",
          })),
        });
      }
    });

    await logAudit({
      action: "PROFILE_COMPLETED",
      entity: "STUDENT",
      entityId: user.id,
      summary: `أكمل بياناته مستخدم Google: ${fullName}`,
    });

    revalidatePath("/", "layout");
    revalidatePath("/panel");
    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    console.error("completeGoogleProfile error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}
