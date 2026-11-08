-- EPH-69: Portfoy ozelliklerinde 's' harfi kaybi (units.service.ts: .replace(/s+/g,' ') -> .replace(/\s+/g,' ')) onarimi. CALISTIRILMADI.
-- Bozuk kayit bicimi: 'grup:Etiket' icinde her 's' harfi (ardisik s'ler tek) bosluga cevrilip kenarlar kirpilmis.
-- Esleme kanonik listeden uretildi: SM/frontend/src/components/stok/stokFeatureGroups.ts ve eph-mobile-final/src/portfolio/portfolioFeatures.ts
--   (iki liste ayni; 'sadece s -> bosluk' bozulmasi iki farkli kanonik degere veya gercek bir degere cakisan hicbir giris yok).
-- Kapsam: yalniz "Unit".features; eslesmeyen/kesin olmayan degerlere dokunulmaz. Tire->bosluk (ornek 'Ilkokul-Ortaokul') ayri konudur, burada YOK.
-- Geri alma: eph69_unit_features_yedek tablosundan (dosya sonundaki yorum satirlari).
-- Calistirma: psql -f scripts/eph69_features_onarim.sql  (tek transaction)

BEGIN;

CREATE TEMP TABLE eph69_esleme (bozuk text PRIMARY KEY, dogru text NOT NULL) ON COMMIT DROP;
INSERT INTO eph69_esleme (bozuk, dogru) VALUES
  ('interior:Alarm (Hır ız)', 'interior:Alarm (Hırsız)'),
  ('interior:Anka tre Fırın', 'interior:Ankastre Fırın'),
  ('interior:Bulaşık Makine i', 'interior:Bulaşık Makinesi'),
  ('interior:Çamaşır Kurutma Makine i', 'interior:Çamaşır Kurutma Makinesi'),
  ('interior:Çamaşır Makine i', 'interior:Çamaşır Makinesi'),
  ('interior:Çamaşır Oda ı', 'interior:Çamaşır Odası'),
  ('interior:Ebeveyn Banyo u', 'interior:Ebeveyn Banyosu'),
  ('interior:Intercom Si temi', 'interior:Intercom Sistemi'),
  ('interior:I ıcam', 'interior:Isıcam'),
  ('interior:Mutfak (Anka tre)', 'interior:Mutfak (Ankastre)'),
  ('interior:Set Ü tü Ocak', 'interior:Set Üstü Ocak'),
  ('interior:Tera', 'interior:Teras'),
  ('interior:Termo ifon', 'interior:Termosifon'),
  ('interior:Ve tiyer', 'interior:Vestiyer'),
  ('exterior:Araç Şarj İ ta yonu', 'exterior:Araç Şarj İstasyonu'),
  ('exterior:Apartman Görevli i', 'exterior:Apartman Görevlisi'),
  ('exterior:Buhar Oda ı', 'exterior:Buhar Odası'),
  ('exterior:I ı Yalıtımı', 'exterior:Isı Yalıtımı'),
  ('exterior:Kamera Si temi', 'exterior:Kamera Sistemi'),
  ('exterior:Mü takil Havuzlu', 'exterior:Müstakil Havuzlu'),
  ('exterior:Se Yalıtımı', 'exterior:Ses Yalıtımı'),
  ('exterior:Su Depo u', 'exterior:Su Deposu'),
  ('exterior:Teni Kortu', 'exterior:Tenis Kortu'),
  ('location:Ha tane', 'location:Hastane'),
  ('location:Kili e', 'location:Kilise'),
  ('location:Li e', 'location:Lise'),
  ('location:Poli Merkezi', 'location:Polis Merkezi'),
  ('location:Üniver ite', 'location:Üniversite'),
  ('transport:Avra ya Tüneli', 'transport:Avrasya Tüneli'),
  ('transport:Deniz Otobü ü', 'transport:Deniz Otobüsü'),
  ('transport:İ kele', 'transport:İskele'),
  ('transport:Metrobü', 'transport:Metrobüs'),
  ('transport:Minibü', 'transport:Minibüs'),
  ('transport:Otobü Durağı', 'transport:Otobüs Durağı'),
  ('transport:Tren İ ta yonu', 'transport:Tren İstasyonu'),
  ('transport:A falt Yol', 'transport:Asfalt Yol'),
  ('front:Köşe Par el', 'front:Köşe Parsel'),
  ('view:Golf Saha ı', 'view:Golf Sahası'),
  ('accessibility:Engelliye Uygun A an ör', 'accessibility:Engelliye Uygun Asansör'),
  ('accessibility:Oda Kapı ı', 'accessibility:Oda Kapısı'),
  ('zoning:Mü takil Tapu', 'zoning:Müstakil Tapu'),
  ('zoning:Hi eli Tapu', 'zoning:Hisseli Tapu'),
  ('zoning:İmar ız', 'zoning:İmarsız'),
  ('landInfrastructure:Kada tral Yolu Var', 'landInfrastructure:Kadastral Yolu Var'),
  ('commercial:Tabela Değeri Yük ek', 'commercial:Tabela Değeri Yüksek'),
  ('tourism:Re toran', 'tourism:Restoran'),
  ('tourism:Ruh atlı', 'tourism:Ruhsatlı'),
  ('luxury:Özel İ kele', 'luxury:Özel İskele'),
  ('luxury:Marina Bağlantı ı', 'luxury:Marina Bağlantısı'),
  ('luxury:Golf Saha ına Yakın', 'luxury:Golf Sahasına Yakın'),
  ('luxury:Akıllı Ev Si temi', 'luxury:Akıllı Ev Sistemi'),
  ('luxury:Yerden I ıtma', 'luxury:Yerden Isıtma'),
  ('luxury:Sinema Oda ı', 'luxury:Sinema Odası'),
  ('luxury:Hizmetli Oda ı', 'luxury:Hizmetli Odası');

-- 1) ONCE: etkilenecek kayit sayisi (salt okunur)
SELECT count(DISTINCT u.id) AS etkilenecek_kayit
FROM "Unit" u
WHERE EXISTS (SELECT 1 FROM unnest(u.features) f JOIN eph69_esleme e ON e.bozuk = f);

SELECT e.bozuk, e.dogru, count(DISTINCT u.id) AS kayit
FROM "Unit" u, unnest(u.features) f
JOIN eph69_esleme e ON e.bozuk = f
GROUP BY 1, 2 ORDER BY 3 DESC, 1;

-- 2) Yedek (tekrar calistirmada ilk yedegi ezmez)
CREATE TABLE IF NOT EXISTS eph69_unit_features_yedek (
  "unitId" text PRIMARY KEY,
  "featuresEski" text[] NOT NULL,
  "yedeklendi" timestamptz NOT NULL DEFAULT now()
);
INSERT INTO eph69_unit_features_yedek ("unitId", "featuresEski")
SELECT u.id, u.features
FROM "Unit" u
WHERE EXISTS (SELECT 1 FROM unnest(u.features) f JOIN eph69_esleme e ON e.bozuk = f)
ON CONFLICT ("unitId") DO NOTHING;

-- 3) Onarim: sira korunur, dogru hali zaten listede varsa tekrar eklenmez
UPDATE "Unit" u
SET features = sub.yeni
FROM (
  SELECT x.id,
         array_agg(x.deger ORDER BY x.ilk) AS yeni
  FROM (
    SELECT u2.id, COALESCE(e.dogru, t.f) AS deger, min(t.ord) AS ilk
    FROM "Unit" u2
    CROSS JOIN LATERAL unnest(u2.features) WITH ORDINALITY AS t(f, ord)
    LEFT JOIN eph69_esleme e ON e.bozuk = t.f
    WHERE EXISTS (SELECT 1 FROM unnest(u2.features) f2 JOIN eph69_esleme e2 ON e2.bozuk = f2)
    GROUP BY u2.id, COALESCE(e.dogru, t.f)
  ) x
  GROUP BY x.id
) sub
WHERE u.id = sub.id;

-- 4) Kontrol: kalan bozuk deger sayisi 0 olmali
SELECT count(*) AS kalan_bozuk
FROM "Unit" u, unnest(u.features) f
JOIN eph69_esleme e ON e.bozuk = f;

COMMIT;

-- GERI ALMA (elle, gerekirse):
-- BEGIN;
-- UPDATE "Unit" u SET features = y."featuresEski" FROM eph69_unit_features_yedek y WHERE y."unitId" = u.id;
-- COMMIT;
-- (Sorun yoksa yedek tablo korunur; silmek icin: DROP TABLE eph69_unit_features_yedek;)
