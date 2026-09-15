// تنظيف آثار اختبار v5 — يبقي: الحسابان الحقيقيان + الموسم النشط + كورس المثال + إنجاز افتراضي واحد
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
import fs from "fs";

async function main() {
  // 1) استعادة كلمة سر الطالب الأصلية
  const originalHash = fs.readFileSync("/tmp/student-hash-backup.txt", "utf-8").trim();
  const student = await db.user.findFirst({ where: { role: "STUDENT" } });
  if (student && originalHash) {
    await db.user.update({ where: { id: student.id }, data: { passwordHash: originalHash } });
    console.log("✓ استعيدت كلمة سر الطالب الأصلية");
  }

  // 2) نقاط المهام التجريبية
  const taskPoints = await db.pointEvent.deleteMany({ where: { ruleAction: { startsWith: "TASK_SUB_" } } });
  console.log(`• حُذفت ${taskPoints.count} أحداث نقاط المهام`);

  // 3) المهام والتكليفات والتسليمات (تجربة كاملة)
  await db.taskSubmission.deleteMany({});
  await db.taskAssignment.deleteMany({});
  const tasks = await db.task.deleteMany({});
  console.log(`• حُذفت ${tasks.count} مهام الاختبار`);

  // 4) المجتمع التجريبي
  await db.comment.deleteMany({});
  await db.postReaction.deleteMany({});
  const posts = await db.communityPost.deleteMany({});
  console.log(`• حُذفت ${posts.count} منشورات الاختبار`);

  // 5) الفرق التجريبية
  await db.teamMember.deleteMany({});
  await db.teamPointEvent.deleteMany({});
  await db.teamAchievement.deleteMany({});
  const teams = await db.team.deleteMany({});
  console.log(`• حُذفت ${teams.count} فرق الاختبار`);

  // 6) مكافآت/منح تجريبية إن وجدت
  await db.studentReward.deleteMany({});
  await db.reward.deleteMany({});

  // 7) الإشعارات التجريبية (تقييم المهمة)
  await db.notificationRead.deleteMany({});
  await db.notification.deleteMany({});
  console.log("• نُظفت الإشعارات");

  // 8) سجل العمليات التجريبي
  const logs = await db.auditLog.deleteMany({});
  console.log(`• حُذفت ${logs.count} سجلات العمليات`);

  // 9) الإبقاء: إنجاز افتراضي واحد (إعداد نظامي يجعل قسم التحديات حيًا)
  const questCount = await db.quest.count();
  if (questCount === 0) {
    await db.quest.create({
      data: {
        title: "سفير الأنشطة — احضر 3",
        description: "حضر 3 أنشطة أو أكثر واحصل على مكافأة XP",
        kind: "ATTEND_COUNT",
        targetCount: 3,
        xpReward: 50,
        icon: "🎯",
        active: true,
        order: 1,
      },
    });
    console.log("✓ أُنشئ إنجاز افتراضي واحد (سفير الأنشطة)");
  }

  // المتبقي بعد التنظيف
  const [users, acts, runs, seasons, quests] = await Promise.all([
    db.user.count(),
    db.activity.count(),
    db.run.count(),
    db.season.count(),
    db.quest.count(),
  ]);
  console.log(`الوضع النهائي: ${users} مستخدم · ${acts} نشاط · ${runs} تنفيذ · ${seasons} موسم · ${quests} إنجاز`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
