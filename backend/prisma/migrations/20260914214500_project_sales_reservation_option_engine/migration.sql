-- Project Sales Reservation / Option Engine V1
-- Keeps reservation lifecycle separate from Unit.status while Unit.status remains the fast stock snapshot.

CREATE TABLE "ProjectSalesReservation" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "previousUnitStatus" TEXT NOT NULL,
    "activeUnitStatus" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "note" TEXT,
    "releaseNote" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSalesReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectSalesReservation_type_check" CHECK ("type" IN ('RESERVATION', 'OPTION')),
    CONSTRAINT "ProjectSalesReservation_status_check" CHECK ("status" IN ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED', 'CANCELLED')),
    CONSTRAINT "ProjectSalesReservation_active_status_check" CHECK ("activeUnitStatus" IN ('REZERVE', 'OPSIYONLU')),
    CONSTRAINT "ProjectSalesReservation_expiry_check" CHECK ("expiresAt" > "startsAt")
);

CREATE UNIQUE INDEX "ProjectSalesReservation_projectId_idempotencyKey_key"
    ON "ProjectSalesReservation"("projectId", "idempotencyKey");

-- Database-level double reservation protection.
CREATE UNIQUE INDEX "ProjectSalesReservation_one_active_per_unit_key"
    ON "ProjectSalesReservation"("unitId")
    WHERE "status" = 'ACTIVE';

CREATE INDEX "ProjectSalesReservation_projectId_status_idx"
    ON "ProjectSalesReservation"("projectId", "status");
CREATE INDEX "ProjectSalesReservation_unitId_status_idx"
    ON "ProjectSalesReservation"("unitId", "status");
CREATE INDEX "ProjectSalesReservation_customerId_idx"
    ON "ProjectSalesReservation"("customerId");
CREATE INDEX "ProjectSalesReservation_createdById_idx"
    ON "ProjectSalesReservation"("createdById");
CREATE INDEX "ProjectSalesReservation_expiresAt_status_idx"
    ON "ProjectSalesReservation"("expiresAt", "status");

ALTER TABLE "ProjectSalesReservation"
    ADD CONSTRAINT "ProjectSalesReservation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSalesReservation"
    ADD CONSTRAINT "ProjectSalesReservation_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSalesReservation"
    ADD CONSTRAINT "ProjectSalesReservation_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectSalesReservation"
    ADD CONSTRAINT "ProjectSalesReservation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProjectSalesReservationEvent" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "reservationId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSalesReservationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectSalesReservationEvent_reservationId_createdAt_idx"
    ON "ProjectSalesReservationEvent"("reservationId", "createdAt");
CREATE INDEX "ProjectSalesReservationEvent_actorId_idx"
    ON "ProjectSalesReservationEvent"("actorId");
CREATE INDEX "ProjectSalesReservationEvent_eventType_idx"
    ON "ProjectSalesReservationEvent"("eventType");

ALTER TABLE "ProjectSalesReservationEvent"
    ADD CONSTRAINT "ProjectSalesReservationEvent_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "ProjectSalesReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSalesReservationEvent"
    ADD CONSTRAINT "ProjectSalesReservationEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
