# EPH-53 — Lina regresyon sözleşmesi

Kaynak: `D:\Downloads\LINA_TESHIS_EPH48.md` (2026-10-30). Yalnız bu klasörde yeni dosyalar oluşturuldu. Bağımlılık, package.json, backend/src, DB ve mobil kaynak değiştirilmez. Node.js 22+; doğrulanan sürüm 24.14.0.

**Varsayılan çalışma REFERENCE-MOCK'tur.** Deterministik çıkarım double'ı ve bellek deposuyla test sözleşmesini çalıştırır; mevcut/yeni Lina backend'inin geçtiğini kanıtlamaz. Gerçek backend için aşağıdaki adapter sözleşmesi bağlanmalıdır. Canlı mod varsayılan kapalıdır; bu görevde çalıştırılmadı.

## Dosyalar

- `scenarios.cjs`: 30 numaralı senaryo, Türkçe mesaj dizileri, her tur için tam taslak ve davranış beklentileri; bağımsız yazım varyantları.
- `regression.test.cjs`: Node test runner, alan/kayıt/yanıt/denetim kontrolleri, mock ağ engeli ve mod doğrulaması.
- `mock-extractor.cjs`: expected verisini okumayan deterministik LLM double'ı; yalnız test kelime dağarcığı.
- `reference-adapter.cjs`: mock double + taslak/onay/kayıt davranışı için çalışır referans; üretim implementasyonu değildir.
- `http-adapter.cjs`: gerçek Lina'ya bağlanacak izole HTTP test bridge istemcisi.
- `README.md`: komutlar, varsayımlar ve kaynak eşlemesi.

## Çalıştırma

1. 🟦 POWERSHELL — çevrimdışı sözleşme/mock testi (ücretli API veya DB erişimi yok):

```powershell
Set-Location D:\Projects\SM\backend
Remove-Item Env:LINA_REGRESSION_LIVE -ErrorAction SilentlyContinue
Remove-Item Env:LINA_REGRESSION_ADAPTER -ErrorAction SilentlyContinue
node test/lina-regression/regression.test.cjs
```

`node --test` Windows sandbox'ında alt süreç açarken `spawn EPERM` verebildiği için doğrudan dosya çalıştırılır. Node `node:test` yine bütün assertion'ları yürütür ve hata varsa exit 1 döndürür. Varsayılan sonuç: 30 senaryo + 1 katalog kontrolü = 31 test. Varyantların her biri yeni, bağımsız oturumla çalışır.

2. 🟦 POWERSHELL — yeni backend implementasyonuna mock LLM ile bağlanma:

```powershell
Set-Location D:\Projects\SM\backend
Remove-Item Env:LINA_REGRESSION_LIVE -ErrorAction SilentlyContinue
$env:LINA_REGRESSION_ADAPTER = (Resolve-Path test/lina-regression/backend-adapter.cjs).Path
node test/lina-regression/regression.test.cjs
```

`backend-adapter.cjs` **bu teslimatta yoktur**: Claude Code'un yeni arayüzü bilinmediğinden varmış gibi bir import yazılmadı. Arayüz kesinleşince bu klasöre eklenecek modül gerçek servisleri mock LLM ve izole repository ile kurmalı, aşağıdaki `createSession` sözleşmesini uygulamalıdır. Reference adapter ile başarılı sonuç üretim Lina regresyon başarısı değildir. Mock modda fetch/TCP/UDP ve yaygın alt süreç çağrıları engellidir; harici DB/HTTP yerine enjekte edilen bellek repository kullanılmalıdır.

3. 🟦 POWERSHELL — gerçek LLM, yalnız hazırlanmış izole test bridge üzerinde:

```powershell
Set-Location D:\Projects\SM\backend
Remove-Item Env:LINA_REGRESSION_ADAPTER -ErrorAction SilentlyContinue
$env:LINA_REGRESSION_LIVE = '1'
$env:LINA_REGRESSION_URL = 'http://127.0.0.1:4319/lina-regression'
node test/lina-regression/regression.test.cjs
Remove-Item Env:LINA_REGRESSION_LIVE -ErrorAction SilentlyContinue
```

URL örnektir; bu portta bir sunucu başlatılmaz. Bridge yeni Lina servislerini ve gerçek LLM sağlayıcısını çağırmalı; yazma işlemleri izole test repository/DB'sinde olmalıdır. Üretim `/lina/chat` adresi bu bridge protokolü değildir. URL yoksa veya bridge cevap vermiyorsa test başarısız olur; mock fallback yoktur. İsteğe bağlı `LINA_REGRESSION_TOKEN` yalnız Authorization başlığına eklenir, çıktıya yazılmaz. Sağlayıcı anahtarı sunucuda kalır; `.env` okunmaz. Gerçek LLM çağrıları ücret doğurabilir; bu komut teslimatta yürütülmedi.

## Yeni arayüz için açık varsayımlar

1. Adapter `module.exports = { createSession }` dışa aktarır. `await createSession({ live, fixtures: { llmReply: string|null } })` izole kullanıcı/oturum/depo oluşturur ve `{ send, restart, close }` döndürür. Adapter'a senaryo kimliği veya expected alanlar verilmez. `send(message)` yalnız kullanıcı mesajını alır; history istemciden gönderilmez.
2. `send` aşağıdaki normalize edilmiş sonucu döndürür. Gerçek alan adları, rol enum'ları ve iç içe yapılar adapter'da eşlenir. HTTP yanıt metni tek başına yeterli değildir; taslak, kayıtlar, günlükler ve LLM sayacı gerçek servis/repository gözlemlerinden alınmalıdır.
3. `restart()` çalışan servis örneğini yok edip aynı kalıcı test deposu/oturum kimliğiyle yeni örnek kurar; Map'i aynı örnek üzerinde korumak yeterli değildir. Referans örneği yalnız bellek içinde bu sözleşmeyi simüle eder; gerçek PM2 restart veya DB dayanıklılığı kanıtı değildir.
4. `close()` yalnız bu test oturumuna ait kaynakları temizler. Oturumlar/varyantlar arasında müşteri veya taslak paylaşılmaz. Mükerrer senaryosu kendi oturumu içinde aynı müşteriyi iki kez dener.
5. Asgari onay alanları ad+soyad, rol, amaçtır. Telefon/konum/bütçe zorunlu varsayılmadı. Soyadsız Melissa için açık tek-ad onayı yoktur. Bilinmeyen scalar `null`, liste `[]`; yeni mesajın belirtmediği alan korunur. `aktif`, alanları tamamlanmamış oturum taslağı için de `true` olabilir; bu onaya hazır anlamına gelmez.
6. `Onayla` tek yazma komutudur. Kaynak #22'deki `tamam`, `evet o`, `hayır`, `tekrar söyle`, `unutma` eksik taslakta kayıt oluşturmaz. Onay öncesi kayıt sayısı sıfırdır; tekrarlı müşteri onayında sayı bir kalır. Kayıt sonrası son taslak snapshot'ı gözlem için tutulur fakat `aktif=false` olur.
7. Amaç `SATILIK`, rol `ALICI`, tip `Daire`; özellikler küçük harfli `havuz`, `otopark`. Çoklu mahalle sırası kullanıcı mesajındaki sıradır. Oda `en az 4+1` için `min='4+1'`, düzeltme `3+1 olsun` için `tam=['3+1']`, `min=null` olur. Bütçe TRY sayısal TL, alan sayısal m²'dir.
8. Bozuk dikte `Datılık` için kaynakta izin verilen iki seçenekten fuzzy `SATILIK` seçildi. Servergazi için katalogdan tekil Denizli/Merkezefendi tamamlama seçildi; farklı ürün politikası onaylanırsa beklentiler açıkça güncellenmeli. Kaynak #7'deki alışılmadık `550 000 00 00 TL` ifadesi kaynak beklentisi gereği 550.000.000 kabul edildi.
9. Telefon kaynaktaki örnek/sentetik `533 123 45 67`'dir; gerçek konuşmadaki gizlenmiş numara bilinmiyor. Test sözleşmesi biçimi aynen korur; E.164 saklayan servis adapter'da eşlenebilir. `tokens['[TEL_1]']` sunucu içi gözlemdir, modele gönderilmez. `maskedMessage`, modele giden girdi gözlemidir.
10. `fixtures.llmReply` senaryo 25'te sahte kayıt iddiası, 29'da 4000+ karakter çıktı enjekte eder. Gerçek backend adapter'ı çıktıyı yazma korumasından **önce** enjekte etmelidir. Canlı modda bu iki deterministik hata/uzunluk fixture'ı gerçek LLM çağrısının ardından çıktıyı değiştirir; diğer turlar gerçek model çıktısını kullanır. Sağlayıcı sayacı gerçek başarılı çağrılardan ölçülür; `llmMode='live'` tek başına yeterli değildir. Set sonunda gerçek çağrı toplamı >0 kontrol edilir; yerel boş komut/onay turlarının LLM çağırması gerekmez.
11. Her mesajın sıra numarası, yerel turlar dahil, `conversationTurns` ve `auditTurns` ile gözlenir. Adapter gerçek log/DB kimliklerini oturumun 1-tabanlı tur sırasına eşler. Başarılı `status=200`, mevcut controller'ın HTTP durumunu adapter'ın eşlemesidir; gerçek HTTP 400 göz ardı edilemez.
12. Gerçek konuşma senaryo 1 kaynakta DB ile görülen ve koddan yeniden kurulan turları birleştirir. Sondaki başarılı `Onayla` hedef regresyon adımıdır; geçmişte Melissa kaydının başarıyla oluştuğu iddia edilmez. Kaynaktaki 11 ve 12 aynı uzun metin üzerinden tek senaryoda birleşti; böylece gerçek konuşma eklenmesine rağmen toplam 30 kaldı.

### Sonuç sözleşmesi

```js
{
  draft: {
    adSoyad: null, rol: null, amac: null, il: null, ilce: null,
    mahalle: [], butce: { min: null, max: null, para: 'TRY' },
    m2: { min: null, max: null }, oda: { min: null, tam: [] },
    tip: null, ozellikler: [], telefon: null
  },
  onayIstenmeli: false, kapsamIci: true, kayitSayisi: 0, aktif: true,
  missing: ['adSoyad', 'rol', 'amac'], reply: 'Eksik: ...', status: 200,
  maskedMessage: 'numarası [TEL_1]', tokens: { '[TEL_1]': '533 123 45 67' },
  clarifyLocation: false, savedRecords: [],
  conversationTurns: [1], auditTurns: [1], writeAttempts: 0,
  llmMode: 'mock', llmCalls: 0 // bu send sırasında gerçek başarılı sağlayıcı çağrı sayısı
}
```

`savedRecords` ham notes'tan yeniden ayrıştırılmaz; gerçek Customer ve CustomerInterest alanlarının normalize edilmiş birleşimi olmalıdır. Test her turda taslağı tam karşılaştırır, kayıt adedini ve onay/kapsam/aktif durumunu kontrol eder. Son kayıt kontrolleri aynı alanların kalıcı kayda geçtiğini doğrular. Telefon testi gerçek değeri; maske testi token ve ön boşluğu; fiyat testi token oluşmadığını; düzeltme testi değişmeyen tüm alanları da kontrol eder.

### HTTP bridge protokolü

Tüm işlemler `LINA_REGRESSION_URL` adresine JSON POST:

| İstek | Yanıt |
|---|---|
| `{operation:'start',live:true,fixtures:{llmReply:null}}` | `{sessionId:'izole-oturum-id'}` |
| `{operation:'send',sessionId,message:'Onayla'}` | Yukarıdaki sonuç nesnesi |
| `{operation:'restart',sessionId}` | `{ok:true}`; yeni servis örneği, aynı kalıcı test oturumu |
| `{operation:'close',sessionId}` | `{ok:true}`; test oturumu temizliği |

Bridge bu teslimatta mevcut değildir. Yeni Lina'ya bağlanacak seam açıkça tanımlanmıştır; eksik bridge veya adapter test atlama/başarı sebebi olamaz. Canlı test başlığı `LIVE`, özel mock adapter `BACKEND-MOCK`, yerleşik referans `REFERENCE-MOCK` olarak görünür.

## Senaryo listesi ve EPH-48 eşlemesi

| EPH-53 | Senaryo | Kaynak # |
|---|---|---|
| 1 | Melissa Vargas gerçek konuşma; 20 milyon, min 200 m², 4+1, havuz/otopark, iki mahalle, son onay | 4,8,11,12,14,19,21,30 |
| 2 | Boş komut onaya hazır değildir | 1 |
| 3 | Boş taslak onaylanamaz | 2 |
| 4 | CRM eğik çizgi/yazım varyantları (3 bağımsız giriş) | 3 |
| 5 | Ad+telefon, gizlilik uyarısı yok | 4 |
| 6 | Telefon gerçek değerle kaydedilir | 5 |
| 7 | Telefon maskesi boşluğu korur | 6 |
| 8 | Fiyat telefon sanılmaz (2 varyant) | 7 |
| 9 | Melissayı ekle önceki adı korur | 8 |
| 10 | Talep cümlesi isim olmaz | 9 |
| 11 | Datılık diktesi isim olmaz | 10 |
| 12 | Uzun talep bütün alanları; milyon/yon şehir olmaz | 11,12 |
| 13 | Maksimum bütçe (4 varyant) | 13 |
| 14 | Bütçe aralığı, minimum oda/m² | 14 |
| 15 | Bütçe yazımları (3 varyant) | 15 |
| 16 | Servergazi katalog tamamlama | 16 |
| 17 | Geçersiz mahalle doğrulatılır | 17 |
| 18 | Eksik soyad/rol/amaç, onay yok | 18 |
| 19 | Çok turlu slot birleştirme | 19 |
| 20 | Yalnız oda düzeltilir, kayıt yok | 20 |
| 21 | Önceki konum bağlamı hatırlanır | 21 |
| 22 | Kısa takip cümleleri kapsam içinde | 22 |
| 23 | Hava sorusu engellenir, taslak korunur | 23 |
| 24 | Prompt injection engellenir, taslak korunur | 24 |
| 25 | Sahte kayıt iddiası filtrelenir | 25 |
| 26 | Kayıttan sonra bağlam kapanır | 26 |
| 27 | Mükerrer müşteri ikinci kayıt açmaz | 27 |
| 28 | Restart sonrasında kalıcı taslak | 28 |
| 29 | 4000+ karakter geçmişte yeni mesaj | 29 |
| 30 | Yerel komut/onay turları ve denetim | 30 |

## Doğrulama sınırı

Referans testinin geçmesi sadece test setinin ve örnek sözleşmenin tutarlı çalıştığını gösterir. Gerçek Lina, Prisma kayıtları, gerçek katalog, HTTP DTO sınırı, kalıcı DB restart dayanıklılığı ve gerçek LLM henüz bu setle doğrulanmış değildir. Yeni backend adapter'ı/bridge bağlandığında aynı assertion'lar bunları sınar. TypeScript dosyası eklenmedi; backend package.json'da typecheck script'i bulunmadığı ve src başka ajan tarafından değiştirildiği için backend derlemesi çalıştırılmadı. Yeni CommonJS dosyaları `node --check`, yerel test ve `git diff --check` ile doğrulanır.

2026-10-30 yerel kanıt: `node test/lina-regression/regression.test.cjs` → 31 test, 31 pass, 0 fail, exit 0. Beş `.cjs` dosyasında `node --check` ve yeni dosyalarda whitespace kontrolü başarılı; kapsamlı `git diff --check -- test/lina-regression` exit 0. Bilerek kalıcı telefona `null` enjekte edilen, dosya değiştirmeyen denemede kayıt assertion'ları exit 1 verdi. `LINA_REGRESSION_LIVE=1` ve URL olmadan seçili senaryo, beklenen `LINA_REGRESSION_URL gerekli` hatasıyla exit 1 verdi; sağlayıcı çağrılmadı. Bunlar harness/bağlantı koruması kanıtıdır.
