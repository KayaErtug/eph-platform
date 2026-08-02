# EPH Koordinasyon Katmanı

Bu modül, CRM, Talep Merkezi, Havuz, Portföy ve Lina arasında ana iş kayıtlarını kopyalamadan bağlantı kurar.

## CRM ↔ Talep Merkezi

- CRM talep profili Talep Merkezi'nde kişisel veriler olmadan yayınlanır.
- Talep Merkezi kaydı özel CRM fırsatına dönüştürülür.
- Aynı işlem ikinci kez yeni kayıt üretmez.
- Başarılı işlemler CRM aktivitesine, göreve ve audit kaydına yazılır.
- Yayın işlemi yarıda kalırsa oluşturulan talep pasifleştirilir ve harcanan kontör iade edilir.

## Havuz ↔ CRM

- Havuz portföyü mevcut `CustomerProperty` modeli üzerinden CRM müşterisine bağlanır.
- Eşleşme puanı, eşleşme gerekçeleri ve ilgili CRM talep profili bağlantı notunda korunur.
- Tekrarlı bağlantı yeni kayıt üretmek yerine mevcut ilişkiyi günceller.

## EPH Koordinasyon Paneli

CRM, Havuz ve Talep Merkezi sayfalarında ortak `EPHCoordinationDock` kullanılır.

- CRM: Havuzu yeniden tara, Talep Merkezi'nde yayınla, eşleşen portföyü müşteriye bağla.
- Havuz: müşteri ve talep profili seç, puanı hesapla, CRM'ye bağla.
- Talep Merkezi: kendi portföylerinle eşleştir, CRM fırsatı oluştur.

Panel sayfa kodlarını parçalamadan root layout üzerinden çalışır ve yalnız ilgili rotalarda görünür.

## Lina yeniden-hesaplama ve uyarılar

- CRM talebi son taramadan sonra değişmişse uyarı oluşur.
- CRM'ye bağlı Havuz portföyü bağlantıdan sonra değişmişse uyarı oluşur.
- Talep Merkezi kaydı değişmiş veya henüz portföylerle taranmamışsa uyarı oluşur.
- Yeniden hesaplama sonrası Lina bildirimi oluşturulur.
- Panel uyarıları 60 saniyede bir yeniler.

## Gizlilik

Ad, telefon ve e-posta CRM'den Talep Merkezi'ne aktarılmaz. Talep Merkezi'nden CRM'ye yalnız EPH içinde görülebilen kullanıcı adı ve rolü taşınabilir; telefon ve e-posta kopyalanmaz.

## Sonraki fazlar

- Kullanıcı onaylı Lina yazma araçları
- Eşleşme geçmişi ve skor değişim grafiği
- Büyük veri hacmi için kuyruk tabanlı toplu yeniden tarama
