DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PendingRegistrationStatus'
  ) THEN
    CREATE TYPE "PendingRegistrationStatus" AS ENUM (
      'PHONE_VERIFICATION_PENDING',
      'EMAIL_VERIFICATION_PENDING',
      'READY_TO_CREATE_USER',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "PendingRegistration" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "registrationType" TEXT,
  "inviteCode" TEXT,
  "referralCandidateId" TEXT,

  "status" "PendingRegistrationStatus" NOT NULL DEFAULT 'PHONE_VERIFICATION_PENDING',

  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "phoneVerifiedAt" TIMESTAMP(3),
  "phoneVerificationCodeHash" TEXT,
  "phoneVerificationExpiresAt" TIMESTAMP(3),
  "phoneVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "phoneVerificationLastSentAt" TIMESTAMP(3),

  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifiedAt" TIMESTAMP(3),
  "emailVerificationCodeHash" TEXT,
  "emailVerificationExpiresAt" TIMESTAMP(3),
  "emailVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "emailVerificationLastSentAt" TIMESTAMP(3),

  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_email_key"
ON "PendingRegistration"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_phone_key"
ON "PendingRegistration"("phone");

CREATE INDEX IF NOT EXISTS "PendingRegistration_status_idx"
ON "PendingRegistration"("status");

CREATE INDEX IF NOT EXISTS "PendingRegistration_role_idx"
ON "PendingRegistration"("role");

CREATE INDEX IF NOT EXISTS "PendingRegistration_inviteCode_idx"
ON "PendingRegistration"("inviteCode");

CREATE INDEX IF NOT EXISTS "PendingRegistration_referralCandidateId_idx"
ON "PendingRegistration"("referralCandidateId");

CREATE INDEX IF NOT EXISTS "PendingRegistration_expiresAt_idx"
ON "PendingRegistration"("expiresAt");

CREATE INDEX IF NOT EXISTS "PendingRegistration_createdAt_idx"
ON "PendingRegistration"("createdAt");