-- EPH-70B2 (a): enum değerleri. ADD VALUE transaction içinde kullanılamaz; yalnız bu dosyada. ÇALIŞTIRILMADI.
ALTER TYPE "UyelikPaketKodu"     ADD VALUE IF NOT EXISTS 'SOLO';
ALTER TYPE "PaymentOrderPurpose" ADD VALUE IF NOT EXISTS 'OFFICE_PACKAGE';
ALTER TYPE "PaymentOrderPurpose" ADD VALUE IF NOT EXISTS 'OFFICE_ADDON';
