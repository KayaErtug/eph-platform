ALTER TYPE "AuditAction"
  ADD VALUE IF NOT EXISTS 'HEDIYE_KONTOR_HAVUZU_OLUSTUR';

ALTER TYPE "AuditAction"
  ADD VALUE IF NOT EXISTS 'HEDIYE_KONTOR_HAVUZU_YUKLE';

ALTER TYPE "AuditAction"
  ADD VALUE IF NOT EXISTS 'HEDIYE_KONTOR_GONDER';

ALTER TYPE "AuditAction"
  ADD VALUE IF NOT EXISTS 'TRIAL_UZAT';

CREATE TABLE IF NOT EXISTS "HediyeKontorHavuzu" (
  "id" TEXT NOT NULL,
  "kod" TEXT NOT NULL DEFAULT 'GLOBAL',
  "bakiye" INTEGER NOT NULL DEFAULT 50000,
  "toplamYukleme" INTEGER NOT NULL DEFAULT 50000,
  "toplamDagitim" INTEGER NOT NULL DEFAULT 0,
  "aktifMi" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HediyeKontorHavuzu_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "HediyeKontorHavuzu_bakiye_check"
    CHECK ("bakiye" >= 0),

  CONSTRAINT "HediyeKontorHavuzu_createdById_fkey"
    FOREIGN KEY ("createdById")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "HediyeKontorHavuzu_kod_key"
  ON "HediyeKontorHavuzu"("kod");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorHavuzu_aktifMi_idx"
  ON "HediyeKontorHavuzu"("aktifMi");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorHavuzu_createdById_idx"
  ON "HediyeKontorHavuzu"("createdById");

CREATE TABLE IF NOT EXISTS "HediyeKontorDagitimi" (
  "id" TEXT NOT NULL,
  "havuzId" TEXT NOT NULL,
  "gonderenId" TEXT,
  "aliciId" TEXT,
  "miktar" INTEGER NOT NULL,
  "gonderenRol" "Role" NOT NULL,
  "adminKaynakli" BOOLEAN NOT NULL DEFAULT false,
  "aciklama" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HediyeKontorDagitimi_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "HediyeKontorDagitimi_miktar_check"
    CHECK ("miktar" > 0),

  CONSTRAINT "HediyeKontorDagitimi_havuzId_fkey"
    FOREIGN KEY ("havuzId")
    REFERENCES "HediyeKontorHavuzu"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "HediyeKontorDagitimi_gonderenId_fkey"
    FOREIGN KEY ("gonderenId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT "HediyeKontorDagitimi_aliciId_fkey"
    FOREIGN KEY ("aliciId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS
  "HediyeKontorDagitimi_havuzId_idx"
  ON "HediyeKontorDagitimi"("havuzId");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorDagitimi_gonderenId_idx"
  ON "HediyeKontorDagitimi"("gonderenId");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorDagitimi_aliciId_idx"
  ON "HediyeKontorDagitimi"("aliciId");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorDagitimi_adminKaynakli_idx"
  ON "HediyeKontorDagitimi"("adminKaynakli");

CREATE INDEX IF NOT EXISTS
  "HediyeKontorDagitimi_createdAt_idx"
  ON "HediyeKontorDagitimi"("createdAt");

INSERT INTO "HediyeKontorHavuzu" (
  "id",
  "kod",
  "bakiye",
  "toplamYukleme",
  "toplamDagitim",
  "aktifMi",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'GLOBAL',
  50000,
  50000,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("kod") DO NOTHING;
