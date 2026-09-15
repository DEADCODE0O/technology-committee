// تنظيف بيانات الاختبار من هذه الجولة — تسليم نظام نظيف
import { PrismaClient } from "@prisma/client";
import { rm } from "fs/promises";

const db = new PrismaClient();

async function main() {
  // الإشعارات التجريبية (مع قراءاتها) — بترتيب آمن للقيود
  await db.notificationRead.deleteMany({});
  const delNotifs = await db.notification.deleteMany({});
  // المواهب التجريبية
  const delTalents = await db.talent.deleteMany({});
  // التنفيذات والأنشطة التجريبية (القيود تتكفل بالتسجيلات/الحضور/النقاط — لا يوجد منها)
  const delRuns = await db.activityRun.deleteMany({});
  const delActivities = await db.activity.deleteMany({});
  // إعادة قسم المواهب للحالة الافتراضية (مخفي — تفعّله الإدارة من الإعدادات)
  await db.setting.deleteMany({ where: { key: "talents_section" } });
  // سجلات التدقيق التجريبية
  const delAudit = await db.auditLog.deleteMany({});

  // صور الاختبار المرفوعة
  for (const f of ["img-mtvpbfog-2ce80e5f9e06b531.png", "img-mtvpe3qx-9bf048a0aa602817.png"]) {
    await rm(`/home/z/my-project/uploads/${f}`, { force: true });
    await rm(`/home/z/my-project/.next/standalone/uploads/${f}`, { force: true });
  }

  console.log(`تم الحذف: ${delNotifs.count} إشعار · ${delTalents.count} موهبة · ${delRuns.count} تنفيذ · ${delActivities.count} نشاط · ${delAudit.count} سجل تدقيق`);
  const users = await db.user.count();
  console.log(`المستخدمون الحقيقيون: ${users} (أدمن + حسابك)`);
}

main()
  .catch((e) => { console.error("FAILED:", e); process.exit(1); })
  .finally(() => db.$disconnect());
