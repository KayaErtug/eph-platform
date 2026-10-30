-- EPH-52: Lina kalıcı taslak tablosu (yeni tablo; mevcut veriye dokunmaz)
CREATE TABLE "LinaTaslak" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "konusmaAnahtari" TEXT NOT NULL DEFAULT 'varsayilan',
    "tur" TEXT NOT NULL DEFAULT 'CRM_MUSTERI',
    "durum" TEXT NOT NULL DEFAULT 'AKTIF',
    "alanlar" JSONB NOT NULL DEFAULT '{}',
    "maskeEsleme" TEXT,
    "sonSonuc" JSONB,
    "gecerlilikTarihi" TIMESTAMP(3) NOT NULL,
    "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinaTaslak_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LinaTaslak_kullaniciId_durum_idx" ON "LinaTaslak"("kullaniciId", "durum");
CREATE INDEX "LinaTaslak_gecerlilikTarihi_idx" ON "LinaTaslak"("gecerlilikTarihi");
