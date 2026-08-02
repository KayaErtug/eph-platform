# EPH Koordinasyon Kabul Kontrolü

## Ortam
- [ ] Ayrı worktree kullanılıyor.
- [ ] Ayrı test veritabanı kullanılıyor.
- [ ] Ayrı PM2 adları ve 3100/3101 portları kullanılıyor.
- [ ] Üretim `.env` dosyaları kopyalanmadı.
- [ ] Test adresi yalnız yetkili kullanıcılarca erişilebilir.

## CRM → Havuz
- [ ] Talep taranıyor ve güncel skor dönüyor.
- [ ] Uygun portföy müşteriye bağlanıyor.
- [ ] CRM aktivitesi oluşuyor.
- [ ] İsteğe bağlı takip görevi oluşuyor.
- [ ] Tekrarlı tıklama kopya bağlantı üretmiyor.

## CRM → Talep Merkezi
- [ ] Ad, telefon ve e-posta görünmüyor.
- [ ] Talep anonim metinle yayınlanıyor.
- [ ] Tekrarlı tıklama kopya talep üretmiyor.
- [ ] Hata halinde kayıt pasifleştirme ve kontör telafisi doğrulanıyor.

## Talep Merkezi → CRM
- [ ] Özel CRM fırsatı oluşuyor.
- [ ] Talep sahibinin özel müşteri verileri kopyalanmıyor.
- [ ] Takip görevi oluşuyor.
- [ ] Süresi dolmuş talep reddediliyor.

## Uyarı ve yeniden hesaplama
- [ ] CRM talebi değişince uyarı oluşuyor.
- [ ] Bağlı portföy değişince uyarı oluşuyor.
- [ ] Talep Merkezi kaydı değişince uyarı oluşuyor.
- [ ] Yeniden tarama güncel skoru döndürüyor.
- [ ] Bildirim tekrarları kontrol altında.

## Roller ve gizlilik
- [ ] Emlakçı yalnız kendi CRM kayıtlarını kullanabiliyor.
- [ ] Müteahhit ve inşaat firması rol kuralları doğrulandı.
- [ ] İkinci kullanıcı birinci kullanıcının talebini işleyemiyor.
- [ ] Pasif üyelikte Havuz işlemleri engelleniyor.
- [ ] SUPER_ADMIN işlemleri audit kaydına yazılıyor.

## Mobil
- [ ] iPhone 8 Plus görünümü kontrol edildi.
- [ ] Panel ana içeriği kapatmıyor.
- [ ] İşlem sırasında buton tekrar çalışmıyor.
- [ ] Başarı ve hata mesajları anlaşılır.
- [ ] Zayıf bağlantı ve sayfa yenileme senaryosu denendi.

## Geçiş
- [ ] Migration test veritabanında başarılı.
- [ ] Yedek geri dönüş provası başarılı.
- [ ] Backend build ve koordinasyon testleri başarılı.
- [ ] Frontend build başarılı.
- [ ] Canlı geçiş ve geri dönüş komutları hazır.
