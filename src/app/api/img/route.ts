import { NextRequest, NextResponse } from "next/server";
import { driveFileId, safeExternalUrl } from "@/lib/links";

// ═══════════════════════════════════════════════════════════════
//  GET /api/img?u=<encoded-url> — بروكسي صور خارجي آمن
//  يحل مشكلة صور جوجل درايف «الصورة بها مشكلة»:
//  المتصفح يطلب الصورة من نفس النطاق، والسيرفر يجلبها من درايف
//  (بدون قيود referrer/CORS) ويعيد بثها مع تخزين مؤقت.
//  يقبل: روابط درايف (تُحوّل إلى thumbnail) + أي رابط صور https.
// ═══════════════════════════════════════════════════════════════

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const TIMEOUT_MS = 12_000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u") || "";
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const decoded = decodeURIComponent(raw);
  const safe = safeExternalUrl(decoded);
  if (safe === "#" || !/^https?:\/\//i.test(safe)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // جوجل درايف → سلسلة بدائل (يعمل مع «أي شخص لديه الرابط»)
  // 1) drive.google.com/thumbnail  2) lh3.googleusercontent.com/d/ID
  const driveId = driveFileId(safe);
  const driveCandidates = driveId
    ? [
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
        `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
      ]
    : [safe];

  // قائمة بيضاء للمجالات + حظر الشبكات الداخلية (SSRF) — داخل الحلقة
  const allowed = [
    "drive.google.com",
    "lh3.googleusercontent.com",
    "docs.google.com",
    "images.unsplash.com",
    "img.youtube.com",
    "i.ytimg.com",
    "github.com",
    "raw.githubusercontent.com",
    "cdn.discordapp.com",
    "media.licdn.com",
    "pbs.twimg.com",
    "res.cloudinary.com",
  ];
  for (const candidate of driveCandidates) {
    let host = "";
    try { host = new URL(candidate).hostname; } catch { continue; }
    if (
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host) ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return NextResponse.json({ error: "blocked host" }, { status: 400 });
    }
    if (!allowed.includes(host)) {
      // مجال غير معروف: نرفض (القائمة البيضاء أبسط وأأمن — الصور تُرفع على السيرفر أو درايف)
      return NextResponse.json({ error: "host not allowed" }, { status: 400 });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const upstream = await fetch(candidate, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          // درايف يرفض أحيانًا بلا user-agent
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          ...(driveId ? { Referer: "https://drive.google.com/" } : {}),
        },
        cache: "no-store",
      });
      clearTimeout(timer);

      if (!upstream.ok || !upstream.body) continue; // جرب البديل التالي
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      // لسنا بروكسي HTML — الصور فقط
      if (!contentType.startsWith("image/")) continue;
      const size = Number(upstream.headers.get("content-length") || 0);
      if (size > MAX_BYTES) {
        return NextResponse.json({ error: "too large" }, { status: 413 });
      }
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: "too large" }, { status: 413 });
      }
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": contentType,
          // تخزين مؤقت ساعة على مستوى المتصفح + يوم على البروكسي
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      continue; // جرب البديل التالي
    }
  }

  return NextResponse.json({ error: "upstream error" }, { status: 502 });
}
