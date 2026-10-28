CREATE TYPE "ProjectLifecycleStage" AS ENUM (
  'READY',
  'UNDER_CONSTRUCTION',
  'PLANNED'
);

ALTER TABLE "Project"
ADD COLUMN "lifecycleStage" "ProjectLifecycleStage";

CREATE INDEX "Project_lifecycleStage_idx"
ON "Project"("lifecycleStage");
