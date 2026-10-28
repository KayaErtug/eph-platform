CREATE TABLE "EphPresentationLink" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "sharedById" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'POOL',
  "durationHours" INTEGER NOT NULL DEFAULT 168,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "whatsappClickCount" INTEGER NOT NULL DEFAULT 0,
  "lastViewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EphPresentationLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EphPresentationLink_token_key" UNIQUE ("token"),
  CONSTRAINT "EphPresentationLink_source_check"
    CHECK ("source" IN ('POOL', 'PORTFOLIO')),
  CONSTRAINT "EphPresentationLink_duration_check"
    CHECK ("durationHours" IN (24, 72, 168, 336)),
  CONSTRAINT "EphPresentationLink_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EphPresentationLink_sharedById_fkey"
    FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EphPresentationLink_unit_shared_source_idx"
  ON "EphPresentationLink"("unitId", "sharedById", "source");

CREATE INDEX "EphPresentationLink_active_idx"
  ON "EphPresentationLink"("sharedById", "expiresAt", "revokedAt");

CREATE INDEX "EphPresentationLink_token_idx"
  ON "EphPresentationLink"("token");

COMMENT ON TABLE "EphPresentationLink" IS
  'Havuz ve özel portföyler için süreli, iptal edilebilir müşteri sunumu bağlantıları.';
