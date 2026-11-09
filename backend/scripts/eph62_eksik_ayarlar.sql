-- EPH-62: eksik COST_* / LIMIT_* anahtarları için seed. ÇALIŞTIRILMADI.
-- Değerler koddaki yedek değerlerdir (src/pricing/commercial-costs.ts) = bugünkü fiili davranış. Mevcut anahtara dokunmaz.
-- Geri alma: eph62_eksik_ayarlar_geri_al.sql (yalnız bu betikle eklenenleri siler).
-- 0) ÖNCE: kodun beklediği anahtarlardan DB'de olmayanlar (salt okunur)
--   SELECT k.key FROM (VALUES ('COST_HAVUZ_PORTFOY_YAYIN'),('COST_PROJE_HAVUZ'),('COST_OZEL_BILGI'),('COST_TALEP_YAYIN'),
--     ('COST_TALEP_ACIL_EK'),('COST_ESLESME_TARAMA'),('COST_YETKI_MEKTUBU_ASIM'),('LIMIT_PORTFOY_FOTOGRAF'),
--     ('LIMIT_TALEP_SURE_1_GUN'),('LIMIT_TALEP_SURE_2_GUN'),('LIMIT_TALEP_SURE_3_GUN'),('LIMIT_TALEP_SURE_4_GUN'),
--     ('LIMIT_YETKI_MEKTUBU_CARPAN'),('LIMIT_YETKI_MEKTUBU_SABIT'),('LIMIT_ADMIN_HEDIYE_GUNLUK_PK'),
--     ('LIMIT_ALICI_ADMIN_HEDIYE_ADET'),('LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK'),('LIMIT_TAKIM_DANISMAN'),
--     ('LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI'),('LIMIT_PK_DUSUK_UYARI')) AS k(key)
--   LEFT JOIN "SystemSetting" s ON s."key" = k.key WHERE s."key" IS NULL;
--   SELECT "key","valueJson" FROM "SystemSetting" WHERE "key" ~ '^(COST|LIMIT)_' ORDER BY 1;
BEGIN;

INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt") VALUES
  ('eph62-' || 'COST_HAVUZ_PORTFOY_YAYIN', 'COST_HAVUZ_PORTFOY_YAYIN', to_jsonb(25), 'Havuza portföy yayınlama (PK)', now(), now()),
  ('eph62-' || 'COST_PROJE_HAVUZ', 'COST_PROJE_HAVUZ', to_jsonb(100), 'Projeyi havuza gönderme, tek seferlik (PK)', now(), now()),
  ('eph62-' || 'COST_OZEL_BILGI', 'COST_OZEL_BILGI', to_jsonb(25), 'İletişime Geç (PK)', now(), now()),
  ('eph62-' || 'COST_TALEP_YAYIN', 'COST_TALEP_YAYIN', to_jsonb(25), 'Talep yayınlama (PK)', now(), now()),
  ('eph62-' || 'COST_TALEP_ACIL_EK', 'COST_TALEP_ACIL_EK', to_jsonb(10), 'Acil talep ilavesi (PK)', now(), now()),
  ('eph62-' || 'COST_ESLESME_TARAMA', 'COST_ESLESME_TARAMA', to_jsonb(25), 'Eşleşme taraması (PK)', now(), now()),
  ('eph62-' || 'COST_YETKI_MEKTUBU_ASIM', 'COST_YETKI_MEKTUBU_ASIM', to_jsonb(5), 'Yetki mektubu aylık limit aşımı (PK)', now(), now()),
  ('eph62-' || 'LIMIT_PORTFOY_FOTOGRAF', 'LIMIT_PORTFOY_FOTOGRAF', to_jsonb(15), 'Portföy başına en fazla fotoğraf sayısı', now(), now()),
  ('eph62-' || 'LIMIT_TALEP_SURE_1_GUN', 'LIMIT_TALEP_SURE_1_GUN', to_jsonb(3), 'Talep geçerlilik süresi seçeneği 1 (gün)', now(), now()),
  ('eph62-' || 'LIMIT_TALEP_SURE_2_GUN', 'LIMIT_TALEP_SURE_2_GUN', to_jsonb(7), 'Talep geçerlilik süresi seçeneği 2 (gün)', now(), now()),
  ('eph62-' || 'LIMIT_TALEP_SURE_3_GUN', 'LIMIT_TALEP_SURE_3_GUN', to_jsonb(14), 'Talep geçerlilik süresi seçeneği 3 (gün)', now(), now()),
  ('eph62-' || 'LIMIT_TALEP_SURE_4_GUN', 'LIMIT_TALEP_SURE_4_GUN', to_jsonb(30), 'Talep geçerlilik süresi seçeneği 4 (gün)', now(), now()),
  ('eph62-' || 'LIMIT_YETKI_MEKTUBU_CARPAN', 'LIMIT_YETKI_MEKTUBU_CARPAN', to_jsonb(2), 'Yetki mektubu aylık ücretsiz hak çarpanı', now(), now()),
  ('eph62-' || 'LIMIT_YETKI_MEKTUBU_SABIT', 'LIMIT_YETKI_MEKTUBU_SABIT', to_jsonb(20), 'Yetki mektubu aylık ücretsiz hak, sabit', now(), now()),
  ('eph62-' || 'LIMIT_ADMIN_HEDIYE_GUNLUK_PK', 'LIMIT_ADMIN_HEDIYE_GUNLUK_PK', to_jsonb(5000), 'Bir ADMIN hesabının günde gönderebileceği toplam hediye PK', now(), now()),
  ('eph62-' || 'LIMIT_ALICI_ADMIN_HEDIYE_ADET', 'LIMIT_ALICI_ADMIN_HEDIYE_ADET', to_jsonb(2), 'Bir kullanıcının ADMIN hesaplarından alabileceği en fazla hediye PK işlemi sayısı', now(), now()),
  ('eph62-' || 'LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK', 'LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK', to_jsonb(1000), 'Bir kullanıcının ADMIN hesaplarından alabileceği toplam hediye PK', now(), now()),
  ('eph62-' || 'LIMIT_TAKIM_DANISMAN', 'LIMIT_TAKIM_DANISMAN', to_jsonb(10), 'Bir takımdaki en fazla aktif danışman sayısı', now(), now()),
  ('eph62-' || 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', '{"value": [100, 250, 500]}'::jsonb, 'ADMIN rolünün tek seferde gönderebileceği hediye PK tutarları (liste)', now(), now())
ON CONFLICT ("key") DO NOTHING;

-- LIMIT_PK_DUSUK_UYARI: kodda ve belgede varsayılan YOK (eph38 migration'ı {"value": null} ile ekledi, bu yüzden uyarı sürüyor).
-- Değeri Mustafa abi belirler; belirlenince (örnek, DEĞER_YAZ yerine pozitif tam sayı):
--   UPDATE "SystemSetting" SET "valueJson" = '{"value": DEĞER_YAZ}'::jsonb, "updatedAt" = now() WHERE "key" = 'LIMIT_PK_DUSUK_UYARI';
-- veya yönetim ekranından (denetim kaydı için tercih edilir).

COMMIT;
