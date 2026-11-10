-- ODM-8H. CALISTIRILMADI. Once kontrol SQL: 6 hedef ofis UYUMLU, bakim suruyor.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='10s';
LOCK TABLE "SystemSetting", "OfisAbonelik", "OfisGecisDefteri" IN SHARE ROW EXCLUSIVE MODE;
SELECT key,"valueJson" AS once FROM "SystemSetting" WHERE key='OFFICE_ENTITLEMENT_SOURCE';
DO $$ BEGIN
 IF (SELECT count(*) FROM "OfisGecisDefteri" d JOIN "OfisAbonelik" a ON a.id=d."eskiSnapshot"::jsonb->'subscription'->>'id'
     JOIN "SystemSetting" s ON s.key='OFFICE_SUBSCRIPTION_'||a."officeId"
     WHERE left(d."kaynakAnahtar",13)='ODM8H:OFFICE:' AND d.durum='ESLENDI' AND a.durum='AKTIF'
       AND to_jsonb(a)=d."eskiSnapshot"::jsonb->'subscription' AND s."valueJson"::jsonb=d."eskiSnapshot"::jsonb->'legacy'
       AND s."valueJson"->>'active' IS DISTINCT FROM 'false' AND s."valueJson"->>'ended' IS DISTINCT FROM 'true'
       AND a."paketKodu"=s."valueJson"->>'packageCode' AND a."baslangicTarihi"<=now() AT TIME ZONE 'UTC'
       AND a."bitisTarihi">now() AT TIME ZONE 'UTC' AND a."bitisTarihi"=((s."valueJson"->>'expiresAt')::timestamptz AT TIME ZONE 'UTC'))<>6
 THEN RAISE EXCEPTION 'ODM8H ROLLBACK: 6 canli eslesme yok'; END IF;
 IF EXISTS(SELECT 1 FROM "OfisGecisDefteri" d WHERE left(d."kaynakAnahtar",13)='ODM8H:OFFICE:' AND
   (SELECT count(*) FROM "OfisAbonelik" a WHERE a."officeId"=d."officeId" AND a.durum IN ('AKTIF','GRACE'))<>1)
 THEN RAISE EXCEPTION 'ODM8H ROLLBACK: tek secilebilir abonelik sarti'; END IF;
 IF (SELECT count(*) FROM "OfisGecisDefteri" d JOIN "OfisAbonelik" a ON a.id=d."eskiSnapshot"::jsonb->'subscription'->>'id'
   WHERE left(d."kaynakAnahtar",11)='ODM8H:SOLO:' AND d.durum='ESLENDI' AND d."hedefKod"='SOLO' AND a."paketKodu"='SOLO' AND a.durum='AKTIF' AND a."bitisTarihi">now() AT TIME ZONE 'UTC')<>1
 THEN RAISE EXCEPTION 'ODM8H ROLLBACK: 18c SOLO tam 1 olmali'; END IF;
END $$;
WITH changed AS (UPDATE "SystemSetting" SET "valueJson"='"relational"'::jsonb WHERE key='OFFICE_ENTITLEMENT_SOURCE' AND "valueJson"::jsonb='"legacy"'::jsonb RETURNING key)
SELECT count(*)=1 AS odm8h_tek_satir FROM changed
\gset
\if :odm8h_tek_satir
SELECT key,"valueJson" AS sonra FROM "SystemSetting" WHERE key='OFFICE_ENTITLEMENT_SOURCE';
COMMIT;
\else
ROLLBACK;
\echo 'ODM8H ROLLBACK: legacy kaynakli tam 1 satir guncellenmedi.'
DO $$ BEGIN RAISE EXCEPTION 'ODM8H: tek satir kosulu saglanmadi; transaction geri alindi'; END $$;
\endif
