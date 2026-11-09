-- ODM-8D: Ek kullanıcı mağaza ürün kimlikleri v1 -> v2 (karar 09.11.2026) — CANLI İÇİN HAZIRLANDI, AJAN ÇALIŞTIRMAZ.
-- Neden: App Store'da eph_addon_user_*_v1 yanlış gruba açılıp silindi; Apple silinen kimliği tekrar kullandırmaz.
-- Yalnız "StoreProduct"."magazaUrunKimligi" güncellenir (schema.prisma: model StoreProduct). Başka kolona dokunulmaz.
-- Beklenen: 5 ürün x 2 platform (APPLE, GOOGLE) = 10 satır; değilse RAISE EXCEPTION ile tüm işlem geri alınır.
-- Not: @@unique([platform, magazaUrunKimligi]) — v2 kimlikler zaten varsa UPDATE unique ihlaliyle düşer (geri alınır).
BEGIN;

-- 1) Etkilenecek satırlar (beklenen 10)
SELECT "id", "platform", "urunTuru", "kisiSayisi", "urunAnahtari", "magazaUrunKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" IN ('eph_addon_user_1_v1','eph_addon_user_2_v1','eph_addon_user_3_v1','eph_addon_user_5_v1','eph_addon_user_10_v1')
ORDER BY "platform", "kisiSayisi";

-- 2) Güncelleme + satır sayısı kontrolü
DO $$
DECLARE n integer;
BEGIN
  UPDATE "StoreProduct"
  SET "magazaUrunKimligi" = regexp_replace("magazaUrunKimligi", '_v1$', '_v2')
  WHERE "magazaUrunKimligi" IN ('eph_addon_user_1_v1','eph_addon_user_2_v1','eph_addon_user_3_v1','eph_addon_user_5_v1','eph_addon_user_10_v1');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 10 THEN
    RAISE EXCEPTION 'ODM-8D: 10 satır güncellenmeliydi, güncellenen % — işlem geri alındı', n;
  END IF;
END $$;

-- 3) Doğrulama (10 satır v2, 0 satır v1 beklenir)
SELECT "id", "platform", "urunTuru", "kisiSayisi", "urunAnahtari", "magazaUrunKimligi", "aktifMi"
FROM "StoreProduct"
WHERE "magazaUrunKimligi" LIKE 'eph_addon_user_%'
ORDER BY "platform", "kisiSayisi";

SELECT count(*) FILTER (WHERE "magazaUrunKimligi" LIKE 'eph_addon_user_%\_v2') AS v2_adet,
       count(*) FILTER (WHERE "magazaUrunKimligi" LIKE 'eph_addon_user_%\_v1') AS v1_adet
FROM "StoreProduct";

COMMIT;
