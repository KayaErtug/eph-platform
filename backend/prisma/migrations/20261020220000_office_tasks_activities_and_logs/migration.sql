-- Migration: 20261020220000_office_tasks_activities_and_logs
-- Task 20: Office Tasks & Assignees
CREATE TABLE IF NOT EXISTS "OfficeTask" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfficeTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfficeTask_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfficeTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "OfficeTaskAssignee" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfficeTaskAssignee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfficeTaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OfficeTask"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfficeTaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfficeTaskAssignee_taskId_userId_key" UNIQUE ("taskId", "userId")
);

-- Task 22: Consultant Performance & Activities
CREATE TABLE IF NOT EXISTS "ConsultantActivity" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "customerId" TEXT,
  "portfolioId" TEXT,
  "activityType" TEXT NOT NULL,
  "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "outcome" TEXT NOT NULL DEFAULT 'TAKIPTE',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsultantActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsultantActivity_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConsultantActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Task 25: Office Match & Scan Logs
CREATE TABLE IF NOT EXISTS "OfficeMatchScanLog" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientRequestId" TEXT,
  "status" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "entityTitle" TEXT,
  "criteriaSummary" TEXT,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "kontorHareketiId" TEXT,
  "spentPk" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfficeMatchScanLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfficeMatchScanLog_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfficeMatchScanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OfficeTask_officeId_idx" ON "OfficeTask"("officeId");
CREATE INDEX IF NOT EXISTS "ConsultantActivity_officeId_userId_idx" ON "ConsultantActivity"("officeId", "userId");
CREATE INDEX IF NOT EXISTS "OfficeMatchScanLog_officeId_userId_idx" ON "OfficeMatchScanLog"("officeId", "userId");
