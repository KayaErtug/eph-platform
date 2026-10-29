-- EPH-28B: piyasa şeridi elle değerler. Deploy sırasında BİR KEZ çalıştırılır (idempotent). Henüz ÇALIŞTIRILMADI.
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'MARKET_KONUT_FAIZ_AYLIK', '{"value": 2.74}'::jsonb, 'Konut kredisi aylık faiz oranı (%). Doluysa piyasa şeridinde otomatik kaynağın yerine geçer.', now(), now()),
  (gen_random_uuid()::text, 'MARKET_KONUT_FAIZ_KAYNAK', '{"value": "Akbank İlk Evim"}'::jsonb, 'Konut kredisi faizinin kaynak adı (ör. Akbank İlk Evim). Boşsa ''Yönetici'' yazılır.', now(), now()),
  (gen_random_uuid()::text, 'MARKET_MANUAL_CEYREK_ALTIN', '{"value": 10425}'::jsonb, 'CEYREK_ALTIN elle değer. Doluysa piyasa şeridinde otomatik kaynağın yerine geçer (kaynak: Yönetici).', now(), now())
ON CONFLICT ("key") DO UPDATE SET
  "valueJson" = EXCLUDED."valueJson",
  "description" = EXCLUDED."description",
  "updatedAt" = now();
