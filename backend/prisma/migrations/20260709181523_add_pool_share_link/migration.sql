-- CreateTable
CREATE TABLE "PoolShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoolShareLink_token_key" ON "PoolShareLink"("token");

-- CreateIndex
CREATE INDEX "PoolShareLink_unitId_idx" ON "PoolShareLink"("unitId");

-- CreateIndex
CREATE INDEX "PoolShareLink_sharedById_idx" ON "PoolShareLink"("sharedById");
