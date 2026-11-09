# PROVA — Mustafa abi için adım adım (PowerShell)

Amaç: canlı veritabanının **kopyasında** (Neon child branch `prova2-20261109`) deploy planını baştan sona denemek.
Canlı veritabanına **hiçbir şey yazılmaz**. Betik canlı adresi görürse kendini durdurur.

## 0) Başlamadan önce
- Neon Console → proje **Ertug KAYA** → Branches → **Create branch** → ad: `prova2-20261109`, parent: canlı (main), veri: şimdiki an.
- Yeni dalın **Connection string** ekranında **"Pooled connection" KAPALI** olsun (adres içinde `-pooler` geçmemeli) → bu **doğrudan** adrestir.
- Adres bir **parola** içerir: sohbete, e-postaya, dosyaya, ekran görüntüsüne **koyma**.
- Canlıdan bağımsız kontrol: adresin sunucu adı `ep-morning-sound-al8p9dak` içermemeli (içeriyorsa betik zaten durur, çıkış kodu 2).

## 1) Değişkeni ayarla (yalnız bu PowerShell penceresi için)
Yeni bir PowerShell aç. Bu pencerede başka `DATABASE_URL`/`DIRECT_URL` tanımlı **olmasın**:

```powershell
Remove-Item Env:DATABASE_URL, Env:DIRECT_URL -ErrorAction SilentlyContinue
$env:PROVA_DATABASE_URL = "<PROVA_DAL_DIRECT_ADRESI>"     # <...> yerine Neon'dan kopyaladığın PROVA dalının adresi
```
Adresi tırnak içinde, tek satırda yapıştır. Yazdıktan sonra `echo $env:PROVA_DATABASE_URL` **yazma** (ekrana basar).
Yalnız tanımlı mı diye bakmak için: `[bool]$env:PROVA_DATABASE_URL` → `True` dönmeli.

## 2) Betiği çalıştır
```powershell
cd D:\Projects\SM\backend
node scripts\prova\prova_eph70.mjs
```
- Önce `host: ep-xxxx…` (ilk 12 karakter) görünür. **Bunun prova dalı olduğundan emin ol**, sonra istenince `PROVA` yaz + Enter.
- `CANLI VERİTABANI — DURDURULDU` görürsen: yanlış adres verilmiş demektir. Değişkeni sil (bölüm 4), doğru dal adresini al.
- Prova backend'ini hızlıca atlamak istersen: `node scripts\prova\prova_eph70.mjs --skip-backend`
- Süre: migration'lar + SQL'ler + derleme için kabaca 10–30 dk (veri boyutuna bağlı). Pencereyi kapatma.
- Betik adım adım `[A1] BASARILI (… ms) …` biçiminde yazar. Kritik adım başarısız olursa sonrakiler **ATLANDI** olur.

## 3) Sonuç
- Rapor otomatik yazılır: `D:\Projects\EPH_KURALLAR\raporlar\PROVA_SONUC_<tarih-saat>.md` (adres yok, yalnız sonuçlar).
- Çıkış kodu: `0` hepsi tamam · `1` en az bir adım başarısız · `2` canlı DB durduruldu · `3` ortam hatası (adres yok/pooler) · `4` onay verilmedi.
  Bakmak için: `$LASTEXITCODE`
- **Uyarılar** (sarı bayrak) hata değildir ama okunmalıdır: örn. `INCELEME>0` (lot uzlaştırmada elle çözülecek cüzdan var), `maxTeams eksik`.

## 4) Bitince değişkeni sil
```powershell
Remove-Item Env:PROVA_DATABASE_URL
[bool]$env:PROVA_DATABASE_URL      # False dönmeli
```
Pencereyi kapat. (PowerShell geçmişine adres düşmüş olabilir: `Clear-History` ve
`Remove-Item (Get-PSReadLineOption).HistorySavePath` ile temizle — **yalnız** bu dosya adresi içeriyorsa.)

## 5) Provayı tekrar denemek isteyen
Betik aynı dalda ikinci kez çalışmaz (nesneler zaten var → A2/A5 durur). Neon'da dalı **sil** ve yeniden `prova2-…` dalı aç.
Prova bitince dalı mutlaka **sil** (içinde canlı verinin kopyası var).

## Betik neyi yapar / yapmaz
- Yapar: ön kontrol (salt okuma) → 18 migration (CONCURRENTLY dosyaları transaction dışında, `lock_timeout=5s`, her biri için `prisma migrate resolve --applied`) → ayar yedeği, `eph70b2_ayarlar.sql`, `odm2_store_products.sql`, `eph70_okuma.sql`, `eph70_lot_uzlastirma.sql` (önce kuru çalıştırma, sonra COMMIT'li kopya) + iki bayrak → son kontroller → prova backend (port 3901) + 5 duman isteği.
- Orijinal `.sql`/migration dosyalarını **değiştirmez**; COMMIT'li kopyalar geçici klasörde üretilir ve silinir.
- `.env` okumaz. Prova backend'i boş geçici klasörde, sıfırdan kurulmuş ortamla başlar: SMTP/iyzico/push/SMS/Lina anahtarı **yok** (kopyada gerçek kullanıcılara bildirim gitmez).
- Yapmaz (bu betikte yok): eşzamanlı yük/deadlock denemeleri (plan §9.3-4, 8), `migrate deploy` deneme turu (§9.3-3), geri alma provası (§9.3-9), `pg_dump` süresi ölçümü (§9.3-1), frontend/tarayıcı duman testi.
- Derleme çıktısı `backend\.prova_dist` altına yazılır ve iş bitince silinir; mevcut `dist` değişmez.
  (`prisma generate` `node_modules` içindeki istemciyi mevcut `schema.prisma` ile yeniler — zararsız.)

## PROVA-2 notları (09.11.2026)
- **Betik tek kullanımlıktır:** ilk deneme `prova-20261109` dalını kullandı (nesneler orada kaldı). İkinci deneme için **yeni dal**: `prova2-20261109` (parent: canlı main). Eski `prova-20261109` dalını Neon'da **sil**. Üçüncü deneme gerekirse `prova3-…` aç.
- Değişenler: (1) E3 düzeltmesi — derleme sonrası `src/lina/geo` ve `src/lina/v7/prompts` statik dosyaları `.prova_dist` içine kopyalanır (tsc kopyalamaz; Lina konum kataloğu JSON'u olmadan backend açılmaz). (2) Prova sürecine yalnız o süreç için rastgele üretilmiş ZARARSIZ geçici değerler eklendi (`TELEFON_HASH_ANAHTARI`, `LINA_MASK_KEY`, `PROJECT_PRESENTATION_SECRET`, boş `SMTP_*`, `EPH_PAYMENTS_ENABLED=false`); gerçek sır yok, `.env` okunmaz. (3) E3 hata notu artık "NEDEN:" ile asıl hata satırını öne çıkarır. (4) A2, "geri alınmış" kayıtların adlarını da yazar.
- Aynı komut: `node scripts\prova\prova_eph70.mjs` (yukarıdaki 1–4. bölümler değişmedi; yalnız dal adı `prova2-20261109`).

## PROVA-3 notları (09.11.2026) — salt okuma sorgu aracı + deneme geri doldurma adımı
- **Dal:** `prova2-20261109` yarın **02:37**'ye kadar açık. Provayı yeniden denemek için dal (A2/A5 yüzünden) **yeni** açılmalıdır (`prova3-…`); aşağıdaki sorgu aracı ise açık dalda **istediğin kadar** çalışır (yazmaz).
- **`prova_sorgu.mjs` — salt okuma sorgu aracı.** Prova dalına bağlanır, verilen `.sql` dosyasını çalıştırır, sonucu ekrana tablo olarak ve `raporlar\PROVA_SORGU_<tarih-saat>.md` dosyasına yazar (adres YOK).
  ```powershell
  cd D:\Projects\SM\backend
  # PROVA_DATABASE_URL bölüm 1'deki gibi ayarlı olmalı (doğrudan, pooler OLMAYAN prova dalı adresi)
  node scripts\prova\prova_sorgu.mjs scripts\eph70_inceleme_listesi.sql
  node scripts\prova\prova_sorgu.mjs scripts\eph70_inceleme_listesi.sql --maks-satir=50
  ```
  - Onay sorusu yoktur (yazmadığı için). Güvenceler: canlı kilidi (`ep-morning-sound…` ya da `DATABASE_URL`/`DIRECT_URL` ile aynı → **kod 2**, pooler → kod 3), SQL **bağlanmadan önce** taranır (INSERT/UPDATE/DELETE/DDL/COMMIT/`FOR UPDATE`/`READ WRITE`/yan etkili işlev varsa **hiç çalıştırılmaz**, kod 5), oturum `default_transaction_read_only = on` + `BEGIN READ ONLY … ROLLBACK`. Dosyanın kendi `BEGIN`/`ROLLBACK` satırları çıkarılır (sarmalayıcıyı araç yönetir).
  - Telefon/e-posta/token/hash/kullanıcı gibi adlı sütunların değerleri `[gizli]` yazılır (`…Kisa` ile biten kısa kimlik sütunları açık kalır). Satır sınırı varsayılan 200.
  - Çıkış kodları: `0` tamam · `1` sorgu hatası · `2` canlı DB (durduruldu) · `3` ortam/argüman hatası · `5` SQL salt okuma taramasından geçmedi.
  - İlk kullanım: `scripts\eph70_inceleme_listesi.sql` (INCELEME cüzdanları; kopyada 7 beklenir). Aynı araçla `scripts\eph70_okuma.sql` de çalışır.
- **`prova_eph70.mjs` değişikliği:** C4 sonrasına geçiş adımları eklendi: **C7a** `eph70_gecis.sql` kuru çalıştırma → **C7b** COMMIT'li kopya (+ bakiye/lot toplamı değişmedi, her eski deneme defterlendi kontrolü) → **C7c** `eph70_gecis_telefon_hash.mjs` (kuru + `--uygula`; anahtar yalnız o süreç için rastgele) → **C7d** bayrak 3 (`EPH70_DENEME_GERIDOLDURMA_TAMAM`, dosyadaki yorumlu koşullu INSERT). **D6** bayrağın yazılıp yazılmadığını raporlar (yazılmadıysa UYARI + nedeni C7d notunda). Betik hâlâ tek kullanımlıktır.
