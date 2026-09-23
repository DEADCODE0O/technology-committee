import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, message: "Chat disabled" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, message: "Chat disabled" }, { status: 410 });
}
