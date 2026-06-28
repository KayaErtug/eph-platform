-- CreateEnum
CREATE TYPE "ProjectFloorType" AS ENUM ('BODRUM', 'ZEMIN', 'NORMAL', 'ASMA', 'TERAS', 'CATI', 'DIGER');

-- CreateEnum
CREATE TYPE "ProjectInventoryBatchType" AS ENUM ('EXCEL_IMPORT', 'CSV_IMPORT', 'RULE_GENERATION', 'NATURAL_LANGUAGE_GENERATION', 'BULK_PRICE_UPDATE', 'BULK_STATUS_UPDATE', 'BULK_FEATURE_UPDATE', 'BULK_DELIVERY_UPDATE', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "ProjectInventoryBatchStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'PREVIEW_READY', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ProjectInventoryBatchItemAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'DELETE', 'NO_CHANGE', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "ProjectInventoryBatchItemStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'PROCESSING', 'CREATED', 'UPDATED', 'SKIPPED', 'FAILED', 'ROLLED_BACK');

-- AlterEnum
ALTER TYPE "UnitStatus" ADD VALUE 'OPSIYONLU';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "code" TEXT,
ADD COLUMN     "completionPercent" INTEGER,
ADD COLUMN     "defaultDeliveryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "facades" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "floorId" TEXT,
ADD COLUMN     "grossArea" DOUBLE PRECISION,
ADD COLUMN     "inventoryCode" TEXT,
ADD COLUMN     "inventorySortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "netArea" DOUBLE PRECISION,
ADD COLUMN     "salesRepresentativeId" TEXT,
ADD COLUMN     "sourceBatchId" TEXT;

-- CreateTable
CREATE TABLE "ProjectBlock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceBatchId" TEXT,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "name" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFloor" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sourceBatchId" TEXT,
    "level" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "floorType" "ProjectFloorType" NOT NULL DEFAULT 'NORMAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInventoryBatch" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "originalBatchId" TEXT,
    "type" "ProjectInventoryBatchType" NOT NULL,
    "status" "ProjectInventoryBatchStatus" NOT NULL DEFAULT 'UPLOADED',
    "idempotencyKey" TEXT NOT NULL,
    "inputHash" TEXT,
    "sourceFileName" TEXT,
    "sourceFileUrl" TEXT,
    "sourceText" TEXT,
    "templateVersion" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "validationSummary" JSONB,
    "errorSummary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectInventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInventoryBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "unitId" TEXT,
    "sequence" INTEGER NOT NULL,
    "sourceRow" INTEGER,
    "naturalKey" TEXT,
    "action" "ProjectInventoryBatchItemAction" NOT NULL DEFAULT 'CREATE',
    "status" "ProjectInventoryBatchItemStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB,
    "normalizedData" JSONB,
    "errors" JSONB,
    "warnings" JSONB,
    "beforeData" JSONB,
    "afterData" JSONB,
    "afterHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectInventoryBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectBlock_projectId_sortOrder_idx" ON "ProjectBlock"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectBlock_sourceBatchId_idx" ON "ProjectBlock"("sourceBatchId");

-- CreateIndex
CREATE INDEX "ProjectBlock_isActive_idx" ON "ProjectBlock"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBlock_projectId_normalizedCode_key" ON "ProjectBlock"("projectId", "normalizedCode");

-- CreateIndex
CREATE INDEX "ProjectFloor_blockId_sortOrder_idx" ON "ProjectFloor"("blockId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectFloor_sourceBatchId_idx" ON "ProjectFloor"("sourceBatchId");

-- CreateIndex
CREATE INDEX "ProjectFloor_floorType_idx" ON "ProjectFloor"("floorType");

-- CreateIndex
CREATE INDEX "ProjectFloor_isActive_idx" ON "ProjectFloor"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFloor_blockId_level_key" ON "ProjectFloor"("blockId", "level");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_projectId_status_idx" ON "ProjectInventoryBatch"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_projectId_type_idx" ON "ProjectInventoryBatch"("projectId", "type");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_createdById_idx" ON "ProjectInventoryBatch"("createdById");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_originalBatchId_idx" ON "ProjectInventoryBatch"("originalBatchId");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_inputHash_idx" ON "ProjectInventoryBatch"("inputHash");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatch_createdAt_idx" ON "ProjectInventoryBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInventoryBatch_projectId_idempotencyKey_key" ON "ProjectInventoryBatch"("projectId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatchItem_batchId_status_idx" ON "ProjectInventoryBatchItem"("batchId", "status");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatchItem_batchId_action_idx" ON "ProjectInventoryBatchItem"("batchId", "action");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatchItem_unitId_idx" ON "ProjectInventoryBatchItem"("unitId");

-- CreateIndex
CREATE INDEX "ProjectInventoryBatchItem_naturalKey_idx" ON "ProjectInventoryBatchItem"("naturalKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInventoryBatchItem_batchId_sequence_key" ON "ProjectInventoryBatchItem"("batchId", "sequence");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_isActive_idx" ON "Project"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Project_ownerId_code_key" ON "Project"("ownerId", "code");

-- CreateIndex
CREATE INDEX "Unit_projectId_blockId_floorId_idx" ON "Unit"("projectId", "blockId", "floorId");

-- CreateIndex
CREATE INDEX "Unit_projectId_status_idx" ON "Unit"("projectId", "status");

-- CreateIndex
CREATE INDEX "Unit_blockId_idx" ON "Unit"("blockId");

-- CreateIndex
CREATE INDEX "Unit_floorId_idx" ON "Unit"("floorId");

-- CreateIndex
CREATE INDEX "Unit_sourceBatchId_idx" ON "Unit"("sourceBatchId");

-- CreateIndex
CREATE INDEX "Unit_salesRepresentativeId_idx" ON "Unit"("salesRepresentativeId");

-- CreateIndex
CREATE INDEX "Unit_deliveryDate_idx" ON "Unit"("deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_projectId_inventoryCode_key" ON "Unit"("projectId", "inventoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_projectId_externalRef_key" ON "Unit"("projectId", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_projectId_blockId_floorId_number_key" ON "Unit"("projectId", "blockId", "floorId", "number");

-- AddForeignKey
ALTER TABLE "ProjectBlock" ADD CONSTRAINT "ProjectBlock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBlock" ADD CONSTRAINT "ProjectBlock_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ProjectInventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFloor" ADD CONSTRAINT "ProjectFloor_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ProjectBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFloor" ADD CONSTRAINT "ProjectFloor_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ProjectInventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInventoryBatch" ADD CONSTRAINT "ProjectInventoryBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInventoryBatch" ADD CONSTRAINT "ProjectInventoryBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInventoryBatch" ADD CONSTRAINT "ProjectInventoryBatch_originalBatchId_fkey" FOREIGN KEY ("originalBatchId") REFERENCES "ProjectInventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInventoryBatchItem" ADD CONSTRAINT "ProjectInventoryBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProjectInventoryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInventoryBatchItem" ADD CONSTRAINT "ProjectInventoryBatchItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ProjectBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "ProjectFloor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ProjectInventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_salesRepresentativeId_fkey" FOREIGN KEY ("salesRepresentativeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
