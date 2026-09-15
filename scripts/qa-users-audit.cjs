// فحص بيانات الحسابات لتحديد ما يجب تنظيفه قبل الإطلاق
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const users = await db.user.findMany({
    include: {
      profile: true,
      _count: { select: { registrations: true, pointEvents: true, talents: true, taskAssignments: true, attendanceMarks: true, dataResponses: true } },
    },
  });
  for (const u of users) {
    console.log("─".repeat(60));
    console.log(`${u.email} | ${u.role} | ${u.status} | joined ${u.createdAt.toISOString().slice(0, 10)} | provider=${u.provider}`);
    console.log(`  name: ${u.profile?.fullName ?? "-"} | grade: ${u.profile?.grade ?? "-"} | code: ${u.profile?.studentCode ?? "-"}`);
    console.log(`  counts: reg=${u._count.registrations} pts=${u._count.pointEvents} talents=${u._count.talents} posts=${u._count.posts} tasks=${u._count.tasksAssigned} attend=${u._count.attendances} data=${u._count.dataResponses}`);
  }
  const posts = await db.communityPost.findMany({ select: { id: true, title: true, createdAt: true, authorId: true } });
  console.log("─".repeat(60));
  console.log("CommunityPosts:", JSON.stringify(posts, null, 1));
  await db.$disconnect();
})();
