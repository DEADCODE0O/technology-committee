import { NextRequest, NextResponse } from "next/server";
import { runDataRetentionMaintenance } from "@/lib/data-retention";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

async function handleCleanup(request: NextRequest) {
  // فحص المصادقة: إما CRON_SECRET من Vercel أو جلسة أدمن
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  let isAuthorized = false;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  } else {
    const user = await getCurrentUser();
    if (user && isAdminRole(user.role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  const result = await runDataRetentionMaintenance();

  return NextResponse.json({
    ok: result.success,
    report: result,
  });
}