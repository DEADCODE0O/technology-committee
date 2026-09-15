// ═══════════════════════════════════════════════════════════════
//  تنظيف البيانات الوهمية — نظام نظيف بالهيكل الجديد (v2)
//  يُبقي: حساب الأدمن + حساب Google الحقيقي + إعدادات النظام
//         + قواعد النقاط + تعريفات الشارات
//  يحذف: كل الطلاب التجريبيين + البرامج/الأنشطة/التنفيذات/
//         الجلسات/التسجيلات/الحضور/النقاط/الشارات الممنوحة/
//         الإشعارات/سجل العمليات/المواهب/طلبات البيانات
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// الحسابات الحقيقية التي تبقى
const KEEP_EMAILS = ["admin@tech-committee.local", "am1560774@gmail.com"];

async function main() {
  const before = {};
  const models = [
    "user", "studentProfile", "program", "activity", "activityRun", "session",
    "formField", "registration", "attendance", "pointEvent", "studentBadge",
    "notification", "notificationRead", "talent", "auditLog", "driveAsset",
    "dataRequest", "dataResponse", "studentData", "newsItem", "otpCode",
  ];
  for (const m of models) {
    try { before[m] = await db[m].count(); } catch { before[m] = "-"; }
  }
  console.log("قبل التنظيف:", JSON.stringify(before));

  // 1) بيانات الأنشطة كاملة (الترتيب يحترم القيود)
  await db.attendance.deleteMany({});
  await db.registration.deleteMany({});
  await db.session.deleteMany({});
  await db.formField.deleteMany({});
  await db.pointEvent.deleteMany({});
  await db.activityRun.deleteMany({});
  await db.activity.deleteMany({});
  await db.program.deleteMany({});

  // 2) الإشعارات وقراءاتها
  await db.notificationRead.deleteMany({});
  await db.notification.deleteMany({});

  // 3) الشارات الممنوحة + المواهب + بيانات/طلبات + سجل العمليات + درايف
  await db.studentBadge.deleteMany({});
  await db.dataResponse.deleteMany({});
  await db.dataRequest.deleteMany({});
  await db.studentData.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.driveAsset.deleteMany({});
  await db.newsItem.deleteMany({});
  await db.otpCode.deleteMany({});

  // 4) المستخدمون الوهميون (كل شيء المرتبط بهم يتتالى: الملف/المواهب/التسجيلات...)
  const keep = await db.user.findMany({ where: { email: { in: KEEP_EMAILS } }, select: { email: true, role: true } });
  if (keep.length < KEEP_EMAILS.length) {
    console.warn("تحذير: بعض الحسابات المحفوظة غير موجودة:", keep.map((k) => k.email));
  }
  const deleted = await db.user.deleteMany({ where: { email: { notIn: KEEP_EMAILS } } });
  console.log(`تم حذف ${deleted.count} مستخدم وهمي`);

  // 5) تنظيف مواهب/بيانات الحساب الحقيقي المرتبطة بالورش القديمة (بقيت من التتالي أعلاه)
  // (studentProfile للحساب الحقيقي يبقى — بياناته الخاصة)

  // فحص نهائي
  const after = {};
  for (const m of models) {
    try { after[m] = await db[m].count(); } catch { after[m] = "-"; }
  }
  console.log("بعد التنظيف:", JSON.stringify(after));

  const keptUsers = await db.user.findMany({
    select: { email: true, role: true, provider: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("الحسابات المتبقية:", JSON.stringify(keptUsers));

  const keptRules = await db.pointRule.count();
  const keptBadges = await db.badge.count();
  const keptSettings = await db.setting.count();
  console.log(`محفوظ: ${keptRules} قاعدة نقاط، ${keptBadges} شارة، ${keptSettings} إعداد نظام`);
}

main()
  .catch((e) => { console.error("فشل التنظيف:", e); process.exit(1); })
  .finally(() => db.$disconnect());
