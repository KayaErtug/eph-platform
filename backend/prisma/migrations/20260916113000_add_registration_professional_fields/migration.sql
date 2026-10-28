ALTER TABLE "User"
ADD COLUMN "taxNumber" TEXT,
ADD COLUMN "taxOffice" TEXT,
ADD COLUMN "professionalDocumentNumber" TEXT;

ALTER TABLE "PendingRegistration"
ADD COLUMN "taxNumber" TEXT,
ADD COLUMN "taxOffice" TEXT,
ADD COLUMN "professionalDocumentNumber" TEXT,
ADD COLUMN "professionalDocumentUrl" TEXT,
ADD COLUMN "professionalDocumentName" TEXT,
ADD COLUMN "professionalDocumentMime" TEXT;
