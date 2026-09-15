import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";
import { decideRegistration } from "@/lib/activities";

// ═══════════════════════════════════════════════════════════════
//  POST /api/sessions/upload-answer — رفع إجابة ملف لسؤال تسجيل
//  (الطالب المسجل دخوله أو الضيف قبل إرسال النموذج)
//  التخزين: مجلد uploads/ محليًا ويُخدَم عبر /api/uploads/[name]
// ═══════════════════════════════════════════════════════════════

const MAX_SIZE = 8 * 1024 * 1024;
const SIGNATURES = [
  { ext: "pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
] as const;

function detect(bytes: Uint8Array) {
  for (const sig of SIGNATURES) {
    if (bytes.length < sig.bytes.length) continue;
    if (!sig.bytes.every((b, i) => bytes[i] === b)) continue;
    if (sig.ext === "webp") {
      if (bytes.length < 12) continue;
      if (String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== "WEBP") continue;
    }
    return sig;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`session-file:${ip}`, 12, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const sessionId = String(form.get("sessionId") || "");
  const fieldId = String(form.get("fieldId") || "");
  const file = form.get("file");
  if (!sessionId || !fieldId || !file || typeof file === "string") {
    return NextResponse.json({ error: "ملف أو بيانات الرفع ناقصة" }, { status: 400 });
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      startsAt: true, endsAt: true, registrationOpen: true,
      registrationOpensAt: true, registrationClosesAt: true,
      closingMode: true, allowAdminOverride: true,
      activity: { select: { publish: true, id: true } },
      registrations: { where: { status: "REGISTERED" }, select: { id: true } } },
  });
  if (!session || session.activity.publish !== "PUBLISHED") return NextResponse.json({ error: "النشاط غير متاح" }, { status: 400 });

  const user = await getCurrentUser();
  const decision = decideRegistration({
    session: {
      registrationOpensAt: session.registrationOpensAt,
      registrationClosesAt: session.registrationClosesAt,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      closingMode: session.closingMode,
      registrationOpen: session.registrationOpen,
    },
    registeredCount: session.registrations.length,
    seats: 10 ** 9, // السعة لا تمنع رفع ملف — قائمة الانتظار ترفع أيضًا
  });
  const adminBypass = !!user && isAdminRole(user.role) && session.allowAdminOverride;
  if (!decision.open && decision.reason !== "FULL" && !adminBypass) {
    return NextResponse.json({ error: decision.message }, { status: 400 });
  }

  // حقل الملف من أسئلة النشاط (تُسأل مرة واحدة على مستوى النشاط)
  const field = await db.formField.findFirst({ where: { id: fieldId, activityId: session.activity.id } });
  if (!field || field.type !== "FILE") return NextResponse.json({ error: "حقل الملف غير صالح" }, { status: 400 });

  if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: "الملف يجب أن يكون حتى 8MB" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detect(bytes);
  if (!detected) return NextResponse.json({ error: "الملفات المسموحة: PDF أو JPG أو PNG أو WEBP فقط" }, { status: 400 });

  // اسم ملف مولّد آمن — لا نثق باسم الملف الأصلي
  const name = `ans-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${detected.ext}`;
  try {
    const dir = path.join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
  } catch {
    return NextResponse.json({ error: "تعذر رفع الملف على السيرفر" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: `/api/uploads/${name}`,
    name: file.name || `file.${detected.ext}`,
  });
}
