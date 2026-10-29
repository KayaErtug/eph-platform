-- EPH-10A-1: COST_* ticari değer anahtarları. ÇALIŞTIRILMADI; canlıya alınırken birlikte çalıştırılacak.
-- Davranış değişmez: değerler bugünkü canlı davranışa eşittir. Mevcut ayarlar varsa değeri onlardan alır.
-- Tekrar çalıştırmak güvenlidir (ON CONFLICT DO NOTHING). Geri alma: DELETE FROM "SystemSetting" WHERE "key" LIKE 'COST\_%';
BEGIN;

WITH legacy AS (
  SELECT
    (SELECT CASE jsonb_typeof("valueJson"::jsonb) WHEN 'number' THEN "valueJson"::jsonb WHEN 'object' THEN "valueJson"::jsonb->'value' END
       FROM "SystemSetting" WHERE "key" = 'POOL_PRIVATE_INFO_COST') AS ozel_bilgi,
    (SELECT CASE jsonb_typeof("valueJson"::jsonb) WHEN 'number' THEN "valueJson"::jsonb WHEN 'object' THEN "valueJson"::jsonb->'value' END
       FROM "SystemSetting" WHERE "key" = 'MATCH_SCAN_COST_PK') AS eslesme
), wanted("key", "value", "description") AS (
  SELECT 'COST_HAVUZ_PORTFOY_YAYIN', to_jsonb(50), 'Havuza portföy yayınlama (PK)'
  UNION ALL SELECT 'COST_PROJE_HAVUZ', to_jsonb(100), 'Projeyi havuza gönderme, tek seferlik (PK) — eylem EPH-10 sonrası'
  UNION ALL SELECT 'COST_OZEL_BILGI', COALESCE((SELECT ozel_bilgi FROM legacy), to_jsonb(25)), 'Özel bilgileri aç (PK)'
  UNION ALL SELECT 'COST_TALEP_YAYIN', to_jsonb(25), 'Talep yayınlama (PK)'
  UNION ALL SELECT 'COST_TALEP_ACIL_EK', to_jsonb(10), 'Acil talep ilavesi (PK)'
  UNION ALL SELECT 'COST_ESLESME_TARAMA', COALESCE((SELECT eslesme FROM legacy), to_jsonb(25)), 'Eşleşme taraması (PK)'
  UNION ALL SELECT 'COST_YETKI_MEKTUBU_ASIM', to_jsonb(5), 'Yetki mektubu aylık limit aşımı (PK)'
)
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "key", "value", "description", now(), now() FROM wanted
ON CONFLICT ("key") DO NOTHING;

SELECT "key", "valueJson" FROM "SystemSetting" WHERE "key" LIKE 'COST\_%' ORDER BY "key";
COMMIT;
