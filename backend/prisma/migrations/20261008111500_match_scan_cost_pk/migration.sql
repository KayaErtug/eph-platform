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
  '24f587c2-a34d-44bc-8ee4-a901c9768251',
  'MATCH_SCAN_COST_PK',
  '25'::jsonb,
  'Manuel EPH eşleşme taramasının PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
