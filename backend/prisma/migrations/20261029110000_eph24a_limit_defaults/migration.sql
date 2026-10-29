-- EPH-24A: admin hediye PK, takım danışman ve deneme politikası ayarları. Yalnız yoksa eklenir; mevcut değerlere dokunmaz.
INSERT INTO "SystemSetting" ("id", "key", "valueJson", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI', '{"value": [100, 250, 500]}'::jsonb, 'ADMIN rolünün tek seferde gönderebileceği hediye PK tutarları (liste, ör. 100, 250, 500).', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_ADMIN_HEDIYE_GUNLUK_PK', '{"value": 5000}'::jsonb, 'Bir ADMIN hesabının günde gönderebileceği toplam hediye PK.', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_ALICI_ADMIN_HEDIYE_ADET', '{"value": 2}'::jsonb, 'Bir kullanıcının ADMIN hesaplarından alabileceği en fazla hediye PK işlemi sayısı.', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK', '{"value": 1000}'::jsonb, 'Bir kullanıcının ADMIN hesaplarından alabileceği toplam hediye PK.', now(), now()),
  (gen_random_uuid()::text, 'LIMIT_TAKIM_DANISMAN', '{"value": 10}'::jsonb, 'Bir takımdaki en fazla aktif danışman sayısı.', now(), now()),
  (gen_random_uuid()::text, 'TRIAL_INITIAL_DAYS', '{"value": 14}'::jsonb, 'İlk deneme süresi (gün). Paketin denemeGunSayisi alanı doluysa o öncelikli.', now(), now()),
  (gen_random_uuid()::text, 'TRIAL_EXTENSION_DAYS', '{"value": 14}'::jsonb, 'Her deneme uzatmasının gün sayısı.', now(), now()),
  (gen_random_uuid()::text, 'TRIAL_MAX_EXTENSIONS', '{"value": 1}'::jsonb, 'Bir kullanıcı için en fazla deneme uzatma sayısı.', now(), now())
ON CONFLICT ("key") DO NOTHING;
