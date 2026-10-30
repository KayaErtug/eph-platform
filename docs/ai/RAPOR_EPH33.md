# RAPOR EPH-33 – Ofis Sahibi yetkisi ↔ Office.ownerUserId

## 1. Kök neden
- Ofisim (`office-management.service.ts` dashboard): `isOwner = office.ownerUserId === userId && OFFICE_OWNER capability`. Mobil `isPatron = office.isOwner && hasOwnerAuthority`.
- Ofis Sahibi CRM (`office-owner-crm.service.ts`): ofisi önce `Office.ownerUserId`, yoksa capability + `User.officeId` ile bulur.
- Süper admin yetki verirken (`admin.service.ts updateUserCapabilities`) yalnız `UserCapability` satırı yazılıyordu; `Office.ownerUserId` hiç güncellenmiyordu.
- Sonuç: Kutay'da capability var (rozet ve CRM erişimi doğru), ama Volarant Denizli'nin `ownerUserId` değeri başkasında/boş. Bu yüzden Ofisim `isOwner=false` → Danışman modu. CRM listesi ofisteki tüm EMLAKCI'leri düz listelediği için sahibi de "Danışman · Takım Lideri" gösteriyordu.
- Volarant kaydındaki gerçek `ownerUserId` canlı DB'den okunamadı (yazma/okuma yapılmadı); aşağıdaki SQL ile okunur.
- Registration (`registration-v2.service.ts`) EMLAK_OFISI kaydında capability'yi otomatik veriyor, ofis oluşturmuyor/bağlamıyor. Ofis kurulumu Ofisim `create()` ile oluyor (ownerUserId orada doğru yazılıyor). Değiştirilmedi.

## 2. Tek doğruluk kaynağı: Office.ownerUserId
- Yetki verilince: kullanıcı EMLAKCI ve aktif `officeId`'si varsa o ofisin `ownerUserId`'si ona bağlanır. Önceki sahip audit metadata'sına (`previousOfficeOwnerUserId`) yazılır; eski sahibin capability'sine dokunulmaz.
- Ofisi yoksa: ofis kaydına dokunulmaz (ofis adı gerekli, uydurulmaz). Kullanıcı Ofisim'de "Kendi Emlak Ofisinizi Kurun" ile ofis açar (`canCreate`); `ownerUserId` orada bağlanır. Audit metadata'da `officeLink: OFFICE_NOT_FOUND`.
- Yetki kalkınca: `Office.ownerUserId = ownerUserId=kullanıcı olan ofislerde NULL`. Kullanıcının `officeId`'si kalır (üye olarak). Rol EMLAKCI dışına çekilince de aynı çözme yapılıyor.
- Ofisim modu, Ofis Sahibi CRM ve rozetler zaten `ownerUserId` + capability okuyor; ek değişiklik gerekmedi.
- Dikkat: yetkisiz kalan ofis `ownerUserId=NULL` olur; sahibi atanana kadar ortak PK cüzdanı yok (kod `walletId` null'ı zaten güvenle işliyor).

## 3. Ofis Sahibi CRM
- Backend: `advisors[].isOfficeOwner` eklendi; sahipte `isTeamLeader=false`; `advisorCount` sahibi saymıyor.
- Mobil `office-owner-crm.tsx`: sahip "· Ofis Sahibi" ve alt satırda "Ofis Sahibi"; diğerleri `roleLabel()` ("Gayrimenkul Danışmanı"). Ham "EMLAKCI" yazısı kalktı.

## 4. Rol adı
- `roleLabel(EMLAKCI)` = "Gayrimenkul Danışmanı" tek kaynak (session.ts).
- Profil'deki "Emlak Ofisi" kaynağı: `profile.tsx registrationTypeLabel()` → `registrationType === 'EMLAK_OFISI'` (kayıt sırasında seçilen tür). Üyelik kartında `uyelik.tsx getRoleLabel()` de "Emlak Ofisi" ve "Emlak Danışmanı" yazıyordu.
- İkisi de EMLAK_OFISI ve EMLAK_DANISMANI için "Gayrimenkul Danışmanı" döndürecek şekilde düzeltildi. Kayıt formundaki seçenek adı ("Emlak Ofisi") değişmedi (kayıt türü seçimi). Profil'de ayrıca "Ofis Sahibi" rozeti eklenmedi.

## 5. Tek seferlik SQL (ÇALIŞTIRILMADI)
```sql
-- A) Önce oku: Volarant ve Kutay
SELECT o.id, o.name, o."ownerUserId", ou.email AS owner_email, o."isActive"
FROM "Office" o LEFT JOIN "User" ou ON ou.id = o."ownerUserId"
WHERE o.name ILIKE '%volarant%';

SELECT u.id, u.email, u.role, u."officeId",
       EXISTS (SELECT 1 FROM "UserCapability" c WHERE c."userId"=u.id AND c.capability='OFFICE_OWNER') AS has_owner_cap
FROM "User" u WHERE u."firstName" ILIKE 'Kutay' AND u."lastName" ILIKE 'Kaya';

-- B) Genel tutarsızlık: OFFICE_OWNER yetkili, aktif ofiste üye ama sahip değil
SELECT u.id, u.email, u."officeId", o."ownerUserId"
FROM "User" u
JOIN "UserCapability" c ON c."userId"=u.id AND c.capability='OFFICE_OWNER'
JOIN "Office" o ON o.id=u."officeId" AND o."isActive"
WHERE u.role='EMLAKCI' AND o."ownerUserId" IS DISTINCT FROM u.id;

-- C) Düzeltme (yalnız A/B sonucu doğrulandıktan sonra). Bir ofiste birden fazla aday varsa çalıştırma, elle seç.
BEGIN;
UPDATE "Office" o SET "ownerUserId" = u.id
FROM "User" u
JOIN "UserCapability" c ON c."userId"=u.id AND c.capability='OFFICE_OWNER'
WHERE u."officeId"=o.id AND o."isActive" AND u.role='EMLAKCI'
  AND o."ownerUserId" IS DISTINCT FROM u.id
  AND (SELECT count(*) FROM "User" u2 JOIN "UserCapability" c2 ON c2."userId"=u2.id AND c2.capability='OFFICE_OWNER'
       WHERE u2."officeId"=o.id AND u2.role='EMLAKCI') = 1;
-- Kontrol: SELECT yeniden B → 0 satır beklenir. Sonra COMMIT; sorun varsa ROLLBACK.
COMMIT;
```
Not: Volarant'ın eski sahibi (A sorgusunda görünür) varsa bu SQL onu ofis sahibi olmaktan çıkarır; capability'si ayrıca kalır. Önce A'yı kontrol edin.

## Değişen dosyalar
- Backend: `src/admin/admin.service.ts` (updateUserCapabilities, updateUserRole), `src/office-owner-crm/office-owner-crm.service.ts`, yeni `src/admin/admin-office-owner-link.spec.ts` (3 test)
- Mobil: `src/app/office-owner-crm.tsx`, `src/app/uyelik.tsx`, `src/app/profile.tsx`
- Yedekler: her biri için `.bak-eph33`. Not: `admin.service.ts.bak-eph33`, başka ajanın (deneme uzatma, EPH-34) yaptığı yarım değişiklikleri de içerir.

## Doğrulanan
- `npm run build` (backend) → Exit 0
- `npx jest src/office src/admin src/office-owner-crm` → 9 suite / 141 test geçti, Exit 0
- `npm run typecheck` (mobil) → Exit 0

## Kalan
- Yalnız yerel değişiklik: deploy yok, telefon testi yok, SQL çalıştırılmadı. SQL uygulanıp backend yayınlanana kadar Kutay'ın Ofisim modu düzelmez.
- `admin.service.ts` aynı anda başka ajan tarafından (EPH-34 deneme uzatma) değiştirildi; ben yalnız kendi 4 bloğumu ekledim. Commit atılmadı; iki işin diff'i karışık, commit öncesi ayırın.
