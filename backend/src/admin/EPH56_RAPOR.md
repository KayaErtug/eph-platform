# EPH-56 — Admin, mesleki belge onayı, deneme süresi

Tarih: 2026-10-30. Backend yerel düzeltme/test teslimidir; deploy/commit yapılmadı. Mobil, `src/lina/`, `test/lina-regression/`, Prisma şeması ve paket dosyalarına yazılmadı.

## A — Murat YAVUZ: ret sebebi kullanıcıya özel kapalı izin

Backend `.env` bağlantısıyla SELECT yapıldı. İşlem `BEGIN READ ONLY` içinde çalıştı; `SELECT current_setting('transaction_read_only')` sonucu `on`; sonunda `ROLLBACK`. Veri değiştiren SQL çalıştırılmadı. Natro/PM2'nin bu bağlantıyla aynı DB'yi kullandığı ayrıca doğrulanmadı.

DB bulgusu: Murat YAVUZ'un `User.role=ADMIN`, `isApproved=true`. İzin sistemi:

- `PermissionDefinition`: `key`, `active`, `superAdminOnly`, `defaultEnabled`, `defaultNumericLimit`.
- `RolePermissionPolicy`: `role`, `permissionId`, `enabled`, `numericLimit`, `metadata`.
- `UserPermissionOverride`: `userId`, `permissionId`, `enabled`, `numericLimit`, `validFrom`, `validUntil`, `metadata`.

| Anahtar | Rol politikası | Kullanıcı override | Etkin sonuç |
|---|---|---|---|
| REPORT_VIEW | true | **false**, başlangıç/bitiş null | **Kapalı** |
| USER_CREATE | true | false, başlangıç/bitiş null | Kapalı |
| KONTOR_GIFT_SEND | true | false, başlangıç/bitiş null | Kapalı |
| DOCUMENT_VIEW / DOCUMENT_APPROVE / DOCUMENT_REJECT | true | Yok | Açık |
| USER_VIEW / USER_APPROVE / USER_SUSPEND / TRIAL_EXTEND | true | Yok | Açık |

SELECT edilen tanımlar içinde yalnız yukarıdaki üç anahtarda kullanıcıya özel false kaydı görüldü. REPORT_VIEW tanımı aktif, `superAdminOnly=false`, `defaultEnabled=true`. ADMIN rolünde ayrıca AUDIT_VIEW, CAPABILITY_MANAGE, GIFT_PK, MEMBERSHIP_CHANGE, ROLE_CHANGE, USER_DELETE kapalı; süper admin yönetimi, izin merkezi ve sistem ayarları anahtarları süper admine ayrılmış.

Hata yolu:

- `src/admin/admin.controller.ts:35-60`: sınıf ADMIN/SUPER_ADMIN kabul eder; `GET /admin/stats` ve `GET /admin/dashboard-summary` için `REPORT_VIEW` gerekir. Bu iki uç yalnız SUPER_ADMIN'e kilitli değildir.
- `src/auth/guards/permission.guard.ts:35-41`: `resolvePermission` sonucundaki `enabled=false` için tam görülen “Bu işlem için yetkiniz yok.” hatasını üretir.
- `src/auth/permission.resolver.ts:23-24`: SUPER_ADMIN DB'deki kapalı kayıtlardan bağımsız geçer.
- Aynı dosya `:39-62`: etkin kullanıcı override'ı rol politikasını ezer. Süresi sınırsız false kayıt bu nedenle belirleyicidir.
- `src/admin/admin.service.ts:685` ve `:730`: servis de REPORT_VIEW uygular; dashboard içindeki AUDIT_VIEW ayrıca yalnız denetim bölümünü sınırlar.
- Mobil `src/app/admin/index.tsx:242,254`: iki ucu çağırır ve gelen 403 mesajlarını ekrana taşır.

**A için DB verisi düzeltilmeden bu iki 403 devam eder.** İzin resolver'ı doğru davranıyor; kullanıcıya özel false kaydı kodla yok sayılmadı. Süper admin mevcut “Yetkileri yönet” ekranında Murat'ın REPORT_VIEW iznini açmalı veya yalnız bu override'ı kaldırmalıdır. Mevcut işlemler: `PATCH /admin/permission-center/users/:id/permissions/REPORT_VIEW` gövde `{enabled:true}` veya aynı adresin DELETE işlemiyle rol politikasına dönüş. Bu görevde ikisi de çalıştırılmadı. Ayrı USER_CREATE ve KONTOR_GIFT_SEND reddi korunur.

Ek §0 düzeltmesi: kimliği doğrulanmış SUPER_ADMIN, `JwtAuthGuard` içindeki mesleki doğrulama/ofis onboarding kontrollerini aşar (`src/auth/guards/jwt-auth.guard.ts:31`). JWT kimlik doğrulaması önce çalışır; başarısız kimlik doğrulaması aşılmaz. ADMIN ve diğer rollerin onboarding davranışı değişmez.

### Yönetim uçları / mevcut tasarım

Tabloda `izinli ADMIN`, etkin PermissionDefinition + rol politikası/kullanıcı override'ı şartını ifade eder. SUPER_ADMIN hepsinde guard izinlerini aşar. Tablo AdminController ve onun admin alt controller'larını kapsar.

| Uç | Anahtar / ek kontrol | Erişim |
|---|---|---|
| GET `/admin/stats`, `/admin/dashboard-summary`, `/admin/traffic-summary` | REPORT_VIEW | İzinli ADMIN |
| GET `/admin/users` | USER_VIEW | İzinli ADMIN |
| PATCH `/admin/users/:id/approve` | USER_APPROVE | İzinli ADMIN |
| PATCH `/admin/users/:id/suspend` | USER_SUSPEND; ADMIN için mevcut hedef/süre/sıklık kontrolleri | İzinli ADMIN |
| PATCH `/admin/users/:id/role` | ROLE_CHANGE; SUPER_ADMIN hedef/ataması ayrıca SUPER_ADMIN_MANAGE | İzinli ADMIN; mevcut özel hedef koruması |
| PATCH `/admin/users/:id/capabilities` | CAPABILITY_MANAGE | İzinli ADMIN |
| POST `/admin/users` | USER_CREATE + servis requireSoftwareTeam (`admin.service.ts:1800`) | Mevcut servis tasarımında yalnız SUPER_ADMIN |
| DELETE `/admin/users/:id/reject` | USER_DELETE + servis requireSoftwareTeam (`:1506`) | Mevcut servis tasarımında yalnız SUPER_ADMIN |
| PATCH `/admin/users/member-codes/missing`, `/admin/users/:id/member-code` | MEMBER_CODE_MANAGE + servis requireSoftwareTeam (`:2000`, `:1911`) | Mevcut servis tasarımında yalnız SUPER_ADMIN |
| GET `/admin/referrals` | REFERRAL_VIEW | İzinli ADMIN |
| POST `/admin/referrals`, PATCH `/admin/referrals/:id/deactivate` | REFERRAL_MANAGE | İzinli ADMIN |
| DELETE `/admin/referrals/:id` | REFERRAL_MANAGE + servis requireSoftwareTeam (`:2220`) | Mevcut servis tasarımında yalnız SUPER_ADMIN |
| GET `/admin/invitations` | INVITATION_VIEW | İzinli ADMIN |
| GET `/admin/documents` | DOCUMENT_VIEW | İzinli MODERATOR/ADMIN; SUPER_ADMIN |
| PATCH `/admin/documents/:id/approve`, `/:id/reject` | DOCUMENT_APPROVE / DOCUMENT_REJECT | İzinli MODERATOR/ADMIN; SUPER_ADMIN |
| GET `/admin/nominations`, PATCH `/admin/nominations/:id/status` | NOMINATION_VIEW / NOMINATION_MANAGE | İzinli ADMIN |
| GET `/admin/applications`, `/admin/katilim-talepleri`, `/admin/katilim-talepleri/:id` | APPLICATION_VIEW | İzinli ADMIN |
| PATCH `/admin/applications/:id/status`, `/admin/katilim-talepleri/:id/onayla`, `/:id/reddet`, `/:id/not` | APPLICATION_REVIEW | İzinli ADMIN |
| DELETE `/admin/katilim-talepleri/:id` | APPLICATION_DELETE + servis requireSoftwareTeam (`:2705`) | Mevcut servis tasarımında yalnız SUPER_ADMIN |
| GET `/admin/users/:id/membership-packages`, PATCH `/admin/users/:id/membership` | Metot rolü SUPER_ADMIN + servis denetimi | Yalnız SUPER_ADMIN |
| PATCH `/admin/users/:id/trial-extend` | TRIAL_EXTEND; ADMIN limitleri | İzinli ADMIN; SUPER_ADMIN limit istisnası |
| GET `/admin/trial-policy` | ADMIN/SUPER_ADMIN rolü | ADMIN ve SUPER_ADMIN |
| GET `/admin/system-settings`, PATCH `/admin/system-settings/:key` | Metot rolü SUPER_ADMIN | Yalnız SUPER_ADMIN |
| GET `/admin/permission-center/definitions`, `/admin/permission-center/users/:id` | Metot rolü SUPER_ADMIN | Yalnız SUPER_ADMIN |
| PATCH/DELETE `/admin/permission-center/users/:id/permissions/:permissionKey`, PUT `/admin/permission-center/users/:id/permissions` | Metot rolü SUPER_ADMIN | Yalnız SUPER_ADMIN |
| GET/POST `/admin/announcements`, PATCH/DELETE `/admin/announcements/:id` | ANNOUNCEMENT_VIEW / ANNOUNCEMENT_MANAGE | İzinli ADMIN |
| GET `/admin/audit-log` | Alt controller rolü SUPER_ADMIN | Yalnız SUPER_ADMIN |

Önemli tasarım ayrımı: Bazı devredilebilir katalog anahtarlarının arkasında ayrıca `requireSoftwareTeam` vardır. Bunlar tabloda açıkça işaretlendi; bu görevin iki rapor 403'ü bu ek kontrollerden kaynaklanmıyor. Bu özel yönetim mutation sınırları topluca açılmadı. MODERATOR yalnız üç belge ucuna eklendi; kullanıcı yönetimi, istatistik, paket ve izin yönetimi ona açılmadı.

## B — Mesleki belgeler

Akış yerleri:

- `POST /auth/register/professional-document`: `src/auth/auth.controller.ts:51`; yükleme `src/auth/registration/registration-v2.service.ts:245-280`. Supabase Storage `documents` bucket'ına `pending-registration/<pendingId>/...` yolu yüklenir, `PendingRegistration.professionalDocumentUrl/Name/Mime` alanlarına referans yazılır.
- Eski tam kayıt yolunda `src/auth/registration/registration-v2.service.ts:518` Document satırı oluşturur. PROFILE_ONBOARDING yolu `:448-495` hesap oluşturur, belge yüklemesini profile bırakır.
- `POST /profile/documents`: `src/profile/profile.controller.ts:147`; `src/profile/profile.service.ts:708,799-836` dosyayı aynı bucket'a `<userId>/<type>_<time>.<ext>` biçiminde yükler, `Document` satırını oluşturur/günceller ve PENDING yapar.
- Tablo `Document`: `userId`, `type`, `status`, `fileUrl`, `fileName`, tarihler (`prisma/schema.prisma:467`). Dosya DB içinde tutulmaz; `fileUrl` storage referansıdır.
- Liste/onay/red: `src/admin/admin.controller.ts:198,208,215`; servis `src/admin/admin.service.ts:2398,2447,2497`. Liste imzalı URL üretir; belge onayı zorunlu belge durumunu senkronlar, uygun durumda mevcut `startTrialMembership` akışını çağırır. Görüntüleme URL'si `admin.service.ts:55` üzerinden 300 saniye geçerlidir.

**Kök nedenler / bulgular:**

1. Backend controller sınıfının ADMIN/SUPER_ADMIN rol filtresi MODERATOR'ı belge uçlarına gelmeden kesiyordu. Üç belge metoduna açık MODERATOR/ADMIN/SUPER_ADMIN listesi eklendi. DOCUMENT_VIEW/APPROVE/REJECT guard'ları ve servis kontrolleri çalışmaya devam eder. DB'de bu üç tanım aktif ve `defaultEnabled=true`; ADMIN rol politikaları true; MODERATOR için ayrı rol politikası bulunmadı, mevcut varsayılanı kullanır. Özel kapalı izin verilirse MODERATOR/ADMIN yine reddedilir.
2. Mobil ekran **var**: `/admin/document-verification`, `src/app/admin/document-verification.tsx:73`. `:75` üzerindeki `useAdminAccess(true)` yalnız ADMIN/SUPER_ADMIN kabul eder (`src/admin/ui.tsx:18`). Yönetim Merkezi kartı `src/app/admin/index.tsx:363` bu ekrana yönlendirir. Dolayısıyla web admin'de kalmış bir ekran değildir; mobilde MODERATOR giriş kontrolü eksiktir.
3. Son kullanıcı `EMLAKCI`, oluşturulma `2026-10-30 07:55:29.720Z` (10:55:29 TR), ad/soyad boş olduğundan maskeli gösterim `*** ***`, durum `REVIEW_REQUIRED`. **Document sayısı 0**. Eşleşen PendingRegistration `COMPLETED`, başlangıç rolü ADAY, `professionalDocumentUrl` yok. Bu kullanıcı için kalıcı belge yüklemesi DB'de doğrulanamadı. Yetki açmak olmayan belge satırını oluşturmaz. Dosyanın storage'da yetim kalıp kalmadığı bu incelemede kontrol edilmedi; kayboldu/başarıyla yüklendi iddiası yoktur.
4. Erişilen DB'nin tüm Document kayıtları: APPROVED=9; PENDING=0, REJECTED=0. Mobil ekranın varsayılan `pending` filtresinin bu DB'de boş dönmesi beklenen sonuçtur. Tümü/Onaylanan filtresinde mevcut belgeler listelenebilir; gerçek mobil/HTTP kabulü yapılmadı.

## C — Deneme süresi

Kural `src/admin/admin.service.ts:3057-3074`: `resolveInitialTrialDays(paket, readTrialPolicy(tx))` ile ilk deneme süresini alıyor, gönderilen `gunSayisi` farklıysa “İlk deneme paketi yalnız ... gün olabilir.” hatası üretiyordu. Süper admin istisnası yoktu.

Düzeltme:

- İlk süre eşitliği kontrolü SUPER_ADMIN için atlanır.
- SUPER_ADMIN `gunSayisi` ile pozitif tam gün, `aySayisi` ile pozitif tam takvim ayı atayabilir (`admin.service.ts:3144`). İki alan birden, negatif/sıfır/kesir ve geçersiz bitiş tarihi reddedilir.
- Süre gönderilmezse mevcut paket/DB politikası kullanılır; sabit yeni ticari süre eklenmedi.
- Diğer rollerin membership uçlarına erişimi açılmadı; normal ilk-deneme politikası ve mevcut trial-extend ADMIN limitleri korunur. Önceki deneme/ücretli üyelik uygunluk kontrolleri bu süre düzeltmesinin kapsamında değiştirilmedi.
- Kilit, üyelik oluşturma, PK muhasebesi ve UPDATE_USER_PACKAGE audit yolu korundu.

**Mobil sözleşme hatası ayrıca mevcut:** `src/app/admin/users.tsx:283-285` DENEME için `gunSayisi:Number(duration)` gönderiyor; `:598` seçimleri ay olarak gösteriyor. Bu nedenle mevcut “1 ay” isteği backend'e **1 gün** olarak geliyor. Bu görevde mobil yazılmadı. Ay seçimi bütün paketlerde `aySayisi` göndermeli; gün seçilecekse UI açıkça gün göstermeli. Backend gelen 1 günü sessizce 1 aya dönüştürmez.

## Değişen / oluşturulan dosyalar

- `src/admin/admin.controller.ts`: üç belge ucunda MODERATOR rolü.
- `src/admin/admin.service.ts`: SUPER_ADMIN ilk deneme süresi istisnası; gün/ay süreleri.
- `src/auth/guards/jwt-auth.guard.ts`: kimliği doğrulanmış SUPER_ADMIN için onboarding istisnası.
- `src/admin/eph56-access.spec.ts`: A/B/C ve §0 hedefli regresyon testleri.
- `src/admin/EPH56_RAPOR.md`: bu rapor.
- Üç düzenlenen üretim dosyasının `.bak-eph56` yedeği alındı.

## Doğrulama

1. `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/admin/eph56-access.spec.ts src/admin/admin.service.spec.ts src/admin/admin.controller.spec.ts src/auth/guards/permission.guard.spec.ts src/auth/guards/eph22-permission-access.spec.ts`
   - **5 suite, 250 test PASS; Exit 0.** Rol politikası, aktif override deny/grant, SUPER_ADMIN bypass, belge imzalı URL/onay/red, yetkisiz roller, sürenin kalıcı kaydı ve audit, ay/gün ayrımı, geçersiz süreler, kimlik doğrulama ve onboarding kontrol edildi. DB/storage/mail/LLM gerçek çağrısı yok.
2. `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/pricing/trial-policy.spec.ts`
   - **1 suite, 8 test PASS; Exit 0.** Mevcut DB tabanlı ilk deneme/uzatma politikası.
3. `npm run build`
   - **Prisma Client üretildi, Nest build tamamlandı; Exit 0.** DB migration uygulanmadı.
4. `git diff --check -- src/admin/admin.controller.ts src/admin/admin.service.ts src/auth/guards/jwt-auth.guard.ts`
   - **Exit 0.** Yeni test/rapor ayrıca whitespace açısından kontrol edilir.

Backend package.json'da `typecheck` script'i yok; istenen Nest build TypeScript kontrolünü yaptı. Mobil değişmediği için mobil typecheck/derleme çalıştırılmadı. Canlı API, cihaz ve storage nesnesi kabul testi yapılmadı.

## Bu görev için canlıya alınacak dosyalar (işlem yapılmadı)

| Kaynak | Üretilen çalışma dosyası |
|---|---|
| `src/admin/admin.controller.ts` | `dist/src/admin/admin.controller.js` |
| `src/admin/admin.service.ts` | `dist/src/admin/admin.service.js` |
| `src/auth/guards/jwt-auth.guard.ts` | `dist/src/auth/guards/jwt-auth.guard.js` |

İlgili build çıktıları `.js.map`/`.d.ts` eşlik dosyalarıyla birlikte aynı build sürümünden alınmalıdır. Test, rapor ve `.bak` dosyaları çalışma dosyası değildir. Bu build tüm backend ağacını derlediği için diğer ajanların değişiklikleri de dist içinde olabilir; tablo yalnız EPH-56 kaynak eşlemesidir. Commit/deploy/PM2 restart yapılmadı.

## Gereken mobil değişiklikler — yalnız liste, uygulanmadı

- `src/app/admin/document-verification.tsx:75`: MODERATOR'a da izin veren ekran erişimi; mevcut `useAdminAccess()` varsayılanı bu üç rolü zaten destekler.
- `src/app/admin/users.tsx:283-285,598`: Deneme dahil ay seçiminde `aySayisi` gönderimi; gerçek gün seçeneği varsa ayrı, açık birim.
- `src/app/admin/index.tsx:242,254`: REPORT_VIEW kapalıysa istatistik/özet çağrısı ve bölümlerinin etkin izinlere göre gösterilmesi; mevcut backend sözleşmesinde oturumun etkin izinlerini sağlayan bir okuma yolu ayrıca tasarlanmalı. Murat'ın mevcut reddini kaldıran asıl işlem permission-center'daki REPORT_VIEW kaydıdır.
- `src/app/admin/permission-center.tsx:106`: listede yalnız ADMIN seçilebildiğinden, MODERATOR'a kullanıcı bazlı belge yetkisi düzenlenecekse seçiciye MODERATOR eklenmesi.
- `src/app/admin/document-verification.tsx:136-145`: başarı mesajında backend'in `professionalVerificationStatus`/`trialMembership` dönüşleriyle mevcut `professionalVerificationCompleted`/`trialActivated` beklentisinin eşlenmesi.

Son kullanıcı için belge yükleme yeniden izlenmeli: profil yükleme HTTP sonucu ve Document INSERT/UPDATE sonucu birlikte görülmeden ek bir yükleme düzeltmesi kanıtlanmış sayılmaz.
