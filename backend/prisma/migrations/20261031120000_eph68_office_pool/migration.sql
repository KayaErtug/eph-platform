-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "hiddenFromOffice" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Unit_hiddenFromOffice_idx" ON "Unit"("hiddenFromOffice");
