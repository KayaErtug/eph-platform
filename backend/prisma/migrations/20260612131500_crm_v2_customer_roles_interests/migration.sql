-- CreateEnum
CREATE TYPE "CustomerRole" AS ENUM ('ALICI', 'SATICI', 'KIRACI', 'MAL_SAHIBI', 'YATIRIMCI', 'MUTEAHHIT', 'INSAAT_FIRMASI', 'ARSA_SAHIBI');

-- CreateEnum
CREATE TYPE "CustomerPurchaseIntent" AS ENUM ('BELIRSIZ', 'SATIN_ALMA', 'KIRALAMA', 'YATIRIM', 'ARSA_GELISTIRME', 'KAT_KARSILIGI');

-- CreateEnum
CREATE TYPE "CustomerInterestPriority" AS ENUM ('DUSUK', 'NORMAL', 'YUKSEK', 'ACIL');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "roles" "CustomerRole"[] DEFAULT ARRAY[]::"CustomerRole"[],
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CustomerInterest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT,
    "city" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "propertyTypes" "UnitType"[] DEFAULT ARRAY[]::"UnitType"[],
    "statuses" "UnitStatus"[] DEFAULT ARRAY[]::"UnitStatus"[],
    "minBudget" DOUBLE PRECISION,
    "maxBudget" DOUBLE PRECISION,
    "priceCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "minArea" DOUBLE PRECISION,
    "maxArea" DOUBLE PRECISION,
    "roomCounts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purchaseIntent" "CustomerPurchaseIntent" NOT NULL DEFAULT 'BELIRSIZ',
    "priority" "CustomerInterestPriority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerInterest_customerId_idx" ON "CustomerInterest"("customerId");

-- CreateIndex
CREATE INDEX "CustomerInterest_city_district_neighborhood_idx" ON "CustomerInterest"("city", "district", "neighborhood");

-- CreateIndex
CREATE INDEX "CustomerInterest_isActive_idx" ON "CustomerInterest"("isActive");

-- CreateIndex
CREATE INDEX "CustomerInterest_priority_idx" ON "CustomerInterest"("priority");

-- CreateIndex
CREATE INDEX "CustomerInterest_purchaseIntent_idx" ON "CustomerInterest"("purchaseIntent");

-- CreateIndex
CREATE INDEX "CustomerInterest_createdAt_idx" ON "CustomerInterest"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_city_idx" ON "Customer"("city");

-- CreateIndex
CREATE INDEX "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- AddForeignKey
ALTER TABLE "CustomerInterest" ADD CONSTRAINT "CustomerInterest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

