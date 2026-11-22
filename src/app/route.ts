import { NextResponse } from "next/server";
import { getCurrentUser, getUnverifiedSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const unverified = await getUnverifiedSessionUser();
  if (unverified) {
    return redirectTo(`/register/verify?email=${encodeURIComponent(unverified.email)}&notice=need_verification`);
  }

  const user = await getCurrentUser();
  if (user) {
    return redirectTo(isAdminRole(user.role) ? "/admin" : "/panel");
  }

  return redirectTo("/login");
}

export async function POST() {
  return GET();
}

