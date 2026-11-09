-- EPH-70B1 — SALT-OKUMA SQL (yalnız SELECT; 5 sorgu). Mustafa abi sunucuda çalıştırır: psql "$DATABASE_URL" -f scripts/eph70_okuma.sql
-- Kişisel veri (ad, telefon, e-posta) döndürmez; yalnız kod/adet/sayı.
BEGIN READ ONLY;

-- (a) OFFICE_MEMBERSHIP_PACKAGES katalogundaki paket kodları
SELECT e.item->>'code' AS "paketKodu", e.item->>'active' AS "aktif", e.ord AS "sira"
FROM "SystemSetting" s,
     LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s."valueJson"::jsonb) = 'array' THEN s."valueJson"::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS e(item, ord)
WHERE s.key = 'OFFICE_MEMBERSHIP_PACKAGES'
ORDER BY e.ord;

-- (b) OFFICE_SUBSCRIPTION_% kayıtlarında paket kodu × toplam adet × süresi dolmamış adet (expiresAt boş = süresiz = dolmamış)
SELECT COALESCE(NULLIF(upper(s."valueJson"->>'packageCode'), ''), '(KODSUZ)') AS "paketKodu",
       count(*) AS "adet",
       count(*) FILTER (WHERE s."valueJson"->>'expiresAt' IS NULL OR s."valueJson"->>'expiresAt' = ''
                          OR (s."valueJson"->>'expiresAt') > to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')) AS "suresiDolmamisAdet"
FROM "SystemSetting" s
WHERE s.key LIKE 'OFFICE\_SUBSCRIPTION\_%' ESCAPE '\'
GROUP BY 1
ORDER BY 2 DESC, 1;

-- (c) KullaniciUyelikPaketi: paket kodu × segment × durum adetleri
SELECT p."paketKodu"::text AS "paketKodu", p.segment::text AS "segment", k.durum::text AS "durum", count(*) AS "adet"
FROM "KullaniciUyelikPaketi" k
JOIN "UyelikPaketi" p ON p.id = k."paketId"
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- (d) Σ lot kalanı > bakiye olan cüzdan sayısı (aktif lotlar)
SELECT count(*) AS "tutarsizCuzdanSayisi",
       COALESCE(sum(t."lotToplam" - t.bakiye), 0) AS "toplamFazlaLotPk"
FROM (
  SELECT w.id, w.bakiye, COALESCE(sum(l."kalanMiktar"), 0) AS "lotToplam"
  FROM "KontorCuzdani" w
  JOIN "PortfolioCreditLot" l ON l."kullaniciId" = w."kullaniciId" AND l."aktifMi" = true AND l."kalanMiktar" > 0
  GROUP BY w.id, w.bakiye
) t
WHERE t."lotToplam" > t.bakiye;

-- (e) RELEASE-1: uygulamanın açılışta / "İletişime Geç" / talep / ödeme kataloğu için ZORUNLU okuduğu ayar anahtarları (yalnız VAR/YOK).
--     "ÖNCEDEN" satırlarında YOK görürsen DUR (uygulama o anahtar olmadan hata verir). "SONRADAN" satırları deploy öncesi YOK olabilir (eph70b2_ayarlar.sql üretir).
SELECT k.anahtar AS "anahtar", k.beklenti AS "beklenti", CASE WHEN s.key IS NULL THEN 'YOK' ELSE 'VAR' END AS "durum"
FROM (VALUES
  ('COST_OZEL_BILGI', 'ONCEDEN'), ('TALEP_GECERLILIK_GUN', 'ONCEDEN'), ('OFFICE_MEMBERSHIP_PACKAGES', 'ONCEDEN'),
  ('KARDES_OFIS_PAKETLER', 'ONCEDEN'), ('EPH_PAYMENT_SETTINGS_V1', 'ONCEDEN'),
  ('OFFICE_ADDON_CONFIG', 'SONRADAN'), ('OFFICE_TRIAL_CONFIG', 'SONRADAN'), ('OFFICE_FREE_LIMITS', 'SONRADAN'), ('OFFICE_ENTITLEMENT_SOURCE', 'SONRADAN')
) AS k(anahtar, beklenti)
LEFT JOIN "SystemSetting" s ON s.key = k.anahtar
ORDER BY 2, 1;

ROLLBACK;
