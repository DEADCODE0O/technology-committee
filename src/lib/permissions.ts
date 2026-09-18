// ═══════════════════════════════════════════════════════════════
//  نظام الصلاحيات — من يفعل ماذا؟
//  طبقتان: افتراضي الدور + صلاحيات مخصصة لكل مستخدم (تجاوز الدور)
// ═══════════════════════════════════════════════════════════════

import { ROLES, type Role } from "./constants";

// الوحدات القابلة للإدارة
export const MODULES = {
  DASHBOARD: "dashboard",
  STUDENTS: "students",
  WORKSHOPS: "workshops", // الأنشطة والتنفيذات (الاسم التاريخي محفوظ لسلامة الصلاحيات المخزنة)
  PROGRAMS: "programs",
  ATTENDANCE: "attendance",
  POINTS: "points",
  BADGES: "badges",
  TALENTS: "talents",
  DATA_REQUESTS: "dataRequests",
  NOTIFICATIONS: "notifications",
  DRIVE: "drive",
  NEWS: "news",
  SETTINGS: "settings",
  AUDIT: "audit",
  ADMINS: "admins",
  SURVEILLANCE: "surveillance",
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];
export type Action = "view" | "manage";

// الصلاحية المخصصة: {module: "manage" | "view" | false}
// القيمة غير الموجودة = اتباع افتراضي الدور
export type CustomPerms = Partial<Record<Module, Action | false>>;

type PermMap = Record<string, Record<Module, Action | false>>;

// خريطة الصلاحيات الافتراضية لكل دور
const PERMISSIONS: PermMap = {
  [ROLES.SUPER_ADMIN]: {
    dashboard: "manage",
    students: "manage",
    workshops: "manage",
    programs: "manage",
    attendance: "manage",
    points: "manage",
    badges: "manage",
    talents: "manage",
    dataRequests: "manage",
    notifications: "manage",
    drive: "manage",
    news: "manage",
    settings: "manage",
    audit: "manage",
    admins: "manage",
    surveillance: "manage",
  },
  [ROLES.ADMIN]: {
    dashboard: "manage",
    students: "manage",
    workshops: "manage",
    programs: "manage",
    attendance: "manage",
    points: "manage",
    badges: "manage",
    talents: "manage",
    dataRequests: "manage",
    notifications: "manage",
    drive: "manage",
    news: "manage",
    settings: "view",
    audit: "view",
    admins: false,
    surveillance: "view",
  },
  [ROLES.WORKSHOP_MANAGER]: {
    dashboard: "view",
    students: "view",
    workshops: "manage",
    programs: "manage",
    attendance: "manage",
    points: "manage",
    badges: "view",
    talents: "view",
    dataRequests: false,
    notifications: "manage",
    drive: "manage",
    news: false,
    settings: false,
    audit: "view",
    admins: false,
    surveillance: false,
  },
  [ROLES.CONTENT_MANAGER]: {
    dashboard: "view",
    students: "view",
    workshops: "view",
    programs: "view",
    attendance: "view",
    points: "view",
    badges: "view",
    talents: "manage",
    dataRequests: "view",
    notifications: "manage",
    drive: "manage",
    news: "manage",
    settings: false,
    audit: "view",
    admins: false,
    surveillance: false,
  },
  [ROLES.VIEWER]: {
    dashboard: "view",
    students: "view",
    workshops: "view",
    programs: "view",
    attendance: "view",
    points: "view",
    badges: "view",
    talents: "view",
    dataRequests: "view",
    notifications: "view",
    drive: "view",
    news: "view",
    settings: false,
    audit: "view",
    admins: false,
    surveillance: false,
  },
};

// الوحدات المعروضة في واجهة تعديل الصلاحيات (لكل مشرف)
export const EDITABLE_MODULES: { key: Module; label: string }[] = [
  { key: MODULES.DASHBOARD, label: "لوحة التحكم" },
  { key: MODULES.STUDENTS, label: "الطلاب" },
  { key: MODULES.WORKSHOPS, label: "الأنشطة والتنفيذات" },
  { key: MODULES.PROGRAMS, label: "البرامج" },
  { key: MODULES.SURVEILLANCE, label: "المراقبة والإشراف الأمني" },
  { key: MODULES.ATTENDANCE, label: "الحضور" },
  { key: MODULES.POINTS, label: "النقاط" },
  { key: MODULES.BADGES, label: "الشارات" },
  { key: MODULES.TALENTS, label: "المواهب" },
  { key: MODULES.DATA_REQUESTS, label: "طلبات البيانات" },
  { key: MODULES.NOTIFICATIONS, label: "الإشعارات" },
  { key: MODULES.DRIVE, label: "مكتبة درايف" },
  { key: MODULES.NEWS, label: "الأخبار" },
  { key: MODULES.SETTINGS, label: "الإعدادات" },
  { key: MODULES.AUDIT, label: "سجل العمليات" },
  { key: MODULES.ADMINS, label: "إدارة المشرفين" },
];

// قراءة الصلاحيات المخصصة من JSON بأمان
export function parseCustomPerms(raw: string | null | undefined): CustomPerms | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CustomPerms;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    // نبقي القيم الصحيحة فقط
    const clean: CustomPerms = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "manage" || v === "view" || v === false) {
        clean[k as Module] = v;
      }
    }
    return Object.keys(clean).length > 0 ? clean : null;
  } catch {
    return null;
  }
}

// الفحص الأساسي بالدور فقط (للتوافق مع الاستخدامات القديمة)
export function can(role: string | undefined, module: Module, action: Action = "view"): boolean {
  if (!role) return false;
  if (role === ROLES.SUPER_ADMIN) return true; // المدير الأعلى يفعل كل شيء دائمًا
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  const perm = perms[module];
  if (perm === false || !perm) return false;
  return perm === "manage" || perm === action;
}

// الفحص الموسع: دور + صلاحيات مخصصة للمستخدم
// الصلاحية المخصصة تتجاوز افتراضي الدور — المدير الأعلى دائمًا كامل
export function canUser(
  user: { role: string; customPermissions?: string | null | undefined } | null | undefined,
  module: Module,
  action: Action = "view"
): boolean {
  if (!user || !user.role) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;

  const custom = parseCustomPerms(user.customPermissions);
  if (custom && module in custom) {
    const v = custom[module];
    if (v === false) return false;
    if (v === "manage") return true;
    if (v === "view") return action === "view";
  }
  return can(user.role, module, action);
}

export function isAdminRole(role: string | undefined): boolean {
  return !!role && role !== ROLES.STUDENT && Object.prototype.hasOwnProperty.call(PERMISSIONS, role);
}
