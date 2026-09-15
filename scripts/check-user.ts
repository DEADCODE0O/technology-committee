// فحص حالة المستخدم التجريبي في قاعدة البيانات
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const email = 'multitalent.test@example.com'
const user = await db.user.findUnique({
  where: { email },
  include: { profile: true, talents: true },
})

if (!user) {
  console.log('USER NOT FOUND — التسجيل لم يُنشئ الحساب')
} else {
  console.log('USER:', { id: user.id, email: user.email, role: user.role, status: user.status })
  console.log('PROFILE:', user.profile ? { name: user.profile.fullName, grade: user.profile.grade } : 'MISSING!')
  console.log('TALENTS:', user.talents.map(t => ({ cat: t.category, name: t.name, custom: t.customName })))
}

// فحص آخر عملية في سجل التدقيق
const lastAudit = await db.auditLog.findFirst({ orderBy: { createdAt: 'desc' } })
console.log('LAST AUDIT:', lastAudit ? { action: lastAudit.action, summary: lastAudit.summary, at: lastAudit.createdAt } : 'none')

await db.$disconnect()
