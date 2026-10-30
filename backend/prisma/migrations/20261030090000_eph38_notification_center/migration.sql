-- Additive only. Apply separately after review; this task does not execute migrations.
ALTER TABLE "NetworkNotification"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'NETWORK',
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'BILGI',
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "eventKey" TEXT,
  ADD COLUMN "pushStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "pushAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pushAttemptedAt" TIMESTAMP(3),
  ADD CONSTRAINT "NetworkNotification_priority_check" CHECK ("priority" IN ('ACIL', 'ONEMLI', 'BILGI'));
CREATE UNIQUE INDEX "NetworkNotification_eventKey_key" ON "NetworkNotification"("eventKey");
CREATE INDEX "NetworkNotification_userId_isRead_priority_idx" ON "NetworkNotification"("userId", "isRead", "priority");
CREATE INDEX "NetworkNotification_pushStatus_pushAttemptedAt_idx" ON "NetworkNotification"("pushStatus", "pushAttemptedAt");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "MatchScanAttempt_status_sourceType_completedAt_idx" ON "MatchScanAttempt"("status", "sourceType", "completedAt");
-- Deployment watermark prevents historical message/credit/role events from sending pushes.
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "createdAt", "updatedAt")
VALUES ('eph38-notifications-since', 'EPH38_NOTIFICATIONS_SINCE', to_jsonb(CURRENT_TIMESTAMP::text), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
-- No invented commercial default; super admin sets this value through the existing audited settings API.
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
VALUES ('eph38-low-pk-limit', 'LIMIT_PK_DUSUK_UYARI', '{"value": null}'::jsonb,
  'Düşük PK bildirim eşiği; süper admin pozitif tam sayı tanımlamalıdır.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
