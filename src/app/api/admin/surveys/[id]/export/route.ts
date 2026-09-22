import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS } from "@/lib/constants";
import { safeFileName, styleHeader, EXCEL_MIME, writeRowsByHeaders } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.DATA_REQUESTS, "view")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const survey = await db.dataRequest.findUnique({
    where: { id },
    include: {
      responses: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "survey not found" }, { status: 404 });
  }

  let fields: any[] = [];
  try {
    fields = JSON.parse(survey.fields);
  } catch {
    fields = [];
  }

  const baseHeaders = [
    "#",
    "اسم الطالب",
    "كود الطالب",
    "الفرقة الدراسية",
    "الشعبة",
    "رقم الهاتف",
    "البريد الإلكتروني",
    "الجنس",
    "تاريخ ووقت التصويت",
  ];

  const questionHeaders = fields.map(
    (f, idx) => `س${idx + 1}: ${f.label || f.question || "سؤال"}`
  );
  const headers = [...baseHeaders, ...questionHeaders];

  const rows = survey.responses.map((r, idx) => {
    let answers: Record<string, any> = {};
    try {
      answers = JSON.parse(r.answers);
    } catch {
      answers = {};
    }

    const prof = r.user.profile;
    const gradeKey = prof?.grade || "";
    const sectionKey = prof?.section || "";
    const genderKey = prof?.gender || "";

    const rowObj: Record<string, any> = {
      "#": idx + 1,
      "اسم الطالب": prof?.fullName || r.user.displayName || r.user.email,
      "كود الطالب": prof?.studentCode || "—",
      "الفرقة الدراسية": GRADE_LABELS[gradeKey] || gradeKey || "—",
      "الشعبة": SECTION_LABELS[sectionKey] || sectionKey || "—",
      "رقم الهاتف": prof?.phone || "—",
      "البريد الإلكتروني": r.user.email,
      "الجنس": GENDER_LABELS[genderKey] || genderKey || "—",
      "تاريخ ووقت التصويت": new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(r.submittedAt),
    };

    fields.forEach((f, fIdx) => {
      const qHeader = questionHeaders[fIdx];
      const val = answers[f.id];
      if (val === undefined || val === null || val === "") {
        rowObj[qHeader] = "—";
      } else if (Array.isArray(val)) {
        rowObj[qHeader] = val.join("، ");
      } else {
        rowObj[qHeader] = String(val);
      }
    });

    return rowObj;
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("كشف إجابات الاستبيان", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  writeRowsByHeaders(ws, headers, rows);
  styleHeader(ws, headers, 1);

  // تنسيق عرض الأعمدة
  ws.columns.forEach((col, idx) => {
    if (idx === 0) col.width = 6;
    else if (idx === 1) col.width = 28;
    else if (idx === 2) col.width = 16;
    else if (idx === 3 || idx === 4) col.width = 18;
    else if (idx === 5) col.width = 18;
    else if (idx === 6) col.width = 26;
    else if (idx === 7) col.width = 12;
    else if (idx === 8) col.width = 22;
    else col.width = 26;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `استبيان_${safeFileName(survey.title)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": EXCEL_MIME,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
