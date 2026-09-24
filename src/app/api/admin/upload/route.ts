import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
//  POST /api/admin/upload — رفع صور الأنشطة والورش والمنشورات
//  (للأدمن فقط) — التخزين في Supabase Storage أو uploads/ محليًا
// ═══════════════════════════════════════════════════════════════

const MAX_SIZE = 5 * 1024 * 1024; // 5MB حد أقصى

const SIGNATURES = [
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
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
  const limit = rateLimit(`admin-upload:${ip}`, 30, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "غير مصرح — صلاحية الإدارة مطلوبة" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "لم يتم اختيار ملف للرفع" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" }, { status: 400 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const sig = detectImage(buf);
  if (!sig) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم — ارفع صورة بتنسيق JPG أو PNG أو WEBP أو GIF" },
      { status: 400 }
    );
  }

  const filename = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${sig.ext}`;
  let finalUrl = "";

  // 1) الرفع على Supabase Storage لضمان التوافق مع Vercel Serverless
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "workshops";

  if (supabaseUrl && serviceKey) {
    try {
      const storagePath = `activities/${filename}`;
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
    } catch (err) {
      console.warn("Supabase storage upload failed, falling back to local:", err);
      finalUrl = "";
    }
  }

  // 2) التخزين المحلي الاحتياطي
  if (!finalUrl) {
    try {
      const dir = path.join(process.cwd(), "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buf);
      finalUrl = `/api/uploads/${filename}`;
    } catch (err) {
      console.error("Local file upload save error:", err);
      return NextResponse.json({ error: "تعذر حفظ الصورة على السيرفر" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, url: finalUrl });
}
