# RAPOR EPH-14 — İletişime Geç, proje adres/konum gizleme

## Havuzda Project döndüren uçlar
| Uç | Dosya | Durum |
|---|---|---|
| GET /units/pool | units.service `findPool` → `redactPoolUnitForViewer` | Düzeltildi |
| GET /units/pool/:id/contact-quote | `poolContactQuote` → `redactPoolUnitForViewer` (yalnız açıksa) | Düzeltildi (aynı fonksiyon) |
| POST /units/pool/:id/private-info | `poolPrivateInfo` | Düzeltildi + `projectInfo` eklendi |
| POST /units/pool/:id/location | `poolLocation` (kilit doğrulamalı, EXACT) | Değişmedi, zaten kilitli |
| GET /pool-projects, GET /pool-projects/:projectId | pool-projects.service `serializeProject` (address, latitude, longitude, locationLabel herkese açıktı) | Düzeltildi |
| GET /customer-presentation... , GET /pool-projects-public/:token (token'lı genel sunum) | `getPublicPresentation` → `serializeProject` | Davranış korundu (`canSeePrivate=true`) — müşteriye giden sunum; karar gerekli |
| GET /pool-experience/units | pool-experience.service `findPoolUnits` | **Dokunulmadı (yasak).** Yetkisizde address/mapAddress null, ancak latitude/longitude yaklaşık değer dönüyor ve ofis sahibi kuralı yok; ayrı görev gerekir |
| GET /units/:id, /units, /units/my, /units/project/:id | Özel portföy uçları, havuz değil | Kapsam dışı |

## Değişenler
- Yeni: `backend/src/units/project-private-privacy.ts` (canSeeProjectPrivateInfo, redactProjectPrivateInfo)
- `backend/src/units/units.service.ts`: yetkisiz yanıtta address/mapAddress/latitude/longitude/placeId null (yaklaşık koordinat kaldırıldı); ofis sahibi eklendi; private-info yanıtına `projectInfo` (authorizedContact, address, mapAddress, latitude, longitude; yalnız proje birimi)
- `backend/src/pool-projects/pool-projects.service.ts`: proje adres/koordinat/authorizedContact yetkisizde gizli; sahip, ofis sahibi, süper admin ve projenin bir birimini açmış kullanıcı görür; owner select'e office.ownerUserId eklendi
- Yeni test: `backend/src/units/project-private-privacy.spec.ts`
- Kural: `eph-mobile-final/docs/ai/EPH_KURALLARI.md` §3 (tek madde)
- Yedekler: `units.service.ts.bak-eph14`, `pool-projects.service.ts.bak-eph14`, `EPH_KURALLARI.md.bak-eph14`

## Doğrulanan
- `npm run build` → Exit 0
- `npx jest src/units src/projects` → Exit 0 (7 suite, 44 test); `src/project-sales src/pool` → 16 suite, 98 test geçti
- Yetkisiz kullanıcı testi: address/mapAddress/latitude/longitude null, authorizedContact yok, yanıt metninde adres yok.

## Kalan
- Canlı/deploy yapılmadı. Mobil: `locationPrecision` 'APPROXIMATE' kaldı (koordinat artık null); havuz haritası yetkisizde yaklaşık pin çizemez — mobil ekranı kontrol edilmedi. Mobilde buton adı değişikliği bu görevde yok.
- `pool-experience.service.ts` açığı (yukarıda) ve genel sunum kararı.

## Deploy — EPH-13 + EPH-14 birlikte değişen dosyalar (backend/)
- src/units/units.service.ts (EPH-13 + EPH-14)
- src/units/project-private-privacy.ts (yeni)
- src/pool-projects/pool-projects.service.ts
- Test (deploy gerekmez): src/units/project-private-privacy.spec.ts
- Not: `src/dashboard/dashboard.service.ts` çalışma ağacında başka işten değişik; bu commit'e alınmadı.

---

# EPH-14C — yaklaşık konum, sunum ve pool-experience gizleme

## Karar uygulaması
1. Yetkisiz kullanıcıya proje/portföy koordinatı **yaklaşık** (2 ondalık, `Math.round(x*100)/100`; eski ±offset'li hash yaklaşımı kaldırıldı) + `locationApproximate: true`; `address`/`mapAddress`/`placeId` null. Yetkilide kesin koordinat + `locationApproximate: false`. Tek yardımcı: `projectLocationFields` (`units/project-private-privacy.ts`); `redactProjectPrivateInfo` da onu kullanır. Koordinat yoksa lat/lng null kalır.
2. Token'lı proje sunumu (`GET /pool-projects-public/:token`): adres/kesin koordinat yalnızca linki oluşturan (`sharedById`) kullanıcı proje sahibi / ofis sahibi / süper admin / projenin bir birimini İletişime Geç ile açmışsa girer; değilse il/ilçe/mahalle + yaklaşık koordinat. Yetki sunum görüntülenirken linki oluşturanın **güncel** durumuna göre hesaplanır.
3. `pool-experience.service.ts` `findPoolUnits`: aynı yardımcı, ofis sahibi (`office.ownerUserId`) eklendi. Aynı serviste `getCustomerPresentation` (token'lı birim sunumu) ham koordinat dönüyordu; aynı kuralla (linki oluşturan yetkisizse yaklaşık) düzeltildi — **karar kapsamını bu uca genişlettim, itiraz edersen geri alınır**. Birim sunumuna adres/mapAddress eklenmedi.

## Mobilin kullanacağı alanlar (tam adlar)
- `locationApproximate: boolean` — `project` nesnesinde: `GET /units/pool` (+ contact-quote), `GET /pool-experience/units`, `GET /pool-projects`, `GET /pool-projects/:projectId`, `GET /pool-projects-public/:token` (`project` ve `presentation` içindeki proje), `GET /customer-presentation/:token` (`project.locationApproximate`), `POST /units/pool/:id/private-info` (`projectInfo.locationApproximate`, her zaman false).
- `projectInfo` (yalnız `POST /units/pool/:id/private-info`, yalnız proje birimlerinde, aksi halde `null`): `authorizedContact` {fullName, phone, whatsapp, whatsappSameAsPhone, email}, `address`, `mapAddress`, `latitude`, `longitude`, `locationApproximate` (=false).
- Mevcut, anlamı değişmeyen: `project.locationPrecision` ('EXACT'|'APPROXIMATE'|'NONE'), `project.locationUnlocked`, `project.hasLocation`, `projectAuthorizedContact` (yetkisizde null).
- Yetkisizde `project.latitude/longitude` artık null değil, 2 ondalıklı; harita yaklaşık pin/daire çizmeli, `locationApproximate === true` iken kesin konum gibi göstermemeli.

## Değişenler (backend/)
- src/units/project-private-privacy.ts (yardımcılar: approximateCoordinate, projectLocationFields; redact güncellendi)
- src/units/units.service.ts (yardımcıya geçiş; kullanılmayan `getApproximatePoolCoordinates` silindi)
- src/pool-projects/pool-projects.service.ts (genel sunumda linki oluşturan yetkisi; `locationApproximate` çıktıya eklendi)
- src/pool-experience/pool-experience.service.ts (findPoolUnits + getCustomerPresentation; özel `getApproximatePoolCoordinates` silindi, `sharerUnlockedUnit` eklendi)
- Testler: src/units/project-private-privacy.spec.ts (güncellendi), src/pool-projects/pool-projects-location.spec.ts (yeni), src/pool-experience/pool-experience-location.spec.ts (yeni)
- Yedekler: *.bak-eph14c (4 servis/yardımcı + spec)

## Doğrulanan
- `npm run build` → Exit 0
- `npx jest src/units src/projects src/pool-projects src/pool` → Exit 0 (9 suite, 48 test)
- Yetkili/yetkisiz testleri: yardımcı + units redact (sahip/ofis sahibi/süper admin/açan), token'lı proje sunumu (4 yetkili + yetkisiz), pool-experience (4 yetkili + yetkisiz).

## Kalan
- Canlı/deploy yapılmadı; gerçek DB/cihaz kanıtı yok. Mobil ekranlar `locationApproximate`'i henüz okumuyor.
- `GET /units/:id`, `/units`, `/units/my` özel portföy uçları kapsam dışı (havuz değil).

## Deploy — EPH-13 + EPH-14 + EPH-14C birlikte (backend/, sunucuya kopyalanacak)
- src/units/units.service.ts
- src/units/project-private-privacy.ts
- src/pool-projects/pool-projects.service.ts
- src/pool-experience/pool-experience.service.ts
- Deploy gerekmeyen testler: src/units/project-private-privacy.spec.ts, src/pool-projects/pool-projects-location.spec.ts, src/pool-experience/pool-experience-location.spec.ts
- Not: `src/dashboard/dashboard.service.ts` başka işten değişik; commit'e alınmadı. Deploy/PM2 restart onayın olmadan yapılmadı.
