// فحص حالة قاعدة البيانات
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const counts = {};
  for (const m of ["User","StudentProfile","Activity","Workshop","Season","Run","Session","Task","Team","Badge","Talent","PointEvent","Registration","Attendance","DataRequest","AuditLog","Notification","CommunityPost"]) {
    try { counts[m] = await db[m].count(); } catch (e) { counts[m] = "ERR:" + e.message.split("\n")[0].slice(0,60); }
  }
  console.log(JSON.stringify(counts, null, 2));
  const admins = await db.user.findMany({ where: { role: { in: ["SUPER_ADMIN","GENERAL_ADMIN","CONTENT_MANAGER","ACTIVITY_MODERATOR"] } }, select: { email: true, role: true, status: true } });
  console.log("ADMINS:", JSON.stringify(admins, null, 1));
  const user = await db.user.findMany({ where: { email: "am1560774@gmail.com" }, select: { email: true, role: true, status: true } });
  console.log("OWNER:", JSON.stringify(user));
  await db.$disconnect();
})();
