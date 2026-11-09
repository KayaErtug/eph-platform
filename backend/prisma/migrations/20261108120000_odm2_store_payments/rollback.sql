-- ODM-2 GERİ ALMA — TASLAK, ÇALIŞTIRILMAZ. migration.sql'in (ve 20261108120100..120130 indeks klasörlerinin) tersi.
--
-- PROSEDÜR A — migration BAŞARIYLA uygulanmış (yedek alındıktan ve onaydan sonra):
--   1) psql -v ON_ERROR_STOP=1 -f rollback.sql   (tek transaction; mağaza verisi varsa kendiliğinden durur)
--      Bu dosya sonunda "_prisma_migrations" kayıtlarını da siler (5 migration: ana + 4 indeks klasörü).
--   2) `prisma migrate resolve --rolled-back` BURADA KULLANILMAZ: yalnız BAŞARISIZ (failed) işaretli migration için geçerlidir.
--      Başarılı migration'ın kaydı yukarıdaki DELETE ile temizlenir; klasörler repoda duruyorsa bir sonraki `migrate deploy` onları yeniden uygular
--      (istenmiyorsa klasörleri koddan da kaldırın/revert edin).
-- PROSEDÜR B — migration YARIM KALDI / failed işaretli (ayrı adım):
--   1) `_prisma_migrations` içinde finished_at IS NULL kaydı ve hangi nesnelerin oluştuğunu kontrol edin (ana dosya tek transaction'dır, çoğu hata tümüyle geri döner).
--   2) Kalan nesne varsa bu dosyanın IF EXISTS'li ifadelerini çalıştırın (A'nın 1. adımı güvenlidir); mağaza verisi yoktur.
--   3) Sonra `prisma migrate resolve --rolled-back <migration_adı>` ile failed kaydı kapatın, düzeltip yeniden `migrate deploy`.
--   (CONCURRENTLY indeks klasörü yarım kalırsa INVALID indeks kalır: DROP INDEX CONCURRENTLY IF EXISTS ... ile silin, sonra B-3.)
BEGIN;

-- KORUMA: mağaza kaynaklı veri varsa geri alma durur (veri kaybını önlemek için).
-- Bilerek silmek isteniyorsa önce bu bloğu yorum satırı yapın ve yedeği doğrulayın.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "PaymentOrder" WHERE "kanal" IN ('APPLE', 'GOOGLE');
  IF n > 0 THEN RAISE EXCEPTION 'Geri alma durduruldu: % mağaza siparişi var.', n; END IF;
  SELECT count(*) INTO n FROM "StoreEntitlementGrant";
  IF n > 0 THEN RAISE EXCEPTION 'Geri alma durduruldu: % mağaza hak verme anahtarı var.', n; END IF;
  SELECT count(*) INTO n FROM "StoreSubscription";
  IF n > 0 THEN RAISE EXCEPTION 'Geri alma durduruldu: % mağaza aboneliği kaydı var.', n; END IF;
END $$;

-- Tablolar (kısıtlar ve indeksler tabloyla birlikte düşer)
DROP TABLE IF EXISTS "StoreEntitlementGrant";
DROP TABLE IF EXISTS "StoreSubscription";
DROP TABLE IF EXISTS "StoreProduct";

-- PaymentTransaction tekillik indeksi
DROP INDEX IF EXISTS "PaymentTransaction_providerId_providerTransactionId_islemTu_key";

-- PaymentOrder
DROP INDEX IF EXISTS "PaymentOrder_kanal_idx";
DROP INDEX IF EXISTS "PaymentOrder_ortam_idx";
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "kanal", DROP COLUMN IF EXISTS "ortam";

-- KullaniciUyelikPaketi
ALTER TABLE "KullaniciUyelikPaketi" DROP COLUMN IF EXISTS "kaynakKanal", DROP COLUMN IF EXISTS "otomatikYenileme";

-- User
DROP INDEX IF EXISTS "User_storeAccountToken_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "storeAccountToken";

-- Enumlar (sütunlar düştükten sonra)
DROP TYPE IF EXISTS "StoreSubscriptionStatus";
DROP TYPE IF EXISTS "StoreProductSegment";
DROP TYPE IF EXISTS "StoreProductKind";
DROP TYPE IF EXISTS "StorePlatform";
DROP TYPE IF EXISTS "PaymentEnvironment";
DROP TYPE IF EXISTS "PaymentChannel";

-- Migration kayıtlarını temizle (yalnız Prosedür A; kayıt yoksa 0 satır etkilenir)
DELETE FROM "_prisma_migrations" WHERE "migration_name" IN (
  '20261108120000_odm2_store_payments',
  '20261108120100_odm2_idx_paymentorder_kanal',
  '20261108120110_odm2_idx_paymentorder_ortam',
  '20261108120120_odm2_idx_user_storeaccounttoken',
  '20261108120130_odm2_idx_paymenttransaction_providerid'
);

COMMIT;
