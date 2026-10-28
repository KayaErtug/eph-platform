-- CreateTable
CREATE TABLE "PhoneVerificationSecurity" (
    "phone" TEXT NOT NULL,
    "activePendingRegistrationId" TEXT,

    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),

    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "suspiciousAt" TIMESTAMP(3),

    "lastSmsSentAt" TIMESTAMP(3),
    "nextSmsAllowedAt" TIMESTAMP(3),

    "lastIpAddress" TEXT,
    "lastUserAgent" TEXT,

    "firebaseVerificationIdHash" TEXT,
    "firebaseSessionStartedAt" TIMESTAMP(3),
    "firebaseSessionExpiresAt" TIMESTAMP(3),
    "firebaseSessionConsumedAt" TIMESTAMP(3),
    "firebaseUid" TEXT,

    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneVerificationSecurity_pkey" PRIMARY KEY ("phone")
);

-- CreateIndex
CREATE INDEX "PhoneVerificationSecurity_activePendingRegistrationId_idx"
ON "PhoneVerificationSecurity"("activePendingRegistrationId");

-- CreateIndex
CREATE INDEX "PhoneVerificationSecurity_lockedUntil_idx"
ON "PhoneVerificationSecurity"("lockedUntil");

-- CreateIndex
CREATE INDEX "PhoneVerificationSecurity_nextSmsAllowedAt_idx"
ON "PhoneVerificationSecurity"("nextSmsAllowedAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationSecurity_suspiciousAt_idx"
ON "PhoneVerificationSecurity"("suspiciousAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationSecurity_lastIpAddress_updatedAt_idx"
ON "PhoneVerificationSecurity"("lastIpAddress", "updatedAt");
