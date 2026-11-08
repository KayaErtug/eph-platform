-- EPH: OFIS_BOY ve Potansiyel Portföy (Saha Avcısı) Migration Scripti
-- Tarih: 2026-11-03

-- 1. OFIS_BOY rolünü Role enum'ına ekle (idempotent)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OFIS_BOY';

-- 2. Yeni Enum'ları oluştur
DO $$ BEGIN
    CREATE TYPE "PotentialUnitType" AS ENUM ('SATILIK', 'KIRALIK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PotentialUnitSource" AS ENUM ('SAHIBINDEN', 'EMLAKCI', 'DIGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PotentialUnitStatus" AS ENUM ('YENI', 'ARANDI_ULASILAMADI', 'TAKIPTE', 'YETKI_ALINDI', 'IPTAL_PASIF', 'DONUSTURULDU');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PotentialUnit tablosunu oluştur
CREATE TABLE IF NOT EXISTS "PotentialUnit" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "convertedUnitId" TEXT,
    "type" "PotentialUnitType" NOT NULL DEFAULT 'SATILIK',
    "sourceType" "PotentialUnitSource" NOT NULL DEFAULT 'SAHIBINDEN',
    "contactPhone" TEXT,
    "contactName" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "street" TEXT,
    "buildingNo" TEXT,
    "formattedAddress" TEXT,
    "addressNotes" TEXT,
    "description" TEXT,
    "status" "PotentialUnitStatus" NOT NULL DEFAULT 'YENI',
    "statusNote" TEXT,
    "hunterPoints" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotentialUnit_pkey" PRIMARY KEY ("id")
);

-- 4. İndeksler
CREATE INDEX IF NOT EXISTS "PotentialUnit_officeId_status_idx" ON "PotentialUnit"("officeId", "status");
CREATE INDEX IF NOT EXISTS "PotentialUnit_createdById_idx" ON "PotentialUnit"("createdById");
CREATE INDEX IF NOT EXISTS "PotentialUnit_assignedUserId_idx" ON "PotentialUnit"("assignedUserId");
CREATE INDEX IF NOT EXISTS "PotentialUnit_city_district_idx" ON "PotentialUnit"("city", "district");
CREATE INDEX IF NOT EXISTS "PotentialUnit_createdAt_idx" ON "PotentialUnit"("createdAt");

-- 5. Foreign Key İlişkileri
DO $$ BEGIN
    ALTER TABLE "PotentialUnit" ADD CONSTRAINT "PotentialUnit_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PotentialUnit" ADD CONSTRAINT "PotentialUnit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PotentialUnit" ADD CONSTRAINT "PotentialUnit_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PotentialUnit" ADD CONSTRAINT "PotentialUnit_convertedUnitId_fkey" FOREIGN KEY ("convertedUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
