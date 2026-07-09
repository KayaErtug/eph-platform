-- Madde 33: forum talebi oluşturma kontör işlem türü (aylık limit aşımında 20 kontör)
ALTER TYPE "KontorIslemTuru" ADD VALUE IF NOT EXISTS 'FORUM_TALEP_OLUSTURMA';
