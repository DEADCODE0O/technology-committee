import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole, canUser, MODULES } from "@/lib/permissions";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
//  POST /api/admin/upload — رفع صورة النشاط/الورشة مباشرة
//  صلاحية: إدارة الورش فقط.
//  التخزين:
//   • Supabase Storage (bucket «workshops») عند ضبط مفاتيح الخدمة
//     — هذا مسار الإنتاج على Vercel.
//   • مجلد uploads/ محليًا ويُخدَم عبر /api/uploads/[name]
//     — للتشغيل المحلي والمعاينة.
//  التحقق: توقيع الملف الفعلي (magic bytes) وليس الامتداد فقط.
// ═══════════════════════════════════════════════════════════════

const MAX_SIZE = 4 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_BUCKET || "workshops";

const SIGNATURES = [
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
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
  const limit = rateLimit(`admin-upload:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });

  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.WORKSHOPS, "manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
  }
  if (file.size < 16 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "حجم الصورة يجب أن يكون حتى 4MB" }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const sig = detectImage(buffer);
  if (!sig) {
    return NextResponse.json({ error: "صيغة غير مدعومة — ارفع JPG أو PNG أو WEBP" }, { status: 400 });
  }

  const name = `activity-${crypto.randomUUID()}.${sig.ext}`;

  // ── مسار الإنتاج: Supabase Storage ──
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const objectPath = `activities/${name}`;
      const upload = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${objectPath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": sig.mime,
            "x-upsert": "true",
          },
          body: buffer,
        }
      );
      if (!upload.ok) {
        console.error("supabase storage upload failed:", upload.status, await upload.text().catch(() => ""));
        return NextResponse.json({ error: "فشل رفع الصورة إلى التخزين السحابي" }, { status: 502 });
      }
      const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${objectPath}`;
      return NextResponse.json({ ok: true, url: publicUrl, name });
    } catch (err) {
      console.error("supabase storage error:", err);
      return NextResponse.json({ error: "تعذر الاتصال بالتخزين السحابي" }, { status: 502 });
    }
  }

  // ── مسار التطوير المحلي: مجلد uploads/ ──
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, name), buffer);
    return NextResponse.json({ ok: true, url: `/api/uploads/${name}`, name });
  } catch (err) {
    console.error("local upload error:", err);
    return NextResponse.json({ error: "تعذر حفظ الصورة محليًا" }, { status: 500 });
  }
}
