\# Lina Task Notifications — Bildirim, Hatırlatma ve Uyarı Sistemi



\## 1. Amaç



Bu dosya, EPH Platform içerisinde Lina AI'nin bildirim, hatırlatma, uyarı ve bilgilendirme sistemlerini tanımlar.



Lina yalnızca soru-cevap veren bir yapay zekâ değildir.



Lina aynı zamanda:



\* Takip eden

\* Hatırlatan

\* Bilgilendiren

\* Önceliklendiren

\* Yönlendiren



bir dijital asistan olarak çalışır.



Amaç:



Kullanıcının önemli gelişmeleri kaçırmamasını sağlamaktır.



\---



\# 2. Temel Bildirim Prensibi



Lina:



\* Gereksiz bildirim göndermez.

\* Kullanıcıyı rahatsız etmez.

\* Spam üretmez.

\* Önemsiz olayları filtreler.

\* Kritik olayları öne çıkarır.



Her bildirim şu sorudan geçer:



"Bu bilgi gerçekten kullanıcının dikkatini gerektiriyor mu?"



Cevap hayır ise bildirim oluşturulmaz.



\---



\# 3. Bildirim Türleri



Lina aşağıdaki bildirim türlerini destekler.



\## CRM Bildirimleri



\* Yeni görev

\* Yaklaşan görev

\* Geciken görev

\* Takip edilmesi gereken müşteri

\* Teklif süreci

\* Randevu hatırlatması



\---



\## Mesaj Bildirimleri



\* Yeni mesaj

\* Yeni görüşme

\* Okunmamış mesaj

\* Acil işaretli mesaj



\---



\## Network Bildirimleri



\* Yeni yanıt

\* Yeni görüşme isteği

\* Yeni yorum

\* Yeni etkileşim



\---



\## Portföy Bildirimleri



\* Yeni portföy hareketi

\* İlan güncellemesi

\* İlan süresi

\* Portföy durumu



\---



\## Admin Bildirimleri



\* Başvuru durumu

\* Sistem duyurusu

\* Kural güncellemesi

\* Platform bilgilendirmesi



\---



\## Sistem Bildirimleri



\* Güvenlik uyarıları

\* Bakım duyuruları

\* Teknik problemler

\* Kritik sistem olayları



\---



\# 4. Bildirim Öncelik Seviyeleri



Lina tüm bildirimleri öncelik seviyesine göre sınıflandırır.



\## Seviye 0 — Bilgilendirme



Kullanıcıyı rahatsız etmez.



Sadece ilgili sayfada görünür.



Örnek:



"Profiliniz güncellendi."



\---



\## Seviye 1 — Düşük Öncelik



Dashboard veya bildirim merkezinde görünür.



Örnek:



"Forum paylaşımınız beğenildi."



\---



\## Seviye 2 — Normal Öncelik



Push notification gönderilebilir.



Örnek:



"Yeni mesajınız var."



\---



\## Seviye 3 — Yüksek Öncelik



Push notification + Lina bildirimi.



Örnek:



"CRM görevinize 1 saat kaldı."



\---



\## Seviye 4 — Kritik



Push + Lina + sesli bildirim.



Örnek:



"Bugün tamamlanması gereken kritik göreviniz bulunuyor."



\---



\# 5. Push Notification Kuralları



Push notification gönderilebilir:



\* Yeni mesaj

\* Yeni görev

\* CRM hatırlatması

\* Admin bildirimi

\* Acil duyuru



Push notification gönderilmez:



\* Önemsiz hareketler

\* Tekrarlayan olaylar

\* Spam oluşturacak durumlar



\---



\# 6. Lina Yazılı Bildirimleri



Lina kullanıcıya kısa yazılı mesaj gönderebilir.



Örnek:



"Bugün CRM tarafında takip etmeniz gereken 2 müşteri bulunuyor."



\---



Örnek:



"Portföyünüzde güncelleme bekleyen 1 ilan var."



\---



\# 7. Lina Sesli Bildirimleri



Sesli bildirimler yalnızca:



\* Kullanıcı izin vermişse

\* Sessiz saat değilse

\* Bildirim önemliyse



çalışır.



Örnek:



"CRM hatırlatması. Bir saat sonra müşteri görüşmeniz bulunuyor."



\---



\# 8. Sessiz Saatler



Varsayılan:



22:00 - 08:00



Sessiz saatlerde:



\* Sesli bildirim yok

\* Push notification devam edebilir



Acil bildirimler hariç.



\---



\# 9. Acil Durum Bildirimleri



Acil bildirimler:



\* Kritik sistem problemi

\* Süresi dolmak üzere olan görev

\* Admin tarafından kritik işaretlenmiş duyuru



Örnek:



"Kritik bir bildiriminiz bulunuyor. Lütfen EPH Platform'u kontrol edin."



Detay sesli okunmaz.



\---



\# 10. Spam Önleme Kuralları



Lina aynı bildirimi tekrar tekrar göndermez.



Örnek:



Yeni mesaj bildirimi:



İlk mesaj:

Bildirim gönder.



Sonraki 10 mesaj:

Tek bildirim altında topla.



\---



\# 11. Mesaj Bildirim Mantığı



Yeni mesaj geldiğinde:



\* Push notification

\* Bildirim merkezi kaydı

\* Lina bildirimi



oluşturulabilir.



Mesaj içeriği bildirimde gösterilmez.



Örnek:



"Yeni bir mesajınız var."



\---



\# 12. CRM Hatırlatma Mantığı



Görev zamanı:



24 saat önce



1 saat önce



15 dakika önce



görev zamanı



hatırlatma üretilebilir.



\---



\# 13. CRM Risk Bildirimleri



Lina şu durumlarda risk bildirimi oluşturabilir:



\* Uzun süredir görüşme yok

\* Geciken görev

\* Bekleyen teklif

\* Eksik müşteri bilgisi



Örnek:



"Bir müşteriniz uzun süredir takip edilmiyor."



\---



\# 14. Network Bildirimleri



Örnek:



"Paylaşımınıza yeni bir yanıt geldi."



\---



Örnek:



"Yeni bir görüşme isteğiniz bulunuyor."



\---



\# 15. Portföy Bildirimleri



Örnek:



"Bir ilanınız güncelleme bekliyor."



\---



Örnek:



"Portföyünüzde yeni bir hareket oluştu."



\---



\# 16. Dashboard Özet Bildirimleri



Kullanıcı isterse günlük özet alabilir.



Örnek:



"Bugünkü özetiniz hazır."



\---



Haftalık özet:



"Haftalık performans raporunuz hazır."



\---



\# 17. Kullanıcı Tercihleri



Kullanıcı aşağıdakileri açıp kapatabilir:



\* Sesli bildirimler

\* CRM bildirimleri

\* Network bildirimleri

\* Portföy bildirimleri

\* Admin duyuruları

\* Haftalık özetler

\* Günlük özetler

\* Acil bildirimler



\---



\# 18. Admin Bildirimleri



Admin tarafından gönderilen bildirimler:



\* Sistem duyuruları

\* Kural güncellemeleri

\* Bilgilendirmeler



olarak işaretlenebilir.



Admin bildirimi:



Öncelik seviyesi alabilir.



\---



\# 19. SüperAdmin Bildirimleri



SüperAdmin:



\* Sistem sağlığı

\* Güvenlik olayları

\* Lina çalışma raporları

\* Kritik platform durumları



için bildirim alabilir.



\---



\# 20. Bildirim Merkezi



Tüm bildirimler bildirim merkezine kaydedilir.



Bildirim kayıtları:



\* Tür

\* Tarih

\* Öncelik

\* Okundu bilgisi

\* Kaynak modül



içerir.



\---



\# 21. KVKK Kuralları



Bildirimlerde şu bilgiler bulunmaz:



\* Telefon numarası

\* E-posta

\* Açık adres

\* TC Kimlik

\* IBAN

\* Tapu bilgileri

\* Finansal pazarlık detayları



\---



\# 22. Sesli Bildirim KVKK Kuralları



Sesli bildirimler daha sıkı filtrelenir.



Örnek yanlış:



"Ahmet Bey'in telefonu..."



Örnek doğru:



"CRM tarafında yeni bir gelişme bulunuyor."



\---



\# 23. Bildirim Loglama



Loglanabilecek bilgiler:



\* Bildirim oluşturuldu

\* Bildirim gönderildi

\* Push gönderildi

\* Sesli bildirim oynatıldı

\* Bildirim okundu



Loglanmayacak bilgiler:



\* Hassas müşteri verileri

\* Şifreler

\* Tokenlar

\* API anahtarları



\---



\# 24. Dil Politikası



Lina bildirimleri yalnızca Türkçe oluşturur.



Kullanıcı farklı dil isterse:



"Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir."



yanıtı verilir.



\---



\# 25. Gelecek Sürümler



İlerleyen sürümlerde:



\* WhatsApp entegrasyonu

\* E-posta entegrasyonu

\* SMS entegrasyonu

\* Akıllı zamanlama sistemi

\* Davranış analizi

\* Kişisel öncelik sistemi



eklenebilir.



\---



\# 26. Teknik Karar Özeti



Bildirim üretme sırası:



1\. Olay oluşur.

2\. Yetki kontrolü yapılır.

3\. KVKK filtresi uygulanır.

4\. Öncelik seviyesi belirlenir.

5\. Kullanıcı tercihleri kontrol edilir.

6\. Sessiz saat kontrol edilir.

7\. Push notification oluşturulur.

8\. Lina bildirimi oluşturulur.

9\. Sesli bildirim gerekiyorsa üretilir.

10\. Bildirim loglanır.



\---



\# 27. Sonuç



Lina bildirim sistemi;



kullanıcının işlerini takip eden,

önemli gelişmeleri kaçırmasını önleyen,

gereksiz bildirim göndermeyen,

KVKK uyumlu çalışan



akıllı bir dijital asistan sistemi olarak tasarlanmalıdır.



Temel prensip:



"Doğru zamanda, doğru kullanıcıya, doğru bildirim."



