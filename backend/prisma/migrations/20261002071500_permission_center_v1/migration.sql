ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_SYSTEM_SETTING';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_USER_PERMISSION';

CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PermissionDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultNumericLimit" INTEGER,
    "delegable" BOOLEAN NOT NULL DEFAULT true,
    "superAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PermissionDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "numericLimit" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemSetting_key_key"
ON "SystemSetting"("key");

CREATE INDEX "SystemSetting_updatedById_idx"
ON "SystemSetting"("updatedById");

CREATE UNIQUE INDEX "PermissionDefinition_key_key"
ON "PermissionDefinition"("key");

CREATE INDEX "PermissionDefinition_category_idx"
ON "PermissionDefinition"("category");

CREATE INDEX "PermissionDefinition_active_idx"
ON "PermissionDefinition"("active");

CREATE INDEX "PermissionDefinition_createdById_idx"
ON "PermissionDefinition"("createdById");

CREATE INDEX "PermissionDefinition_updatedById_idx"
ON "PermissionDefinition"("updatedById");

CREATE INDEX "UserPermissionOverride_userId_idx"
ON "UserPermissionOverride"("userId");

CREATE INDEX "UserPermissionOverride_permissionId_idx"
ON "UserPermissionOverride"("permissionId");

CREATE INDEX "UserPermissionOverride_updatedById_idx"
ON "UserPermissionOverride"("updatedById");

CREATE INDEX "UserPermissionOverride_validUntil_idx"
ON "UserPermissionOverride"("validUntil");

CREATE UNIQUE INDEX "UserPermissionOverride_userId_permissionId_key"
ON "UserPermissionOverride"("userId", "permissionId");

ALTER TABLE "SystemSetting"
ADD CONSTRAINT "SystemSetting_updatedById_fkey"
FOREIGN KEY ("updatedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "PermissionDefinition"
ADD CONSTRAINT "PermissionDefinition_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "PermissionDefinition"
ADD CONSTRAINT "PermissionDefinition_updatedById_fkey"
FOREIGN KEY ("updatedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey"
FOREIGN KEY ("permissionId")
REFERENCES "PermissionDefinition"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
ADD CONSTRAINT "UserPermissionOverride_updatedById_fkey"
FOREIGN KEY ("updatedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
