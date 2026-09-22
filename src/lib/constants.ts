// ═══════════════════════════════════════════════════════════════
//  ثوابت المنصة — كل القوائم والقيم المعروفة
// ═══════════════════════════════════════════════════════════════

// ─── الأدوار ─────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  WORKSHOP_MANAGER: "WORKSHOP_MANAGER",
  CONTENT_MANAGER: "CONTENT_MANAGER",
  VIEWER: "VIEWER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "المدير الأعلى",
  ADMIN: "مدير",
  WORKSHOP_MANAGER: "مسؤول ورش",
  CONTENT_MANAGER: "مسؤول محتوى",
  VIEWER: "مشاهد",
  STUDENT: "طالب",
};

export const ADMIN_ROLES: string[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.WORKSHOP_MANAGER,
  ROLES.CONTENT_MANAGER,
  ROLES.VIEWER,
];

// ─── الفرقة ──────────────────────────────────────────────────
export const GRADES = [
  { value: "FIRST", label: "الفرقة الأولى" },
  { value: "SECOND", label: "الفرقة الثانية" },
  { value: "THIRD", label: "الفرقة الثالثة" },
  { value: "FOURTH", label: "الفرقة الرابعة" },
] as const;

export const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  GRADES.map((g) => [g.value, g.label])
);

// ─── الشعبة ──────────────────────────────────────────────────
export const SECTIONS = [
  { value: "IS", label: "نظم المعلومات" },
  { value: "COMMERCIAL", label: "علوم تجارية" },
  { value: "TOURISM", label: "سياحة" },
  { value: "LANGS", label: "لغات" },
] as const;

export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.value, s.label])
);

// ─── الجنس ───────────────────────────────────────────────────
export const GENDERS = [
  { value: "MALE", label: "ذكر" },
  { value: "FEMALE", label: "أنثى" },
] as const;

export const GENDER_LABELS: Record<string, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
};

// ─── كيف تعرفت على اللجنة (التنسيق للفرقة الأولى فقط) ─────────
export const DISCOVERY_SOURCES = [
  { value: "TANSIQ", label: "أثناء التنسيق", firstYearOnly: true },
  { value: "PARTY", label: "يوم حفل الاستقبال" },
  { value: "LECTURES", label: "من المدرجات" },
  { value: "MEMBER", label: "عن طريق أحد أعضاء اللجنة" },
  { value: "ADS", label: "عن طريق أحد الإعلانات" },
  { value: "OTHER", label: "مصدر آخر" },
] as const;

export const DISCOVERY_LABELS: Record<string, string> = Object.fromEntries(
  DISCOVERY_SOURCES.map((d) => [d.value, d.label])
);

// ─── أسباب الانضمام (اختيار متعدد) ───────────────────────────
export const JOIN_REASONS = [
  { value: "LEARNING", label: "التعلم والكورسات" },
  { value: "TALENTS", label: "المواهب وتنمية القدرات" },
  { value: "SPORTS", label: "الرياضة" },
  { value: "ARTS", label: "الفنون" },
  { value: "NEW", label: "تجربة أشياء جديدة" },
  { value: "CRAFTS", label: "أشغال يدوية" },
  { value: "EVENTS", label: "فعاليات وحفلات" },
  { value: "FRIENDS", label: "تكوين صداقات" },
  { value: "OTHER", label: "أخرى" },
] as const;

export const JOIN_REASON_LABELS: Record<string, string> = Object.fromEntries(
  JOIN_REASONS.map((j) => [j.value, j.label])
);

// ─── المواهب ─────────────────────────────────────────────────
export const TALENT_CATEGORIES = [
  { value: "TECH", label: "البرمجة والتكنولوجيا" },
  { value: "MEDIA_DESIGN", label: "التصميم وصناعة المحتوى" },
  { value: "PERFORMING", label: "المواهب الفنية والأدائية" },
  { value: "SPORTS", label: "الرياضة" },
  { value: "OTHER", label: "موهبة أخرى" },
] as const;

export const TALENT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  TECH: [
    { value: "WEB_DEV", label: "تطوير المواقع والويب" },
    { value: "MOBILE_DEV", label: "تطوير تطبيقات الهاتف" },
    { value: "AI_DATA", label: "الذكاء الاصطناعي والبيانات" },
    { value: "CYBER_SECURITY", label: "الأمن السيبراني" },
    { value: "ROBOTICS", label: "الروبوتات والأنظمة المدمجة" },
    { value: "NETWORKING", label: "الشبكات والدعم الفني" },
    { value: "OTHER", label: "أخرى في التكنولوجيا" },
  ],
  MEDIA_DESIGN: [
    { value: "GRAPHIC_DESIGN", label: "تصميم الجرافيك والـ Branding" },
    { value: "UI_UX", label: "تصميم واجهات المستخدم (UI/UX)" },
    { value: "VIDEO_EDITING", label: "المونتاج وصناعة الفيديو" },
    { value: "MOTION_GRAPHICS", label: "الموشن جرافيك والأنيميشن" },
    { value: "PHOTOGRAPHY", label: "التصوير الفوتوغرافي وصناعة الميديا" },
    { value: "CONTENT_WRITING", label: "كتابة وصناعة المحتوى" },
    { value: "OTHER", label: "أخرى في التصميم" },
  ],
  PERFORMING: [
    { value: "QURAN", label: "حفظ وتلاوة القرآن الكريم" },
    { value: "POETRY", label: "الشعر" },
    { value: "RECITATION", label: "الإلقاء والخطابة والتقديم" },
    { value: "NASHEED", label: "الإنشاد الديني" },
    { value: "HYMNS", label: "الترانيم" },
    { value: "DRAWING", label: "الرسم والفنون التشكيلية" },
    { value: "SINGING", label: "الغناء" },
    { value: "ACTING", label: "التمثيل" },
    { value: "MUSIC", label: "العزف" },
    { value: "OTHER", label: "أخرى" },
  ],
  SPORTS: [
    { value: "FOOTBALL", label: "كرة القدم" },
    { value: "BASKETBALL", label: "كرة السلة" },
    { value: "SWIMMING", label: "السباحة" },
    { value: "BODYBUILDING", label: "كمال الأجسام واللياقة" },
    { value: "MARTIAL", label: "فنون قتالية ودفاع عن النفس" },
    { value: "CHESS", label: "الشطرنج" },
    { value: "OTHER", label: "أخرى" },
  ],
  OTHER: [],
};

export const TALENT_CATEGORY_LABELS: Record<string, string> = {
  TECH: "برمجة وتكنولوجيا",
  MEDIA_DESIGN: "تصميم وميديا",
  PERFORMING: "فنية وأدائية",
  SPORTS: "رياضية",
  OTHER: "أخرى",
};

// ترجمة موهبة معينة إلى نص عربي
export function talentLabel(category: string, name: string, customName?: string | null): string {
  if (name === "OTHER") return customName || "موهبة أخرى";
  const list = TALENT_OPTIONS[category] || [];
  const found = list.find((t) => t.value === name);
  return found ? found.label : customName || name;
}

// الحد الأقصى للمواهب المسجلة لكل طالب (في التسجيل والملف الشخصي)
export const MAX_TALENTS = 5;

export const TALENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  VERIFIED: "موثّقة",
  REJECTED: "مرفوضة",
};

// ─── أنواع النشاط (Activity) ─────────────────────────────────
export const ACTIVITY_TYPES = [
  { value: "COURSE", label: "كورس", plural: "الكورسات", icon: "🎓", sessionWord: "محاضرة" },
  { value: "WORKSHOP", label: "ورشة", plural: "الورش", icon: "🛠️", sessionWord: "موعد الورشة" },
  { value: "EVENT", label: "فعالية", plural: "الفعاليات", icon: "🎪", sessionWord: "موعد الفعالية" },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.label])
);
export const ACTIVITY_TYPE_PLURAL: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.plural])
);
export const ACTIVITY_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.icon])
);
export const ACTIVITY_TYPE_SESSION_WORD: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.sessionWord])
);

// ─── حالة نشر النشاط (فقط — دورة الحياة تُشتق من تواريخ التنفيذ) ─
export const ACTIVITY_PUBLISH = [
  { value: "DRAFT", label: "مسودة — مخفية عن الطلاب" },
  { value: "PUBLISHED", label: "منشور — ظاهر للطلاب" },
  { value: "ARCHIVED", label: "مؤرشف — خارج الفهارس" },
] as const;

export const ACTIVITY_PUBLISH_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_PUBLISH.map((s) => [s.value, s.label])
);

// ─── مستوى النشاط ────────────────────────────────────────────
export const ACTIVITY_LEVELS = [
  { value: "BEGINNER", label: "مبتدئ" },
  { value: "INTERMEDIATE", label: "متوسط" },
  { value: "ADVANCED", label: "متقدم" },
] as const;

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_LEVELS.map((l) => [l.value, l.label])
);

// ─── أنواع الروابط (CTA الإشعارات والمواد) ──────────────────
export const LINK_TYPES = [
  { value: "WHATSAPP", label: "واتساب", icon: "💬", color: "#25D366" },
  { value: "TELEGRAM", label: "تليجرام", icon: "✈️", color: "#229ED9" },
  { value: "FACEBOOK", label: "فيسبوك", icon: "👥", color: "#1877F2" },
  { value: "INSTAGRAM", label: "انستجرام", icon: "📸", color: "#E4405F" },
  { value: "TIKTOK", label: "تيك توك", icon: "🎵", color: "#00F2FE" },
  { value: "YOUTUBE", label: "يوتيوب", icon: "▶️", color: "#FF0000" },
  { value: "DRIVE", label: "جوجل درايف", icon: "📁", color: "#1FA463" },
  { value: "FORM", label: "نموذج", icon: "📝", color: "#7B61FF" },
  { value: "GITHUB", label: "GitHub", icon: "🐙", color: "#24292F" },
  { value: "LINK", label: "رابط", icon: "🔗", color: "#c9a45c" },
] as const;

export const LINK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LINK_TYPES.map((l) => [l.value, l.label])
);
export const LINK_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  LINK_TYPES.map((l) => [l.value, l.icon])
);
export const LINK_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  LINK_TYPES.map((l) => [l.value, l.color])
);

// ─── أنواع الإشعارات ─────────────────────────────────────────
export const NOTIFICATION_TYPES = [
  { value: "IMPORTANT", label: "مهم — مثبت أعلى لوحة الطالب", icon: "📌" },
  { value: "WELCOME", label: "ترحيب بالطلاب الجدد / توجيه", icon: "👋" },
  { value: "ANNOUNCEMENT", label: "إعلان", icon: "📢" },
  { value: "TASK", label: "مهمة / تكليف", icon: "📋" },
  { value: "COMMUNITY", label: "المجتمع والتعليقات", icon: "💬" },
  { value: "POINTS", label: "النقاط والتكريم", icon: "🏆" },
  { value: "INFO", label: "معلومة", icon: "ℹ️" },
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.value, t.label])
);
export const NOTIFICATION_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.value, t.icon])
);

// ─── أنواع مرفقات درايف ──────────────────────────────────────
export const DRIVE_KINDS = [
  { value: "FILE", label: "ملف" },
  { value: "IMAGE", label: "صورة" },
  { value: "VIDEO", label: "فيديو" },
  { value: "FOLDER", label: "مجلد" },
  { value: "DOC", label: "مستند" },
  { value: "SHEET", label: "جدول" },
  { value: "LINK", label: "رابط عام" },
] as const;

export const DRIVE_KIND_LABELS: Record<string, string> = Object.fromEntries(
  DRIVE_KINDS.map((d) => [d.value, d.label])
);

// ─── حالة المحاضرة (Session) ─────────────────────────────────
export const SESSION_STATUSES = [
  { value: "SCHEDULED", label: "مجدولة" },
  { value: "DONE", label: "انتهت" },
  { value: "CANCELLED", label: "ملغاة" },
] as const;

export const SESSION_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  SESSION_STATUSES.map((s) => [s.value, s.label])
);

// ─── أنواع أسئلة الفورم الديناميكي ──────────────────────────
export const FORM_FIELD_TYPES = [
  { value: "TEXT", label: "نص قصير" },
  { value: "LONGTEXT", label: "نص طويل" },
  { value: "NUMBER", label: "رقم" },
  { value: "PHONE", label: "هاتف" },
  { value: "EMAIL", label: "بريد إلكتروني" },
  { value: "SELECT", label: "قائمة اختيار" },
  { value: "RADIO", label: "اختيار واحد" },
  { value: "CHECKBOX", label: "اختيار متعدد" },
  { value: "DATE", label: "تاريخ" },
  { value: "TIME", label: "وقت" },
  { value: "FILE", label: "ملف (PDF / صورة)" },
] as const;

export const FORM_FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FORM_FIELD_TYPES.map((f) => [f.value, f.label])
);

// ─── مصادر التسجيل ───────────────────────────────────────────
export const REGISTRATION_SOURCE_LABELS: Record<string, string> = {
  ACCOUNT: "حساب",
  MANUAL: "تسجيل يدوي",
  GUEST: "ضيف",
};

// ─── رسائل أخطاء الدخول بـ Google ────────────────────────────
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "الدخول بـ Google غير مفعّل حاليًا — يُضبط عند النشر (دليل DEPLOY.md)",
  google_failed: "تعذر إكمال الدخول بـ Google — حاول مرة أخرى",
  google_email: "بريد Google غير موثق — استخدم بريدًا موثقًا",
  google_admin: "حسابات الإدارة تسجل بالبريد وكلمة السر فقط من بوابة الإدارة",
  google_suspended: "هذا الحساب معلق — تواصل مع إدارة اللجنة",
  facebook_not_configured: "الدخول بـ Facebook غير مفعّل حاليًا",
  facebook_failed: "تعذر إكمال الدخول بـ Facebook — حاول مرة أخرى",
  facebook_email: "بريد Facebook غير موثق أو غير متوفر — استخدم طريقة أخرى",
  facebook_admin: "حسابات الإدارة تسجل بالبريد وكلمة السر فقط من بوابة الإدارة",
  facebook_suspended: "هذا الحساب معلق — تواصل مع إدارة اللجنة",
  oauth_failed: "تعذر إكمال تسجيل الدخول بالحساب الخارجي — حاول مرة أخرى",
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  REGISTERED: "مسجّل",
  WAITLISTED: "قائمة انتظار",
  CANCELLED: "ملغي",
};

// ─── قواعد النقاط الافتراضية ─────────────────────────────────
export const DEFAULT_POINT_RULES = [
  { action: "WORKSHOP_ATTENDANCE", label: "حضور نشاط", points: 10 },
  { action: "TASK_COMPLETION", label: "إنهاء مهمة", points: 20 },
  { action: "COMPETITION_WIN", label: "الفوز بمسابقة", points: 50 },
  { action: "COMPETITION_SECOND", label: "المركز الثاني", points: 35 },
  { action: "COMPETITION_THIRD", label: "المركز الثالث", points: 25 },
  { action: "EVENT_PARTICIPATION", label: "المشاركة في فعالية", points: 10 },
  { action: "SPECIAL_ACHIEVEMENT", label: "إنجاز مميز", points: 30 },
];

// ─── الشارات الافتراضية ──────────────────────────────────────
export const DEFAULT_BADGES = [
  { name: "الطالب النشط", description: "حضر 10 ورش أو أكثر خلال العام", icon: "🏆" },
  { name: "الموهبة المبدعة", description: "موهبة موثّقة ومميزة على المنصة", icon: "🎨" },
  { name: "خبير الورش", description: "حضر 15 ورشة أو أكثر", icon: "🎯" },
  { name: "عضو متميز", description: "إسهامات متكررة في أنشطة اللجنة", icon: "⭐" },
  { name: "أكبر مساهم", description: "أعلى مساهمة في الفعاليات خلال الترم", icon: "🥇" },
];

// ─── المستويات (تُحسب من مجموع النقاط) — 12 مستوى فصلي متكافئ مع الورش ─────
// متوافقة مع واقع الحضور الفصلي (10 إلى 15 ورشة + مهام وتكليفات)
export const LEVEL_THRESHOLDS: number[] = [
  0,   // Lv 1: 0 - 14 نقطة (بداية التسجيل)
  15,  // Lv 2: 15 نقطة (حضور ورشة أولى)
  35,  // Lv 3: 35 نقطة (حضور ورشتين)
  65,  // Lv 4: 65 نقطة (حضور 3 ورش)
  100, // Lv 5: 100 نقطة (حضور 4-5 ورش)
  145, // Lv 6: 145 نقطة (حضور 6-7 ورش)
  195, // Lv 7: 195 نقطة (حضور 8-9 ورش)
  250, // Lv 8: 250 نقطة (حضور 10-11 ورشة)
  310, // Lv 9: 310 نقطة (حضور 12-13 ورشة)
  375, // Lv 10: 375 نقطة (حضور 14-15 ورشة + تسليم مهام)
  445, // Lv 11: 445 نقطة (النخبة المتألقة)
  520, // Lv 12: 520 نقطة (قمة التميز الفصلي — العرش الأسمى)
];

export function levelFromPoints(points: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(12, Math.max(1, level));
}

export function nextLevelProgress(points: number): { current: number; next: number | null; progress: number } {
  const current = levelFromPoints(points);
  if (current >= 12) return { current: 12, next: null, progress: 100 };
  const nextThreshold = LEVEL_THRESHOLDS[current]; // عتبة المستوى التالي
  if (nextThreshold === undefined) return { current: 12, next: null, progress: 100 };
  const prevThreshold = LEVEL_THRESHOLDS[current - 1] ?? 0;
  const progress = Math.min(100, Math.max(0, Math.round(((points - prevThreshold) / (nextThreshold - prevThreshold)) * 100)));
  return { current, next: Math.min(12, current + 1), progress };
}

// ─── الفصل الدراسي الحالي (للوحة المتصدرين) ──────────────────
export function semesterStart(date = new Date()): Date {
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  // خريف: سبتمبر - يناير / ربيع: فبراير - يونيو / صيف: يوليو-أغسطس يتبع الربيع
  if (month >= 8) return new Date(year, 8, 1); // سبتمبر
  if (month >= 1) return new Date(year, 1, 1); // فبراير
  return new Date(year - 1, 8, 1); // يناير يتبع خريف العام السابق
}

export function monthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// ═════════ v5: التنفيذات والمهام والمواسم والمجتمع ═════════

// ─── التنفيذ / الدفعة (Run) ───────────────────────────────
export const RUN_WORD = { label: "تنفيذ" }; // «دفعة» للكورسات

// ─── المهام (Task) ─────────────────────────────────────────
export const TASK_SUBMISSION_TYPES = [
  { value: "TEXT", label: "نص" },
  { value: "FILE", label: "ملف" },
  { value: "LINK", label: "رابط" },
  { value: "TEXT_AND_FILE", label: "نص + ملف" },
  { value: "TEXT_AND_LINK", label: "نص + رابط" },
  { value: "GROUP", label: "جماعية (فريق)" },
] as const;
export const TASK_SUBMISSION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TASK_SUBMISSION_TYPES.map((t) => [t.value, t.label])
);

export const TASK_DISTRIBUTIONS = [
  { value: "ONE_TASK_FOR_EVERYONE", label: "مهمة واحدة للجميع", hint: "نفس التكليف يصل لكل المستهدفين" },
  { value: "RANDOM_TASK_PER_STUDENT", label: "مهمة عشوائية لكل طالب", hint: "لكل طالب نسخة عشوائية من البدائل — تثبت عند النشر" },
  { value: "BALANCED_RANDOM", label: "توزيع متوازن", hint: "البدائل موزعة بالتساوي على الطلاب" },
  { value: "TASK_POOL", label: "الطالب يختار من البدائل", hint: "الطالب يرى كل البدائل ويختار واحدة عند التسليم" },
] as const;
export const TASK_DISTRIBUTION_LABELS: Record<string, string> = Object.fromEntries(
  TASK_DISTRIBUTIONS.map((d) => [d.value, d.label])
);

export const TASK_STATUSES = [
  { value: "DRAFT", label: "مسودة" },
  { value: "PUBLISHED", label: "منشورة" },
  { value: "CLOSED", label: "مغلقة" },
] as const;
export const TASK_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
);

export const TASK_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "مكلَّف",
  SUBMITTED: "سلَّم",
  EVALUATED: "قُيِّم",
};

export const TASK_SUBMISSION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "بانتظار التقييم",
  EVALUATED: "قُيِّمت",
  RETURNED: "أُعيدت للتعديل",
};

// ─── المواسم (Season) ──────────────────────────────────────
export const SEASON_STATUSES = [
  { value: "UPCOMING", label: "قادم" },
  { value: "ACTIVE", label: "جارٍ" },
  { value: "ENDED", label: "منتهٍ" },
] as const;
export const SEASON_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  SEASON_STATUSES.map((s) => [s.value, s.label])
);

// ─── الإنجازات / التحديات (Quests) ─────────────────────────
export const QUEST_KINDS = [
  { value: "ATTEND_COUNT", label: "احضر عددًا من الأنشطة", unit: "نشاطًا" },
  { value: "TASK_COUNT", label: "أنجز عددًا من المهام", unit: "مهمة" },
  { value: "JOIN_EVENT", label: "شارك في فعاليات", unit: "فعالية" },
  { value: "COMPETITION", label: "شارك في مسابقات", unit: "مسابقة" },
  { value: "STREAK_WEEKS", label: "استمرارية أسابيع متتالية", unit: "أسبوعًا" },
] as const;
export const QUEST_KIND_LABELS: Record<string, string> = Object.fromEntries(
  QUEST_KINDS.map((q) => [q.value, q.label])
);

// ─── المكافآت (Rewards) ────────────────────────────────────
export const REWARD_TYPES = [
  { value: "BADGE", label: "شارة", icon: "🏅" },
  { value: "CERTIFICATE", label: "شهادة", icon: "📜" },
  { value: "RECOGNITION", label: "تقدير", icon: "⭐" },
  { value: "SPECIAL_INVITATION", label: "دعوة خاصة", icon: "✉️" },
  { value: "PHYSICAL", label: "مكافأة عينية", icon: "🎁" },
  { value: "OTHER", label: "أخرى", icon: "✨" },
] as const;
export const REWARD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REWARD_TYPES.map((r) => [r.value, r.label])
);

// ─── المجتمع (Community) ───────────────────────────────────
export const COMMUNITY_POST_TYPES = [
  { value: "NEWS", label: "خبر", icon: "📰", color: "#c9a45c" },
  { value: "ANNOUNCEMENT", label: "إعلان", icon: "📢", color: "#e6cb8b" },
  { value: "HIGHLIGHT", label: "لقطة مميزة", icon: "✨", color: "#f2e5c4" },
  { value: "ACHIEVEMENT", label: "إنجاز", icon: "🏆", color: "#ffd700" },
  { value: "ACTIVITY_UPDATE", label: "مستجدات نشاط", icon: "🔔", color: "#a3a099" },
] as const;
export const COMMUNITY_POST_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  COMMUNITY_POST_TYPES.map((p) => [p.value, p.label])
);
export const COMMUNITY_POST_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  COMMUNITY_POST_TYPES.map((p) => [p.value, p.icon])
);

export const COMMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  APPROVED: "معتمد",
  HIDDEN: "مخفي",
};

// ─── كشف النادي (Manifest) ─────────────────────────────────
export const REGISTRATION_SOURCE_LABELS_V5: Record<string, string> = {
  ...REGISTRATION_SOURCE_LABELS,
  GATE_ADDED: "أُضيف عند البوابة",
};

export const FEATURED_KINDS = [
  { value: "TOP_STUDENT", label: "الطالب الأول", icon: "🥇" },
  { value: "MOST_ACTIVE", label: "الأكثر نشاطًا", icon: "⚡" },
  { value: "OUTSTANDING_CONTRIBUTOR", label: "مساهم بارز", icon: "🌟" },
  { value: "CREATIVE", label: "طالب مبدع", icon: "🎨" },
  { value: "TOP_TEAM_MEMBER", label: "أفضل عضو فريق", icon: "🛡️" },
] as const;
export const FEATURED_KIND_LABELS: Record<string, string> = Object.fromEntries(
  FEATURED_KINDS.map((f) => [f.value, f.label])
);

// ─── مزودو الوسائط (Media providers) ───────────────────────
export const MEDIA_PROVIDERS = [
  { value: "YOUTUBE", label: "يوتيوب", icon: "▶️" },
  { value: "TELEGRAM", label: "تليجرام", icon: "✈️" },
  { value: "GOOGLE_DRIVE", label: "جوجل درايف", icon: "📁" },
  { value: "DIRECT_URL", label: "ملف مباشر", icon: "🎬" },
  { value: "SUPABASE", label: "تخزين المنصة", icon: "☁️" },
  { value: "OTHER", label: "مصدر آخر", icon: "🔗" },
] as const;
export const MEDIA_PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  MEDIA_PROVIDERS.map((m) => [m.value, m.label])
);
