-- CreateEnum
CREATE TYPE "UyelikPaketSegmenti" AS ENUM ('EMLAK_PRO', 'MUTEAHHIT');

-- CreateEnum
CREATE TYPE "PortfolioCreditLotTuru" AS ENUM ('PAKET', 'DEVIR', 'SATIN_ALMA', 'HEDIYE', 'REFERANS', 'IADE', 'DUZELTME');

-- CreateEnum
CREATE TYPE "PaymentOrderPurpose" AS ENUM ('MEMBERSHIP_PURCHASE', 'MEMBERSHIP_RENEWAL', 'MEMBERSHIP_UPGRADE', 'PK_PURCHASE');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'REQUIRES_ACTION', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('AUTHORIZATION', 'CAPTURE', 'PAYMENT', 'VOID', 'REFUND', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentRefundStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterEnum
BEGIN;

CREATE TYPE "UyelikPaketKodu_new" AS ENUM ('DENEME', 'BRONZ', 'GUMUS', 'ALTIN');

ALTER TABLE "UyelikPaketi" ALTER COLUMN "paketKodu" TYPE "UyelikPaketKodu_new" USING ("paketKodu"::text::"UyelikPaketKodu_new");

ALTER TABLE "MesajlasmaLimiti" ALTER COLUMN "paketKodu" TYPE "UyelikPaketKodu_new" USING ("paketKodu"::text::"UyelikPaketKodu_new");

ALTER TABLE "AdminDuyuru" ALTER COLUMN "hedefPaket" TYPE "UyelikPaketKodu_new" USING ("hedefPaket"::text::"UyelikPaketKodu_new");

ALTER TYPE "UyelikPaketKodu" RENAME TO "UyelikPaketKodu_old";

ALTER TYPE "UyelikPaketKodu_new" RENAME TO "UyelikPaketKodu";

DROP TYPE "public"."UyelikPaketKodu_old";

COMMIT;

-- DropIndex
DROP INDEX "UyelikPaketi_paketKodu_key";

-- AlterTable
ALTER TABLE "UyelikPaketi" ADD COLUMN     "aylikHavuzGonderimLimiti" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aylikMatchLimiti" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aylikPaketPk" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aylikTalepLimiti" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aylikYeniGorusmeLimiti" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "denemeGunSayisi" INTEGER,
ADD COLUMN     "projeIlanLimiti" INTEGER,
ADD COLUMN     "projeLimiti" INTEGER,
ADD COLUMN     "segment" "UyelikPaketSegmenti" NOT NULL;

-- CreateTable
CREATE TABLE "PortfolioCreditLot" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "lotTuru" "PortfolioCreditLotTuru" NOT NULL,
    "ilkMiktar" INTEGER NOT NULL,
    "kalanMiktar" INTEGER NOT NULL,
    "sonKullanmaTarihi" TIMESTAMP(3),
    "kaynakKayitTuru" TEXT,
    "kaynakKayitId" TEXT,
    "uyelikId" TEXT,
    "paymentOrderId" TEXT,
    "dedupeKey" TEXT,
    "aciklama" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCreditLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "adapterKodu" TEXT NOT NULL,
    "capabilities" JSONB,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "oncelik" INTEGER NOT NULL DEFAULT 100,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "siparisNo" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "amac" "PaymentOrderPurpose" NOT NULL,
    "durum" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "tutar" DECIMAL(65,30) NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "hedefPaketId" TEXT,
    "pkMiktari" INTEGER,
    "fiyatSnapshot" JSONB,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "durum" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "checkoutReference" TEXT,
    "publicMetadata" JSONB,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "attemptId" TEXT,
    "providerId" TEXT,
    "providerTransactionId" TEXT,
    "islemTuru" "PaymentTransactionType" NOT NULL,
    "durum" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "tutar" DECIMAL(65,30) NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionId" TEXT,
    "providerId" TEXT,
    "providerRefundId" TEXT,
    "durum" "PaymentRefundStatus" NOT NULL DEFAULT 'CREATED',
    "tutar" DECIMAL(65,30) NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "sebep" TEXT,
    "metadata" JSONB,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerEventId" TEXT,
    "eventType" TEXT,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "uyelikId" TEXT,
    "portfolioCreditLotId" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCreditLot_dedupeKey_key" ON "PortfolioCreditLot"("dedupeKey");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_kullaniciId_idx" ON "PortfolioCreditLot"("kullaniciId");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_lotTuru_idx" ON "PortfolioCreditLot"("lotTuru");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_sonKullanmaTarihi_idx" ON "PortfolioCreditLot"("sonKullanmaTarihi");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_uyelikId_idx" ON "PortfolioCreditLot"("uyelikId");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_paymentOrderId_idx" ON "PortfolioCreditLot"("paymentOrderId");

-- CreateIndex
CREATE INDEX "PortfolioCreditLot_aktifMi_idx" ON "PortfolioCreditLot"("aktifMi");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_kod_key" ON "PaymentProvider"("kod");

-- CreateIndex
CREATE INDEX "PaymentProvider_aktifMi_idx" ON "PaymentProvider"("aktifMi");

-- CreateIndex
CREATE INDEX "PaymentProvider_oncelik_idx" ON "PaymentProvider"("oncelik");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_siparisNo_key" ON "PaymentOrder"("siparisNo");

-- CreateIndex
CREATE INDEX "PaymentOrder_kullaniciId_idx" ON "PaymentOrder"("kullaniciId");

-- CreateIndex
CREATE INDEX "PaymentOrder_amac_idx" ON "PaymentOrder"("amac");

-- CreateIndex
CREATE INDEX "PaymentOrder_durum_idx" ON "PaymentOrder"("durum");

-- CreateIndex
CREATE INDEX "PaymentOrder_hedefPaketId_idx" ON "PaymentOrder"("hedefPaketId");

-- CreateIndex
CREATE INDEX "PaymentOrder_olusturulmaTarihi_idx" ON "PaymentOrder"("olusturulmaTarihi");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_providerId_idx" ON "PaymentAttempt"("providerId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_durum_idx" ON "PaymentAttempt"("durum");

-- CreateIndex
CREATE INDEX "PaymentAttempt_providerReference_idx" ON "PaymentAttempt"("providerReference");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_attemptId_idx" ON "PaymentTransaction"("attemptId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_providerId_idx" ON "PaymentTransaction"("providerId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_providerTransactionId_idx" ON "PaymentTransaction"("providerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_durum_idx" ON "PaymentTransaction"("durum");

-- CreateIndex
CREATE INDEX "PaymentRefund_orderId_idx" ON "PaymentRefund"("orderId");

-- CreateIndex
CREATE INDEX "PaymentRefund_transactionId_idx" ON "PaymentRefund"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentRefund_providerId_idx" ON "PaymentRefund"("providerId");

-- CreateIndex
CREATE INDEX "PaymentRefund_providerRefundId_idx" ON "PaymentRefund"("providerRefundId");

-- CreateIndex
CREATE INDEX "PaymentRefund_durum_idx" ON "PaymentRefund"("durum");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerId_idx" ON "PaymentWebhookEvent"("providerId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerEventId_idx" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processed_idx" ON "PaymentWebhookEvent"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerId_payloadHash_key" ON "PaymentWebhookEvent"("providerId", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlement_orderId_key" ON "PaymentSettlement"("orderId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_kullaniciId_idx" ON "PaymentSettlement"("kullaniciId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_uyelikId_idx" ON "PaymentSettlement"("uyelikId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_portfolioCreditLotId_idx" ON "PaymentSettlement"("portfolioCreditLotId");

-- CreateIndex
CREATE INDEX "UyelikPaketi_segment_idx" ON "UyelikPaketi"("segment");

-- CreateIndex
CREATE UNIQUE INDEX "UyelikPaketi_paketKodu_segment_key" ON "UyelikPaketi"("paketKodu", "segment");

-- AddForeignKey
ALTER TABLE "PortfolioCreditLot" ADD CONSTRAINT "PortfolioCreditLot_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCreditLot" ADD CONSTRAINT "PortfolioCreditLot_uyelikId_fkey" FOREIGN KEY ("uyelikId") REFERENCES "KullaniciUyelikPaketi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioCreditLot" ADD CONSTRAINT "PortfolioCreditLot_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_hedefPaketId_fkey" FOREIGN KEY ("hedefPaketId") REFERENCES "UyelikPaketi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_uyelikId_fkey" FOREIGN KEY ("uyelikId") REFERENCES "KullaniciUyelikPaketi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_portfolioCreditLotId_fkey" FOREIGN KEY ("portfolioCreditLotId") REFERENCES "PortfolioCreditLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
