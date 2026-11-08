from pathlib import Path
b=Path('_backup/EPH90')
manifest=(b/'EPH90_DEPLOY_FILES.txt').read_text(encoding='utf-8')
report='''# EPH-90 — Lina/tarama Paket 2 (backend)

Yerel kaynak: `D:/Projects/SM/backend`. Kaynak bulgular: `../docs/ai/RAPOR_EPH84.md`, F04/F05/F07/F08/F10/F13. §0 ve §0-B korundu.

- **F04:** `src/coordination/coordination-recalculation.service.ts:21,33`: talep ve CRM callback'leri `NotificationsService.notify` kullanır; `NetworkNotification` + mevcut push teslim yolu, `MATCH_SCAN_REMINDER`, `BILGI`, istenen başlık. Talep `/network/<id>`, CRM `/crm?customerId=<id>&interestId=<id>`. `src/coordination/coordination.module.ts:25`: NotificationsModule bağlantısı. Eski LinaBildirim kayıtları değiştirilmedi; geçiş yapılmadı.
- **F05:** aynı serviste `:33`: mevcut benzersiz `NetworkNotification.eventKey` kullanıldı. Anahtar `MATCH_SCAN_REMINDER:<REQUEST|CRM>:<kaynakId>:<sha256-kriter>`. Nesne anahtarları/diziler kararlı sıralanır; updatedAt, not ve lastMatchedAt değişikliği tekrar üretmez; eşleşme kriteri değişirse yeni hatırlatma oluşur. Paralel tekrarlar mevcut P2002/dedupe yoluyla tek satırda kalır.
- **F07:** `src/lina/actions/lina-confirmation-gate.service.ts:60,113,175,210`: plan kimliği DB satır kimliğiyle aynı; kullanıcı + modül + kimlik eşleşmesi zorunlu, ilk aşama geçişi ve tüketim koşullu updateMany ile tek kazanan. `src/lina/dto/lina-chat.dto.ts:34` / `src/lina/lina.controller.ts:167`: confirmationId taşınır. Diğer domain onay protokolleri korunur.
- **F07:** `src/lina/draft/lina-draft-flow.service.ts:195`: taslak id/durum/kriter/süre kontrolüyle transaction içinde sahiplenilir; müşteri ve talep yazımı ile KAYDEDILDI kapanışı aynı transaction'dadır. Hata hepsini geri alır. Kapanmış taslak düzenlemeyle yeniden açılamaz. `src/crm/crm.service.ts:476,566,877`: mevcut CRM kuralları korunarak aynı TransactionClient kullanılır; bildirim commit sonrası çalışır.
- **F08:** `src/lina/lina-chat-budget.service.ts:7,24,31` / `src/lina/lina.controller.ts:115`: ayar okuması ve kapsam sınıflandırması dahil chat toplam bütçesi azami 22000 ms; SystemSetting daha düşük süre belirleyebilir. Süre aşımında `Lina şu an yoğun, lütfen tekrar deneyin.` döner. `src/lina/openai-tools/lina-openai-client.service.ts:96`: Responses çağrısı da ortak iptal sinyalini alır. `src/lina/openai-tools/lina-openai-live-gateway.service.ts:122,156` ve `src/lina/lina.service.ts:599,604`: fallback/TTS fetch AbortSignal ile sınırlı. `src/lina/lina.module.ts:76`: bütçe servisi DI kaydı. İşlem öncesi bütçe kontrolleri gecikmiş akışın yazmaya devam etmesini engeller; CRM transaction kapanışından sonra da kontrol vardır.
- **F10:** `src/coordination/commercial-match-scan.service.ts:310,338`: DB'deki ham ilçe eşitliği kaldırıldı; cursor sayfaları motorun aynı normalizeDistrict fonksiyonuyla filtrelenir, aday limiti normalizasyondan sonra uygulanır. `src/matching/eph-match-engine.service.ts:220,235,279,1240`: ilçe normalizasyonu ortak kullanılır; kat karşılığı için pozitif fiyat/bütçe şartı aday ve motor katmanlarında kaldırıldı. Normal satış/kiralama fiyat koşulları korunur.
- **F13:** `src/lina/actions/lina-action-engine.service.ts:225` ve `src/lina/draft/lina-draft-flow.service.ts:228`: ham error.message kullanıcıya dönmez; güvenli Türkçe yanıt ve mevcut log/audit kanalı kullanılır.

## Migration

Şema değişikliği yok. `prisma/migrations/20261031120000_eph90_lina_chat_budget/migration.sql:1` yalnız **ekleyici ayar seed'i**: `LINA_CHAT_TIMEOUT_MS=22000`; ON CONFLICT DO NOTHING ile mevcut yönetici değeri korunur. Çalışma kodundaki süre değeri yalnız güvenli üst sınırdır. Migration yerelde veya canlıda uygulanmadı.

## Doğrulama

- `npx tsc --noEmit` → `TSC_EXIT=0`.
- İlgili Jest: **13 suite / 194 test geçti, Exit 0**. EPH90, coordination recalculation, request-scan-access, commercial-match-scan, lina-draft, live-gateway, lina-scope, action-engine-network, super-admin-scope, crm-card-profile, notifications, notification-hooks, openai-orchestrator.
- Eşleşme motoru regresyonu: `npx jest --runInBand --runTestsByPath src/matching/eph-match-engine.service.spec.ts src/matching/eph-match-criterion-semantics.spec.ts` → **2 suite / 52 test geçti, Exit 0**.
- Toplam **15 suite / 246 test**, iki ayrı Jest çalıştırması.
- `git diff --check` → `DIFF_CHECK_EXIT=0`. Önceden değişmiş office dosyası için Git satır sonu uyarısı var; whitespace hatası yok.
- Yeni testler: NetworkNotification'a kayıt ve paralel/kriter bazlı dedupe; tam plan/modül eşleşmesi ve paralel tek yürütme; yeni/mevcut müşteri yollarında transaction rollback; paralel taslak kaydında tek kayıt; güvenli hatalar; controller seviyesinde timeout mesajı ve gecikmiş yazmanın durdurulması; fallback/TTS sinyali; Türkçe ilçe varyantları ve cursor sayfası; fiyatsız kat karşılığı.
- Bunlar mock/harness ve kaynak kontrolleridir. Canlı DB transaction, gerçek push/cihaz teslimi ve sağlayıcı kabul testi değildir. Gerçek dış API çağrısı yapılmadı.

## Teslim

- Yedekler: `_backup/EPH90/<özgün-göreli-yol>.bak-eph90`; yeni dosyaların önceki sürümü olmadığı için yedeği yok.
- Paket: `_backup/EPH90/EPH90_DEPLOY.tgz` — 16 dosya; tar üyeleri kaynak baytlarıyla tek tek karşılaştırıldı. `.spec.ts`, `.md`, `.bak` yok.
- Tam liste: `_backup/EPH90/EPH90_DEPLOY_FILES.txt`; SHA-256: `_backup/EPH90/EPH90_DEPLOY.sha256`.
- `office-management.service.ts` değiştirilmedi: başlangıç/son SHA-256 `1EB23704D48E15D8F117EE9F4E5418EA06731C65B3E2CBFD863DB330D1043DD3`. Önceden mevcut diğer çalışma ağacı değişiklikleri pakete alınmadı.
- Commit/git yazımı, sunucu bağlantısı, sır dosyası okuma, deploy ve canlı migration yapılmadı.

## Mobilde gereken iş

- Genel onay akışında backend `data.confirmation.id` değerini `confirmationId` olarak, aynı `sourceModule` ile onay/düzelt/iptal mesajlarında gönder. FIRST/FINAL için backend confirmLabel/stage bilgisini kullan. Eski kimliksiz genel onay istekleri güvenli biçimde reddedilir; eski bekleyen genel planlar yeniden hazırlanmalıdır.
- Recorder'ın 20 sn sınırını backend azami 22 sn bütçesiyle uyumlu 25 sn yap. Timeout'ta backend'in güvenli mesajını göster.
- Metni TTS sonucunu beklemeden göster; sesi bağımsız yükle. CRM customerId zaten detay açıyor; belirli talebe doğrudan odaklanmak için interestId desteği mobilde ayrıca eklenebilir.

## Paket dosya listesi

```text
'''+manifest+'''```
'''
(b/'RAPOR_EPH90.md').write_text(report,encoding='utf-8')
print(str(b/'RAPOR_EPH90.md'))
