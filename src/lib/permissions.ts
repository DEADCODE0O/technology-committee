// ═══════════════════════════════════════════════════════════════
//  نظام الصلاحيات — من يفعل ماذا؟
//  طبقتان: افتراضي الدور + صلاحيات مخصصة لكل مستخدم (تجاوز الدور)
// ═══════════════════════════════════════════════════════════════

import { ROLES, type Role } from "./constants";

// الوحدات القابلة للإدارة
export const MODULES = {
  DASHBOARD: "dashboard",
  STUDENTS: "students",
  WORKSHOPS: "workshops", // الأنشطة والتنفيذات
  PROGRAMS: "programs",
  TASKS: "tasks",
  SURVEYS: "surveys",
  COMMUNITY: "community",
  ATTENDANCE_SCAN: "attendanceScan",
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
    tasks: "manage",
    surveys: "manage",
    community: "manage",
    attendanceScan: "manage",
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
    tasks: "manage",
    surveys: "manage",
    community: "manage",
    attendanceScan: "manage",
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
    tasks: "manage",
    surveys: "view",
    community: "view",
    attendanceScan: "manage",
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
    tasks: "view",
    surveys: "manage",
    community: "manage",
    attendanceScan: false,
    attendance: "view",
    points: "view",
    badges: "view",
    talents: "manage",
    dataRequests: "manage",
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
    tasks: "view",
    surveys: "view",
    community: "view",
    attendanceScan: false,
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
export const EDITABLE_MODULES: { key: Module; label: string; description?: string }[] = [
  { key: MODULES.DASHBOARD, label: "لوحة التحكم الرئيسية", description: "الاطلاع على الإحصائيات العامة للمنصة" },
  { key: MODULES.WORKSHOPS, label: "إدارة ورش العمل والأنشطة", description: "إنشاء وتعديل الورش والجلسات والتنفيذات" },
  { key: MODULES.TASKS, label: "المهام والتكليفات ورصد الدرجات", description: "إنشاء المهام ومتابعة التسليمات ووضع التقييمات" },
  { key: MODULES.SURVEYS, label: "الاستبيانات واستطلاعات الرأي", description: "إنشاء الاستبيانات وتحليل أصوات الطلاب والقرارات" },
  { key: MODULES.COMMUNITY, label: "المجتمع والمنشورات والتفاعلات", description: "إدارة وتثبيت المنشورات والتعليقات المعتمدة" },
  { key: MODULES.ATTENDANCE_SCAN, label: "فحص وتأكيد الحضور بالـ QR", description: "مسح كود الحضور الذكي في قاعات الفعاليات" },
  { key: MODULES.ATTENDANCE, label: "سجلات وكشوف الحضور", description: "استعراض سجلات الحضور والغياب والتصدير" },
  { key: MODULES.STUDENTS, label: "شؤون وبيانات الطلاب", description: "البحث في الطلاب وتعديل البيانات وحالات التنشيط" },
  { key: MODULES.POINTS, label: "منح وتعديل النقاط وXP", description: "منح نقاط تحفيزية وجماعية وتعديل الأحداث" },
  { key: MODULES.BADGES, label: "الشارات والأوسمة التنافسية", description: "إدارة الشارات ومنحها وسحبها من المتميزين" },
  { key: MODULES.NOTIFICATIONS, label: "الإشعارات والتنبيهات الموجهة", description: "إرسال التنبيهات المخصصة والبنرات المثبتة" },
  { key: MODULES.SURVEILLANCE, label: "المراقبة والإشراف الأمني", description: "رصد المحادثات وتدقيق البلاغات في وضع المراقب" },
  { key: MODULES.AUDIT, label: "سجل العمليات والتدقيق", description: "الاطلاع على التاريخ الكامل لمن فعل ماذا ومتى" },
  { key: MODULES.PROGRAMS, label: "البرامج والمسارات التعليمية", description: "إدارة المسارات الكبرى للأنشطة" },
  { key: MODULES.TALENTS, label: "المواهب والمهارات الطلابية", description: "فحص وتوثيق مواهب الطلاب المكتشفة" },
  { key: MODULES.DRIVE, label: "مكتبة الملفات والوسائط", description: "رفع وتنظيم ملفات وملخصات الورش" },
  { key: MODULES.NEWS, label: "الأخبار والإعلانات الرسمية", description: "تحرير الأخبار العامة للمنصة" },
  { key: MODULES.SETTINGS, label: "إعدادات المنصة والهوية", description: "تعديل إعدادات المواسم وضوابط النظام" },
  { key: MODULES.ADMINS, label: "إدارة المشرفين والصلاحيات", description: "تعيين المشرفين وتحديد الصلاحيات الدقيقة (خاص بالمدير الأعلى)" },
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
