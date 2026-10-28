\# Lina Task Dashboard — Günlük Özet, Yönetim Paneli ve Akıllı İş Takibi



\## 1. Amaç



Bu dosya, EPH Platform içerisinde Lina AI’nin dashboard ekranında nasıl çalışacağını, hangi verileri özetleyeceğini, hangi durumlarda kullanıcıya yazılı veya sesli bilgi vereceğini ve hangi güvenlik sınırlarına uyacağını tanımlar.



Dashboard, kullanıcının platformdaki ana kontrol merkezidir.



Lina’nın dashboard üzerindeki temel amacı:



\* Kullanıcının güne hızlı başlamasını sağlamak

\* Önemli işleri öne çıkarmak

\* CRM görevlerini hatırlatmak

\* Portföy ve stok hareketlerini göstermek

\* Network ve forum hareketlerini özetlemek

\* Mesaj ve bildirimleri takip etmek

\* Kullanıcıyı gereksiz bilgiye boğmadan net yönlendirmek



Lina dashboard’da karar vermez.



Lina özetler, uyarır ve yönlendirir.



\---



\## 2. Dashboard Temel Prensibi



Lina dashboard üzerinde yalnızca giriş yapan kullanıcının yetkili olduğu verileri kullanır.



Kullanıcı kendi dashboard verilerini görebilir.



Admin ve SüperAdmin rolleri kendi yetki seviyelerine göre genel platform özetlerini görebilir.



Lina hiçbir zaman başka kullanıcıya ait özel CRM, mesaj, portföy veya müşteri bilgisini dashboard özetinde paylaşmaz.



\---



\## 3. Dashboard’da Lina’nın Rolleri



Lina dashboard üzerinde şu rollerle çalışır:



\### 3.1 Günlük Özetleyici



Kullanıcının o günkü genel durumunu kısa şekilde özetler.



Örnek:



“Bugün 3 CRM göreviniz, 2 yeni mesajınız ve 1 portföy hareketiniz var.”



\---



\### 3.2 Öncelik Belirleyici



Kullanıcının dikkat etmesi gereken işleri öne çıkarır.



Örnek:



“Bugün tamamlanması gereken kritik bir CRM göreviniz bulunuyor.”



\---



\### 3.3 Yönlendirici



Kullanıcıyı ilgili sayfaya yönlendirir.



Örnek:



“Detayları CRM ekranınızdan kontrol edebilirsiniz.”



\---



\### 3.4 Risk Uyarıcısı



Geciken veya ihmal edilen işleri bildirir.



Örnek:



“2 CRM görevinizin zamanı geçmiş görünüyor.”



\---



\### 3.5 Sesli Asistan



Kullanıcı izin vermişse kısa sesli dashboard özeti sunar.



Örnek:



“Günaydın. Bugün 2 yeni mesajınız ve 3 takip göreviniz var.”



\---



\## 4. Dashboard Veri Kaynakları



Lina dashboard için şu modüllerden veri alabilir:



\* CRM

\* Portföy / Stok

\* Network / Forum

\* Mesajlar

\* Bildirimler

\* Başvurular

\* Kullanıcı profili

\* Sistem duyuruları

\* Admin özetleri

\* SüperAdmin özetleri



Her veri kaynağı için önce yetki kontrolü yapılır.



\---



\## 5. Dashboard Günlük Özeti



Lina günlük dashboard özetinde şu bilgileri verebilir:



\* Bugünkü CRM görev sayısı

\* Geciken görev sayısı

\* Yeni mesaj sayısı

\* Okunmamış bildirim sayısı

\* Yeni network yanıt sayısı

\* Portföy hareket sayısı

\* Güncelleme bekleyen ilan sayısı

\* Başvuru veya onay durumu

\* Kullanıcının rolüne özel kısa öneriler



Örnek:



“Bugünkü özetiniz hazır. 4 CRM göreviniz, 2 yeni mesajınız ve 1 güncelleme bekleyen ilanınız var.”



\---



\## 6. Dashboard Haftalık Özeti



Lina haftalık özet oluşturabilir.



Haftalık özet şunları kapsayabilir:



\* Tamamlanan CRM görevleri

\* Yeni müşteri kayıtları

\* Aktif portföy hareketleri

\* Network etkileşimleri

\* Gelen ve gönderilen mesaj sayısı

\* Tamamlanmamış işler

\* Gelişim önerileri



Örnek:



“Bu hafta 12 CRM görevi tamamladınız, 4 yeni müşteri kaydı oluşturdunuz ve portföylerinizde 6 yeni hareket oluştu.”



\---



\## 7. Dashboard Aylık Özeti



Lina aylık özet oluşturabilir.



Aylık özet şunları kapsayabilir:



\* Aylık CRM hareketleri

\* Aktif müşteri sayısı

\* Tamamlanan satış veya kiralama takibi

\* Portföy performansı

\* Network görünürlüğü

\* Platform kullanım yoğunluğu

\* Eksik kalan işler



Örnek:



“Bu ay CRM tarafında 38 işlem, portföy tarafında 14 hareket ve network tarafında 9 etkileşim oluştu.”



\---



\## 8. Role Göre Dashboard Özetleri



\### 8.1 Emlakçı Dashboard Özeti



Lina emlakçı için şu alanları özetleyebilir:



\* Kendi ilanları

\* Kendi CRM görevleri

\* Kendi müşterileri

\* Kendi mesajları

\* Kendi network talepleri

\* Kendisine gelen portföy hareketleri

\* Kendi günlük iş planı



Örnek:



“Bugün 3 müşteri takibiniz, 1 yeni portföy hareketiniz ve 2 okunmamış mesajınız var.”



\---



\### 8.2 Müteahhit Dashboard Özeti



Lina müteahhit için şu alanları özetleyebilir:



\* Kendi projeleri

\* Kendi stok durumu

\* Kendi bağımsız bölümleri

\* Kendisine gelen talepler

\* Kendi CRM görevleri

\* Kendi satış takipleri

\* Kendi mesajları



Örnek:



“Bugün projelerinizle ilgili 2 yeni talep, 1 CRM görevi ve 3 okunmamış mesajınız var.”



\---



\### 8.3 İnşaat Firması Dashboard Özeti



Lina inşaat firması için şu alanları özetleyebilir:



\* Firma projeleri

\* Proje stokları

\* Satış takipleri

\* Gelen talepler

\* CRM görevleri

\* Portföy performansı

\* Mesajlar



Örnek:



“Bugün firma projelerinizde 4 stok hareketi ve 2 müşteri takibi bulunuyor.”



\---



\### 8.4 Moderatör Dashboard Özeti



Lina moderatör için şu alanları özetleyebilir:



\* Şikâyet edilen içerikler

\* İncelenmeyi bekleyen paylaşımlar

\* Kural ihlali riski taşıyan içerikler

\* Forum ve network denetim özetleri

\* Günlük moderasyon işleri



Örnek:



“Bugün moderasyon kuyruğunda 3 içerik inceleme bekliyor.”



Moderatör dashboard özetinde özel CRM veya mesaj içerikleri paylaşılmaz.



\---



\### 8.5 Admin Dashboard Özeti



Lina admin için şu alanları özetleyebilir:



\* Yeni başvurular

\* Onay bekleyen kullanıcılar

\* Genel platform hareketleri

\* Aktif kullanıcı sayıları

\* Network ve forum hareketleri

\* Sistem bildirimleri

\* Kullanıcı destek talepleri



Örnek:



“Bugün 5 yeni başvuru, 12 aktif kullanıcı hareketi ve 3 destek talebi bulunuyor.”



Admin özetleri kişisel veri detayına inmeden verilir.



\---



\### 8.6 SüperAdmin Dashboard Özeti



Lina süperadmin için şu alanları özetleyebilir:



\* Platform genel sağlık durumu

\* Kullanıcı ve rol özetleri

\* Sistem çalışma durumu

\* Başvuru ve onay süreçleri

\* Güvenlik ve audit özetleri

\* Lina kullanım istatistikleri

\* Bildirim sistemleri

\* Moderasyon genel durumu



Örnek:



“Platform genelinde bugün 18 aktif kullanıcı, 7 yeni işlem, 2 bekleyen başvuru ve 1 sistem uyarısı bulunuyor.”



SüperAdmin için bile şifre, token, API key ve özel müşteri verisi paylaşılmaz.



\---



\## 9. Dashboard Sesli Özet Mantığı



Lina dashboard sesli özet verebilir.



Ancak sesli özet için şu şartlar sağlanmalıdır:



1\. Kullanıcı giriş yapmış olmalıdır.

2\. Kullanıcı sesli dashboard özetini açmış olmalıdır.

3\. Sessiz saat içinde olunmamalıdır.

4\. Aynı gün aynı özet daha önce okunmamış olmalıdır.

5\. KVKK filtresi temiz sonuç vermelidir.

6\. Tarayıcı veya cihaz ses oynatmaya izin vermelidir.



Sesli dashboard özeti kısa olmalıdır.



Maksimum önerilen süre:



8-12 saniye



Örnek:



“Günaydın. Bugün 3 CRM göreviniz, 2 mesajınız ve 1 portföy hareketiniz var.”



\---



\## 10. Dashboard’da Lina Ne Zaman Sessiz Kalır?



Lina şu durumlarda dashboard’da sesli konuşmaz:



\* Kullanıcı sesli yanıtları kapatmışsa

\* Sessiz saatler aktifse

\* Dashboard özeti o gün daha önce verilmişse

\* Bildirim düşük öncelikliyse

\* İçerik hassas veri içeriyorsa

\* Tarayıcı ses izni vermiyorsa

\* Kullanıcı aktif olarak ses istememişse

\* Platformda ses oynatma engellenmişse



Bu durumda Lina yazılı özet gösterebilir.



\---



\## 11. Dashboard’da Okunmayacak Hassas Veriler



Lina dashboard üzerinde şu bilgileri yazılı veya sesli olarak gereksiz yere paylaşmaz:



\* Telefon numarası

\* E-posta adresi

\* Açık adres

\* TC kimlik numarası

\* IBAN

\* Tapu bilgisi

\* Şifre

\* Token

\* API anahtarı

\* Özel müşteri notu

\* Finansal pazarlık detayı

\* Başka kullanıcının CRM kaydı

\* Başka kullanıcının özel mesajı



\---



\## 12. Dashboard Öncelik Seviyeleri



Lina dashboard verilerini öncelik seviyesine göre değerlendirir.



\### Seviye 0 — Bilgi Yok



Gösterilecek önemli veri yoktur.



Örnek:



“Bugün için önemli bir iş görünmüyor.”



\---



\### Seviye 1 — Düşük Öncelik



Yalnızca yazılı özet içinde gösterilir.



Örnek:



\* Genel platform duyurusu

\* Düşük öncelikli forum hareketi

\* Bilgilendirme mesajı



\---



\### Seviye 2 — Normal Öncelik



Dashboard kartında gösterilir. Sesli özet tercihi açıksa kısa sesli özet verilebilir.



Örnek:



\* Yeni mesaj

\* Yeni network yanıtı

\* Bugünkü CRM görevi

\* Portföy hareketi



\---



\### Seviye 3 — Yüksek Öncelik



Dashboard’da belirgin şekilde gösterilir.



Örnek:



\* Geciken CRM görevi

\* Kritik müşteri takibi

\* Admin bildirimi

\* Onay bekleyen önemli işlem



\---



\### Seviye 4 — Acil



Dashboard’da en üstte gösterilir. Kullanıcı izin vermişse sesli veya push uyarı verilebilir.



Örnek:



\* Kritik sistem uyarısı

\* Çok kısa süresi kalan görev

\* Acil admin bildirimi



\---



\## 13. Dashboard Kartlarıyla Lina İlişkisi



Lina dashboard kartlarını açıklayabilir ve kullanıcıyı yönlendirebilir.



Örnek kartlar:



\* Bugünkü İşler

\* CRM Takipleri

\* Yeni Mesajlar

\* Portföy Hareketleri

\* Network Yanıtları

\* Bildirimler

\* Başvurular

\* Sistem Durumu

\* Admin Özetleri



Kullanıcı kart hakkında soru sorarsa Lina kısa açıklama yapar.



Örnek:



“Bugünkü İşler kartı, bugün tamamlamanız gereken CRM görevlerini gösterir.”



\---



\## 14. Dashboard Aksiyon Önerileri



Lina dashboard’da kullanıcıya aksiyon önerebilir.



Örnekler:



\* “CRM görevlerinizi kontrol etmenizi öneririm.”

\* “Geciken takiplerinizi bugün tamamlamanız faydalı olabilir.”

\* “Portföy güncellemelerinizi kontrol edebilirsiniz.”

\* “Yeni mesajlarınıza dönüş yapmanız iyi olur.”



Lina kullanıcı adına otomatik aksiyon almaz.



Kullanıcı onayı gerekir.



\---



\## 15. Dashboard ve Push Notification İlişkisi



Dashboard üzerinde görünen her bilgi push notification olmak zorunda değildir.



Push notification yalnızca önemli olaylarda kullanılır.



Örnek push bildirimi:



“Bugünkü CRM görevinize 1 saat kaldı.”



Dashboard özeti push olarak gönderilecekse kısa olmalıdır.



Örnek:



“Bugünkü EPH özetiniz hazır.”



Detaylar dashboard ekranında gösterilir.



\---



\## 16. Dashboard ve CRM İlişkisi



Dashboard, CRM verilerini özet olarak gösterir.



Detaylar CRM ekranında yer alır.



Dashboard’da gösterilebilecek CRM bilgileri:



\* Bugünkü görev sayısı

\* Geciken görev sayısı

\* Takip bekleyen müşteri sayısı

\* Aktif müşteri sayısı

\* Riskli müşteri sayısı



Dashboard’da gösterilmeyecek CRM bilgileri:



\* Telefon

\* E-posta

\* Açık adres

\* Özel müşteri notu

\* Finansal pazarlık detayı



\---



\## 17. Dashboard ve Portföy / Stok İlişkisi



Dashboard, portföy ve stok hareketlerini özetleyebilir.



Gösterilebilir bilgiler:



\* Aktif ilan sayısı

\* Güncelleme bekleyen ilan sayısı

\* Yeni portföy hareketi

\* Stok hareketi

\* Yayında olan ilanlar

\* Pasif ilanlar



Gösterilmeyecek bilgiler:



\* Yetkisiz portföy detayları

\* Özel portföy notları

\* Başka kullanıcıların kapalı ilan bilgileri

\* Gizli fiyat pazarlığı detayları



\---



\## 18. Dashboard ve Network / Forum İlişkisi



Dashboard, network ve forum hareketlerini özetler.



Gösterilebilir bilgiler:



\* Yeni yanıt sayısı

\* Yeni talep sayısı

\* Kullanıcının taleplerine gelen dönüşler

\* Moderasyon bekleyen içerikler

\* Genel açık hareketler



Gösterilmeyecek bilgiler:



\* Özel mesaj içerikleri

\* Yetkisiz kullanıcıların kapalı talepleri

\* Telefon ve e-posta bilgileri

\* Moderasyon iç notları



\---



\## 19. Dashboard ve Mesajlar İlişkisi



Dashboard yalnızca mesaj özetini gösterir.



Gösterilebilir bilgiler:



\* Okunmamış mesaj sayısı

\* Yeni mesaj var bilgisi

\* Son mesaj zamanı

\* Kullanıcıya gelen görüşme bildirimi



Gösterilmeyecek bilgiler:



\* Başka kullanıcıların mesajları

\* Özel mesaj içerikleri

\* Telefon ve e-posta bilgileri

\* Hassas müşteri bilgileri



Örnek:



“2 okunmamış mesajınız var.”



\---



\## 20. Dashboard ve Bildirimler İlişkisi



Dashboard bildirimleri özetler.



Gösterilebilir bilgiler:



\* Okunmamış bildirim sayısı

\* Yeni sistem duyurusu

\* Admin bildirimi

\* CRM hatırlatması

\* Portföy hareketi

\* Başvuru durumu



Bildirim detayları ilgili bildirim ekranında gösterilir.



\---



\## 21. Dashboard Dil Politikası



Dashboard içinde Lina yalnızca Türkçe hizmet verir.



Kullanıcı farklı dil talep ederse Lina şu yanıtı verir:



“Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir.”



Bu kural yazılı ve sesli yanıtlar için geçerlidir.



\---



\## 22. Dashboard Loglama Kuralları



Loglanabilecek bilgiler:



\* Dashboard özeti üretildi mi?

\* Sesli özet verildi mi?

\* Sesli özet engellendi mi?

\* Hangi modül özete dahil edildi?

\* KVKK filtresi devreye girdi mi?

\* Kullanıcı tercihi nedeniyle özet kapatıldı mı?

\* Sessiz saat nedeniyle ses engellendi mi?



Loglanmaması gereken bilgiler:



\* Telefon

\* E-posta

\* Açık adres

\* Özel müşteri notu

\* Finansal pazarlık detayı

\* Şifre

\* Token

\* API anahtarı

\* Özel mesaj içeriği



\---



\## 23. Örnek Dashboard Senaryoları



\### Senaryo 1 — Normal Kullanıcı Günlük Özeti



Kullanıcı dashboard’a girer.



Lina:



“Bugün 3 CRM göreviniz, 2 okunmamış mesajınız ve 1 portföy hareketiniz var.”



\---



\### Senaryo 2 — Geciken Görev



Kullanıcı dashboard’a girer.



Lina:



“2 CRM görevinizin zamanı geçmiş görünüyor. Detayları CRM ekranınızdan kontrol edebilirsiniz.”



\---



\### Senaryo 3 — Sesli Özet Kapalı



Kullanıcı dashboard’a girer.



Lina sesli konuşmaz.



Dashboard üzerinde yazılı özet gösterilir.



\---



\### Senaryo 4 — Admin Dashboard



Admin dashboard’a girer.



Lina:



“Bugün 5 yeni başvuru, 3 bekleyen onay ve 12 aktif kullanıcı hareketi bulunuyor.”



\---



\### Senaryo 5 — Yetkisiz Veri



Kullanıcı:



“Başka kullanıcının dashboard özetini göster.”



Lina:



“Bu bilgiye erişim yetkiniz bulunmamaktadır.”



\---



\## 24. Teknik Karar Özeti



Dashboard’da Lina şu sırayla çalışmalıdır:



1\. Kullanıcı giriş kontrolü

2\. Kullanıcı rol kontrolü

3\. Dashboard yetki kontrolü

4\. Modül bazlı veri toplama

5\. KVKK filtresi

6\. Öncelik hesaplama

7\. Yazılı özet üretme

8\. Ses tercihi kontrolü

9\. Sessiz saat kontrolü

10\. Sesli özet üretme

11\. Gerekirse push notification ilişkisi kurma

12\. Loglama



\---



\## 25. Sonuç



Lina dashboard sistemi, kullanıcının EPH Platform içindeki günlük iş merkezidir.



Lina dashboard’da gereksiz konuşmaz.



Önemli olanı öne çıkarır.



Hassas veriyi korur.



Kullanıcıyı doğru ekrana yönlendirir.



Her dashboard yanıtında temel prensip şudur:



“Özetle, koru, yönlendir.”



