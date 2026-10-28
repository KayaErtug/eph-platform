-- CreateEnum
CREATE TYPE "ProjectSceneStatus" AS ENUM ('TASLAK', 'TAMAMLANDI', 'ATLANDI');

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

-- Keep scene cleanup aligned with project deletion without coupling Prisma models.
CREATE OR REPLACE FUNCTION "cleanupProjectSceneOnProjectDelete"()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "ProjectScene" WHERE "projectId" = OLD."id";
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ProjectScene_project_delete_cleanup"
BEFORE DELETE ON "Project"
FOR EACH ROW
EXECUTE FUNCTION "cleanupProjectSceneOnProjectDelete"();
