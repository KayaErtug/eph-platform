-- ODM-8H 2026-11-10. Hazirlandi, CALISTIRILMADI. psql / ON_ERROR_STOP.
-- BAKIM: tum uygulama/cron/odeme yazicilari durdurulmus olmali.
-- PK/bakiye/lot/hareket/OfisHakDonemi YAZILMAZ. Hata transaction'i abort eder;
-- ON_ERROR_STOP ile baglanti kapaninca PostgreSQL tam ROLLBACK yapar.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout = '10s';
LOCK TABLE "SystemSetting", "Office", "User", "UserCapability", "OfisAbonelik", "OfisGecisDefteri" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "KullaniciUyelikPaketi", "UyelikPaketi", "OfisEklenti" IN SHARE MODE;
CREATE FUNCTION pg_temp.odm8h_assert(ok boolean, reason text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ODM8H ROLLBACK: %', reason; END IF; END $$;
SELECT pg_temp.odm8h_assert((SELECT count(*) = 1 FROM "SystemSetting" WHERE key='OFFICE_ENTITLEMENT_SOURCE' AND "valueJson"::jsonb='"legacy"'::jsonb), 'kaynak legacy olmali');

CREATE TEMP TABLE h_targets(oid text PRIMARY KEY, code text) ON COMMIT DROP;
INSERT INTO h_targets VALUES
 ('4bc5e5e4-8ddb-4f2f-95c2-5e594bf5c9cc','ALTIN'),
 ('a9d50719-6f67-480d-9737-b7556ece78f3','ALTIN'),
 ('d2947e46-f258-472b-814e-a3de4d3354d2','ALTIN'),
 ('e7c27055-2e0a-4f9c-9705-3341f2eee537','ALTIN'),
 ('f3d8e69c-1c80-4e5c-a456-eba208042c82','PLATINUM'),
 ('fe722563-e3d3-47af-9ac2-983c0733256e','ALTIN');
CREATE TEMP TABLE h_catalog ON COMMIT DROP AS
 SELECT e AS j FROM "SystemSetting", LATERAL jsonb_array_elements("valueJson"::jsonb) e WHERE key='OFFICE_MEMBERSHIP_PACKAGES';
SELECT pg_temp.odm8h_assert((SELECT count(*)=3 AND count(DISTINCT j->>'code')=3 FROM h_catalog WHERE j->>'code' IN ('ALTIN','PLATINUM','SOLO') AND j->>'active' IS DISTINCT FROM 'false'), 'uc paket katalogda tekil ve aktif olmali');
-- Bunlar hak atamasi degil, Mustafa abinin bildirdigi katalog icin onkosul kanitidir.
SELECT pg_temp.odm8h_assert((SELECT count(*)=2 FROM h_catalog WHERE
 (j->>'code'='ALTIN' AND (j->>'totalUsers')::int=12 AND (j->>'portfolioCapacity')::int=600 AND (j->>'monthlyPk')::int=4800) OR
 (j->>'code'='PLATINUM' AND (j->>'totalUsers')::int=25 AND (j->>'portfolioCapacity')::int=1250 AND (j->>'monthlyPk')::int=10000)), 'bildirilen yeni katalog haklari farkli; yeniden incele');

CREATE TEMP TABLE h_plan ON COMMIT DROP AS
 SELECT t.oid, o."ownerUserId" AS uid, t.code, s."valueJson"::jsonb AS legacy,
   (coalesce(nullif(s."valueJson"->>'purchasedAt',''), nullif(s."valueJson"->>'startedAt',''))::timestamptz AT TIME ZONE 'UTC') AS starts,
   ((s."valueJson"->>'expiresAt')::timestamptz AT TIME ZONE 'UTC') AS ends,
   md5('ODM8H:SUB:'||t.oid)::uuid::text AS sid, c.j AS pack
 FROM h_targets t JOIN "Office" o ON o.id=t.oid AND o."isActive" AND o."ownerUserId" IS NOT NULL
 JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||t.oid
 JOIN h_catalog c ON c.j->>'code'=t.code
 WHERE s."valueJson"->>'packageCode'=t.code AND s."valueJson"->>'active' IS DISTINCT FROM 'false' AND s."valueJson"->>'ended' IS DISTINCT FROM 'true';
SELECT oid, code, starts, ends, sid AS hedef_abonelik FROM h_plan ORDER BY oid;
SELECT pg_temp.odm8h_assert((SELECT count(*)=6 AND bool_and(starts IS NOT NULL AND starts<=now() AT TIME ZONE 'UTC' AND ends>now() AT TIME ZONE 'UTC' AND ends>starts) FROM h_plan), '6 canli legacy ofis / gercek baslangic-bitis gerekli');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM "OfisEklenti" e JOIN h_targets t ON t.oid=e."officeId" WHERE e.durum IN ('AKTIF','GRACE')), 'eklenti var; snapshot cift sayim incelemesi gerekli');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM "OfisAbonelik" a JOIN h_plan p ON p.oid=a."officeId" WHERE a.id<>p.sid AND a.durum IN ('AKTIF','GRACE')), 'beklenmeyen relational karsilik');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM "OfisAbonelik" a JOIN h_plan p ON p.sid=a.id WHERE NOT EXISTS(SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar"='ODM8H:OFFICE:'||p.oid AND d.durum='ESLENDI')), 'deftersiz deterministik abonelik cakismasi');

-- Ofissiz emlakcilar: ucretli alt kume tam 1; ucretsizler de 18c ile ofislendirilir.
-- Tekrar calismada defterdeki ayni kullanicilar da plana alinir.
CREATE TEMP TABLE h_solo ON COMMIT DROP AS
 SELECT u.id AS uid, u."officeId" AS old_office_id, k.id AS kid, p."paketKodu"::text AS old_code,
 k."baslangicTarihi" AS starts, k."bitisTarihi" AS ends,
 md5('ODM8H:OFFICE:'||u.id)::uuid::text AS oid,
 EXISTS(SELECT 1 FROM "UserCapability" c WHERE c."userId"=u.id AND c.capability='OFFICE_OWNER') AS had_cap
 FROM "User" u
 LEFT JOIN LATERAL (SELECT k.* FROM "KullaniciUyelikPaketi" k JOIN "UyelikPaketi" p ON p.id=k."paketId"
 WHERE k."kullaniciId"=u.id AND k.durum='AKTIF' AND k."baslangicTarihi"<=now() AT TIME ZONE 'UTC'
 AND (k."bitisTarihi" IS NULL OR k."bitisTarihi">now() AT TIME ZONE 'UTC')
 AND p."paketKodu"::text NOT IN ('DENEME','UCRETSIZ') ORDER BY k."baslangicTarihi" DESC, k.id LIMIT 1) k ON true
 LEFT JOIN "UyelikPaketi" p ON p.id=k."paketId"
 WHERE u.role='EMLAKCI' AND ((u."officeId" IS NULL AND NOT EXISTS(SELECT 1 FROM "Office" o WHERE o."ownerUserId"=u.id AND o."isActive"))
 OR EXISTS(SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar"='ODM8H:SOLO:'||u.id AND d.durum='ESLENDI'));
SELECT count(*) AS ofissiz_toplam, count(kid) AS ucretli_solo FROM h_solo;
SELECT pg_temp.odm8h_assert((SELECT count(kid)=1 AND bool_and(kid IS NULL OR ends IS NOT NULL) FROM h_solo), '18c: tam 1 sureli ucretli kisisel uyelik gerekli');
SELECT pg_temp.odm8h_assert((SELECT count(*)=5 FROM "KullaniciUyelikPaketi" k JOIN "User" u ON u.id=k."kullaniciId" JOIN "UyelikPaketi" p ON p.id=k."paketId"
 WHERE u.role='EMLAKCI' AND u."officeId" IS NOT NULL AND EXISTS(SELECT 1 FROM "Office" o WHERE o.id=u."officeId" AND o."ownerUserId" IS DISTINCT FROM u.id)
 AND k.durum='AKTIF' AND k."baslangicTarihi"<=now() AT TIME ZONE 'UTC' AND (k."bitisTarihi" IS NULL OR k."bitisTarihi">now() AT TIME ZONE 'UTC') AND p."paketKodu"::text NOT IN ('DENEME','UCRETSIZ')), '18e: danisman uyelik adedi 5 degil');

-- Eski kisinin uyeligine YAZILMAZ. Defter onceki officeId/capability bilgisini saklar.
INSERT INTO "OfisGecisDefteri" (id,"kaynakAnahtar","officeId","kullaniciId","eskiKod","eskiSnapshot","eskiBitis","hedefKod",durum,neden)
 SELECT md5('ODM8H:LEDGER:SOLO:'||uid)::uuid::text, 'ODM8H:SOLO:'||uid, oid, uid, old_code,
 jsonb_build_object('oldOfficeId',old_office_id,'hadOwnerCapability',had_cap,'membershipId',kid), ends,
 CASE WHEN kid IS NOT NULL THEN 'SOLO' ELSE 'UCRETSIZ' END,'ESLENDI','18c; odemesiz kalan sure; PK yuklenmez' FROM h_solo
 ON CONFLICT ("kaynakAnahtar") DO NOTHING;
INSERT INTO "Office" (id,name,slug,"ownerUserId","isActive","updatedAt")
 SELECT oid,'Tek Kişilik Ofis','odm8h-'||oid,uid,true,now() FROM h_solo ON CONFLICT (id) DO NOTHING;
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_solo p JOIN "Office" o ON o.id=p.oid WHERE o."ownerUserId" IS DISTINCT FROM p.uid OR NOT o."isActive"), 'solo ofis kimligi cakisti');
UPDATE "User" u SET "officeId"=p.oid FROM h_solo p WHERE u.id=p.uid AND u."officeId" IS NULL;
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_solo p JOIN "User" u ON u.id=p.uid WHERE u."officeId" IS DISTINCT FROM p.oid), 'solo user baglantisi farkli');
INSERT INTO "UserCapability" (id,"userId",capability,"updatedAt") SELECT md5('ODM8H:CAP:'||uid)::uuid::text,uid,'OFFICE_OWNER',now() FROM h_solo ON CONFLICT ("userId",capability) DO NOTHING;

-- Yeni katalogdan snapshot; eski daha yuksek haklar 18a ile donem sonuna kadar korunur.
INSERT INTO "OfisAbonelik" (id,"officeId","paketKodu",durum,"sureTuru","baslangicTarihi","bitisTarihi","kaynakKanal","kaynakAbonelikAnahtari","otomatikYenileme","hakSnapshot","snapshotBitis",metadata,"guncellenmeTarihi")
 SELECT sid,oid,code,'AKTIF','DONEMLI',starts,ends,'ADMIN','ODM8H:OFFICE:'||oid,false,
 jsonb_build_object('users',greatest((pack->>'totalUsers')::int,coalesce((legacy->>'agents')::int+1,0)),
 'portfolio',greatest((pack->>'portfolioCapacity')::int,coalesce((legacy->>'portfolioCapacity')::int,0)),
 'monthlyPk',greatest((pack->>'monthlyPk')::int,coalesce((legacy->>'monthlyPk')::int,0)),
 'crm',CASE WHEN pack->>'crmCapacity' IS NULL OR (pack->>'crmCapacity')::int=-1 OR (legacy->>'crmCapacity')::int=-1 THEN NULL ELSE greatest((pack->>'crmCapacity')::int,(legacy->>'crmCapacity')::int) END,
 'ofisBoy',greatest(coalesce((pack->>'ofisBoyDahil')::int,0),coalesce((legacy->>'ofisBoy')::int,0))),ends,
 jsonb_build_object('migration','ODM8H','pkGranted',false),now() FROM h_plan ON CONFLICT (id) DO NOTHING;
INSERT INTO "OfisGecisDefteri" (id,"kaynakAnahtar","officeId","kullaniciId","eskiKod","eskiSnapshot","eskiBitis","hedefKod",durum,neden)
 SELECT md5('ODM8H:LEDGER:OFFICE:'||p.oid)::uuid::text,'ODM8H:OFFICE:'||p.oid,p.oid,p.uid,p.code,
 jsonb_build_object('legacy',p.legacy,'subscription',to_jsonb(a)),p.ends,p.code,'ESLENDI','18a; ADMIN gecis; PK yuklenmez'
 FROM h_plan p JOIN "OfisAbonelik" a ON a.id=p.sid ON CONFLICT ("kaynakAnahtar") DO NOTHING;

INSERT INTO "OfisAbonelik" (id,"officeId","paketKodu",durum,"sureTuru","baslangicTarihi","bitisTarihi","kaynakKanal","kaynakAbonelikAnahtari","otomatikYenileme",metadata,"guncellenmeTarihi")
 SELECT md5('ODM8H:SUB:'||oid)::uuid::text,oid,'SOLO','AKTIF','DONEMLI',starts,ends,'ADMIN','ODM8H:SOLO:'||uid,false,jsonb_build_object('migration','ODM8H','pkGranted',false),now()
 FROM h_solo WHERE kid IS NOT NULL ON CONFLICT (id) DO NOTHING;
-- 18c sonrasi legacy geri-donus esdegerligi: yalniz yeni ofise yeni anahtar.
INSERT INTO "SystemSetting" (id,key,"valueJson","updatedAt")
 SELECT md5('ODM8H:LEGACY:'||p.oid)::uuid::text,'OFFICE_SUBSCRIPTION_'||p.oid,
 jsonb_build_object('packageCode','SOLO','purchasedAt',to_char(p.starts,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(p.ends,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'active',true,'migration','ODM8H'),now()
 FROM h_solo p WHERE kid IS NOT NULL ON CONFLICT (key) DO NOTHING;
-- Tekrar calismada snapshot yenilenmez; sonradan degisen kayit kabul edilmez.
UPDATE "OfisGecisDefteri" d SET "eskiSnapshot"=d."eskiSnapshot"::jsonb || jsonb_build_object('subscription',to_jsonb(a),'newLegacy',s."valueJson"::jsonb,'newOffice',to_jsonb(o),'newCapability',to_jsonb(c))
 FROM h_solo p JOIN "Office" o ON o.id=p.oid
 JOIN "UserCapability" c ON c."userId"=p.uid AND c.capability='OFFICE_OWNER'
 LEFT JOIN "OfisAbonelik" a ON a.id=md5('ODM8H:SUB:'||p.oid)::uuid::text
 LEFT JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||p.oid
 WHERE d."kaynakAnahtar"='ODM8H:SOLO:'||p.uid AND NOT (d."eskiSnapshot"::jsonb ? 'newOffice');

SELECT pg_temp.odm8h_assert((SELECT count(*)=6 FROM h_plan p JOIN "OfisAbonelik" a ON a.id=p.sid JOIN "OfisGecisDefteri" d ON d."kaynakAnahtar"='ODM8H:OFFICE:'||p.oid
 WHERE to_jsonb(a)=d."eskiSnapshot"::jsonb->'subscription' AND p.legacy=d."eskiSnapshot"::jsonb->'legacy' AND a."paketKodu"=p.code AND a."baslangicTarihi"=p.starts AND a."bitisTarihi"=p.ends AND a."kaynakKanal"='ADMIN' AND a.durum='AKTIF'), '6 esdeger abonelik/defter gerekli');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_solo p JOIN "OfisGecisDefteri" d ON d."kaynakAnahtar"='ODM8H:SOLO:'||p.uid
 LEFT JOIN "OfisAbonelik" a ON a.id=md5('ODM8H:SUB:'||p.oid)::uuid::text WHERE (p.kid IS NOT NULL AND (a.id IS NULL OR a."bitisTarihi" IS DISTINCT FROM p.ends OR a."paketKodu"<>'SOLO')) OR (p.kid IS NULL AND a.id IS NOT NULL)), 'solo abonelik sonucu farkli');
SELECT pg_temp.odm8h_assert((SELECT count(*)=(SELECT count(*) FROM h_solo) FROM h_solo p JOIN "OfisGecisDefteri" d ON d."kaynakAnahtar"='ODM8H:SOLO:'||p.uid
 JOIN "Office" o ON o.id=p.oid JOIN "UserCapability" c ON c."userId"=p.uid AND c.capability='OFFICE_OWNER'
 LEFT JOIN "OfisAbonelik" a ON a.id=md5('ODM8H:SUB:'||p.oid)::uuid::text LEFT JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||p.oid
 WHERE d.durum='ESLENDI' AND to_jsonb(o)=d."eskiSnapshot"::jsonb->'newOffice' AND to_jsonb(c)=d."eskiSnapshot"::jsonb->'newCapability'
 AND coalesce(to_jsonb(a),'null'::jsonb)=d."eskiSnapshot"::jsonb->'subscription' AND coalesce(s."valueJson"::jsonb,'null'::jsonb)=d."eskiSnapshot"::jsonb->'newLegacy'), 'solo defteri veya tekrar calisma snapshot farki');
SELECT pg_temp.odm8h_assert(NOT EXISTS(SELECT 1 FROM h_solo p WHERE
 (SELECT count(*) FROM "OfisAbonelik" a WHERE a."officeId"=p.oid)<>CASE WHEN p.kid IS NULL THEN 0 ELSE 1 END
 OR EXISTS(SELECT 1 FROM "OfisEklenti" e WHERE e."officeId"=p.oid)), 'solo ofiste beklenmeyen abonelik/eklenti');
SELECT "hedefKod",count(*) AS odm8h_defter FROM "OfisGecisDefteri" WHERE left("kaynakAnahtar",6)='ODM8H:' GROUP BY "hedefKod";
SELECT a."officeId",a."paketKodu",a."baslangicTarihi",a."bitisTarihi",a."kaynakKanal",a."hakSnapshot" FROM "OfisAbonelik" a WHERE a.metadata->>'migration'='ODM8H' ORDER BY a."officeId";
COMMIT;
