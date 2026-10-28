CREATE TABLE "EphProjectPresentationLink" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sharedById" TEXT NOT NULL,
  "durationHours" INTEGER NOT NULL DEFAULT 168,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "whatsappClickCount" INTEGER NOT NULL DEFAULT 0,
  "lastViewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EphProjectPresentationLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EphProjectPresentationLink_token_key" UNIQUE ("token"),
  CONSTRAINT "EphProjectPresentationLink_duration_check"
    CHECK ("durationHours" IN (24, 72, 168, 336)),
  CONSTRAINT "EphProjectPresentationLink_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EphProjectPresentationLink_sharedById_fkey"
    FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EphProjectPresentationLink_project_shared_idx"
  ON "EphProjectPresentationLink"("projectId", "sharedById");

CREATE INDEX "EphProjectPresentationLink_active_idx"
  ON "EphProjectPresentationLink"("sharedById", "expiresAt", "revokedAt");

CREATE INDEX "EphProjectPresentationLink_token_idx"
  ON "EphProjectPresentationLink"("token");

COMMENT ON TABLE "EphProjectPresentationLink" IS
  'Havuzdaki proje satış stokları için süreli ve iptal edilebilir müşteri sunumu bağlantıları.';
