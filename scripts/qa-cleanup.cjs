// تنظيف حسابات الاختبار فقط — حساب المستخدم الحقيقي لا يُمس
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const TEST_EMAILS = ["qa.test.student1@gmail.com", "teststudent1@demo.local"];

(async () => {
  for (const email of TEST_EMAILS) {
    const u = await db.user.findUnique({ where: { email }, include: { profile: true } });
    if (!u) { console.log("not found:", email); continue; }
    // حذف التبعيات أولاً
    await db.pointEvent.deleteMany({ where: { userId: u.id } });
    await db.registration.deleteMany({ where: { userId: u.id } });
    // Attendance تُحذف تلقائيًا مع Registration (Cascade)
    await db.talent.deleteMany({ where: { userId: u.id } });
    await db.taskAssignment.deleteMany({ where: { userId: u.id } });
    await db.studentData.deleteMany({ where: { userId: u.id } });
    await db.dataResponse.deleteMany({ where: { userId: u.id } });
    await db.notificationRead.deleteMany({ where: { userId: u.id } });
    await db.teamMember.deleteMany({ where: { userId: u.id } });
    if (u.profile) await db.studentProfile.delete({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
    console.log("deleted:", email);
  }
  // سجل العمليات: تنظيف إدخلات الاختبار المرتبطة
  const remaining = await db.user.count();
  console.log("remaining users:", remaining);
  // فحص منشور المجتمع الوحيد
  const posts = await db.communityPost.findMany({ select: { id: true, type: true, body: true, createdAt: true } });
  console.log("community posts:", JSON.stringify(posts, null, 1));
  await db.$disconnect();
})();
