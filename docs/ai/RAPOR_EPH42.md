# RAPOR – EPH-42

Kapsam: yalnız yerel. Commit, deploy, sunucu bağlantısı, migration yok.

## Değişen
- `backend/src/office/office-management.service.ts` — `owned()` süper admini sahiplik/aktiflik şartından muaf tutar (ofis yoksa 404). `dashboard()` süper admin için tüm aktif ofisleri `isOwner=true` döndürür. Görev (liste/güncelle), aktivite (liste/ekle), eşleştirme logu (ekle) süper admine açık. `decide()` kapasite sayımı artık ofis sahibini hariç tutuyor (işlemi yapan kişiyi değil); sahip için davranış aynı.
- `backend/src/office/office-profile.spec.ts` — "super başka ofisi düzenleyemez" testi §0'a göre tersine çevrildi (süper admin düzenler); member/stranger hâlâ reddedilir.
- `backend/src/messages/messages.service.ts` — süper admin için engelleme (`assertNoBlockedInteraction`) kontrolü 5 yerde atlanır; `startTeamConversation` süper admini ofis sahibi gibi kabul eder.
- `backend/src/projects/projects.service.ts` — değişmedi: `update`/`remove` süper admini zaten geçiriyor; `RolesGuard` da SUPER_ADMIN'i geçiriyor.
- `backend/src/organization/organization.service.ts`, `organization.controller.ts` — `DELETE offices/:id` ve `DELETE teams/:id`: yalnız SUPER_ADMIN, kayıt silinmez `isActive=false` (takımda üyelikler de kapanır), AuditLog yazılır.
- `backend/src/organization/organization-deactivate.spec.ts` — yeni, 4 test.
- `eph-mobile-final/src/app/admin/organization.tsx` — silme metinleri "pasifleştir" olarak düzeltildi (davranış gerçekte pasifleştirme).
- Yedekler: `*.bak-eph42` (office-management.service, office-profile.spec, messages.service, projects.service, organization.service/controller, organization.tsx).

## Doğrulanan
- `npm run build` (backend) → Exit 0
- `npx jest --runInBand src/office src/projects src/messages src/organization src/auth` → 17 suite / 363 test geçti, Exit 0 (yeni spec eklenmeden önceki koşu; sonra `src/organization` 2 suite / 24 test geçti)
- `npm run typecheck` (mobil) → Exit 0

## Kalan / dikkat
- AuditLog için `AuditAction` enum'unda ofis/takım değeri yok; migration yasak olduğundan `SYSTEM_SECURITY_ACTION` kullanıldı, ayrım `entityType` + `metadata.operation` ile. Ayrı enum değeri istenirse migration gerekir.
- Süper admin `transfer` (PK aktarımı) kendi cüzdanından çalışır; başka ofis sahibinin cüzdanından aktarım eklenmedi (kapsam dışı, para hareketi).
- Pasif ofisi geri açma mevcut `PATCH /organization/offices/:id {isActive:true}` ile yapılır. Gerçek cihaz/canlı doğrulaması yapılmadı.
