# Project3D Sosyal Alan Geometri ve Donatı V1

## Amaç

Project3D vaziyet planındaki sosyal alanları, bina geometri motorunun ürettiği genel kütlelerden ayırmak ve her kullanım türünü kendi mimari formu ile göstermek.

Bu paket özellikle `DIKDORTGEN` kelimesinin içindeki `T` harfinin yanlışlıkla T plan olarak algılanması sonucunda ortaya çıkan renkli T şekillerini kaldırır.

## Görsel yaklaşım

Uygulama; mimari maket, premium low-poly ve hafif mobil görselleştirme yaklaşımını birleştirir. SketchUp 3D Warehouse, Poly Haven, Kenney, TurboSquid, CGTrader, Flaticon ve IconScout üzerindeki başarılı mimari oranlar ve görsel sınıflandırma dili referans alınmıştır.

Dış model veya ikon dosyası doğrudan kopyalanmaz. Tüm SVG geometrileri EPH için özgün olarak kod içinde oluşturulur. Böylece lisans bağımlılığı, ağır dosya indirme ve mobil performans sorunları oluşmaz.

## Özel geometri türleri

### Havuz

- Kırpılmış köşeli gerçek havuz formu
- Havuz bordürü ve su yüzeyi
- Dalga çizgileri
- Merdiven
- Şezlong temsilleri

### Açık otopark

- Asfalt zemin
- Gerçek park cepleri
- Orta yol çizgisi
- Araç temsilleri

### Tenis ve basketbol sahaları

- Dikdörtgen saha oranı
- Saha sınırları
- Orta çizgi, daire ve oyun çizgileri
- Tenis filesi veya basketbol potası temsili

### Çocuk oyun alanı

- Organik kauçuk zemin
- Kaydırak
- Salıncak

### Peyzaj, dinlenme ve yürüyüş alanları

- Organik yeşil ada
- Ağaç ve bitki grupları
- Pergola / oturma gölgelendirmesi
- Kıvrımlı yürüyüş aksı

### Kapalı sosyal alanlar

Sauna, spa, kreş, site marketi ve benzeri kapalı alanlar; artık T biçimli plaka yerine düşük katlı pavyon yapısı olarak gösterilir.

## Zorunlu site giriş kapısı kemeri

Her proje sahnesinde zorunlu olarak bir `GIRIS_KAPISI_KEMERI` öğesi bulunur.

Bu öğe şunları içerir:

- araç giriş yolu
- iki taşıyıcı kolon
- üst kemer
- kemer üzerinde proje adı
- güvenlik kulübesi
- bariyer
- yol orta çizgisi

Yeni sahnelerde öğe backend tarafından oluşturulur. Eski sahnelerde frontend normalizasyonu öğeyi otomatik ekler. Kullanıcı giriş kapısını sahnede sürükleyerek konumlandırabilir ve kaydettiğinde sahne JSON'una dahil olur.

Proje alanı seçeneklerine ayrıca `Giriş Kapısı Kemeri / Proje İsimliği` seçeneği eklenir. Kullanıcı bu alanı açıkça oluşturmuşsa sistem ikinci bir giriş kapısı üretmez.

## Geometri düzeltmesi

Blok geometrileri artık harf içerme kontrolüyle değil, tam geometri kodlarıyla eşleştirilir:

- `L`, `L_PLAN`, `L_TIPI`, `L_SHAPE`
- `U`, `U_PLAN`, `U_TIPI`, `U_SHAPE`
- `T`, `T_PLAN`, `T_TIPI`, `T_SHAPE`
- `KARE`, `KARE_PLAN`

Böylece `DIKDORTGEN` hiçbir zaman T plan olarak yorumlanmaz.

## Veri şeması

Sahne şeması `schemaVersion: 4` olarak güncellenir.

Giriş kapısı öğesinde:

- `spaceType: GIRIS_KAPISI_KEMERI`
- `projectName`
- `stylePreset: SITE_GATE_PREMIUM`

kullanılır.

Veri mevcut JSON alanında saklandığı için Prisma migration'ı gerekmez.
