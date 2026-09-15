import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";

// بحث سريع عن الطلاب — لترقية طالب إلى مشرف (أي مشرف بصلاحية رؤية الطلاب)

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.STUDENTS, "view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ students: [] });

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { email: { contains: q } },
        { profile: { is: { fullName: { contains: q } } } },
        { profile: { is: { phone: { contains: q } } } },
      ],
    },
    include: { profile: true },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.profile?.fullName ?? s.email,
      email: s.email,
    })),
  });
}
