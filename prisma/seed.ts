// ═══════════════════════════════════════════════════════════════
//  Seed — النظام الحقيقي (v4): SUPER_ADMIN + الإعدادات + قواعد
//  النقاط + الشارات — بدون أي بيانات تجريبية
//  التشغيل: bun prisma/seed.ts
//  آمن: يعمل مرة واحدة فقط (لو البيانات موجودة يتجاهل)
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@tech-committee.local";
const SUPER_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";

async function main() {
  // 1) حساب SUPER_ADMIN (مرة واحدة فقط)
  const existing = await db.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!existing) {
    await db.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12),
        provider: "EMAIL",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`✓ SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
  } else {
    console.log("• SUPER_ADMIN موجود بالفعل");
  }

  // 2) قواعد النقاط الافتراضية
  const rules = [
    { action: "WORKSHOP_ATTENDANCE", label: "حضور جلسة (محاضرة/ورشة)", points: 10 },
    { action: "COMPETITION_WIN", label: "الفوز بمسابقة", points: 50 },
    { action: "TALENT_SHOWCASE", label: "عرض موهبة مميز", points: 25 },
    { action: "HELP_ORGANIZE", label: "المساعدة في تنظيم نشاط", points: 15 },
    { action: "EARLY_REGISTRATION", label: "التسجيل المبكر (أول يوم فتح)", points: 5 },
  ];
  for (const r of rules) {
    await db.pointRule.upsert({ where: { action: r.action }, update: { label: r.label }, create: r });
  }
  console.log(`✓ قواعد النقاط: ${rules.length}`);

  // 3) شارات افتراضية
  const badges = [
    { name: "حاضر أول نشاط", description: "حضرت أول جلسة معنا", icon: "🎯" },
    { name: "خمس جلسات", description: "حضرت 5 جلسات خلال الفصل", icon: "🔥" },
    { name: "عشر جلسات", description: "حضرت 10 جلسات — من الأوفياء", icon: "🏆" },
    { name: "موهبة موثّقة", description: "وثّقت الإدارة موهبتك", icon: "✨" },
    { name: "متطوع تنظيم", description: "ساعدت في تنظيم نشاط", icon: "🤝" },
  ];
  for (const b of badges) {
    const found = await db.badge.findFirst({ where: { name: b.name } });
    if (!found) await db.badge.create({ data: b });
  }
  console.log(`✓ الشارات: ${badges.length}`);

  // 4) إعدادات افتراضية
  const defaults: { key: string; value: string }[] = [
    { key: "student_code", value: JSON.stringify({ requiredGrades: [], pattern: "", hint: "", enabled: false }) },
    { key: "talents_section", value: JSON.stringify({ visible: false }) },
  ];
  for (const s of defaults) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log("✓ الإعدادات الافتراضية");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
