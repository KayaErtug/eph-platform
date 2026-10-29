# EPH-22-KONTROL — bağımsız backend ve mobil incelemesi

Tarih: 2026-10-29. İncelenen başlangıç commitleri: SM `5c262799`, `73b8075a`; mobil `0f02672`. Yerel düzeltme ve test tamamlandı. **Migration çalıştırılmadı, deploy/PM2/mağaza yayını yapılmadı.**

## Sonuç

EPH-22, eksik ADMIN rol politikaları yüzünden mevcut erişilebilir uçlara 403 getirecekti. Aynı, henüz uygulanmamış katalog migration'ına 29 guard anahtarı için yalnız `INSERT ... SELECT ... ON CONFLICT ("role","permissionId") DO NOTHING` eklendi. 2026-10-29 18:37:40 UTC canlı salt okunur snapshot'ına göre bunların 19'u eksik; 10 mevcut satır korunur. Mevcut ADMIN'in önceden erişebildiği uçların yeni rol/yetki guard'larından geçmesi korunur.

Canlıda **1 ADMIN** var; hiçbir yetki tanımında bu kullanıcıya ait override yok. `CAPABILITY_MANAGE`, `ROLE_CHANGE`, `USER_DELETE` zaten kapalı ve EPH-22 öncesi servis de aynı yetkiyi denetliyordu; bunlar erişim kaybı değildir. Kullanıcı talimatı gereği mevcut satırlar güncellenmedi/silinmedi. Kullanıcı override'ı veya kapalı rol politikası bulunan başka bir veritabanında INSERT bunları açmaz; bu raporun canlı sonucu belirtilen snapshot'a dayanır.

## ADMIN etkin yetki tablosu

Kaynak: SSH üzerinden Prisma SELECT; ilk sorgu `SET TRANSACTION READ ONLY` transaction'ında yapıldı. Kişisel bilgi/kimlik/credential rapora alınmadı. Tablodaki varsayılan ve mevcut politika canlı verisidir; `yeni` tanımların varsayılanı migration'dan alınmıştır. Migration `ON CONFLICT DO NOTHING` kullandığı için var olan tanımın varsayılanı veya `superAdminOnly` alanı değişmez.

Çözüm sırası: SUPER_ADMIN koşulsuz geçer; diğer roller için aktif tanım şarttır, `superAdminOnly` doğrudan 403 verir; ardından tarih aralığı geçerli `UserPermissionOverride.enabled ?? RolePermissionPolicy.enabled ?? PermissionDefinition.defaultEnabled` uygulanır. Numeric limit ve metadata da null olmayan alanlarla aynı sırada devralınır. Aşağıdaki tüm satırlarda mevcut kullanıcı override'ı **yok**.

| Anahtar | Yeni @RequirePermission? | defaultEnabled (son durum) | Mevcut ADMIN politikası | Migration sonrası etkin sonuç / kaynak |
|---|---|---|---|---|
| USER_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| USER_CREATE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY; servis zaten yalnız SUPER_ADMIN |
| USER_APPROVE | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| USER_DELETE | Evet | false | Kapalı | Kapalı / mevcut ROLE_POLICY; önceden de kapalı |
| USER_SUSPEND | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| ROLE_CHANGE | Evet | false | Kapalı | Kapalı / mevcut ROLE_POLICY; önceden de kapalı |
| CAPABILITY_MANAGE | Evet | false | Kapalı | Kapalı / mevcut ROLE_POLICY; önceden de kapalı |
| MEMBER_CODE_MANAGE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY; servis zaten yalnız SUPER_ADMIN |
| SUPER_ADMIN_MANAGE | Hayır, servis kontrolü | false | Kapalı | 403 / superAdminOnly; politika eklenmez |
| DOCUMENT_VIEW | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| DOCUMENT_APPROVE | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| DOCUMENT_REJECT | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| APPLICATION_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| APPLICATION_REVIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| APPLICATION_DELETE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY; admin servisindeki silme zaten yalnız SUPER_ADMIN |
| NOMINATION_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| NOMINATION_MANAGE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| LEAD_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| REFERRAL_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| REFERRAL_MANAGE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY; admin servisindeki silme zaten yalnız SUPER_ADMIN |
| INVITATION_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| PORTFOLIO_MODERATE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| ANNOUNCEMENT_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| ANNOUNCEMENT_MANAGE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| KONTOR_GIFT_POOL_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| KONTOR_GIFT_SEND | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| KONTOR_POOL_LOAD | Hayır, uç rol kısıtlı | false (yeni) | Yok | 403 / superAdminOnly + mevcut SUPER_ADMIN rol kısıtı |
| MEMBERSHIP_VIEW | Hayır, uç rol kısıtlı | true | Açık | Resolver açık; uç önceden olduğu gibi SUPER_ADMIN rolü ister, ADMIN 403 |
| MEMBERSHIP_CHANGE | Hayır, uç rol kısıtlı | false | Kapalı | Resolver kapalı; uç ayrıca SUPER_ADMIN rolü ister, ADMIN 403 |
| TRIAL_EXTEND | Evet | true | Açık, numericLimit=1 | Açık / mevcut ROLE_POLICY; limit=1 korunur |
| SYSTEM_SETTING_MANAGE | Hayır, uç rol kısıtlı | false (yeni) | Yok | 403 / superAdminOnly + mevcut SUPER_ADMIN rol kısıtı |
| ORGANIZATION_VIEW | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| ORGANIZATION_MANAGE | Evet | false (yeni) | Yok | Açık / yeni ROLE_POLICY |
| REPORT_VIEW | Evet | true | Açık | Açık / mevcut ROLE_POLICY |
| AUDIT_VIEW | Hayır, servis kontrolü | false | Kapalı | Kapalı / mevcut ROLE_POLICY; panelde denetim özeti önceden de kapalı |
| PERMISSION_MANAGE | Hayır, uç rol kısıtlı | false (yeni) | Yok | 403 / superAdminOnly + mevcut SUPER_ADMIN rol kısıtı |

Katalog gerçekte **36** tanım ve **29** farklı `@RequirePermission` anahtarı içerir; önceki rapordaki 37 sayısı doğru değil. `MEMBERSHIP_VIEW/CHANGE` mevcut tanımları canlıda superAdminOnly=false olsa bile uçların SUPER_ADMIN rol koruması sürer; INSERT mevcut tanımları değiştirmez. Katalog dışı eski `PERMISSION_CENTER_MANAGE` ve `SYSTEM_SETTINGS_MANAGE` tanımları da yerinde kalır.

Guard'ın geçmesi tüm iş kurallarının geçmesi demek değildir: mevcut `requireSoftwareTeam`, hedef kullanıcı, limit, sahiplik, DTO ve diğer servis denetimleri kaldırılmadı. SUPER_ADMIN rol/yetki bypass'ı korunur; geçersiz iş verisini kabul etme garantisi verilmez.

## Mobil değişiklikleri

`src/app/admin/permission-center.tsx` kutucuk ekranında iki özellik de kaybolmuştu; geri eklendi:

- Her düzenlenebilir yetkide numericLimit girişi ve **Limiti kaydet**: mevcut tekli PATCH ucu kullanılır, yalnız numericLimit gönderilir; boolean, metadata ve geçerlilik tarihleri korunur.
- Boş alan null göndererek rol/tanım limitine döner; 0 ayrı değerdir. Negatif, kesirli, güvenli olmayan veya PostgreSQL Int sınırını aşan giriş engellenir.
- Override varsa **Varsayılana döndür**: mevcut DELETE ucu override'ın tamamını siler, profil sunucudan dönen etkin değere geçer. Süresi dolmuş override da silinebilir.
- Kutucuklar, gruplama ve toplu boolean PUT kaydı korunur. Limit işlemi diğer kutucuk taslaklarını; toplu boolean kaydı diğer limit taslaklarını silmez. Limit/reset işlemlerinin ayrı kaydedildiği ekranda belirtilir.
- Kilitli yetkiler düzenlenmez; checkbox erişilebilirlik durumu eklendi. Yeni girişler mevcut açık zemin ve mavi kontrol dilini kullanır.

`TRIAL_EXTEND` canlı rol metadatası `{limitScope: PER_TARGET_USER, limitPeriod: YEAR}` ve numericLimit=1. Bunun anlamı hedef kullanıcı başına yıllık uzatma işlem sayısıdır; önceki rapordaki “gün limiti” ifadesi doğru değildir. Gün sayısı ayrı sistem ayarlarından gelir.

## Test ve doğrulama

Yeni `backend/src/auth/guards/eph22-permission-access.spec.ts` gerçek controller/handler metadata'sını gerçek RolesGuard + PermissionGuard ile denetler. SQL dosyası sadece okunur; INSERT/ON CONFLICT etkisi anonim canlı snapshot'ındaki ilgili politikalarla bellekte modellenir. PostgreSQL migration'ı çalıştırılmaz.

- Migration yalnız INSERT ve ON CONFLICT DO NOTHING içerir; ADMIN listesi bütün gerçek RequirePermission anahtarlarıyla birebir eşleşir; her ilgili uç iki guard ile korunur.
- Migration sonrası ADMIN'in önceki erişilebilir uçlarının rol/yetki guard kontrolleri geçer; mevcut üç kapalı politika ve trial limiti değişmez.
- Aktif kullanıcı override'ı rolü ezer; süresi dolmuş override yok sayılır.
- Katalogdaki bütün superAdminOnly anahtarlar, açık politika ve açık override olsa bile ADMIN için PermissionGuard'da 403 verir.
- İncelenen sekiz controller'ın bütün HTTP handler'larında SUPER_ADMIN rol/yetki guard kontrollerini geçer; bütün katalog anahtarlarında kısıtlı veya pasif tanım da SUPER_ADMIN'i engellemez.
- Mevcut üyelik, sistem ayarları, yetki merkezi ve PK yükleme uçları ADMIN'e rol guard'ında kapalı kalır.

🟦 POWERSHELL — backend `D:\Projects\SM\backend`:

```text
npm run build
> prisma generate && nest build
Generated Prisma Client (v6.19.3)
Exit code: 0

npx jest --runInBand src/auth/guards/eph22-permission-access.spec.ts src/auth/guards/permission.guard.spec.ts src/admin/admin.service.spec.ts src/admin/admin.controller.spec.ts src/units/units.controller.spec.ts
Test Suites: 5 passed, 5 total
Tests:       190 passed, 190 total
Exit code: 0
```

🟦 POWERSHELL — mobil `D:\Projects\eph-mobile-final`:

```text
npm run typecheck
> eph-mobile@1.0.22 typecheck
> tsc --noEmit
Exit code: 0
```

İki repoda görev dosyaları için `git diff --check`: Exit 0. İlk test çalıştırmalarındaki SQL metni ayrıştırma hataları testte düzeltildi; son koşuda tümü geçti.

## Değişen dosyalar ve yedekler

SM:

- `backend/prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql`
- `backend/src/auth/guards/eph22-permission-access.spec.ts` (yeni)
- `docs/ai/RAPOR_EPH22_KONTROL.md` (bu rapor, yeni)

Mobil:

- `src/app/admin/permission-center.tsx`

Değiştirilen mevcut iki dosya düzenlenmeden önce yanlarına `migration.sql.bak-eph22-kontrol` ve `permission-center.tsx.bak-eph22-kontrol` yedekleri alındı. Yeni test/raporun önceki sürümü yok. Yedekler commit/deploy kapsamına alınmaz. Önceden dirty olan backend dashboard ve diğer mobil dosyaları göreve/commit'e alınmadı.

## Deploy dosya listesi ve migration

Migration adı: **20261029100000_eph22_admin_permission_catalog**. Mevcut EPH-22 migration'ı düzenlendi; yeni ikinci migration eklenmedi. Canlı `_prisma_migrations` tablosunda `migration_name LIKE '%eph22%'` salt okunur sorgusu boş döndü: EPH-22 uygulanmış görünmüyor. Farklı bir ortamda uygulanmışsa değiştirilmiş dosyanın checksum'u eski kayıtla uyuşmaz; bu rapor canlıya alınmadan önceki görev kapsamındadır.

EPH-22 ve bu kontrolün birleşik backend kaynak teslimi:

```text
backend/prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql
backend/src/auth/decorators/require-permission.decorator.ts
backend/src/auth/guards/permission.guard.ts
backend/src/auth/permission.resolver.ts
backend/src/admin/admin.controller.ts
backend/src/admin/admin.service.ts
backend/src/admin/announcements/admin-announcements.controller.ts
backend/src/applications/applications.controller.ts
backend/src/kontor/kontor.controller.ts
backend/src/leads/leads.controller.ts
backend/src/nominations/nominations.controller.ts
backend/src/organization/organization.controller.ts
backend/src/units/units.controller.ts
```

Test dosyaları kaynak/review teslimidir; runtime dist'e test eklenmez. Normal backend build çıktısı ve migration, onaylı deploy yöntemiyle ayrı ele alınmalıdır. Mobil teslimi `src/app/admin/permission-center.tsx`; ayrıca uygun mobil sürüm/OTA gerekir. Sıra: migration → backend → mobil. Bu görevde hiçbiri yayımlanmadı.

## Kalan

Gerçek cihaz/emülatör render ve PATCH/DELETE etkileşim testi, canlı HTTP rol testi ve migration'ın gerçek PostgreSQL üzerinde uygulanması yapılmadı. Guard testleri gerçek handler iş mantığını çalıştırmaz. Yerel build/typecheck/test sonucu canlı veya cihaz doğrulaması değildir.

**Commit engeli:** Kullanıcının istediği ayrı commitler iki repoda da denendi; ortam `.git` dizinlerini salt okunur tuttuğu için `git add` ve `git commit`, `Unable to create '.../.git/index.lock': Permission denied` hatası verdi (Exit 1). Commit oluşturulmadı; değişiklikler çalışma ağaçlarında duruyor. Görev öncesinde index'ler boştu; başka çalışmalara ait dosyalar stage edilmedi.

Yazma izni olan normal bir yerel terminalde yalnız görev dosyalarıyla tamamlanacak komutlar:

1. 🟦 POWERSHELL — `D:\Projects\SM`:

```powershell
git add -- backend/prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql backend/src/auth/guards/eph22-permission-access.spec.ts docs/ai/RAPOR_EPH22_KONTROL.md
git diff --cached --check
git diff --cached --stat
git commit -m "fix(EPH-22-KONTROL): preserve ADMIN access and verify permission guards"
```

2. 🟦 POWERSHELL — `D:\Projects\eph-mobile-final`:

```powershell
git add -- src/app/admin/permission-center.tsx
git diff --cached --check
git diff --cached --stat
git commit -m "fix(EPH-22-KONTROL): restore permission limits and override reset"
```
