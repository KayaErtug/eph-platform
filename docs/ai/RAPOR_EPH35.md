# EPH-35 — API ETag / 304 düzeltmesi

Tarih: 2026-10-30. Kapsam: yerel backend + mobil, build öncesi hazırlık. Commit ve deploy yapılmadı.

## Değişen

- `D:\Projects\SM\backend\src\main.ts`: Nest uygulaması oluşturulduktan hemen sonra `app.getHttpAdapter().getInstance().set('etag', false)` eklendi. Pipe, CORS ve port/listen davranışı korunuyor.
- `D:\Projects\eph-mobile-final\src\lib\api.ts`: ilk istek ve 304 tekrarı `cache: 'no-store'` ve `Cache-Control: no-cache` kullanıyor. 304 durumunda aynı URL, yöntem, gövde, yetkilendirme ve abort sinyaliyle yalnızca bir kez tekrar yapılıyor. Mevcut toplam timeout süresi uzatılmıyor. İkinci yanıt da 304 ise mevcut `ApiError(304)` yolu çalışıyor; diğer yanıtlar mevcut çözümleme/hata yolundan geçiyor.
- `D:\Projects\eph-mobile-final\scripts\test-api-eph35.cjs`: gerçek `api.ts` kaynağını TypeScript ile dönüştürüp yerel/native bağımlılıkları ve fetch'i taklit ederek test ediyor; harici API çağrısı yok.
- `D:\Projects\SM\backend\src\main.spec.ts`: gerçek Express + Supertest ile önce koşullu GET'in 304 verdiğini, gerçek bootstrap çalıştırılıp ETag kapatıldıktan sonra aynı isteğin ETag olmadan JSON gövdesiyle 200 verdiğini doğruluyor. Nest uygulaması/AppModule taklit ediliyor; DB ve dış servis bağlantısı yok.

## Yedekler

Kaynak ve yedek SHA256 değerleri düzenleme öncesinde eşit doğrulandı.

| Dosya | .bak yolu | Düzenleme öncesi SHA256 |
| --- | --- | --- |
| Mobil api.ts | `D:\Projects\eph-mobile-final\src\lib\api.ts.bak-eph35-20261030-025624` | `488D87A9137EC11EBE882E47CD41304C010EF21BC6AB503D09215555937C7382` |
| Backend main.ts | `D:\Projects\SM\backend\src\main.ts.bak-eph35-20261030-025624` | `9B03B81B9C56C7C952C5D4929044DF0FBDC53B14EC34DDEF6F469B9C0966A0BC` |

Test dosyaları ve bu rapor yeni oluşturuldu. Başlangıçta mevcut diğer dosya değişikliklerine dokunulmadı.

## Doğrulanan

1. Mobil — `node scripts/test-api-eph35.cjs` → **Exit code 0**:

   ```text
   tests 6
   pass 6
   fail 0
   ```

   Senaryolar: 304→200 JSON, 304→304 (en fazla iki fetch), tekrar sırasında yöntem/gövde/başlık koruması, 304→403 hata mesajı ve ofis yönlendirmesi, normal 200/500 için tekrar yapılmaması, 304 sonrası aynı timeout/abort davranışı. Önbellek seçeneklerinin çağıran tarafından verilen cache ayarını geçersiz kıldığı da doğrulandı.

2. Mobil — `npm run typecheck` → **Exit code 0**:

   ```text
   > eph-mobile@1.0.22 typecheck
   > tsc --noEmit
   ```

3. Backend — `npm run build` → **Exit code 0**:

   ```text
   > backend@0.0.1 build
   > prisma generate && nest build
   Generated Prisma Client (v6.19.3)
   ```

   Yalnızca yerel Prisma client üretildi; migration çalıştırılmadı.

4. Backend — `npm test -- --runInBand --runTestsByPath src/main.spec.ts src/market/market-ticker.service.spec.ts` → **Exit code 0**:

   ```text
   Test Suites: 2 passed, 2 total
   Tests:       6 passed, 6 total
   Snapshots:   0 total
   ```

   Market testlerindeki `kapalı` / `ağ yok` uyarıları taklit edilen hata senaryolarına ait.

5. Her iki repo — `git diff --check` → **Exit code 0**. Git'in CRLF dönüşüm uyarıları dışında whitespace hatası yok.

İlk mobil `node --test` denemesi ortamın alt süreç kısıtı nedeniyle `spawn EPERM` verdi; aynı test dosyası doğrudan `node` ile çalıştırılınca 6/6 geçti. Yeni backend testinin ilk çalıştırmasındaki CommonJS import uyumsuzluğu düzeltildi; yukarıdaki nihai Jest sonucu 6/6 geçti.

## Kalan

- Gerçek cihaz/kurulu mobil build ve canlı Nginx/API üzerinde doğrulama yapılmadı. Paylaşılan Nginx gözlemi bu oturumda canlıdan tekrar alınmadı; yerel testler uçtan uca canlı kabul yerine geçmez.
- Mobil mağaza build'i, deploy, PM2 restart, migration ve commit yapılmadı. Mevcut başarılı boş yanıt (örn. 204) davranışı korundu; 304 ikinci kez gelirse hata üretilir.
