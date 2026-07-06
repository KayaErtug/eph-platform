-- CreateEnum
CREATE TYPE "ProjectGeometryType" AS ENUM ('TEK_CEPHELI_STANDART', 'DIKDORTGEN', 'KARE', 'L_PLAN', 'U_PLAN', 'BIRDEN_FAZLA_STANDART_BLOK', 'BESGEN', 'ALTIGEN', 'YILDIZ', 'DAIRESEL', 'KIRIK_CEPHELI', 'COK_KANATLI', 'BAGLANTILI_KULELER', 'OZEL_KARMASIK');

-- CreateEnum
CREATE TYPE "ProjectWizardStep" AS ENUM ('PROJE_BILGILERI', 'PROJE_YAPISI', 'MEKAN_ENVANTERI', 'GEOMETRI', 'BLOKLAR', 'KATLAR', 'KAT_DAGILIMI', 'NUMARALANDIRMA', 'KONTROL', 'TAMAMLANDI');

-- CreateEnum
CREATE TYPE "ProjectSetupStatus" AS ENUM ('TASLAK', 'YAPI_OLUSTURULUYOR', 'BILGI_GIRISI_EKSIK', 'KONTROLE_HAZIR', 'TAMAMLANDI', 'ARSIVLENDI');

-- CreateEnum
CREATE TYPE "ProjectLegalStatus" AS ENUM ('TAPUDA_BAGIMSIZ_BOLUM', 'ORTAK_KULLANIM_ALANI', 'BAGIMSIZ_BOLUM_EKLENTISI', 'TEKNIK_HIZMET_ALANI', 'ACIK_ALAN_SOSYAL_DONATI');

-- CreateEnum
CREATE TYPE "ProjectCommercialPurpose" AS ENUM ('SATISA_SUNULACAK', 'KIRAYA_VERILECEK', 'SATIS_VEYA_KIRALAMA_STOGU', 'ARSA_SAHIBINE_AYRILMIS', 'FIRMA_KULLANIMINA_AYRILMIS', 'SITE_ISLETMESINE_AYRILMIS', 'ORTAK_KULLANIMA_AYRILMIS', 'TEKNIK_KULLANIM', 'SATIS_DISI');

-- CreateEnum
CREATE TYPE "ProjectSpaceType" AS ENUM ('KAPALI_HAVUZ', 'ACIK_HAVUZ', 'SAUNA', 'SPA', 'HAMAM', 'BUHAR_ODASI', 'SPOR_SALONU', 'KRES', 'COCUK_OYUN_ALANI', 'SINEMA_SALONU', 'HOBI_ODASI', 'TOPLANTI_SALONU', 'KUTUPHANE', 'ORTAK_TERAS', 'LOBI', 'RESEPSIYON', 'SITE_YONETIM_OFISI', 'ORTAK_BAHCE', 'SITE_MARKETI', 'KAFETERYA', 'DINLENME_SALONU', 'MISAFIR_SALONU', 'ELEKTRIK_ODASI', 'MEKANIK_ODA', 'JENERATOR_ODASI', 'SU_DEPOSU', 'SIGINAK', 'GUVENLIK_ODASI', 'PERSONEL_ODASI', 'COP_ODASI', 'TEKNIK_DEPO', 'KAPALI_OTOPARK', 'ACIK_OTOPARK', 'SERVIS_ALANI', 'YURUYUS_PARKURU', 'BASKETBOL_SAHASI', 'TENIS_KORTU', 'COCUK_PARKI', 'PEYZAJ_ALANI', 'DINLENME_ALANI', 'SUS_HAVUZU', 'DIGER');

-- CreateEnum
CREATE TYPE "ProjectDesignReviewStatus" AS ENUM ('BEKLIYOR', 'INCELEMEDE', 'EK_BILGI_BEKLENIYOR', 'ONAYLANDI', 'REDDEDILDI', 'TAMAMLANDI');

-- DropIndex
DROP INDEX "Project_city_district_idx";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "adaNo" TEXT,
ADD COLUMN     "declaredIndependentUnitCount" INTEGER,
ADD COLUMN     "declaredSalesInventoryCount" INTEGER,
ADD COLUMN     "geometryType" "ProjectGeometryType" NOT NULL DEFAULT 'DIKDORTGEN',
ADD COLUMN     "needsSoftwareTeamReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "parselNo" TEXT,
ADD COLUMN     "plannedUnitTypes" "UnitType"[] DEFAULT ARRAY[]::"UnitType"[],
ADD COLUMN     "setupStatus" "ProjectSetupStatus" NOT NULL DEFAULT 'TASLAK',
ADD COLUMN     "wizardStep" "ProjectWizardStep" NOT NULL DEFAULT 'PROJE_BILGILERI';

-- AlterTable
ALTER TABLE "ProjectBlock" ADD COLUMN     "facadeViewCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "geometryType" "ProjectGeometryType" NOT NULL DEFAULT 'DIKDORTGEN';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "commercialPurpose" "ProjectCommercialPurpose" NOT NULL DEFAULT 'SATISA_SUNULACAK',
ADD COLUMN     "conceptLabel" TEXT,
ADD COLUMN     "isSalesInventory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "legalStatus" "ProjectLegalStatus" NOT NULL DEFAULT 'TAPUDA_BAGIMSIZ_BOLUM';

-- CreateTable
CREATE TABLE "ProjectSpace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "blockId" TEXT,
    "floorId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spaceType" "ProjectSpaceType" NOT NULL,
    "customTypeName" TEXT,
    "legalStatus" "ProjectLegalStatus" NOT NULL,
    "commercialPurpose" "ProjectCommercialPurpose" NOT NULL,
    "grossArea" DOUBLE PRECISION,
    "description" TEXT,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDesignReviewRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "ProjectDesignReviewStatus" NOT NULL DEFAULT 'BEKLIYOR',
    "geometryNotes" TEXT,
    "userMessage" TEXT,
    "softwareTeamNote" TEXT,
    "attachments" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDesignReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSpace_projectId_idx" ON "ProjectSpace"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSpace_blockId_idx" ON "ProjectSpace"("blockId");

-- CreateIndex
CREATE INDEX "ProjectSpace_floorId_idx" ON "ProjectSpace"("floorId");

-- CreateIndex
CREATE INDEX "ProjectSpace_spaceType_idx" ON "ProjectSpace"("spaceType");

-- CreateIndex
CREATE INDEX "ProjectSpace_legalStatus_idx" ON "ProjectSpace"("legalStatus");

-- CreateIndex
CREATE INDEX "ProjectSpace_commercialPurpose_idx" ON "ProjectSpace"("commercialPurpose");

-- CreateIndex
CREATE INDEX "ProjectSpace_isCustomerVisible_idx" ON "ProjectSpace"("isCustomerVisible");

-- CreateIndex
CREATE INDEX "ProjectSpace_isActive_idx" ON "ProjectSpace"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSpace_projectId_code_key" ON "ProjectSpace"("projectId", "code");

-- CreateIndex
CREATE INDEX "ProjectDesignReviewRequest_projectId_idx" ON "ProjectDesignReviewRequest"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDesignReviewRequest_requestedById_idx" ON "ProjectDesignReviewRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ProjectDesignReviewRequest_reviewedById_idx" ON "ProjectDesignReviewRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "ProjectDesignReviewRequest_status_idx" ON "ProjectDesignReviewRequest"("status");

-- CreateIndex
CREATE INDEX "ProjectDesignReviewRequest_requestedAt_idx" ON "ProjectDesignReviewRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "Project_city_district_neighborhood_idx" ON "Project"("city", "district", "neighborhood");

-- CreateIndex
CREATE INDEX "Project_geometryType_idx" ON "Project"("geometryType");

-- CreateIndex
CREATE INDEX "Project_wizardStep_idx" ON "Project"("wizardStep");

-- CreateIndex
CREATE INDEX "Project_setupStatus_idx" ON "Project"("setupStatus");

-- CreateIndex
CREATE INDEX "Project_needsSoftwareTeamReview_idx" ON "Project"("needsSoftwareTeamReview");

-- CreateIndex
CREATE INDEX "ProjectBlock_geometryType_idx" ON "ProjectBlock"("geometryType");

-- CreateIndex
CREATE INDEX "Unit_projectId_isSalesInventory_idx" ON "Unit"("projectId", "isSalesInventory");

-- CreateIndex
CREATE INDEX "Unit_legalStatus_idx" ON "Unit"("legalStatus");

-- CreateIndex
CREATE INDEX "Unit_commercialPurpose_idx" ON "Unit"("commercialPurpose");

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ProjectBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "ProjectFloor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDesignReviewRequest" ADD CONSTRAINT "ProjectDesignReviewRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDesignReviewRequest" ADD CONSTRAINT "ProjectDesignReviewRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDesignReviewRequest" ADD CONSTRAINT "ProjectDesignReviewRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
