CREATE TYPE "PortfolioApprovalStatus" AS ENUM (
  'TASLAK',
  'YETKI_BELGESI_BEKLIYOR',
  'INCELEMEDE',
  'ONAYLANDI',
  'REDDEDILDI',
  'HAVUZDA'
);

CREATE TYPE "PortfolioDocumentType" AS ENUM (
  'YETKI_BELGESI',
  'TAPU',
  'KAT_KARSILIGI_SOZLESMESI',
  'DIGER_DOGRULAMA_EVRAKI'
);

CREATE TYPE "PortfolioDocumentStatus" AS ENUM (
  'YUKLENDI',
  'INCELEMEDE',
  'ONAYLANDI',
  'REDDEDILDI'
);

ALTER TABLE "Unit"
ADD COLUMN IF NOT EXISTS "approvalStatus" "PortfolioApprovalStatus" NOT NULL DEFAULT 'TASLAK',
ADD COLUMN IF NOT EXISTS "poolVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "submittedForApprovalAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvalNote" TEXT,
ADD COLUMN IF NOT EXISTS "poolPublishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "poolRemovedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PortfolioDocument" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" "PortfolioDocumentType" NOT NULL,
  "status" "PortfolioDocumentStatus" NOT NULL DEFAULT 'YUKLENDI',
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PortfolioDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PortfolioDocument_unitId_idx" ON "PortfolioDocument"("unitId");
CREATE INDEX IF NOT EXISTS "PortfolioDocument_ownerId_idx" ON "PortfolioDocument"("ownerId");
CREATE INDEX IF NOT EXISTS "PortfolioDocument_status_idx" ON "PortfolioDocument"("status");
CREATE INDEX IF NOT EXISTS "Unit_approvalStatus_idx" ON "Unit"("approvalStatus");
CREATE INDEX IF NOT EXISTS "Unit_poolVisible_idx" ON "Unit"("poolVisible");

ALTER TABLE "PortfolioDocument"
ADD CONSTRAINT "PortfolioDocument_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "Unit"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioDocument"
ADD CONSTRAINT "PortfolioDocument_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;