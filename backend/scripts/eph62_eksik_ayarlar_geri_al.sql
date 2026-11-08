-- EPH-62 geri alma: yalnız eph62_eksik_ayarlar.sql ile eklenen satırları siler (id öneki 'eph62-'). ÇALIŞTIRILMADI.
-- Süper admin sonradan ekrandan değiştirdiyse o satır da silinir; önce SELECT ile bakın.
--   SELECT "key","valueJson" FROM "SystemSetting" WHERE "id" LIKE 'eph62-%';
BEGIN;
DELETE FROM "SystemSetting" WHERE "id" LIKE 'eph62-%';
COMMIT;
