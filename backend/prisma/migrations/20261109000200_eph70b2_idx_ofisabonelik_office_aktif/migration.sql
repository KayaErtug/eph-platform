-- EPH-70B2 (c): tek aktif ofis aboneliği (F08; upsert hedefi). CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "OfisAbonelik_office_aktif_uq" ON "OfisAbonelik"("officeId") WHERE "durum" IN ('AKTIF','GRACE');
