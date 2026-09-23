import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, error: "Chat upload disabled" }, { status: 410 });
}
