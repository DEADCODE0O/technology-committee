import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// ═══════════════════════════════════════════════════════════════
//  GET /api/uploads/[name] — خدمة الصور المرفوعة محليًا
//  (عند النشر على Vercel: الصور في Supabase Storage مباشرة
//   وهذا المسار يُستخدم فقط للتشغيل المحلي/المعاينة)
// ═══════════════════════════════════════════════════════════════

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
  zip: "application/zip",
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;

  // حماية من اجتياز المسار — أسماء ملفاتنا فقط (حروف/أرقام/شرطات/نقطة)
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "unsupported" }, { status: 400 });
  }

  try {
    // uploads بجوار مجلد التشغيل (standalone أو الجذر)
    const filePath = path.join(process.cwd(), "uploads", name);
    const bytes = await readFile(filePath);
    const isAttachment = ext === "zip";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": isAttachment
          ? `attachment; filename="${name}"`
          : `inline; filename="${name}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
