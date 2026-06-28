-- CreateEnum
CREATE TYPE "ProjectMediaPackageType" AS ENUM ('PROJECT_GENERAL', 'UNIT_STANDARD', 'COMMERCIAL_STANDARD', 'OTHER');

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "mediaPackageId" TEXT;

-- CreateTable
CREATE TABLE "ProjectMediaPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProjectMediaPackageType" NOT NULL,
    "unitType" "UnitType",
    "roomCount" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMediaPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMediaAsset" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "supabaseUrl" TEXT,
    "path" TEXT NOT NULL,
    "bucket" TEXT NOT NULL DEFAULT 'portfolio-images',
    "originalName" TEXT,
    "mimetype" TEXT,
    "size" INTEGER,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMediaPackage_projectId_type_idx" ON "ProjectMediaPackage"("projectId", "type");

-- CreateIndex
CREATE INDEX "ProjectMediaPackage_projectId_unitType_roomCount_idx" ON "ProjectMediaPackage"("projectId", "unitType", "roomCount");

-- CreateIndex
CREATE INDEX "ProjectMediaPackage_projectId_isDefault_idx" ON "ProjectMediaPackage"("projectId", "isDefault");

-- CreateIndex
CREATE INDEX "ProjectMediaPackage_isActive_idx" ON "ProjectMediaPackage"("isActive");

-- CreateIndex
CREATE INDEX "ProjectMediaPackage_sortOrder_idx" ON "ProjectMediaPackage"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMediaPackage_projectId_code_key" ON "ProjectMediaPackage"("projectId", "code");

-- CreateIndex
CREATE INDEX "ProjectMediaAsset_packageId_idx" ON "ProjectMediaAsset"("packageId");

-- CreateIndex
CREATE INDEX "ProjectMediaAsset_packageId_isCover_idx" ON "ProjectMediaAsset"("packageId", "isCover");

-- CreateIndex
CREATE INDEX "ProjectMediaAsset_packageId_sortOrder_idx" ON "ProjectMediaAsset"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "Unit_mediaPackageId_idx" ON "Unit"("mediaPackageId");

-- AddForeignKey
ALTER TABLE "ProjectMediaPackage" ADD CONSTRAINT "ProjectMediaPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMediaAsset" ADD CONSTRAINT "ProjectMediaAsset_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProjectMediaPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_mediaPackageId_fkey" FOREIGN KEY ("mediaPackageId") REFERENCES "ProjectMediaPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
