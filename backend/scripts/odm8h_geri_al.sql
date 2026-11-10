-- ODM-8H. CALISTIRILMADI. BAKIM altinda, herhangi bir hak/abonelik degismeden.
-- Degismis abonelik veya yeni ofiste yeni bagli veri varsa TAMAMI ROLLBACK;
-- bu betik ticari islemleri/PK'yi geri almaz. Yalniz ODM8H defterli eklemeler.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout='10s';
LOCK TABLE "SystemSetting", "Office", "User", "UserCapability", "OfisAbonelik", "OfisGecisDefteri" IN SHARE ROW EXCLUSIVE MODE;
CREATE FUNCTION pg_temp.odm8h_assert(ok boolean, reason text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ODM8H ROLLBACK: %', reason; END IF; END $$;
CREATE TEMP TABLE h_undo ON COMMIT DROP AS SELECT *, "eskiSnapshot"::jsonb AS j FROM "OfisGecisDefteri" WHERE left("kaynakAnahtar",6)='ODM8H:' AND durum='ESLENDI';
SELECT "hedefKod",count(*) AS geri_alinacak FROM h_undo GROUP BY "hedefKod";
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo) OR (SELECT count(*)=6 FROM h_undo WHERE left("kaynakAnahtar",13)='ODM8H:OFFICE:'), '6 ofis defteri bekleniyor');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d LEFT JOIN "OfisAbonelik" a ON a.id=d.j->'subscription'->>'id'
 WHERE d.j->'subscription' IS NOT NULL AND d.j->'subscription'<>'null'::jsonb AND (a.id IS NULL OR to_jsonb(a) IS DISTINCT FROM d.j->'subscription')), 'abonelik degisti/kayip; manuel uzlastirma gerekli');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d JOIN "OfisAbonelik" a ON a."officeId"=d."officeId" WHERE a.id IS DISTINCT FROM d.j->'subscription'->>'id'), 'yeni abonelik var');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d JOIN "OfisHakDonemi" h ON h."officeId"=d."officeId" WHERE h."kaynakId"=d.j->'subscription'->>'id'), 'hak donemi/PK islenmis');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d JOIN "OfisEklenti" e ON e."ofisAboneligiId"=d.j->'subscription'->>'id'), 'eklenti var');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d LEFT JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||d."officeId"
 WHERE (d.j ? 'legacy' AND s."valueJson"::jsonb IS DISTINCT FROM d.j->'legacy') OR
 (d.j ? 'newOffice' AND coalesce(s."valueJson"::jsonb,'null'::jsonb) IS DISTINCT FROM d.j->'newLegacy')), 'legacy kaydi degismis');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d LEFT JOIN "Office" o ON o.id=d."officeId"
 LEFT JOIN "User" u ON u.id=d."kullaniciId" LEFT JOIN "UserCapability" c ON c."userId"=d."kullaniciId" AND c.capability='OFFICE_OWNER'
 WHERE d.j ? 'newOffice' AND (to_jsonb(o) IS DISTINCT FROM d.j->'newOffice' OR u."officeId" IS DISTINCT FROM d."officeId" OR to_jsonb(c) IS DISTINCT FROM d.j->'newCapability')), 'solo ofis/kullanici/capability degismis');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_undo d JOIN "User" u ON u."officeId"=d."officeId" AND u.id<>d."kullaniciId" WHERE d.j ? 'newOffice'), 'solo ofise baska uye eklenmis');
-- Yeni ofise bagli tum FK tablolarini kontrol et: cascade ile veri silinmesin.
DO $$ DECLARE r record; n bigint;
BEGIN
 FOR r IN SELECT c.conrelid::regclass AS tbl, a.attname AS col
 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
 WHERE c.contype='f' AND c.confrelid='"Office"'::regclass AND c.conrelid NOT IN ('"User"'::regclass,'"OfisAbonelik"'::regclass)
 LOOP
   EXECUTE format('SELECT count(*) FROM %s x JOIN h_undo d ON x.%I=d."officeId" WHERE d.j ? ''newOffice''',r.tbl,r.col) INTO n;
   IF n<>0 THEN RAISE EXCEPTION 'ODM8H ROLLBACK: yeni ofiste bagli veri var (%)',r.tbl; END IF;
 END LOOP;
END $$;
SELECT key,"valueJson" AS once FROM "SystemSetting" WHERE key='OFFICE_ENTITLEMENT_SOURCE';
WITH changed AS (UPDATE "SystemSetting" SET "valueJson"='"legacy"'::jsonb WHERE key='OFFICE_ENTITLEMENT_SOURCE' AND "valueJson"::jsonb IN ('"legacy"'::jsonb,'"relational"'::jsonb) RETURNING key)
SELECT pg_temp.odm8h_assert(count(*)=1,'kaynak tam 1 satir olmali') FROM changed;
DELETE FROM "OfisAbonelik" a USING h_undo d WHERE a.id=d.j->'subscription'->>'id';
DELETE FROM "SystemSetting" s USING h_undo d WHERE d.j ? 'newOffice' AND s.key='OFFICE_SUBSCRIPTION_'||d."officeId";
DELETE FROM "UserCapability" c USING h_undo d WHERE d.j ? 'newOffice' AND (d.j->>'hadOwnerCapability')::boolean=false AND c.id=d.j->'newCapability'->>'id';
UPDATE "User" u SET "officeId"=d.j->>'oldOfficeId' FROM h_undo d WHERE d.j ? 'newOffice' AND u.id=d."kullaniciId";
DELETE FROM "Office" o USING h_undo d WHERE d.j ? 'newOffice' AND o.id=d."officeId";
DELETE FROM "OfisGecisDefteri" d USING h_undo p WHERE d.id=p.id;
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM "OfisGecisDefteri" WHERE left("kaynakAnahtar",6)='ODM8H:'), 'defter geri alinmadi');
SELECT key,"valueJson" AS sonra FROM "SystemSetting" WHERE key='OFFICE_ENTITLEMENT_SOURCE';
SELECT count(*) AS kalan_odm8h_abonelik FROM "OfisAbonelik" WHERE metadata->>'migration'='ODM8H';
COMMIT;
