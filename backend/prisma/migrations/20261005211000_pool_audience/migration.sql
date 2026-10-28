CREATE TYPE "PoolAudienceMode" AS ENUM ('PUBLIC', 'TARGETED');

CREATE TABLE "PoolAudienceGroup" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PoolAudienceGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PoolAudienceGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoolAudienceGroupMember_pkey"
        PRIMARY KEY ("groupId", "userId")
);

CREATE TABLE "PoolAudienceUnit" (
    "unitId" TEXT NOT NULL,
    "mode" "PoolAudienceMode" NOT NULL DEFAULT 'PUBLIC',
    "roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PoolAudienceUnit_pkey" PRIMARY KEY ("unitId")
);

CREATE TABLE "PoolAudienceUnitGroup" (
    "unitId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "PoolAudienceUnitGroup_pkey"
        PRIMARY KEY ("unitId", "groupId")
);

CREATE INDEX "PoolAudienceGroup_ownerId_idx"
    ON "PoolAudienceGroup"("ownerId");

CREATE UNIQUE INDEX "PoolAudienceGroup_ownerId_name_key"
    ON "PoolAudienceGroup"("ownerId", "name");

CREATE INDEX "PoolAudienceGroupMember_userId_idx"
    ON "PoolAudienceGroupMember"("userId");

CREATE INDEX "PoolAudienceUnit_mode_idx"
    ON "PoolAudienceUnit"("mode");

CREATE INDEX "PoolAudienceUnitGroup_groupId_idx"
    ON "PoolAudienceUnitGroup"("groupId");

ALTER TABLE "PoolAudienceGroup"
    ADD CONSTRAINT "PoolAudienceGroup_ownerId_fkey"
    FOREIGN KEY ("ownerId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "PoolAudienceGroupMember"
    ADD CONSTRAINT "PoolAudienceGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId")
    REFERENCES "PoolAudienceGroup"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "PoolAudienceGroupMember"
    ADD CONSTRAINT "PoolAudienceGroupMember_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "PoolAudienceUnit"
    ADD CONSTRAINT "PoolAudienceUnit_unitId_fkey"
    FOREIGN KEY ("unitId")
    REFERENCES "Unit"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "PoolAudienceUnitGroup"
    ADD CONSTRAINT "PoolAudienceUnitGroup_unitId_fkey"
    FOREIGN KEY ("unitId")
    REFERENCES "PoolAudienceUnit"("unitId")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "PoolAudienceUnitGroup"
    ADD CONSTRAINT "PoolAudienceUnitGroup_groupId_fkey"
    FOREIGN KEY ("groupId")
    REFERENCES "PoolAudienceGroup"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
