# RAPOR EPH-28 — Piyasa verisi (GET /market/ticker)

## Uç
`GET /market/ticker` (JwtAuthGuard, giriş yapmış kullanıcı) →
`{ updatedAt, items:[{ code, label, value, unit, changePct, source }], loan:{ monthlyRatePct, source, updatedAt } | null }`
Kodlar: USD, EUR, GBP, GRAM_ALTIN, CEYREK_ALTIN, BIST100. Bulunamayan kalem listeden düşer (uydurma yok).

## Kaynaklar
| Kalem | Kaynak | Durum |
|---|---|---|
| USD/EUR/GBP | TCMB today.xml (ForexSelling) — resmi | Bulundu, canlı doğrulandı. Değişim: bülten tarihinden geriye ilk arşiv XML'i (önceki iş günü) |
| Gram / çeyrek altın | finans.truncgil.com/v4/today.json (ücretsiz, anahtarsız, serbest piyasa satış) | Bulundu, canlı doğrulandı. Resmi değil. changePct kaynağın `Change` alanı; çeyrek altında kaynak 0 veriyor (güncellenmiyor olabilir) |
| BIST 100 | Yahoo Finance chart ucu XU100.IS (resmi olmayan, anahtarsız) | Bulundu, canlı doğrulandı. changePct = regularMarketPrice / chartPreviousClose. Yahoo kullanım şartları ticari kullanımda kontrol edilmeli |
| Konut kredisi faizi | 1) SystemSetting `MARKET_KONUT_FAIZ_AYLIK` (varsa her zaman öncelikli, source "Yönetici") 2) TCMB EVDS | EVDS DOĞRULANAMADI: anahtar yok, seri kodu doğrulanamadı |

Kredi önceliği: manuel ayar > EVDS > null. EVDS yalnız `EVDS_API_KEY` VE `EVDS_KONUT_SERIES` ikisi de varsa çağrılır; seri kodunu uydurmadım (haftalık ağırlıklı ortalama konut faizi serisini EVDS arayüzünden teyit edip yaz). EVDS yıllık % verir; aylığa `/12` ile çevrilir (basit). Yıllık değil aylık/bileşik isteniyorsa söyle.
Süper admin `MARKET_KONUT_FAIZ_AYLIK` değerini mevcut sistem ayarları ekranından (SystemSetting) girer; değer `2.89` veya `{value:2.89}` olabilir. Bu ayarın ekranda listelenip listelenmediği kontrol edilmedi.

## Çalışma
- Açılışta ve her 15 dakikada (`@Cron('0 */15 * * * *')`) çeker, bellekte tutar. Yanıt isteği dış kaynağa gitmez (ilk istek, önbellek boşsa hariç).
- Kaynak hata verirse o kalemin son başarılı değeri kalır; `updatedAt` son başarılı çekim saati.
- Önbellek süreç belleğinde: PM2 restart sonrası ilk çekime kadar boş; çok instance'ta her biri ayrı çeker.

## Değişen
backend/src/market/market-ticker.service.ts (yeni), market-ticker.service.spec.ts (yeni), market.controller.ts, market.module.ts

## Doğrulanan
- `npm run build` → Exit 0
- `npx jest src/market` → 4/4 geçti
- Gerçek kaynaklarla derlenmiş servis çalıştırıldı: 6 kalem döndü (çıktı yukarıdaki kaynak tablosuna yansıdı); loan null (ayar ve EVDS yok).
- Not: `jest src/office` 17 test zaten kırık (EPH-17C raporuna bak), bu işle ilgisiz.

## Deploy listesi (yapılmadı)
- dist/ (build çıktısı); migration yok; prisma generate gerekmez
- Sunucudan Natro'dan TCMB, truncgil.com, query1.finance.yahoo.com erişimi kontrol edilmeli
- PM2 restart (onay gerekir)

## .env
- `EVDS_API_KEY` (opsiyonel)
- `EVDS_KONUT_SERIES` (opsiyonel, EVDS seri kodu; ikisi birlikte gerekir)
- Alternatif: SystemSetting `MARKET_KONUT_FAIZ_AYLIK`

## Kalan
Mobilde ticker ekranı bu görevde yok. Çeyrek altın değişimi kaynakta 0.
