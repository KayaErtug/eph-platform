-- EPH-70B2 (c): sipariş hedef ofis erişimi. CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaymentOrder_hedefOfficeId_idx" ON "PaymentOrder"("hedefOfficeId");
