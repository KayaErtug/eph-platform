-- EPH-70B2 (c): FK erişim indeksi. CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OfisEklenti_ofisAboneligiId_idx" ON "OfisEklenti"("ofisAboneligiId");
