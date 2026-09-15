// فحص حالة قاعدة البيانات والنظام v4
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const acts = await p.activity.findMany({
  include: {
    sessions: {
      orderBy: { order: 'asc' },
      select: { id: true, order: true, title: true, startsAt: true, endsAt: true, seats: true, registrationOpensAt: true, registrationClosesAt: true, status: true, _count: { select: { registrations: true } } },
    },
  },
});
console.log('=== الأنشطة ===');
for (const a of acts) {
  console.log(`- [${a.type}] ${a.title} (publish=${a.publish}, image=${a.image ? a.image.slice(0, 60) : 'none'})`);
  for (const s of a.sessions) {
    console.log(`    · محاضرة ${s.order}: ${s.title} | إقامة ${s.startsAt?.toISOString?.() || s.startsAt} | تسجيل ${s.registrationOpensAt?.toISOString?.() || '—'} → ${s.registrationClosesAt?.toISOString?.() || '—'} | مقاعد ${s.seats} | مسجلون ${s._count.registrations} | status=${s.status}`);
  }
}

console.log('\n=== المستخدمون ===');
for (const u of await p.user.findMany({ select: { email: true, role: true, status: true } })) console.log(`- ${u.email} (${u.role})`);

console.log('\n=== الإعدادات ===');
for (const s of await p.setting.findMany()) console.log(`- ${s.key} = ${String(s.value).slice(0, 80)}`);

console.log('\n=== أعداد عامة ===');
console.log('Registrations:', await p.registration.count());
console.log('Attendance:', await p.attendance.count());
console.log('Talents:', await p.talent.count());
console.log('Notifications:', await p.notification.count());
console.log('FormFields:', await p.formField.count());

await p.$disconnect();
