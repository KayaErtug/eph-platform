-- EPH-70B2 (c): FK erişim indeksi. CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OfisAbonelik_officeId_idx" ON "OfisAbonelik"("officeId");
