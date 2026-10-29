# RAPOR EPH-22 — Yönetici yetki matrisi (backend + mobil Yetki Merkezi)

## 1. Mevcut altyapı (okundu)
- Model: `PermissionDefinition` (key, category, label, defaultEnabled, delegable, superAdminOnly, active), `RolePermissionPolicy` (rol bazlı), `UserPermissionOverride` (kullanıcıya özel, geçerlilik tarihli).
- Çözümleme: `auth/permission.resolver.ts` — SUPER_ADMIN her zaman `enabled` (§0). Sıra: kullanıcı override → rol politikası → tanım varsayılanı. `superAdminOnly` yetki adminlere hiçbir yolla açılamaz.
- Guard: `PermissionGuard` + `@RequirePermission(key)`. Önceden admin uçlarının çoğu yalnız `@Roles(ADMIN)` ile korunuyordu; yetki anahtarı kontrolü yoktu.
- Eski mobil ekran: tek tek yetkiyi modalda aç/kapa (PATCH ile her biri ayrı çağrı), toplu seçim yok.

## 2. Yetki listesi (37 anahtar, gerçek uçlardan)
| Grup | Anahtarlar |
|---|---|
| Kullanıcı Yönetimi | USER_VIEW, USER_CREATE, USER_APPROVE, USER_DELETE, USER_SUSPEND, ROLE_CHANGE, CAPABILITY_MANAGE, MEMBER_CODE_MANAGE, SUPER_ADMIN_MANAGE* |
| Başvuru ve Belgeler | DOCUMENT_VIEW/APPROVE/REJECT, APPLICATION_VIEW/REVIEW/DELETE, NOMINATION_VIEW/MANAGE, LEAD_VIEW |
| Referans ve Davet | REFERRAL_VIEW, REFERRAL_MANAGE, INVITATION_VIEW |
| İçerik ve İlan Moderasyonu | PORTFOLIO_MODERATE, ANNOUNCEMENT_VIEW, ANNOUNCEMENT_MANAGE |
| PK ve Üyelik | KONTOR_GIFT_POOL_VIEW, KONTOR_GIFT_SEND, TRIAL_EXTEND, KONTOR_POOL_LOAD*, MEMBERSHIP_VIEW*, MEMBERSHIP_CHANGE* |
| Fiyat ve Sistem Ayarları | SYSTEM_SETTING_MANAGE* |
| Ofis ve Ekip | ORGANIZATION_VIEW, ORGANIZATION_MANAGE |
| Rapor ve Denetim | REPORT_VIEW, AUDIT_VIEW, PERMISSION_MANAGE* |

`*` = yalnız Süper Admin (superAdminOnly, devredilemez; ekranda kilitli gösterilir). Fiyat/PK/paket/sistem ayarı ve PK yükleme, §0-B gereği admine devredilmez. `@Roles(SUPER_ADMIN)` ile de korunur.

## 3. Backend
- Her admin ucu `@RequirePermission(...)` + `PermissionGuard` ile korunur; yetkisiz admin 403 alır.
- Yeni uç: `PUT /admin/permission-center/users/:id/permissions` body `{ permissions: { KEY: boolean } }` — tek transaction'da toplu kaydetme (yalnız SUPER_ADMIN).
- Süper admin hedef alınamaz ("Süper Admin yetkileri kısıtlanamaz"); superAdminOnly / devredilemez anahtar → 403.
- Denetim: her değişiklik `AuditLog` (UPDATE_USER_PERMISSION) — kim (actorId), ne zaman (createdAt), eski değer, yeni değer, IP/UA. Tekli PATCH/DELETE uçlarına da eski değer eklendi.
- `admin.service` içindeki yinelenen çözümleme kodu `resolvePermission` çağrısına indirildi.

## 4. Mobil
`src/app/admin/permission-center.tsx` yeniden yazıldı: ADMIN rolündeki kullanıcı seçilir → gruplu tik listesi → "Tümünü seç / kaldır" → Kaydet (yalnız değişenler gönderilir). Kilitli yetkiler tıklanamaz. Açık zemin, ≥12 pt yazı, ≥44 dp dokunma alanı. Diğer admin ekranlarına ve `src/admin/ui.tsx`'e dokunulmadı.

## Doğrulanan
- `npm run build` (backend) → BUILD_EXIT=0
- `npx jest src/admin src/auth src/units` → admin, auth (permission.guard dahil), units suite'leri geçti. Toplam 19 suite: 16 geçti, 3 kaldı (aşağıda).
- `npm run typecheck` (mobil) → EXIT=0

## Migration (ÇALIŞTIRILMADI)
`backend/prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql` — yalnız INSERT (`ON CONFLICT DO NOTHING`); silme/güncelleme yok. Yeni yetkiler varsayılan KAPALI. MODERATOR rolü PORTFOLIO_MODERATE'te açık kalır (mevcut davranış).

## Deploy dosya listesi
Backend: `prisma/migrations/20261029100000_eph22_admin_permission_catalog/migration.sql`, `src/admin/admin.controller.ts`, `src/admin/admin.service.ts`, `src/admin/announcements/admin-announcements.controller.ts`, `src/applications/applications.controller.ts`, `src/kontor/kontor.controller.ts`, `src/leads/leads.controller.ts`, `src/nominations/nominations.controller.ts`, `src/organization/organization.controller.ts`, `src/units/units.controller.ts` (+ spec dosyaları).
Mobil: `src/app/admin/permission-center.tsx` (yeni mağaza/OTA sürümü gerekir).
Sıra: migration → backend deploy → mobil. Deploy/migration yapılmadı (§7).

## Kalan / dikkat
- **Davranış değişikliği:** Deploy sonrası mevcut ADMIN rolündeki kullanıcıların bu uçlardaki erişimi, süper admin yetki vermeden KAPALI olur (403). İstenirse migration'a ADMIN rolü için toplu açma satırı eklenebilir; yapılmadı.
- `TRIAL_EXTEND` gün limiti yeni tik ekranında düzenlenmez (tekli PATCH ucu duruyor; toplu kayıt mevcut limiti korur).
- `src/office/office-management.spec.ts`, `office-profile.spec.ts`, `grup5_6-verification.spec.ts` kırık (`user.capabilities` mock'u eksik, `office-management.service.ts:60`). Bu dosyalar değişmedi; EPH-22 öncesinden kalma, düzeltilmedi.
- `dashboard.service.ts` içindeki `pendingTasks` değişikliği EPH-22 dışı, commit'e alınmadı.
- Gerçek cihaz/canlı doğrulama yapılmadı; yalnız yerel build/typecheck/jest.
- Yedekler: `*.bak-eph22` (admin.controller, admin.service, admin.controller.spec, permission-center.tsx).
