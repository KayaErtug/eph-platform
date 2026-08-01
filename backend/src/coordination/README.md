# EPH Koordinasyon Katmanı

Bu modül, CRM ve Talep Merkezi kayıtlarını birbirine bağlar. Ana iş kayıtlarını kopyalamaz.

## İlk faz

- CRM talep profili Talep Merkezi'nde kişisel veriler olmadan yayınlanır.
- Talep Merkezi kaydı özel CRM fırsatına dönüştürülür.
- Aynı işlem ikinci kez çalıştırıldığında yeni kayıt üretmez.
- Başarılı işlemler CRM aktivitesine, göreve ve audit kaydına yazılır.
- Yayın işlemi yarıda kalırsa oluşturulan talep pasifleştirilir ve harcanan kontör iade edilir.

## Gizlilik

Ad, telefon ve e-posta CRM'den Talep Merkezi'ne aktarılmaz. Talep Merkezi'nden CRM'ye yalnız EPH içinde görülebilen kullanıcı adı ve rolü taşınabilir; telefon ve e-posta kopyalanmaz.

## Sonraki fazlar

- CRM talebi ile Havuz portföyü eşleştirme
- Talep Merkezi talebi ile kullanıcının Portföyü eşleştirme
- Havuz işlemlerini CRM zaman çizelgesine yazma
- Lina okuma ve kullanıcı onaylı işlem araçları
