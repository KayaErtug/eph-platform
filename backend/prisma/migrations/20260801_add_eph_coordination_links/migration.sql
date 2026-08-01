CREATE TABLE "EphCoordinationLink" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "sourceEntityType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "targetEntityType" TEXT,
  "targetEntityId" TEXT,
  "networkPostId" TEXT,
  "customerId" TEXT,
  "customerInterestId" TEXT,
  "unitId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EphCoordinationLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EphCoordinationLink_direction_check"
    CHECK ("direction" IN ('CRM_TO_REQUEST', 'REQUEST_TO_CRM')),
  CONSTRAINT "EphCoordinationLink_status_check"
    CHECK ("status" IN ('PENDING', 'COMPLETE', 'FAILED')),
  CONSTRAINT "EphCoordinationLink_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EphCoordinationLink_networkPostId_fkey"
    FOREIGN KEY ("networkPostId") REFERENCES "NetworkPost"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EphCoordinationLink_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EphCoordinationLink_customerInterestId_fkey"
    FOREIGN KEY ("customerInterestId") REFERENCES "CustomerInterest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EphCoordinationLink_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EphCoordinationLink_source_key"
  ON "EphCoordinationLink"(
    "ownerId",
    "direction",
    "sourceEntityType",
    "sourceEntityId"
  );

CREATE INDEX "EphCoordinationLink_ownerId_idx"
  ON "EphCoordinationLink"("ownerId");

CREATE INDEX "EphCoordinationLink_networkPostId_idx"
  ON "EphCoordinationLink"("networkPostId");

CREATE INDEX "EphCoordinationLink_customerId_idx"
  ON "EphCoordinationLink"("customerId");

CREATE INDEX "EphCoordinationLink_customerInterestId_idx"
  ON "EphCoordinationLink"("customerInterestId");

CREATE INDEX "EphCoordinationLink_unitId_idx"
  ON "EphCoordinationLink"("unitId");

CREATE INDEX "EphCoordinationLink_status_idx"
  ON "EphCoordinationLink"("status");
