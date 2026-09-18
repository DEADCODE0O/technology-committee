import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/platform";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
//  POST /api/profile/upload-avatar — رفع صورة شخصية للطالب
//  تدعم الرفع المباشر وتعمل على Supabase Storage أو uploads/ محلياً
// ═══════════════════════════════════════════════════════════════

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const SIGNATURES = [
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: "gif", mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
] as const;

function detectImage(bytes: Uint8Array) {
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
  const limit = rateLimit(`avatar-upload:${ip}`, 15, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "لم يتم اختيار صورة للرفع" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "الصيغ المدعومة فقط: JPG · PNG · WEBP · GIF" },
      { status: 415 }
    );
  }

  const uniqueName = `avatar-${user.id.slice(0, 8)}-${Date.now()}.${detected.ext}`;
  let finalUrl = "";

  // 1) محاولة الرفع على Supabase Storage إن وُجد الإعداد
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "avatars";

  if (supabaseUrl && serviceKey) {
    try {
      const storagePath = `user-avatars/${uniqueName}`;
      const res = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": detected.mime,
            "x-upsert": "true",
          },
          body: bytes,
        }
      );

      if (res.ok) {
        finalUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${storagePath}`;
      }
    } catch {
      // الرجوع للتخزين المحلي في حال حدوث أي خطأ في شبكة التخزين السحابي
      finalUrl = "";
    }
  }

  // 2) التخزين المحلي الاحتياطي
  if (!finalUrl) {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, uniqueName), bytes);
      finalUrl = `/api/uploads/${uniqueName}`;
    } catch (err) {
      console.error("Local avatar save error:", err);
      return NextResponse.json({ error: "تعذر حفظ الصورة على السيرفر" }, { status: 500 });
    }
  }

  // حفظ الصورة الجديدة في ملف المستخدم
  await db.user.update({
    where: { id: user.id },
    data: { avatarUrl: finalUrl },
  });

  await logAudit({
    actor: user,
    action: "AVATAR_IMAGE_UPDATED",
    entity: "USER",
    entityId: user.id,
    summary: "رفع صورة شخصية مخصصة جديدة من الجهاز",
    details: { url: finalUrl },
  });

  return NextResponse.json({
    ok: true,
    url: finalUrl,
    message: "تم رفع صورتك الشخصية وتعيينها بنجاح! 📸",
  });
}
