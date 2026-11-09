-- ODM-7G-D / F03: temel abonelikte kaynak zinciri tekilliği (OfisEklenti'deki UNIQUE ile aynı). CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
-- Not: kaynakKanal/kaynakAbonelikAnahtari NULL olan satırlar PostgreSQL'de çakışmaz. Uygulamadan önce çift kayıt kontrolü:
--   SELECT "kaynakKanal","kaynakAbonelikAnahtari",count(*) FROM "OfisAbonelik" WHERE "kaynakAbonelikAnahtari" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1;
-- Sonuç boş değilse INVALID indeks oluşur; önce çift kayıtlar mutabık hale getirilmeli.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "OfisAbonelik_kaynakKanal_kaynakAbonelikAnahtari_key" ON "OfisAbonelik"("kaynakKanal","kaynakAbonelikAnahtari");
