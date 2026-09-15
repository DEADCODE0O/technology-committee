// فحص أحداث نقاط طالب الاختبار
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const u = await db.user.findUnique({ where: { email: "qa.test.student1@gmail.com" }, include: { pointEvents: { orderBy: { createdAt: "asc" } } } });
  if (!u) { console.log("NO USER"); process.exit(0); }
  console.log("student:", u.id, "| total events:", u.pointEvents.length);
  u.pointEvents.forEach(e => console.log(` - [${e.type}] ${e.points > 0 ? "+" : ""}${e.points} | ${e.reason || ""} | ${e.createdAt.toISOString()}`));
  const sum = u.pointEvents.reduce((a, e) => a + e.points, 0);
  console.log("sum:", sum);
  await db.$disconnect();
})();
