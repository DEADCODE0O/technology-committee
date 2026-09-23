import {
  LayoutDashboard,
  TrendingUp,
  Eye,
  FolderKanban,
  Sparkles,
  ClipboardCheck,
  Users,
  MessagesSquare,
  BarChart3,
  Palette,
  ClipboardList,
  Zap,
  Medal,
  Swords,
  Trophy,
  ShieldCheck,
  Bell,
  FolderOpen,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { MODULES, type Module } from "@/lib/permissions";

export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  iconKey: string;
  module: Module;
  category: string;
  badge?: string;
}

export const ADMIN_CATEGORIES = [
  "الرئيسية والاستخبارات",
  "الأنشطة والتعليم",
  "الطلاب والمجتمع",
  "التحفيز والمنافسة",
  "النظام والحوكمة",
] as const;

export const ADMIN_NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  analytics: TrendingUp,
  surveillance: Eye,
  activities: FolderKanban,
  programs: Sparkles,
  tasks: ClipboardCheck,
  students: Users,
  community: MessagesSquare,
  surveys: BarChart3,
  talents: Palette,
  dataRequests: ClipboardList,
  points: Zap,
  badges: Medal,
  teams: Swords,
  seasons: Trophy,
  admins: ShieldCheck,
  notifications: Bell,
  drive: FolderOpen,
  audit: ScrollText,
  settings: Settings,
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // 1. الرئيسية والاستخبارات
  {
    key: "dashboard",
    label: "لوحة التحكم",
    href: "/admin",
    iconKey: "dashboard",
    module: MODULES.DASHBOARD,
    category: "الرئيسية والاستخبارات",
  },
  {
    key: "analytics",
    label: "الاستخبارات والقرارات",
    href: "/admin/analytics",
    iconKey: "analytics",
    module: MODULES.DASHBOARD,
    category: "الرئيسية والاستخبارات",
  },
  {
    key: "surveillance",
    label: "المراقبة والإشراف",
    href: "/admin/surveillance",
    iconKey: "surveillance",
    module: MODULES.SURVEILLANCE,
    category: "الرئيسية والاستخبارات",
  },

  // 2. الأنشطة والتعليم
  {
    key: "activities",
    label: "الأنشطة والتنفيذات",
    href: "/admin/activities",
    iconKey: "activities",
    module: MODULES.WORKSHOPS,
    category: "الأنشطة والتعليم",
  },
  {
    key: "programs",
    label: "البرامج التعليمية",
    href: "/admin/programs",
    iconKey: "programs",
    module: MODULES.PROGRAMS,
    category: "الأنشطة والتعليم",
  },
  {
    key: "tasks",
    label: "المهام والتكليفات",
    href: "/admin/tasks",
    iconKey: "tasks",
    module: MODULES.TASKS,
    category: "الأنشطة والتعليم",
  },

  // 3. الطلاب والمجتمع
  {
    key: "students",
    label: "شؤون الطلاب",
    href: "/admin/students",
    iconKey: "students",
    module: MODULES.STUDENTS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "community",
    label: "منشورات المجتمع",
    href: "/admin/community",
    iconKey: "community",
    module: MODULES.COMMUNITY,
    category: "الطلاب والمجتمع",
  },
  {
    key: "surveys",
    label: "الاستبيانات والقرارات",
    href: "/admin/surveys",
    iconKey: "surveys",
    module: MODULES.SURVEYS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "talents",
    label: "بنك المواهب",
    href: "/admin/talents",
    iconKey: "talents",
    module: MODULES.TALENTS,
    category: "الطلاب والمجتمع",
  },
  {
    key: "dataRequests",
    label: "طلبات البيانات",
    href: "/admin/data-requests",
    iconKey: "dataRequests",
    module: MODULES.DATA_REQUESTS,
    category: "الطلاب والمجتمع",
  },

  // 4. التحفيز والمنافسة
  {
    key: "points",
    label: "نظام النقاط",
    href: "/admin/points",
    iconKey: "points",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },
  {
    key: "badges",
    label: "الشارات والأوسمة",
    href: "/admin/badges",
    iconKey: "badges",
    module: MODULES.BADGES,
    category: "التحفيز والمنافسة",
  },
  {
    key: "teams",
    label: "الفرق والمجموعات",
    href: "/admin/teams",
    iconKey: "teams",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },
  {
    key: "seasons",
    label: "المواسم والإنجازات",
    href: "/admin/seasons",
    iconKey: "seasons",
    module: MODULES.POINTS,
    category: "التحفيز والمنافسة",
  },

  // 5. النظام والحوكمة
  {
    key: "admins",
    label: "إدارة المشرفين",
    href: "/admin/admins",
    iconKey: "admins",
    module: MODULES.ADMINS,
    category: "النظام والحوكمة",
  },
  {
    key: "notifications",
    label: "مركز الإشعارات",
    href: "/admin/notifications",
    iconKey: "notifications",
    module: MODULES.NOTIFICATIONS,
    category: "النظام والحوكمة",
  },
  {
    key: "drive",
    label: "مكتبة درايف",
    href: "/admin/drive",
    iconKey: "drive",
    module: MODULES.DRIVE,
    category: "النظام والحوكمة",
  },
  {
    key: "audit",
    label: "مركز التدقيق والأمان",
    href: "/admin/audit",
    iconKey: "audit",
    module: MODULES.AUDIT,
    category: "النظام والحوكمة",
  },
  {
    key: "settings",
    label: "إعدادات المنصة",
    href: "/admin/settings",
    iconKey: "settings",
    module: MODULES.SETTINGS,
    category: "النظام والحوكمة",
  },
];
