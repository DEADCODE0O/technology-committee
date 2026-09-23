import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
//  POST /api/tasks/upload-file — رفع ملف تسليم مهمة
//  (الطالب المكلف فقط) — التخزين uploads/ ويُخدَم عبر /api/uploads
// ═══════════════════════════════════════════════════════════════

const MAX_SIZE = 8 * 1024 * 1024;
const SIGNATURES = [
  { ext: "pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: "zip", mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
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
  const limit = rateLimit(`task-file:${ip}`, 12, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولًا" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const taskId = String(form.get("taskId") || "");
  const file = form.get("file");
  if (!taskId || !file || typeof file === "string") {
    return NextResponse.json({ error: "بيانات الرفع ناقصة" }, { status: 400 });
  }

  // التكليف موجه إليّ (فردي أو عبر فريقي)؟
  const membership = await db.teamMember.findFirst({ where: { userId: user.id } });
  const assignment = await db.taskAssignment.findFirst({
    where: { taskId, OR: [{ userId: user.id }, ...(membership ? [{ teamId: membership.teamId }] : [])] },
    select: { id: true, task: { select: { status: true, submissionType: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "هذه المهمة غير موجهة إليك" }, { status: 403 });
  if (assignment.task.status !== "PUBLISHED") return NextResponse.json({ error: "المهمة غير مفتوحة" }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "الملف فارغ" }, { status: 400 });
  if (buf.length > MAX_SIZE) return NextResponse.json({ error: "الحد الأقصى 8 ميجابايت" }, { status: 413 });
  const sig = detect(buf);
  if (!sig) return NextResponse.json({ error: "الصيغ المسموحة: PDF · JPG · PNG · WEBP · ZIP" }, { status: 415 });

  const name = `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${sig.ext}`;
  let finalUrl = "";

  // 1) الرفع على Supabase Storage لضمان العمل على Vercel Serverless بدون أخطاء EROFS
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "workshops";

  if (supabaseUrl && serviceKey) {
    try {
      const storagePath = `tasks/${name}`;
      const res = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": sig.mime,
            "x-upsert": "true",
            "cache-control": "public, max-age=31536000, immutable",
          },
          body: buf,
        }
      );

      if (res.ok) {
        finalUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${storagePath}`;
      }
    } catch {
      finalUrl = "";
    }
  }

  // 2) التخزين المحلي الاحتياطي (لبيئة التطوير دون مفاتيح Supabase)
  if (!finalUrl) {
    try {
      const dir = path.join(process.cwd(), "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), buf);
      finalUrl = `/api/uploads/${name}`;
    } catch (err) {
      console.error("Local task file save error:", err);
      return NextResponse.json({ error: "تعذر حفظ الملف على السيرفر" }, { status: 500 });
    }
  }

  return NextResponse.json({ url: finalUrl });
}
