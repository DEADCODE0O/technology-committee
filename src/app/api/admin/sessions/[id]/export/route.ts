import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import { logAudit } from "@/lib/platform";
import { GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, REGISTRATION_SOURCE_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { createWorkbookFromTemplate, ensureSheet, getHeaderMap, safeFileName, styleHeader, EXCEL_MIME, sanitizeCellValue } from "@/lib/excel";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.WORKSHOPS, "manage")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const grade = url.searchParams.get("grade") || "";
  const section = url.searchParams.get("section") || "";
  const gender = url.searchParams.get("gender") || "";
  const status = url.searchParams.get("status") || "REGISTERED";
  const source = url.searchParams.get("source") || "";
  const manifest = url.searchParams.get("manifest") === "1"; // كشف النادي الرسمي

  const session = await db.session.findUnique({
    where: { id },
    include: {
      activity: { include: { formFields: { orderBy: { order: "asc" } } } },
      registrations: { orderBy: { createdAt: "asc" }, include: { attendance: true } },
    },
  });
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });
  const formFields = session.activity.formFields;

  const registrations = session.registrations.filter((r) => {
    if (manifest && !r.inManifest && r.source !== "GATE_ADDED") return false;
    if (manifest && r.status === "CANCELLED") return false;
    if (status !== "ALL" && r.status !== status) return false;
    if (source && r.source !== source) return false;
    if (grade && r.grade !== grade) return false;
    if (section && r.section !== section) return false;
    if (gender && r.gender !== gender) return false;
    if (q) {
      const hay = [r.fullName, r.phone, r.email, r.studentCode].filter(Boolean).join(" ").toLocaleLowerCase("ar");
      if (!hay.includes(q.toLocaleLowerCase("ar"))) return false;
    }
    return true;
  });

  const wb = await createWorkbookFromTemplate(session.excelTemplateUrl);
  const ws = ensureSheet(wb, "المشاركون");
  ws.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  const headers = ["#", "الاسم الكامل", "الهاتف", "البريد", "الفرقة", "الشعبة", "الجنس", "كود الطالب", "مصدر التسجيل", "الحالة", "الحضور", ...(manifest ? ["حالة الكشف"] : []), ...formFields.map((f) => f.label)];

  // القالب قد يحتوي عنوانًا/شعارًا قبل صف العناوين، لذلك نبحث عن أول صف مفهوم للعناوين.
  const headerRow = findHeaderRow(ws) ?? 1;
  let headerMap = getHeaderMap(ws, headerRow);
  if (headerMap.size === 0) {
    ws.getRow(headerRow).values = headers;
    styleHeader(ws, headers, headerRow);
    headerMap = getHeaderMap(ws, headerRow);
  }

  // أي عمود مطلوب وغير موجود في القالب يُضاف بعد آخر عمود، بدون إفساد تصميم القالب.
  let nextColumn = Math.max(0, ...Array.from(headerMap.values())) + 1;
  for (const h of headers) {
    if (!headerMap.has(h)) {
      ws.getRow(headerRow).getCell(nextColumn).value = h;
      headerMap.set(h, nextColumn);
      styleHeaderCell(ws.getRow(headerRow).getCell(nextColumn));
      nextColumn++;
    }
  }

  const dataStartRow = headerRow + 1;
  registrations.forEach((reg, i) => {
    const row = ws.getRow(dataStartRow + i);
    let answers: Record<string, unknown> = {};
    try { answers = reg.answers ? JSON.parse(reg.answers) : {}; } catch {}
    const values: Record<string, unknown> = {
      "#": i + 1,
      "الاسم الكامل": reg.fullName,
      "الهاتف": reg.phone ?? "",
      "البريد": reg.email ?? "",
      "الفرقة": GRADE_LABELS[reg.grade ?? ""] ?? "",
      "الشعبة": SECTION_LABELS[reg.section ?? ""] ?? "",
      "الجنس": GENDER_LABELS[reg.gender ?? ""] ?? "",
      "كود الطالب": reg.studentCode ?? "",
      "مصدر التسجيل": REGISTRATION_SOURCE_LABELS[reg.source] ?? reg.source,
      "الحالة": REGISTRATION_STATUS_LABELS[reg.status] ?? reg.status,
      "الحضور": reg.attendance.length > 0 ? (reg.attendance.some((a) => a.present) ? "حضر" : "غائب") : "—",
    };
    if (manifest) {
      const att = reg.attendance.find((a) => a.sessionId === reg.sessionId);
      values["حالة الكشف"] = att
        ? att.present
          ? att.status === "LATE" ? `متأخر ${att.lateMinutes ?? 1} د` : "حضر"
          : "غائب"
        : reg.status === "WAITLISTED" ? "قائمة انتظار" : "لم يُسجل";
    }
    formFields.forEach((f) => {
      const v = answers[f.id];
      values[f.label] = Array.isArray(v) ? v.join(" / ") : v ?? "";
    });
    for (const [header, col] of headerMap) {
      row.getCell(col).value = sanitizeCellValue(values[header] ?? "") as ExcelJS.CellValue;
      row.getCell(col).alignment = { horizontal: "right", vertical: "middle", wrapText: true };
      if (i % 2 === 1) row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F2E6" } };
      row.getCell(col).font = { name: "Cairo", size: 10, color: { argb: "FF202020" } };
    }
  });

  await logAudit({ actor: user, action: "EXCEL_EXPORTED", entity: "SESSION", entityId: id, summary: `تصدير ${manifest ? "كشف النادي" : "Excel"}: ${registrations.length} من «${session.activity.title} — ${session.title}»` });
  const buffer = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`${safeFileName(session.activity.title)} - ${safeFileName(session.title)} - ${manifest ? "كشف النادي" : "المشاركون"}.xlsx`);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": EXCEL_MIME, "Content-Disposition": `attachment; filename*=UTF-8''${filename}`, "Cache-Control": "no-store" } });
}

function findHeaderRow(ws: ExcelJS.Worksheet): number | null {
  const known = new Set(["الاسم الكامل", "الهاتف", "البريد", "الفرقة", "الشعبة", "الجنس", "كود الطالب"]);
  for (let r = 1; r <= Math.min(10, ws.rowCount || 1); r++) {
    const vals = ws.getRow(r).values as unknown[];
    const texts = (Array.isArray(vals) ? vals : []).map((v) => (typeof v === "string" ? v.trim() : ""));
    if (texts.some((t) => known.has(t))) return r;
  }
  return null;
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { name: "Cairo", bold: true, size: 10, color: { argb: "FF7A5A20" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE2C2" } };
  cell.alignment = { horizontal: "right", vertical: "middle" };
  cell.border = { bottom: { style: "thin", color: { argb: "FFC9A45C" } } };
}
