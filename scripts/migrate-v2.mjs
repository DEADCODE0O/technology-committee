// ═══════════════════════════════════════════════════════════════
//  ترحيل v2: Workshop → Program / Activity / ActivityRun / Session
//  + جداول الإشعارات ومكتبة درايف
//  يحافظ على: التسجيلات، الحضور، النقاط، النماذج، qrToken نفسه، سجل العمليات
//  يشغَّل بعميل Prisma القديم (استعلامات خام فقط) قبل prisma generate الجديد
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const db = new PrismaClient();
const newId = () => 'c' + Date.now().toString(36) + randomBytes(8).toString('hex');

const DDL = [
  `CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "color" TEXT NOT NULL DEFAULT '#c9a45c',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyWorkshopId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'WORKSHOP',
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "presenter" TEXT,
    "level" TEXT,
    "publish" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE "ActivityRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "location" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 50,
    "registrationOpensAt" DATETIME,
    "registrationClosesAt" DATETIME,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "closingMode" TEXT NOT NULL DEFAULT 'EITHER',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "allowGuests" BOOLEAN NOT NULL DEFAULT true,
    "allowAdminOverride" BOOLEAN NOT NULL DEFAULT true,
    "excelTemplateUrl" TEXT,
    "excelTemplateName" TEXT,
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityRun_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "presenter" TEXT,
    "onlineUrl" TEXT,
    "onlineLabel" TEXT,
    "materialUrl" TEXT,
    "materialLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ActivityRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "ctaNewTab" BOOLEAN NOT NULL DEFAULT true,
    "linkType" TEXT,
    "target" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE "NotificationRead" (
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME,
    PRIMARY KEY ("userId", "notificationId"),
    CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE "DriveAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'FILE',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriveAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
];

const INDEXES = [
  `CREATE UNIQUE INDEX "Activity_legacyWorkshopId_key" ON "Activity"("legacyWorkshopId")`,
  `CREATE UNIQUE INDEX "ActivityRun_qrToken_key" ON "ActivityRun"("qrToken")`,
  `CREATE UNIQUE INDEX "Session_qrToken_key" ON "Session"("qrToken")`,
  `CREATE INDEX "Notification_pinned_createdAt_idx" ON "Notification"("pinned", "createdAt")`,
  `CREATE INDEX "NotificationRead_userId_idx" ON "NotificationRead"("userId")`,
  `CREATE INDEX "DriveAsset_kind_idx" ON "DriveAsset"("kind")`,
  `CREATE INDEX "Registration_activityRunId_status_idx" ON "Registration"("activityRunId", "status")`,
  `CREATE INDEX "Registration_userId_idx" ON "Registration"("userId")`,
  `CREATE INDEX "Registration_phone_idx" ON "Registration"("phone")`,
  `CREATE UNIQUE INDEX "Registration_activityRunId_userId_key" ON "Registration"("activityRunId", "userId")`,
  `CREATE INDEX "Attendance_present_idx" ON "Attendance"("present")`,
  `CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId")`,
  `CREATE INDEX "PointEvent_userId_createdAt_idx" ON "PointEvent"("userId", "createdAt")`,
];

const ACTION_MAP = {
  WORKSHOP_CREATED: 'RUN_CREATED',
  WORKSHOP_UPDATED: 'RUN_UPDATED',
  WORKSHOP_STATUS_CHANGED: 'RUN_UPDATED',
  WORKSHOP_DELETED: 'RUN_DELETED',
  WORKSHOP_REGISTERED: 'RUN_REGISTERED',
};

const DEFAULT_PROGRAMS = [
  { id: newId(), name: 'الكورسات والمهارات الرقمية', icon: '💻', description: 'كورسات البرمجة والذكاء الاصطناعي والمهارات التقنية', order: 1 },
  { id: newId(), name: 'الفنون والمواهب', icon: '🎨', description: 'ورش الرسم والتصوير والفنون المتنوعة', order: 2 },
  { id: newId(), name: 'العلوم والتجارب', icon: '🔬', description: 'أنشطة علمية وتجارب عملية', order: 3 },
  { id: newId(), name: 'الابتكار وريادة الأعمال', icon: '🚀', description: 'مبادرات ريادية ومسابقات ابتكار', order: 4 },
  { id: newId(), name: 'الترفيه والفعاليات', icon: '🎉', description: 'رحلات وفعاليات ترفيهية ولقاءات', order: 5 },
];

async function main() {
  console.log('── الترحيل v2: Workshop → Activity/Run/Session ──');

  // 1) قراءة الورش القديمة وبناء خرائط المعرفات
  const workshops = await db.$queryRawUnsafe(`SELECT "id", "title", "teaser", "status", "qrToken" FROM "Workshop"`);
  const idMap = new Map(); // workshopId → { activityId, runId }
  for (const w of workshops) idMap.set(w.id, { activityId: newId(), runId: newId() });
  console.log(`الورش القديمة: ${workshops.length}`);
  if (workshops.length === 0) {
    console.log('لا توجد ورش — إنشاء الجداول الجديدة فقط');
  }

  // 2) تعطيل FKs وإنشاء الجداول الجديدة
  await db.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_wmap" ("wid" TEXT PRIMARY KEY, "aid" TEXT NOT NULL, "rid" TEXT NOT NULL)`);
  for (const w of workshops) {
    const m = idMap.get(w.id);
    await db.$executeRawUnsafe(`INSERT INTO "_wmap" ("wid","aid","rid") VALUES ('${w.id}','${m.activityId}','${m.runId}')`);
  }

  for (const stmt of DDL) await db.$executeRawUnsafe(stmt);
  console.log('✓ جداول جديدة: Program/Activity/ActivityRun/Session/Notification/NotificationRead/DriveAsset');

  // 3) نسخ بيانات الورش → نشاط + تنفيذ أول (نفس qrToken)
  if (workshops.length > 0) {
    await db.$executeRawUnsafe(`
      INSERT INTO "Activity" ("id","legacyWorkshopId","type","programId","title","teaser","description","image","presenter","level","publish","createdAt","updatedAt")
      SELECT m."aid", w."id", 'WORKSHOP', NULL, w."title", w."teaser", w."description", w."image", w."presenter", NULL,
        CASE w."status" WHEN 'DRAFT' THEN 'DRAFT' WHEN 'ARCHIVED' THEN 'ARCHIVED' ELSE 'PUBLISHED' END,
        w."createdAt", w."updatedAt"
      FROM "Workshop" w JOIN "_wmap" m ON m."wid" = w."id"
    `);
    await db.$executeRawUnsafe(`
      INSERT INTO "ActivityRun" ("id","activityId","runNumber","name","location","seats","registrationOpensAt","registrationClosesAt","startsAt","endsAt","closingMode","registrationOpen","allowGuests","allowAdminOverride","excelTemplateUrl","excelTemplateName","qrToken","createdAt","updatedAt")
      SELECT m."rid", m."aid", 1, NULL, w."location", w."seats", NULL, w."registrationDeadline", w."dateTime",
        COALESCE(w."endTime", CAST(CAST(w."dateTime" AS INTEGER) + 10800000 AS TEXT)),
        CASE WHEN w."registrationDeadline" IS NULL THEN 'MANUAL' ELSE 'EITHER' END,
        w."registrationOpen", w."allowGuests", 1, w."excelTemplateUrl", w."excelTemplateName", w."qrToken", w."createdAt", w."updatedAt"
      FROM "Workshop" w JOIN "_wmap" m ON m."wid" = w."id"
    `);
    console.log('✓ نسخ الورش إلى أنشطة + تنفيذات (qrToken محفوظ)');

    // 4) إعادة بناء الجداول التابعة مع تعيين المعرفات
    await db.$executeRawUnsafe(`PRAGMA defer_foreign_keys=ON`);
    await db.$executeRawUnsafe(`
      CREATE TABLE "new_FormField" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "activityRunId" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "options" TEXT,
        "required" BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FormField_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`);
    await db.$executeRawUnsafe(`
      INSERT INTO "new_FormField" ("createdAt","id","label","options","order","required","type","activityRunId")
      SELECT f."createdAt", f."id", f."label", f."options", f."order", f."required", f."type", m."rid"
      FROM "FormField" f JOIN "_wmap" m ON m."wid" = f."workshopId"
    `);
    await db.$executeRawUnsafe(`DROP TABLE "FormField"`);
    await db.$executeRawUnsafe(`ALTER TABLE "new_FormField" RENAME TO "FormField"`);
    console.log('✓ حقول النماذج مرتبطة بالتنفيذات');

    await db.$executeRawUnsafe(`
      CREATE TABLE "new_Registration" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "activityRunId" TEXT NOT NULL,
        "userId" TEXT,
        "fullName" TEXT NOT NULL,
        "phone" TEXT,
        "email" TEXT,
        "grade" TEXT,
        "section" TEXT,
        "gender" TEXT,
        "studentCode" TEXT,
        "answers" TEXT,
        "source" TEXT NOT NULL DEFAULT 'ACCOUNT',
        "status" TEXT NOT NULL DEFAULT 'REGISTERED',
        "waitlistOrder" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Registration_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )`);
    await db.$executeRawUnsafe(`
      INSERT INTO "new_Registration" ("answers","activityRunId","createdAt","email","fullName","gender","grade","id","phone","section","source","status","studentCode","updatedAt","userId","waitlistOrder")
      SELECT r."answers", m."rid", r."createdAt", r."email", r."fullName", r."gender", r."grade", r."id", r."phone", r."section", r."source", r."status", r."studentCode", r."updatedAt", r."userId", r."waitlistOrder"
      FROM "Registration" r JOIN "_wmap" m ON m."wid" = r."workshopId"
    `);
    await db.$executeRawUnsafe(`DROP TABLE "Registration"`);
    await db.$executeRawUnsafe(`ALTER TABLE "new_Registration" RENAME TO "Registration"`);
    console.log('✓ التسجيلات مرتبطة بالتنفيذات');

    await db.$executeRawUnsafe(`
      CREATE TABLE "new_Attendance" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "registrationId" TEXT NOT NULL,
        "sessionId" TEXT,
        "present" BOOLEAN NOT NULL DEFAULT false,
        "method" TEXT,
        "markedById" TEXT,
        "markedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )`);
    await db.$executeRawUnsafe(`
      INSERT INTO "new_Attendance" ("createdAt","id","markedAt","markedById","method","present","registrationId")
      SELECT "createdAt","id","markedAt","markedById","method","present","registrationId" FROM "Attendance"
    `);
    await db.$executeRawUnsafe(`DROP TABLE "Attendance"`);
    await db.$executeRawUnsafe(`ALTER TABLE "new_Attendance" RENAME TO "Attendance"`);
    console.log('✓ الحضور محفوظ (sessionId=null = حضور مستوى التنفيذ)');

    await db.$executeRawUnsafe(`
      CREATE TABLE "new_PointEvent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "points" INTEGER NOT NULL,
        "reason" TEXT NOT NULL,
        "ruleAction" TEXT,
        "activityRunId" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PointEvent_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "PointEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`);
    await db.$executeRawUnsafe(`
      INSERT INTO "new_PointEvent" ("activityRunId","createdAt","createdById","id","points","reason","ruleAction","userId")
      SELECT CASE WHEN p."workshopId" IS NULL THEN NULL ELSE m."rid" END,
             p."createdAt", p."createdById", p."id", p."points", p."reason", p."ruleAction", p."userId"
      FROM "PointEvent" p LEFT JOIN "_wmap" m ON m."wid" = p."workshopId"
    `);
    await db.$executeRawUnsafe(`DROP TABLE "PointEvent"`);
    await db.$executeRawUnsafe(`ALTER TABLE "new_PointEvent" RENAME TO "PointEvent"`);
    console.log('✓ أحداث النقاط مرتبطة بالتنفيذات');

    // 5) حذف جدول الورش القديم
    await db.$executeRawUnsafe(`DROP TABLE "Workshop"`);
    console.log('✓ جدول Workshop القديم حُذف (بياناته منسوخة)');
  }

  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "_wmap"`);

  // 6) الفهارس
  for (const stmt of INDEXES) await db.$executeRawUnsafe(stmt);
  console.log('✓ الفهارس');

  // 7) البرامج الافتراضية الخمسة
  for (const p of DEFAULT_PROGRAMS) {
    await db.$executeRawUnsafe(
      `INSERT INTO "Program" ("id","name","description","icon","color","status","order","createdAt","updatedAt")
       VALUES ('${p.id}','${p.name}','${p.description}','${p.icon}','#c9a45c','ACTIVE',${p.order},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    );
  }
  console.log('✓ البرامج الافتراضية: 5');

  // 8) تحويل سجل العمليات (أسماء + معرفات + تفاصيل JSON)
  const audits = await db.$queryRawUnsafe(`SELECT "id","action","entity","entityId","details" FROM "AuditLog"`);
  let fixed = 0;
  for (const row of audits) {
    let changed = false;
    let { action, entity, entityId, details } = row;
    if (ACTION_MAP[action]) { action = ACTION_MAP[action]; changed = true; }
    if (entity === 'WORKSHOP') { entity = 'ACTIVITY_RUN'; changed = true; }
    if (entityId && idMap.has(entityId)) { entityId = idMap.get(entityId).runId; changed = true; }
    if (details) {
      let d = details;
      for (const [wid, m] of idMap) d = d.split(wid).join(m.runId);
      if (d !== details) { details = d; changed = true; }
    }
    if (changed) {
      await db.$executeRawUnsafe(
        `UPDATE "AuditLog" SET "action"='${action}', "entity"='${entity}', "entityId"=${entityId ? `'${entityId}'` : 'NULL'}, "details"=${details ? `'${details.replace(/'/g, "''")}'` : 'NULL'} WHERE "id"='${row.id}'`
      );
      fixed++;
    }
  }
  console.log(`✓ سجل العمليات: ${fixed}/${audits.length} صف حُوِّل`);

  await db.$executeRawUnsafe(`PRAGMA foreign_keys=ON`);

  // 9) تحقق نهائي
  const count = async (t) => (await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`))[0].c;
  const stats = {
    programs: await count('Program'),
    activities: await count('Activity'),
    runs: await count('ActivityRun'),
    sessions: await count('Session'),
    formFields: await count('FormField'),
    registrations: await count('Registration'),
    attendance: await count('Attendance'),
    pointEvents: await count('PointEvent'),
    notifications: await count('Notification'),
    users: await count('User'),
  };
  console.log('── النتيجة ──');
  console.log(JSON.stringify(stats, null, 1));

  // فحص تكامل: تسجيلات بلا تنفيذ؟
  const orphans = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "Registration" r LEFT JOIN "ActivityRun" a ON r."activityRunId"=a."id" WHERE a."id" IS NULL`);
  const orphAtt = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "Attendance" at LEFT JOIN "Registration" r ON at."registrationId"=r."id" WHERE r."id" IS NULL`);
  console.log(`تسجيلات يتيمة: ${orphans[0].c} · حضور يتيم: ${orphAtt[0].c}`);
  if (orphans[0].c > 0 || orphAtt[0].c > 0) { console.error('✗ فشل التكامل! استعد النسخة الاحتياطية'); process.exit(1); }
  console.log('✓ الترحيل ناجح');
}

main().catch(async (e) => {
  console.error('✗ فشل الترحيل:', e.message);
  console.error('استعد النسخة الاحتياطية: cp db/custom.db.backup-round7 db/custom.db');
  process.exit(1);
}).finally(() => db.$disconnect());
