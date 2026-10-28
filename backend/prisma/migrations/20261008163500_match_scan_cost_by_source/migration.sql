INSERT INTO "SystemSetting" (
  "id",
  "key",
  "valueJson",
  "description",
  "updatedById",
  "createdAt",
  "updatedAt"
)
VALUES
(
  '3437a9a2-b015-4b5d-9ee5-a28f524bd0da',
  'MATCH_SCAN_COST_REQUEST_PK',
  '25'::jsonb,
  'Talep Merkezi kaydı manuel eşleşme taraması PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '887c51c1-c1a6-4c86-93ea-6e6e6c3457ec',
  'MATCH_SCAN_COST_PRIVATE_PORTFOLIO_PK',
  '25'::jsonb,
  'Gizli portföy manuel eşleşme taraması PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '0d527952-16be-4f57-b418-19b1f68b1033',
  'MATCH_SCAN_COST_POOL_PROPERTY_PK',
  '25'::jsonb,
  'Havuz ilanı manuel eşleşme taraması PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '41c0663c-736c-42b5-93dd-f50a2b144c22',
  'MATCH_SCAN_COST_CRM_PK',
  '25'::jsonb,
  'CRM kaydı manuel eşleşme taraması PK maliyeti.',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
