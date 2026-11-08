-- CreateEnum
CREATE TYPE "DigitalContractType" AS ENUM ('YER_GOSTERME', 'REFERRAL_PASLASMA');

-- CreateEnum
CREATE TYPE "DigitalContractStatus" AS ENUM ('TASLAK', 'ONAYA_GONDERILDI', 'SMS_ONAYLANDI', 'E_IMZALANDI', 'ONAYLANDI', 'ARSIVLENDI', 'UYUSMAZLIK', 'IPTAL');

-- CreateTable
CREATE TABLE "DigitalContract" (
    "id" TEXT NOT NULL,
    "officeId" TEXT,
    "contractType" "DigitalContractType" NOT NULL,
    "status" "DigitalContractStatus" NOT NULL DEFAULT 'TASLAK',
    "title" TEXT NOT NULL,
    "unitId" TEXT,
    "demandId" TEXT,
    "createdById" TEXT NOT NULL,
    "secondPartyUserId" TEXT,
    "secondPartyOfficeId" TEXT,
    "clientFullName" TEXT,
    "clientPhone" TEXT,
    "clientTcNo" TEXT,
    "commissionSplitRatio" TEXT DEFAULT '%50 - %50',
    "termsNote" TEXT,
    "smsOtpCode" TEXT,
    "smsSentAt" TIMESTAMP(3),
    "smsVerifiedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "disputeNote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigitalContract_officeId_status_idx" ON "DigitalContract"("officeId", "status");
CREATE INDEX "DigitalContract_createdById_idx" ON "DigitalContract"("createdById");
CREATE INDEX "DigitalContract_unitId_idx" ON "DigitalContract"("unitId");
CREATE INDEX "DigitalContract_contractType_status_idx" ON "DigitalContract"("contractType", "status");

-- AddForeignKey
ALTER TABLE "DigitalContract" ADD CONSTRAINT "DigitalContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalContract" ADD CONSTRAINT "DigitalContract_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DigitalContract" ADD CONSTRAINT "DigitalContract_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
