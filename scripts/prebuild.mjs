// ═══════════════════════════════════════════════════════════════
//  prebuild.mjs — اختيار مزوّد قاعدة البيانات تلقائيًا قبل أي
//  prisma generate / next build (يعمل محليًا وعلى Vercel بنفس
//  المنطق دون أي تدخل يدوي).
//
//  المنطق:
//   • DATABASE_URL تبدأ بـ postgres:// أو postgresql://
//     → المخطط PostgreSQL (+ directUrl لو ضُبط DIRECT_URL)
//     — هذا وضع الإنتاج على Vercel + Supabase.
//   • غير موجودة أو تبدأ بـ file: → المخطط SQLite للتطوير المحلي.
//
//  لا يعدّل ملف .env أبدًا (قراءة فقط) — آمن للتنفيذ في أي بيئة.
// ═══════════════════════════════════════════════════════════════
import fs from "fs";
import path from "path";

const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error("[prebuild] ❌ prisma/schema.prisma غير موجود");
  process.exit(1);
}

// ── قراءة متغيرات البيئة: من العملية أولًا ثم من ملف .env ──
function readEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !line.trim().startsWith("#")) vars[m[1]] = m[2];
  }
  return vars;
}

const envFile = readEnvFile();
const dbUrl = (process.env.DATABASE_URL || envFile.DATABASE_URL || "").trim();
const directUrl = (process.env.DIRECT_URL || envFile.DIRECT_URL || "").trim();

const isPostgres = /^postgres(ql)?:\/\//i.test(dbUrl);

let schema = fs.readFileSync(schemaPath, "utf-8");

if (isPostgres) {
  // ── وضع الإنتاج: PostgreSQL (Supabase) ──
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  if (directUrl && !/directUrl\s*=/.test(schema)) {
    schema = schema.replace(
      /url\s*=\s*env\("DATABASE_URL"\)/,
      'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")'
    );
  }
  console.log("[prebuild] ✅ Prisma → PostgreSQL (وضع الإنتاج — Supabase)");
  console.log(`[prebuild]    DATABASE_URL: ${dbUrl.replace(/:[^:@/]+@/, ":****@")}`);
  if (directUrl) console.log("[prebuild]    DIRECT_URL: مضبوط (اتصال مباشر للترحيلات)");
} else {
  // ── وضع التطوير المحلي: SQLite ──
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schema = schema.replace(/\n[ \t]*directUrl\s*=\s*env\("DIRECT_URL"\)/g, "");
  console.log("[prebuild] ✅ Prisma → SQLite (وضع التطوير المحلي)");
}

fs.writeFileSync(schemaPath, schema, "utf-8");
