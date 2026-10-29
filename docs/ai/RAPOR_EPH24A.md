# RAPOR EPH-24A — P0 sabitleri (backend)

Kaynak: `RAPOR_EPH24.md` P0 tablosu, yalnız 1–5. Kod yedekleri (DB yoksa kullanılan değerler) silinmedi. Yedekler: `*.bak-eph24a`.

## Değişen
- Yeni: `src/pricing/trial-policy.ts`, `src/office/office-team-quota.ts`, `src/pricing/trial-policy.spec.ts`, `prisma/migrations/20261029110000_eph24a_limit_defaults/migration.sql`
- `src/units/pool-publication.service.ts`, `src/kontor/kontor.service.ts` (+spec), `src/pricing/commercial-costs.ts`, `src/pricing/pricing.service.ts`, `src/organization/organization.service.ts`, `src/office/office-management.service.ts`, `src/admin/admin.service.ts` (+spec), `src/admin/admin.controller.ts`, `src/membership/membership.service.ts`, `src/payments/payment.dto.ts`, `src/payments/payment.service.ts`

## Yapılan
1. **Havuz yayın açıklaması:** `pool-publication.service.ts` hareket metni artık gerçek kesinti: `` `… ${publicationCostPk} PK harcandı.` ``.
2. **Admin hediye PK:** `kontor.service.ts` sabitleri kaldırıldı; `readGiftLimits()` mevcut `readLimit` / yeni `readLimitList` ile okur. Anahtarlar: `LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI` (dizi, yedek [100,250,500]), `LIMIT_ADMIN_HEDIYE_GUNLUK_PK` (5000), `LIMIT_ALICI_ADMIN_HEDIYE_ADET` (2), `LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK` (1000). Hata metinleri gerçek değerden üretilir. Süper admin `GET /admin/system-settings`: kaydı olmasa da açıklama + yedek değerle (`updatedAt: null`) listelenir. `PATCH` dizi anahtarı için tekrarsız pozitif tam sayı listesi (≤20) kabul eder, sıralı saklar, AuditLog eski → yeni yazar.
3. **Takım:** `LIMIT_TAKIM_DANISMAN` (10) `addTeamMember` içinde okunur. `resolveMaxTeams(pkg, agentCap)`: paketin `maxTeams` alanı varsa o; yoksa eski eşik tablosu (yedek). Hem `organization.service` hem `office-management.service.createTeam` kullanır. Paket editörü (`PUT /payments/admin/office-packages/:code`) isteğe bağlı `maxTeams` (0–1000) kabul eder.
4. **Deneme politikası:** tek okuma `readTrialPolicy(db)` (`TRIAL_INITIAL_DAYS`, `TRIAL_EXTENSION_DAYS`, `TRIAL_MAX_EXTENSIONS`; yedek 14/14/1) + `resolveInitialTrialDays(paket, policy)` (önce `UyelikPaketi.denemeGunSayisi`, sonra `TRIAL_INITIAL_DAYS`). `admin.service` deneme atama (kontrol + bitiş), `extendUserTrial` ve `membership.service` otomatik deneme aynı fonksiyonu kullanır. Gün sayısı ≤ 0 ise "Deneme politikası sistem ayarları geçersiz."
5. **Mobil için alanlar:** aşağıda.

## Mobil için alan adları
- **`GET /admin/trial-policy`** (ADMIN, SUPER_ADMIN): `{ initialDays, extensionDays, maxExtensions, maxTotalDays }`. `initialDays`: aktif DENEME paketlerinin `denemeGunSayisi` değeri tekse o, farklıysa/yoksa `TRIAL_INITIAL_DAYS`. `maxTotalDays = initialDays + extensionDays × maxExtensions`. → `users.tsx` (+14, 28, `gunSayisi: 14`, "1 kez/14/28") ve `document-verification.tsx` (14 gün) bunu okumalı.
- **`GET /pricing/tariff`** yanıtına eklendi:
  - `officeTrial: { monthlyPk, trialDays } | null` — `OFFICE_MEMBERSHIP_PACKAGES[code=DENEME]`. → `SoftwareTeamOfficePanel.tsx` "5.000 PK" metni `officeTrial.monthlyPk`'tan üretilmeli.
  - `trialPolicy: { initialDays, extensionDays, maxExtensions, maxTotalDays }` — belge onayı deneme günü için (paket bazlı `packages[].denemeGunSayisi` zaten mevcut).
  - `officePackages[].monthlyPk`, `officePackages[].trialDays` önceden vardı; yeni `officePackages[].maxTeams` (alan doluysa). → `OfficeWorkspace.tsx` `office.maxTeams` yedek sabiti (3) kaldırılabilir.
- **`PATCH /admin/system-settings/:key`**: `value` artık `number | string | null | number[]` olabilir. Dizi anahtarı: `{ "value": [100, 250, 500] }`. `GET` yanıtında `value` dizi olabilir; mevcut tamsayı editörü dizi göstermeyecek, mobilde liste editörü gerekir.
- `GET /kontor/hediye-havuzu` yanıtında `yetki.secenekler`, `gunlukLimit`, `bugunKalan` artık DB'den gelen değerleri taşır (alan adları değişmedi).

## Migration (ÇALIŞTIRILMADI)
`20261029110000_eph24a_limit_defaults/migration.sql`: 5 yeni LIMIT anahtarı + 3 TRIAL anahtarı, yalnız `INSERT … ON CONFLICT ("key") DO NOTHING`. Yeni LIMIT anahtarları kayıtsız olsa da `PATCH` ilk kaydı oluşturur; migration şart değil.

## Doğrulanan
- `npm run build` → Exit 0.
- `npx tsc --noEmit` → hatasız.
- İlgili jest (`src/admin src/market src/pricing src/kontor src/membership src/organization src/payments src/auth/guards`): geçti. Yeni testler: deneme politikası, limit listesi, `resolveMaxTeams`, hediye limitleri okuma, dizi PATCH + audit, yönetilen limit ilk kayıt, ayar listesi açıklamaları, `getTrialPolicy`.
- Tüm `src`: 1099 geçti, 17 kalan. Hepsi `src/office/{office-management,grup5_6-verification,office-profile}.spec.ts`; `office-management.service.ts` yedeğe döndürülünce de aynı 17 test düşüyor (`capabilities` mock'u eksik → `owned()` içinde `Cannot read properties of undefined (reading 'some')`). Bu görevle ilgisiz, düzeltilmedi.

## Kalan
- `office.service.ts:218` (30 gün abonelik), `payment.rules.ts:26`, ofis kapasite yedekleri (1500/150/5), CRM 100 yedekleri, `COST_*` kod yedekleri ve mobil dosyalar bu görevin kapsamı dışındaydı (RAPOR_EPH24 P0 satırları duruyor).
- Mobil tarafı henüz değişmedi; yukarıdaki alanlar hazır, deploy/migration yapılmadı.
- `admin.service.ts` `getNumericSystemSetting` artık deneme için kullanılmıyor, silinmedi.
