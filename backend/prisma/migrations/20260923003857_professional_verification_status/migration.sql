CREATE TYPE "ProfessionalVerificationStatus" AS ENUM (
  'PENDING',
  'ANALYZING',
  'VERIFIED',
  'REVIEW_REQUIRED',
  'REJECTED'
);

ALTER TABLE "User"
ADD COLUMN "professionalVerificationStatus" "ProfessionalVerificationStatus";
