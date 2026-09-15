import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
const envPath = path.resolve(process.cwd(), ".env");
const target = (process.argv[2] || "postgres").toLowerCase();

if (!fs.existsSync(schemaPath)) {
  console.error("❌ prisma/schema.prisma not found!");
  process.exit(1);
}

let schemaContent = fs.readFileSync(schemaPath, "utf-8");
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

if (target.includes("sql") && target.includes("lite")) {
  // ── 1. Switch to SQLite (Local offline development) ──
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schemaContent = schemaContent.replace(/\s*directUrl\s*=\s*env\("DIRECT_URL"\)/g, "");
  fs.writeFileSync(schemaPath, schemaContent, "utf-8");

  if (envContent) {
    // Preserve existing postgres URL if present
    const pgMatch = envContent.match(/DATABASE_URL="?(postgresql:[^"\n]+)"?/);
    if (pgMatch && !envContent.includes("BACKUP_POSTGRES_URL")) {
      envContent = `# BACKUP_POSTGRES_URL="${pgMatch[1]}"\n` + envContent;
    }
    envContent = envContent.replace(
      /DATABASE_URL="?[^"\n]+"?/g,
      'DATABASE_URL="file:../db/custom.db"'
    );
    envContent = envContent.replace(
      /(^|\n)(DIRECT_URL="?[^"\n]+"?)/g,
      '\n# $2'
    );
    fs.writeFileSync(envPath, envContent, "utf-8");
  }

  console.log("✓ Switched to SQLite (Local development mode with db/custom.db)");
} else {
  // ── 2. Switch to PostgreSQL (Supabase / Vercel Production mode) ──
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  if (!schemaContent.includes("directUrl")) {
    schemaContent = schemaContent.replace(
      /url\s*=\s*env\("DATABASE_URL"\)/g,
      'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")'
    );
  }
  fs.writeFileSync(schemaPath, schemaContent, "utf-8");

  if (envContent) {
    const backupMatch = envContent.match(/# BACKUP_POSTGRES_URL="?([^"\n]+)"?/);
    const pgUrl = backupMatch ? backupMatch[1] : "postgresql://postgres:postgres@localhost:5432/tech_committee?schema=public";
    envContent = envContent.replace(
      /DATABASE_URL="?[^"\n]+"?/g,
      `DATABASE_URL="${pgUrl}"`
    );
    envContent = envContent.replace(
      /# (DIRECT_URL="?[^"\n]+"?[^\n]*)/g,
      '$1'
    );
    if (!envContent.includes("DIRECT_URL=")) {
      envContent += `\nDIRECT_URL="${pgUrl}"\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
  }

  console.log("✓ Switched to PostgreSQL (Supabase Production mode)");
}

try {
  console.log("⚡ Generating Prisma Client...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Ready!");
} catch (e) {
  console.warn("⚠️  Prisma generate warning:", e.message);
}

