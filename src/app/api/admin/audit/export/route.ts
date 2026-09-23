import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.AUDIT, "view")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const actor = url.searchParams.get("actor") || "";
  const action = url.searchParams.get("action") || "";
  const entity = url.searchParams.get("entity") || "";
  const entityId = url.searchParams.get("entityId") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const success = url.searchParams.get("success") || "";

  // build where
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (q.trim()) {
    and.push({
      OR: [
        { summary: { contains: q.trim() } },
        { action: { contains: q.trim().toUpperCase() } },
        { actorEmail: { contains: q.trim() } },
        { reason: { contains: q.trim() } },
      ],
    });
  }
  if (actor.trim()) and.push({ actorEmail: { contains: actor.trim() } });
  if (action.trim()) and.push({ action: { contains: action.trim().toUpperCase() } });
  if (entity) and.push({ entity });
  if (entityId.trim()) and.push({ entityId: entityId.trim() });
  if (from) and.push({ createdAt: { gte: new Date(from) } });
  if (to) and.push({ createdAt: { lte: new Date(`${to}T23:59:59`) } });
  if (success === "0") and.push({ success: false });
  if (success === "1") and.push({ success: true });

  if (and.length === 1) Object.assign(where, and[0]);
  else if (and.length > 1) where.AND = and;

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  // UTF-8 BOM + CSV
  const headers = ["المعرف", "التاريخ والوقت", "المنفّذ", "الإجراء", "الكيان", "معرف الكيان", "الحالة", "الملخص", "السبب"];
  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${new Date(l.createdAt).toISOString()}"`,
    `"${(l.actorEmail ?? "النظام").replace(/"/g, '""')}"`,
    `"${l.action.replace(/"/g, '""')}"`,
    `"${l.entity.replace(/"/g, '""')}"`,
    `"${(l.entityId ?? "").replace(/"/g, '""')}"`,
    `"${l.success ? "ناجحة" : "فاشلة"}"`,
    `"${(l.summary ?? "").replace(/"/g, '""')}"`,
    `"${(l.reason ?? "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit_log_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
