-- Production baseline for Supabase PostgreSQL.
-- Intentionally idempotent so it can initialize a fresh project or reconcile an already-pushed schema.

create table if not exists public."User" (
  "id" text primary key,
  "email" text not null unique,
  "passwordHash" text,
  "provider" text not null default 'EMAIL',
  "googleId" text unique,
  "avatarUrl" text,
  "role" text not null default 'STUDENT',
  "status" text not null default 'ACTIVE',
  "customPermissions" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."StudentProfile" (
  "id" text primary key,
  "userId" text not null unique,
  "fullName" text not null,
  "grade" text not null,
  "section" text not null,
  "gender" text not null,
  "phone" text not null,
  "phoneVerified" boolean not null default true,
  "studentCode" text,
  "discoverySource" text,
  "joinReasons" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "StudentProfile_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade
);

create table if not exists public."OtpCode" (
  "id" text primary key,
  "phone" text not null,
  "codeHash" text not null,
  "purpose" text not null default 'PHONE_VERIFY',
  "attempts" integer not null default 5,
  "consumed" boolean not null default false,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Talent" (
  "id" text primary key,
  "userId" text not null,
  "category" text not null,
  "name" text not null,
  "customName" text,
  "description" text,
  "portfolioUrl" text,
  "status" text not null default 'PENDING',
  "featured" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Talent_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade
);

create table if not exists public."Workshop" (
  "id" text primary key,
  "title" text not null,
  "teaser" text,
  "description" text not null,
  "image" text,
  "dateTime" timestamptz not null,
  "endTime" timestamptz,
  "registrationDeadline" timestamptz,
  "excelTemplateUrl" text,
  "excelTemplateName" text,
  "location" text not null,
  "seats" integer not null default 50,
  "presenter" text,
  "status" text not null default 'DRAFT',
  "registrationOpen" boolean not null default true,
  "allowGuests" boolean not null default true,
  "qrToken" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."FormField" (
  "id" text primary key,
  "workshopId" text not null,
  "label" text not null,
  "type" text not null,
  "options" text,
  "required" boolean not null default false,
  "order" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  constraint "FormField_workshopId_fkey" foreign key ("workshopId") references public."Workshop"("id") on delete cascade on update cascade
);

create table if not exists public."Registration" (
  "id" text primary key,
  "workshopId" text not null,
  "userId" text,
  "fullName" text not null,
  "phone" text,
  "email" text,
  "grade" text,
  "section" text,
  "gender" text,
  "studentCode" text,
  "answers" text,
  "source" text not null default 'ACCOUNT',
  "status" text not null default 'REGISTERED',
  "waitlistOrder" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Registration_workshopId_fkey" foreign key ("workshopId") references public."Workshop"("id") on update cascade,
  constraint "Registration_userId_fkey" foreign key ("userId") references public."User"("id") on update cascade
);

create table if not exists public."Attendance" (
  "id" text primary key,
  "registrationId" text not null unique,
  "present" boolean not null default false,
  "method" text,
  "markedById" text,
  "markedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint "Attendance_registrationId_fkey" foreign key ("registrationId") references public."Registration"("id") on delete cascade on update cascade,
  constraint "Attendance_markedById_fkey" foreign key ("markedById") references public."User"("id") on update cascade
);

create table if not exists public."PointRule" (
  "id" text primary key,
  "action" text not null unique,
  "label" text not null,
  "points" integer not null,
  "active" boolean not null default true
);

create table if not exists public."PointEvent" (
  "id" text primary key,
  "userId" text not null,
  "points" integer not null,
  "reason" text not null,
  "ruleAction" text,
  "workshopId" text,
  "createdById" text not null,
  "createdAt" timestamptz not null default now(),
  constraint "PointEvent_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade,
  constraint "PointEvent_workshopId_fkey" foreign key ("workshopId") references public."Workshop"("id") on update cascade,
  constraint "PointEvent_createdById_fkey" foreign key ("createdById") references public."User"("id") on update cascade
);

create table if not exists public."Badge" (
  "id" text primary key,
  "name" text not null,
  "description" text not null,
  "icon" text not null default '🏆',
  "active" boolean not null default true,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."StudentBadge" (
  "userId" text not null,
  "badgeId" text not null,
  "awardedAt" timestamptz not null default now(),
  "awardedById" text,
  primary key ("userId", "badgeId"),
  constraint "StudentBadge_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade,
  constraint "StudentBadge_badgeId_fkey" foreign key ("badgeId") references public."Badge"("id") on delete cascade on update cascade
);

create table if not exists public."NewsItem" (
  "id" text primary key,
  "title" text not null,
  "body" text not null,
  "image" text,
  "link" text,
  "type" text not null default 'NEWS',
  "status" text not null default 'DRAFT',
  "priority" integer not null default 0,
  "publishAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."AuditLog" (
  "id" text primary key,
  "actorId" text,
  "actorEmail" text,
  "action" text not null,
  "entity" text not null,
  "entityId" text,
  "summary" text not null,
  "details" text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."DataRequest" (
  "id" text primary key,
  "title" text not null,
  "description" text,
  "fields" text not null,
  "mandatory" boolean not null default false,
  "reusePreviousAnswers" boolean not null default true,
  "target" text not null,
  "status" text not null default 'OPEN',
  "deadline" timestamptz,
  "createdById" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "DataRequest_createdById_fkey" foreign key ("createdById") references public."User"("id") on update cascade
);

create table if not exists public."DataResponse" (
  "id" text primary key,
  "requestId" text not null,
  "userId" text not null,
  "answers" text not null,
  "submittedAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "DataResponse_requestId_fkey" foreign key ("requestId") references public."DataRequest"("id") on delete cascade on update cascade,
  constraint "DataResponse_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade
);

create table if not exists public."Setting" (
  "key" text primary key,
  "value" text not null
);

create table if not exists public."StudentData" (
  "id" text primary key,
  "userId" text not null,
  "key" text not null,
  "label" text not null,
  "type" text not null,
  "value" text not null,
  "sourceRequestId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "StudentData_userId_fkey" foreign key ("userId") references public."User"("id") on delete cascade on update cascade,
  constraint "StudentData_userId_key_key" unique ("userId", "key")
);

-- Reconcile columns added after an older db push.
alter table public."StudentProfile" add column if not exists "phoneVerified" boolean not null default true;
alter table public."Workshop" add column if not exists "registrationDeadline" timestamptz;
alter table public."Workshop" add column if not exists "excelTemplateUrl" text;
alter table public."Workshop" add column if not exists "excelTemplateName" text;
alter table public."DataRequest" add column if not exists "reusePreviousAnswers" boolean not null default true;

create index if not exists "StudentProfile_grade_section_idx" on public."StudentProfile" ("grade", "section");
create index if not exists "StudentProfile_phone_idx" on public."StudentProfile" ("phone");
create index if not exists "StudentProfile_studentCode_idx" on public."StudentProfile" ("studentCode");
create index if not exists "OtpCode_phone_createdAt_idx" on public."OtpCode" ("phone", "createdAt");
create index if not exists "OtpCode_expiresAt_idx" on public."OtpCode" ("expiresAt");
create index if not exists "Talent_status_featured_idx" on public."Talent" ("status", "featured");
create index if not exists "Talent_userId_idx" on public."Talent" ("userId");
create index if not exists "Workshop_status_dateTime_idx" on public."Workshop" ("status", "dateTime");
create index if not exists "Registration_workshopId_status_idx" on public."Registration" ("workshopId", "status");
create index if not exists "Registration_userId_idx" on public."Registration" ("userId");
create index if not exists "Registration_phone_idx" on public."Registration" ("phone");
create index if not exists "Attendance_present_idx" on public."Attendance" ("present");
create index if not exists "PointEvent_userId_createdAt_idx" on public."PointEvent" ("userId", "createdAt");
create index if not exists "NewsItem_status_publishAt_idx" on public."NewsItem" ("status", "publishAt");
create index if not exists "AuditLog_createdAt_idx" on public."AuditLog" ("createdAt");
create index if not exists "AuditLog_entity_entityId_idx" on public."AuditLog" ("entity", "entityId");
create index if not exists "DataRequest_status_idx" on public."DataRequest" ("status");
create index if not exists "DataResponse_requestId_idx" on public."DataResponse" ("requestId");
create index if not exists "StudentData_userId_idx" on public."StudentData" ("userId");
