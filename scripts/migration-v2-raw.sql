-- DropIndex
DROP INDEX "Workshop_qrToken_key";

-- DropIndex
DROP INDEX "Workshop_status_dateTime_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Workshop";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "color" TEXT NOT NULL DEFAULT '#c9a45c',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyWorkshopId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'WORKSHOP',
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "presenter" TEXT,
    "level" TEXT,
    "publish" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "location" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 50,
    "registrationOpensAt" DATETIME,
    "registrationClosesAt" DATETIME,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "closingMode" TEXT NOT NULL DEFAULT 'EITHER',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "allowGuests" BOOLEAN NOT NULL DEFAULT true,
    "allowAdminOverride" BOOLEAN NOT NULL DEFAULT true,
    "excelTemplateUrl" TEXT,
    "excelTemplateName" TEXT,
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityRun_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "presenter" TEXT,
    "onlineUrl" TEXT,
    "onlineLabel" TEXT,
    "materialUrl" TEXT,
    "materialLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ActivityRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "ctaNewTab" BOOLEAN NOT NULL DEFAULT true,
    "linkType" TEXT,
    "target" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME,

    PRIMARY KEY ("userId", "notificationId"),
    CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriveAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'FILE',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriveAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FormField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityRunId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormField_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FormField" ("createdAt", "id", "label", "options", "order", "required", "type") SELECT "createdAt", "id", "label", "options", "order", "required", "type" FROM "FormField";
DROP TABLE "FormField";
ALTER TABLE "new_FormField" RENAME TO "FormField";
CREATE TABLE "new_Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityRunId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "grade" TEXT,
    "section" TEXT,
    "gender" TEXT,
    "studentCode" TEXT,
    "answers" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "waitlistOrder" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Registration_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Registration" ("answers", "createdAt", "email", "fullName", "gender", "grade", "id", "phone", "section", "source", "status", "studentCode", "updatedAt", "userId", "waitlistOrder") SELECT "answers", "createdAt", "email", "fullName", "gender", "grade", "id", "phone", "section", "source", "status", "studentCode", "updatedAt", "userId", "waitlistOrder" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
CREATE INDEX "Registration_activityRunId_status_idx" ON "Registration"("activityRunId", "status");
CREATE INDEX "Registration_userId_idx" ON "Registration"("userId");
CREATE INDEX "Registration_phone_idx" ON "Registration"("phone");
CREATE UNIQUE INDEX "Registration_activityRunId_userId_key" ON "Registration"("activityRunId", "userId");
CREATE TABLE "new_Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT,
    "markedById" TEXT,
    "markedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("createdAt", "id", "markedAt", "markedById", "method", "present", "registrationId") SELECT "createdAt", "id", "markedAt", "markedById", "method", "present", "registrationId" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE INDEX "Attendance_present_idx" ON "Attendance"("present");
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");
CREATE TABLE "new_PointEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ruleAction" TEXT,
    "activityRunId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PointEvent_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PointEvent" ("createdAt", "createdById", "id", "points", "reason", "ruleAction", "userId") SELECT "createdAt", "createdById", "id", "points", "reason", "ruleAction", "userId" FROM "PointEvent";
DROP TABLE "PointEvent";
ALTER TABLE "new_PointEvent" RENAME TO "PointEvent";
CREATE INDEX "PointEvent_userId_createdAt_idx" ON "PointEvent"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_legacyWorkshopId_key" ON "Activity"("legacyWorkshopId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRun_qrToken_key" ON "ActivityRun"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_qrToken_key" ON "Session"("qrToken");

-- CreateIndex
CREATE INDEX "Notification_pinned_createdAt_idx" ON "Notification"("pinned", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_idx" ON "NotificationRead"("userId");

-- CreateIndex
CREATE INDEX "DriveAsset_kind_idx" ON "DriveAsset"("kind");

