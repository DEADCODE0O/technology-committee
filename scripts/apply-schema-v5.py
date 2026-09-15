#!/usr/bin/env python3
# تطبيق تعديلات مخطط v5 المتبقية على prisma/schema.prisma
# (User + StudentProfile طُبّقا بالفعل — هذا يكمل الباقي)
import sys

P = "/home/z/my-project/prisma/schema.prisma"
src = open(P, encoding="utf-8").read()
applied = []

def rep(old, new, name):
    global src
    if old in src:
        src = src.replace(old, new, 1)
        applied.append(name)
    elif new in src:
        applied.append(name + " (تم مسبقًا)")
    else:
        print(f"!! لم يجد: {name}")
        sys.exit(1)

# 1) Activity: أنواع موسعة + links + علاقات runs/tasks + فهارس
rep('''  publish          String   @default("DRAFT") // DRAFT | PUBLISHED | ARCHIVED
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  sessions   Session[]
  formFields FormField[]
}''',
'''  publish          String   @default("DRAFT") // DRAFT | PUBLISHED | ARCHIVED
  // روابط خارجية موصوفة: JSON [{label, url, newTab}]
  links            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  runs       Run[]
  sessions   Session[]
  formFields FormField[]
  tasks      Task[]

  @@index([type, publish])
  @@index([programId])
}

// ─── التنفيذ / الدفعة (Run) ──────────────────────────────────
// تكرار فعلي للنشاط: دفعة سبتمبر / دفعة يناير / التنفيذ الأول
// لكل تنفيذ نافذة تسجيل ومشاركون وسجل مستقل —
// الجلسات بلا نافذة خاصة ترث نافذة التنفيذ

model Run {
  id          String   @id @default(cuid())
  activityId  String
  activity    Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  title       String   // «دفعة سبتمبر 2026» / «التنفيذ الأول»
  description String?
  order       Int      @default(1)
  // نافذة تسجيل التنفيذ — تُرثها الجلسات التي بلا نافذة خاصة
  seats                Int?
  registrationOpensAt  DateTime?
  registrationClosesAt DateTime?
  closingMode          String  @default("EITHER") // BY_DATE | BY_CAPACITY | EITHER | MANUAL
  registrationOpen     Boolean @default(true)
  allowGuests          Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessions Session[]
  tasks    Task[]

  @@index([activityId, order])
}''', "Activity+Run")

# 2) Activity type تعليق الأنواع
rep('type             String   @default("WORKSHOP") // COURSE | WORKSHOP | EVENT\n',
    'type             String   @default("WORKSHOP") // COURSE | WORKSHOP | EVENT | COMPETITION | VISIT | ORGANIZATION | OTHER\n',
    "Activity types")

# 3) Session.runId
rep('''model Session {
  id            String   @id @default(cuid())
  activityId    String
  activity      Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  order         Int      @default(1)''',
'''model Session {
  id            String   @id @default(cuid())
  activityId    String
  activity      Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  runId         String? // التنفيذ/الدفعة — اختياري للورش البسيطة
  run           Run?     @relation(fields: [runId], references: [id], onDelete: SetNull)
  order         Int      @default(1)''', "Session.runId")

# 4) FormField: إعادة استخدام بيانات الطالب
rep('''  options    String? // JSON: ["نعم","لا"]
  required   Boolean  @default(false)
  order      Int      @default(0)
  createdAt  DateTime @default(now())
}''',
'''  options    String? // JSON: ["نعم","لا"]
  required   Boolean  @default(false)
  order      Int      @default(0)
  // ── إعادة استخدام بيانات الطالب (v5) ──
  key              String?  @unique // مفتاح الحفظ الدائم
  saveToProfile    Boolean  @default(false)
  forceReask       Boolean  @default(false)
  createdAt  DateTime @default(now())
}''', "FormField")

# 5) Registration: GATE_ADDED + inManifest
rep('source        String      @default("ACCOUNT") // ACCOUNT | MANUAL | GUEST\n',
    'source        String      @default("ACCOUNT") // ACCOUNT | MANUAL | GUEST | GATE_ADDED\n  // كشف النادي: أُدرج المشارك في الكشف المرسل للنادي؟\n  inManifest    Boolean     @default(false)\n',
    "Registration gate+manifest")

# 6) Attendance: status/lateMinutes/GATE
rep('''  present        Boolean      @default(false)
  method         String? // MANUAL | QR''',
'''  present        Boolean      @default(false)
  status         String? // PRESENT | LATE — null مع present=false = غياب مسجل
  lateMinutes    Int?
  method         String? // MANUAL | QR | GATE''', "Attendance")

# 7) PointEvent seasonId + كل الموديلات الجديدة تُدرج بعد PointEvent
rep('''  sessionId     String?
  session       Session? @relation(fields: [sessionId], references: [id])
  createdById   String
  createdBy     User         @relation("PointEventActor", fields: [createdById], references: [id])
  createdAt     DateTime     @default(now())

  @@index([userId, createdAt])
}''',
'''  sessionId     String?
  session       Session? @relation(fields: [sessionId], references: [id])
  seasonId      String? // الموسم الجاري وقت المنح — null = تراكمي قديم
  season        Season? @relation(fields: [seasonId], references: [id])
  createdById   String
  createdBy     User         @relation("PointEventActor", fields: [createdById], references: [id])
  createdAt     DateTime       @default(now())

  @@index([userId, createdAt])
  @@index([seasonId])
}

// ─── المواسم (Seasons) ──────────────────────────────────────
// كل موسم فترة تنافس مستقلة — المتصدرون تُصفّى بالموسم
// والترتيب التاريخي يبقى متاحًا للأبد

model Season {
  id        String   @id @default(cuid())
  name      String // «الموسم الأول 2026»
  startAt   DateTime
  endAt     DateTime? // null = مفتوح حتى إشعار آخر
  status    String   @default("ACTIVE") // UPCOMING | ACTIVE | ENDED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  pointEvents PointEvent[]
  quests      Quest[]
  tasks       Task[]

  @@index([status, startAt])
}

// ─── المهام / التكليفات ────────────────────────────────────
// قد تنتمي لبرنامج/نشاط/تنفيذ/جلسة أو تكون مستقلة
// النشر يُجمّد لقطة المستلمين في TaskAssignment (لا فلترة حية)

model Task {
  id             String   @id @default(cuid())
  title          String
  description    String
  // نطاق الربط الاختياري
  seasonId       String?
  season         Season? @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  programId      String?
  activityId     String?
  activity       Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
  runId          String?
  run            Run? @relation(fields: [runId], references: [id], onDelete: SetNull)
  sessionId      String?
  // طريقة التسليم
  submissionType String   @default("TEXT") // TEXT | FILE | LINK | TEXT_AND_FILE | TEXT_AND_LINK | GROUP
  distribution   String   @default("ONE_TASK_FOR_EVERYONE") // ONE_TASK_FOR_EVERYONE | RANDOM_TASK_PER_STUDENT | BALANCED_RANDOM | TASK_POOL
  pool           String? // JSON [{title, description}] — بدائل المهام للتوزيع
  links          String? // JSON [{label, url, newTab}] — روابط خارجية موصوفة
  // الجمهور — JSON نفس محرك الاستهداف الموحد
  target         String
  dueAt          DateTime?
  xpReward       Int      @default(0)
  pointsReward   Int      @default(0)
  status         String   @default("DRAFT") // DRAFT | PUBLISHED | CLOSED
  publishedAt    DateTime?
  createdById    String
  createdBy      User     @relation("TaskCreator", fields: [createdById], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assignments TaskAssignment[]

  @@index([status, publishedAt])
  @@index([activityId])
}

// لقطة ثابتة لكل مستلم عند النشر — التوزيع العشوائي يُختم هنا للأبد

model TaskAssignment {
  id           String   @id @default(cuid())
  taskId       String
  task         Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId       String? // null للمهمة الجماعية (للفريق)
  user         User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId       String? // مهمة جماعية لفريق
  team         Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  variantIndex Int      @default(0) // نسخة المهمة المخصصة (التوزيع العشوائي)
  status       String   @default("ASSIGNED") // ASSIGNED | SUBMITTED | EVALUATED
  assignedAt   DateTime @default(now())

  submission   TaskSubmission?

  @@unique([taskId, userId])
  @@unique([taskId, teamId])
  @@index([userId, status])
}

model TaskSubmission {
  id            String   @id @default(cuid())
  assignmentId  String   @unique
  assignment    TaskAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  text          String?
  fileUrl       String?
  linkUrl       String?
  variantIndex  Int? // اختيار الطالب في وضع TASK_POOL
  submittedAt   DateTime @default(now())
  updatedAt     DateTime @updatedAt
  late          Boolean  @default(false) // محسوبة من dueAt عند التسليم
  feedback      String?
  score         Int? // من 100
  xpAwarded     Int      @default(0)
  pointsAwarded Int      @default(0)
  status        String   @default("SUBMITTED") // SUBMITTED | EVALUATED | RETURNED
  evaluatedById String?
  evaluatedBy   User?    @relation("TaskSubmissionEvaluator", fields: [evaluatedById], references: [id])
  evaluatedAt   DateTime?

  @@index([status])
}

// ─── الفرق ──────────────────────────────────────────────────

model Team {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  color       String   @default("#c9a45c")
  icon        String   @default("🛡️")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members       TeamMember[]
  pointEvents   TeamPointEvent[]
  achievements  TeamAchievement[]
  assignments   TaskAssignment[]
}

model TeamMember {
  teamId   String
  userId   String
  role     String   @default("MEMBER") // MEMBER | LEADER
  joinedAt DateTime @default(now())
  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@index([userId])
}

model TeamPointEvent {
  id          String   @id @default(cuid())
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  points      Int
  reason      String
  createdById String
  createdBy   User     @relation("TeamPointEventActor", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  @@index([teamId, createdAt])
}

model TeamAchievement {
  id          String   @id @default(cuid())
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  title       String
  description String?
  icon        String   @default("🏆")
  awardedAt   DateTime @default(now())
  awardedById String?

  @@index([teamId])
}

// ─── الإنجازات / التحديات (Quests) ───────────────────────
// تُقيّم تلقائيًا عند أحداث المشاركة — الإنجاز يمنح XP

model Quest {
  id          String   @id @default(cuid())
  seasonId    String?
  season      Season?  @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  title       String
  description String?
  kind        String   // ATTEND_COUNT | TASK_COUNT | JOIN_EVENT | COMPETITION | STREAK_WEEKS
  targetCount Int      @default(1)
  xpReward    Int      @default(50)
  icon        String   @default("🎯")
  active      Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())

  progress QuestProgress[]

  @@index([active, order])
}

model QuestProgress {
  questId     String
  userId      String
  count       Int       @default(0)
  completedAt DateTime?
  quest       Quest     @relation(fields: [questId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([questId, userId])
  @@index([userId])
}

// ─── المكافآت ───────────────────────────────────────────────

model Reward {
  id          String   @id @default(cuid())
  type        String   @default("BADGE") // BADGE | CERTIFICATE | RECOGNITION | SPECIAL_INVITATION | PHYSICAL | OTHER
  title       String
  description String?
  icon        String   @default("🎁")
  createdAt   DateTime @default(now())

  awards StudentReward[]
}

model StudentReward {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation("StudentRewardRecipient", fields: [userId], references: [id], onDelete: Cascade)
  rewardId    String
  reward      Reward   @relation(fields: [rewardId], references: [id], onDelete: Cascade)
  note        String?
  awardedById String?
  awardedBy   User?    @relation("StudentRewardAwarder", fields: [awardedById], references: [id])
  awardedAt   DateTime @default(now())
  revokedAt   DateTime? // سحب المكافأة — يبقى السجل

  @@unique([userId, rewardId])
  @@index([userId])
}

// ─── المجتمع (منشورات اللجنة + تفاعلات + تعليقات بإشراف) ──

model CommunityPost {
  id          String   @id @default(cuid())
  type        String   @default("NEWS") // NEWS | ANNOUNCEMENT | HIGHLIGHT | ACHIEVEMENT | ACTIVITY_UPDATE
  title       String
  body        String
  imageUrl    String?
  links       String? // JSON [{label, url, newTab}]
  mediaUrl    String? // فيديو/وسيط: مباشر أو يوتيوب أو تليجرام (عرض حسب المزود)
  target      String? // JSON جمهور — null = الجميع
  status      String   @default("DRAFT") // DRAFT | PUBLISHED | HIDDEN
  pinned      Boolean  @default(false)
  lockedComments Boolean @default(false)
  createdById String
  createdBy   User     @relation("CommunityPostCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  reactions PostReaction[]
  comments  Comment[]

  @@index([status, pinned, createdAt])
}

model PostReaction {
  postId     String
  userId     String
  kind       String   @default("LIKE")
  reactedAt  DateTime @default(now())
  post       CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([postId, userId])
  @@index([userId])
}

model Comment {
  id            String   @id @default(cuid())
  postId        String
  post          CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId        String
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  body          String
  status        String   @default("PENDING") // PENDING | APPROVED | HIDDEN
  moderatedById String?
  moderatedAt   DateTime?
  createdAt     DateTime @default(now())

  @@index([postId, status])
  @@index([userId, createdAt])
}

// ─── الوسائط (موفر-واعٍ: يوتيوب/تليجرام/درايف/مباشر) ─────

model MediaAsset {
  id        String   @id @default(cuid())
  provider  String   @default("DIRECT_URL") // SUPABASE | GOOGLE_DRIVE | YOUTUBE | TELEGRAM | DIRECT_URL | OTHER
  title     String
  url       String
  fileId    String? // هوية الملف لدى المزود (نقل درايف لا يكسر الرابط)
  mimeType  String?
  thumbnail String?
  durationSec Int?
  visibility String  @default("PUBLIC") // PUBLIC | STUDENTS | LINK
  createdById String
  createdBy   User   @relation("MediaAssetCreator", fields: [createdById], references: [id])
  createdAt DateTime @default(now())

  @@index([provider])
}''', "PointEvent+NewModels")

# 8) AuditLog extensions
rep('''  summary    String // وصف عربي مختصر
  details    String? // JSON بالتغييرات
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([entity, entityId])
}''',
'''  summary    String // وصف عربي مختصر
  details    String? // JSON بالتغييرات (توافق)
  before     String? // JSON للحالة قبل العملية
  after      String? // JSON للحالة بعد العملية
  reason     String? // سبب التعديل/الحذف إن وجد
  correlationId String? // ربط أحداث العملية الواحدة
  success    Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([entity, entityId])
  @@index([action])
  @@index([actorId])
}''', "AuditLog")

open(P, "w", encoding="utf-8").write(src)
print("✓ طُبق بنجاح:", ", ".join(applied))
