# RAPOR EPH-17C – privateInfo ofis alanları

## Değişen (backend)
- backend/src/units/pool-privacy.ts — `serializePoolOfficeInfo` eklendi; `serializePoolPrivateInfo` içine officePhone, officeOwnerPhone, officeAddress dahil.
- backend/src/units/units.service.ts — import; `getPoolUnitWithProjectOrFail` owner select'ine `phone`, office select'ine city/district/neighborhood; proje dalında ofis sahibi için ofis alanları.
- backend/src/units/pool-office-info.spec.ts — yeni test (yetkisiz / yetkili / ofis yok).

## Kaynak eşlemesi (ŞEMA UYARISI)
Office modelinde telefon/adres kolonu YOK (yalnız name, city, district, neighborhood). Bu yüzden:
- officePhone = ilan sahibi kullanıcının kayıtlı telefonu (User.phone), ilan sahibi ofise bağlıysa
- officeOwnerPhone = Office.owner.phone (ofis sahibi cep)
- officeAddress = "mahalle, ilçe, il" (Office.neighborhood/district/city); sokak/no yok
- Ofis yoksa üçü de null.
Gerçek ofis telefonu/açık adres istenirse Office'e `phone`/`address` kolonu + migration + admin/ofis düzenleme ekranı gerekir (onay gerekir, bu görevde yapılmadı).

## Gizlilik
Alanlar yalnız İletişime Geç ile açan, ilan sahibi, ofis sahibi, süper admin yanıtında dolu; yetkisiz yanıtta null.

## Doğrulanan
- `npm run build` → Exit 0
- `npx jest src/units` → 6 suite, 44 test geçti

## Deploy dosya listesi
- dist/ (build çıktısı; yukarıdaki 3 kaynak dosyanın derlenmişi)
- Migration yok, prisma generate gerekmez. Deploy/PM2 restart yapılmadı.

## Kalan
Mobil cihaz doğrulaması yapılmadı.
