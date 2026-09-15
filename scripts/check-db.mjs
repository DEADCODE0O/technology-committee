import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const users = await db.user.findMany({ select: { id: true, email: true, role: true, status: true, provider: true, passwordHash: true } });
console.log(JSON.stringify(users.filter(u => u.role !== 'STUDENT' || u.email.includes('am1560774')), null, 2));
console.log('TOTAL USERS:', users.length);
await db.$disconnect();
