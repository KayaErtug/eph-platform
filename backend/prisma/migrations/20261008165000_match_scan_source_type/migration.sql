CREATE TYPE "MatchScanSourceType" AS ENUM (
  'REQUEST',
  'PRIVATE_PORTFOLIO',
  'POOL_PROPERTY',
  'CRM_CUSTOMER'
);

ALTER TABLE "MatchScanAttempt"
  ADD COLUMN "sourceType" "MatchScanSourceType" NOT NULL DEFAULT 'REQUEST',
  ADD COLUMN "sourceId" TEXT;

UPDATE "MatchScanAttempt"
SET "sourceId" = "postId"
WHERE "sourceId" IS NULL;

ALTER TABLE "MatchScanAttempt"
  ALTER COLUMN "sourceId" SET NOT NULL,
  ALTER COLUMN "postId" DROP NOT NULL;

CREATE INDEX "MatchScanAttempt_sourceType_idx"
  ON "MatchScanAttempt"("sourceType");

CREATE INDEX "MatchScanAttempt_sourceId_idx"
  ON "MatchScanAttempt"("sourceId");

CREATE INDEX "MatchScanAttempt_userId_sourceType_sourceId_startedAt_idx"
  ON "MatchScanAttempt"(
    "userId",
    "sourceType",
    "sourceId",
    "startedAt"
  );
