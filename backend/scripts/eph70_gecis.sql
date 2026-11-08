-- EPH-70 / PROVA-3 — DENEME GERİ DOLDURMA (v1, YAZAR!). AJAN ÇALIŞTIRMAZ. Mustafa abi onayıyla, yedek aldıktan sonra sunucuda çalıştırılır:
--   psql "$DATABASE_URL" -f scripts/eph70_gecis.sql        (varsayılan ROLLBACK: yalnız sayım + doğrulama görürsünüz)
-- Dayanak: DEPLOY_PLANI_20261108.md §4.7 / §10-3; ODM-7G-D F08; karar 18b (eski denemelerin KALAN PK'sı KALIR) ve 18h (telefon HMAC).
-- Ön koşul: 20261109000100_eph70b2_b_ofis_paket_modeli uygulanmış olmalı (OfisDenemeKaydi, OfisGecisDefteri tabloları).
--
-- AMAÇ: Eski sistemde "Ofis Deneme Paketi" yüklemesi almış ofisleri yeni modelin OfisDenemeKaydi tablosuna (kaynak='GECIS') işler; böylece
--   yeni deneme, bu ofislere/telefonlara ikinci kez 500 PK vermez (grantTrial: ofis UNIQUE + telefonHash UNIQUE). Bu betik PK YÜKLEMEZ, lot/bakiye DEĞİŞTİRMEZ,
--   lot SİLMEZ (18b: kalan PK kalır). Yalnız OfisDenemeKaydi + OfisGecisDefteri satırı ekler. SystemSetting'e YAZMAZ (bayrak ayrı adımdır, aşağıda yorumlu).
--
-- ESKİ DENEME KAYNAĞI (uygulamadaki kontrolle aynı ölçüt: office-entitlement.service.ts › grantTrial › legacyTrial):
--   KontorHareketi.aciklama içinde 'Ofis Deneme Paketi' geçen, miktarı > 0 olan yükleme hareketi. Kullanıcı başına toplanır (ilk tarih, Σ miktar).
--   Bitiş: o kullanıcının eski OFFICE_TRIAL lotunun sonKullanmaTarihi (en geç); yoksa baslangic + OFFICE_TRIAL_CONFIG.gun gün; ikisi de yoksa KARANTİNA.
--   Ofis: kullanıcının SAHİBİ olduğu tek ofis; sahibi olduğu ofis yoksa kullanıcının bağlı olduğu ofis (User.officeId). Belirsizse (0 veya >1 ofis) KARANTİNA.
--   Bir ofiste birden çok kullanıcının denemesi varsa EN ESKİ olan kayda geçer, diğerleri 'ATLANDI' (grantTrial zaten tüm ofis üyelerinin hareketine bakar).
--
-- TELEFON HASH'İ: HMAC-SHA256(TELEFON_HASH_ANAHTARI, normalize telefon) SQL'de ÜRETİLMEZ (anahtar psql/komut geçmişine ve sunucu loguna düşmesin diye).
--   Bu betik kayıtları telefonHash = NULL ile açar (şema NULL'a izin verir; UNIQUE birden çok NULL'u engellemez). Hash'i AYRI Node betiği doldurur:
--   scripts/eph70_gecis_telefon_hash.mjs (anahtar yalnız ortam değişkeninden; değer yazdırılmaz; varsayılan kuru çalıştırma). Bayrak ancak ikisi de bitince yazılır.
--
-- GÜVENCELER
--  * İDEMPOTENT: kayıt INSERT'i ON CONFLICT DO NOTHING; defter satırı kaynakAnahtar='EPH70_DENEME:<kullaniciId>' UNIQUE → tekrar çalıştırma yeni satır üretmez.
--  * ÖNCE SAYIM: (0) çıktıları satır değiştirmez. Varsayılan ROLLBACK.
--  * Doğrulama (6) bakiye toplamı + lot sayısı/toplamı değişmedi mi, her eski deneme kullanıcısı defterlendi mi kontrol eder (0 beklenir).
--  * Kişisel veri YOK: çıktılarda ad/telefon/e-posta yok; defter snapshot'ı yalnız sayılar + tarih içerir.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- 0) ÖNCE SAYIM (hiçbir şey yazmaz)
SELECT count(DISTINCT h."kullaniciId") AS "eskiDenemeKullanicisi",
       count(*) AS "eskiDenemeHareketi",
       (SELECT count(*) FROM "OfisDenemeKaydi") AS "mevcutDenemeKaydi",
       (SELECT count(*) FROM "OfisDenemeKaydi" WHERE "kaynak" = 'GECIS') AS "mevcutGecisKaydi",
       (SELECT count(*) FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\_DENEME:%' ESCAPE '\') AS "mevcutDefterSatiri"
FROM "KontorHareketi" h
WHERE h."aciklama" LIKE '%Ofis Deneme Paketi%' AND h."miktar" > 0;

-- 1) Önce/sonra karşılaştırma için cüzdan + lot anlık görüntüsü (bu transaction ile sınırlı geçici tablo)
CREATE TEMP TABLE "_g_once" ON COMMIT DROP AS
SELECT (SELECT COALESCE(sum("bakiye"), 0) FROM "KontorCuzdani")::bigint AS "bakiyeToplam",
       (SELECT count(*) FROM "PortfolioCreditLot")::bigint AS "lotAdedi",
       (SELECT COALESCE(sum("kalanMiktar"), 0) FROM "PortfolioCreditLot")::bigint AS "lotKalanToplam",
       (SELECT count(*) FROM "OfisDenemeKaydi")::bigint AS "kayitAdedi";

-- 2) Kaynak: kullanıcı başına eski deneme (tarih + PK) ve bitiş
CREATE TEMP TABLE "_g_kaynak" ON COMMIT DROP AS
WITH h AS (
  SELECT "kullaniciId" AS uid, min("olusturulmaTarihi") AS baslangic, sum("miktar")::integer AS pk, count(*)::integer AS adet
  FROM "KontorHareketi"
  WHERE "aciklama" LIKE '%Ofis Deneme Paketi%' AND "miktar" > 0
  GROUP BY "kullaniciId"
), cfg AS (
  SELECT CASE WHEN jsonb_typeof(s."valueJson"::jsonb) = 'object' AND (s."valueJson"::jsonb ->> 'gun') ~ '^[0-9]{1,4}$'
              THEN (s."valueJson"::jsonb ->> 'gun')::integer END AS gun
  FROM "SystemSetting" s WHERE s."key" = 'OFFICE_TRIAL_CONFIG'
)
SELECT h.uid, h.baslangic, h.pk, h.adet,
       COALESCE((SELECT max(l."sonKullanmaTarihi") FROM "PortfolioCreditLot" l WHERE l."kullaniciId" = h.uid AND l."kaynakKayitTuru" = 'OFFICE_TRIAL' AND l."sonKullanmaTarihi" IS NOT NULL),
                h.baslangic + (SELECT make_interval(days => cfg.gun) FROM cfg WHERE cfg.gun IS NOT NULL)) AS bitis
FROM h
WHERE EXISTS (SELECT 1 FROM "User" u WHERE u.id = h.uid);

-- 3) Plan: ofis çözümü + sınıflandırma (ESLENDI / KARANTINA / ATLANDI)
CREATE TEMP TABLE "_g_plan" ON COMMIT DROP AS
WITH ofisli AS (
  SELECT k.*, u."officeId" AS bagli_ofis,
         (SELECT array_agg(o.id ORDER BY o."createdAt", o.id) FROM "Office" o WHERE o."ownerUserId" = k.uid) AS sahip_ofisler
  FROM "_g_kaynak" k JOIN "User" u ON u.id = k.uid
), cozum AS (
  SELECT o.*,
         CASE WHEN COALESCE(cardinality(o.sahip_ofisler), 0) = 1 THEN o.sahip_ofisler[1]
              WHEN COALESCE(cardinality(o.sahip_ofisler), 0) = 0 THEN o.bagli_ofis END AS ofis_id,
         CASE WHEN COALESCE(cardinality(o.sahip_ofisler), 0) > 1 THEN 'BIRDEN_FAZLA_SAHIP_OLUNAN_OFIS'
              WHEN COALESCE(cardinality(o.sahip_ofisler), 0) = 0 AND o.bagli_ofis IS NULL THEN 'OFIS_YOK' END AS ofis_neden
  FROM ofisli o
), sirali AS (
  SELECT c.*, row_number() OVER (PARTITION BY c.ofis_id ORDER BY c.baslangic, c.uid) AS sira
  FROM cozum c
)
SELECT s.uid, s.ofis_id, s.baslangic, s.bitis, s.pk, s.adet,
       CASE WHEN s.ofis_id IS NULL THEN 'KARANTINA'
            WHEN s.bitis IS NULL OR s.bitis <= s.baslangic THEN 'KARANTINA'
            WHEN s.sira > 1 THEN 'ATLANDI'
            WHEN EXISTS (SELECT 1 FROM "OfisDenemeKaydi" d WHERE d."officeId" = s.ofis_id AND d."ownerUserId" <> s.uid) THEN 'ATLANDI'
            ELSE 'ESLENDI' END AS sonuc,
       CASE WHEN s.ofis_id IS NULL THEN s.ofis_neden
            WHEN s.bitis IS NULL THEN 'BITIS_BILINMIYOR (eski deneme lotu ve OFFICE_TRIAL_CONFIG.gun yok)'
            WHEN s.bitis <= s.baslangic THEN 'BITIS_BASLANGICTAN_ONCE'
            WHEN s.sira > 1 THEN 'AYNI_OFISTE_DAHA_ESKI_DENEME_VAR'
            WHEN EXISTS (SELECT 1 FROM "OfisDenemeKaydi" d WHERE d."officeId" = s.ofis_id AND d."ownerUserId" <> s.uid) THEN 'OFISTE_BASKA_SAHIPLI_KAYIT_VAR'
            ELSE NULL END AS neden
FROM sirali s;

-- 3b) Plan sayımı (ROLLBACK'te de görünür)
SELECT "sonuc", count(*) AS "kullanici", count(DISTINCT "ofis_id") AS "ofis", COALESCE(sum("pk"), 0) AS "toplamVerilenPk"
FROM "_g_plan" GROUP BY "sonuc" ORDER BY 1;
SELECT COALESCE("neden", '(neden yok)') AS "neden", count(*) AS "kullanici" FROM "_g_plan" WHERE "sonuc" <> 'ESLENDI' GROUP BY 1 ORDER BY 2 DESC, 1;

-- 4) OfisDenemeKaydi (kaynak='GECIS'; telefonHash NULL — Node betiği doldurur; PK YÜKLENMEZ, silinenPk/sonlandiTarihi NULL = kalan PK kalır, 18b)
INSERT INTO "OfisDenemeKaydi" ("id", "officeId", "ownerUserId", "telefonHash", "kaynak", "baslangicTarihi", "bitisTarihi", "verilenPk", "silinenPk", "sonlandiTarihi")
SELECT gen_random_uuid()::text, p.ofis_id, p.uid, NULL, 'GECIS', p.baslangic, p.bitis, GREATEST(p.pk, 0), NULL, NULL
FROM "_g_plan" p
WHERE p.sonuc = 'ESLENDI'
ON CONFLICT ("officeId") DO NOTHING;

-- 5) Geçiş defteri: her eski deneme kullanıcısı için tek satır (idempotans anahtarı kaynakAnahtar)
INSERT INTO "OfisGecisDefteri" ("id", "kaynakAnahtar", "officeId", "kullaniciId", "eskiKod", "eskiSnapshot", "eskiBitis", "hedefKod", "durum", "neden")
SELECT gen_random_uuid()::text, 'EPH70_DENEME:' || p.uid, p.ofis_id, p.uid, 'OFIS_DENEME_PAKETI',
       jsonb_build_object('verilenPk', p.pk, 'hareketAdedi', p.adet, 'baslangic', to_char(p.baslangic, 'YYYY-MM-DD"T"HH24:MI:SS')),
       p.bitis, CASE WHEN p.sonuc = 'ESLENDI' THEN 'OfisDenemeKaydi(GECIS)' END, p.sonuc, p.neden
FROM "_g_plan" p
ON CONFLICT ("kaynakAnahtar") DO NOTHING;

-- 6) DOĞRULAMA
--   a) Bakiye toplamı / lot adedi / lot kalan toplamı DEĞİŞMEDİ mi? (üçü de 0 olmalı: 18b — PK'ya dokunulmaz)
SELECT (SELECT COALESCE(sum("bakiye"), 0) FROM "KontorCuzdani")::bigint - o."bakiyeToplam" AS "bakiyeFarki",
       (SELECT count(*) FROM "PortfolioCreditLot")::bigint - o."lotAdedi" AS "lotAdediFarki",
       (SELECT COALESCE(sum("kalanMiktar"), 0) FROM "PortfolioCreditLot")::bigint - o."lotKalanToplam" AS "lotKalanFarki"
FROM "_g_once" o;
--   b) Defterlenmemiş eski deneme kullanıcısı var mı? (0 olmalı)
SELECT count(*) AS "defterlenmemisEskiDeneme" FROM (SELECT DISTINCT "kullaniciId" FROM "KontorHareketi" WHERE "aciklama" LIKE '%Ofis Deneme Paketi%' AND "miktar" > 0) x
WHERE EXISTS (SELECT 1 FROM "User" u WHERE u.id = x."kullaniciId")
  AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar" = 'EPH70_DENEME:' || x."kullaniciId");
--   c) KARANTİNA (bayrak yazılmadan önce 0 olmalı; elle çözülünce durum 'ATLANDI'/'ESLENDI' yapılır — BELİRSİZ ofise otomatik kayıt AÇILMAZ)
SELECT count(*) AS "bekleyenKarantina" FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\_DENEME:%' ESCAPE '\' AND "durum" = 'KARANTINA';
--   d) Yeni kayıt sayısı (bu çalıştırmada eklenen) ve telefon hash'i bekleyen kayıt (Node betiğinden önce = eklenen kadar)
SELECT (SELECT count(*) FROM "OfisDenemeKaydi") - o."kayitAdedi" AS "buCalistirmadaEklenenKayit",
       (SELECT count(*) FROM "OfisDenemeKaydi" WHERE "kaynak" = 'GECIS' AND "telefonHash" IS NULL) AS "telefonHashBekleyenGecisKaydi"
FROM "_g_once" o;
--   e) Tek ofis → tek kayıt (UNIQUE zaten garanti eder; belt-and-braces): 0 olmalı
SELECT count(*) AS "ayniOfistenCokKayit" FROM (SELECT "officeId" FROM "OfisDenemeKaydi" GROUP BY 1 HAVING count(*) > 1) x;

ROLLBACK;  -- sonuçlar doğruysa ROLLBACK yerine COMMIT yazın (COMMIT'ten sonra: telefon hash Node betiği → bayrak)

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- AYRI ADIM — SIRA: (1) bu dosya COMMIT  (2) node scripts/eph70_gecis_telefon_hash.mjs --uygula  (3) aşağıdaki bayrak INSERT'i (ayrı oturumda, yazımlar hâlâ KAPALI).
-- DENEME GERİ DOLDURMA TAMAM BAYRAĞI. Bu satır yazılmadan YENİ OFİS DENEMESİ AÇILMAZ (TRIAL_PREREQUISITES_PENDING; kod bayrağı asla kendisi yazmaz).
-- Koşullar (hepsi sağlanmazsa INSERT 0 satır döner = bayrak YAZILMADI):
--   * Defterlenmemiş eski deneme kullanıcısı yok; KARANTİNA bekleyen yok.
--   * telefonHash'i boş kalan GECIS kaydı yok — ya da o kayıt Node betiğince ('EPH70_DENEME_HASH:<officeId>', 'ATLANDI') geçersiz/yinelenen telefon olarak
--     onaylı listeye alınmış (ofis zaten UNIQUE(officeId) + eski hareket kontrolüyle engelli kalır; yalnız telefon kilidi eksik kalır — bilinçli kabul).
-- BEGIN;
-- INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
-- SELECT gen_random_uuid()::text, 'EPH70_DENEME_GERIDOLDURMA_TAMAM', 'true'::jsonb, 'EPH-70: eski deneme tüketimleri OfisDenemeKaydi''ne geri dolduruldu; yeni deneme açılabilir', now(), now()
-- WHERE NOT EXISTS (
--     SELECT 1 FROM (SELECT DISTINCT "kullaniciId" FROM "KontorHareketi" WHERE "aciklama" LIKE '%Ofis Deneme Paketi%' AND "miktar" > 0) x
--     WHERE EXISTS (SELECT 1 FROM "User" u WHERE u.id = x."kullaniciId")
--       AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar" = 'EPH70_DENEME:' || x."kullaniciId"))
--   AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\_DENEME:%' ESCAPE '\' AND "durum" = 'KARANTINA')
--   AND NOT EXISTS (
--     SELECT 1 FROM "OfisDenemeKaydi" k
--     WHERE k."kaynak" = 'GECIS' AND k."telefonHash" IS NULL
--       AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar" = 'EPH70_DENEME_HASH:' || k."officeId" AND d."durum" = 'ATLANDI'))
-- ON CONFLICT ("key") DO UPDATE SET "valueJson" = 'true'::jsonb, "updatedAt" = now();
-- COMMIT;   -- INSERT 0 döndüyse bayrak YAZILMADI: nedeni yukarıdaki 6b/6c ve Node betiği çıktısından bulun.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- GERİ ALMA (commit sonrası; YENİ DENEME HENÜZ AÇILMAMIŞKEN — bayrak önce kapatılır). Yalnız bu betiğin açtığı GECIS kayıtlarını siler.
-- Sıra: bayrağı kapat → bu betiğin eklediği kayıtlar (defterde ESLENDI olan ofisler, kaynak='GECIS') silinir → defter satırları silinir.
-- 'YENI' kaynaklı kayıtlara (bayrak sonrası açılan gerçek yeni denemeler) DOKUNULMAZ: kaynak='GECIS' koşulu.
-- BEGIN;
-- UPDATE "SystemSetting" SET "valueJson" = 'false'::jsonb, "updatedAt" = now() WHERE "key" = 'EPH70_DENEME_GERIDOLDURMA_TAMAM';
-- DELETE FROM "OfisDenemeKaydi" k WHERE k."kaynak" = 'GECIS'
--   AND EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar" = 'EPH70_DENEME:' || k."ownerUserId" AND d."officeId" = k."officeId" AND d."durum" = 'ESLENDI');
-- DELETE FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\_DENEME:%' ESCAPE '\' OR "kaynakAnahtar" LIKE 'EPH70\_DENEME\_HASH:%' ESCAPE '\';
-- COMMIT;
