import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { rateLimit, clientIp, waitMessage } from "@/lib/rate-limit";

// توليد صورة QR — /api/qr?data=URL&size=260
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`qr:${ip}`, 60, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: waitMessage(limit.retryAfterSec) }, { status: 429 });
  }

  const data = req.nextUrl.searchParams.get("data");
  const size = Math.min(600, Math.max(120, Number(req.nextUrl.searchParams.get("size") || 260)));

  if (!data || data.length > 2048) {
    return NextResponse.json({ error: "missing or invalid data param (max 2048 chars)" }, { status: 400 });
  }

  const buffer = await QRCode.toBuffer(data, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#09090b", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
