// ═══════════════════════════════════════════════════════════════
//  standalone-assets.mjs — نسخ أصول التشغيل إلى مخرجات standalone
//  (يُنفَّذ بعد next build فقط عندما يكون output: "standalone"
//   فعّالًا — أي التشغيل المحلي/الذاتي. على Vercel لا يوجد
//   standalone فيُتخطى تلقائيًا بأمان).
// ═══════════════════════════════════════════════════════════════
import fs from "fs";
import path from "path";

const standalone = path.resolve(process.cwd(), ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.log("[postbuild] لا يوجد مخرج standalone (Vercel يتكفل بالتشغيل) — تخطي");
  process.exit(0);
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
  console.log(`[postbuild] ✓ ${path.relative(process.cwd(), src)} → ${path.relative(process.cwd(), dest)}`);
}

try {
  // 1) ملفات Next الثابتة (JS/CSS chunks)
  const staticDir = path.resolve(process.cwd(), ".next", "static");
  if (fs.existsSync(staticDir)) {
    copyDir(staticDir, path.join(standalone, ".next", "static"));
  }

  // 2) الملفات العامة (صور/فيديو/شعار)
  const publicDir = path.resolve(process.cwd(), "public");
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, path.join(standalone, "public"));
  }

  // 3) قاعدة SQLite المحلية للتشغيل الذاتي فقط (غير موجودة على Vercel)
  const dbDir = path.resolve(process.cwd(), "db");
  if (fs.existsSync(dbDir)) {
    fs.rmSync(path.join(standalone, "db"), { recursive: true, force: true });
    copyDir(dbDir, path.join(standalone, "db"));
  }

  // 4) ملف .env إن وُجد (قيم التطوير المحلي فقط)
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, path.join(standalone, ".env"));
    console.log("[postbuild] ✓ .env → standalone/.env");
  }

  console.log("[postbuild] ✅ أصول standalone جاهزة");
} catch (err) {
  // الأصول اختيارية تمامًا — لا نفشل البناء لأجلها
  console.warn("[postbuild] ⚠️ تخطي جزئي:", err.message);
}
