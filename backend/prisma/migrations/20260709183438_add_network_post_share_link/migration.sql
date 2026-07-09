-- CreateTable
CREATE TABLE "NetworkPostShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkPostShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkPostShareLink_token_key" ON "NetworkPostShareLink"("token");

-- CreateIndex
CREATE INDEX "NetworkPostShareLink_postId_idx" ON "NetworkPostShareLink"("postId");

-- CreateIndex
CREATE INDEX "NetworkPostShareLink_sharedById_idx" ON "NetworkPostShareLink"("sharedById");
