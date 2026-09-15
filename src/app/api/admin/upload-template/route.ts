import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUser, isAdminRole, MODULES } from "@/lib/permissions";

const MAX_SIZE = 8 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_BUCKET || "workshops";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !canUser(user, MODULES.WORKSHOPS, "manage")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
  if (file.size < 4 || file.size > MAX_SIZE) return NextResponse.json({ error: "حجم القالب يجب أن يكون حتى 8MB" }, { status: 400 });
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!(buffer[0] === 0x50 && buffer[1] === 0x4b)) return NextResponse.json({ error: "قالب Excel غير صالح — ارفع ملف XLSX" }, { status: 400 });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase Storage غير مضبوط" }, { status: 503 });

  const name = `templates/template-${crypto.randomUUID()}.xlsx`;
  const upload = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "x-upsert": "true" },
    body: buffer,
  });
  if (!upload.ok) return NextResponse.json({ error: "فشل رفع قالب Excel إلى التخزين" }, { status: 502 });

  return NextResponse.json({ ok: true, url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${name}`, name: file.name });
}
