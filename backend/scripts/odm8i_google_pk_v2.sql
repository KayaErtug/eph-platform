-- ODM-8I: Yalnız GOOGLE PK mağaza kimlikleri v1 -> v2. AJAN ÇALIŞTIRMAZ.
-- Şema: prisma/schema.prisma; StorePlatform.GOOGLE, StoreProductKind.PK.
-- StoreProduct'ta miktar kolonu yok: pkUrunKodu=PK_<miktar>, urunAnahtari=PK:PK_<miktar>.
-- Yalnız magazaUrunKimligi değişir; APPLE PK v1 ve diğer alanlar korunur.
-- Tam 5 GOOGLE satırı zorunlu. Tekrar çalıştırma hata verir.
-- psql -X --set=ON_ERROR_STOP=1 ile çalıştırılır; hata transaction'ı iptal eder.
BEGIN;

-- Ön/son kontroller arasında başka yazıcıların kataloğu değiştirmesini engelle.
LOCK TABLE "StoreProduct" IN SHARE ROW EXCLUSIVE MODE;

-- 1) Öncesi: iki platformun eski/yeni PK eşlemeleri.
SELECT "id", "platform", "urunTuru", "pkUrunKodu", "urunAnahtari",
       "magazaUrunKimligi", "googleBasePlanKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" ~ '^eph_pk_[0-9]+_v[12]$'
ORDER BY "platform", "pkUrunKodu", "magazaUrunKimligi";

DO $$
DECLARE
  n integer;
BEGIN
  -- GOOGLE v2 önceden varsa karışık/tekrar geçiştir; ürün türünden bağımsız dur.
  IF EXISTS (
    SELECT 1 FROM "StoreProduct"
    WHERE "platform" = 'GOOGLE'
      AND "magazaUrunKimligi" ~ '^eph_pk_[0-9]+_v2$'
  ) THEN
    RAISE EXCEPTION 'ODM-8I: GOOGLE v2 PK kimliği zaten var; geçiş iptal edildi';
  END IF;

  UPDATE "StoreProduct" AS s
  SET "magazaUrunKimligi" = m.yeni
  FROM (VALUES
    (250,  'eph_pk_250_v1',  'eph_pk_250_v2'),
    (500,  'eph_pk_500_v1',  'eph_pk_500_v2'),
    (1000, 'eph_pk_1000_v1', 'eph_pk_1000_v2'),
    (2500, 'eph_pk_2500_v1', 'eph_pk_2500_v2'),
    (5000, 'eph_pk_5000_v1', 'eph_pk_5000_v2')
  ) AS m(pk, eski, yeni)
  WHERE s."magazaUrunKimligi" = m.eski
    AND s."platform" = 'GOOGLE'
    AND s."urunTuru" = 'PK'
    AND s."pkUrunKodu" = 'PK_' || m.pk::text || '_STANDARD'
    AND s."urunAnahtari" = 'PK:PK_' || m.pk::text || '_STANDARD';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN
    RAISE EXCEPTION 'ODM-8I: beklenen 5, güncellenen %; tüm geçiş geri alınır', n;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "StoreProduct"
    WHERE "platform" = 'GOOGLE' AND "urunTuru" = 'PK'
      AND "magazaUrunKimligi" ~ '^eph_pk_[0-9]+_v1$'
  ) THEN
    RAISE EXCEPTION 'ODM-8I: GOOGLE PK v1 kaldı; tüm geçiş geri alınır';
  END IF;

  -- @@unique([platform, magazaUrunKimligi]) ile beş eşlemenin her biri zorunlu.
  SELECT count(*) INTO n FROM "StoreProduct"
  WHERE "platform" = 'GOOGLE' AND "urunTuru" = 'PK'
    AND "magazaUrunKimligi" ~ '^eph_pk_(250|500|1000|2500|5000)_v2$';
  IF n <> 5 THEN
    RAISE EXCEPTION 'ODM-8I: son kontrolde 5 GOOGLE PK v2 bekleniyordu, bulunan %', n;
  END IF;

  SELECT count(*) INTO n FROM "StoreProduct"
  WHERE "platform" = 'APPLE' AND "urunTuru" = 'PK'
    AND "magazaUrunKimligi" ~ '^eph_pk_(250|500|1000|2500|5000)_v1$';
  IF n <> 5 THEN
    RAISE EXCEPTION 'ODM-8I: son kontrolde 5 APPLE PK v1 bekleniyordu, bulunan %', n;
  END IF;
END $$;

-- 3) Sonrası: GOOGLE v2=5, GOOGLE v1=0, APPLE v1=5.
SELECT "id", "platform", "urunTuru", "pkUrunKodu", "urunAnahtari",
       "magazaUrunKimligi", "googleBasePlanKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" ~ '^eph_pk_[0-9]+_v[12]$'
ORDER BY "platform", "pkUrunKodu", "magazaUrunKimligi";

SELECT count(*) FILTER (WHERE "platform" = 'GOOGLE' AND "urunTuru" = 'PK'
         AND "magazaUrunKimligi" ~ '^eph_pk_(250|500|1000|2500|5000)_v2$') AS google_pk_v2,
       count(*) FILTER (WHERE "platform" = 'GOOGLE' AND "urunTuru" = 'PK'
         AND "magazaUrunKimligi" ~ '^eph_pk_[0-9]+_v1$') AS google_pk_v1,
       count(*) FILTER (WHERE "platform" = 'APPLE' AND "urunTuru" = 'PK'
         AND "magazaUrunKimligi" ~ '^eph_pk_(250|500|1000|2500|5000)_v1$') AS apple_pk_v1
FROM "StoreProduct";

COMMIT;
