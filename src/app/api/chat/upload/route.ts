import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
//  POST /api/chat/upload — رفع الصور والرسائل الصوتية في الشات
//  تدعم الرفع على Supabase Storage أو uploads/ محلياً
// ═══════════════════════════════════════════════════════════════

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB كحد أقصى بعد ضغط الكانفاس
const MAX_AUDIO_SIZE = 2 * 1024 * 1024; // 2MB كحد أقصى لتسجيلات الصوت (Opus 24kbps)

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`chat-upload:${ip}`, 40, 60 * 60 * 1000);
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
    return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
  }

  const mediaType = (form.get("type") as string) || "IMAGE"; // IMAGE | AUDIO
  const maxAllowed = mediaType === "AUDIO" ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;

  if (file.size <= 0 || file.size > maxAllowed) {
    return NextResponse.json(
      { error: `حجم الملف يجب ألا يتجاوز 2 ميجابايت` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);

  let ext = "webp";
  let mimeType = "image/webp";

  if (mediaType === "AUDIO") {
    ext = file.name.endsWith(".ogg") ? "ogg" : file.name.endsWith(".mp4") ? "mp4" : "webm";
    mimeType = ext === "ogg" ? "audio/ogg" : ext === "mp4" ? "audio/mp4" : "audio/webm";
  } else {
    if (file.name.endsWith(".png")) {
      ext = "png";
      mimeType = "image/png";
    } else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) {
      ext = "jpg";
      mimeType = "image/jpeg";
    }
  }

  const fileName = `chat_${user.id}_${timestamp}_${randomStr}.${ext}`;
  let finalUrl = "";

  // 1) محاولة الرفع على Supabase Storage مع كاش CDN كامل
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "avatars";

  if (supabaseUrl && serviceKey) {
    try {
      const storagePath = `chat-media/${fileName}`;
      const res = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": mimeType,
            "x-upsert": "true",
            "cache-control": "public, max-age=31536000, immutable",
          },
          body: buffer,
        }
      );

      if (res.ok) {
        finalUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${storagePath}`;
      }
    } catch {
      finalUrl = "";
    }
  }

  // 2) التخزين المحلي الاحتياطي
  if (!finalUrl) {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, fileName), buffer);
      finalUrl = `/api/uploads/${fileName}`;
    } catch (err) {
      console.error("Local chat media save error:", err);
      return NextResponse.json({ error: "تعذر حفظ الملف" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    url: finalUrl,
    type: mediaType,
  });
}
