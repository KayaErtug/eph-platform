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
