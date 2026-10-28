BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(hashtext('eph:admin-email:v1'));
DO $$ BEGIN IF current_schema() <> 'public' THEN RAISE EXCEPTION 'Expected public schema'; END IF; END $$;
CREATE TABLE IF NOT EXISTS public."AdminEmailSetting" (
 "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main', "recipient" TEXT NOT NULL DEFAULT 'ephplatform@gmail.com',
 "enabled" BOOLEAN NOT NULL DEFAULT false, "captureEnabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdminEmailSetting_recipient_check" CHECK ("recipient" = 'ephplatform@gmail.com')
);
CREATE TABLE IF NOT EXISTS public."AdminEmailOutbox" (
 "id" TEXT NOT NULL PRIMARY KEY, "eventKey" TEXT NOT NULL, "recipient" TEXT NOT NULL,
 "category" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT, "title" TEXT NOT NULL, "summary" TEXT NOT NULL,
 "actorLabel" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
 "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3), "sentAt" TIMESTAMP(3),
 "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdminEmailOutbox_status_check" CHECK ("status" IN ('PENDING', 'SENDING', 'SENT', 'DEAD')),
 CONSTRAINT "AdminEmailOutbox_attempts_check" CHECK ("attempts" >= 0),
 CONSTRAINT "AdminEmailOutbox_recipient_check" CHECK ("recipient" = 'ephplatform@gmail.com')
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminEmailOutbox_eventKey_key" ON public."AdminEmailOutbox"("eventKey");
CREATE INDEX IF NOT EXISTS "AdminEmailOutbox_status_availableAt_idx" ON public."AdminEmailOutbox"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "AdminEmailOutbox_entityType_entityId_idx" ON public."AdminEmailOutbox"("entityType", "entityId");
INSERT INTO public."AdminEmailSetting"("id") VALUES ('main') ON CONFLICT ("id") DO NOTHING;

DO $$
DECLARE expected RECORD; actual_type TEXT; actual_nullable TEXT;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
('AdminEmailSetting', 'id', 'text', 'NO'),
('AdminEmailSetting', 'recipient', 'text', 'NO'),
('AdminEmailSetting', 'enabled', 'bool', 'NO'),
('AdminEmailSetting', 'captureEnabled', 'bool', 'NO'),
('AdminEmailSetting', 'createdAt', 'timestamp', 'NO'),
('AdminEmailSetting', 'updatedAt', 'timestamp', 'NO'),
('AdminEmailOutbox', 'id', 'text', 'NO'),
('AdminEmailOutbox', 'eventKey', 'text', 'NO'),
('AdminEmailOutbox', 'recipient', 'text', 'NO'),
('AdminEmailOutbox', 'category', 'text', 'NO'),
('AdminEmailOutbox', 'entityType', 'text', 'NO'),
('AdminEmailOutbox', 'entityId', 'text', 'YES'),
('AdminEmailOutbox', 'title', 'text', 'NO'),
('AdminEmailOutbox', 'summary', 'text', 'NO'),
('AdminEmailOutbox', 'actorLabel', 'text', 'YES'),
('AdminEmailOutbox', 'status', 'text', 'NO'),
('AdminEmailOutbox', 'attempts', 'int4', 'NO'),
('AdminEmailOutbox', 'availableAt', 'timestamp', 'NO'),
('AdminEmailOutbox', 'leaseToken', 'text', 'YES'),
('AdminEmailOutbox', 'leaseUntil', 'timestamp', 'YES'),
('AdminEmailOutbox', 'sentAt', 'timestamp', 'YES'),
('AdminEmailOutbox', 'lastErrorCode', 'text', 'YES'),
('AdminEmailOutbox', 'createdAt', 'timestamp', 'NO'),
('AdminEmailOutbox', 'updatedAt', 'timestamp', 'NO')
 ) AS cols(table_name, column_name, type_name, nullable) LOOP
   SELECT udt_name, is_nullable INTO actual_type, actual_nullable FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = expected.table_name AND column_name = expected.column_name;
   IF actual_type IS DISTINCT FROM expected.type_name OR actual_nullable IS DISTINCT FROM expected.nullable THEN
     RAISE EXCEPTION 'Incompatible admin email column: % . %', expected.table_name, expected.column_name;
   END IF;
 END LOOP;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='AdminEmailSetting') <> 6
 OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='AdminEmailOutbox') <> 18 THEN
   RAISE EXCEPTION 'Incompatible admin email schema';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.eph_admin_email_classify(source_table TEXT, r JSONB) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k TEXT; title TEXT; state TEXT; label TEXT; fingerprint JSONB;
BEGIN
 IF r IS NULL THEN RETURN NULL; END IF;
 CASE source_table
 WHEN 'User' THEN

 IF r->>'riskLevel' IN ('YUKSEK', 'KRITIK') THEN
   k := 'USER_RISK'; title := 'Yüksek riskli kullanıcı kontrol edilmeli'; state := r->>'riskLevel';
 ELSIF r->>'isVerified' = 'true' AND r->>'isApproved' = 'false' THEN
   k := 'USER_APPROVAL'; title := 'Üyelik hesabı onay bekliyor'; state := 'PENDING';
 ELSIF r->>'profileCompleted' = 'true' AND r->>'professionalVerificationStatus' IN ('PENDING', 'REVIEW_REQUIRED') THEN
   k := 'PROFESSIONAL_REVIEW'; title := 'Mesleki profil inceleme bekliyor'; state := r->>'professionalVerificationStatus';
 ELSE RETURN NULL; END IF;
 IF r->>'firstName' = 'Silinmis' OR r->>'phone' LIKE 'deleted-%' THEN RETURN NULL; END IF;
 label := concat_ws(' ', r->>'firstName', r->>'lastName');
 fingerprint := jsonb_build_array(k, state, r->>'role', r->>'professionalDocumentNumber');
 WHEN 'Document' THEN

 IF r->>'status' <> 'PENDING' THEN RETURN NULL; END IF;
 k := 'PROFESSIONAL_DOCUMENT'; title := 'Mesleki belge inceleme bekliyor'; state := r->>'status';
 fingerprint := jsonb_build_array(k, state, r->>'fileUrl', r->>'type');
 WHEN 'Application' THEN

 IF r->>'status' NOT IN ('PENDING', 'EVRAK_BEKLENIYOR', 'GORUSME_PLANLANDI') THEN RETURN NULL; END IF;
 k := 'APPLICATION'; title := 'Katılım başvurusu işlem bekliyor'; state := r->>'status'; label := r->>'applicantName';
 fingerprint := jsonb_build_array(k, state, r->>'isRisky', r->>'onayYetkiSeviyesi');
 WHEN 'Nomination' THEN

 IF r->>'status' <> 'PENDING' THEN RETURN NULL; END IF;
 k := 'NOMINATION'; title := 'Üye aday gösterimi onay bekliyor'; state := r->>'status'; label := r->>'candidateName';
 fingerprint := jsonb_build_array(k, state);
 WHEN 'Unit' THEN

 IF r->>'approvalStatus' NOT IN ('INCELEMEYE_GONDERILDI', 'INCELEMEDE') THEN RETURN NULL; END IF;
 k := 'PORTFOLIO_REVIEW'; title := 'Portföy yayın incelemesi bekliyor'; state := 'REVIEW';
 fingerprint := jsonb_build_array(k, state);
 WHEN 'PortfolioAuthorityDocument' THEN

 IF r->>'approved' <> 'false' OR nullif(r->>'rejectReason', '') IS NOT NULL THEN RETURN NULL; END IF;
 k := 'PORTFOLIO_DOCUMENT'; title := 'Portföy yetki belgesi inceleme bekliyor'; state := 'PENDING';
 fingerprint := jsonb_build_array(k, state, r->>'fileUrl', r->>'authorityType', r->>'riskLevel');
 WHEN 'ProjectDesignReviewRequest' THEN

 IF r->>'status' NOT IN ('BEKLIYOR', 'INCELEMEDE') THEN RETURN NULL; END IF;
 k := 'PROJECT_DESIGN_REVIEW'; title := 'Proje tasarım incelemesi bekliyor'; state := 'REVIEW';
 fingerprint := jsonb_build_array(k, state, r->>'userMessage', r->>'attachments');
 WHEN 'Report' THEN

 IF r->>'status' NOT IN ('ACIK', 'INCELENIYOR') THEN RETURN NULL; END IF;
 k := 'CONTENT_REPORT'; title := 'Yeni içerik şikâyeti inceleme bekliyor'; state := 'REVIEW';
 fingerprint := jsonb_build_array(k, state, r->>'reason', r->>'description');
 WHEN 'AccountDeletionRequest' THEN

 IF r->>'status' <> 'PENDING' THEN RETURN NULL; END IF;
 k := 'ACCOUNT_DELETION'; title := 'Hesap silme talebi oluşturuldu'; state := 'PENDING';
 fingerprint := jsonb_build_array(k, state, r->>'scheduledDeletionAt');
 WHEN 'Lead' THEN

 k := 'LEAD'; title := 'Yeni iletişim ve ilgi kaydı oluştu'; state := 'NEW'; label := r->>'fullName';
 fingerprint := jsonb_build_array(k, r->>'id');
 WHEN 'PaymentOrder' THEN

 IF r->>'durum' <> 'FAILED' THEN RETURN NULL; END IF;
 k := 'PAYMENT_FAILED'; title := 'Başarısız ödeme kontrol edilmeli'; state := 'FAILED';
 fingerprint := jsonb_build_array(k, state);
 WHEN 'PaymentRefund' THEN

 IF r->>'durum' NOT IN ('CREATED', 'PENDING', 'FAILED') THEN RETURN NULL; END IF;
 k := 'PAYMENT_REFUND'; title := 'İade işlemi kontrol edilmeli'; state := CASE WHEN r->>'durum' = 'FAILED' THEN 'FAILED' ELSE 'PENDING' END;
 fingerprint := jsonb_build_array(k, state, r->>'tutar');
 WHEN 'PaymentTransaction' THEN

 IF r->>'islemTuru' <> 'CHARGEBACK' AND r->>'durum' <> 'FAILED' THEN RETURN NULL; END IF;
 k := 'PAYMENT_TRANSACTION'; title := 'Ödeme işleminde müdahale gerektiren kayıt'; state := concat_ws(':', r->>'islemTuru', r->>'durum');
 fingerprint := jsonb_build_array(k, state);
 WHEN 'PaymentWebhookEvent' THEN

 IF nullif(r->>'errorMessage', '') IS NULL THEN RETURN NULL; END IF;
 k := 'PAYMENT_WEBHOOK'; title := 'Ödeme bildirimi işlenemedi'; state := 'ERROR';
 fingerprint := jsonb_build_array(k, state, r->>'errorMessage');
 WHEN 'AdminActionLog' THEN

 k := 'ADMIN_ACTION'; title := 'Yönetim işlemi gerçekleştirildi'; state := coalesce(r->>'action', 'UNKNOWN');
 fingerprint := jsonb_build_array(k, r->>'id');
 WHEN 'AuditLog' THEN

 IF r->>'action' IN ('LOGIN', 'LOGOUT', 'VIEW_USER', 'VIEW_APPLICATION', 'VIEW_AUDIT_LOG') THEN RETURN NULL; END IF;
 k := 'ADMIN_AUDIT'; title := 'Yetki, sistem veya yönetim işlemi kaydedildi'; state := r->>'action';
 fingerprint := jsonb_build_array(k, r->>'id');
 WHEN 'UserRestriction' THEN

 k := 'USER_RESTRICTION'; title := 'Kullanıcı kısıtlaması değişti'; state := concat_ws(':', r->>'isActive', r->>'type', r->>'liftedAt');
 fingerprint := jsonb_build_array(k, state);
 WHEN 'LinaDenetim' THEN

 IF r->>'cozulduMu' <> 'false' OR (r->>'denetimTuru' NOT IN ('HATA', 'YETKI_IHLALI', 'GUVENLIK') AND r->>'riskSeviyesi' NOT IN ('YUKSEK', 'KRITIK')) THEN RETURN NULL; END IF;
 k := 'SYSTEM_REVIEW'; title := 'Lina denetim kaydı incelenmeli'; state := concat_ws(':', r->>'denetimTuru', r->>'riskSeviyesi');
 fingerprint := jsonb_build_array(k, state);
 WHEN 'Project' THEN

 IF r->>'needsSoftwareTeamReview' <> 'true' THEN RETURN NULL; END IF;
 k := 'PROJECT_SOFTWARE_REVIEW'; title := 'Proje Yazılım Ekibi incelemesi bekliyor'; state := 'REVIEW'; label := r->>'name';
 fingerprint := jsonb_build_array(k, state);

 WHEN 'Invitation' THEN

 IF nullif(r->>'epostaHataMesaji', '') IS NULL THEN RETURN NULL; END IF;
 k := 'INVITATION_EMAIL_FAILED'; title := 'Üye davet e-postası gönderilemedi'; state := 'ERROR';
 fingerprint := jsonb_build_array(k, state, r->>'epostaHataMesaji');

 WHEN 'LinaEpostaGonderimKaydi' THEN

 IF r->>'durum' <> 'HATA' THEN RETURN NULL; END IF;
 k := 'LINA_EMAIL_FAILED'; title := 'Lina e-posta gönderimi başarısız'; state := 'ERROR';
 fingerprint := jsonb_build_array(k, state);

 ELSE RETURN NULL;
 END CASE;
 RETURN jsonb_build_object('category', k, 'title', title, 'state', state, 'actorLabel', left(label, 160), 'summary', CASE WHEN k IN ('ADMIN_ACTION', 'ADMIN_AUDIT') THEN 'Yönetim işlemi kaydedildi: ' || state WHEN k = 'CONTENT_REPORT' THEN 'Şikâyet edilen içerik yetkili ekip tarafından incelenmeli.' ELSE 'İlgili kaydı yönetim ekranından kontrol edin.' END, 'fingerprint', md5(fingerprint::TEXT));
END $$;
CREATE OR REPLACE FUNCTION public.eph_capture_admin_email() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE next_event JSONB; previous_event JSONB; next_row JSONB; event_key TEXT;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public."AdminEmailSetting" WHERE "id" = 'main' AND "captureEnabled" = true) THEN RETURN NEW; END IF;
 next_row := to_jsonb(NEW);
 next_event := public.eph_admin_email_classify(TG_TABLE_NAME, next_row);
 IF next_event IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME = 'PortfolioAuthorityDocument' AND NOT EXISTS (
   SELECT 1 FROM public."Unit" WHERE "id" = next_row->>'unitId' AND "approvalStatus"::TEXT IN ('INCELEMEYE_GONDERILDI', 'INCELEMEDE')
 ) THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN
   IF TG_TABLE_NAME = 'User' AND next_event->>'category' = 'USER_APPROVAL' AND to_jsonb(OLD)->>'isApproved' = 'true' THEN RETURN NEW; END IF;
   previous_event := public.eph_admin_email_classify(TG_TABLE_NAME, to_jsonb(OLD));
   IF previous_event->>'fingerprint' = next_event->>'fingerprint' THEN RETURN NEW; END IF;
 END IF;
 event_key := md5(TG_TABLE_NAME || ':' || (next_row->>'id') || ':' || (next_event->>'category') || ':' || txid_current()::TEXT || ':' || (next_event->>'fingerprint'));
 INSERT INTO public."AdminEmailOutbox" ("id", "eventKey", "recipient", "category", "entityType", "entityId", "title", "summary", "actorLabel", "updatedAt")
 VALUES ('evt_' || event_key, event_key, 'ephplatform@gmail.com', next_event->>'category', TG_TABLE_NAME, next_row->>'id',
   next_event->>'title', next_event->>'summary', next_event->>'actorLabel', CURRENT_TIMESTAMP)
 ON CONFLICT ("eventKey") DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS "eph_admin_email_user" ON public."User";
CREATE TRIGGER "eph_admin_email_user" AFTER INSERT OR UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_document" ON public."Document";
CREATE TRIGGER "eph_admin_email_document" AFTER INSERT OR UPDATE ON public."Document" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_application" ON public."Application";
CREATE TRIGGER "eph_admin_email_application" AFTER INSERT OR UPDATE ON public."Application" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_nomination" ON public."Nomination";
CREATE TRIGGER "eph_admin_email_nomination" AFTER INSERT OR UPDATE ON public."Nomination" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_unit" ON public."Unit";
CREATE TRIGGER "eph_admin_email_unit" AFTER INSERT OR UPDATE ON public."Unit" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_portfolioauthoritydocument" ON public."PortfolioAuthorityDocument";
CREATE TRIGGER "eph_admin_email_portfolioauthoritydocument" AFTER INSERT OR UPDATE ON public."PortfolioAuthorityDocument" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_projectdesignreviewrequest" ON public."ProjectDesignReviewRequest";
CREATE TRIGGER "eph_admin_email_projectdesignreviewrequest" AFTER INSERT OR UPDATE ON public."ProjectDesignReviewRequest" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_report" ON public."Report";
CREATE TRIGGER "eph_admin_email_report" AFTER INSERT OR UPDATE ON public."Report" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_accountdeletionrequest" ON public."AccountDeletionRequest";
CREATE TRIGGER "eph_admin_email_accountdeletionrequest" AFTER INSERT OR UPDATE ON public."AccountDeletionRequest" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_lead" ON public."Lead";
CREATE TRIGGER "eph_admin_email_lead" AFTER INSERT OR UPDATE ON public."Lead" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_paymentorder" ON public."PaymentOrder";
CREATE TRIGGER "eph_admin_email_paymentorder" AFTER INSERT OR UPDATE ON public."PaymentOrder" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_paymentrefund" ON public."PaymentRefund";
CREATE TRIGGER "eph_admin_email_paymentrefund" AFTER INSERT OR UPDATE ON public."PaymentRefund" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_paymenttransaction" ON public."PaymentTransaction";
CREATE TRIGGER "eph_admin_email_paymenttransaction" AFTER INSERT OR UPDATE ON public."PaymentTransaction" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_paymentwebhookevent" ON public."PaymentWebhookEvent";
CREATE TRIGGER "eph_admin_email_paymentwebhookevent" AFTER INSERT OR UPDATE ON public."PaymentWebhookEvent" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_adminactionlog" ON public."AdminActionLog";
CREATE TRIGGER "eph_admin_email_adminactionlog" AFTER INSERT OR UPDATE ON public."AdminActionLog" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_auditlog" ON public."AuditLog";
CREATE TRIGGER "eph_admin_email_auditlog" AFTER INSERT OR UPDATE ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_userrestriction" ON public."UserRestriction";
CREATE TRIGGER "eph_admin_email_userrestriction" AFTER INSERT OR UPDATE ON public."UserRestriction" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_linadenetim" ON public."LinaDenetim";
CREATE TRIGGER "eph_admin_email_linadenetim" AFTER INSERT OR UPDATE ON public."LinaDenetim" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_project" ON public."Project";
CREATE TRIGGER "eph_admin_email_project" AFTER INSERT OR UPDATE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_invitation" ON public."Invitation";
CREATE TRIGGER "eph_admin_email_invitation" AFTER INSERT OR UPDATE ON public."Invitation" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DROP TRIGGER IF EXISTS "eph_admin_email_linaepostagonderimkaydi" ON public."LinaEpostaGonderimKaydi";
CREATE TRIGGER "eph_admin_email_linaepostagonderimkaydi" AFTER INSERT OR UPDATE ON public."LinaEpostaGonderimKaydi" FOR EACH ROW EXECUTE FUNCTION public.eph_capture_admin_email();
DO $$
DECLARE table_name TEXT; amount BIGINT; counts TEXT := ''; extra TEXT;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public."AdminEmailOutbox" WHERE "eventKey" = 'INSTALL_PENDING_DIGEST_V1') THEN
  SELECT count(*) INTO amount FROM public."User" t WHERE public.eph_admin_email_classify('User', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Üyelik ve mesleki profil: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Document" t WHERE public.eph_admin_email_classify('Document', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Mesleki belge: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Application" t WHERE public.eph_admin_email_classify('Application', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Katılım başvurusu: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Nomination" t WHERE public.eph_admin_email_classify('Nomination', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Aday gösterimi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Unit" t WHERE public.eph_admin_email_classify('Unit', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Portföy incelemesi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."PortfolioAuthorityDocument" t WHERE public.eph_admin_email_classify('PortfolioAuthorityDocument', to_jsonb(t)) IS NOT NULL AND EXISTS (SELECT 1 FROM public."Unit" u WHERE u."id" = t."unitId" AND u."approvalStatus"::TEXT IN ('INCELEMEYE_GONDERILDI', 'INCELEMEDE'));
  IF amount > 0 THEN counts := counts || 'Portföy belgesi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."ProjectDesignReviewRequest" t WHERE public.eph_admin_email_classify('ProjectDesignReviewRequest', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Proje tasarım incelemesi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Report" t WHERE public.eph_admin_email_classify('Report', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'İçerik şikâyeti: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."AccountDeletionRequest" t WHERE public.eph_admin_email_classify('AccountDeletionRequest', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Hesap silme talebi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."PaymentRefund" t WHERE public.eph_admin_email_classify('PaymentRefund', to_jsonb(t)) IS NOT NULL AND t."durum"::TEXT IN ('CREATED', 'PENDING');
  IF amount > 0 THEN counts := counts || 'İade işlemi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."LinaDenetim" t WHERE public.eph_admin_email_classify('LinaDenetim', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Lina denetimi: ' || amount::TEXT || E'\n'; END IF;
  SELECT count(*) INTO amount FROM public."Project" t WHERE public.eph_admin_email_classify('Project', to_jsonb(t)) IS NOT NULL;
  IF amount > 0 THEN counts := counts || 'Yazılım Ekibi proje incelemesi: ' || amount::TEXT || E'\n'; END IF;
  INSERT INTO public."AdminEmailOutbox" ("id", "eventKey", "recipient", "category", "entityType", "title", "summary", "updatedAt")
  VALUES ('install_pending_digest_v1', 'INSTALL_PENDING_DIGEST_V1', 'ephplatform@gmail.com', 'INSTALL_DIGEST', 'System', 'Yönetici bildirimleri hazır: mevcut bekleyen işler',
    CASE WHEN counts = '' THEN 'Kurulum anında bekleyen işlem bulunmadı. Yeni işlemler ayrı e-posta ile bildirilecek.' ELSE E'Kurulum anında bekleyen kayıt sayıları:\n' || counts END, CURRENT_TIMESTAMP)
  ON CONFLICT ("eventKey") DO NOTHING;
 END IF;
END $$;
COMMIT;
