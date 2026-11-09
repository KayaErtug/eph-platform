-- EPH-70 — INCELEME CÜZDANLARI ÇÖZÜMÜ (DEPLOY-2, karar: Mustafa abi 09.11.2026). YAZAR! AJAN ÇALIŞTIRMAZ.
-- Mustafa abi onayıyla, tam yedekten sonra, YAZIMLAR DURDURULMUŞKEN (bakım modu) ve eph70_lot_uzlastirma.sql COMMIT edildikten SONRA çalıştırılır.
--
-- KARAR: bakiye HİÇBİR cüzdanda değişmez (KontorCuzdani'na YAZILMAZ). Yalnız lot tarafı bakiyeye eşitlenir.
--   B (lot toplamı < bakiye): fark kadar SÜRESİZ DUZELTME lotu eklenir (sonKullanmaTarihi NULL, kaynakKayitTuru 'EPH70_INCELEME_COZUM',
--      dedupeKey 'EPH70_INCELEME_COZUM:<kullaniciId>' → cüzdan başına en çok bir lot; tekrar çalıştırmada ikinci lot oluşmaz).
--   C (lot toplamı > bakiye): lotlar bakiye kadar KIRPILIR; sıra uygulamadaki tüketim sırası (süreli lot önce, sonra süresiz EK PK olmayan,
--      süresiz SATIN_ALMA en son; eşitlikte eski lot önce). Kırpma "_eph70_lot_defter"e yazılır (geri alma betiği aynı defterden çalışır).
--
-- KAPSAM / GÜVENCELER
--  * YALNIZ çalıştığı anda "_eph70_lot_cuzdan".durum = 'INCELEME' olan cüzdanlar. Tür (B/C) ÇALIŞTIĞI ANDAKİ bakiye ve lot toplamından YENİDEN hesaplanır
--    (eski snapshot kullanılmaz). Başka cüzdana dokunulmaz.
--  * BEKLENMEYEN durum → RAISE EXCEPTION (hiçbir şey yazılmaz, transaction geri alınır): beklenen listede olmayan INCELEME cüzdanı;
--    listedeki cüzdanın türü beklenenden farklı; cüzdansız lot; negatif bakiye; eşit toplam (B/C dışı); lotu zaten defterde olan cüzdan.
--  * İDEMPOTENT: çözülen cüzdanlar 'UZLASTI' olur → ikinci çalıştırmada INCELEME kalmaz, hedef 0, hiçbir şey değişmez.
--  * Çalışma sırası: önce SAYIM (hiçbir şey değiştirmez) → uygulama → DOĞRULAMA (Σbakiye önce=sonra, negatif lot 0, INCELEME 0, çözülen cüzdanlarda Σlot = bakiye).
--    Doğrulama sağlanmazsa RAISE EXCEPTION.
--  * Varsayılan: ROLLBACK (sonuçlar doğruysa COMMIT'i elle açın; repo dosyasına dokunmadan bir kopyada). ROLLBACK'te defter durumları da geri alınır.
--  * BAKIM MODU ŞART: uygulama yazıyorsa sonuç güvenilmez.

BEGIN;

-- 0) Ön koşul: lot uzlaştırma defterleri var olmalı (eph70_lot_uzlastirma.sql çalışmış olmalı)
DO $$
BEGIN
  IF to_regclass('public."_eph70_lot_cuzdan"') IS NULL OR to_regclass('public."_eph70_lot_defter"') IS NULL THEN
    RAISE EXCEPTION 'EPH70_COZUM: _eph70_lot_cuzdan/_eph70_lot_defter yok — önce eph70_lot_uzlastirma.sql çalıştırılmalı';
  END IF;
END $$;

-- 1) Kilit: hedef cüzdanları uygulamayla AYNI protokolle (advisory wallet:{id} → satır FOR UPDATE), kullaniciId artan sırada
SELECT pg_advisory_xact_lock(hashtext('wallet:' || x."kullaniciId")) FROM (
  SELECT "kullaniciId" FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME' ORDER BY "kullaniciId"
) x;
SELECT w.id FROM "KontorCuzdani" w
WHERE w."kullaniciId" IN (SELECT "kullaniciId" FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME')
ORDER BY w."kullaniciId" FOR UPDATE;

-- 2) Hedef tablosu (türler ŞİMDİKİ bakiye/lot toplamından yeniden hesaplanır)
CREATE TEMP TABLE _eph70_cozum_hedef ON COMMIT DROP AS
SELECT c."kullaniciId",
       left(c."kullaniciId", 8) AS kisa,
       w.id IS NOT NULL AS cuzdan_var,
       COALESCE(w.bakiye, 0) AS bakiye,
       COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l
                 WHERE l."kullaniciId" = c."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0)::integer AS lot_toplam,
       CASE WHEN COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l
                           WHERE l."kullaniciId" = c."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0) < COALESCE(w.bakiye, 0) THEN 'B'
            WHEN COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l
                           WHERE l."kullaniciId" = c."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0) > COALESCE(w.bakiye, 0) THEN 'C'
            ELSE 'ESIT' END AS tur
FROM "_eph70_lot_cuzdan" c
LEFT JOIN "KontorCuzdani" w ON w."kullaniciId" = c."kullaniciId"
WHERE c."durum" = 'INCELEME';

-- Bakiye toplamı (önce) — doğrulamada karşılaştırılır
CREATE TEMP TABLE _eph70_cozum_once ON COMMIT DROP AS
SELECT (SELECT COALESCE(sum("bakiye"), 0) FROM "KontorCuzdani")::bigint AS bakiye_toplam;

-- 3) Beklenmeyen durum korumaları (DEPLOY-2 kararı: PROVA_SORGU_20261109-030508 — 5 B + 2 C)
DO $$
DECLARE
  beklenen CONSTANT jsonb := '{"2e149f52":"B","5e9e2be0":"B","dc275dc6":"B","f5d5c349":"B","fd10be44":"B","1da38633":"C","48c4e47c":"C"}'::jsonb;
  h record;
BEGIN
  FOR h IN SELECT * FROM _eph70_cozum_hedef LOOP
    IF NOT (beklenen ? h.kisa) THEN
      RAISE EXCEPTION 'EPH70_COZUM: beklenmeyen INCELEME cüzdanı % (karar listesinde yok) — durduruldu', h.kisa;
    END IF;
    IF NOT h.cuzdan_var THEN
      RAISE EXCEPTION 'EPH70_COZUM: % cüzdansız lot sahibi — bu çözüm kapsamı dışı', h.kisa;
    END IF;
    IF h.bakiye < 0 THEN
      RAISE EXCEPTION 'EPH70_COZUM: % negatif bakiye (%)', h.kisa, h.bakiye;
    END IF;
    IF h.tur NOT IN ('B', 'C') THEN
      RAISE EXCEPTION 'EPH70_COZUM: % beklenmeyen tür % (lot=% bakiye=%) — B/C değil', h.kisa, h.tur, h.lot_toplam, h.bakiye;
    END IF;
    IF h.tur <> (beklenen ->> h.kisa) THEN
      RAISE EXCEPTION 'EPH70_COZUM: % türü beklenenden farklı (beklenen %, bulunan %; lot=% bakiye=%)', h.kisa, beklenen ->> h.kisa, h.tur, h.lot_toplam, h.bakiye;
    END IF;
    IF EXISTS (SELECT 1 FROM "_eph70_lot_defter" d JOIN "PortfolioCreditLot" l ON l.id = d."lotId" WHERE l."kullaniciId" = h."kullaniciId") THEN
      RAISE EXCEPTION 'EPH70_COZUM: % cüzdanının lotu zaten uzlaştırma defterinde — beklenmeyen', h.kisa;
    END IF;
  END LOOP;
END $$;

-- 4) ÖNCE SAYIM (hiçbir şeyi değiştirmez): tür başına cüzdan sayısı ve toplam fark
SELECT t.tur, count(*) AS "cuzdan", COALESCE(sum(abs(t.lot_toplam - t.bakiye)), 0) AS "toplamFarkPk"
FROM _eph70_cozum_hedef t GROUP BY t.tur ORDER BY 1;
SELECT t.kisa AS "cuzdanKisa", t.tur, t.bakiye, t.lot_toplam AS "lotToplami", (t.lot_toplam - t.bakiye) AS "lotMinusBakiye"
FROM _eph70_cozum_hedef t ORDER BY t.tur, t.kisa;

-- 5) B: eksik fark kadar süresiz DUZELTME lotu (dedupeKey cüzdan bazında; çift lot oluşmaz)
INSERT INTO "PortfolioCreditLot" ("id", "kullaniciId", "lotTuru", "ilkMiktar", "kalanMiktar", "sonKullanmaTarihi",
                                  "kaynakKayitTuru", "kaynakKayitId", "dedupeKey", "aciklama", "aktifMi", "olusturulmaTarihi", "guncellenmeTarihi")
SELECT gen_random_uuid()::text, t."kullaniciId", 'DUZELTME', (t.bakiye - t.lot_toplam), (t.bakiye - t.lot_toplam), NULL,
       'EPH70_INCELEME_COZUM', NULL, 'EPH70_INCELEME_COZUM:' || t."kullaniciId",
       'EPH-70 inceleme çözümü: lot toplamı bakiyeden azdı; fark süresiz lotla tamamlandı (bakiye değişmedi)', true, now(), now()
FROM _eph70_cozum_hedef t
WHERE t.tur = 'B'
ON CONFLICT ("dedupeKey") DO NOTHING;

-- 6) C: lotları bakiye kadar kırp (tüketim sırası; eksiye düşmez) → defter → uygula
WITH ranked AS (
  SELECT l.id, l."kullaniciId", l."kalanMiktar", t.bakiye, t.lot_toplam,
         COALESCE(sum(l."kalanMiktar") OVER (
           PARTITION BY l."kullaniciId"
           ORDER BY CASE WHEN l."sonKullanmaTarihi" IS NOT NULL THEN 0 WHEN l."lotTuru"::text <> 'SATIN_ALMA' THEN 1 ELSE 2 END,
                    l."sonKullanmaTarihi" ASC NULLS LAST, l."olusturulmaTarihi" ASC, l.id ASC
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS onceki
  FROM "PortfolioCreditLot" l
  JOIN _eph70_cozum_hedef t ON t."kullaniciId" = l."kullaniciId" AND t.tur = 'C'
  WHERE l."aktifMi" AND l."kalanMiktar" > 0
), plan AS (
  SELECT id, "kullaniciId", "kalanMiktar", LEAST("kalanMiktar", GREATEST(0, (lot_toplam - bakiye) - onceki))::integer AS dus FROM ranked
)
INSERT INTO "_eph70_lot_defter" ("lotId", "kullaniciId", "eskiKalan", "dus", "yeniKalan")
SELECT id, "kullaniciId", "kalanMiktar", dus, "kalanMiktar" - dus FROM plan WHERE dus > 0;

WITH u AS (
  UPDATE "PortfolioCreditLot" l
  SET "kalanMiktar" = d."yeniKalan", "guncellenmeTarihi" = now()
  FROM "_eph70_lot_defter" d
  WHERE d."lotId" = l.id AND d."geriAlindi" IS NULL AND d."uygulananAt" IS NULL
    AND l."kalanMiktar" = d."eskiKalan" AND l."kalanMiktar" >= d."dus"
    AND l."kullaniciId" IN (SELECT "kullaniciId" FROM _eph70_cozum_hedef WHERE tur = 'C')
  RETURNING l.id, l."guncellenmeTarihi" AS ts
)
UPDATE "_eph70_lot_defter" d SET "uygulananAt" = now(), "lotGuncellenme" = u.ts FROM u WHERE u.id = d."lotId";

-- 7) DOĞRULAMA — herhangi biri sağlanmazsa RAISE EXCEPTION (transaction geri alınır)
DO $$
DECLARE
  once bigint; sonra bigint; neg integer; uygulanmamis integer; tutarsiz integer; inc integer; hedef integer;
BEGIN
  SELECT bakiye_toplam INTO once FROM _eph70_cozum_once;
  SELECT COALESCE(sum("bakiye"), 0)::bigint INTO sonra FROM "KontorCuzdani";
  IF once <> sonra THEN RAISE EXCEPTION 'EPH70_COZUM: Σbakiye değişti (önce=% sonra=%) — 18b ihlali', once, sonra; END IF;

  SELECT count(*) INTO neg FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0;
  IF neg <> 0 THEN RAISE EXCEPTION 'EPH70_COZUM: negatif lot var (%)', neg; END IF;

  SELECT count(*) INTO uygulanmamis FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL;
  IF uygulanmamis <> 0 THEN RAISE EXCEPTION 'EPH70_COZUM: uygulanmamış defter satırı var (%)', uygulanmamis; END IF;

  SELECT count(*) INTO tutarsiz FROM _eph70_cozum_hedef t
  WHERE COALESCE((SELECT sum(l."kalanMiktar") FROM "PortfolioCreditLot" l WHERE l."kullaniciId" = t."kullaniciId" AND l."aktifMi" AND l."kalanMiktar" > 0), 0)
        <> (SELECT w.bakiye FROM "KontorCuzdani" w WHERE w."kullaniciId" = t."kullaniciId");
  IF tutarsiz <> 0 THEN RAISE EXCEPTION 'EPH70_COZUM: çözülen % cüzdanda Σlot ≠ bakiye', tutarsiz; END IF;

  -- B cüzdanında en çok 1 çözüm lotu (dedupeKey tekil; çifte güvence)
  IF EXISTS (SELECT 1 FROM "PortfolioCreditLot" WHERE "kaynakKayitTuru" = 'EPH70_INCELEME_COZUM' GROUP BY "kullaniciId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'EPH70_COZUM: bir cüzdanda birden çok çözüm lotu';
  END IF;

  -- Çözülen cüzdanların durumu → UZLASTI (yalnız hedef cüzdanlar, yalnız hâlâ INCELEME olanlar)
  UPDATE "_eph70_lot_cuzdan" c SET "durum" = 'UZLASTI'
  WHERE c."durum" = 'INCELEME' AND c."kullaniciId" IN (SELECT "kullaniciId" FROM _eph70_cozum_hedef);
  GET DIAGNOSTICS hedef = ROW_COUNT;

  SELECT count(*) INTO inc FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME';
  IF inc <> 0 THEN RAISE EXCEPTION 'EPH70_COZUM: INCELEME hâlâ % (0 olmalı)', inc; END IF;
  RAISE NOTICE 'EPH70_COZUM: % cüzdan UZLASTI yapıldı; Σbakiye=%; negatif lot=0; INCELEME=0', hedef, sonra;
END $$;

-- 8) Sonuç özeti (bilgi)
SELECT (SELECT count(*) FROM "_eph70_lot_cuzdan" WHERE "durum" = 'INCELEME') AS "bekleyenIncelemeCuzdani",
       (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0) AS "negatifLot",
       (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kaynakKayitTuru" = 'EPH70_INCELEME_COZUM') AS "cozumLotuAdedi",
       (SELECT count(*) FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL) AS "uygulanmamisDefterSatiri";

ROLLBACK;  -- sonuçlar doğruysa ROLLBACK yerine COMMIT yazın (repo dosyasına değil, kopyaya)

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- ARDINDAN (ayrı oturum, yazımlar hâlâ KAPALI): bayraklar eph70_lot_uzlastirma.sql sonundaki yorumlu INSERT'lerle (sıra: önce YENI_DENEME_BASLANGICI, sonra LOT_UZLASTIRMA_TAMAM).
-- GERİ ALMA (commit sonrası, bakım modunda; ÖNCE EPH70_LOT_UZLASTIRMA_TAMAM bayrağı 'false' yapılır):
--   B çözüm lotları:  UPDATE "PortfolioCreditLot" SET "aktifMi" = false, "kalanMiktar" = 0, "guncellenmeTarihi" = now()
--                     WHERE "kaynakKayitTuru" = 'EPH70_INCELEME_COZUM' AND "kalanMiktar" = "ilkMiktar";   -- harcanmış lot geri alınmaz, elle incelenir
--   C kırpmaları:     eph70_lot_uzlastirma.sql sonundaki GERİ ALMA bloğu (defter tabanlı; yalnız dokunulmamış lotları geri yazar).
--   Cüzdan durumu:    UPDATE "_eph70_lot_cuzdan" SET "durum" = 'INCELEME' WHERE left("kullaniciId", 8) IN (...geri alınan cüzdanlar...);
