# ODM-8A — Mağaza ürün giriş listesi

Tarih: 09.11.2026. Kapsam: yalnız belge; mağaza konsoluna, API'ye ve DB'ye erişilmedi; SQL çalıştırılmadı. Ürün adları, açıklamalar, inceleme notları ve grup sıralaması giriş önerisidir. Ürün kimlikleri kaynaklardan aynen alınmıştır.

## Kaynaklar ve fiyat kapsamı

- `D:\Projects\SM\backend\scripts\odm2_store_products.sql`: 20 ürün kimliği ve tür eşlemesi; 20 × 2 platform = 40 eşleme satırı tasarımı. Satır 2 açıkça fiyatların betikte olmadığını belirtir. PK eşlemesi 103–120: miktar → `EPH_PAYMENT_SETTINGS_V1.pkProducts` içindeki ürün kodu.
- `D:\Projects\SM\backend\prisma\schema.prisma:4434`: `StoreProduct`; `magazaUrunKimligi`, `googleBasePlanKimligi`, ürün türü ve hak eşleme alanları vardır; fiyat alanı yoktur. Platform + ürün kimliği tekildir.
- `D:\Projects\EPH_KURALLAR\EPH_ODEME_SISTEMI.md` §12.2: beş ofis fiyatı; §12.3: beş ek kullanıcı ve Ofis Boy fiyatı; §12.6: dört müteahhit fiyatı; §13: 20 ürün kimliği. Tablodaki 15 abonelik fiyatı bu onaylı tarifedir; güncel DB fiyatı olarak doğrulanmadı. KDV dahil hedef satış tutarıdır; üzerine KDV eklenmez.
- Ek PK için izin verilen fiyat kaynakları incelendi: yukarıdaki ODM-2 SQL'de tutar yok; `D:\Projects\SM\backend\src\payments\payment.service.ts:57–63` ayarları DB'den okur, `:255` web katalog fiyatını `amountMinor / 100` üzerinden üretir. Katalog kodunda beş ürün için sayısal web fiyatı yoktur. DB okunmadığından beşi de **FİYAT YOK**. Başka veri/geri alma betikleri veya test verileri güncel katalog fiyatı yerine kullanılmadı.
- Başlangıçta `git pull` denendi: `error: cannot open '.git/FETCH_HEAD': Permission denied` (Exit 1). Yerel kural dosyaları okundu; uzak depo güncelliği doğrulanamadı. EPH_KURALLAR yazma alanı dışında olduğundan kullanıcının belirttiği `frontend\output` teslim yolu kullanıldı.

## 20 ürün

`Auto-Renewable`, Apple Auto-Renewable Subscription türüdür. Tüm abonelikler 1 aylık otomatik yenilemedir. Ek PK tek seferliktir ve satın alınan PK süresizdir (§11 karar 6); abonelik değildir.

| Ürün kimliği | Apple türü | Apple abonelik grubu | Google türü / base plan id | Süre | Fiyat TL (KDV dahil) | Türkçe ad (≤30) | Türkçe açıklama (≤45) | İnceleme notu (1 cümle) |
|---|---|---|---|---|---|---|---|---|
| `eph_sub_office_solo_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 500,00 | EPH Ofis Solo | 1 kullanıcı, 50 portföy ve ayda 400 PK. | Ofis sahibi Üyelik ekranından alır ve haklar tek kişilik ofise tanımlanır. |
| `eph_sub_office_bronz_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 1.350,00 | EPH Ofis Bronz | 3 kullanıcı, 150 portföy ve ayda 1.200 PK. | Ofis sahibi Üyelik ekranından alır ve haklar ofise tanımlanır. |
| `eph_sub_office_gumus_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 2.500,00 | EPH Ofis Gümüş | 6 kullanıcı, 300 portföy ve ayda 2.400 PK. | Ofis sahibi Üyelik ekranından alır ve haklar ofise tanımlanır. |
| `eph_sub_office_altin_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 4.950,00 | EPH Ofis Altın | 12 kullanıcı, 600 portföy ve ayda 4.800 PK. | Ofis sahibi Üyelik ekranından alır ve Kardeş Ofis hakkı pakete dahildir. |
| `eph_sub_office_platinum_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 9.950,00 | EPH Ofis Platinum | 25 kullanıcı, 1.250 portföy, ayda 10.000 PK. | Ofis sahibi Üyelik ekranından alır ve iki Ofis Boy ile Kardeş Ofis hakkı dahildir. |
| `eph_sub_muteahhit_bronz_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 750,00 | EPH Müteahhit Bronz | Müteahhit hesabına aylık Bronz üyelik. | Müteahhit hesap sahibi Üyelik ekranından alır ve haklar kendi hesabına tanımlanır. |
| `eph_sub_muteahhit_gumus_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 1.500,00 | EPH Müteahhit Gümüş | Müteahhit hesabına aylık Gümüş üyelik. | Müteahhit hesap sahibi Üyelik ekranından alır ve haklar kendi hesabına tanımlanır. |
| `eph_sub_muteahhit_altin_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 2.500,00 | EPH Müteahhit Altın | Müteahhit hesabına aylık Altın üyelik. | Müteahhit hesap sahibi Üyelik ekranından alır ve haklar kendi hesabına tanımlanır. |
| `eph_sub_muteahhit_platinum_v1` | Auto-Renewable | Üyelik | Subscription + `monthly` | 1 ay | 4.000,00 | EPH Müteahhit Platinum | Müteahhit hesabına aylık Platinum üyelik. | Müteahhit hesap sahibi Üyelik ekranından alır ve haklar kendi hesabına tanımlanır. |
| `eph_addon_user_1_v2` | Auto-Renewable | Ek kullanıcı | Subscription + `monthly` | 1 ay | 400,00 | EPH Ek Kullanıcı 1 | +1 kullanıcı, +50 portföy, ayda +400 PK. | Bronz ve üstü ofisin sahibi Üyelik ekranından alır ve ek haklar ofise tanımlanır. |
| `eph_addon_user_2_v2` | Auto-Renewable | Ek kullanıcı | Subscription + `monthly` | 1 ay | 800,00 | EPH Ek Kullanıcı 2 | +2 kullanıcı, +100 portföy, ayda +800 PK. | Bronz ve üstü ofisin sahibi Üyelik ekranından alır ve ek haklar ofise tanımlanır. |
| `eph_addon_user_3_v2` | Auto-Renewable | Ek kullanıcı | Subscription + `monthly` | 1 ay | 1.200,00 | EPH Ek Kullanıcı 3 | +3 kullanıcı, +150 portföy, ayda +1.200 PK. | Bronz ve üstü ofisin sahibi Üyelik ekranından alır ve ek haklar ofise tanımlanır. |
| `eph_addon_user_5_v2` | Auto-Renewable | Ek kullanıcı | Subscription + `monthly` | 1 ay | 2.000,00 | EPH Ek Kullanıcı 5 | +5 kullanıcı, +250 portföy, ayda +2.000 PK. | Bronz ve üstü ofisin sahibi Üyelik ekranından alır ve ek haklar ofise tanımlanır. |
| `eph_addon_user_10_v2` | Auto-Renewable | Ek kullanıcı | Subscription + `monthly` | 1 ay | 4.000,00 | EPH Ek Kullanıcı 10 | +10 kullanıcı, +500 portföy, ayda +4.000 PK. | Bronz ve üstü ofisin sahibi Üyelik ekranından alır ve ek haklar ofise tanımlanır. |
| `eph_addon_ofisboy_v1` | Auto-Renewable | Ofis Boy | Subscription + `monthly` | 1 ay | 300,00 | EPH Ofis Boy | Ofise en fazla 2 Ofis Boy kullanıcısı. | Solo, Bronz, Gümüş veya Altın ofisin sahibi alır; eklenti PK veya portföy hakkı vermez. |
| `eph_pk_250_v1` | Consumable | — | Tek seferlik tüketilir | Tek sefer / PK süresiz | FİYAT YOK | EPH Ek PK 250 | Tek seferlik 250 PK; süre sınırı yoktur. | Yetkili hesap sahibi Kontör ekranından alır ve sunucu doğrulaması sonrası cüzdana 250 PK eklenir. |
| `eph_pk_500_v1` | Consumable | — | Tek seferlik tüketilir | Tek sefer / PK süresiz | FİYAT YOK | EPH Ek PK 500 | Tek seferlik 500 PK; süre sınırı yoktur. | Yetkili hesap sahibi Kontör ekranından alır ve sunucu doğrulaması sonrası cüzdana 500 PK eklenir. |
| `eph_pk_1000_v1` | Consumable | — | Tek seferlik tüketilir | Tek sefer / PK süresiz | FİYAT YOK | EPH Ek PK 1.000 | Tek seferlik 1.000 PK; süre sınırı yoktur. | Yetkili hesap sahibi Kontör ekranından alır ve sunucu doğrulaması sonrası cüzdana 1.000 PK eklenir. |
| `eph_pk_2500_v1` | Consumable | — | Tek seferlik tüketilir | Tek sefer / PK süresiz | FİYAT YOK | EPH Ek PK 2.500 | Tek seferlik 2.500 PK; süre sınırı yoktur. | Yetkili hesap sahibi Kontör ekranından alır ve sunucu doğrulaması sonrası cüzdana 2.500 PK eklenir. |
| `eph_pk_5000_v1` | Consumable | — | Tek seferlik tüketilir | Tek sefer / PK süresiz | FİYAT YOK | EPH Ek PK 5.000 | Tek seferlik 5.000 PK; süre sınırı yoktur. | Yetkili hesap sahibi Kontör ekranından alır ve sunucu doğrulaması sonrası cüzdana 5.000 PK eklenir. |

## Abonelik grupları ve sıralama

Apple için üç grup önerisi: **Üyelik**, **Ek kullanıcı**, **Ofis Boy** (§13). Aşağıdaki sıralamada 1 en üst sıradır. Gruplar arası sıralama yoktur; PK ürünlerinin grubu yoktur.

- **Üyelik (ofis + müteahhit, tek grup):** 1 Ofis Platinum → 2 Müteahhit Platinum → 3 Ofis Altın → 4 Müteahhit Altın → 5 Ofis Gümüş → 6 Müteahhit Gümüş → 7 Ofis Bronz → 8 Müteahhit Bronz → 9 Ofis Solo. Her segmentte yüksek paket üsttedir; segmentler arası sıra belge önerisidir, eşdeğer hak veya hesap türü değiştirme izni ifade etmez.
- **Ek kullanıcı:** 1 `eph_addon_user_10_v2` → 2 `eph_addon_user_5_v2` → 3 `eph_addon_user_3_v2` → 4 `eph_addon_user_2_v2` → 5 `eph_addon_user_1_v2`.
- **Ofis Boy:** 1 `eph_addon_ofisboy_v1` (tek kademe; toplam iki Ofis Boy hakkı, kişi başına iki ayrı abonelik değildir).

Google tarafında abonelik grubu yoktur (karar 15); ek kullanıcı kademelerinin birlikte alınmasını engelleme sunucu kuralıdır. Yukarıdaki gruplar Google için katalog sınıflamasıdır.

## Google base plan ve ortak giriş kararları

- Onaylı base plan kimliği: **`monthly`**, 15 aboneliğin her birinde 1 ay, otomatik yenileme. PK ürünlerinde base plan bulunmaz.
- **ODM-8D güncellemesi (10.11.2026):** Google base plan kimliği tüm aboneliklerde `monthly`; `odm2_store_products.sql` ile uyumludur. Ek kullanıcı ürünleri Apple ve Google için v2 olmuştur; Ofis Boy ve diğer ürün kimlikleri v1 kalır. Bu belge güncel giriş listesidir; aşağıdaki ilk teslim kanıtları 09.11.2026 tarihli geçmiş doğrulamadır.
- Karar 19: **ücretsiz deneme ve indirim teklifi YOK**; introductory/promotional offer oluşturulmaz. EPH'nin 14 günlük kartsız denemesi mağaza ürünü değildir. Ücretsiz ve Özel paketler de mağazada satılmaz.
- Karar 12: Apple aile paylaşımı ve Google abonelik duraklatma kapalı olarak planlanır.
- §3 fiyat birliği: App Store TL fiyat noktası hedef tutarı karşılamıyorsa mağazada seçilebilen **en yakın nokta** seçilir; **web ve Google fiyatı da aynı tutara eşitlenir**. Güncel fiyat noktaları/konsol görülmediğinden seçilecek gerçek nokta bu belgede uydurulmadı; tablodaki tutarlar hedef tarifedir. PK fiyatı belirlenmeden ilgili ürünün fiyat girişi tamamlanamaz.
- Mobil fiyatı mağazadan gösterir; bu belgede yer alan web fiyatları mobil arayüze yazılmaz. Ofise bağlı danışman ve Ofis Boy satın alamaz; ofis için satın alan ofis sahibidir. Müteahhit kendi hesabına satın alır.

## Kimlik doğrulaması — grep kanıtı ve sınırı

🟦 POWERSHELL — yalnız okuma:

```powershell
# 1. SQL'deki benzersiz ürün kimlikleri
rg -o --no-filename 'eph_(sub|addon|pk)_[A-Za-z0-9_]+' 'D:\Projects\SM\backend\scripts\odm2_store_products.sql' | Sort-Object -Unique
# 2. Mobil src içindeki tam ürün kimlikleri
rg -n 'eph_(sub|addon|pk)_[A-Za-z0-9_]+' 'D:\Projects\eph-mobile-final\src'
# 3. Dinamik kimlik kullanımı ve PK öneki
rg -n 'storeProductId|payments/store/catalog|eph_pk_' 'D:\Projects\eph-mobile-final\src\lib\storeCatalog.ts' 'D:\Projects\eph-mobile-final\src\lib\storePurchase.ts' 'D:\Projects\eph-mobile-final\src\app\uyelik.tsx' 'D:\Projects\eph-mobile-final\src\app\kontor.tsx'
```

- SQL'de **20 benzersiz kimlik**; §13 ve bu tablodaki **20 kimlikle aynı küme**.
- Mobil `src` tam kimlik grep sonucu: **0 eşleşme**, Exit 1 (eşleşme yok). Dolayısıyla statik kimlik kümesiyle birebir eşitlik **YOK**: tablodaki 20 kimliğin hiçbiri mobilde literal olarak tanımlı değil; mobilde liste dışı tam ürün kimliği de bulunmadı. Bu sonuç çalışma zamanında 20 ürünün eksik olduğu anlamına gelmez.
- Mobil `src\lib\storeCatalog.ts:103`, `/payments/store/catalog` yanıtını okur; `src\app\uyelik.tsx:247,250` üyelik ve eklenti SKU'larını, `src\app\kontor.tsx:91` PK SKU'larını `storeProductId` üzerinden toplar. Satın almalar `uyelik.tsx:392,414` ve `kontor.tsx:162` üzerinden aynı kimlikle başlatılır.
- `src\lib\storePurchase.ts:559,583` yalnız `eph_pk_` önekiyle PK ayrımı yapar; beş PK kimliği bu öneke uygundur. Bu önek bir tam ürün kimliği değildir.
- Backend `src\payments\store\store-catalog.service.ts:57,95,101,111,116`, aktif StoreProduct satırlarının `magazaUrunKimligi` değerini `storeProductId` olarak döndürür. Aktiflik ve paket/ayar eşlemeleri katalog kapsamını etkiler; SQL listesinin varlığı 20 ürünün API'de döndüğünü kanıtlamaz.
- **Sonuç:** SQL ↔ belge ↔ §13 kimlik farkı **0**; mobilde çelişen sabit ürün kimliği **0**; mobil çalışma zamanı kataloğu ile 20/20 eşitlik **doğrulanamadı** (DB/API/konsol erişimi yapılmadı).

## Teslim doğrulaması ve kalanlar

- Yalnız bu Markdown belgesi oluşturuldu; kaynak kod, SQL, şema, kural deposu ve mobil dosyaları değiştirilmedi; commit/push yapılmadı.
- Belge kontrolü: 20 ürün, 15 abonelik + 5 tüketilebilir; adlar ≤30 ve açıklamalar ≤45 karakter; 20 benzersiz kimlik SQL ve §13 ile karşılaştırıldı.
- PowerShell belge doğrulaması Exit 0: `ROWS=20; SUBSCRIPTIONS=15; CONSUMABLES=5; MISSING_PRICES=5; MAX_NAME=22; MAX_DESCRIPTION=44; SQL_DIFF=0; RULE_DIFF=0; MOBILE_RG_EXIT=1; DOCUMENT_VALIDATION=PASS`. `git diff --check -- ../frontend/output/ODM-8_MAGAZA_URUN_LISTESI.md` Exit 0; yeni dosya ayrıca okunarak satır sayısı, hücre uzunlukları, kimlik kümeleri ve satır sonu boşlukları kontrol edildi.
- **Fiyatı bulunamayan:** `eph_pk_250_v1`, `eph_pk_500_v1`, `eph_pk_1000_v1`, `eph_pk_2500_v1`, `eph_pk_5000_v1`.
- **Giriş öncesi kalan:** bu beş ürünün güncel web fiyatları, mağazadaki gerçek TL fiyat noktaları ve çalışma zamanı 20 ürün kapsamı. Konsol/DB kontrolü veya ürün oluşturma yapılmadı; kod değişmediğinden build/typecheck çalıştırılmadı.
