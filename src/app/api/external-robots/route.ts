import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("User-agent: *\nDisallow: /\n", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
