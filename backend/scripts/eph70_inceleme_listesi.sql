-- PROVA-2 — EPH-70 INCELEME CÜZDANLARI LİSTESİ (YALNIZ SELECT; BEGIN READ ONLY ... ROLLBACK). AJAN ÇALIŞTIRMAZ.
-- Mustafa abi sunucuda çalıştırır: psql "$DATABASE_URL" -f scripts/eph70_inceleme_listesi.sql
-- Kişisel veri YOK: ad/telefon/e-posta döndürülmez; kullanıcı/cüzdan kimliği yalnız ilk 8 karakter.
-- Kapsam: eph70_lot_uzlastirma.sql'in "INCELEME" kararı verecek cüzdanları (aynı ölçüt, defter tablosuna ihtiyaç DUYMAZ —
-- uzlaştırma henüz COMMIT edilmemişse de çalışır). Ölçüt: (a) lotu olup cüzdanı olmayan kullanıcı, veya (b) aktif lotu olan ve
-- lot dışı yükleme geçmişi (HEDIYE / OFFICE_PK_TRANSFER / ADMIN_BAKIYE_DUZELTME / Ofis Deneme Paketi / Paketi Satın Alma / yönetici bakiye güncellemesi) olan cüzdan.
BEGIN READ ONLY;

-- (1) ÖZET: cüzdan başına tek satır
WITH lotlu AS (
  SELECT l."kullaniciId", sum(l."kalanMiktar")::integer AS lot_toplam, count(*) AS lot_adedi,
         count(*) FILTER (WHERE l."sonKullanmaTarihi" IS NULL) AS suresiz_lot_adedi
  FROM "PortfolioCreditLot" l WHERE l."aktifMi" AND l."kalanMiktar" > 0 GROUP BY l."kullaniciId"
), hareket AS (
  SELECT h."kullaniciId",
         CASE WHEN h."hareketTuru"::text = 'HEDIYE' THEN 'HEDIYE'
              WHEN h."ilgiliKayitTuru" = 'OFFICE_PK_TRANSFER' THEN 'OFIS_DAGITIMI'
              WHEN h."ilgiliKayitTuru" = 'ADMIN_BAKIYE_DUZELTME' OR h."aciklama" LIKE 'Yönetici panelinden bakiye güncellendi%' THEN 'ADMIN_BAKIYE_DUZELTME'
              WHEN h."aciklama" LIKE 'Ofis Deneme Paketi%' THEN 'OFIS_DENEME_YUKLEME'
              WHEN h."aciklama" LIKE '%Paketi Satın Alma:%' THEN 'PAKET_SATIN_ALMA_YUKLEME' END AS tur,
         h."miktar", h."olusturulmaTarihi"
  FROM "KontorHareketi" h
  WHERE h."hareketTuru"::text = 'HEDIYE' OR h."ilgiliKayitTuru" IN ('OFFICE_PK_TRANSFER', 'ADMIN_BAKIYE_DUZELTME')
     OR h."aciklama" LIKE 'Ofis Deneme Paketi%' OR h."aciklama" LIKE '%Paketi Satın Alma:%' OR h."aciklama" LIKE 'Yönetici panelinden bakiye güncellendi%'
), hareket_ozet AS (
  SELECT "kullaniciId", string_agg(tur || '=' || toplam || ' (' || adet || ' işlem)', '; ' ORDER BY tur) AS lot_disi_yuklemeler, sum(toplam)::integer AS lot_disi_toplam
  FROM (SELECT "kullaniciId", tur, sum("miktar") AS toplam, count(*) AS adet FROM hareket GROUP BY 1, 2) x GROUP BY "kullaniciId"
), son AS (
  SELECT "kullaniciId", max("olusturulmaTarihi") AS son_hareket FROM "KontorHareketi" GROUP BY "kullaniciId"
)
SELECT left(u."kullaniciId", 8) AS "cuzdanKisa",
       CASE WHEN w.id IS NULL THEN 'A_CUZDANSIZ_LOT'
            WHEN lo.lot_toplam > GREATEST(w.bakiye, 0) THEN 'C_LOT_BAKIYEDEN_FAZLA'
            WHEN lo.lot_toplam < GREATEST(w.bakiye, 0) THEN 'B_LOT_BAKIYEDEN_AZ'
            ELSE 'B2_LOT_BAKIYEYE_ESIT' END AS "tur",
       COALESCE(w.bakiye, 0) AS "bakiye",
       COALESCE(lo.lot_toplam, 0) AS "lotKalanToplami",
       COALESCE(lo.lot_toplam, 0) - GREATEST(COALESCE(w.bakiye, 0), 0) AS "fark_lotMinusBakiye",
       COALESCE(lo.lot_adedi, 0) AS "aktifLotAdedi", COALESCE(lo.suresiz_lot_adedi, 0) AS "suresizLotAdedi",
       COALESCE(ho.lot_disi_yuklemeler, '(yok)') AS "lotDisiYuklemeTurleri",
       COALESCE(ho.lot_disi_toplam, 0) AS "lotDisiYuklemeToplami",
       to_char(s.son_hareket, 'YYYY-MM-DD') AS "sonHareketTarihi"
FROM (SELECT "kullaniciId" FROM "KontorCuzdani" UNION SELECT "kullaniciId" FROM lotlu) u
LEFT JOIN "KontorCuzdani" w ON w."kullaniciId" = u."kullaniciId"
LEFT JOIN lotlu lo ON lo."kullaniciId" = u."kullaniciId"
LEFT JOIN hareket_ozet ho ON ho."kullaniciId" = u."kullaniciId"
LEFT JOIN son s ON s."kullaniciId" = u."kullaniciId"
WHERE lo.lot_toplam > 0
  AND (w.id IS NULL OR ho."kullaniciId" IS NOT NULL)
ORDER BY 2, 1;

-- (2) TÜR BAŞINA SAYI (uzlaştırma çıktısındaki bekleyenIncelemeCuzdani ile eşleşmeli)
WITH lotlu AS (
  SELECT l."kullaniciId", sum(l."kalanMiktar")::integer AS lot_toplam FROM "PortfolioCreditLot" l WHERE l."aktifMi" AND l."kalanMiktar" > 0 GROUP BY 1
), lot_disi AS (
  SELECT DISTINCT h."kullaniciId" FROM "KontorHareketi" h
  WHERE h."hareketTuru"::text = 'HEDIYE' OR h."ilgiliKayitTuru" IN ('OFFICE_PK_TRANSFER', 'ADMIN_BAKIYE_DUZELTME')
     OR h."aciklama" LIKE 'Ofis Deneme Paketi%' OR h."aciklama" LIKE '%Paketi Satın Alma:%' OR h."aciklama" LIKE 'Yönetici panelinden bakiye güncellendi%'
)
SELECT CASE WHEN w.id IS NULL THEN 'A_CUZDANSIZ_LOT'
            WHEN lo.lot_toplam > GREATEST(w.bakiye, 0) THEN 'C_LOT_BAKIYEDEN_FAZLA'
            WHEN lo.lot_toplam < GREATEST(w.bakiye, 0) THEN 'B_LOT_BAKIYEDEN_AZ' ELSE 'B2_LOT_BAKIYEYE_ESIT' END AS "tur",
       count(*) AS "cuzdan"
FROM lotlu lo
LEFT JOIN "KontorCuzdani" w ON w."kullaniciId" = lo."kullaniciId"
LEFT JOIN lot_disi d ON d."kullaniciId" = lo."kullaniciId"
WHERE lo.lot_toplam > 0 AND (w.id IS NULL OR d."kullaniciId" IS NOT NULL)
GROUP BY 1 ORDER BY 1;

ROLLBACK;
