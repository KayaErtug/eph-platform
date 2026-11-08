-- EPH-70B2 (b): ofis paket modeli tabloları (plan v2 B3). ÇALIŞTIRILMADI.
-- Yeni tablolar ileri uyumludur (eski kod yok sayar); rollback'te DROP EDİLMEZ (plan v2 B3 rollback maddesi 1 ve 5).
CREATE TYPE "OfisAbonelikDurumu" AS ENUM ('AKTIF','GRACE','SURESI_DOLDU','IPTAL');
CREATE TYPE "OfisEklentiTuru"   AS ENUM ('EK_KULLANICI','OFIS_BOY');
CREATE TYPE "OfisSureTuru"      AS ENUM ('DONEMLI','SURESIZ_OZEL');

ALTER TABLE "PaymentOrder"
  ADD COLUMN "hedefOfficeId" TEXT,
  ADD COLUMN "hakSahibiUserId" TEXT,
  ADD COLUMN "hedefOfisPaketKodu" TEXT,
  ADD COLUMN "hedefEklenti" JSONB;

CREATE TABLE "OfisAbonelik" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "paketKodu" TEXT NOT NULL,
  "durum" "OfisAbonelikDurumu" NOT NULL DEFAULT 'AKTIF',
  "sureTuru" "OfisSureTuru" NOT NULL DEFAULT 'DONEMLI',
  "baslangicTarihi" TIMESTAMP(3) NOT NULL,
  "bitisTarihi" TIMESTAMP(3),
  "kaynakKanal" "PaymentChannel",
  "kaynakAbonelikAnahtari" TEXT,
  "storeSubscriptionId" TEXT,
  "paymentOrderId" TEXT,
  "uyelikId" TEXT,
  "otomatikYenileme" BOOLEAN,
  "hakSnapshot" JSONB,
  "snapshotBitis" TIMESTAMP(3),
  "ayarSurumu" TEXT,
  "metadata" JSONB,
  "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guncellenmeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfisAbonelik_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfisAbonelik_officeId_id_key" UNIQUE ("officeId","id"),
  CONSTRAINT "OfisAbonelik_sure_ck" CHECK ("bitisTarihi" IS NULL OR "bitisTarihi" > "baslangicTarihi"),
  CONSTRAINT "OfisAbonelik_donemli_ck" CHECK ("sureTuru" = 'SURESIZ_OZEL' OR "bitisTarihi" IS NOT NULL)
);

CREATE TABLE "OfisEklenti" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "ofisAboneligiId" TEXT NOT NULL,
  "tur" "OfisEklentiTuru" NOT NULL,
  "adet" INTEGER NOT NULL,
  "durum" "OfisAbonelikDurumu" NOT NULL DEFAULT 'AKTIF',
  "kaynakKanal" "PaymentChannel" NOT NULL,
  "kaynakAbonelikAnahtari" TEXT NOT NULL,
  "storeSubscriptionId" TEXT,
  "paymentOrderId" TEXT,
  "magazaUrunKimligi" TEXT,
  "baslangicTarihi" TIMESTAMP(3) NOT NULL,
  "bitisTarihi" TIMESTAMP(3) NOT NULL,
  "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfisEklenti_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfisEklenti_adet_ck" CHECK ("adet" > 0),
  CONSTRAINT "OfisEklenti_sure_ck" CHECK ("bitisTarihi" > "baslangicTarihi"),
  CONSTRAINT "OfisEklenti_kaynakKanal_kaynakAbonelikAnahtari_key" UNIQUE ("kaynakKanal","kaynakAbonelikAnahtari"),
  CONSTRAINT "OfisEklenti_officeId_ofisAboneligiId_fkey" FOREIGN KEY ("officeId","ofisAboneligiId")
    REFERENCES "OfisAbonelik"("officeId","id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OfisHakDonemi" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "kaynakTur" TEXT NOT NULL,
  "kaynakId" TEXT NOT NULL,
  "hakTuru" TEXT NOT NULL,
  "donemBaslangic" TIMESTAMP(3) NOT NULL,
  "donemBitis" TIMESTAMP(3) NOT NULL,
  "verilenPk" INTEGER NOT NULL,
  "portfolioCreditLotId" TEXT,
  "paymentSettlementId" TEXT,
  "iptalTarihi" TIMESTAMP(3),
  CONSTRAINT "OfisHakDonemi_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfisHakDonemi_tur_ck" CHECK ("kaynakTur" IN ('ABONELIK','EKLENTI')),
  CONSTRAINT "OfisHakDonemi_hak_ck" CHECK ("hakTuru" IN ('PAKET_PK','EK_KULLANICI_PK')),
  CONSTRAINT "OfisHakDonemi_sure_ck" CHECK ("donemBitis" > "donemBaslangic"),
  CONSTRAINT "OfisHakDonemi_pk_ck" CHECK ("verilenPk" >= 0),
  CONSTRAINT "OfisHakDonemi_kaynakTur_kaynakId_hakTuru_donemBaslangic_key" UNIQUE ("kaynakTur","kaynakId","hakTuru","donemBaslangic")
);

CREATE TABLE "OfisDenemeKaydi" (
  "id" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "telefonHash" TEXT,
  "kaynak" TEXT NOT NULL DEFAULT 'YENI',
  "baslangicTarihi" TIMESTAMP(3) NOT NULL,
  "bitisTarihi" TIMESTAMP(3) NOT NULL,
  "verilenPk" INTEGER NOT NULL,
  "silinenPk" INTEGER,
  "sonlandiTarihi" TIMESTAMP(3),
  CONSTRAINT "OfisDenemeKaydi_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfisDenemeKaydi_officeId_key" UNIQUE ("officeId"),
  CONSTRAINT "OfisDenemeKaydi_telefonHash_key" UNIQUE ("telefonHash"),
  CONSTRAINT "OfisDenemeKaydi_kaynak_ck" CHECK ("kaynak" IN ('YENI','GECIS')),
  CONSTRAINT "OfisDenemeKaydi_sure_ck" CHECK ("bitisTarihi" > "baslangicTarihi"),
  CONSTRAINT "OfisDenemeKaydi_pk_ck" CHECK ("verilenPk" >= 0 AND ("silinenPk" IS NULL OR "silinenPk" >= 0))
);

CREATE TABLE "OfisGecisDefteri" (
  "id" TEXT NOT NULL,
  "kaynakAnahtar" TEXT NOT NULL,
  "officeId" TEXT,
  "kullaniciId" TEXT,
  "eskiKod" TEXT,
  "eskiSnapshot" JSONB,
  "eskiBitis" TIMESTAMP(3),
  "hedefKod" TEXT,
  "durum" TEXT NOT NULL,
  "neden" TEXT,
  "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfisGecisDefteri_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfisGecisDefteri_kaynakAnahtar_key" UNIQUE ("kaynakAnahtar"),
  CONSTRAINT "OfisGecisDefteri_durum_ck" CHECK ("durum" IN ('ESLENDI','KARANTINA','ATLANDI'))
);

ALTER TABLE "OfisAbonelik"    ADD CONSTRAINT "OfisAbonelik_officeId_fkey"           FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfisAbonelik"    ADD CONSTRAINT "OfisAbonelik_storeSubscriptionId_fkey" FOREIGN KEY ("storeSubscriptionId") REFERENCES "StoreSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisAbonelik"    ADD CONSTRAINT "OfisAbonelik_paymentOrderId_fkey"      FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisAbonelik"    ADD CONSTRAINT "OfisAbonelik_uyelikId_fkey"            FOREIGN KEY ("uyelikId") REFERENCES "KullaniciUyelikPaketi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisEklenti"     ADD CONSTRAINT "OfisEklenti_officeId_fkey"            FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfisEklenti"     ADD CONSTRAINT "OfisEklenti_storeSubscriptionId_fkey"  FOREIGN KEY ("storeSubscriptionId") REFERENCES "StoreSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisEklenti"     ADD CONSTRAINT "OfisEklenti_paymentOrderId_fkey"       FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisHakDonemi"   ADD CONSTRAINT "OfisHakDonemi_officeId_fkey"          FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfisHakDonemi"   ADD CONSTRAINT "OfisHakDonemi_portfolioCreditLotId_fkey" FOREIGN KEY ("portfolioCreditLotId") REFERENCES "PortfolioCreditLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisHakDonemi"   ADD CONSTRAINT "OfisHakDonemi_paymentSettlementId_fkey" FOREIGN KEY ("paymentSettlementId") REFERENCES "PaymentSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfisDenemeKaydi" ADD CONSTRAINT "OfisDenemeKaydi_officeId_fkey"        FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfisDenemeKaydi" ADD CONSTRAINT "OfisDenemeKaydi_ownerUserId_fkey"     FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
