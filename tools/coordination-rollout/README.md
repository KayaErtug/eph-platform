# EPH Coordination Rollout Toolkit

Bu dizin mevcut EPH kaynak dosyalarını değiştirmeden koordinasyon özelliğini geçici ortamda sınamak, migration provası yapmak, güvenlik ve yük testleri çalıştırmak, uyarıları izlemek ve kullanıcı onaylı işlemleri yürütmek için eklenmiştir.

## Güvenlik sınırı

- Araçlar varsayılan olarak yalnız okuma yapar.
- Kayıt oluşturan/güncelleyen işlemler `ALLOW_MUTATIONS=true` olmadan çalışmaz.
- Otomatik yeniden hesaplama ayrıca `AUTO_RECALCULATE=true` gerektirir.
- Mutasyon testleri üretim ortamına karşı çalıştırılmamalıdır.
- Test ortamı ayrı veritabanı, ayrı worktree, ayrı PM2 adı ve ayrı port kullanmalıdır.

## 1. Geçici test ortamı

```bash
cd /var/www/eph
chmod +x tools/coordination-rollout/scripts/*.sh

BACKEND_ENV_SOURCE=/root/eph-test-backend.env \
FRONTEND_ENV_SOURCE=/root/eph-test-frontend.env \
./tools/coordination-rollout/scripts/create-test-environment.sh

TEST_DIR=/var/www/eph-coordination-test \
./tools/coordination-rollout/scripts/start-test-environment.sh
```

Nginx tarafında test alan adı 3100 portuna, `/api` ise 3101 portuna yönlendirilmelidir. Bu paket Nginx yapılandırmasını otomatik değiştirmez.

## 2. Kabul, güvenlik ve yük testleri

```bash
cd /var/www/eph-coordination-test/tools/coordination-rollout
cp .env.example .env
nano .env
npm test
npm run preflight
npm run smoke
npm run security
npm run load
```

Mutasyon senaryoları yalnız test verileri hazırlanıp `.env` içinde kimlikler girildikten sonra açılmalıdır:

```bash
ALLOW_MUTATIONS=true npm run smoke
```

## 3. Migration ve geri dönüş provası

```bash
TEST_DATABASE_URL='postgresql://...' \
ROLLBACK_DATABASE_URL='postgresql://...' \
TEST_DIR=/var/www/eph-coordination-test \
./scripts/migration-rehearsal.sh
```

`ROLLBACK_DATABASE_URL` boş bir prova veritabanını göstermelidir. Script üretim veritabanını kabul etmek üzere tasarlanmamıştır.

## 4. Uyarı izleme ve dış worker

```bash
npm run monitor
```

Yalnız uyarıları gözler ve JSONL raporu üretir. Otomatik yeniden hesaplama kapalı başlar:

```bash
AUTO_RECALCULATE=false npm run watch:recalculate
```

Test ortamında otomatik çalıştırmak için iki güvenlik anahtarı birlikte gerekir:

```bash
ALLOW_MUTATIONS=true AUTO_RECALCULATE=true npm run watch:recalculate
```

Bu worker kullanıcı JWT’si bağlamında çalışır; başka kullanıcıların kayıtlarını işleyemez.

## 5. Kullanıcı onaylı işlemler

```bash
ALLOW_MUTATIONS=true npm run approve -- publish
ALLOW_MUTATIONS=true npm run approve -- opportunity
ALLOW_MUTATIONS=true npm run approve -- link
```

CLI, işlemden önce kullanıcının tam olarak `ONAYLIYORUM` yazmasını ister.

## 6. Eşleşme geçmişi

```bash
ALLOW_MUTATIONS=true npm run history
```

Sonuçlar `reports/match-history.jsonl` içine eklenir. Bu, mevcut veritabanı modeline dokunmadan saha testi ve skor değişimi analizi sağlar.

## 7. Canlı sonrası izleme

`npm run monitor` çıktıları `reports/monitor.jsonl` dosyasına yazılır. PM2 ile ayrı bir süreç olarak çalıştırılabilir:

```bash
pm2 start npm --name eph-coordination-monitor \
  --cwd /var/www/eph/tools/coordination-rollout \
  -- run monitor
```

## Sınırlar

Bu paket mevcut kaynak dosyalarını değiştirmediği için Lina sohbet motoruna yeni yazma aracı kaydetmez ve uygulama içinde kalıcı eşleşme geçmişi tablosu oluşturmaz. Bunların gerçek ürün entegrasyonu mevcut backend/Lina modüllerinde kod değişikliği gerektirir. Bu toolkit aynı davranışları test ortamında dışarıdan, güvenli ve kullanıcı onaylı biçimde yürütür.
