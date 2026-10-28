CREATE TABLE "RolePermissionPolicy" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "numericLimit" INTEGER,
    "metadata" JSONB,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermissionPolicy_role_permissionId_key"
ON "RolePermissionPolicy"("role", "permissionId");

CREATE INDEX "RolePermissionPolicy_role_idx"
ON "RolePermissionPolicy"("role");

CREATE INDEX "RolePermissionPolicy_permissionId_idx"
ON "RolePermissionPolicy"("permissionId");

CREATE INDEX "RolePermissionPolicy_updatedById_idx"
ON "RolePermissionPolicy"("updatedById");

ALTER TABLE "RolePermissionPolicy"
ADD CONSTRAINT "RolePermissionPolicy_permissionId_fkey"
FOREIGN KEY ("permissionId")
REFERENCES "PermissionDefinition"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "RolePermissionPolicy"
ADD CONSTRAINT "RolePermissionPolicy_updatedById_fkey"
FOREIGN KEY ("updatedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
