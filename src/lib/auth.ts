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

export function getSecret(): Uint8Array {
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

export function cleanAvatarUrl(url: string | null | undefined): string | null {
  if (!url || url === "INITIALS" || url.trim() === "") return null;
  // Google: ترقية الصورة المصغرة بأمان إلى دقة فائقة =s720-c
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+(-c)?$/i, "=s720-c");
  }
  // Facebook platform-lookaside: الرابط موقع بتوقيع رقمي (hash) من فيسبوك ويجب تركه دون تعديل
  if (url.includes("platform-lookaside.fbsbx.com") || url.includes("fbsbx.com")) {
    return url;
  }
  return url;
}

export async function resolveSupabaseAppUser(
  authUser: AuthUser
): Promise<{ id: string; email: string; role: string; status: string; customPermissions: string | null; provider: string; googleId: string | null; avatarUrl: string | null } | null> {
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const rawProvider = (authUser.app_metadata?.provider || "").toUpperCase();
  const providersList = ((authUser.app_metadata?.providers as string[] | undefined) || []).map((p) => p.toUpperCase());
  const identityProviders = (authUser.identities || []).map((i) => (i.provider || "").toUpperCase());
  const isGoogle =
    rawProvider === "GOOGLE" ||
    providersList.includes("GOOGLE") ||
    identityProviders.includes("GOOGLE") ||
    Boolean(metadata.iss && String(metadata.iss).toLowerCase().includes("google")) ||
    Boolean(metadata.iss && String(metadata.iss).includes("accounts.google.com")) ||
    Boolean(authUser.identities?.some((id) => id.provider?.toLowerCase() === "google"));

  const isFacebook =
    !isGoogle &&
    (rawProvider === "FACEBOOK" ||
      providersList.includes("FACEBOOK") ||
      identityProviders.includes("FACEBOOK") ||
      Boolean(metadata.iss && String(metadata.iss).toLowerCase().includes("facebook")) ||
      (typeof metadata.provider_id === "string" && metadata.provider_id.toLowerCase().includes("facebook")));

  const userProvider = isGoogle ? "GOOGLE" : isFacebook ? "FACEBOOK" : "EMAIL";

  const googleSub = isGoogle && typeof metadata.sub === "string" ? metadata.sub : null;
  const email = (authUser.email ?? "").toLowerCase();

  let rawAvatar: string | null = null;
  if (typeof metadata.avatar_url === "string" && metadata.avatar_url) {
    rawAvatar = metadata.avatar_url;
  } else if (typeof metadata.picture === "string" && metadata.picture) {
    rawAvatar = metadata.picture;
  } else if (metadata.picture && typeof metadata.picture === "object" && "data" in metadata.picture) {
    const picData = (metadata.picture as { data?: { url?: string } }).data;
    if (picData && typeof picData.url === "string") {
      rawAvatar = picData.url;
    }
  }
  const avatar = cleanAvatarUrl(rawAvatar);

  // 1) نفس الـ UUID
  const byId = await db.user.findUnique({ where: { id: authUser.id } });
  if (byId) {
    const isPresetAvatar = byId.avatarUrl?.startsWith("/avatars/");
    const isInitials = byId.avatarUrl === "INITIALS";
    const isOldBrokenFb = byId.avatarUrl?.includes("graph.facebook.com") || byId.avatarUrl?.includes("height=500&width=500");
    const isTinyGoogle = byId.avatarUrl?.includes("=s96-c");

    let updatedAvatarUrl = byId.avatarUrl;
    let needsAvatarUpdate = false;

    // لا نستبدل الصورة أبدًا إذا اختار الطالب بنفسه شخصية أفاتار أو الحروف الأولى
    if (!isPresetAvatar && !isInitials) {
      if (!byId.avatarUrl && avatar) {
        updatedAvatarUrl = avatar;
        needsAvatarUpdate = true;
      } else if ((isOldBrokenFb || isTinyGoogle) && avatar) {
        updatedAvatarUrl = avatar;
        needsAvatarUpdate = true;
      }
    }

    const needsProviderUpdate = byId.provider !== userProvider && userProvider !== "EMAIL";
    if (needsAvatarUpdate || needsProviderUpdate) {
      return db.user.update({
        where: { id: byId.id },
        data: {
          avatarUrl: updatedAvatarUrl,
          provider: needsProviderUpdate ? userProvider : byId.provider,
        },
      });
    }
    return byId;
  }

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
          provider: userProvider !== "EMAIL" ? userProvider : byEmail.provider,
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
        provider: userProvider,
        googleId: googleSub,
        avatarUrl: avatar,
        role: ROLES.STUDENT,
        status: "ACTIVE",
      },
    });
    await logAudit({
      action: userProvider === "FACEBOOK" ? "STUDENT_REGISTERED_FACEBOOK" : userProvider === "GOOGLE" ? "STUDENT_REGISTERED_GOOGLE" : "STUDENT_REGISTERED",
      entity: "STUDENT",
      entityId: created.id,
      summary: `حساب جديد عبر Supabase Auth (${userProvider}): ${email}`,
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
  provider?: string;
  suggestedName?: string | null;
  avatarUrl?: string | null;
  accountAvatarUrl?: string | null; // صورة الحساب الأصلية المستوردة من OAuth (Google/Facebook)
  avatarFrameId?: string | null;
  profileThemeId?: string | null;
  isImpersonated?: boolean;
  impersonatedByAdminEmail?: string;
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
  provider?: string;
  suggestedName?: string | null;
  avatarUrl?: string | null;
  accountAvatarUrl?: string | null;
  avatarFrameId?: string | null;
  profileThemeId?: string | null;
  isImpersonated?: boolean;
  impersonatedByAdminEmail?: string;
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
    provider: user.provider ?? "EMAIL",
    suggestedName: user.suggestedName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    accountAvatarUrl: user.accountAvatarUrl ?? null,
    avatarFrameId: user.avatarFrameId ?? null,
    profileThemeId: user.profileThemeId ?? null,
    isImpersonated: user.isImpersonated,
    impersonatedByAdminEmail: user.impersonatedByAdminEmail,
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
    // ── فحص وضع محاكاة الطالب (Impersonation) للمشرفين أولاً ──
    const store = await cookies();
    const impersonateToken = store.get("tc_impersonate")?.value;
    if (impersonateToken) {
      try {
        const { payload } = await jwtVerify(impersonateToken, getSecret());
        const adminId = payload.adminId as string;
        const targetUserId = payload.targetUserId as string;
        if (adminId && targetUserId) {
          const adminUser = await db.user.findUnique({ where: { id: adminId } });
          if (adminUser && isAdminRole(adminUser.role) && adminUser.status === "ACTIVE") {
            const studentUser = await db.user.findUnique({
              where: { id: targetUserId },
              include: { profile: true },
            });
            if (studentUser && studentUser.status !== "SUSPENDED") {
              const res = toSessionUser({
                ...studentUser,
                avatarUrl: studentUser.avatarUrl === "INITIALS" ? null : cleanAvatarUrl(studentUser.avatarUrl),
                accountAvatarUrl: studentUser.avatarUrl,
                isImpersonated: true,
                impersonatedByAdminEmail: adminUser.email,
              });
              return res;
            }
          }
        }
      } catch (err) {
        console.warn("[getCurrentUser] impersonateToken error:", err);
      }
    }

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

      // التأكد من تمرير صورة الحساب بنظافة ودقة عالية
      const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
      let rawMetaAvatar: string | null = null;
      if (typeof meta.avatar_url === "string" && meta.avatar_url) {
        rawMetaAvatar = meta.avatar_url;
      } else if (typeof meta.picture === "string" && meta.picture) {
        rawMetaAvatar = meta.picture;
      } else if (meta.picture && typeof meta.picture === "object" && "data" in meta.picture) {
        const picData = (meta.picture as { data?: { url?: string } }).data;
        if (picData && typeof picData.url === "string") {
          rawMetaAvatar = picData.url;
        }
      }
      const metaAvatar = cleanAvatarUrl(rawMetaAvatar);

      // تحديد الصورة النشطة المعروضة:
      // 1) إذا اختار الطالب يدويًا "INITIALS" تكون null لتعرض الحروف
      // 2) إذا اختار الطالب أفاتار (/avatars/...) أو أي رابط مخصص نستخدمه
      // 3) إذا لم يسبق للطالب تعيين صورة نستخدم صورة الحساب (metaAvatar)
      let finalAvatar: string | null = null;
      if (row.avatarUrl === "INITIALS") {
        finalAvatar = null;
      } else if (row.avatarUrl) {
        finalAvatar = cleanAvatarUrl(row.avatarUrl);
      } else {
        finalAvatar = metaAvatar;
      }

      const metaName =
        typeof meta.full_name === "string" && meta.full_name.trim()
          ? meta.full_name.trim()
          : typeof meta.name === "string" && meta.name.trim()
          ? meta.name.trim()
          : null;

      // اجلب الملف المرتبط (إن وُجد)
      const profile = await db.studentProfile.findUnique({ where: { userId: row.id } });
      return toSessionUser({
        ...row,
        avatarUrl: finalAvatar,
        accountAvatarUrl: metaAvatar,
        suggestedName: metaName,
        profile,
      });
    }

    // ── وضع التطوير المحلي: JWT ──
    const userId = await getSessionUserId();
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status === "SUSPENDED") return null;

    return toSessionUser({
      ...user,
      avatarUrl: user.avatarUrl === "INITIALS" ? null : cleanAvatarUrl(user.avatarUrl),
      accountAvatarUrl: user.avatarUrl,
    });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
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
