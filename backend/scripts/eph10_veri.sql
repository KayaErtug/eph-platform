-- EPH-10 VERİ BETİĞİ: onaylı tarifedeki ticari değerleri uygular
-- ÇALIŞTIRILMADI. Sabah, yedek alındıktan sonra tek transaction olarak çalıştırılacak.
-- Kaynak: D:/Downloads/EPH_PK_Tarife_Onayli.xlsx (28.10.2026).

-- Geri alma: eph10_geri_al.sql
BEGIN;

-- 1) COST_* ve LIMIT_* anahtarları (varsa değeri günceller; havuz yayın 50 -> 25)
INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt") VALUES
  (gen_random_uuid()::text, 'COST_HAVUZ_PORTFOY_YAYIN', to_jsonb(25), 'Havuza portföy yayınlama (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_PROJE_HAVUZ', to_jsonb(100), 'Projeyi havuza gönderme, tek seferlik (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_OZEL_BILGI', to_jsonb(25), 'Özel bilgileri aç (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_TALEP_YAYIN', to_jsonb(25), 'Talep yayınlama (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_TALEP_ACIL_EK', to_jsonb(10), 'Acil talep ilavesi (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_ESLESME_TARAMA', to_jsonb(25), 'Eşleşme taraması (PK)', now(), now()),
  (gen_random_uuid()::text, 'COST_YETKI_MEKTUBU_ASIM', to_jsonb(5), 'Yetki mektubu aylık limit aşımı (PK)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_PORTFOY_FOTOGRAF', to_jsonb(15), 'Portföy başına en fazla fotoğraf sayısı', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_TALEP_SURE_1_GUN', to_jsonb(3), 'Talep geçerlilik süresi seçeneği 1 (gün)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_TALEP_SURE_2_GUN', to_jsonb(7), 'Talep geçerlilik süresi seçeneği 2 (gün)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_TALEP_SURE_3_GUN', to_jsonb(14), 'Talep geçerlilik süresi seçeneği 3 (gün)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_TALEP_SURE_4_GUN', to_jsonb(30), 'Talep geçerlilik süresi seçeneği 4 (gün)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_YETKI_MEKTUBU_CARPAN', to_jsonb(2), 'Yetki mektubu aylık ücretsiz hak çarpanı (portföy limiti x)', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_YETKI_MEKTUBU_SABIT', to_jsonb(20), 'Yetki mektubu aylık ücretsiz hak, sabit', now(), now())
ON CONFLICT ("key") DO UPDATE SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now();

-- 2) Bireysel paketler
--    Ücretsiz havuz / talep hakları 0 (her işlem PK ile); 0 = kota yok, işlem yalnızca PK ile ücretlenir.
UPDATE "UyelikPaketi" SET "aylikTalepLimiti" = 0, "aylikHavuzGonderimLimiti" = 0, "guncellenmeTarihi" = now();
--    Emlak Ücretsiz: portföy 10, aylık PK 0 (deneme yok: denemeGunSayisi 0; kayıt DENEME paketiyle açılır, UCRETSIZ deneme olarak atanmaz).
UPDATE "UyelikPaketi" SET "aktifPortfoyLimiti" = 10, "aylikPaketPk" = 0, "denemeGunSayisi" = 0, "guncellenmeTarihi" = now() WHERE "segment" = 'EMLAK_PRO' AND "paketKodu" = 'UCRETSIZ';
--    Müteahhit Deneme portföy 50; Müteahhit Altın aylık PK 2500.
UPDATE "UyelikPaketi" SET "aktifPortfoyLimiti" = 50, "guncellenmeTarihi" = now() WHERE "segment" = 'MUTEAHHIT' AND "paketKodu" = 'DENEME';
UPDATE "UyelikPaketi" SET "aylikPaketPk" = 2500, "guncellenmeTarihi" = now() WHERE "segment" = 'MUTEAHHIT' AND "paketKodu" = 'ALTIN';
--    Tek kaynak aylikPaketPk: verilenKontor ona eşitlenir.
UPDATE "UyelikPaketi" SET "verilenKontor" = "aylikPaketPk", "guncellenmeTarihi" = now();

-- 3) Ofis paketleri: ücretsiz havuz / talep hakları 0; Ofis Ücretsiz = 1 yönetici + 1 alt kullanıcı, 30 portföy, aylık 100 PK, deneme yok.
UPDATE "SystemSetting" SET "valueJson" = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'code' = 'UCRETSIZ' THEN e || '{"agents":1,"totalUsers":2,"monthlyPk":100,"trialDays":0,"portfolioCapacity":30,"monthlyPoolLimit":0,"monthlyDemandLimit":0,"notes":"1 yönetici + 1 alt kullanıcı"}'::jsonb
      WHEN e->>'code' IN ('DENEME','BRONZ','GUMUS','ALTIN','PLATINUM') THEN e || '{"monthlyPoolLimit":0,"monthlyDemandLimit":0}'::jsonb
      ELSE e
    END ORDER BY ord)
  FROM jsonb_array_elements("valueJson"::jsonb) WITH ORDINALITY AS t(e, ord)
), "updatedAt" = now() WHERE "key" = 'OFFICE_MEMBERSHIP_PACKAGES';

-- 4) Ek PK ürünleri (250=550, 500=1.000, 1.000=1.750, 2.500=3.750, 5.000=6.750 TL)
UPDATE "SystemSetting" SET "valueJson" = jsonb_set("valueJson"::jsonb, '{pkProducts}', '[{"code":"PK_250_STANDARD","name":"Ek PK 250","credits":250,"amountMinor":55000,"active":true},{"code":"PK_500_STANDARD","name":"Ek PK 500","credits":500,"amountMinor":100000,"active":true},{"code":"PK_1000_STANDARD","name":"Ek PK 1.000","credits":1000,"amountMinor":175000,"active":true},{"code":"PK_2500_STANDARD","name":"Ek PK 2.500","credits":2500,"amountMinor":375000,"active":true},{"code":"PK_5000_STANDARD","name":"Ek PK 5.000","credits":5000,"amountMinor":675000,"active":true}]'::jsonb), "updatedAt" = now() WHERE "key" = 'EPH_PAYMENT_SETTINGS_V1';

-- Kontrol (çıktıyı gözle doğrula, sonra COMMIT; sorun varsa ROLLBACK)
SELECT "segment","paketKodu","aktifPortfoyLimiti","aylikPaketPk","verilenKontor","aylikTalepLimiti","aylikHavuzGonderimLimiti" FROM "UyelikPaketi" ORDER BY "segment","paketKodu";
SELECT "key","valueJson" FROM "SystemSetting" WHERE "key" ~ '^(COST|LIMIT)_' ORDER BY "key";
COMMIT;
