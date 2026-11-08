-- EPH-70B2 (c): FK erişim indeksi. CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OfisHakDonemi_officeId_kaynakId_idx" ON "OfisHakDonemi"("officeId","kaynakId");
