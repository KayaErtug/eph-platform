-- CreateEnum
CREATE TYPE "SisterLinkStatus" AS ENUM ('BEKLIYOR', 'AKTIF', 'REDDEDILDI', 'SONLANDI');
-- CreateEnum
CREATE TYPE "SisterRequestStatus" AS ENUM ('BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI');
-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "code" TEXT;
-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "sharedWithSisters" BOOLEAN NOT NULL DEFAULT false;
-- Backfill: mevcut ofislere cakismasiz sabit kod (OFS-123456)
DO $$
DECLARE r RECORD; c TEXT;
BEGIN
  FOR r IN SELECT "id" FROM "Office" WHERE "code" IS NULL ORDER BY "createdAt", "id" LOOP
    LOOP
      c := 'OFS-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Office" WHERE "code" = c);
    END LOOP;
    UPDATE "Office" SET "code" = c WHERE "id" = r."id";
  END LOOP;
END
$$;

-- CreateTable
CREATE TABLE "OfficeSisterLink" (
    "id" TEXT NOT NULL,
    "officeAId" TEXT NOT NULL,
    "officeBId" TEXT NOT NULL,
    "status" "SisterLinkStatus" NOT NULL DEFAULT 'BEKLIYOR',
    "invitedByOfficeId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "commissionSplitPct" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedByUserId" TEXT,
    CONSTRAINT "OfficeSisterLink_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "SisterPrivateInfoRequest" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ownerOfficeId" TEXT NOT NULL,
    "requesterOfficeId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "status" "SisterRequestStatus" NOT NULL DEFAULT 'BEKLIYOR',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SisterPrivateInfoRequest_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "SisterPrivateInfoAccessLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SisterPrivateInfoAccessLog_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "OfficeSisterLink_officeBId_idx" ON "OfficeSisterLink"("officeBId");
-- CreateIndex
CREATE INDEX "OfficeSisterLink_status_idx" ON "OfficeSisterLink"("status");
-- CreateIndex
CREATE UNIQUE INDEX "OfficeSisterLink_officeAId_officeBId_key" ON "OfficeSisterLink"("officeAId", "officeBId");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoRequest_ownerOfficeId_status_idx" ON "SisterPrivateInfoRequest"("ownerOfficeId", "status");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoRequest_requesterOfficeId_idx" ON "SisterPrivateInfoRequest"("requesterOfficeId");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoRequest_requesterUserId_idx" ON "SisterPrivateInfoRequest"("requesterUserId");
-- CreateIndex
CREATE UNIQUE INDEX "SisterPrivateInfoRequest_unitId_requesterUserId_key" ON "SisterPrivateInfoRequest"("unitId", "requesterUserId");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoAccessLog_requestId_idx" ON "SisterPrivateInfoAccessLog"("requestId");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoAccessLog_unitId_idx" ON "SisterPrivateInfoAccessLog"("unitId");
-- CreateIndex
CREATE INDEX "SisterPrivateInfoAccessLog_viewerUserId_idx" ON "SisterPrivateInfoAccessLog"("viewerUserId");
-- CreateIndex
CREATE UNIQUE INDEX "Office_code_key" ON "Office"("code");
-- CreateIndex
CREATE INDEX "Unit_sharedWithSisters_idx" ON "Unit"("sharedWithSisters");
-- AddForeignKey
ALTER TABLE "OfficeSisterLink" ADD CONSTRAINT "OfficeSisterLink_officeAId_fkey" FOREIGN KEY ("officeAId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "OfficeSisterLink" ADD CONSTRAINT "OfficeSisterLink_officeBId_fkey" FOREIGN KEY ("officeBId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "SisterPrivateInfoRequest" ADD CONSTRAINT "SisterPrivateInfoRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "SisterPrivateInfoRequest" ADD CONSTRAINT "SisterPrivateInfoRequest_ownerOfficeId_fkey" FOREIGN KEY ("ownerOfficeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "SisterPrivateInfoRequest" ADD CONSTRAINT "SisterPrivateInfoRequest_requesterOfficeId_fkey" FOREIGN KEY ("requesterOfficeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "SisterPrivateInfoAccessLog" ADD CONSTRAINT "SisterPrivateInfoAccessLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SisterPrivateInfoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Varsayilan izinli ofis paketleri (OFFICE_MEMBERSHIP_PACKAGES kodlari: Altin=ALTIN, Platin=PLATINUM)
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'KARDES_OFIS_PAKETLER', '["ALTIN","PLATINUM"]'::jsonb, 'Kardes ofis agi icin izinli ofis paket kodlari', now(), now())
ON CONFLICT ("key") DO NOTHING;
