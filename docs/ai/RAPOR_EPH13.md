# RAPOR EPH-13 (backend) — özel bilgi yanıtına operationId/replayed/spent

## Değişen
- backend/src/units/units.service.ts (`poolPrivateInfo`; yedek: units.service.ts.bak-eph13)
  - `operationId`: ücret kesildiyse `charged.movement.id`; kesilmediyse `null`
  - `replayed`: daha önce açılmışsa `true`, yeni açıldıysa `false` (boolean); kendi portföy / süper admin ücretsiz yolunda `true`
  - `spent`: zaten vardı; açık ise 0. Mevcut alanlar değişmedi.
- Alan adları mobil `src/lib/pkSpendingSound.ts` `PaidReceipt` tipinden alındı (mobil dosyaya dokunulmadı).

## Doğrulanan
- `npm run build` → Exit 0
- `npx jest src/units` → 4 suite / 38 test geçti, Exit 0
- Sürüm kontrolü: units.service.ts son commit b01584ca (29.10 06:25), çalışma ağacında temizdi; canlı güncelleme 10:32. Canlı sunucudaki dosya ile bayt bazında karşılaştırma yapılmadı.

## Kalan
- Madde 2: Proje havuzunda ayrı uç yok. Mobil `ProjectContactModal.tsx` de `/units/pool/:id/private-info` çağırıyor; pool-projects altında açma metodu bulunmadığından o dosyaya dokunulmadı. Proje birimleri aynı yoldan ücretlendiği için üç alan ona da geçer.
- Canlı sunucu dosyasının yerel ile aynılığı elle doğrulanmadı (deploy öncesi hash karşılaştırması önerilir).

## Deploy dosya listesi
- backend/src/units/units.service.ts
