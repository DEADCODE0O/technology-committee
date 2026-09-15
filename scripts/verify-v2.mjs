import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const n = async (t) => Number((await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`))[0].c);
const main = async () => {
  const stats = {
    programs: await n('Program'),
    activities: await n('Activity'),
    runs: await n('ActivityRun'),
    sessions: await n('Session'),
    formFields: await n('FormField'),
    registrations: await n('Registration'),
    attendance: await n('Attendance'),
    pointEvents: await n('PointEvent'),
    notifications: await n('Notification'),
    driveAssets: await n('DriveAsset'),
    users: await n('User'),
    auditLogs: await n('AuditLog'),
  };
  console.log('STATS', JSON.stringify(stats));
  const orphans = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "Registration" r LEFT JOIN "ActivityRun" a ON r."activityRunId"=a."id" WHERE a."id" IS NULL`);
  const orphAtt = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "Attendance" at LEFT JOIN "Registration" r ON at."registrationId"=r."id" WHERE r."id" IS NULL`);
  const orphFF = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "FormField" f LEFT JOIN "ActivityRun" a ON f."activityRunId"=a."id" WHERE a."id" IS NULL`);
  const orphPE = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "PointEvent" p LEFT JOIN "ActivityRun" a ON p."activityRunId"=a."id" WHERE p."activityRunId" IS NOT NULL AND a."id" IS NULL`);
  console.log('ORPHANS reg=' + Number(orphans[0].c) + ' att=' + Number(orphAtt[0].c) + ' ff=' + Number(orphFF[0].c) + ' pe=' + Number(orphPE[0].c));
  const sample = await db.$queryRawUnsafe(`SELECT a."title", a."type", a."publish", r."runNumber", r."startsAt", r."endsAt", r."closingMode", r."qrToken" FROM "Activity" a JOIN "ActivityRun" r ON r."activityId"=a."id" ORDER BY a."title" LIMIT 3`);
  for (const s of sample) console.log('SAMPLE', s.title, '|', s.type, s.publish, '| run#' + s.runNumber, 'starts=' + s.startsAt, 'ends=' + s.endsAt, 'mode=' + s.closingMode);
  const auditSample = await db.$queryRawUnsafe(`SELECT "action","entity" FROM "AuditLog" GROUP BY "action","entity" LIMIT 25`);
  console.log('AUDIT_ACTIONS', auditSample.map(a => a.action + ':' + a.entity).join(' | '));
  const progs = await db.$queryRawUnsafe(`SELECT "name","icon" FROM "Program" ORDER BY "order"`);
  console.log('PROGRAMS', progs.map(p => p.icon + ' ' + p.name).join(' | '));
};
main().catch(e => { console.error('ERR', e.message); process.exit(1); }).finally(() => db.$disconnect());
