import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import {
  GRADE_LABELS,
  SECTION_LABELS,
  GENDER_LABELS,
  TALENT_CATEGORY_LABELS,
  talentLabel,
  JOIN_REASON_LABELS,
} from "@/lib/constants";
import { EXCEL_MIME, safeFileName, sanitizeCellValue, styleHeader } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.TALENTS, "view")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "").trim();
  const talentName = (url.searchParams.get("talent") || "").trim();
  const reason = (url.searchParams.get("reason") || "").trim();
  const grade = (url.searchParams.get("grade") || "").trim();
  const section = (url.searchParams.get("section") || "").trim();
  const gender = (url.searchParams.get("gender") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();

  // 1. شروط ملف الطالب (Profile conditions)
  const profileCond: Record<string, unknown> = {};
  if (["FIRST", "SECOND", "THIRD", "FOURTH"].includes(grade)) profileCond.grade = grade;
  if (["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(section)) profileCond.section = section;
  if (["MALE", "FEMALE"].includes(gender)) profileCond.gender = gender;
  if (reason) profileCond.joinReasons = { contains: reason };

  // 2. شروط المواهب (Talents conditions)
  const talentCond: Record<string, unknown> = {};
  if (category) talentCond.category = category;
  if (talentName) talentCond.name = talentName;
  if (status && ["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
    talentCond.status = status;
  }

  // 3. بناء استعلام User
  const userWhere: Record<string, unknown> = {
    role: "STUDENT",
  };

  if (Object.keys(profileCond).length > 0) {
    userWhere.profile = { is: profileCond };
  }

  if (Object.keys(talentCond).length > 0) {
    userWhere.talents = {
      some: talentCond,
    };
  }

  if (q) {
    userWhere.OR = [
      { email: { contains: q } },
      { profile: { is: { fullName: { contains: q } } } },
      { profile: { is: { phone: { contains: q } } } },
      { profile: { is: { studentCode: { contains: q } } } },
      {
        talents: {
          some: {
            OR: [
              { customName: { contains: q } },
              { description: { contains: q } },
            ],
          },
        },
      },
    ];
  }

  // جلب كافة الطلاب المطابقين
  const students = await db.user.findMany({
    where: userWhere,
    include: {
      profile: true,
      talents: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // إعداد اسم الملف بناءً على الفلتر
  let filterTitle = "كافة_المواهب_والرغبات";
  if (talentName) {
    filterTitle = talentLabel(category, talentName) || talentName;
  } else if (category) {
    filterTitle = TALENT_CATEGORY_LABELS[category] || category;
  } else if (reason) {
    filterTitle = `رغبة_${JOIN_REASON_LABELS[reason] || reason}`;
  }

  const exportDate = new Date().toISOString().slice(0, 10);
  const fileName = safeFileName(`كشف_طلاب_${filterTitle}_${exportDate}`) + ".xlsx";

  // بناء مصنف إكسيل
  const wb = new ExcelJS.Workbook();
  wb.creator = "المعهد العالي للدراسات النوعية بالجيزة";
  wb.created = new Date();

  const ws = wb.addWorksheet("كشف الطلاب", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });

  // العنوان الإداري الرئيسي (الصف 1 و 2)
  ws.mergeCells("A1:M1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `المعهد العالي للدراسات النوعية بالجيزة — وحدة الأنشطة واللجان الطلابية | كشف الطلاب: ${filterTitle.replace(/_/g, " ")}`;
  titleCell.font = { name: "Cairo", size: 14, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  ws.getRow(1).height = 36;

  ws.mergeCells("A2:M2");
  const subTitleCell = ws.getCell("A2");
  subTitleCell.value = `إجمالي عدد الطلاب المطابقين: ${students.length} طالب وطالبة | تاريخ الاستخراج: ${new Date().toLocaleDateString("ar-EG")}`;
  subTitleCell.font = { name: "Cairo", size: 10, italic: true, color: { argb: "FF64748B" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 24;

  const headers = [
    "#",
    "كود الطالب",
    "اسم الطالب بالكامل",
    "الفرقة الدراسية",
    "الشعبة الأكاديمية",
    "النوع",
    "رقم الهاتف / واتساب",
    "البريد الإلكتروني",
    "الموهبة المستهدفة",
    "مجال الموهبة",
    "حالة الاعتماد",
    "كافة المواهب المسجلة",
    "أهداف ورغبات الانضمام",
  ];

  const headerRow = ws.getRow(3);
  headerRow.values = headers;
  headerRow.height = 32;

  // تنسيق ترويسة الجدول
  styleHeader(ws, headers, 3);

  // أعراض الأعمدة التناسبية
  const colWidths = [6, 16, 28, 16, 20, 10, 18, 26, 22, 20, 14, 34, 30];
  ws.columns = headers.map((header, idx) => ({
    header,
    width: colWidths[idx] || 18,
  }));

  // تفريغ أسباب الانضمام من JSON أو نصوص
  function parseReasons(raw: unknown): string {
    if (!raw) return "";
    let arr: string[] = [];
    if (Array.isArray(raw)) {
      arr = raw as string[];
    } else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed;
        else arr = [raw];
      } catch {
        arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return arr
      .map((r) => JOIN_REASON_LABELS[r] || r)
      .filter(Boolean)
      .join("، ");
  }

  // إضافة البيانات
  students.forEach((s, index) => {
    // تحديد الموهبة المستهدفة حسب الفلتر أو الموهبة الأولى
    const matchedTalent = s.talents.find((t) => {
      if (talentName && t.name === talentName) return true;
      if (category && t.category === category) return true;
      return false;
    }) || s.talents[0];

    const targetTalentName = matchedTalent
      ? talentLabel(matchedTalent.category, matchedTalent.name, matchedTalent.customName)
      : "لا توجد موهبة مسجلة";

    const targetCategoryName = matchedTalent
      ? TALENT_CATEGORY_LABELS[matchedTalent.category] || matchedTalent.category
      : "—";

    const targetStatus = matchedTalent
      ? matchedTalent.status === "VERIFIED"
        ? "معتمدة ✓"
        : matchedTalent.status === "REJECTED"
        ? "مرفوضة ✗"
        : "قيد المراجعة"
      : "—";

    const allTalentsStr = s.talents
      .map((t) => talentLabel(t.category, t.name, t.customName))
      .filter(Boolean)
      .join("، ");

    const joinReasonsStr = parseReasons(s.profile?.joinReasons);

    const rowData = [
      index + 1,
      s.profile?.studentCode || "—",
      s.profile?.fullName || "بدون اسم",
      GRADE_LABELS[s.profile?.grade || ""] || s.profile?.grade || "—",
      SECTION_LABELS[s.profile?.section || ""] || s.profile?.section || "—",
      GENDER_LABELS[s.profile?.gender || ""] || s.profile?.gender || "—",
      s.profile?.phone || "—",
      s.email || "—",
      targetTalentName,
      targetCategoryName,
      targetStatus,
      allTalentsStr || "—",
      joinReasonsStr || "—",
    ].map((v) => sanitizeCellValue(v));

    const row = ws.addRow(rowData);
    row.height = 24;

    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Cairo", size: 10, color: { argb: "FF1E293B" } };
      cell.alignment = {
        horizontal: colNumber === 1 || colNumber === 2 || colNumber === 6 || colNumber === 7 || colNumber === 11 ? "center" : "right",
        vertical: "middle",
        wrapText: true,
      };

      if (!isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFF1F5F9" } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": EXCEL_MIME,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
