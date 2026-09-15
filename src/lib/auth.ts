import "server-only";

// ═══════════════════════════════════════════════════════════════
//  المصادقة والجلسات
//
//  وضع الإنتاج (مفاتيح Supabase مضبوطة) — Supabase Auth هو
//  النظام الرسمي الوحيد:
//    • الهوية UUID من auth.users — نفسها مفتاح صف User (id)
//    • الجلسة عبر كوكيز @supabase/ssr (httpOnly)
//    • كلمات السر لا تُخزن في قاعدة بيانات التطبيق إطلاقًا
//    • ربط الحسابات: بالبريد الموثق أو googleId — دون تكرار
//
//  وضع التطوير المحلي (بدون مفاتيح — المعاينة والتطوير فقط):
//    bcrypt + JWT في كوكي httpOnly — لا يُستخدم في الإنتاج.
// ═══════════════════════════════════════════════════════════════

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { canUser, isAdminRole, type Action, type Module } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/platform";

const COOKIE_NAME = "tc_session";
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  // في الإنتاج: رفض التشغيل بدون سر حقيقي — لا جلسات موقعة بسر افتراضي معروف
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET غير مضبوط — راجع .env.example و DEPLOY.md قبل النشر");
    }
    return new TextEncoder().encode("dev-secret-change-me-in-production");
  }
  if (secret.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET قصير جدًا — استخدم سرًا لا يقل عن 32 حرفًا (openssl rand -base64 48)");
  }
  return new TextEncoder().encode(secret);
}

// ─── كلمات المرور (وضع التطوير المحلي فقط) ──────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ─── الجلسة ──────────────────────────────────────────────────

/** وضع التطوير فقط — إنشاء جلسة JWT محلية */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  // وضع Supabase — إنهاء جلسة Supabase Auth الرسمية
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  // وضع Supabase — الهوية من جلسة Supabase Auth
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }
  // وضع التطوير — JWT محلي
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

// ─── ربط هوية Supabase بحساب التطبيق ────────────────────────
// ترتيب البحث:
//   1) الصف بنفس UUID (حساب نشأ عبر Supabase)
//   2) googleId الموثق من metadata (حساب Google مرتبط)
//   3) البريد (ربط حساب قديم بنفس البريد — Google موثق البريد)
//   4) لا صف؟ → إنشاء صف طالب جديد (self-heal: أول دخول Google)
// لا نغيّر id صف قائم أبدًا — يبقى التاريخ (التسجيل/الحضور/النقاط) سليمًا.

export async function resolveSupabaseAppUser(
  authUser: AuthUser
): Promise<{ id: string; email: string; role: string; status: string; customPermissions: string | null; provider: string; googleId: string | null; avatarUrl: string | null } | null> {
  // 1) نفس الـ UUID
  const byId = await db.user.findUnique({ where: { id: authUser.id } });
  if (byId) return byId;

  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const googleSub = typeof metadata.sub === "string" ? metadata.sub : null;
  const email = (authUser.email ?? "").toLowerCase();
  const avatar = typeof metadata.picture === "string" ? metadata.picture : null;

  // 2) googleId
  if (googleSub) {
    const byGoogle = await db.user.findUnique({ where: { googleId: googleSub } });
    if (byGoogle) return byGoogle;
  }

  // 3) البريد — ربط حساب قائم بالهوية الموثقة
  if (email) {
    const byEmail = await db.user.findUnique({ where: { email } });
    if (byEmail) {
      return db.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: googleSub ?? byEmail.googleId,
          provider: googleSub ? "GOOGLE" : byEmail.provider,
          avatarUrl: avatar ?? byEmail.avatarUrl,
        },
      });
    }
  }

  // 4) مستخدم جديد كليًا — إنشاء الصف بنفس UUID الرسمي
  try {
    const created = await db.user.create({
      data: {
        id: authUser.id,
        email: email || `${authUser.id}@no-email.supabase`,
        passwordHash: null,
        provider: googleSub ? "GOOGLE" : "EMAIL",
        googleId: googleSub,
        avatarUrl: avatar,
        role: ROLES.STUDENT,
        status: "ACTIVE",
      },
    });
    await logAudit({
      action: googleSub ? "STUDENT_REGISTERED_GOOGLE" : "STUDENT_REGISTERED",
      entity: "STUDENT",
      entityId: created.id,
      summary: `حساب جديد عبر Supabase Auth${googleSub ? " (Google)" : ""}: ${email}`,
    });
    return created;
  } catch {
    // سباق إنشاء (request مزدوج) — أعد القراءة
    return db.user.findUnique({ where: { id: authUser.id } });
  }
}

// ─── المستخدم الحالي ────────────────────────────────────────
export type SessionUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  customPermissions: string | null; // JSON صلاحيات مخصصة تتجاوز الدور
  avatarUrl?: string | null;
  avatarFrameId?: string | null;
  profileThemeId?: string | null;
  profile: {
    id: string;
    fullName: string;
    grade: string;
    section: string;
    gender: string;
    phone: string;
    phoneVerified: boolean;
    studentCode: string | null;
    discoverySource: string | null;
    joinReasons: string | null;
  } | null;
};

type DbUserWithProfile = {
  id: string;
  email: string;
  role: string;
  status: string;
  customPermissions: string | null;
  avatarUrl?: string | null;
  avatarFrameId?: string | null;
  profileThemeId?: string | null;
  profile: {
    id: string;
    fullName: string;
    grade: string;
    section: string;
    gender: string;
    phone: string;
    phoneVerified: boolean;
    studentCode: string | null;
    discoverySource: string | null;
    joinReasons: string | null;
  } | null;
};

function toSessionUser(user: DbUserWithProfile): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    customPermissions: user.customPermissions,
    avatarUrl: user.avatarUrl ?? null,
    avatarFrameId: user.avatarFrameId ?? null,
    profileThemeId: user.profileThemeId ?? null,
    profile: user.profile
      ? {
          id: user.profile.id,
          fullName: user.profile.fullName,
          grade: user.profile.grade,
          section: user.profile.section,
          gender: user.profile.gender,
          phone: user.profile.phone,
          phoneVerified: user.profile.phoneVerified,
          studentCode: user.profile.studentCode,
          discoverySource: user.profile.discoverySource,
          joinReasons: user.profile.joinReasons,
        }
      : null,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    // ── وضع Supabase: الهوية من Supabase Auth ثم ربطها بصف التطبيق ──
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return null;
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return null;

      const row = await resolveSupabaseAppUser(authUser);
      if (!row || row.status === "SUSPENDED") return null;

      // اجلب الملف المرتبط (إن وُجد)
      const profile = await db.studentProfile.findUnique({ where: { userId: row.id } });
      return toSessionUser({ ...row, profile });
    }

    // ── وضع التطوير المحلي: JWT ──
    const userId = await getSessionUserId();
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status === "SUSPENDED") return null;

    return toSessionUser(user);
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

// ─── حرس الصفحات (Server Components) ─────────────────────────

// صفحات الطالب — تحويل لصفحة الدخول إن لم يكن مسجلاً
// مستخدم Google بلا ملف طالب؟ → صفحة إكمال البيانات
// عليه بيانات إلزامية (طلب بيانات / كود طالب)؟ → بوابة البيانات المطلوبة
export async function requireStudent(
  opts?: { skipProfileCheck?: boolean; skipRequiredGate?: boolean }
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === ROLES.STUDENT) {
    if (!opts?.skipProfileCheck && !user.profile) redirect("/profile/complete");
    if (!opts?.skipRequiredGate) {
      const { getStudentGate } = await import("@/lib/gate");
      const gate = await getStudentGate(user);
      if (gate.blocked) redirect("/panel/required");
    }
    return user;
  }
  // أدمن دخل صفحة طالب — نحوّله لوجهته الطبيعية
  if (isAdminRole(user.role)) redirect("/admin");
  redirect("/login");
}

// صفحات الإدارة — تحويل لصفحة دخول الإدارة
export async function requireAdmin(module?: Module, action: Action = "view"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdminRole(user.role)) redirect("/panel");
  if (module && !canUser(user, module, action)) redirect("/admin?denied=1");
  return user;
}

// ─── حرس الـ Server Actions ──────────────────────────────────
// يرمي خطأ بدل التحويل (الأخطاء تُلتقط وتعرض كرسالة)
export async function requireActionUser(module?: Module, action: Action = "manage"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("انتهت الجلسة — سجّل دخولك مرة أخرى");
  if (!isAdminRole(user.role)) throw new Error("هذه العملية تتطلب صلاحيات إدارية");
  if (module && !canUser(user, module, action)) throw new Error("ليس لديك صلاحية لهذه العملية");
  return user;
}

export async function requireStudentAction(
  opts?: { skipRequiredGate?: boolean }
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("انتهت الجلسة — سجّل دخولك مرة أخرى");
  if (user.status === "SUSPENDED") throw new Error("حسابك معلق — تواصل مع إدارة اللجنة");
  if (user.role !== ROLES.STUDENT) throw new Error("هذه العملية للطلاب فقط");
  if (!opts?.skipRequiredGate) {
    const { getStudentGate } = await import("@/lib/gate");
    const gate = await getStudentGate(user);
    if (gate.blocked) {
      throw new Error("عليك بيانات إلزامية تنتظر تسليمها — افتح صفحة «البيانات المطلوبة» أولًا");
    }
  }
  return user;
}
