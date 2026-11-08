-- EPH-70B1F/D5: harcama -> lot tahsis kaydı. TASLAK — AJAN ÇALIŞTIRMAZ; Mustafa abi onayıyla sunucuda uygulanır.
-- Yeni tablo; mevcut tablolara dokunmaz. Tablo boşken kilit/etki sıfırdır.
CREATE TABLE "PortfolioCreditLotTuketim" (
  "id" TEXT NOT NULL,
  "kullaniciId" TEXT NOT NULL,
  "hareketId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "miktar" INTEGER NOT NULL,
  "iadeEdilen" INTEGER NOT NULL DEFAULT 0,
  "olusturulmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioCreditLotTuketim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortfolioCreditLotTuketim_hareketId_lotId_key" ON "PortfolioCreditLotTuketim"("hareketId", "lotId");
CREATE INDEX "PortfolioCreditLotTuketim_kullaniciId_idx" ON "PortfolioCreditLotTuketim"("kullaniciId");
CREATE INDEX "PortfolioCreditLotTuketim_hareketId_idx" ON "PortfolioCreditLotTuketim"("hareketId");
CREATE INDEX "PortfolioCreditLotTuketim_lotId_idx" ON "PortfolioCreditLotTuketim"("lotId");
ALTER TABLE "PortfolioCreditLotTuketim" ADD CONSTRAINT "PortfolioCreditLotTuketim_lotId_fkey"
  FOREIGN KEY ("lotId") REFERENCES "PortfolioCreditLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
