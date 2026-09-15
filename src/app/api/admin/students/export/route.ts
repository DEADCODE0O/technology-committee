import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import { findTargetedStudentIds } from "@/lib/targeting";
import { logAudit } from "@/lib/platform";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, DISCOVERY_LABELS, talentLabel, levelFromPoints } from "@/lib/constants";
import { EXCEL_MIME, safeFileName, sanitizeCellValue } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.STUDENTS, "manage")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const grade = url.searchParams.get("grade") || "";
  const section = url.searchParams.get("section") || "";
  const gender = url.searchParams.get("gender") || "";
  const status = url.searchParams.get("status") || "";
  const attendance = url.searchParams.get("attendance") || "";
  const talent = url.searchParams.get("talent") || "";
  const minPoints = Number(url.searchParams.get("minPoints") || 0) || 0;

  const where: Record<string, unknown> = { role: "STUDENT" };
  if (status === "ACTIVE" || status === "SUSPENDED") where.status = status;
  const profileCond: Record<string, unknown> = {};
  if (["FIRST", "SECOND", "THIRD", "FOURTH"].includes(grade)) profileCond.grade = grade;
  if (["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(section)) profileCond.section = section;
  if (["MALE", "FEMALE"].includes(gender)) profileCond.gender = gender;
  if (Object.keys(profileCond).length) where.profile = { is: profileCond };
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { profile: { is: { fullName: { contains: q } } } },
      { profile: { is: { phone: { contains: q } } } },
      { profile: { is: { studentCode: { contains: q } } } },
    ];
  }
  if (attendance || talent || minPoints) {
    const ids = await findTargetedStudentIds({
      grades: profileCond.grade ? [profileCond.grade as string] : [],
      sections: profileCond.section ? [profileCond.section as string] : [],
      genders: profileCond.gender ? [profileCond.gender as string] : [],
      attendance: attendance === "ATTENDED" || attendance === "NOT_ATTENDED" ? attendance : "ANY",
      talent: talent === "HAS" || talent === "VERIFIED" || talent === "NONE" ? talent : "ANY",
      minPoints: minPoints || null,
      userIds: [],
      sessionId: null,
      runId: null,
      activityId: null,
      programId: null,
      teamId: null,
      scope: "REGISTERED",

    });
    where.id = { in: ids };
  }

  const students = await db.user.findMany({
    where,
    include: { profile: true, talents: { orderBy: { createdAt: "asc" } }, pointEvents: { select: { points: true } }, studentData: true },
    orderBy: { createdAt: "asc" },
  });

  const dynamicKeys = Array.from(new Set(students.flatMap((s) => s.studentData.map((d) => d.label))));
  const headers = ["#", "الاسم الكامل", "البريد", "الهاتف", "الفرقة", "الشعبة", "الجنس", "كود الطالب", "الحالة", "مصدر التعارف", "أسباب الانضمام", "النقاط", "المستوى", "المواهب", ...dynamicKeys];
  const wb = new ExcelJS.Workbook();
  wb.creator = "Technology Committee Platform";
  const ws = wb.addWorksheet("الطلاب", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.addRow(headers);
  ws.columns = headers.map((header) => ({ header, width: Math.max(13, Math.min(34, header.length * 1.8)) }));
  styleHeaderLocal(ws, headers);

  students.forEach((s, i) => {
    const points = s.pointEvents.reduce((sum, p) => sum + p.points, 0);
    const dataMap = new Map(s.studentData.map((d) => [d.label, parseSaved(d.value)]));
    const rows = [
      i + 1,
      s.profile?.fullName ?? "",
      s.email,
      s.profile?.phone ?? "",
      GRADE_LABELS[s.profile?.grade ?? ""] ?? "",
      SECTION_LABELS[s.profile?.section ?? ""] ?? "",
      GENDER_LABELS[s.profile?.gender ?? ""] ?? "",
      s.profile?.studentCode ?? "",
      s.status === "ACTIVE" ? "نشط" : "موقوف",
      DISCOVERY_LABELS[s.profile?.discoverySource ?? ""] ?? s.profile?.discoverySource ?? "",
      parseJoinReasons(s.profile?.joinReasons),
      points,
      levelFromPoints(points),
      s.talents.map((t) => `${talentLabel(t.category, t.name, t.customName)}${t.status === "VERIFIED" ? " ✓" : ""}`).join("، "),
      ...dynamicKeys.map((key) => dataMap.get(key) ?? ""),
    ].map((val) => sanitizeCellValue(val));
    const row = ws.addRow(rows);
    row.eachCell((cell, col) => {
      cell.font = { name: "Cairo", size: 10, color: { argb: "FF202020" } };
      cell.alignment = { horizontal: col === 1 ? "center" : "right", vertical: "middle", wrapText: true };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F2E6" } };
    });
  });

  await logAudit({ actor: user, action: "STUDENTS_EXCEL_EXPORTED", entity: "STUDENT", summary: `تصدير قاعدة الطلاب — ${students.length} طالب` });
  const buffer = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`قاعدة الطلاب - ${new Date().toISOString().slice(0, 10)}.xlsx`);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": EXCEL_MIME, "Content-Disposition": `attachment; filename*=UTF-8''${filename}`, "Cache-Control": "no-store" } });
}

function parseSaved(raw: string): string {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.join("، ") : String(v);
  } catch { return raw; }
}
function parseJoinReasons(raw?: string | null): string {
  if (!raw) return "";
  try { return (JSON.parse(raw) as string[]).map((x) => x.startsWith("OTHER:") ? `أخرى: ${x.slice(6)}` : x).join("، "); } catch { return raw; }
}
function styleHeaderLocal(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.getRow(1);
  for (let i = 1; i <= headers.length; i++) {
    const c = row.getCell(i);
    c.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FF111111" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6CB8B" } };
  }
  row.height = 30;
}
