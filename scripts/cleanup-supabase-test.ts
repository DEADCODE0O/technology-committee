// تنظيف بيانات اختبار Supabase — يعيد القاعدة لحالة البذر
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  // 1) حذف مستخدم الاختبار وتسجيله
  const testUser = await db.user.findUnique({ where: { email: "test-supabase@demo.local" } });
  if (testUser) {
    const regs = await db.registration.findMany({ where: { userId: testUser.id }, select: { id: true } });
    for (const r of regs) {
      await db.attendance.deleteMany({ where: { registrationId: r.id } });
      await db.registration.delete({ where: { id: r.id } });
    }
    await db.studentProfile.deleteMany({ where: { userId: testUser.id } });
    await db.talent.deleteMany({ where: { userId: testUser.id } });
    await db.dataResponse.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log("✓ حذف مستخدم الاختبار وتسجيله");
  } else {
    console.log("- لا مستخدم اختبار");
  }

  // 2) تصفير توثيق الهاتف التجريبي
  const reset = await db.studentProfile.updateMany({
    where: { phoneVerified: true },
    data: { phoneVerified: false },
  });
  console.log(`✓ تصفير phoneVerified: ${reset.count}`);

  // 3) حذف أكواد OTP
  const otps = await db.otpCode.deleteMany({});
  console.log(`✓ حذف أكواد OTP: ${otps.count}`);

  // 4) حذف سجلات اختبار (OTP_SENT/PHONE_VERIFIED + تسجيل test)
  const audit = await db.auditLog.deleteMany({
    where: { OR: [{ action: "OTP_SENT" }, { action: "PHONE_VERIFIED" }] },
  });
  console.log(`✓ حذف سجلات OTP: ${audit.count}`);

  // 5) التحقق النهائي
  const users = await db.user.count();
  console.log(`→ إجمالي المستخدمين: ${users}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
