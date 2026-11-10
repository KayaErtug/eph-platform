-- ODM-8G / 2026-11-10. AJAN CALISTIRMAZ. Yalniz SELECT + transaction sinirlari.
-- PostgreSQL / Prisma DateTime: relational tarihler UTC timestamp olarak karsilastirilir.
-- Bozuk takvim tarihi cast hatasi verirse transaction sonlandirilir; veri degismez.
-- UYUMLU yalniz paket/bitis/durum eslesmesidir; limit/PK/kanal onayi DEGILDIR.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT "key", "valueJson"
FROM "SystemSetting"
WHERE "key" IN ('OFFICE_ENTITLEMENT_SOURCE', 'EPH70_DENEME_GERIDOLDURMA_TAMAM',
                'EPH70_LOT_UZLASTIRMA_TAMAM', 'EPH70_YENI_DENEME_BASLANGICI')
ORDER BY "key";

WITH bildirilen(office_id, paket, bitis_gunu) AS (
  VALUES
    ('4bc5e5e4-8ddb-4f2f-95c2-5e594bf5c9cc', 'ALTIN', DATE '2026-11-30'),
    ('a9d50719-6f67-480d-9737-b7556ece78f3', 'ALTIN', DATE '2026-11-29'),
    ('d2947e46-f258-472b-814e-a3de4d3354d2', 'ALTIN', DATE '2027-11-02'),
    ('e7c27055-2e0a-4f9c-9705-3341f2eee537', 'ALTIN', DATE '2026-11-30'),
    ('f3d8e69c-1c80-4e5c-a456-eba208042c82', 'PLATINUM', DATE '2026-12-02'),
    ('fe722563-e3d3-47af-9ac2-983c0733256e', 'ALTIN', DATE '2027-11-02')
), legacy AS (
  SELECT substring("key" FROM length('OFFICE_SUBSCRIPTION_') + 1) AS office_id,
         "valueJson"::jsonb AS j
  FROM "SystemSetting"
  WHERE left("key", length('OFFICE_SUBSCRIPTION_')) = 'OFFICE_SUBSCRIPTION_'
), tarihler AS (
  SELECT l.*, j->>'expiresAt' AS bitis_ham,
    CASE WHEN j->>'expiresAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}($|T| )'
      THEN ((CASE WHEN j->>'expiresAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                   THEN (j->>'expiresAt') || 'T00:00:00Z'
                   WHEN j->>'expiresAt' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
                   THEN j->>'expiresAt' ELSE (j->>'expiresAt') || 'Z' END)::timestamptz
            AT TIME ZONE 'UTC') END AS bitis_utc
  FROM legacy l
), ofisler AS (
  SELECT office_id FROM bildirilen
  UNION SELECT office_id FROM legacy
  UNION SELECT "officeId" FROM "OfisAbonelik"
), karsilastirma AS (
  SELECT ids.office_id, o.id IS NOT NULL AS ofis_var, o."isActive" AS ofis_aktif,
    b.paket AS bildirilen_paket, b.bitis_gunu AS bildirilen_bitis_gunu,
    l.office_id IS NOT NULL AS legacy_var,
    l.j->>'packageCode' AS legacy_paket, l.bitis_ham AS legacy_bitis_ham,
    l.bitis_utc AS legacy_bitis_utc, l.j->>'derived' AS legacy_turetilmis,
    (NULLIF(btrim(l.j->>'packageCode'), '') IS NOT NULL
      AND (l.j->'active') IS DISTINCT FROM 'false'::jsonb
      AND (l.j->'ended') IS DISTINCT FROM 'true'::jsonb
      AND (l.bitis_ham IS NULL OR l.bitis_utc > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))) AS legacy_canli,
    s.id AS relational_id, s."paketKodu" AS relational_paket,
    s.durum AS relational_durum, s."sureTuru" AS relational_sure_turu,
    s."baslangicTarihi" AS relational_baslangic_utc,
    s."bitisTarihi" AS relational_bitis_utc, s."kaynakKanal" AS relational_kanal,
    s."hakSnapshot", s."snapshotBitis",
    (s.id IS NOT NULL AND s."baslangicTarihi" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      AND (s."sureTuru" = 'SURESIZ_OZEL' OR s."bitisTarihi" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))) AS relational_canli,
    (SELECT count(*) FROM "OfisAbonelik" a
      WHERE a."officeId" = ids.office_id AND a.durum IN ('AKTIF', 'GRACE')) AS secilebilir_abonelik_adedi,
    jsonb_build_object('agents', l.j->'agents', 'portfolioCapacity', l.j->'portfolioCapacity',
      'crmCapacity', l.j->'crmCapacity', 'monthlyPk', l.j->'monthlyPk',
      'ofisBoy', l.j->'ofisBoy', 'ekKullanici', l.j->'ekKullanici') AS legacy_hak_alanlari,
    (SELECT count(*) FROM "OfisEklenti" e WHERE e."officeId" = ids.office_id
      AND e.durum IN ('AKTIF', 'GRACE') AND e."bitisTarihi" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) AS canli_eklenti_adedi
  FROM ofisler ids
  LEFT JOIN "Office" o ON o.id = ids.office_id
  LEFT JOIN bildirilen b ON b.office_id = ids.office_id
  LEFT JOIN tarihler l ON l.office_id = ids.office_id
  -- Resolver ile ayni: AKTIF/GRACE, bitis DESC (PostgreSQL varsayilani NULLS FIRST).
  LEFT JOIN LATERAL (
    SELECT a.* FROM "OfisAbonelik" a
    WHERE a."officeId" = ids.office_id AND a.durum IN ('AKTIF', 'GRACE')
    ORDER BY a."bitisTarihi" DESC LIMIT 1
  ) s ON true
)
SELECT *,
  CASE WHEN ofis_var AND legacy_var AND relational_id IS NOT NULL
      AND secilebilir_abonelik_adedi = 1
      AND upper(btrim(legacy_paket)) = upper(relational_paket)
      AND legacy_canli AND relational_canli
      AND ((legacy_bitis_ham IS NULL AND relational_sure_turu = 'SURESIZ_OZEL')
        OR (legacy_bitis_utc IS NOT NULL AND relational_sure_turu = 'DONEMLI'
            AND legacy_bitis_utc = relational_bitis_utc))
    THEN 'UYUMLU' ELSE 'UYUMSUZ' END AS sonuc,
  CASE WHEN NOT ofis_var THEN 'OFIS_YOK'
       WHEN NOT legacy_var THEN 'LEGACY_YOK'
       WHEN relational_id IS NULL THEN 'RELATIONAL_KARSILIK_YOK'
       WHEN secilebilir_abonelik_adedi <> 1 THEN 'BIRDEN_COK_SECILEBILIR_ABONELIK'
       WHEN legacy_bitis_ham IS NOT NULL AND legacy_bitis_utc IS NULL THEN 'LEGACY_TARIH_BICIMI_BOZUK'
       WHEN NOT legacy_canli OR NOT relational_canli THEN 'CANLI_HAK_ESLESMIYOR'
       WHEN upper(btrim(legacy_paket)) IS DISTINCT FROM upper(relational_paket) THEN 'PAKET_FARKLI'
       WHEN NOT ((legacy_bitis_ham IS NULL AND relational_sure_turu = 'SURESIZ_OZEL')
         OR (legacy_bitis_utc IS NOT NULL AND relational_sure_turu = 'DONEMLI'
             AND legacy_bitis_utc = relational_bitis_utc)) THEN 'BITIS_VEYA_SURE_TURU_FARKLI'
       ELSE 'PAKET_BITIS_ESLESTI; HAKLAR_AYRICA_ONAYLANMALI' END AS aciklama
FROM karsilastirma ORDER BY office_id;

-- Aktif relational paketi olup HIC legacy anahtari olmayan benzersiz ofis sayisi.
SELECT count(DISTINCT a."officeId") AS relational_aktif_legacy_kaydi_olmayan_ofis_sayisi
FROM "OfisAbonelik" a
WHERE a.durum IN ('AKTIF', 'GRACE')
  AND a."baslangicTarihi" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  AND (a."sureTuru" = 'SURESIZ_OZEL' OR a."bitisTarihi" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
  AND NOT EXISTS (SELECT 1 FROM "SystemSetting" s
                  WHERE s."key" = 'OFFICE_SUBSCRIPTION_' || a."officeId");

-- Limit karsilastirmasi icin ticari ayarlar; sir/kimlik bilgisi secilmez.
SELECT "key", "valueJson" FROM "SystemSetting"
WHERE "key" IN ('OFFICE_MEMBERSHIP_PACKAGES', 'OFFICE_ADDON_CONFIG', 'OFFICE_TRIAL_CONFIG', 'OFFICE_FREE_LIMITS')
ORDER BY "key";

-- 18c/e envanteri: kimlik/telefon/hash cikarmadan aktif eski kisisel uyelikler.
SELECT
  count(*) FILTER (WHERE u.role = 'EMLAKCI' AND u."officeId" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "Office" o WHERE o."ownerUserId" = u.id AND o."isActive")) AS ofissiz_ucretli_emlakci_uyelik_adedi,
  count(*) FILTER (WHERE u.role = 'EMLAKCI' AND u."officeId" IS NOT NULL
    AND EXISTS (SELECT 1 FROM "Office" o WHERE o.id = u."officeId"
                AND o."ownerUserId" IS DISTINCT FROM u.id)) AS danisman_eski_ucretli_uyelik_adedi
FROM "KullaniciUyelikPaketi" k JOIN "User" u ON u.id = k."kullaniciId"
JOIN "UyelikPaketi" p ON p.id = k."paketId"
WHERE k.durum = 'AKTIF' AND k."baslangicTarihi" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  AND (k."bitisTarihi" IS NULL OR k."bitisTarihi" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
  AND p."paketKodu"::text NOT IN ('DENEME', 'UCRETSIZ');

SELECT "durum", count(*) AS gecis_defteri_adedi
FROM "OfisGecisDefteri" GROUP BY "durum" ORDER BY "durum";

-- ODM-8H: raporun alti HEDEF ofisini ayri sayar; yeni SOLO/Ucretsiz ofisler
-- yukaridaki genel envanterde ayrica gorunur, bu 6-ofis kabul sayisini bozmaz.
WITH hedef(oid) AS (VALUES
 ('4bc5e5e4-8ddb-4f2f-95c2-5e594bf5c9cc'),('a9d50719-6f67-480d-9737-b7556ece78f3'),
 ('d2947e46-f258-472b-814e-a3de4d3354d2'),('e7c27055-2e0a-4f9c-9705-3341f2eee537'),
 ('f3d8e69c-1c80-4e5c-a456-eba208042c82'),('fe722563-e3d3-47af-9ac2-983c0733256e')),
uyum AS (
 SELECT h.oid FROM hedef h JOIN "Office" o ON o.id=h.oid AND o."isActive"
 JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||h.oid
 JOIN "OfisAbonelik" a ON a."officeId"=h.oid AND a.durum IN ('AKTIF','GRACE')
 WHERE a."paketKodu"=s."valueJson"->>'packageCode' AND a."sureTuru"='DONEMLI'
 AND a."bitisTarihi"=((s."valueJson"->>'expiresAt')::timestamptz AT TIME ZONE 'UTC')
 AND a."baslangicTarihi"<=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AND a."bitisTarihi">CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
 AND s."valueJson"->>'active' IS DISTINCT FROM 'false' AND s."valueJson"->>'ended' IS DISTINCT FROM 'true'
 AND (SELECT count(*) FROM "OfisAbonelik" x WHERE x."officeId"=h.oid AND x.durum IN ('AKTIF','GRACE'))=1)
SELECT count(*) AS odm8h_hedef_uyumlu, 6-count(*) AS odm8h_hedef_uyumsuz FROM uyum;

COMMIT;
