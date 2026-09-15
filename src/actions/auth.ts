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

    // حماية من الاندفاع: حد تسجيل لكل IP (20 محاولة/ساعة) — يكفي الاستخدام الشرعي
    const ip = clientIp(await headers());
    const ipLimit = rateLimit(`register:ip:${ip}`, 20, 60 * 60 * 1000);
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
      const exists = await db.studentProfile.findFirst({ where: { studentCode: code } });
      if (exists) return { ok: false, error: "كود الطالب مسجل بالفعل — تواصل مع الإدارة" };
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
    if (data.hasTalent) {
      // المصدر: قائمة المواهب الجديدة — أو الحقول القديمة (توافق موهبة واحدة)
      const rawEntries: TalentEntry[] =
        data.talents && data.talents.length > 0
          ? data.talents
          : data.talentCategory || data.talentName
            ? [{
                category: data.talentCategory ?? "",
                name: data.talentName ?? "",
                customName: data.talentCustomName,
                description: data.talentDescription,
              }]
            : [];

      if (rawEntries.length === 0) return { ok: false, error: "اختر موهبتك من القائمة" };
      if (rawEntries.length > MAX_TALENTS) return { ok: false, error: `أقصى عدد للمواهب هو ${MAX_TALENTS}` };

      const seen = new Set<string>();
      for (const [i, entry] of rawEntries.entries()) {
        const label = rawEntries.length > 1 ? `الموهبة ${i + 1}: ` : "";

        if (!entry.category || !talentCatValues.includes(entry.category)) {
          return { ok: false, error: `${label}اختر تصنيف الموهبة` };
        }
        if (!entry.name) return { ok: false, error: `${label}اختر الموهبة من القائمة` };

        let customName: string | null = null;
        if (entry.name === "OTHER") {
          const custom = (entry.customName || "").trim();
          if (custom.length < 2) return { ok: false, error: `${label}اكتب اسم الموهبة` };
          customName = custom;
        }

        // منع تكرار نفس الموهبة مرتين
        const dedupeKey = `${entry.category}|${entry.name}|${customName ?? ""}`.toLowerCase();
        if (seen.has(dedupeKey)) return { ok: false, error: `${label}مكررة — اختار موهبة مختلفة` };
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
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "هذا البريد مسجل بالفعل — جرّب تسجيل الدخول" };

    // ══ وضع Supabase: الهوية في Supabase Auth + الصف بنفس UUID ══
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { ok: false, error: "تعذر إنشاء الحساب — حاول مرة أخرى" };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: data.password });
      if (signUpError || !signUpData.user) {
        const msg = signUpError?.message ?? "";
        if (/already registered/i.test(msg))
          return { ok: false, error: "هذا البريد مسجل بالفعل — جرّب تسجيل الدخول أو استعادة كلمة السر" };
        if (/not allowed/i.test(msg))
          return { ok: false, error: "التسجيل معطل حاليًا من إعدادات Supabase — تواصل مع الإدارة" };
        if (/password/i.test(msg) && /least/i.test(msg))
          return { ok: false, error: "كلمة السر ضعيفة حسب سياسة الحسابات — استخدم أحرفًا وأرقامًا متنوعة" };
        if (/rate limit/i.test(msg))
          return { ok: false, error: "محاولات كثيرة — انتظر قليلًا ثم حاول مجددًا" };
        console.error("supabase signUp error:", signUpError);
        return { ok: false, error: "تعذر إنشاء الحساب — حاول مرة أخرى" };
      }

      // صف التطبيق بنفس UUID الرسمي — كلمة السر لا تُخزن محليًا أبدًا
      const user = await db.user.create({
        data: {
          id: signUpData.user.id,
          email,
          passwordHash: null,
          provider: "EMAIL",
          role: ROLES.STUDENT,
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

      // جلسة فورية؟ (تفعيل البريد معطل) — أو انتظار تفعيل البريد عبر OTP؟
      if (!signUpData.session) {
        return { ok: true, needsEmailConfirm: true, email };
      }
      return { ok: true };
    }

    // ══ وضع التطوير المحلي: bcrypt + جلسة JWT ══
    const passwordHash = await hashPassword(data.password);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: ROLES.STUDENT,
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

    // ══ وضع التطوير المحلي: إرسال المستخدم لصفحة الـ OTP لمحاكاة التدفق بالكامل ══
    console.log(`\n========================================\n[DEV MODE OTP] Email: ${email} | Verification Code: 123456\n========================================\n`);
    return { ok: true, needsEmailConfirm: true, email };
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

    // حد لمنع الإغراق: طلب واحد كل 45 ثانية
    const limit = rateLimit(`resend-otp:${normEmail}`, 1, 45 * 1000);
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

    // حماية من التخمين: حد لكل بريد + حد عام لكل IP (نافذة منزلقة)
    const ip = clientIp(await headers());
    const emailLimit = rateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
    if (!emailLimit.ok) return { error: waitMessage(emailLimit.retryAfterSec) };
    const ipLimit = rateLimit(`login:ip:${ip}`, 25, 15 * 60 * 1000);
    if (!ipLimit.ok) return { error: waitMessage(ipLimit.retryAfterSec) };

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return { error: "البريد أو كلمة السر غير صحيحة" };
    if (user.status === "SUSPENDED") return { error: "هذا الحساب معلق — تواصل مع إدارة اللجنة" };

    // حساب Google وُلد بلا كلمة سر — لا يمكن الدخول بالبريد وكلمة السر
    if (!user.passwordHash && user.provider === "GOOGLE") {
      return { error: "هذا الحساب مسجّل عبر Google — استخدم زر «الدخول بـ Google»" };
    }

    // تحديد الوجهة المناسبة
    const rawReturnTo = String(formData.get("returnTo") || "").trim();
    const defaultTarget = isAdminRole(user.role) ? "/admin" : "/panel";
    const targetUrl =
      rawReturnTo && rawReturnTo !== "/"
        ? safeRedirectUrl(rawReturnTo, defaultTarget)
        : defaultTarget;

    // ══ وضع Supabase: التحقق عبر Supabase Auth الرسمي ══
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { error: "حدث خطأ غير متوقع أثناء الدخول — حاول مرة أخرى" };

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        const msg = signInError?.message ?? "";
        if (/email not confirmed/i.test(msg)) {
          return {
            redirectTo: `/register/verify?email=${encodeURIComponent(email)}&notice=need_verification`,
          };
        }
        if (/rate limit/i.test(msg)) {
          return { error: "محاولات كثيرة — انتظر قليلًا ثم حاول مجددًا" };
        }
        // دخول فاشل — إنهاء أي جلسة جزئية
        await supabase.auth.signOut().catch(() => {});
        return { error: "البريد أو كلمة السر غير صحيحة" };
      }

      // نجاح — تصفير عداد البريد حتى لا يتأثر مستخدم شرعي
      resetRateLimit(`login:email:${email}`);

      return { redirectTo: targetUrl };
    }

    // ══ وضع التطوير المحلي: bcrypt ══
    const valid = await verifyPassword(password, user.passwordHash || "");
    if (!valid) return { error: "البريد أو كلمة السر غير صحيحة" };

    // نجاح — تصفير عداد البريد حتى لا يتأثر مستخدم شرعي
    resetRateLimit(`login:email:${email}`);

    await createSession(user.id);

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
};

export async function completeGoogleProfile(data: CompleteProfileData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "انتهت الجلسة — سجّل دخولك مرة أخرى" };
    if (user.role !== ROLES.STUDENT) return { ok: false, error: "هذه الخطوة للطلاب فقط" };

    const existing = await db.studentProfile.findUnique({ where: { userId: user.id } });
    if (existing) return { ok: false, error: "بياناتك مكتملة بالفعل" };

    const fullName = normalizeArabicName(data.fullName || "");
    if (!isValidArabicFullName(fullName)) return { ok: false, error: "الاسم يجب أن يكون باللغة العربية ومن 3 أسماء على الأقل" };
    if (!gradeValues.includes(data.grade)) return { ok: false, error: "اختر الفرقة من القائمة" };
    if (!sectionValues.includes(data.section)) return { ok: false, error: "اختر الشعبة من القائمة" };
    if (!genderValues.includes(data.gender)) return { ok: false, error: "اختر الجنس من القائمة" };

    const phone = normalizePhone(data.phone || "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) return { ok: false, error: "رقم الهاتف غير صحيح — مثال صحيح: 01012345678" };

    await db.studentProfile.create({
      data: {
        userId: user.id,
        fullName,
        grade: data.grade,
        section: data.section,
        gender: data.gender,
        phone,
        phoneVerified: true,
        discoverySource: "OTHER",
        joinReasons: null,
      },
    });

    await logAudit({
      action: "PROFILE_COMPLETED",
      entity: "STUDENT",
      entityId: user.id,
      summary: `أكمل بياناته مستخدم Google: ${fullName}`,
    });

    return { ok: true };
  } catch (err) {
    console.error("completeGoogleProfile error:", err);
    return { ok: false, error: "حدث خطأ غير متوقع — حاول مرة أخرى" };
  }
}
