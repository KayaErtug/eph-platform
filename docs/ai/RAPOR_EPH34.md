# EPH-34 — Süper admin sınırsız deneme uzatma

Tarih: 2026-10-30. Kapsam: yerel backend + mobil. Commit ve deploy yapılmadı.

## Değişen

- `D:\Projects\SM\backend\src\admin\admin.service.ts`: SUPER_ADMIN için toplam uzatma sayısı, maksimum toplam gün ve TRIAL_EXTEND yıllık/kişi başı numericLimit uygulanmaz. ADMIN kontrolleri korunur. Her işlem sunucudan okunan TRIAL_EXTENSION_DAYS kadar uzatır. Toplam gün hesabı trial-policy kaynağından alınır. Transaction, kullanıcı bazlı advisory lock ve her başarılı uzatmanın AuditLog/TRIAL_UZAT kaydı korunur.
- `D:\Projects\SM\backend\src\pricing\trial-policy.ts`: maxExtensions/maxTotalDays sınırlarının ADMIN kapsamında olduğu belgelendi. Sayısal politika yanıtı ve SystemSetting kaynağı değiştirilmedi; rol istisnası işlem katmanında uygulanır.
- `D:\Projects\SM\backend\src\admin\admin.service.spec.ts`: EPH-34 için 8 regresyon testi eklendi.
- `D:\Projects\eph-mobile-final\src\app\admin\users.tsx`: SUPER_ADMIN toplam gün sınırına takılmaz; sınırlı tekrar açıklaması gösterilmez; politika yüklendiğinde buton `+{extensionDays} gün` gösterir. ADMIN görünümü ve kontrolleri korunur. Süper admin için politika yükleme doğrulaması limit alanlarına bağlı değildir.

Bu dört dosyanın düzenleme öncesi yedekleri aynı dizinlerde `<dosya>.bak-eph34` olarak alındı.

## Doğrulanan

1. POWERSHELL — `D:\Projects\SM\backend`: `npm run build`

```text
> backend@0.0.1 build
> prisma generate && nest build
Generated Prisma Client (v6.19.3)
Exit code: 0
```

2. POWERSHELL — `D:\Projects\SM\backend`:
`npm test -- --runInBand --runTestsByPath src/admin/admin.service.spec.ts src/admin/admin.controller.spec.ts src/pricing/trial-policy.spec.ts src/auth/guards/eph22-permission-access.spec.ts`

```text
Test Suites: 4 passed, 4 total
Tests:       219 passed, 219 total
Snapshots:   0 total
Time:        23.545 s
Exit code: 0
```

Eklenen testler:

- SUPER_ADMIN aynı DENEME üyeliğini art arda 3 kez +14 gün uzatır: başlangıç 01.10.2026, eski bitiş 15.10.2026; yeni bitişler 29.10, 12.11, 26.11. Her adımda AuditLog aktör/hedef/gerekçe/gün/önceki uzatma sayısı doğrulanır; 3 güncelleme, 3 audit, 3 kilit çağrısı.
- SUPER_ADMIN için çözülmüş yetkide numericLimit=0 ve yıllık/kişi başı metadata olsa bile uzatma başarılıdır; yıllık kota sayımı yapılmaz.
- ADMIN ilk uzatmayı yapar; ikinci işlem yıllık numericLimit=1 sınırında reddedilir, ikinci güncelleme/audit oluşmaz.
- ADMIN numericLimit=10 olsa da TRIAL_MAX_EXTENSIONS=1 nedeniyle ikinci uzatmada reddedilir.
- ADMIN için maksimum toplam 28 gün kontrolü ayrıca doğrulanır.
- SystemSetting TRIAL_EXTENSION_DAYS=7 olduğunda SUPER_ADMIN üç kez +7 gün uzatır; gün miktarı sabitlenmemiştir.
- Her iki rolde farklı gün miktarı ve 50 karakteri aşan gerekçe reddedilir (2 test).

3. POWERSHELL — `D:\Projects\eph-mobile-final`: `npm run typecheck`

```text
> eph-mobile@1.0.22 typecheck
> tsc --noEmit
Exit code: 0
```

4. POWERSHELL — Her iki depoda `git diff --check`: Exit code 0. Satır sonu LF/CRLF bilgilendirmeleri var; whitespace hatası yok.

## Kalan

Testler mock Prisma kullanan yerel servis/izin regresyon testleridir; canlı API/DB, gerçek PostgreSQL kilit davranışı ve cihazda mobil ekran kabulü doğrulanmadı. Deploy, telefona kurulum ve commit yapılmadı. Görev sırasında başka dosyalarda oluşan çalışma ağacı değişikliklerine dokunulmadı.
