-- ODM-2R: Mağaza ödemeleri (App Store / Google Play) şema değişikliği — paket modeli EPH_ODEME_SISTEMI.md §12-§13 (r4).
-- TASLAK — ÇALIŞTIRILMAZ. Onay sonrası ODM-10 runbook'unda uygulanır.
-- Geri alma: rollback.sql (aynı klasör; prosedür dosyanın başında).
-- ODM-2R2: CANLI tablolardaki (PaymentOrder, PaymentTransaction, User) indeksler bu dosyada YOK; kilit almamaları için
-- CREATE INDEX CONCURRENTLY ile ayrı migration klasörlerinde (20261108120100..120130_*) tek ifadelik dosyalardır; bu dosyadan SONRA uygulanır.
-- Kolon ekleme (ADD COLUMN) kısa süreli ACCESS EXCLUSIVE kilit alır: bakım penceresinde veya düşük trafikte çalıştırın; lock_timeout aşağıda.
SET lock_timeout = '5s';
-- Ön koşul: PostgreSQL 13+ (backfill'de yalnız standart SQL kullanılır; gen_random_uuid yalnız scripts/odm2_store_products.sql'de).

-- ÖN KONTROL: PaymentTransaction tekillik indeksi mevcut kayıtlarda çakışma varsa migration'ı durdurur (veri değiştirmez).
DO $$
DECLARE dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT 1 FROM "PaymentTransaction"
    WHERE "providerTransactionId" IS NOT NULL
    GROUP BY "providerId", "providerTransactionId", "islemTuru"
    HAVING count(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'ODM-2 durduruldu: PaymentTransaction (providerId, providerTransactionId, islemTuru) tekrarlayan % grup var. Önce incelenmeli.', dup_count;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('IYZICO', 'APPLE', 'GOOGLE', 'ADMIN', 'DENEME');

-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('LIVE', 'TEST');

-- CreateEnum
CREATE TYPE "StorePlatform" AS ENUM ('APPLE', 'GOOGLE');

-- CreateEnum
CREATE TYPE "StoreProductKind" AS ENUM ('UYELIK', 'EK_KULLANICI', 'OFIS_BOY', 'PK');

-- CreateEnum
CREATE TYPE "StoreProductSegment" AS ENUM ('OFFICE', 'MUTEAHHIT');

-- CreateEnum
CREATE TYPE "StoreSubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE', 'BILLING_RETRY', 'ON_HOLD', 'EXPIRED', 'CANCELED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "storeAccountToken" TEXT;

-- AlterTable
ALTER TABLE "KullaniciUyelikPaketi" ADD COLUMN     "kaynakKanal" "PaymentChannel",
ADD COLUMN     "otomatikYenileme" BOOLEAN;

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "kanal" "PaymentChannel" NOT NULL DEFAULT 'IYZICO',
ADD COLUMN     "ortam" "PaymentEnvironment" NOT NULL DEFAULT 'LIVE';

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "urunTuru" "StoreProductKind" NOT NULL,
    "segment" "StoreProductSegment",
    "paketKodu" TEXT,
    "uyelikPaketiId" TEXT,
    "kisiSayisi" INTEGER,
    "pkUrunKodu" TEXT,
    "urunAnahtari" TEXT NOT NULL,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "magazaUrunKimligi" TEXT NOT NULL,
    "googleBasePlanKimligi" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSubscription" (
    "id" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "abonelikKimligi" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "uyelikId" TEXT,
    "magazaUrunKimligi" TEXT NOT NULL,
    "durum" "StoreSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "otomatikYenileme" BOOLEAN NOT NULL DEFAULT true,
    "bitisTarihi" TIMESTAMP(3),
    "graceBitis" TIMESTAMP(3),
    "sonBildirimAt" TIMESTAMP(3),
    "ortam" "PaymentEnvironment" NOT NULL DEFAULT 'LIVE',
    "oncekiAbonelikKimligi" TEXT,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreProduct_urunTuru_idx" ON "StoreProduct"("urunTuru");

-- CreateIndex
CREATE INDEX "StoreProduct_uyelikPaketiId_idx" ON "StoreProduct"("uyelikPaketiId");

-- CreateIndex
CREATE INDEX "StoreProduct_aktifMi_idx" ON "StoreProduct"("aktifMi");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProduct_platform_magazaUrunKimligi_key" ON "StoreProduct"("platform", "magazaUrunKimligi");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProduct_platform_urunAnahtari_surum_key" ON "StoreProduct"("platform", "urunAnahtari", "surum");

-- CreateTable (ODM-2R2) Mağaza hak verme anahtarı: işlem kimliği zorunlu ve tekil.
CREATE TABLE "StoreEntitlementGrant" (
    "id" TEXT NOT NULL,
    "platform" "StorePlatform" NOT NULL,
    "magazaIslemKimligi" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "abonelikKimligi" TEXT,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreEntitlementGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreEntitlementGrant_platform_magazaIslemKimligi_key" ON "StoreEntitlementGrant"("platform", "magazaIslemKimligi");

-- CreateIndex
CREATE INDEX "StoreEntitlementGrant_orderId_idx" ON "StoreEntitlementGrant"("orderId");

-- CreateIndex
CREATE INDEX "StoreEntitlementGrant_abonelikKimligi_idx" ON "StoreEntitlementGrant"("abonelikKimligi");

-- CreateIndex
CREATE INDEX "StoreSubscription_kullaniciId_idx" ON "StoreSubscription"("kullaniciId");

-- CreateIndex
CREATE INDEX "StoreSubscription_uyelikId_idx" ON "StoreSubscription"("uyelikId");

-- CreateIndex
CREATE INDEX "StoreSubscription_durum_idx" ON "StoreSubscription"("durum");

-- CreateIndex
CREATE INDEX "StoreSubscription_bitisTarihi_idx" ON "StoreSubscription"("bitisTarihi");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_platform_abonelikKimligi_key" ON "StoreSubscription"("platform", "abonelikKimligi");

-- AddForeignKey
ALTER TABLE "StoreEntitlementGrant" ADD CONSTRAINT "StoreEntitlementGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_uyelikPaketiId_fkey" FOREIGN KEY ("uyelikPaketiId") REFERENCES "UyelikPaketi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_uyelikId_fkey" FOREIGN KEY ("uyelikId") REFERENCES "KullaniciUyelikPaketi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- KISITLAR (Prisma ifade etmez; migrate diff bunları görmez/silmez)
-- ============================================================

-- Ürün türüne göre alan kuralları.
--  UYELIK       : segment (OFFICE|MUTEAHHIT) + paketKodu zorunlu; DENEME/UCRETSIZ/OZEL satılmaz; kisiSayisi, pkUrunKodu boş.
--                 OFFICE paketi DB tablosunda değil OFFICE_MEMBERSHIP_PACKAGES ayarında olduğundan uyelikPaketiId boş.
--  EK_KULLANICI : kisiSayisi in (1,2,3,5,10); diğer tür alanları boş.
--  OFIS_BOY     : ek alan yok.
--  PK           : pkUrunKodu zorunlu; diğerleri boş.
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_tur_alanlari_chk" CHECK (
  (
    "urunTuru" = 'UYELIK'
    AND "segment" IS NOT NULL
    AND "paketKodu" IS NOT NULL
    AND "paketKodu" NOT IN ('DENEME', 'UCRETSIZ', 'OZEL')
    AND "kisiSayisi" IS NULL
    AND "pkUrunKodu" IS NULL
    AND ("segment" <> 'OFFICE' OR "uyelikPaketiId" IS NULL)
  )
  OR
  (
    "urunTuru" = 'EK_KULLANICI'
    AND "kisiSayisi" IS NOT NULL
    AND "kisiSayisi" IN (1, 2, 3, 5, 10)
    AND "segment" IS NULL AND "paketKodu" IS NULL AND "uyelikPaketiId" IS NULL AND "pkUrunKodu" IS NULL
  )
  OR
  (
    "urunTuru" = 'OFIS_BOY'
    AND "kisiSayisi" IS NULL
    AND "segment" IS NULL AND "paketKodu" IS NULL AND "uyelikPaketiId" IS NULL AND "pkUrunKodu" IS NULL
  )
  OR
  (
    "urunTuru" = 'PK'
    AND "pkUrunKodu" IS NOT NULL
    AND "kisiSayisi" IS NULL
    AND "segment" IS NULL AND "paketKodu" IS NULL AND "uyelikPaketiId" IS NULL
  )
);

-- Google base plan yalnız Google abonelik ürünlerinde (üyelik, ek kullanıcı, Ofis Boy); PK'da yok.
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_base_plan_chk" CHECK (
  "googleBasePlanKimligi" IS NULL
  OR ("platform" = 'GOOGLE' AND "urunTuru" IN ('UYELIK', 'EK_KULLANICI', 'OFIS_BOY'))
);

-- Mağaza işlem kimliği boş/boşluk olamaz (NOT NULL zaten kolonda).
ALTER TABLE "StoreEntitlementGrant" ADD CONSTRAINT "StoreEntitlementGrant_kimlik_chk" CHECK (length(btrim("magazaIslemKimligi")) > 0);

-- Kimlik kuralı (proje kuralı): küçük harf + rakam + alt çizgi, harfle başlar, en çok 40 karakter.
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_kimlik_chk" CHECK (
  "magazaUrunKimligi" ~ '^[a-z][a-z0-9_]{2,39}$'
);

-- ============================================================
-- GERİ DOLDURMA (mevcut kayıtlar)
-- ============================================================

-- PaymentOrder.kanal: kolon varsayılanı IYZICO; yalnız değişecek satırlar güncellenir (WHERE) — tüm tabloyu yeniden yazmaz.
-- Eski metadata.channel APPLE/GOOGLE ise o kanal; diğer her şey (WEB/boş) IYZICO = varsayılan, dokunulmaz.
UPDATE "PaymentOrder"
SET "kanal" = CASE "metadata"->>'channel'
  WHEN 'APPLE'  THEN 'APPLE'::"PaymentChannel"
  ELSE 'GOOGLE'::"PaymentChannel"
END
WHERE "metadata"->>'channel' IN ('APPLE', 'GOOGLE');

-- PaymentOrder.ortam: iyzico sandbox siparişleri TEST (yalnız değişecek satırlar).
UPDATE "PaymentOrder"
SET "ortam" = 'TEST'::"PaymentEnvironment"
WHERE "metadata"->>'paymentMode' = 'sandbox' AND "ortam" <> 'TEST';

-- KullaniciUyelikPaketi.kaynakKanal:
-- 1) ödeme kaydıyla hak verilmiş üyelik = settlement'ın SİPARİŞİNDEKİ kanal (üyelik birden çok settlement'a bağlıysa en son olan).
--    (Önceki sürümde hepsi IYZICO yazılıyordu; siparişte APPLE/GOOGLE varsa çelişirdi.) Sipariş kanalı yukarıda doldurulmuştur.
UPDATE "KullaniciUyelikPaketi" k
SET "kaynakKanal" = x."kanal"
FROM (
  SELECT DISTINCT ON (s."uyelikId") s."uyelikId", o."kanal"
  FROM "PaymentSettlement" s
  JOIN "PaymentOrder" o ON o."id" = s."orderId"
  WHERE s."uyelikId" IS NOT NULL
  ORDER BY s."uyelikId", s."settledAt" DESC
) x
WHERE k."id" = x."uyelikId" AND k."kaynakKanal" IS NULL;

-- 2) deneme paketi = DENEME
UPDATE "KullaniciUyelikPaketi" k
SET "kaynakKanal" = 'DENEME'::"PaymentChannel"
FROM "UyelikPaketi" p
WHERE k."paketId" = p."id" AND k."kaynakKanal" IS NULL AND p."paketKodu" = 'DENEME';

-- 3) kalan ücretli/elle verilmiş paketler = ADMIN (UCRETSIZ satırlar NULL kalır: çakışma sayılmaz)
UPDATE "KullaniciUyelikPaketi" k
SET "kaynakKanal" = 'ADMIN'::"PaymentChannel"
FROM "UyelikPaketi" p
WHERE k."paketId" = p."id" AND k."kaynakKanal" IS NULL AND p."paketKodu" <> 'UCRETSIZ';
