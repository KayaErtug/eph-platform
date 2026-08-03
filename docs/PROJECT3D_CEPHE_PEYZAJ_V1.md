# Project3D Cephe ve Peyzaj Paketi V1

## Amaç

Project3D sahnesini yalnızca blok geometrisi gösteren bir vaziyet planından çıkarıp, proje satış sunumunda kullanılabilecek görsel bir cephe ve dış mekân stüdyosuna dönüştürmek.

## Cephe paketi

Her blok için beş hazır cephe dili bulunur:

- Modern Açık
- Sıcak Taş
- Cam & Turkuaz
- Terracotta
- Grafit Premium

Seçilen cephe yalnız aktif bloğa uygulanabilir veya tek işlemle bütün bloklara kopyalanabilir. Cephe verisi sahne JSON'u içinde saklanır ve mevcut sahneler varsayılan `MODERN_LIGHT` paketiyle geriye dönük çalışır.

Cephe paketi şu görsel kararları yönetir:

- ana ve ikincil cephe rengi
- çatı ve çatı iç yüzeyi
- cam tonu
- vurgu/çerçeve rengi
- balkon çizim dili
- düşey güneş kırıcı/metal aks yoğunluğu

## Peyzaj paketi

Proje genelinde dört hazır dış mekân dili bulunur:

- Modern Kent
- Doğal Yeşil
- Akdeniz
- Aile Bahçesi

Kullanıcı ayrıca bitki yoğunluğunu 1–5 arasında değiştirir ve şu katmanları ayrı ayrı açıp kapatır:

- ağaçlar
- yürüyüş yolları
- aydınlatma
- oturma alanları
- çalı ve bitkiler

Peyzaj katmanı bloklardan önce çizilir; ağaçlar parsel çevresine dağıtılır ve bina kütlelerini kapatmadan sunum hissi verir.

## Veri şeması

Sahne şeması `schemaVersion: 3` olarak güncellenir.

- Bloklarda `facadeStyle`
- Sahne kökünde `landscape`

Eski sahneler frontend normalizasyonu ile varsayılan cephe ve peyzaj değerlerini otomatik kazanır. Veritabanı migration'ı gerekmez; `sceneData` JSON olarak saklanır.

## Kabul ölçütleri

- Bir blok seçildiğinde cephe paketleri görünür.
- Cephe seçimi sahnede anlık yansır.
- Seçilen cephe bütün bloklara kopyalanabilir.
- Peyzaj paketi bütün vaziyet planına anlık uygulanır.
- Yoğunluk ve katman anahtarları kaydedilir.
- Kaydetme, tamamlama, sürükleme ve eski sahne akışları bozulmaz.
- Frontend ve backend production build başarılıdır.
