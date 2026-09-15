import { NextResponse } from "next/server";

// فحص صحة التطبيق (للمراقبة/uptime) — بدون أي بيانات حساسة
export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "tech-committee-platform", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
