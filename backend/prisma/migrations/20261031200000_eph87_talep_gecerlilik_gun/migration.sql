-- EPH-87 (§0-B): Talep Merkezi varsayılan geçerlilik süresi (gün) koddan SystemSetting'e taşındı.
-- Mevcut davranış korunur (30 gün); mevcut kayıt varsa değiştirilmez.
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
  '5d1c7a3e-87a1-4b6f-9e2c-0f87a1c3d587',
  'TALEP_GECERLILIK_GUN',
  '30'::jsonb,
  'Talep Merkezi talebinin varsayılan geçerlilik süresi (gün).',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
