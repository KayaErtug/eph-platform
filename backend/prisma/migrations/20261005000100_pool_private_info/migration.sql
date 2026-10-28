ALTER TYPE "KontorIslemTuru"
ADD VALUE IF NOT EXISTS 'HAVUZ_OZEL_BILGI';

INSERT INTO "SystemSetting" (
  "id",
  "key",
  "valueJson",
  "description",
  "updatedById",
  "createdAt",
  "updatedAt"
)
VALUES (
  '6e7f554c-91f9-4c1b-9eb4-7e65edbd3925',
  'POOL_PRIVATE_INFO_COST',
  '25'::jsonb,
  'Havuz portföyündeki tüm özel bilgileri tek seferde açma PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
