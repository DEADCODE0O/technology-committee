import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) {
    return redirectTo("/admin");
  }

  return redirectTo("/closed");
}

export async function POST() {
  return GET();
}


