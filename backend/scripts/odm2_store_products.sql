-- ODM-2R: Mağaza ürün eşleme veri betiği — TASLAK, ÇALIŞTIRILMAZ.
-- Paket modeli: EPH_ODEME_SISTEMI.md r4 §12 (kilitli) ve §13 (20 ürün). Değerler (fiyat, hak, kullanıcı sayısı) burada YOK (§0-B).
-- Ön koşul: prisma/migrations/20261108120000_odm2_store_payments uygulanmış olmalı (ODM-10 runbook).
-- 20 ürün x 2 platform (APPLE, GOOGLE) = 40 satır. Idempotent: aynı (platform, magazaUrunKimligi) varsa dokunmaz;
-- kimlikler asla UPDATE edilmez (kimlik değişmez kuralı). İstisna: ek kullanıcı v1→v2 (karar 20) canlı için odm8d_addon_v2.sql ile yapılır; bu betik yeni kurulumlar için v2 ile ekler.
-- Eşleme: OFFICE -> OFFICE_MEMBERSHIP_PACKAGES ayarındaki kod (SOLO dahil); MUTEAHHIT -> UyelikPaketi (paketKodu + segment);
-- PK -> EPH_PAYMENT_SETTINGS_V1.pkProducts içinde miktar (credits) eşleşen ürünün kodu.
-- Bulunamayan eşleme: NOTICE + aktifMi=false (satır yine eklenir; kaynak tanımlanınca aktifleştirilir).
-- Gerektirir: PostgreSQL 13+ (gen_random_uuid).
BEGIN;

-- 0) ÖN KONTROL (yalnız uyarı)
DO $$
DECLARE r text;
BEGIN
  FOR r IN
    SELECT k.kod FROM (VALUES ('SOLO'),('BRONZ'),('GUMUS'),('ALTIN'),('PLATINUM')) k(kod)
    WHERE NOT EXISTS (
      SELECT 1 FROM "SystemSetting" ss,
           LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ss."valueJson"::jsonb) = 'array' THEN ss."valueJson"::jsonb ELSE '[]'::jsonb END) e
      WHERE ss."key" = 'OFFICE_MEMBERSHIP_PACKAGES' AND e->>'code' = k.kod
    )
  LOOP
    RAISE NOTICE 'UYARI: OFFICE_MEMBERSHIP_PACKAGES içinde % kodlu ofis paketi yok; ürün aktifMi=false eklenecek.', r;
  END LOOP;

  FOR r IN
    SELECT k.kod FROM (VALUES ('BRONZ'),('GUMUS'),('ALTIN'),('PLATINUM')) k(kod)
    WHERE NOT EXISTS (
      SELECT 1 FROM "UyelikPaketi" p WHERE p."segment"::text = 'MUTEAHHIT' AND p."paketKodu"::text = k.kod
    )
  LOOP
    RAISE NOTICE 'UYARI: UyelikPaketi içinde MUTEAHHIT/% yok; ürün aktifMi=false eklenecek.', r;
  END LOOP;
END $$;

-- 1) ÜYELİK ÜRÜNLERİ: ofis 5 + müteahhit 4 = 9 ürün
INSERT INTO "StoreProduct"
  ("id","platform","urunTuru","segment","paketKodu","uyelikPaketiId","kisiSayisi","pkUrunKodu","urunAnahtari","surum",
   "magazaUrunKimligi","googleBasePlanKimligi","aktifMi","olusturulmaTarihi","guncellenmeTarihi")
SELECT
  gen_random_uuid()::text,
  pf.platform::"StorePlatform",
  'UYELIK'::"StoreProductKind",
  u.segment::"StoreProductSegment",
  u.kod,
  p."id",
  NULL, NULL,
  'UYELIK:' || u.segment || ':' || u.kod,
  1,
  u.kimlik,
  CASE WHEN pf.platform = 'GOOGLE' THEN 'monthly' ELSE NULL END,
  CASE
    WHEN u.segment = 'OFFICE' THEN EXISTS (
      SELECT 1 FROM "SystemSetting" ss,
           LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ss."valueJson"::jsonb) = 'array' THEN ss."valueJson"::jsonb ELSE '[]'::jsonb END) e
      WHERE ss."key" = 'OFFICE_MEMBERSHIP_PACKAGES' AND e->>'code' = u.kod)
    ELSE p."id" IS NOT NULL
  END,
  now(), now()
FROM (VALUES
  ('OFFICE','SOLO','eph_sub_office_solo_v1'),
  ('OFFICE','BRONZ','eph_sub_office_bronz_v1'),
  ('OFFICE','GUMUS','eph_sub_office_gumus_v1'),
  ('OFFICE','ALTIN','eph_sub_office_altin_v1'),
  ('OFFICE','PLATINUM','eph_sub_office_platinum_v1'),
  ('MUTEAHHIT','BRONZ','eph_sub_muteahhit_bronz_v1'),
  ('MUTEAHHIT','GUMUS','eph_sub_muteahhit_gumus_v1'),
  ('MUTEAHHIT','ALTIN','eph_sub_muteahhit_altin_v1'),
  ('MUTEAHHIT','PLATINUM','eph_sub_muteahhit_platinum_v1')
) u(segment, kod, kimlik)
CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) pf(platform)
LEFT JOIN "UyelikPaketi" p
  ON u.segment = 'MUTEAHHIT' AND p."segment"::text = u.segment AND p."paketKodu"::text = u.kod
ON CONFLICT ("platform","magazaUrunKimligi") DO NOTHING;

-- 2) EK KULLANICI (5) ve OFİS BOY (1) — ayrı abonelik grupları; ofis paketi satın alınmış olmalı kuralı sunucu servisindedir.
INSERT INTO "StoreProduct"
  ("id","platform","urunTuru","segment","paketKodu","uyelikPaketiId","kisiSayisi","pkUrunKodu","urunAnahtari","surum",
   "magazaUrunKimligi","googleBasePlanKimligi","aktifMi","olusturulmaTarihi","guncellenmeTarihi")
SELECT
  gen_random_uuid()::text,
  pf.platform::"StorePlatform",
  a.tur::"StoreProductKind",
  NULL, NULL, NULL,
  a.kisi,
  NULL,
  CASE WHEN a.tur = 'EK_KULLANICI' THEN 'EK_KULLANICI:' || a.kisi ELSE 'OFIS_BOY' END,
  1,
  a.kimlik,
  CASE WHEN pf.platform = 'GOOGLE' THEN 'monthly' ELSE NULL END,
  true, now(), now()
FROM (VALUES
  ('EK_KULLANICI', 1,  'eph_addon_user_1_v2'),
  ('EK_KULLANICI', 2,  'eph_addon_user_2_v2'),
  ('EK_KULLANICI', 3,  'eph_addon_user_3_v2'),
  ('EK_KULLANICI', 5,  'eph_addon_user_5_v2'),
  ('EK_KULLANICI', 10, 'eph_addon_user_10_v2'),
  ('OFIS_BOY', NULL::int, 'eph_addon_ofisboy_v1')
) a(tur, kisi, kimlik)
CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) pf(platform)
ON CONFLICT ("platform","magazaUrunKimligi") DO NOTHING;

-- 3) EK PK (5) — tüketilebilir
WITH pk AS (
  SELECT * FROM (VALUES
    (250,  'eph_pk_250_v1'),
    (500,  'eph_pk_500_v1'),
    (1000, 'eph_pk_1000_v1'),
    (2500, 'eph_pk_2500_v1'),
    (5000, 'eph_pk_5000_v1')
  ) v(miktar, kimlik)
), cfg AS (
  SELECT e->>'code' AS code, (e->>'credits')::int AS credits
  FROM "SystemSetting" ss,
       LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ss."valueJson"::jsonb->'pkProducts') = 'array' THEN ss."valueJson"::jsonb->'pkProducts' ELSE '[]'::jsonb END) e
  WHERE ss."key" = 'EPH_PAYMENT_SETTINGS_V1'
), res AS (
  SELECT pk.miktar, pk.kimlik,
         COALESCE((SELECT min(cfg.code) FROM cfg WHERE cfg.credits = pk.miktar), 'PK_' || pk.miktar) AS kod,
         EXISTS (SELECT 1 FROM cfg WHERE cfg.credits = pk.miktar) AS bulundu
  FROM pk
)
INSERT INTO "StoreProduct"
  ("id","platform","urunTuru","segment","paketKodu","uyelikPaketiId","kisiSayisi","pkUrunKodu","urunAnahtari","surum",
   "magazaUrunKimligi","googleBasePlanKimligi","aktifMi","olusturulmaTarihi","guncellenmeTarihi")
SELECT
  gen_random_uuid()::text,
  pf.platform::"StorePlatform",
  'PK'::"StoreProductKind",
  NULL, NULL, NULL, NULL,
  res.kod,
  'PK:' || res.kod,
  1,
  res.kimlik,
  NULL,
  res.bulundu,
  now(), now()
FROM res
CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) pf(platform)
ON CONFLICT ("platform","magazaUrunKimligi") DO NOTHING;

-- 4) SON KONTROL (ODM-2R2): beklenen 40 (kimlik x platform) kümesi alan alan karşılaştırılır; ON CONFLICT DO NOTHING ile
--    korunmuş yanlış/eski bir eşleme varsa RAISE EXCEPTION ile tüm işlem geri alınır.
CREATE TEMP TABLE _odm2_beklenen ON COMMIT DROP AS
SELECT pf.platform::"StorePlatform" AS platform, e.kimlik, e.tur::"StoreProductKind" AS tur, e.segment::"StoreProductSegment" AS segment,
       e.paketkodu, e.kisi, e.miktar,
       CASE WHEN pf.platform = 'GOOGLE' AND e.tur <> 'PK' THEN 'monthly' ELSE NULL END AS baseplan
FROM (VALUES
  ('eph_sub_office_solo_v1',        'UYELIK','OFFICE','SOLO',NULL::int,NULL::int),
  ('eph_sub_office_bronz_v1',       'UYELIK','OFFICE','BRONZ',NULL,NULL),
  ('eph_sub_office_gumus_v1',       'UYELIK','OFFICE','GUMUS',NULL,NULL),
  ('eph_sub_office_altin_v1',       'UYELIK','OFFICE','ALTIN',NULL,NULL),
  ('eph_sub_office_platinum_v1',    'UYELIK','OFFICE','PLATINUM',NULL,NULL),
  ('eph_sub_muteahhit_bronz_v1',    'UYELIK','MUTEAHHIT','BRONZ',NULL,NULL),
  ('eph_sub_muteahhit_gumus_v1',    'UYELIK','MUTEAHHIT','GUMUS',NULL,NULL),
  ('eph_sub_muteahhit_altin_v1',    'UYELIK','MUTEAHHIT','ALTIN',NULL,NULL),
  ('eph_sub_muteahhit_platinum_v1', 'UYELIK','MUTEAHHIT','PLATINUM',NULL,NULL),
  ('eph_addon_user_1_v2',  'EK_KULLANICI',NULL,NULL,1,NULL),
  ('eph_addon_user_2_v2',  'EK_KULLANICI',NULL,NULL,2,NULL),
  ('eph_addon_user_3_v2',  'EK_KULLANICI',NULL,NULL,3,NULL),
  ('eph_addon_user_5_v2',  'EK_KULLANICI',NULL,NULL,5,NULL),
  ('eph_addon_user_10_v2', 'EK_KULLANICI',NULL,NULL,10,NULL),
  ('eph_addon_ofisboy_v1', 'OFIS_BOY',NULL,NULL,NULL,NULL),
  ('eph_pk_250_v1',  'PK',NULL,NULL,NULL,250),
  ('eph_pk_500_v1',  'PK',NULL,NULL,NULL,500),
  ('eph_pk_1000_v1', 'PK',NULL,NULL,NULL,1000),
  ('eph_pk_2500_v1', 'PK',NULL,NULL,NULL,2500),
  ('eph_pk_5000_v1', 'PK',NULL,NULL,NULL,5000)
) e(kimlik, tur, segment, paketkodu, kisi, miktar)
CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) pf(platform);

DO $$
DECLARE n integer; bad text;
BEGIN
  SELECT count(*) INTO n FROM _odm2_beklenen;
  IF n <> 40 THEN RAISE EXCEPTION 'Beklenen küme 40 satır olmalı, bulunan % (betik hatası)', n; END IF;

  SELECT count(*) INTO n FROM "StoreProduct";
  IF n <> 40 THEN RAISE EXCEPTION 'StoreProduct toplam satırı 40 olmalı, bulunan % (beklenmeyen/eksik satır)', n; END IF;

  -- (a) eksik veya alanı uyuşmayan satırlar (tür, segment, paketKodu, kisiSayisi, base plan, pkUrunKodu, urunAnahtari, surum, uyelikPaketiId)
  SELECT string_agg(b.platform || '/' || b.kimlik, '; ') INTO bad
  FROM _odm2_beklenen b
  LEFT JOIN "StoreProduct" sp ON sp."platform" = b.platform AND sp."magazaUrunKimligi" = b.kimlik
  WHERE sp."id" IS NULL
     OR sp."urunTuru" <> b.tur
     OR sp."segment" IS DISTINCT FROM b.segment
     OR (b.tur = 'UYELIK' AND sp."paketKodu" IS DISTINCT FROM b.paketkodu)
     OR (b.tur <> 'UYELIK' AND sp."paketKodu" IS NOT NULL)
     OR sp."kisiSayisi" IS DISTINCT FROM b.kisi
     OR sp."googleBasePlanKimligi" IS DISTINCT FROM b.baseplan
     OR (b.tur = 'PK' AND sp."pkUrunKodu" IS NULL)
     OR (b.tur <> 'PK' AND sp."pkUrunKodu" IS NOT NULL)
     OR sp."surum" <> 1
     OR (b.tur = 'UYELIK' AND sp."urunAnahtari" <> 'UYELIK:' || b.segment::text || ':' || b.paketkodu)
     OR (b.tur = 'EK_KULLANICI' AND sp."urunAnahtari" <> 'EK_KULLANICI:' || b.kisi)
     OR (b.tur = 'OFIS_BOY' AND sp."urunAnahtari" <> 'OFIS_BOY')
     OR (b.tur = 'PK' AND sp."urunAnahtari" <> 'PK:' || sp."pkUrunKodu")
     OR (b.segment = 'OFFICE' AND sp."uyelikPaketiId" IS NOT NULL)
     OR (b.segment = 'MUTEAHHIT' AND sp."aktifMi" AND sp."uyelikPaketiId" IS NULL)
     OR (b.tur <> 'UYELIK' AND sp."uyelikPaketiId" IS NOT NULL);
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'StoreProduct eşlemesi beklenenle uyuşmuyor (eksik/alan farkı): %', bad; END IF;

  -- (b) PK: aktif satırın pkUrunKodu, ayardaki ürünün miktarıyla (credits) eşleşmeli
  SELECT string_agg(sp."platform"::text || '/' || sp."magazaUrunKimligi", '; ') INTO bad
  FROM "StoreProduct" sp
  JOIN _odm2_beklenen b ON b.platform = sp."platform" AND b.kimlik = sp."magazaUrunKimligi" AND b.tur = 'PK'
  WHERE sp."aktifMi" AND NOT EXISTS (
    SELECT 1 FROM "SystemSetting" ss,
         LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ss."valueJson"::jsonb->'pkProducts') = 'array' THEN ss."valueJson"::jsonb->'pkProducts' ELSE '[]'::jsonb END) e
    WHERE ss."key" = 'EPH_PAYMENT_SETTINGS_V1' AND e->>'code' = sp."pkUrunKodu" AND (e->>'credits')::int = b.miktar);
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'PK satırının pkUrunKodu ayardaki miktarla eşleşmiyor: %', bad; END IF;

  -- (c) OFFICE aktif satır: OFFICE_MEMBERSHIP_PACKAGES içinde kodu olmalı
  SELECT string_agg(sp."platform"::text || '/' || sp."magazaUrunKimligi", '; ') INTO bad
  FROM "StoreProduct" sp
  WHERE sp."segment" = 'OFFICE' AND sp."aktifMi" AND NOT EXISTS (
    SELECT 1 FROM "SystemSetting" ss,
         LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ss."valueJson"::jsonb) = 'array' THEN ss."valueJson"::jsonb ELSE '[]'::jsonb END) e
    WHERE ss."key" = 'OFFICE_MEMBERSHIP_PACKAGES' AND e->>'code' = sp."paketKodu");
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'OFFICE aktif satırı ayarda kodu olmayan pakete bağlı: %', bad; END IF;
END $$;

-- 5) İNCELEME ÇIKTISI (aktifMi=false olanlar = kaynağı henüz tanımsız ürünler)
SELECT "platform", "urunTuru", "segment", "paketKodu", "kisiSayisi", "pkUrunKodu", "magazaUrunKimligi", "googleBasePlanKimligi", "aktifMi"
FROM "StoreProduct" ORDER BY "platform", "urunTuru", "segment", "paketKodu", "kisiSayisi", "pkUrunKodu";

COMMIT;
