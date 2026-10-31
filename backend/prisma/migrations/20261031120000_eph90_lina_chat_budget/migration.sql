-- Additive setting seed only; preserves any administrator-configured value.
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt")
VALUES ('eph90-lina-chat-timeout', 'LINA_CHAT_TIMEOUT_MS', '22000'::jsonb,
        'Lina sohbet toplam süre bütçesi (ms), güvenli üst sınır 22000 ms', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
