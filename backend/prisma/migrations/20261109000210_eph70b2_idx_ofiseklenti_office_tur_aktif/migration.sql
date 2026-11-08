-- EPH-70B2 (c): ofis+tür başına tek etkin eklenti kademesi (F08). CONCURRENTLY: tek ifade, transaction dışı. ÇALIŞTIRILMADI.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "OfisEklenti_office_tur_aktif_uq" ON "OfisEklenti"("officeId","tur") WHERE "durum" IN ('AKTIF','GRACE');
