// تنظيف بيانات اختبار الجولة الرابعة (تعديلات المستخدم) — يعيد القاعدة لحالة البذر
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1) حذف ورشة الاختبار وكل ما يتصل بها
  const wsId = "cmtugbsfo0001pqmmlja6ap6u";
  const regs = await db.registration.findMany({ where: { workshopId: wsId }, select: { id: true } });
  for (const r of regs) {
    await db.attendance.deleteMany({ where: { registrationId: r.id } });
  }
  await db.registration.deleteMany({ where: { workshopId: wsId } });
  await db.formField.deleteMany({ where: { workshopId: wsId } });
  await db.workshop.delete({ where: { id: wsId } }).catch(() => {});

  // 2) حذف طلبات البيانات التجريبية الثلاثة واستجاباتها وبياناتها المحفوظة
  const reqIds = ["cmtugit1a000ipqmmgq0abf0a", "cmtugnqs0000spqmm9bqls1wz", "test-gate-req"];
  await db.dataResponse.deleteMany({ where: { requestId: { in: reqIds } } });
  await db.dataRequest.deleteMany({ where: { id: { in: reqIds } } });

  // 3) حذف بيانات الطالب المحفوظة من الاختبار
  await db.studentData.deleteMany({});

  console.log("✓ نظفت: ورشة الاختبار + 3 طلبات بيانات + الاستجابات + البيانات المحفوظة");
  const counts = {
    users: await db.user.count(),
    workshops: await db.workshop.count(),
    requests: await db.dataRequest.count(),
    responses: await db.dataResponse.count(),
    studentData: await db.studentData.count(),
    regs: await db.registration.count(),
  };
  console.log("الأعداد النهائية:", counts);
}

main().finally(() => db.$disconnect());
