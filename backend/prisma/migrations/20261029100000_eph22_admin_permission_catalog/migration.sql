-- EPH-22: yönetici yetki kataloğu. Yalnızca ekleme yapar; mevcut kayıtlara dokunmaz.
-- Yeni tanımlar varsayılan KAPALI; mevcut ADMIN erişimi aşağıdaki rol politikasıyla korunur.

INSERT INTO "PermissionDefinition" ("id","key","category","label","description","defaultEnabled","delegable","superAdminOnly","active","createdAt","updatedAt") VALUES
  (gen_random_uuid()::text, 'USER_VIEW', 'Kullanıcı Yönetimi', 'Kullanıcı listesini görme', 'Kullanıcı listesi ve kullanıcı bilgileri', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_CREATE', 'Kullanıcı Yönetimi', 'Kullanıcı oluşturma', 'Yönetim ekranından yeni kullanıcı açma', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_APPROVE', 'Kullanıcı Yönetimi', 'Kullanıcı onaylama', 'Bekleyen kullanıcı kayıtlarını onaylama', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_DELETE', 'Kullanıcı Yönetimi', 'Kullanıcı reddetme / silme', 'Bekleyen kullanıcı kaydını reddetme ve silme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_SUSPEND', 'Kullanıcı Yönetimi', 'Kullanıcı askıya alma', 'Kullanıcı hesabını süreli veya kalıcı askıya alma', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ROLE_CHANGE', 'Kullanıcı Yönetimi', 'Kullanıcı rolü değiştirme', 'Kullanıcının rolünü değiştirme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CAPABILITY_MANAGE', 'Kullanıcı Yönetimi', 'Ek yetki (capability) yönetimi', 'Kullanıcıya ek yetenek tanımlama', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MEMBER_CODE_MANAGE', 'Kullanıcı Yönetimi', 'Üye kodu atama', 'Eksik veya tekil üye kodu atama', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SUPER_ADMIN_MANAGE', 'Kullanıcı Yönetimi', 'Süper Admin yönetimi', 'Süper Admin atama veya değiştirme', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DOCUMENT_VIEW', 'Başvuru ve Belgeler', 'Belgeleri görme', 'Meslek belgesi başvurularını görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DOCUMENT_APPROVE', 'Başvuru ve Belgeler', 'Belge onaylama', 'Meslek belgesi onaylama', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DOCUMENT_REJECT', 'Başvuru ve Belgeler', 'Belge reddetme', 'Meslek belgesi reddetme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'APPLICATION_VIEW', 'Başvuru ve Belgeler', 'Katılım taleplerini görme', 'Katılım ve başvuru taleplerini görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'APPLICATION_REVIEW', 'Başvuru ve Belgeler', 'Katılım talebi onay / ret / not', 'Katılım talebini onaylama, reddetme veya not ekleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'APPLICATION_DELETE', 'Başvuru ve Belgeler', 'Katılım talebi silme', 'Katılım talebini silme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'NOMINATION_VIEW', 'Başvuru ve Belgeler', 'Aday önerilerini görme', 'Aday öneri kayıtlarını görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'NOMINATION_MANAGE', 'Başvuru ve Belgeler', 'Aday önerisi durum / not', 'Aday önerisi durumunu ve notunu güncelleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'LEAD_VIEW', 'Başvuru ve Belgeler', 'Ön başvuruları (lead) görme', 'Web ve asistan ön başvuru kayıtlarını görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REFERRAL_VIEW', 'Referans ve Davet', 'Referans kodlarını görme', 'Referans kodu ve aday listesini görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REFERRAL_MANAGE', 'Referans ve Davet', 'Referans yönetimi', 'Referans adayı oluşturma, pasifleştirme ve silme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'INVITATION_VIEW', 'Referans ve Davet', 'Davetleri görme', 'Davet kayıtlarını görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PORTFOLIO_MODERATE', 'İçerik ve İlan Moderasyonu', 'Portföy onay ve moderasyon', 'Portföy onay kuyruğunu görme; inceleme, eksik bilgi isteme, onay, ret ve havuza gönderme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ANNOUNCEMENT_VIEW', 'İçerik ve İlan Moderasyonu', 'Duyuruları görme', 'Duyuru listesini görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ANNOUNCEMENT_MANAGE', 'İçerik ve İlan Moderasyonu', 'Duyuru yönetimi', 'Duyuru oluşturma, düzenleme ve silme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'KONTOR_GIFT_POOL_VIEW', 'PK ve Üyelik', 'Hediye PK havuzunu görme', 'Hediye PK havuzu bakiyesi ve hareketleri', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'KONTOR_GIFT_SEND', 'PK ve Üyelik', 'Hediye PK gönderme', 'Hediye PK havuzundan kullanıcıya PK gönderme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'KONTOR_POOL_LOAD', 'PK ve Üyelik', 'Hediye PK havuzuna yükleme', 'Hediye PK havuzuna PK yükleme', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MEMBERSHIP_VIEW', 'PK ve Üyelik', 'Üyelik paketlerini görme', 'Kullanıcı üyelik paketlerini görüntüleme', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MEMBERSHIP_CHANGE', 'PK ve Üyelik', 'Üyelik paketi değiştirme', 'Kullanıcı üyelik paketini değiştirme', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'TRIAL_EXTEND', 'PK ve Üyelik', 'Deneme süresi uzatma', 'Deneme süresini uzatma (sayısal limit: gün)', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SYSTEM_SETTING_MANAGE', 'Fiyat ve Sistem Ayarları', 'Fiyat, paket ve sistem ayarları', 'Ücret, PK, paket, limit ve kota değerleri', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ORGANIZATION_VIEW', 'Ofis ve Ekip', 'Ofis ve ekip bilgilerini görme', 'Ofis, ekip ve KPI görüntüleme', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ORGANIZATION_MANAGE', 'Ofis ve Ekip', 'Ofis ve ekip yönetimi', 'Ofis ve ekip oluşturma, düzenleme, lider ve üye atama', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REPORT_VIEW', 'Rapor ve Denetim', 'Rapor ve istatistikleri görme', 'Panel özeti, istatistik ve trafik raporları', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'AUDIT_VIEW', 'Rapor ve Denetim', 'Denetim kaydı özetini görme', 'Panel içinde denetim kaydı özeti', false, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PERMISSION_MANAGE', 'Rapor ve Denetim', 'Yetki yönetimi', 'Yetki Merkezi: yetki verme ve kısıtlama', false, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Moderatör rolü portföy moderasyonuna mevcut davranışla devam eder.
INSERT INTO "RolePermissionPolicy" ("id","role","permissionId","enabled","createdAt","updatedAt")
SELECT gen_random_uuid()::text, 'MODERATOR'::"Role", pd."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PermissionDefinition" pd
WHERE pd."key" = 'PORTFOLIO_MODERATE'
ON CONFLICT ("role","permissionId") DO NOTHING;

-- EPH-22-KONTROL: ADMIN'in EPH-22 öncesi erişebildiği uçları koru.
-- Mevcut kapalı politikalar, limitler ve kullanıcı override'ları aynen kalır.
INSERT INTO "RolePermissionPolicy" ("id","role","permissionId","enabled","createdAt","updatedAt")
SELECT gen_random_uuid()::text, 'ADMIN'::"Role", pd."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PermissionDefinition" pd
WHERE pd."superAdminOnly" = false AND pd."key" IN (
  'USER_VIEW', 'USER_CREATE', 'USER_APPROVE', 'USER_DELETE', 'USER_SUSPEND',
  'ROLE_CHANGE', 'CAPABILITY_MANAGE', 'MEMBER_CODE_MANAGE',
  'DOCUMENT_VIEW', 'DOCUMENT_APPROVE', 'DOCUMENT_REJECT',
  'APPLICATION_VIEW', 'APPLICATION_REVIEW', 'APPLICATION_DELETE',
  'NOMINATION_VIEW', 'NOMINATION_MANAGE', 'LEAD_VIEW',
  'REFERRAL_VIEW', 'REFERRAL_MANAGE', 'INVITATION_VIEW',
  'PORTFOLIO_MODERATE', 'ANNOUNCEMENT_VIEW', 'ANNOUNCEMENT_MANAGE',
  'KONTOR_GIFT_POOL_VIEW', 'KONTOR_GIFT_SEND', 'TRIAL_EXTEND',
  'ORGANIZATION_VIEW', 'ORGANIZATION_MANAGE', 'REPORT_VIEW'
)
ON CONFLICT ("role","permissionId") DO NOTHING;
