BEGIN;
SELECT pg_advisory_xact_lock(hashtext('eph:user-blocks:v1'));
CREATE TABLE IF NOT EXISTS "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'EPH kullanıcısı',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserBlock_no_self_block" CHECK ("blockerId" <> "blockedId"),
    CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX IF NOT EXISTS "UserBlock_blockedId_blockerId_idx" ON "UserBlock"("blockedId", "blockerId");
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'UserBlock') <> 5
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = '"UserBlock"'::regclass AND contype = 'f' AND confrelid = '"User"'::regclass AND confdeltype = 'c') <> 2
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"UserBlock"'::regclass AND conname = 'UserBlock_no_self_block')
  THEN RAISE EXCEPTION 'UserBlock schema does not match the controlled migration';
  END IF;
END $$;
COMMIT;
