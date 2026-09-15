import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

// ═══════════════════════════════════════════════════════════════
//  GET / — بوابة «أول زيارة فقط»:
//  1) مسجّل دخول؟ → لوحته مباشرة
//  2) زار الموقع قبلها (كوكي tc_seen)؟ → صفحة الدخول
//  3) أول زيارة حقيقية → يضبط الكوكي ويوجّه للموقع العام /welcome
//
//  Route Handler وليس صفحة — لأن ضبط الكوكي لا يجوز أثناء رسم الصفحة.
//  التحويل نسبي (Location: /welcome) ليعمل خلف أي بروكسي كما يعمل محليًا.
// ═══════════════════════════════════════════════════════════════

function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (user) {
    return redirectTo(isAdminRole(user.role) ? "/admin" : "/panel");
  }

  const seen = (await cookies()).get("tc_seen");
  if (seen) {
    return redirectTo("/login");
  }

  const res = redirectTo("/welcome");
  res.cookies.set("tc_seen", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // سنة كاملة
    sameSite: "lax",
  });
  return res;
}

export async function POST() {
  return GET();
}

