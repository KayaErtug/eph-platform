-- CreateTable
CREATE TABLE "SisterViewingRequest" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ownerOfficeId" TEXT NOT NULL,
    "requesterOfficeId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "SisterRequestStatus" NOT NULL DEFAULT 'BEKLIYOR',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SisterViewingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SisterViewingRequest_ownerOfficeId_status_createdAt_idx" ON "SisterViewingRequest"("ownerOfficeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SisterViewingRequest_requesterOfficeId_createdAt_idx" ON "SisterViewingRequest"("requesterOfficeId", "createdAt");

-- CreateIndex
CREATE INDEX "SisterViewingRequest_requesterUserId_idx" ON "SisterViewingRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "SisterViewingRequest_decidedByUserId_idx" ON "SisterViewingRequest"("decidedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SisterViewingRequest_unitId_requesterUserId_scheduledAt_key" ON "SisterViewingRequest"("unitId", "requesterUserId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_ownerOfficeId_fkey" FOREIGN KEY ("ownerOfficeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_requesterOfficeId_fkey" FOREIGN KEY ("requesterOfficeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_different_offices" CHECK ("ownerOfficeId" <> "requesterOfficeId");
ALTER TABLE "SisterViewingRequest" ADD CONSTRAINT "SisterViewingRequest_note_length" CHECK (char_length("note") <= 500);
