import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";
import { findTargetedStudentIds } from "@/lib/targeting";
import { logAudit } from "@/lib/platform";
import {
  ContactsExportOptions,
  StudentContactSource,
  buildFormattedContacts,
  generateVCardString,
  generateGoogleContactsCsv,
  generateArabicExcelCsv,
} from "@/lib/contacts-export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

async function handleExport(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.STUDENTS, "manage")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  let options: ContactsExportOptions;

  if (req.method === "POST") {
    try {
      options = (await req.json()) as ContactsExportOptions;
    } catch {
      options = parseUrlParams(url);
    }
  } else {
    options = parseUrlParams(url);
  }

  // 1) بناء استعلام جلب الطلاب
  const where: Record<string, unknown> = {
    role: "STUDENT",
    profile: {
      phone: { not: "" },
    },
  };

  const profileCond: Record<string, unknown> = { phone: { not: "" } };
  if (options.grade && ["FIRST", "SECOND", "THIRD", "FOURTH"].includes(options.grade)) {
    profileCond.grade = options.grade;
  }
  if (options.section && ["IS", "COMMERCIAL", "TOURISM", "LANGS"].includes(options.section)) {
    profileCond.section = options.section;
  }
  if (options.gender && ["MALE", "FEMALE"].includes(options.gender)) {
    profileCond.gender = options.gender;
  }
  where.profile = { is: profileCond };

  if (options.status && ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"].includes(options.status)) {
    where.status = options.status;
  }

  if (options.q?.trim()) {
    const q = options.q.trim();
    where.OR = [
      { email: { contains: q } },
      { profile: { is: { fullName: { contains: q } } } },
      { profile: { is: { phone: { contains: q } } } },
      { profile: { is: { studentCode: { contains: q } } } },
    ];
  }

  const students = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      status: true,
      profile: {
        select: {
          fullName: true,
          phone: true,
          grade: true,
          section: true,
          gender: true,
          studentCode: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const sources: StudentContactSource[] = students.map((s) => ({
    id: s.id,
    email: s.email,
    status: s.status,
    fullName: s.profile?.fullName || "",
    phone: s.profile?.phone || "",
    grade: s.profile?.grade || null,
    section: s.profile?.section || null,
    gender: s.profile?.gender || null,
    studentCode: s.profile?.studentCode || null,
  }));

  const contacts = buildFormattedContacts(sources, options);

  await logAudit({
    actor: user,
    action: "EXPORT_STUDENT_CONTACTS",
    entity: "STUDENT",
    summary: `تصدير جهات اتصال لـ ${contacts.length} طالب بصيغة ${options.format}`,
    details: {
      count: contacts.length,
      format: options.format,
      options,
    },
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (options.format === "CSV_GOOGLE") {
    const csv = generateGoogleContactsCsv(contacts);
    const filename = `google-contacts-${dateStr}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (options.format === "CSV_EXCEL") {
    const csv = generateArabicExcelCsv(contacts);
    const filename = `students-contacts-${dateStr}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // الافتراضي VCF
  const vcf = generateVCardString(contacts);
  const filename = `students-contacts-${dateStr}.vcf`;
  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseUrlParams(url: URL): ContactsExportOptions {
  return {
    format: (url.searchParams.get("format") as any) || "VCF",
    phoneFormat: (url.searchParams.get("phoneFormat") as any) || "LOCAL",
    prefix: url.searchParams.get("prefix") || "",
    suffix: url.searchParams.get("suffix") || "",
    enableGenderCustomization: url.searchParams.get("enableGender") === "1" || url.searchParams.get("enableGender") === "true",
    maleEmoji: url.searchParams.get("maleEmoji") || "",
    femaleEmoji: url.searchParams.get("femaleEmoji") || "",
    maleSuffix: url.searchParams.get("maleSuffix") || "",
    femaleSuffix: url.searchParams.get("femaleSuffix") || "",
    appendGrade: url.searchParams.get("appendGrade") === "1" || url.searchParams.get("appendGrade") === "true",
    appendSection: url.searchParams.get("appendSection") === "1" || url.searchParams.get("appendSection") === "true",
    grade: url.searchParams.get("grade") || "",
    section: url.searchParams.get("section") || "",
    gender: url.searchParams.get("gender") || "",
    status: url.searchParams.get("status") || "",
    q: url.searchParams.get("q") || "",
    scope: (url.searchParams.get("scope") as any) || "ALL",
  };
}
