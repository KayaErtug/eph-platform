-- EPH-70B1F/70B1G — LOT UZLAŞTIRMA SQL (v3, YAZAR!). AJAN ÇALIŞTIRMAZ; Mustafa abi onayıyla, yedek aldıktan ve YAZIMLAR DURDURULMUŞKEN (uygulama
-- bakım modunda / PM2 durdurulmuş) sunucuda çalıştırılır. Ön koşul: prisma/migrations/20261108130000_eph70b1f_lot_tuketim uygulanmış olmalı.
--
-- Amaç: canlı veride lot kalanları harcamayla hiç azalmamış. Her cüzdanda Σ aktif lot kalanı > bakiye ise fark, uygulamadaki tüketim
-- sırasıyla lotlardan düşülür: (1) süresi olan lot, bitişi en yakın önce  (2) süresiz EK PK olmayan lot  (3) süresiz EK PK lotu (SATIN_ALMA) en son.
-- Bakiye DEĞİŞMEZ; yalnız PortfolioCreditLot.kalanMiktar azalır.
--
-- GÜVENCELER
--  * EKSİYE DÜŞMEZ  : düşüm = LEAST(lot.kalanMiktar, kalan_fark) ve UPDATE'te "kalanMiktar" >= dus koşulu.
--  * TEKRAR ÇALIŞTIRMA (ODM-7E/F6): düşüm planı YALNIZ bu çalıştırmada karar verilen cüzdanlar için kurulur ("islendi" = bu transaction'ın now() değeri).
--                     Önceki çalıştırmalarda karar verilmiş cüzdan sonradan yeni lot / yeni bakiye alsa bile PLANA GİRMEZ (eski snapshot bakiyesiyle yeni lot düşülmez).
--                     Cüzdan defteri "_eph70_lot_cuzdan" (cüzdan başına tek karar, PRIMARY KEY) + lot defteri "_eph70_lot_defter" (lot başına tek kayıt).
--  * KÖKEN BELİRSİZSE DOKUNMAZ (ODM-7E/F1): lot dışı yükleme (hediye, ofis dağıtımı, ofis deneme/paket yüklemesi, admin bakiye düzeltmesi) geçmişi olan
--    ve aktif lotu bulunan cüzdan, lot toplamı bakiyeye EŞİT veya düşük olsa da "INCELEME" olarak defterlenir, lot DEĞİŞTİRİLMEZ. Cüzdanı olmayıp lotu olan kullanıcı da INCELEME.
--    Toplam karşılaştırması köken şüphesinden SONRA yapılır. INCELEME çözülmeden bayrak yazılmaz.
--  * Bu script yalnız TOPLAM fazlasını giderir; geçmiş lot sahipliğini kanıtlamaz. "0 tutarsız cüzdan" çıktısı doğru lot dağılımı kanıtı DEĞİLDİR.
--  * Bayrak adımı (ayrı) SQL koşullarıyla korunur: INCELEME yok, negatif lot yok, UZLASTI'da fazla yok, uygulanmamış defter satırı yok, yeni-deneme tarihi tanımlı.
--  * Uygulama kodu hâlâ yazıyorsa sonuç güvenilmez: BAKIM MODU ŞART (yazımlar durdurulmuş).
-- Varsayılan: ROLLBACK (sonuçlar doğruysa COMMIT'i elle açın). ROLLBACK edilirse defterler de geri alınır.

BEGIN;

-- 0) Defter tabloları (idempotent; ilk çalıştırmada oluşur, sonra korunur — SİLİNMEZ)
CREATE TABLE IF NOT EXISTS "_eph70_lot_cuzdan" (
  "kullaniciId"   text PRIMARY KEY,
  "bakiye"        integer NOT NULL,
  "lotToplamOnce" integer NOT NULL,
  "durum"         text NOT NULL CHECK ("durum" IN ('UZLASTI','ESIT','INCELEME')),
  "islendi"       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "_eph70_lot_defter" (
  "lotId"       text PRIMARY KEY,
  "kullaniciId" text NOT NULL,
  "eskiKalan"   integer NOT NULL,
  "dus"         integer NOT NULL CHECK ("dus" > 0),
  "yeniKalan"   integer NOT NULL CHECK ("yeniKalan" >= 0),
  "uygulandi"   timestamptz NOT NULL DEFAULT now(),
  "geriAlindi"  timestamptz
);
-- ODM-7E/F6: gerçek uygulama zamanı (planlama zamanından ayrı). UPDATE aynı transaction now() ile lot "guncellenmeTarihi"ni de yazar;
-- geri alma, lotun o zamandan beri HİÇ güncellenmediğini bu eşitlikle kanıtlar.
ALTER TABLE "_eph70_lot_defter" ADD COLUMN IF NOT EXISTS "uygulananAt" timestamptz;

-- 1) Kilit: ilgili cüzdanları uygulamayla AYNI protokolle, kullaniciId artan sırada kilitle (advisory wallet:{id} -> satır FOR UPDATE).
--    Yazımlar zaten durdurulmuş olmalı; bu kilit yalnız yarışa karşı ek güvencedir.
SELECT pg_advisory_xact_lock(hashtext('wallet:' || x."kullaniciId")) FROM (
  SELECT DISTINCT l."kullaniciId" FROM "PortfolioCreditLot" l WHERE l."aktifMi" AND l."kalanMiktar" > 0 ORDER BY l."kullaniciId"
) x;
SELECT w.id FROM "KontorCuzdani" w
WHERE w."kullaniciId" IN (SELECT l."kullaniciId" FROM "PortfolioCreditLot" l WHERE l."aktifMi" AND l."kalanMiktar" > 0)
ORDER BY w."kullaniciId" FOR UPDATE;

-- 2) Cüzdan kararları (yalnız daha önce işlenmemiş cüzdanlar; "islendi" varsayılanı now() = bu transaction → çalıştırma kimliği)
--    Kapsam: tüm cüzdanlar + lotu olup cüzdanı olmayan kullanıcılar. Sıra: (a) cüzdansız lot, (b) lot dışı yükleme geçmişi (toplamdan BAĞIMSIZ), (c) toplam.
INSERT INTO "_eph70_lot_cuzdan" ("kullaniciId", "bakiye", "lotToplamOnce", "durum")
SELECT t."kullaniciId", t.bakiye, t.lot_toplam,
       CASE WHEN t.lot_toplam > 0 AND NOT t.cuzdan_var THEN 'INCELEME'
            WHEN t.lot_toplam > 0 AND EXISTS (
              SELECT 1 FROM "KontorHareketi" h
              WHERE h."kullaniciId" = t."kullaniciId"
                AND ( h."hareketTuru"::text = 'HEDIYE'
                   OR h."ilgiliKayitTuru" IN ('OFFICE_PK_TRANSFER', 'ADMIN_BAKIYE_DUZELTME')
                   OR h."aciklama" LIKE 'Ofis Deneme Paketi%'
                   OR h."aciklama" LIKE '%Paketi Satın Alma:%'
                   OR h."aciklama" LIKE 'Yönetici panelinden bakiye güncellendi%' )
            ) THEN 'INCELEME'
            WHEN t.lot_toplam <= GREATEST(t.bakiye, 0) THEN 'ESIT'
            ELSE 'UZLASTI' END
FROM (
  SELECT u."kullaniciId", COALESCE(w.bakiye, 0) AS bakiye, (w.id IS NOT NULL) AS cuzdan_var,
         COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l WHERE l."kullaniciId" = u."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0)::integer AS lot_toplam
  FROM (SELECT "kullaniciId" FROM "KontorCuzdani"
        UNION SELECT "kullaniciId" FROM "PortfolioCreditLot" WHERE "aktifMi" AND "kalanMiktar" > 0) u
  LEFT JOIN "KontorCuzdani" w ON w."kullaniciId" = u."kullaniciId"
) t
WHERE NOT EXISTS (SELECT 1 FROM "_eph70_lot_cuzdan" c WHERE c."kullaniciId" = t."kullaniciId");

-- 3) ÖNCE SAYIM (lot değiştirmez)
SELECT c."durum", count(*) AS "cuzdan", COALESCE(sum(c."lotToplamOnce" - GREATEST(c."bakiye", 0)) FILTER (WHERE c."durum" <> 'ESIT'), 0) AS "fazlaPk",
       count(*) FILTER (WHERE c."lotToplamOnce" < GREATEST(c."bakiye", 0)) AS "lotuBakiyedenEksikCuzdan_bilgi"
FROM "_eph70_lot_cuzdan" c GROUP BY c."durum" ORDER BY 1;

-- 4) Düşüm planı -> lot defteri (yalnız durum='UZLASTI' ve henüz defterde olmayan lotlar; eksiye düşmez)
WITH ranked AS (
  SELECT l.id, l."kullaniciId", l."kalanMiktar", GREATEST(c.bakiye, 0) AS bakiye,
         sum(l."kalanMiktar") OVER (PARTITION BY l."kullaniciId") AS lot_toplam,
         COALESCE(sum(l."kalanMiktar") OVER (
           PARTITION BY l."kullaniciId"
           ORDER BY CASE WHEN l."sonKullanmaTarihi" IS NOT NULL THEN 0 WHEN l."lotTuru"::text <> 'SATIN_ALMA' THEN 1 ELSE 2 END,
                    l."sonKullanmaTarihi" ASC NULLS LAST, l."olusturulmaTarihi" ASC, l.id ASC
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS onceki
  FROM "PortfolioCreditLot" l
  JOIN "_eph70_lot_cuzdan" c ON c."kullaniciId" = l."kullaniciId" AND c."durum" = 'UZLASTI' AND c."islendi" = now()  -- yalnız BU çalıştırmanın kararları
  WHERE l."aktifMi" AND l."kalanMiktar" > 0
    AND NOT EXISTS (SELECT 1 FROM "_eph70_lot_defter" d WHERE d."lotId" = l.id)
), plan AS (
  SELECT id, "kullaniciId", "kalanMiktar",
         LEAST("kalanMiktar", GREATEST(0, (lot_toplam - bakiye) - onceki))::integer AS dus
  FROM ranked WHERE lot_toplam > bakiye
)
INSERT INTO "_eph70_lot_defter" ("lotId", "kullaniciId", "eskiKalan", "dus", "yeniKalan")
SELECT id, "kullaniciId", "kalanMiktar", dus, "kalanMiktar" - dus FROM plan WHERE dus > 0;

-- 5) Uygula: yalnız defterde olup henüz uygulanmamış (kalan hâlâ eskiKalan) lotlar; "kalanMiktar" >= dus koşulu eksiye düşmeyi engeller.
--    Lotun "guncellenmeTarihi" ve defterin "uygulananAt" alanı AYNI now() değerini alır (geri alma bu eşitliği kanıt olarak kullanır).
WITH u AS (
  UPDATE "PortfolioCreditLot" l
  SET "kalanMiktar" = d."yeniKalan", "guncellenmeTarihi" = now()
  FROM "_eph70_lot_defter" d
  WHERE d."lotId" = l.id AND d."geriAlindi" IS NULL AND d."uygulananAt" IS NULL AND l."kalanMiktar" = d."eskiKalan" AND l."kalanMiktar" >= d."dus"
  RETURNING l.id
)
UPDATE "_eph70_lot_defter" d SET "uygulananAt" = now() FROM u WHERE u.id = d."lotId";

-- 6) DOĞRULAMA
--   a) UZLASTI cüzdanlarda hâlâ Σlot > bakiye olan var mı? (0 olmalı)
SELECT count(*) AS "halaTutarsizUzlastiCuzdan" FROM (
  SELECT c."kullaniciId", GREATEST(c.bakiye, 0) AS b, COALESCE(sum(l."kalanMiktar"), 0) AS t
  FROM "_eph70_lot_cuzdan" c
  LEFT JOIN "PortfolioCreditLot" l ON l."kullaniciId" = c."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0
  WHERE c."durum" = 'UZLASTI' GROUP BY c."kullaniciId", c.bakiye
) x WHERE x.t > x.b;
--   b) Negatif lot var mı? (0 olmalı)
SELECT count(*) AS "negatifLot" FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0;
--   b2) Defterde planlanıp UYGULANMAMIŞ satır var mı? (0 olmalı)
SELECT count(*) AS "uygulanmamisDefterSatiri" FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL;
--   c) Elle çözülmesi gereken INCELEME cüzdanları (bayrak yazılmadan önce 0 olmalı; çözüm sonrası durumu elle 'UZLASTI'/'ESIT' yapın)
SELECT count(*) AS "bekleyenIncelemeCuzdani" FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME';

ROLLBACK;  -- sonuçlar doğruysa ROLLBACK yerine COMMIT yazın

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- AYRI ADIM — UZLAŞTIRMA TAMAM BAYRAĞI (yukarıdaki işlem COMMIT edilip 6a/6b/6c doğrulandıktan SONRA, ayrı oturumda elle çalıştırılır).
-- Bu satır yazılmadan dönem sonu düşümü (cron + harcama anı kapanışı) HİÇBİR ŞEY yapmaz. INCELEME bekleyen cüzdan varsa bayrak YAZILMAZ.
-- BEGIN;
-- ÖNCE (ayrı oturumda, yazımlar hâlâ KAPALI): yeni-deneme başlangıcını GERÇEK geçiş anıyla yazın (aşağıdaki ikinci INSERT). Tanımsızsa bayrak YAZILMAZ.
-- INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
-- SELECT gen_random_uuid()::text, 'EPH70_LOT_UZLASTIRMA_TAMAM', 'true'::jsonb, 'EPH-70B1F: lot uzlaştırması doğrulandı; dönem sonu düşümü açık', now(), now()
-- WHERE NOT EXISTS (SELECT 1 FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME')
--   AND NOT EXISTS (SELECT 1 FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0)
--   AND NOT EXISTS (SELECT 1 FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL)
--   AND NOT EXISTS (
--     SELECT 1 FROM "_eph70_lot_cuzdan" c
--     LEFT JOIN "KontorCuzdani" w ON w."kullaniciId" = c."kullaniciId"
--     WHERE c."durum" = 'UZLASTI'
--       AND COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l WHERE l."kullaniciId" = c."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0) > GREATEST(COALESCE(w.bakiye, 0), 0))
--   AND EXISTS (SELECT 1 FROM "SystemSetting" WHERE "key" = 'EPH70_YENI_DENEME_BASLANGICI')
-- ON CONFLICT ("key") DO UPDATE SET "valueJson" = 'true'::jsonb, "updatedAt" = now();
-- COMMIT;   -- INSERT 0 satır döndürdüyse koşullardan biri sağlanmıyor: bayrak YAZILMADI; nedeni 6a/6b/6b2/6c çıktılarından bulun.
-- (Eski denemelerin kalan PK'sını korumak için, yeni denemelerin başlangıç tarihini de yazın; tanımsızsa TÜM denemeler korunur:)
-- INSERT INTO "SystemSetting" ("id","key","valueJson","description","createdAt","updatedAt")
-- VALUES (gen_random_uuid()::text, 'EPH70_YENI_DENEME_BASLANGICI', to_jsonb('2026-11-09T00:00:00Z'::text), 'EPH-70B1F: bu tarihten sonra açılan denemeler dönem sonunda silinir (karar 18b)', now(), now())
-- ON CONFLICT ("key") DO UPDATE SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- GERİ ALMA (commit sonrası, yazımlar DURDURULMUŞKEN — bakım modu şart). Sıra:
--   1) Önce uzlaştırma bayrağı KAPATILIR (cron/harcama anı kapanışı geri şişirilen lotları tekrar düşmesin) — aynı transaction içinde.
--   2) Yalnız lotun şimdiki kalanı hâlâ defterdeki yeniKalan VE lotun "guncellenmeTarihi" defterin "uygulananAt" değerine eşitse (lot o günden beri
--      hiç güncellenmemiş: harcama/iade/süre dolumu yok) eskiKalan geri yazılır. Miktar eşitliği tek başına kanıt sayılmaz.
--   3) Geri alınamayan satırlar (lot sonradan değişmiş) SAYILIR ve elle incelenir; geriAlindi yalnız gerçekten geri alınanlar için yazılır.
-- BEGIN;
-- UPDATE "SystemSetting" SET "valueJson" = 'false'::jsonb, "updatedAt" = now() WHERE "key" = 'EPH70_LOT_UZLASTIRMA_TAMAM';
-- WITH r AS (
--   UPDATE "PortfolioCreditLot" l SET "kalanMiktar" = d."eskiKalan", "guncellenmeTarihi" = now()
--   FROM "_eph70_lot_defter" d
--   WHERE d."lotId" = l.id AND d."geriAlindi" IS NULL AND d."uygulananAt" IS NOT NULL
--     AND l."kalanMiktar" = d."yeniKalan" AND l."guncellenmeTarihi" = d."uygulananAt"
--   RETURNING l.id
-- )
-- UPDATE "_eph70_lot_defter" d SET "geriAlindi" = now() FROM r WHERE r.id = d."lotId";
-- SELECT count(*) AS "geriAlinamayanElleIncelenecek" FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NOT NULL;
-- COMMIT;
