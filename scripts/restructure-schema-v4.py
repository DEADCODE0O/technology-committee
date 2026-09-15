#!/usr/bin/env python3
# إعادة هيكلة مخطط Prisma إلى v4: إزالة ActivityRun ودمج حقول التسجيل في Session
import re

path = "/home/z/my-project/prisma/schema.prisma"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# 1) تعديل تعليق الرأس
src = src.replace(
    "//  البنية v2: Program → Activity (كورس/ورشة/فعالية) → ActivityRun (دفعة/تنفيذ) → Session (محاضرة)\n//  التسجيل والحضور والمهام على مستوى التنفيذ (Run)\n//  Production: Supabase PostgreSQL عبر Prisma",
    "//  البنية v4: Activity (كورس/ورشة/فعالية) → Session (محاضرة/موعد الورشة)\n//  كل جلسة تُعامل معاملة الورشة: مقاعدها ونافذة تسجيلها الخاصة\n//  التسجيل والحضور والتصدير على مستوى الجلسة — لا مفهوم الدفعات",
)

# 2) استبدال كتلة Activity + ActivityRun + Session + FormField بالكامل
new_block = '''model Activity {
  id               String   @id @default(cuid())
  legacyWorkshopId String?  @unique
  type             String   @default("WORKSHOP") // COURSE | WORKSHOP | EVENT
  programId        String?
  program          Program? @relation(fields: [programId], references: [id])
  title            String
  teaser           String? // رسالة التشويق قبل كشف التفاصيل
  description      String
  image            String? // رابط درايف أو أي رابط أو رفع على السيرفر
  presenter        String?
  level            String? // BEGINNER | INTERMEDIATE | ADVANCED
  publish          String   @default("DRAFT") // DRAFT | PUBLISHED | ARCHIVED
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  sessions   Session[]
  formFields FormField[]
}

// ─── المحاضرة / موعد الورشة (Session) ──────────────────────
// وحدة التسجيل: لكل جلسة مقاعدها ونافذة تسجيلها وعدّها التنازلي
// الكورس: محاضرات متعددة · الورشة: موعد واحد (يتكرر إن أُعيد تقديمها)

model Session {
  id            String   @id @default(cuid())
  activityId    String
  activity      Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  order         Int      @default(1)
  title         String
  description   String?
  startsAt      DateTime
  endsAt        DateTime?
  location      String?
  presenter     String?
  onlineUrl     String?
  onlineLabel   String?
  materialUrl   String?
  materialLabel String?
  status        String   @default("SCHEDULED") // SCHEDULED | DONE | CANCELLED

  // ── التسجيل (معاملة الورشة لكل جلسة) ──
  seats                Int       @default(50)
  registrationOpensAt  DateTime? // موعد فتح التسجيل — مستقل عن موعد الإقامة
  registrationClosesAt DateTime? // موعد إغلاق التسجيل + العد التنازلي التسويقي
  closingMode          String    @default("EITHER") // BY_DATE | BY_CAPACITY | EITHER | MANUAL
  registrationOpen     Boolean   @default(true) // المفتاح اليدوي
  allowGuests          Boolean   @default(true)
  allowAdminOverride   Boolean   @default(true)

  excelTemplateUrl  String?
  excelTemplateName String?
  qrToken           String   @unique @default(cuid()) // QR حضور خاص بالجلسة
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  registrations Registration[]
  pointEvents   PointEvent[]
  attendance    Attendance[]
}

// أسئلة التسجيل الديناميكية — على مستوى النشاط (تُسأل مرة واحدة)

model FormField {
  id         String   @id @default(cuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  label      String
  type       String // TEXT | LONGTEXT | NUMBER | PHONE | EMAIL | SELECT | RADIO | CHECKBOX | DATE | TIME | FILE
  options    String? // JSON: ["نعم","لا"]
  required   Boolean  @default(false)
  order      Int      @default(0)
  createdAt  DateTime @default(now())
}'''

# ابحث من تعليق Activity حتى نهاية FormField model (مع السماح بتعليقات فاصلة)
pattern = re.compile(
    r"model Activity \{.*?\n\}\n\n(?://[^\n]*\n\s*)*model ActivityRun \{.*?\n\}\n\n(?://[^\n]*\n\s*)*model Session \{.*?\n\}\n\n(?://[^\n]*\n\s*)*model FormField \{.*?\n\}",
    re.DOTALL,
)
m = pattern.search(src)
assert m, "لم أجد كتلة Activity..FormField"
src = src[: m.start()] + new_block + src[m.end():]

# 3) Registration: activityRunId → sessionId (بالتعابير النمطية لمرونة المسافات)
src = re.sub(
    r"model Registration \{\s*\n"
    r"\s*id\s+String\s+@id @default\(cuid\(\)\)\s*\n"
    r"\s*activityRunId\s+String\s*\n"
    r"\s*activityRun\s+ActivityRun @relation\(fields: \[activityRunId\], references: \[id\]\)\s*\n"
    r"\s*userId\s+String\?.*?\n"
    r"\s*user\s+User\?\s+@relation\(fields: \[userId\], references: \[id\]\)",
    "model Registration {\n"
    "  id        String  @id @default(cuid())\n"
    "  sessionId String\n"
    "  session   Session @relation(fields: [sessionId], references: [id])\n"
    "  userId    String? // null للتسجيل اليدوي والضيوف\n"
    "  user      User?   @relation(fields: [userId], references: [id])",
    src,
)
src = re.sub(
    r"\s*activityRunId\s+String,?\s*\n\s*activityRun\s+ActivityRun @relation\(fields: \[activityRunId\], references: \[id\]\)",
    "",
    src,
)
src = src.replace("@@unique([activityRunId, userId])", "@@unique([sessionId, userId])")
src = src.replace("@@index([activityRunId, status])", "@@index([sessionId, status])")
# أي إشارة متبقية للتسجيل في Registration
src = re.sub(
    r"model Registration \{(\s*\n  id\s+String\s+@id @default\(cuid\(\)\)\s*\n)(\s*)activityRunId (\w+)\n(\s*)activityRun\s+ActivityRun\s+@relation\(fields: \[activityRunId\], references: \[id\]\)",
    lambda m: f"model Registration {{{m.group(1)}  sessionId String\n  session   Session @relation(fields: [sessionId], references: [id])",
    src,
)

# 4) PointEvent: activityRunId → sessionId
src = re.sub(
    r"\s*activityRunId\s+String\?\s*\n\s*activityRun\s+ActivityRun\? @relation\(fields: \[activityRunId\], references: \[id\]\)",
    "\n  sessionId     String?\n  session       Session? @relation(fields: [sessionId], references: [id])",
    src,
)
# fallback: أي activityRunId متبقٍ (مثل آخر تعليق)
src = src.replace("activityRunId", "sessionId")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

# تحقق
assert "ActivityRun" not in src, "بقايا ActivityRun في المخطط!"
assert "activityRunId" not in src, "بقايا activityRunId في المخطط!"
print("✓ المخطط v4 جاهز — لا ActivityRun، التسجيل على مستوى Session")
