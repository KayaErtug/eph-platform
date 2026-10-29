-- EPH-11: Proje Yetkilisi (ad soyad, telefon, WhatsApp, e-posta). Ayrı tablo: proje satırı çekilirken yanlışlıkla sızmaz.
-- ELLE YAZILDI, ÇALIŞTIRILMADI. Yalnızca yeni tablo ekler; mevcut veriye dokunmaz.
-- Geri alma: DROP TABLE "ProjectAuthorizedContact";
CREATE TABLE "ProjectAuthorizedContact" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "whatsappSameAsPhone" BOOLEAN NOT NULL DEFAULT false,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectAuthorizedContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectAuthorizedContact_projectId_key" ON "ProjectAuthorizedContact"("projectId");

ALTER TABLE "ProjectAuthorizedContact" ADD CONSTRAINT "ProjectAuthorizedContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
