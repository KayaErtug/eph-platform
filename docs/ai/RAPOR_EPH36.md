# RAPOR EPH-36

## Kök neden
`OfficeWorkspace.tsx` içinde `isPatron = office.isOwner && hasOwnerAuthority` idi. `hasOwnerAuthority` yerel oturumdaki (SecureStore `eph_user`) `capabilities` listesine bakıyordu. Bu liste yalnız giriş ve Profil ekranında yazıldığı için, süper admin yetki verdikten sonra eski kalıyordu. Sonuç: `isOwner=true` olduğu halde Personel paneli açılıyordu. Kimlik kartı yalnız `office.isOwner` kullandığı için doğru rozeti gösteriyordu.

## Değişen
- `eph-mobile-final/src/components/OfficeWorkspace.tsx`: `isPatron = Boolean(office.isOwner)`. Ofis sahibi modu tek kaynaktan, `GET /office/dashboard` → `isOwner` (backend: `ownerUserId === userId && OFFICE_OWNER capability`). Capability/rol bağımlılığı kaldırıldı; kullanılmayan importlar temizlendi.
- `eph-mobile-final/src/lib/session.ts`: yeni `refreshStoredUser()`. `GET /profile` ile role/capabilities/onay alanlarını yerel oturuma yazar. Kullanıcı kimliği değişmişse yazmaz.
- `eph-mobile-final/src/app/_layout.tsx`: açılışta ve `AppState` → `active` dönüşünde `refreshStoredUser()` çağrılır. Hata sessiz geçilir.
- `SM/backend/src/units/units.service.ts`: `attachOfficeProfilePhones` artık `EPH_OFFICE_PROFILE_<id>` içindeki `address` alanını `office.profileAddress` olarak ekler.
- `SM/backend/src/units/pool-privacy.ts`: `officeAddress` önce `profileAddress`, yoksa "mahalle, ilçe, il".
- `SM/backend/src/units/pool-office-info.spec.ts`: profil adresi testi eklendi.
- Yedekler: `*.bak-eph36` (OfficeWorkspace.tsx, _layout.tsx, session.ts, pool-privacy.ts, units.service.ts).

## Profilde adres alanı
`SystemSetting` anahtarı `EPH_OFFICE_PROFILE_<officeId>`, JSON alanı `address` (`office-profile.ts`, en çok 400 karakter). Telefon ve logoUrl aynı kayıtta.

## Doğrulanan
- Backend `npm run build` → BUILD_EXIT=0
- Backend `npx jest src/units src/office` → 11 suite / 144 test geçti, JEST_EXIT=0. Worker-teardown uyarısı çıktı (mevcut, testleri etkilemiyor).
- Mobil `npm run typecheck` → TC_EXIT=0

## Kalan
- Yalnız yerel değişiklik. Cihaz testi, deploy, PM2 restart ve yeni build yapılmadı.
- `office.tsx` içindeki `canAccessOffice(storedUser)` kapısı hâlâ yerel capability'ye bakıyor. Yetkisi yeni verilen kullanıcıda tazeleme bitmeden ekran açılırsa bir yeniden yükleme gerekebilir. Ofis sahibi modu bundan etkilenmiyor.
- Commit atılmadı.
