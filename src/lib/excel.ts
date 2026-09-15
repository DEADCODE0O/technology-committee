import ExcelJS from "exceljs";

export const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
}

export async function createWorkbookFromTemplate(url?: string | null): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  if (!url) return wb;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return wb;
    const bytes = await res.arrayBuffer();
    await wb.xlsx.load(bytes);
  } catch {
    // لو القالب غير متاح نكمل بمصنف جديد بدل فشل التصدير كله.
  }
  return wb;
}

export function ensureSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  return wb.worksheets[0] ?? wb.addWorksheet(name, { views: [{ rightToLeft: true }] });
}

export function ensureHeaders(ws: ExcelJS.Worksheet, headers: string[], headerRow = 1): void {
  const existing = ws.getRow(headerRow).values as unknown[];
  const hasAny = existing.slice(1).some((v) => String(v ?? "").trim().length > 0);
  if (!hasAny) {
    ws.getRow(headerRow).values = headers;
  }
}

export function getHeaderMap(ws: ExcelJS.Worksheet, headerRow = 1): Map<string, number> {
  const map = new Map<string, number>();
  ws.getRow(headerRow).eachCell((cell, col) => {
    const key = String(cell.value ?? "").trim();
    if (key) map.set(key, col);
  });
  return map;
}

/** تحييد حقن المعادلات (Formula Injection / CWE-1236) في ملفات Excel */
export function sanitizeCellValue(val: unknown): unknown {
  if (typeof val === "string") {
    const raw = val;
    const trimmed = val.trim();
    if (
      raw.startsWith("\t") ||
      raw.startsWith("\r") ||
      raw.startsWith("\n") ||
      trimmed.startsWith("=") ||
      trimmed.startsWith("+") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("@")
    ) {
      return `'${val}`;
    }
  }
  return val;
}

export function writeRowsByHeaders(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: Record<string, unknown>[],
  headerRow = 1,
): void {
  ensureHeaders(ws, headers, headerRow);
  const headerMap = getHeaderMap(ws, headerRow);
  let next = Math.max(headerRow + 1, ws.actualRowCount + 1);
  const templateRow = next <= ws.rowCount ? ws.getRow(next) : ws.getRow(headerRow + 1);

  for (const record of rows) {
    const row = ws.getRow(next++);
    if (templateRow && templateRow.hasValues) {
      templateRow.eachCell((cell, col) => {
        row.getCell(col).style = { ...cell.style };
      });
    }
    for (const h of headers) {
      const col = headerMap.get(h);
      if (!col) continue;
      const value = sanitizeCellValue(record[h] ?? "");
      row.getCell(col).value = value as ExcelJS.CellValue;
      row.getCell(col).alignment = { ...(row.getCell(col).alignment ?? {}), horizontal: "right", vertical: "middle", wrapText: true };
    }
  }
}

export function styleHeader(ws: ExcelJS.Worksheet, headers: string[], headerRow = 1): void {
  const row = ws.getRow(headerRow);
  for (let i = 1; i <= headers.length; i++) {
    const cell = row.getCell(i);
    cell.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FF111111" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6CB8B" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFC9A45C" } } };
  }
  row.height = 30;
}
