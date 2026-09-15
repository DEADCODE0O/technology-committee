// ═══ تنظيف بيانات الاختبار بعد الجولة الشاملة ═══
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const W = "cmts04c0q0024qszqldzvakzz"; // ورشة الرسم الرقمي

  // 1) طلبات البيانات التجريبية + إجاباتها + بياناتها المحفوظة
  const reqs = await db.dataRequest.findMany({ select: { id: true } });
  for (const r of reqs) {
    await db.dataResponse.deleteMany({ where: { requestId: r.id } });
    await db.dataRequest.delete({ where: { id: r.id } });
  }
  await db.studentData.deleteMany({});
  console.log("✓ حذف طلبات البيانات التجريبية وإجاباتها");

  // 2) كود الطالب التجريبي (student14)
  await db.studentProfile.update({
    where: { userId: "cmts04c0c0015qszq67bgsg0y" },
    data: { studentCode: null },
  });
  console.log("✓ إزالة كود الاختبار");

  // 3) تسجيل علياء اليدوي التجريبي
  await db.registration.deleteMany({ where: { phone: "01555512345" } });
  console.log("✓ حذف التسجيل اليدوي التجريبي");

  // 4) محمود: إعادة لقائمة الانتظار + حذف الحضور وأحداث النقاط
  await db.attendance.deleteMany({ where: { registrationId: "cmts04c2f006eqszqsfdjont9" } });
  await db.pointEvent.deleteMany({ where: { userId: "cmts04c02000jqszq9w9h6i32", workshopId: W } });
  await db.registration.update({
    where: { id: "cmts04c2f006eqszqsfdjont9" },
    data: { status: "WAITLISTED", waitlistOrder: 1 },
  });
  console.log("✓ إعادة محمود لقائمة الانتظار بلا حضور/نقاط");

  // 5) حضور سارة التجريبي (أُنشئ بنقرة اختبار خاطئة)
  const saraReg = await db.registration.findFirst({
    where: { fullName: "سارة خالد السيد", workshopId: W },
    select: { id: true },
  });
  if (saraReg) {
    await db.attendance.deleteMany({ where: { registrationId: saraReg.id } });
    console.log("✓ حذف حضور سارة التجريبي");
  }

  // 6) استعادة مزود الطالب التجريبي
  await db.user.update({ where: { email: "student2@demo.local" }, data: { provider: "EMAIL" } });
  console.log("✓ استعادة مزود student2");

  // 7) كود الطالب: مفعّل لكل الفرق (ميزة طلبها المستخدم — قابل للتعطيل من الإعدادات)
  await db.setting.upsert({
    where: { key: "student_code" },
    create: {
      key: "student_code",
      value: JSON.stringify({
        requiredGrades: ["FIRST", "SECOND", "THIRD", "FOURTH"],
        pattern: "^[0-9]{10}$",
        hint: "كود الطالب الجامعي — 10 أرقام: سنة الدفعة + شهر التقديم + رقمك — مثال: 2023108888",
      }),
    },
    update: {
      value: JSON.stringify({
        requiredGrades: ["FIRST", "SECOND", "THIRD", "FOURTH"],
        pattern: "^[0-9]{10}$",
        hint: "كود الطالب الجامعي — 10 أرقام: سنة الدفعة + شهر التقديم + رقمك — مثال: 2023108888",
      }),
    },
  });
  console.log("✓ كود الطالب مفعّل لكل الفرق بصيغة 2023108888");

  // 8) سجل العمليات: مسح مدخلات الاختبار التجريبية للحفاظ على سجل نظيف
  await db.auditLog.deleteMany({
    where: { OR: [{ action: "QR_CHECKIN" }, { action: "DATA_RESPONSE_SUBMITTED" }, { action: "MANUAL_REGISTRATION" }] },
  });
  console.log("✓ تنظيف مدخلات سجل الاختبار");

  // ملخص الحالة النهائية
  const total = await db.registration.count({ where: { workshopId: W, status: "REGISTERED" } });
  console.log(`── ورشة الرسم: ${total}/8 مسجل (حالة البذر الأصلية) ──`);
}

main().catch(console.error).finally(() => db.$disconnect());
