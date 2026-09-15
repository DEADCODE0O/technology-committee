// تطبيق تعديلات مخطط v3: أعمدة إشعار جديدة + إعادة بناء جدول المواهب (userId اختياري + صورة + اسم حر)
// نفس منهجية الجولات السابقة: DDL مولّد بـ prisma migrate diff يُطبق يدويًا (قفل الهجرة Postgres بينما القاعدة SQLite)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "Notification" ADD COLUMN "buttons" TEXT;`,
  `ALTER TABLE "Notification" ADD COLUMN "imageUrl" TEXT;`,
  `PRAGMA defer_foreign_keys=ON;`,
  `PRAGMA foreign_keys=OFF;`,
  `CREATE TABLE "new_Talent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "personName" TEXT,
    "personGrade" TEXT,
    "personSection" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customName" TEXT,
    "description" TEXT,
    "portfolioUrl" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Talent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `INSERT INTO "new_Talent" ("category", "createdAt", "customName", "description", "featured", "id", "name", "portfolioUrl", "status", "updatedAt", "userId") SELECT "category", "createdAt", "customName", "description", "featured", "id", "name", "portfolioUrl", "status", "updatedAt", "userId" FROM "Talent";`,
  `DROP TABLE "Talent";`,
  `ALTER TABLE "new_Talent" RENAME TO "Talent";`,
  `CREATE INDEX "Talent_status_featured_idx" ON "Talent"("status", "featured");`,
  `CREATE INDEX "Talent_userId_idx" ON "Talent"("userId");`,
  `PRAGMA foreign_keys=ON;`,
  `PRAGMA defer_foreign_keys=OFF;`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await db.$executeRawUnsafe(sql);
  }
  const talentCount = await db.talent.count();
  const notifSample = await db.notification.findFirst();
  console.log("✓ Schema v3 applied. talents:", talentCount, "| notification columns ok:", "buttons" in (notifSample ?? {}));
  console.log("   (notification table قد تكون فارغة — الأعمدة أُضيفت بـ ALTER TABLE)");
}

main()
  .catch((e) => { console.error("FAILED:", e); process.exit(1); })
  .finally(() => db.$disconnect());
