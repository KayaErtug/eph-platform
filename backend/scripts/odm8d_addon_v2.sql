-- ODM-8D: Ek kullanıcı mağaza kimlikleri v1 -> v2. AJAN ÇALIŞTIRMAZ.
-- Şema: prisma/schema.prisma, StoreProduct; platform: APPLE / GOOGLE.
-- Yalnız magazaUrunKimligi değişir; surum, haklar ve diğer ürünler korunur.
-- Tam 5 paket x 2 platform = 10 satır zorunlu. Tekrar çalıştırma hata verir.
-- psql -X --set=ON_ERROR_STOP=1 ile çalıştırılır; hata transaction'ı iptal eder.
BEGIN;

-- Ön/son kontroller arasında başka yazıcıların kataloğu değiştirmesini engelle.
LOCK TABLE "StoreProduct" IN SHARE ROW EXCLUSIVE MODE;

-- 1) Öncesi: eski/yeni ek kullanıcı eşlemeleri ve Google base plan.
SELECT "id", "platform", "urunTuru", "kisiSayisi", "urunAnahtari",
       "magazaUrunKimligi", "googleBasePlanKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v[12]$'
ORDER BY "platform", "kisiSayisi", "magazaUrunKimligi";

DO $$
DECLARE
  n integer;
BEGIN
  -- Yeni kimliklerin önceden var olması karışık/tekrar geçiştir; dokunma.
  IF EXISTS (
    SELECT 1 FROM "StoreProduct"
    WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v2$'
  ) THEN
    RAISE EXCEPTION 'ODM-8D: v2 ek kullanıcı satırı zaten var; geçiş iptal edildi';
  END IF;

  UPDATE "StoreProduct" AS s
  SET "magazaUrunKimligi" = m.yeni
  FROM (VALUES
    (1,  'eph_addon_user_1_v1',  'eph_addon_user_1_v2'),
    (2,  'eph_addon_user_2_v1',  'eph_addon_user_2_v2'),
    (3,  'eph_addon_user_3_v1',  'eph_addon_user_3_v2'),
    (5,  'eph_addon_user_5_v1',  'eph_addon_user_5_v2'),
    (10, 'eph_addon_user_10_v1', 'eph_addon_user_10_v2')
  ) AS m(kisi, eski, yeni)
  WHERE s."magazaUrunKimligi" = m.eski
    AND s."urunTuru" = 'EK_KULLANICI'
    AND s."kisiSayisi" = m.kisi
    AND s."urunAnahtari" = 'EK_KULLANICI:' || m.kisi::text
    AND s."platform" IN ('APPLE', 'GOOGLE')
    AND (s."platform" <> 'GOOGLE' OR s."googleBasePlanKimligi" = 'monthly');

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 10 THEN
    RAISE EXCEPTION 'ODM-8D: beklenen 10, güncellenen %; tüm geçiş geri alınır', n;
  END IF;

  -- @@unique([platform, magazaUrunKimligi]) ile beş çiftin her biri zorunlu.
  IF EXISTS (
    SELECT 1 FROM "StoreProduct"
    WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v1$'
  ) THEN
    RAISE EXCEPTION 'ODM-8D: eski ek kullanıcı kimliği kaldı; tüm geçiş geri alınır';
  END IF;

  SELECT count(*) INTO n FROM "StoreProduct"
  WHERE "magazaUrunKimligi" ~ '^eph_addon_user_(1|2|3|5|10)_v2$';
  IF n <> 10 THEN
    RAISE EXCEPTION 'ODM-8D: son kontrolde 10 v2 bekleniyordu, bulunan %', n;
  END IF;
END $$;

-- 3) Sonrası: yalnız beklenen 10 v2; eski ek kullanıcı satırı 0.
SELECT "id", "platform", "urunTuru", "kisiSayisi", "urunAnahtari",
       "magazaUrunKimligi", "googleBasePlanKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v[12]$'
ORDER BY "platform", "kisiSayisi", "magazaUrunKimligi";

SELECT count(*) FILTER (WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v2$') AS v2_adet,
       count(*) FILTER (WHERE "magazaUrunKimligi" ~ '^eph_addon_user_[0-9]+_v1$') AS v1_adet
FROM "StoreProduct";

COMMIT;
