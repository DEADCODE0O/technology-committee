import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// ═══════════════════════════════════════════════════════════════
//  حل مسار قاعدة بيانات SQLite بشكل مطلق قبل إنشاء العميل
// ═══════════════════════════════════════════════════════════════
//  لماذا هذا ضروري؟
//  Prisma يحل المسارات النسبية (file:../db/x.db) بالنسبة لموقع
//  schema.prisma «داخل node_modules» — وهذا الموقع يتغير بين:
//    • dev:        <project>/node_modules/.prisma/client
//    • standalone: <project>/.next/standalone/node_modules/.prisma/client
//  فيكون المسار النسبي نفسه صحيحًا في وضع ويكسر الخادم المستقل
//  (وهو سبب فشل النشر سابقًا). الحل: نحوّل المسار إلى مطلق بأنفسنا
//  قبل إنشاء العميل، مع تجربة عدة مراسي معروفة.
//  المسارات غير المتعلقة بـ SQLite (postgres:// ...) تبقى كما هي.
// ═══════════════════════════════════════════════════════════════

function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL

  // لا يوجد إعداد إطلاقًا → الافتراضي المحلي للمنصة (قاعدة SQLite بجذر المشروع)
  if (!raw) return 'file:db/custom.db'

  // قاعدة بعيدة (postgres/mysql) أو مسار مطلق → لا يحتاج تدخلًا
  if (!raw.startsWith('file:')) return raw
  const rel = raw.slice('file:'.length).replace(/^\.\//, '')
  if (path.isAbsolute(rel)) return raw

  // مراسي محتملة لجذر المشروع حسب طريقة التشغيل:
  //   1) cwd = جذر المشروع (dev · bun start من الجذر)
  //   2) cwd = داخل standalone (تشغيل server.js من مجلده)
  //   3) cwd = جذر مساحة العمل (جالس فوق مجلد project)
  const cwd = process.cwd()
  const candidates = [
    path.resolve(/*turbopackIgnore: true*/ cwd, rel), // المسار النسبي كما هو من مجلد التشغيل
    path.resolve(/*turbopackIgnore: true*/ cwd, 'db', 'custom.db'), // نسخة db داخل standalone
    path.resolve(/*turbopackIgnore: true*/ cwd, '..', rel), // مسار نسبي من مجلد أعلى
    path.resolve(/*turbopackIgnore: true*/ cwd, 'project', rel), // من جذر المساحة
    path.resolve(/*turbopackIgnore: true*/ cwd, 'prisma', '..', rel), // مرافق لموقع السكيمما في dev
  ]

  // أول ملف موجود يفوز
  for (const candidate of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) return 'file:' + candidate
  }

  // لا يوجد ملف → أنشئه في المرسى الأول (مجلد db بجذر التشغيل)
  // (Prisma/SQLite سيُنشئ ملف القاعدة فارغًا عند أول اتصال — لا انهيار)
  const fallback = path.resolve(cwd, 'db', 'custom.db')
  try {
    fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(fallback), { recursive: true })
  } catch {
    // تجاهل — ستظهر رسالة خطأ واضحة من Prisma عند تعذر الوصول
  }
  return 'file:' + fallback
}

process.env.DATABASE_URL = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// تسجيل Prisma حسب البيئة:
// - الإنتاج: الأخطاء والتحذيرات فقط (بدون query — لا نغرق السجلات ولا نبطئ الاستجابات)
// - التطوير: + query للتشخيص، ويمكن تشغيله في الإنتاج مؤقتًا عبر PRISMA_LOG_QUERY=1
const logEvents: ("query" | "error" | "warn")[] =
  process.env.NODE_ENV === 'production' && process.env.PRISMA_LOG_QUERY !== '1'
    ? ['error', 'warn']
    : ['error', 'warn', 'query']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logEvents,
  })

globalForPrisma.prisma = db;
