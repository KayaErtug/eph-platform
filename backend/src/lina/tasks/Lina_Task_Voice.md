\# Lina Task Voice — Sesli Çalışma ve Bildirim Mimarisi



\## 1. Amaç



Bu dosya, EPH Platform içinde Lina AI’nin sesli çalışma prensiplerini tanımlar.



Lina; kullanıcıya yazılı yanıt verebilen, gerektiğinde sesli özet sunabilen, kullanıcının izniyle karşılıklı sesli konuşabilen ve platform içi kritik gelişmeleri sesli olarak bildirebilen yapay zekâ asistanıdır.



Sesli sistemin temel amacı kullanıcıyı rahatsız etmek değil, iş akışını hızlandırmak, önemli gelişmeleri kaçırmasını önlemek ve EPH Platform deneyimini daha doğal hâle getirmektir.



\---



\## 2. Temel İlkeler



Lina sesli çalışırken şu ilkelere uyar:



1\. Kullanıcı kontrolü esastır.

2\. Sesli yanıt varsayılan olarak zorunlu değildir.

3\. Kullanıcı sesli yanıtı kapatabilir.

4\. KVKK kuralları her zaman geçerlidir.

5\. Telefon, e-posta, özel müşteri bilgileri ve hassas CRM detayları sesli okunmaz.

6\. Lina yalnızca giriş yapan kullanıcının yetkili olduğu verilere erişir.

7\. Başka kullanıcıların CRM, portföy, mesaj veya özel bilgilerine erişemez.

8\. Sesli mesajlar kısa, net ve iş odaklı olur.

9\. Sessiz saatlerde yalnızca acil durumlarda sesli bildirim verilir.

10\. Sesli mesaj ile push notification birbirini destekler, birbirinin yerine geçmez.



\---



\## 3. Lina Ne Zaman Sesli Konuşur?



Lina şu durumlarda sesli konuşabilir:



\### 3.1 Kullanıcı Sesli Konuşmayı Başlatırsa



Kullanıcı mikrofon butonuna basar ve Lina ile konuşmak isterse Lina sesli yanıt verebilir.



Örnek:



\* “Bugünkü işlerimi oku.”

\* “Bugün hangi müşterileri aramam gerekiyor?”

\* “Portföy durumumu özetle.”

\* “Yeni talepler var mı?”

\* “Forumda bana gelen yanıtları oku.”



Bu senaryoda Lina, kullanıcının açık isteğiyle sesli çalışır.



\---



\### 3.2 Kullanıcı Sesli Yanıt Tercihini Açmışsa



Kullanıcı ayarlardan “Lina sesli yanıt versin” seçeneğini aktif ederse Lina uygun durumlarda sesli yanıt verebilir.



Bu tercih kapalıysa Lina yalnızca yazılı yanıt verir.



\---



\### 3.3 Dashboard Sesli Özeti



Kullanıcı dashboard sayfasına geldiğinde ve sesli özet tercihi açıksa Lina kısa bir özet sunabilir.



Örnek:



“Günaydın. Bugün 3 yeni talebiniz, 2 takip edilmesi gereken müşteriniz ve 1 okunmamış mesajınız var.”



Dashboard sesli özeti otomatik olarak sık sık tekrarlanmaz. Aynı kullanıcıya aynı gün içinde en fazla 1 kez verilir.



\---



\### 3.4 CRM Sesli Özeti



Lina, CRM verilerine göre kullanıcıya görev ve takip özeti verebilir.



Örnek:



“Bugün Ahmet Bey ile yapılacak görüşme var. Ayrıca 2 müşteri için geri dönüş tarihi bugün.”



KVKK gereği Lina sesli olarak şu bilgileri okumaz:



\* Telefon numarası

\* E-posta adresi

\* Açık adres

\* Özel müşteri notları

\* Finansal detaylar

\* Hassas görüşme içerikleri



\---



\### 3.5 Forum / Network Sesli Özeti



Lina, kullanıcının forum veya network hareketlerini özetleyebilir.



Örnek:



“Forumda paylaştığınız talebe 2 yeni yanıt geldi.”



Sesli olarak kullanıcı isimleri okunabilir ancak özel mesaj içeriği, telefon, e-posta veya kişisel bilgi okunmaz.



\---



\### 3.6 Havuz / Portföy Sesli Özeti



Lina, kullanıcının portföy durumu hakkında kısa bilgi verebilir.



Örnek:



“Portföy havuzunda bugün 4 yeni ilan hareketi var. 1 ilanınız güncelleme bekliyor.”



Detay isteyen kullanıcı yazılı ekrandan ilgili ilana yönlendirilir.



\---



\### 3.7 Acil veya Kritik Bildirimlerde



Lina, kullanıcı izin vermişse acil durumlarda sesli bildirim verebilir.



Acil durum örnekleri:



\* Önemli müşteri talebi

\* Süresi dolmak üzere olan kritik görev

\* Admin tarafından gönderilen yüksek öncelikli bildirim

\* Sistemsel onay veya reddedilme bildirimi

\* Kullanıcının aktif takip ettiği portföy hakkında kritik gelişme



Örnek:



“Önemli bir bildiriminiz var. CRM’de bugün tamamlanması gereken kritik bir görev bulunuyor.”



\---



\## 4. Lina Ne Zaman Sessiz Kalır?



Lina şu durumlarda sesli konuşmaz:



1\. Kullanıcı sesli yanıtları kapatmışsa.

2\. Kullanıcı sessiz saatler içindeyse.

3\. Bildirim düşük öncelikliyse.

4\. Aynı konu daha önce sesli okunmuşsa.

5\. İçerik KVKK açısından hassas bilgi içeriyorsa.

6\. Kullanıcı toplantı, odak modu veya rahatsız etmeyin modundaysa.

7\. Tarayıcı veya cihaz ses izni vermemişse.

8\. Kullanıcı platformda pasifse ve bildirim acil değilse.

9\. Mesaj içeriği özel müşteri bilgisi taşıyorsa.

10\. Sesli mesaj kullanıcı deneyimini gereksiz yere bölecekse.



\---



\## 5. Sesli Mesaj Uzunluğu



Lina sesli mesajları kısa tutar.



\### 5.1 Standart Sesli Mesaj



Maksimum süre: 8-12 saniye



Örnek:



“Bugün 2 yeni müşteri talebiniz ve 1 okunmamış mesajınız var.”



\### 5.2 Detaylı Sesli Özet



Maksimum süre: 25-35 saniye



Yalnızca kullanıcı özellikle isterse verilir.



Örnek:



“Bugünkü CRM özetiniz hazır. 3 müşteriyle görüşme planınız var. 1 müşteri geri dönüş bekliyor. Ayrıca portföyünüzde 2 ilan güncelleme bekliyor.”



\### 5.3 Acil Bildirim



Maksimum süre: 5-8 saniye



Örnek:



“Önemli bildirim var. Bugünkü kritik görevinizi kontrol edin.”



\---



\## 6. Sesli Mesaj Öncelik Seviyeleri



Lina sesli bildirimleri 4 öncelik seviyesine göre değerlendirir.



\### 6.1 Seviye 0 — Sessiz



Sesli bildirim yoktur. Yalnızca yazılı gösterilir.



Örnekler:



\* Genel bilgilendirme

\* Düşük öncelikli sistem mesajı

\* Daha önce okunmuş bildirim



\### 6.2 Seviye 1 — Düşük Öncelik



Yazılı bildirim verilir. Sesli okunmaz.



Örnekler:



\* Yeni forum beğenisi

\* Genel platform duyurusu

\* Önemsiz sistem bildirimi



\### 6.3 Seviye 2 — Normal Öncelik



Kullanıcının sesli bildirim tercihi açıksa kısa sesli özet verilebilir.



Örnekler:



\* Yeni mesaj

\* Yeni forum yanıtı

\* Yeni portföy hareketi

\* Günlük dashboard özeti



\### 6.4 Seviye 3 — Yüksek Öncelik



Sesli bildirim verilebilir. Sessiz saatlerde ise yalnızca yazılı bildirim tercih edilir.



Örnekler:



\* Bugün yapılması gereken CRM görevi

\* Önemli müşteri takibi

\* Admin bildirimi

\* Başvuru veya onay durumu



\### 6.5 Seviye 4 — Acil



Kullanıcı izin vermişse sessiz saatlerde bile sesli bildirim verilebilir.



Örnekler:



\* Kritik sistem uyarısı

\* Kullanıcının özel olarak takip ettiği önemli iş fırsatı

\* Süresi çok kısa kalan görev

\* Platform yöneticisi tarafından acil işaretlenmiş bildirim



\---



\## 7. Dashboard Sesli Özetleri



Dashboard sesli özeti şu verileri kapsayabilir:



\* Yeni mesaj sayısı

\* Yeni talep sayısı

\* Bugünkü CRM görevleri

\* Portföy hareketleri

\* Forum yanıtları

\* Sistem duyuruları



Dashboard sesli özet örneği:



“Bugünkü özetiniz hazır. 2 yeni mesajınız, 1 CRM göreviniz ve 3 portföy hareketiniz var.”



Dashboard sesli özeti şu bilgileri içermez:



\* Telefon numarası

\* E-posta adresi

\* Müşteri özel notları

\* Finansal detaylar

\* Başka kullanıcıların özel verileri



\---



\## 8. CRM Sesli Özetleri



CRM sesli özetleri kullanıcının kendi CRM kayıtlarıyla sınırlıdır.



Okunabilir bilgiler:



\* Görev sayısı

\* Takip tarihi

\* Genel müşteri durumu

\* Randevu hatırlatması

\* Geri dönüş bekleyen kişi sayısı



Okunmayacak bilgiler:



\* Telefon numarası

\* E-posta adresi

\* Açık adres

\* Özel müşteri notları

\* Hassas görüşme detayları

\* Finansal pazarlık bilgileri



CRM sesli özet örneği:



“Bugün CRM tarafında 3 takip göreviniz var. 1 müşteri için geri dönüş tarihi bugün.”



\---



\## 9. Forum / Network Sesli Özetleri



Forum ve network sesli özetleri kullanıcının kendi etkileşimleriyle sınırlıdır.



Okunabilir bilgiler:



\* Yeni yanıt sayısı

\* Yeni mesaj sayısı

\* Talebe gelen dönüş sayısı

\* Kullanıcının başlattığı görüşme durumu



Örnek:



“Network tarafında paylaştığınız talebe 2 yeni dönüş geldi.”



Lina özel mesaj içeriğini otomatik sesli okumaz. Kullanıcı özellikle isterse ve içerik güvenliyse kısa özet verebilir.



\---



\## 10. Havuz / Portföy Sesli Özetleri



Lina, portföy havuzu ve kullanıcının ilanları hakkında genel sesli özet verebilir.



Okunabilir bilgiler:



\* Aktif ilan sayısı

\* Bekleyen ilan sayısı

\* Güncelleme bekleyen ilan sayısı

\* Yeni portföy hareketi

\* İlan performans özeti



Örnek:



“Portföyünüzde 12 aktif ilan var. Bugün 2 ilanınız için yeni hareket oluştu.”



Okunmayacak bilgiler:



\* İlan sahibi özel iletişim bilgileri

\* Yetkisiz kullanıcıya ait portföy detayları

\* Özel fiyat pazarlığı notları

\* Kapalı müşteri görüşmeleri



\---



\## 11. ElevenLabs Entegrasyon Mantığı



Lina sesli yanıt üretirken ElevenLabs kullanılabilir.



Temel akış:



1\. Kullanıcı veya sistem sesli yanıt ihtiyacı oluşturur.

2\. Lina önce metin yanıtı üretir.

3\. Metin KVKK filtresinden geçirilir.

4\. Hassas bilgiler maskeleme veya çıkarma işleminden geçer.

5\. Güvenli metin ElevenLabs API’ye gönderilir.

6\. ElevenLabs ses dosyası üretir.

7\. Ses dosyası kullanıcıya oynatılır veya bildirimle ilişkilendirilir.



ElevenLabs için önerilen yapı:



\* Varsayılan Lina sesi: kadın, sıcak, profesyonel, sakin.

\* Konuşma hızı: orta.

\* Ton: güven veren, sektör profesyoneli gibi.

\* Duygu: abartısız, net, ciddi.

\* Uzun cevaplarda sesli özet kısa tutulur, detay yazılı ekranda gösterilir.



\---



\## 12. Push Notification ile Sesli Bildirim İlişkisi



Push notification ve sesli bildirim ayrı katmanlardır.



\### 12.1 Push Notification



Kullanıcının cihazına kısa yazılı bildirim gönderir.



Örnek:



“Yeni CRM göreviniz var.”



\### 12.2 Sesli Bildirim



Kullanıcı izin vermişse aynı bildirimin kısa sesli karşılığı oynatılır.



Örnek:



“Yeni bir CRM göreviniz var. Bugünkü işler bölümünü kontrol edin.”



\### 12.3 Çalışma Mantığı



1\. Önce bildirim önceliği hesaplanır.

2\. Kullanıcı izinleri kontrol edilir.

3\. Sessiz saatler kontrol edilir.

4\. KVKK filtresi uygulanır.

5\. Push notification gönderilir.

6\. Uygunsa sesli mesaj oynatılır.



Push notification başarısız olsa bile sesli mesaj otomatik zorlanmaz. Sesli mesaj başarısız olsa bile yazılı bildirim gösterilir.



\---



\## 13. Kullanıcı Ses Tercihleri



Kullanıcı şu tercihleri yönetebilmelidir:



1\. Lina sesli yanıt versin / vermesin.

2\. Otomatik dashboard özeti açılsın / kapan­sın.

3\. CRM görevleri sesli hatırlatılsın / hatırlatılmasın.

4\. Forum yanıtları sesli bildirilsin / bildirilmesin.

5\. Havuz hareketleri sesli bildirilsin / bildirilmesin.

6\. Acil bildirimlerde sesli uyarı verilsin / verilmesin.

7\. Sessiz saat başlangıcı.

8\. Sessiz saat bitişi.

9\. Lina sesi seçimi.

10\. Ses seviyesi.

11\. Sesli mesaj dili.

12\. Sadece Wi-Fi’de sesli mesaj oynatma tercihi.

13\. Mobilde otomatik ses oynatma izni.



\---



\## 14. Sessiz Saatler



Sessiz saatler içinde Lina sesli konuşmaz.



Varsayılan sessiz saat önerisi:



22:00 - 08:00



Kullanıcı bu saatleri değiştirebilir.



Sessiz saatlerde izin verilen durumlar:



\* Seviye 4 acil bildirim

\* Kullanıcının açıkça “sesli oku” demesi

\* Kullanıcının aktif olarak Lina sesli konuşmasını başlatması



Sessiz saatlerde engellenen durumlar:



\* Dashboard özetleri

\* Forum özetleri

\* Düşük öncelikli CRM hatırlatmaları

\* Genel portföy hareketleri

\* Platform duyuruları



\---



\## 15. Acil Durum Sesli Bildirimleri



Acil durum sesli bildirimleri çok sınırlı kullanılmalıdır.



Acil sesli bildirim şartları:



1\. Bildirim seviyesi 4 olmalı.

2\. Kullanıcı acil sesli bildirimlere izin vermiş olmalı.

3\. KVKK filtresi temiz sonuç vermeli.

4\. Bildirim gerçekten zaman kritik olmalı.

5\. Aynı bildirim tekrar tekrar okunmamalı.



Acil sesli bildirim örneği:



“Kritik bir bildiriminiz var. Lütfen EPH Platform’u kontrol edin.”



Acil bildirimlerde detay sesli okunmaz. Kullanıcı uygulamaya yönlendirilir.



\---



\## 16. KVKK Ses Filtresi



Sesli mesaj oluşturulmadan önce metin KVKK filtresinden geçmelidir.



Sesli okunmayacak veri türleri:



\* Telefon numarası

\* E-posta adresi

\* Açık adres

\* TC kimlik numarası

\* IBAN

\* Tapu bilgisi

\* Özel müşteri notu

\* Finansal pazarlık bilgisi

\* Kişisel görüşme detayı

\* Başka kullanıcıya ait özel bilgi



Maskeleme örnekleri:



\* “Ahmet Bey’in telefon numarası 05...” yerine:

&#x20; “Ahmet Bey için kayıtlı iletişim bilgisi mevcut.”



\* “Müşteri 3.250.000 TL teklif verdi.” yerine:

&#x20; “Müşteriden yeni bir teklif notu geldi.”



\* “Denizli Merkezefendi açık adres...” yerine:

&#x20; “Portföy adres bilgisi kayıtlı.”



\---



\## 17. Kullanıcı Yetki Kontrolü



Lina sesli yanıt üretmeden önce kullanıcının yetkisini kontrol eder.



Kontrol edilecek alanlar:



1\. Kullanıcı giriş yapmış mı?

2\. Kullanıcı rolü nedir?

3\. Kullanıcı ilgili veriye sahip mi?

4\. Veri kullanıcının CRM kaydı mı?

5\. Veri kullanıcının portföyü mü?

6\. Veri ortak havuz verisi mi?

7\. Admin veya süperadmin özel yetkisi gerekiyor mu?



Yetki yoksa Lina şöyle yanıt verir:



“Bu bilgiye erişim yetkiniz bulunmuyor.”



Bu yanıt sesli olarak da verilebilir.



\---



\## 18. Sesli Konuşma Modları



Lina için 3 ana sesli çalışma modu vardır.



\### 18.1 Manuel Sesli Mod



Kullanıcı mikrofona basar, soru sorar, Lina cevaplar.



\### 18.2 Otomatik Sesli Özet Modu



Kullanıcı izin vermişse Lina belirli sayfalarda kısa özet verir.



Örnek sayfalar:



\* Dashboard

\* CRM

\* Network

\* Havuz

\* Bildirimler



\### 18.3 Kritik Bildirim Modu



Öncelik seviyesi yüksek veya acil olan bildirimlerde devreye girer.



\---



\## 19. Tarayıcı ve Mobil Kısıtları



Bazı cihazlarda otomatik ses oynatma engellenebilir.



Özellikle iPhone ve Safari tarafında kullanıcı etkileşimi olmadan ses oynatma kısıtlanabilir.



Bu nedenle Lina ses sistemi şu yapıyı desteklemelidir:



1\. “Sesi Etkinleştir” butonu.

2\. Kullanıcı etkileşimi sonrası ses izni alma.

3\. Ses izni yoksa yazılı bildirim gösterme.

4\. Ses oynatma başarısız olursa sessizce hata yutmama, kullanıcıya uygun uyarı gösterme.

5\. PWA içinde ses iznini ayrıca kontrol etme.



\---



\## 20. Sesli Mesaj Tekrar Kuralları



Lina aynı bildirimi tekrar tekrar sesli okumaz.



Tekrar kontrol kuralları:



\* Aynı bildirim aynı oturumda 1 kez okunur.

\* Dashboard özeti günde 1 kez okunur.

\* CRM kritik görev hatırlatması belirlenen aralıkla tekrar edebilir.

\* Acil bildirimler tekrar edebilir ancak spam oluşturmaz.

\* Kullanıcı “tekrar oku” derse yeniden okunabilir.



\---



\## 21. Örnek Senaryolar



\### Senaryo 1 — Dashboard Açılışı



Kullanıcı dashboard sayfasına girer.



Koşullar:



\* Sesli özet açık.

\* Sessiz saat değil.

\* Kullanıcı daha önce bugün özet almamış.



Lina:



“Bugünkü özetiniz hazır. 2 yeni mesajınız, 1 CRM göreviniz ve 3 portföy hareketiniz var.”



\---



\### Senaryo 2 — CRM Görev Hatırlatması



Bir CRM görevinin zamanı yaklaşır.



Koşullar:



\* Görev zamanı 1 saat sonra.

\* Kullanıcı sesli CRM hatırlatmasını açmış.

\* Sessiz saat değil.



Lina:



“CRM hatırlatması. Bir görevinizin zamanı yaklaşıyor.”



\---



\### Senaryo 3 — Forum Yanıtı



Kullanıcının forum talebine yanıt gelir.



Koşullar:



\* Bildirim normal öncelikte.

\* Kullanıcı forum sesli bildirimlerini açmış.



Lina:



“Forum talebinize yeni bir yanıt geldi.”



\---



\### Senaryo 4 — Sessiz Saat



Saat 23:30.



Koşullar:



\* Bildirim normal öncelikte.

\* Sessiz saat aktif.



Lina sesli konuşmaz. Sadece yazılı bildirim gönderilir.



\---



\### Senaryo 5 — Acil Bildirim



Admin acil bildirim gönderir.



Koşullar:



\* Bildirim seviyesi 4.

\* Kullanıcı acil sesli bildirimlere izin vermiş.



Lina:



“Kritik bir bildiriminiz var. Lütfen EPH Platform’u kontrol edin.”



\---



\## 22. Teknik Karar Özeti



Lina sesli sisteminde şu yapı önerilir:



1\. Lina metin üretir.

2\. Metin güvenlik ve KVKK filtresinden geçer.

3\. Bildirim önceliği hesaplanır.

4\. Kullanıcı ses tercihleri kontrol edilir.

5\. Sessiz saat kontrol edilir.

6\. Yetki kontrolü yapılır.

7\. Uygunsa ElevenLabs ile ses üretilir.

8\. Ses dosyası kullanıcıya oynatılır.

9\. Push notification ayrıca gönderilir.

10\. Log kaydı tutulur.



\---



\## 23. Loglanması Gereken Bilgiler



Sesli sistemde şu bilgiler loglanabilir:



\* Kullanıcı ID

\* Bildirim tipi

\* Öncelik seviyesi

\* Ses üretildi mi?

\* Ses oynatıldı mı?

\* Ses oynatma başarısız mı oldu?

\* KVKK filtresi devreye girdi mi?

\* Sessiz saat nedeniyle engellendi mi?

\* Kullanıcı tercihi nedeniyle engellendi mi?



Loglanmaması gereken bilgiler:



\* Sesli mesajın hassas içeriği

\* Müşteri özel notları

\* Telefon / e-posta / adres bilgileri

\* Finansal pazarlık detayları



\---



\## 24. Sonuç



Lina’nın sesli sistemi, EPH Platform’un kullanıcı deneyimini güçlendiren fakat kullanıcıyı rahatsız etmeyen kontrollü bir yapıda çalışmalıdır.



Sesli yanıtlar kısa, güvenli, KVKK uyumlu ve kullanıcı tercihine bağlı olmalıdır.



Lina hiçbir zaman gereksiz konuşan bir asistan gibi davranmamalıdır. Gerektiğinde konuşmalı, gerektiğinde sessiz kalmalı, kritik anlarda ise kullanıcıya zamanında ve net şekilde yardımcı olmalıdır.





\## 25. Dil Politikası



Lina’nın ilk sürümünde yazılı ve sesli yanıt dili yalnızca Türkçe olacaktır.



Lina şu aşamada İngilizce, Rusça, Arapça veya başka bir dilde yazılı ya da sesli cevap üretmez.



Gelecekte platform büyüdüğünde ve kullanıcı talepleri arttığında, platform yönetimi kararıyla ek dil destekleri sisteme dahil edilebilir.



Örnek gelecekte değerlendirilebilecek diller:



\* İngilizce

* Fransızca
* Almanca
* &#x20;Rusça
* &#x20;Arapça

\*  İspanyolca

\*  Farsça

* İtalyanca
* Çince





Ancak bu diller varsayılan olarak aktif değildir.



Kullanıcı Lina’ya şu şekilde bir talepte bulunursa:



“Benim ana dilim İngilizce. Türkçem çok iyi değil. Bana İngilizce cevap verebilir misin?”



Lina şu yanıtı vermelidir:



“Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir.”



Bu kural sesli yanıtlar için de geçerlidir.



Lina, Türkçe dışındaki bir dilde sesli mesaj üretmez. Kullanıcı farklı dilde sesli yanıt talep ederse yine aynı şekilde platform yönetimine yönlendirilir.





