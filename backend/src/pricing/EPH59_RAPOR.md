# EPH-59 — /pricing/tariff liste değerli limitler

Tarih: 2026-10-30. Yerel değişiklik + commit; deploy/PM2 restart yapılmadı, canlıda doğrulanmadı.

## Değişen
- `backend/src/pricing/pricing.service.ts` — `tariff()` içinde `limits`: liste değerli `LIMIT_*` anahtarları (`LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI`, `LIMIT_DENEME_GUN_SECENEKLERI` ve DB'de `{ value: number[] }` olarak kayıtlı diğer liste anahtarları) `value: number[]` döner. Kayıt yoksa/geçersizse `LIMIT_LIST_DEFAULTS` yedeği (`source: 'DEFAULT'`). Sayısal anahtarlar aynen kaldı.
- `backend/src/pricing/pricing.service.spec.ts` — yeni test (2 senaryo).
- Paket: `D:\Downloads\EPH59_HAZIR\src\pricing\` (iki dosya) ve EPH-57 (commit b804765b) için CRLF: `srcuthegistration\pending-registration.service.ts`, `srcuthegistrationegistration-v2.service.ts`, `src\profile\profile.service.ts`. Yedek: `pricing.service.ts.bak-eph59`.

## Doğrulanan
- `npx jest src/pricing` → 3 suite, 15 test geçti.
- `npm run build` → Exit code 0.

## Kalan
- `LIMIT_DENEME_GUN_SECENEKLERI` için kodda yedek değer yok (`LIMIT_LIST_DEFAULTS`'ta tanımlı değil); DB'de kayıt yoksa `limits` içinde görünmez. Mobil (`src/app/admin/users.tsx:239-245`) bu durumda mevcut yedeğine düşer. Yedek eklemek ya da kayıt oluşturmak ayrı karar.
- Mobil okuma yolu `tariff.limits[].value` dizisini zaten destekliyor; cihazda doğrulanmadı.

## EPH-63 (commit 66c44717)
Pakete eklendi: `src/market/market-ticker.service.ts`, `src/market/market-ticker.service.spec.ts`, `src/admin/admin.service.ts` (güncel), `src/admin/admin.service.spec.ts`, `scripts/eph63_piyasa_ayarlar.sql`. Ayrıntı: `EPH59_DEPLOY_RAPOR.md` EK bölümü.
