CREATE TYPE "MatchScanAttemptStatus" AS ENUM (
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "MatchScanAttempt" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "status" "MatchScanAttemptStatus" NOT NULL DEFAULT 'PROCESSING',
  "cost" INTEGER NOT NULL DEFAULT 0,
  "movementId" TEXT,
  "resultJson" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchScanAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchScanAttempt_requestId_key"
ON "MatchScanAttempt"("requestId");

CREATE INDEX "MatchScanAttempt_userId_idx"
ON "MatchScanAttempt"("userId");

CREATE INDEX "MatchScanAttempt_postId_idx"
ON "MatchScanAttempt"("postId");

CREATE INDEX "MatchScanAttempt_status_idx"
ON "MatchScanAttempt"("status");

CREATE INDEX "MatchScanAttempt_startedAt_idx"
ON "MatchScanAttempt"("startedAt");
