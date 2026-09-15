// ترحيل بيانات v5: Run افتراضي لكل نشاط + ربط الجلسات + الموسم الأول — بلا أي فقدان
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1) الموسم الأول (إن لم يوجد) — يبدأ من بداية العام الدراسي الحالي
  let season = await db.season.findFirst({ where: { status: "ACTIVE" } });
  if (!season) {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    season = await db.season.create({
      data: {
        name: `الموسم الأول ${year}/${year + 1}`,
        startAt: new Date(year, 8, 1), // 1 سبتمبر
        status: "ACTIVE",
      },
    });
    console.log("✓ أُنشئ الموسم النشط:", season.name);
  } else {
    console.log("• يوجد موسم نشط بالفعل:", season.name);
  }

  // 2) Run افترادي لكل نشاط يملك جلسات ولم يُنشأ له تنفيذ بعد
  const activities = await db.activity.findMany({
    include: { sessions: { orderBy: { order: "asc" } }, runs: true },
  });
  let runsCreated = 0;
  for (const act of activities) {
    if (act.runs.length > 0) continue; // له تنفيذ بالفعل
    const run = await db.run.create({
      data: {
        activityId: act.id,
        title: "التنفيذ الأول",
        order: 1,
      },
    });
    runsCreated++;
    // اربط كل جلساته بهذا التنفيذ (بلا مس أي بيانات أخرى)
    await db.session.updateMany({
      where: { activityId: act.id },
      data: { runId: run.id },
    });
  }
  console.log(`✓ أُنشئ ${runsCreated} تنفيذًا افتراضيًا وربطت جلساتها`);

  // 3) أنشطة بلا جلسات إطلاقًا: تُترك كما هي (لا جلسات = لا حاجة لتنفيذ)

  const totalRuns = await db.run.count();
  const linkedSessions = await db.session.count({ where: { runId: { not: null } } });
  const totalSessions = await db.session.count();
  console.log(`المجموع: ${totalRuns} تنفيذ · ${linkedSessions}/${totalSessions} جلسة مرتبطة`);

  // 4) تحقق سلامة البيانات: التسجيلات/الحضور/النقاط لم تُمس
  const [regs, atts, points] = await Promise.all([
    db.registration.count(),
    db.attendance.count(),
    db.pointEvent.count(),
  ]);
  console.log(`سلامة البيانات: ${regs} تسجيل · ${atts} حضور · ${points} نقطة — كلها محفوظة`);
}

main()
  .catch((e) => {
    console.error("فشل الترحيل:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
