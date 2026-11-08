-- ODM-2R2: canlı tabloda kilitsiz indeks. TASLAK — ÇALIŞTIRILMAZ.
-- Ana migration (20261108120000_odm2_store_payments) uygulandıktan SONRA çalışır.
-- CONCURRENTLY transaction içinde çalışmaz; bu dosya bilerek TEK ifadedir (birden çok ifade Prisma'da implicit transaction'a düşer).
-- Başarısız olursa geçersiz (INVALID) indeks kalabilir: DROP INDEX CONCURRENTLY "PaymentOrder_ortam_idx" ile silip yeniden çalıştırın.
-- UYARI: Prisma'nın tek ifadeli CONCURRENTLY dosyasını çalıştırdığı ODM-10 hazırlık (staging) ortamında doğrulanmadı; doğrulanamazsa
-- aynı ifade psql ile elle (autocommit) çalıştırılıp `prisma migrate resolve --applied <klasör>` yapılır.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaymentOrder_ortam_idx" ON "PaymentOrder"("ortam");
