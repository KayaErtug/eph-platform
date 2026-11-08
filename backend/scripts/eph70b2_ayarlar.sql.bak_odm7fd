-- EPH-70B2: ofis paket modeli ayar tohumu. ÇALIŞTIRILMADI (Mustafa abi sunucuda çalıştırır; varsayılan ROLLBACK).
-- Kaynak: EPH_ODEME_SISTEMI.md §12.2-12.5 (KİLİTLİ) birebir. Kod bu değerleri SABİT tutmaz; hepsi SystemSetting'ten okunur (§0-B).
-- Çalıştırma sırası: migration (a)(b)(c) -> bu betik -> (geçiş betiği, ayrı iş). OFFICE_ENTITLEMENT_SOURCE bu betikte 'legacy' kalır.
--
-- 0) ÖNCE (salt okunur): mevcut paket kataloğu ve bu betikle eklenecek anahtarlar
--   SELECT "key","valueJson" FROM "SystemSetting" WHERE "key" IN ('OFFICE_MEMBERSHIP_PACKAGES','OFFICE_ADDON_CONFIG','OFFICE_TRIAL_CONFIG','OFFICE_FREE_LIMITS','KARDES_OFIS_PAKETLER','OFFICE_ENTITLEMENT_SOURCE');
--
-- Notlar:
--  * OFFICE_MEMBERSHIP_PACKAGES eski okuyucularla uyumlu dizi biçimindedir (code,name,price,agents,totalUsers,monthlyPk,portfolioCapacity,crmCapacity...).
--    Kilitli tabloda OLMAYAN eski alanlar (crmCapacity, monthlyPoolLimit, monthlyDemandLimit, monthlyTransactionLimit, sharedWallet, notes...)
--    aynı kodlu mevcut satırdan korunur (jsonb birleştirme: eski || yeni; yeni değer kazanır). SOLO'nun eski satırı yoktur: bu alanlar yok sayılır.
--    crmCapacity -1 / yok = sınırsız (ücretli paketlerde kilitli bir CRM sınırı yoktur; Ücretsiz için OFFICE_FREE_LIMITS.crm = 50).
--  * DENEME satırı eski okuyucular içindir; türetilmiştir (Gümüş seviyesi, OFFICE_TRIAL_CONFIG ile aynı gün/PK). Yeni kod denemeyi OFFICE_TRIAL_CONFIG + seviyePaketi'nden çözer.
--  * UCRETSIZ satırı da türetilmiştir (OFFICE_FREE_LIMITS ile aynı); yeni kod Ücretsiz'i yalnız OFFICE_FREE_LIMITS'ten çözer.
--  * Kardeş ofis uygunluğunun tek kaynağı paket satırındaki "kardesOfis"tir; KARDES_OFIS_PAKETLER ondan türetilerek yazılır (ayrı düzenlenmez).
--  * OFIS_25_PLUS (Özel) satırına dokunulmaz (teklif); yoksa eklenir.
BEGIN;

WITH yeni(code, satir) AS (VALUES
  ('UCRETSIZ', '{"code":"UCRETSIZ","name":"Ofis Ücretsiz","price":0,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":1,"agents":0,"managers":1,"portfolioCapacity":10,"crmCapacity":50,"monthlyPk":0,"trialDays":0,"kardesOfis":false,"ofisBoyDahil":0,"ofisBoyEklenti":false,"derived":"OFFICE_FREE_LIMITS"}'::jsonb),
  ('DENEME',   '{"code":"DENEME","name":"Ofis Deneme","price":0,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":6,"agents":5,"managers":1,"portfolioCapacity":300,"monthlyPk":500,"trialDays":14,"kardesOfis":false,"ofisBoyDahil":0,"ofisBoyEklenti":false,"derived":"OFFICE_TRIAL_CONFIG"}'::jsonb),
  ('SOLO',     '{"code":"SOLO","name":"Ofis Solo","price":500,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":1,"agents":0,"managers":1,"portfolioCapacity":50,"monthlyPk":400,"trialDays":0,"kardesOfis":false,"ofisBoyDahil":0,"ofisBoyEklenti":true}'::jsonb),
  ('BRONZ',    '{"code":"BRONZ","name":"Ofis Bronz","price":1350,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":3,"agents":2,"managers":1,"portfolioCapacity":150,"monthlyPk":1200,"trialDays":0,"kardesOfis":false,"ofisBoyDahil":0,"ofisBoyEklenti":true}'::jsonb),
  ('GUMUS',    '{"code":"GUMUS","name":"Ofis Gümüş","price":2500,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":6,"agents":5,"managers":1,"portfolioCapacity":300,"monthlyPk":2400,"trialDays":0,"kardesOfis":false,"ofisBoyDahil":0,"ofisBoyEklenti":true}'::jsonb),
  ('ALTIN',    '{"code":"ALTIN","name":"Ofis Altın","price":4950,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":12,"agents":11,"managers":1,"portfolioCapacity":600,"monthlyPk":4800,"trialDays":0,"kardesOfis":true,"ofisBoyDahil":0,"ofisBoyEklenti":true}'::jsonb),
  ('PLATINUM', '{"code":"PLATINUM","name":"Ofis Platinum","price":9950,"currency":"TRY","active":true,"isCustomPrice":false,"totalUsers":25,"agents":24,"managers":1,"portfolioCapacity":1250,"monthlyPk":10000,"trialDays":0,"kardesOfis":true,"ofisBoyDahil":2,"ofisBoyEklenti":false}'::jsonb)
),
eski AS (
  SELECT COALESCE((SELECT "valueJson" FROM "SystemSetting" WHERE "key" = 'OFFICE_MEMBERSHIP_PACKAGES'), '[]'::jsonb) AS arr
),
birlesik AS (
  SELECT y.code, 1 AS sira, COALESCE((SELECT e FROM eski, jsonb_array_elements(eski.arr) e WHERE e->>'code' = y.code LIMIT 1), '{}'::jsonb) || y.satir AS satir
  FROM yeni y
),
ozel AS (
  SELECT 'OFIS_25_PLUS' AS code, 2 AS sira,
    COALESCE((SELECT e FROM eski, jsonb_array_elements(eski.arr) e WHERE e->>'code' = 'OFIS_25_PLUS' LIMIT 1),
      '{"code":"OFIS_25_PLUS","name":"25+ / Çok Şubeli","price":null,"currency":"TRY","active":true,"isCustomPrice":true,"totalUsers":"25+","agents":"Özel teklif","monthlyPk":"Özel teklif","portfolioCapacity":"Özel teklif","crmCapacity":"Özel teklif","trialDays":0}'::jsonb)
    || '{"kardesOfis":true,"ofisBoyDahil":"Özel teklif","ofisBoyEklenti":false}'::jsonb AS satir
),
hepsi AS (SELECT * FROM birlesik UNION ALL SELECT * FROM ozel),
dizi AS (
  SELECT jsonb_agg(satir ORDER BY CASE code WHEN 'UCRETSIZ' THEN 0 WHEN 'DENEME' THEN 1 WHEN 'SOLO' THEN 2 WHEN 'BRONZ' THEN 3 WHEN 'GUMUS' THEN 4 WHEN 'ALTIN' THEN 5 WHEN 'PLATINUM' THEN 6 ELSE 9 END) AS v FROM hepsi
)
INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt")
SELECT 'eph70b2-OFFICE_MEMBERSHIP_PACKAGES', 'OFFICE_MEMBERSHIP_PACKAGES', dizi.v, 'Ofis paketleri (§12.2; EPH-70B2)', now(), now() FROM dizi
ON CONFLICT ("key") DO UPDATE SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now();

INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt") VALUES
  ('eph70b2-OFFICE_ADDON_CONFIG', 'OFFICE_ADDON_CONFIG',
   '{"ekKullanici":{"aylikFiyat":400,"kisiBasiPortfoy":50,"kisiBasiPk":400,"enAzPaket":"BRONZ","kademeler":[1,2,3,5,10]},"ofisBoy":{"aylikFiyat":300,"koltukPerUrun":2,"izinliPaketler":["SOLO","BRONZ","GUMUS","ALTIN"],"ofisBoyOzelUst":null}}'::jsonb,
   'Ofis eklentileri (§12.3; EPH-70B2)', now(), now()),
  ('eph70b2-OFFICE_TRIAL_CONFIG', 'OFFICE_TRIAL_CONFIG',
   '{"gun":14,"seviyePaketi":"GUMUS","pk":500,"kartIstenir":false,"hatirlatmaGunleri":[3,1],"kardesOfis":false,"ofisBoy":false}'::jsonb,
   'Ofis deneme paketi (§12.4; EPH-70B2)', now(), now()),
  ('eph70b2-OFFICE_FREE_LIMITS', 'OFFICE_FREE_LIMITS',
   '{"kullanici":1,"aktifPortfoy":10,"crm":50,"aylikPaketPk":0,"havuzIlanMax":3,"talepMax":2,"linaGunluk":5,"projeYonetimi":false,"pasifGun":90}'::jsonb,
   'Ofis Ücretsiz paket sınırları (§12.5; 0=kapalı, null=sınırsız; iletişim ücreti COST_OZEL_BILGI; EPH-70B2)', now(), now())
ON CONFLICT ("key") DO UPDATE SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now();

-- Kardeş ofis: paket satırındaki kardesOfis=true olanlardan TÜRETİLİR (tek kaynak)
INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt")
SELECT 'eph70b2-KARDES_OFIS_PAKETLER', 'KARDES_OFIS_PAKETLER',
  (SELECT jsonb_agg(e->>'code' ORDER BY e->>'code') FROM jsonb_array_elements((SELECT "valueJson" FROM "SystemSetting" WHERE "key" = 'OFFICE_MEMBERSHIP_PACKAGES')) e WHERE (e->>'kardesOfis') = 'true'),
  'Kardeş ofis uygun paketler (OFFICE_MEMBERSHIP_PACKAGES.kardesOfis alanından türetilir; EPH-70B2)', now(), now()
ON CONFLICT ("key") DO UPDATE SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now();

-- Yayın kapısı: yalnız YOKSA 'legacy' yazılır (var olan değer ezilmez)
INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt") VALUES
  ('eph70b2-OFFICE_ENTITLEMENT_SOURCE', 'OFFICE_ENTITLEMENT_SOURCE', '"legacy"'::jsonb, 'Ofis hak okuma kaynağı: legacy | relational (üç kanal hazır olmadan relational yapılmaz; EPH-70B2)', now(), now())
ON CONFLICT ("key") DO NOTHING;

-- DOĞRULAMA (sonuç görülür; kilitli tabloyla birebir olmalı)
SELECT e->>'code' AS kod, e->>'price' AS fiyat, e->>'totalUsers' AS kullanici, e->>'portfolioCapacity' AS portfoy, e->>'monthlyPk' AS aylik_pk, e->>'kardesOfis' AS kardes, e->>'ofisBoyDahil' AS ofis_boy_dahil
FROM jsonb_array_elements((SELECT "valueJson" FROM "SystemSetting" WHERE "key" = 'OFFICE_MEMBERSHIP_PACKAGES')) e;
SELECT "key","valueJson" FROM "SystemSetting" WHERE "key" IN ('OFFICE_ADDON_CONFIG','OFFICE_TRIAL_CONFIG','OFFICE_FREE_LIMITS','KARDES_OFIS_PAKETLER','OFFICE_ENTITLEMENT_SOURCE');

ROLLBACK;  -- Mustafa abi sonuçları kontrol ettikten sonra COMMIT'e çevirir
