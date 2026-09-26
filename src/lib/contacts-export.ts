// ═══════════════════════════════════════════════════════════════
//  محرك تصدير جهات الاتصال للهواتف (VCF / vCard 3.0 / CSV)
//  متوافق 100% مع هواتف أندرويد وآيفون وتطبيق واتساب وجهات اتصال جوجل
// ═══════════════════════════════════════════════════════════════

import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";

export interface ContactsExportOptions {
  format: "VCF" | "CSV_GOOGLE" | "CSV_EXCEL";
  phoneFormat: "LOCAL" | "INTERNATIONAL";
  prefix?: string;
  suffix?: string;
  enableGenderCustomization?: boolean;
  maleEmoji?: string;
  femaleEmoji?: string;
  maleSuffix?: string;
  femaleSuffix?: string;
  appendGrade?: boolean;
  appendSection?: boolean;
  grade?: string;
  section?: string;
  gender?: string;
  status?: string;
  q?: string;
  scope?: "ALL" | "CURRENT_FILTER";
}

export interface StudentContactSource {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  grade: string | null;
  section: string | null;
  gender: string | null;
  studentCode?: string | null;
  status?: string | null;
}

export interface FormattedContact {
  id: string;
  originalName: string;
  formattedName: string;
  phone: string;
  email: string;
  gradeLabel: string;
  sectionLabel: string;
  genderLabel: string;
  statusLabel: string;
  studentCode: string;
  note: string;
}

/** تنظيف وضبط رقم الهاتف (محلي 01... أو دولي +201...) */
export function normalizePhoneNumber(
  rawPhone: string,
  format: "LOCAL" | "INTERNATIONAL" = "LOCAL"
): string {
  if (!rawPhone) return "";
  // إزالة كل الحروف والرموز ما عدا الأرقام وعلامة +
  let clean = rawPhone.replace(/[^\d+]/g, "").trim();

  // تحويل الأرقام العربية/الفارسية إن وجدت
  clean = clean.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

  if (format === "INTERNATIONAL") {
    if (clean.startsWith("+20")) return clean;
    if (clean.startsWith("0020")) return "+" + clean.slice(2);
    if (clean.startsWith("20") && clean.length >= 12) return "+" + clean;
    if (clean.startsWith("01")) return "+2" + clean;
    if (clean.startsWith("1") && clean.length === 10) return "+20" + clean;
    return clean.startsWith("+") ? clean : "+" + clean;
  } else {
    // محلي
    if (clean.startsWith("+201")) return "0" + clean.slice(4);
    if (clean.startsWith("00201")) return "0" + clean.slice(5);
    if (clean.startsWith("201") && clean.length >= 12) return "0" + clean.slice(2);
    if (clean.startsWith("1") && clean.length === 10) return "0" + clean;
    return clean;
  }
}

/** تنسيق اسم جهة الاتصال وفق خيارات وتفضيلات المشرف */
export function formatContactName(
  student: StudentContactSource,
  options: ContactsExportOptions
): string {
  let name = (student.fullName || "").trim();
  if (!name) name = student.email.split("@")[0] || "طالب";

  // 1) إضافة مخصصات الجنس (بنين / بنات)
  let genderAdditions: string[] = [];
  if (options.enableGenderCustomization) {
    if (student.gender === "MALE") {
      if (options.maleSuffix?.trim()) genderAdditions.push(options.maleSuffix.trim());
      if (options.maleEmoji?.trim()) genderAdditions.push(options.maleEmoji.trim());
    } else if (student.gender === "FEMALE") {
      if (options.femaleSuffix?.trim()) genderAdditions.push(options.femaleSuffix.trim());
      if (options.femaleEmoji?.trim()) genderAdditions.push(options.femaleEmoji.trim());
    }
  }

  // 2) إضافة الفرقة والشعبة إن اختار المشرف
  let academicTags: string[] = [];
  if (options.appendGrade && student.grade) {
    const gl = GRADE_LABELS[student.grade] || student.grade;
    academicTags.push(gl);
  }
  if (options.appendSection && student.section) {
    const sl = SECTION_LABELS[student.section] || student.section;
    academicTags.push(sl);
  }

  // 3) دمج الأجزاء
  let result = name;

  // اللاحقة العامة (مثل: " + ( دراسات نوعية )")
  if (options.suffix?.trim()) {
    result += ` ${options.suffix.trim()}`;
  }

  // مخصصات الجنس
  if (genderAdditions.length > 0) {
    result += ` ${genderAdditions.join(" ")}`;
  }

  // مخصصات الفرقة والشعبة
  if (academicTags.length > 0) {
    result += ` (${academicTags.join(" - ")})`;
  }

  // البادئة العامة
  if (options.prefix?.trim()) {
    result = `${options.prefix.trim()} ${result}`;
  }

  // تنظيف المسافات المكررة
  return result.replace(/\s+/g, " ").trim();
}

/** تحويل بيانات الطلاب إلى مصفوفة جهات اتصال مهيأة */
export function buildFormattedContacts(
  students: StudentContactSource[],
  options: ContactsExportOptions
): FormattedContact[] {
  return students
    .filter((s) => Boolean(s.phone && s.phone.trim().length >= 8))
    .map((s) => {
      const formattedName = formatContactName(s, options);
      const phone = normalizePhoneNumber(s.phone, options.phoneFormat || "LOCAL");
      const gradeLabel = s.grade ? (GRADE_LABELS[s.grade] || s.grade) : "";
      const sectionLabel = s.section ? (SECTION_LABELS[s.section] || s.section) : "";
      const genderLabel = s.gender ? (GENDER_LABELS[s.gender] || s.gender) : "";
      const statusLabel = s.status === "ACTIVE" ? "نشط" : s.status === "PENDING_VERIFICATION" ? "بانتظار التحقق" : "معلق";
      const studentCode = s.studentCode || "";

      const noteParts: string[] = [];
      if (gradeLabel) noteParts.push(`الفرقة: ${gradeLabel}`);
      if (sectionLabel) noteParts.push(`الشعبة: ${sectionLabel}`);
      if (studentCode) noteParts.push(`كود الطالب: ${studentCode}`);
      noteParts.push("منصة اللجنة التكنولوجية");

      return {
        id: s.id,
        originalName: s.fullName || s.email,
        formattedName,
        phone,
        email: s.email,
        gradeLabel,
        sectionLabel,
        genderLabel,
        statusLabel,
        studentCode,
        note: noteParts.join(" | "),
      };
    });
}

/** توليد ملف VCF / vCard 3.0 متوافق عالمياً مع هواتف أندرويد وآيفون */
export function generateVCardString(contacts: FormattedContact[]): string {
  const cards: string[] = [];

  for (const c of contacts) {
    // تنظيف النصوص لمنع كسر بنية ملف الـ vCard
    const cleanFN = c.formattedName.replace(/[\r\n;]/g, " ").trim();
    const cleanPhone = c.phone.replace(/[\r\n]/g, "").trim();
    const cleanEmail = c.email.replace(/[\r\n]/g, "").trim();
    const cleanNote = c.note.replace(/[\r\n]/g, " - ").trim();

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N;CHARSET=UTF-8:;${cleanFN};;;`,
      `FN;CHARSET=UTF-8:${cleanFN}`,
      `TEL;TYPE=CELL,VOICE:${cleanPhone}`,
    ];

    if (cleanEmail) {
      lines.push(`EMAIL;TYPE=INTERNET:${cleanEmail}`);
    }

    lines.push("ORG;CHARSET=UTF-8:اللجنة التكنولوجية");

    if (cleanNote) {
      lines.push(`NOTE;CHARSET=UTF-8:${cleanNote}`);
    }

    lines.push("END:VCARD");
    cards.push(lines.join("\r\n"));
  }

  // فصل البطاقات بفاصل سطر
  return cards.join("\r\n\r\n") + "\r\n";
}

/** توليد ملف CSV متوافق مع استيراد Google Contacts (contacts.google.com) */
export function generateGoogleContactsCsv(contacts: FormattedContact[]): string {
  const headers = [
    "Name",
    "Given Name",
    "Family Name",
    "Mobile Phone",
    "E-mail 1 - Value",
    "Notes",
    "Organization 1 - Name",
  ];

  const rows = contacts.map((c) => {
    return [
      escapeCsv(c.formattedName),
      escapeCsv(c.formattedName),
      '""',
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(c.note),
      escapeCsv("اللجنة التكنولوجية"),
    ].join(",");
  });

  // إضافة BOM لضمان قراءة اللغة العربية بسلام
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

/** توليد ملف CSV عربي منسق متوافق مع Microsoft Excel لبيانات الاتصال */
export function generateArabicExcelCsv(contacts: FormattedContact[]): string {
  const headers = [
    "الاسم المسجل في الهاتف",
    "الاسم الأصلي",
    "رقم الهاتف",
    "البريد الإلكتروني",
    "الفرقة",
    "الشعبة",
    "الجنس",
    "الحالة",
    "كود الطالب",
    "ملاحظات",
  ];

  const rows = contacts.map((c) => {
    return [
      escapeCsv(c.formattedName),
      escapeCsv(c.originalName),
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(c.gradeLabel),
      escapeCsv(c.sectionLabel),
      escapeCsv(c.genderLabel),
      escapeCsv(c.statusLabel),
      escapeCsv(c.studentCode),
      escapeCsv(c.note),
    ].join(",");
  });

  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

function escapeCsv(value: string): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}
