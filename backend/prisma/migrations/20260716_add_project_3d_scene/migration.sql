-- CreateEnum
CREATE TYPE "ProjectSceneStatus" AS ENUM ('TASLAK', 'TAMAMLANDI', 'ATLANDI');

-- AlterEnum
ALTER TYPE "ProjectWizardStep" ADD VALUE IF NOT EXISTS 'MODEL_3D' BEFORE 'KONTROL';

-- CreateTable
CREATE TABLE "ProjectScene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProjectSceneStatus" NOT NULL DEFAULT 'TASLAK',
    "sceneData" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScene_projectId_key" ON "ProjectScene"("projectId");

-- CreateIndex
CREATE INDEX "ProjectScene_status_idx" ON "ProjectScene"("status");

-- AddForeignKey
ALTER TABLE "ProjectScene" ADD CONSTRAINT "ProjectScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
