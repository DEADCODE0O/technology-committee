// ═══════════════════════════════════════════════════════════════
//  تنظيف بيانات الاختبار بعد جلسة الاختبار الكاملة
//  يعيد القاعدة لحالة البذر: 16 طالبًا + حساب المستخدم الخاص
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  // 1) حذف طلب البيانات الاختباري + استجاباته
  const testRequests = await p.dataRequest.findMany({
    where: { title: { contains: "اختبار إلزامي" } },
    select: { id: true, title: true },
  });
  for (const r of testRequests) {
    await p.dataResponse.deleteMany({ where: { requestId: r.id } });
    await p.dataRequest.delete({ where: { id: r.id } });
    console.log("• حذف طلب اختباري:", r.title);
  }

  // 2) إرجاع إعدادات كود الطالب (FOURTH فقط — كما كانت في البذر... في الواقع البذر كان معطلًا، لكن الجلسات السابقة ثبّتت FOURTH — نُبقيها)
  //    نزيل FIRST الذي أضفناه للاختبار
  const s = await p.setting.findUnique({ where: { key: "student_code" } });
  if (s) {
    const cfg = JSON.parse(s.value);
    const grades = (cfg.requiredGrades || []).filter((g: string) => g !== "FIRST");
    await p.setting.update({
      where: { key: "student_code" },
      data: { value: JSON.stringify({ ...cfg, requiredGrades: grades }) },
    });
    console.log("• إعدادات كود الطالب →", JSON.stringify(grades));
  }

  // 3) مسح كود الطالب الاختباري لـ student2
  const s2 = await p.user.findUnique({ where: { email: "student2@demo.local" }, select: { id: true } });
  if (s2) {
    await p.studentProfile.updateMany({ where: { userId: s2.id }, data: { studentCode: null } });
    console.log("• مسح كود student2");
  }

  // 4) حذف أحداث النقاط الاختبارية (الخصم + العكس + التراجع الإداري)
  const testEvents = await p.pointEvent.findMany({
    where: { reason: { in: ["اختبار الخصم", "عكس حدث سابق: خطأ في الإدخال — اختبار", "تراجع إداري عن: اختبار الخصم"] } },
    select: { id: true, reason: true, points: true },
  });
  for (const e of testEvents) {
    await p.pointEvent.delete({ where: { id: e.id } });
    console.log("• حذف حدث نقاط:", e.reason, e.points);
  }

  // 5) التحقق النهائي: رصيد student1 = 110 (كما كان)
  const agg = await p.pointEvent.aggregate({ where: { userId: "cmts04bzz000fqszqrbhbs8ae" }, _sum: { points: true } });
  console.log("رصيد student1 بعد التنظيف:", agg._sum.points ?? 0);

  // 6) الورشة التجريبية عادت CURRENT بالفعل (عبر التراجع) — تحقق
  const w = await p.workshop.findUnique({ where: { id: "cmts4uip6000mqsyl817nu3lz" }, select: { status: true } });
  console.log("حالة ورشة الذكاء الاصطناعي:", w?.status);

  // 7) عدّ الطلاب
  const students = await p.user.count({ where: { role: "STUDENT" } });
  console.log("عدد الطلاب:", students);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
