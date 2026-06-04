\# Lina v1 Technical Architecture — NestJS, AI, Ses ve Güvenlik Mimarisi



\## 1. Amaç



Bu doküman, EPH Platform içerisinde Lina AI v1 sisteminin teknik mimarisini tanımlar.



Lina v1’in amacı:



\* Kullanıcıya Türkçe yazılı yanıt vermek

\* Kullanıcı izniyle Türkçe sesli yanıt üretmek

\* CRM, Dashboard, Forum, Havuz ve Bildirim verilerini güvenli şekilde özetlemek

\* Yetki kontrolü yapmak

\* KVKK filtresi uygulamak

\* OpenAI, Claude ve ElevenLabs servislerini kontrollü şekilde kullanmak

\* EPH Platform içinde profesyonel, güvenli ve denetlenebilir yapay zekâ deneyimi sunmaktır.



\---



\## 2. Lina v1 Temel Kararları



Lina v1 için temel kararlar:



1\. Lina yalnızca Türkçe çalışır.

2\. Yazılı ve sesli yanıt verebilir.

3\. Sesli yanıt için ElevenLabs kullanılabilir.

4\. Metin üretimi için OpenAI veya Claude kullanılabilir.

5\. Kullanıcı tercihleri dikkate alınır.

6\. Yetki kontrolü yapılmadan özel veri kullanılmaz.

7\. KVKK filtresi uygulanmadan sesli yanıt üretilmez.

8\. Telefon, e-posta, açık adres ve özel müşteri bilgileri sesli okunmaz.

9\. Lina kullanıcı adına kritik işlem yapmaz.

10\. Kullanıcı onayı olmadan mesaj, forum yanıtı veya CRM kaydı oluşturmaz.



\---



\## 3. Backend Modül Yapısı



Önerilen NestJS klasör yapısı:



```text

backend/src/lina

├── lina.module.ts

├── lina.controller.ts

├── lina.service.ts

├── lina-ai.service.ts

├── lina-voice.service.ts

├── lina-access.service.ts

├── lina-kvkk.service.ts

├── lina-memory.service.ts

├── lina-audit.service.ts

├── lina-notification.service.ts

├── dto

│   ├── lina-chat.dto.ts

│   ├── lina-voice.dto.ts

│   ├── lina-preferences.dto.ts

│   └── lina-feedback.dto.ts

├── tasks

│   ├── Lina\_Task\_Voice.md

│   ├── Lina\_Task\_AccessControl.md

│   ├── Lina\_Task\_CRM.md

│   ├── Lina\_Task\_Dashboard.md

│   ├── Lina\_Task\_Notifications.md

│   ├── Lina\_Task\_Forum.md

│   ├── Lina\_Task\_Pool.md

│   ├── Lina\_Task\_Memory.md

│   └── Lina\_Task\_Audit.md

└── prompts

&#x20;   ├── Lina\_Core\_Prompt.md

&#x20;   ├── Lina\_Prompt\_Emlakci.md

&#x20;   ├── Lina\_Prompt\_Muteahhit.md

&#x20;   ├── Lina\_Prompt\_InsaatFirmasi.md

&#x20;   ├── Lina\_Prompt\_Moderator.md

&#x20;   ├── Lina\_Prompt\_Admin.md

&#x20;   └── Lina\_Prompt\_SuperAdmin.md

```



\---



\## 4. Ana Servis Sorumlulukları



\### 4.1 LinaService



Ana orkestrasyon servisidir.



Görevleri:



\* Kullanıcı isteğini alır.

\* Kullanıcı rolünü belirler.

\* İlgili promptları yükler.

\* Yetki kontrolünü başlatır.

\* KVKK filtresini uygular.

\* AI servisinden yanıt alır.

\* Ses gerekiyorsa LinaVoiceService’e gönderir.

\* Audit kaydı oluşturur.

\* Kullanıcıya güvenli yanıt döner.



\---



\### 4.2 LinaAiService



OpenAI veya Claude bağlantısını yönetir.



Görevleri:



\* Sistem promptunu hazırlar.

\* Role özel promptu ekler.

\* Task dokümanlarından ilgili bağlamı kullanır.

\* Model seçimini yapar.

\* AI yanıtını üretir.

\* Hataları yakalar.

\* Yanıtı LinaService’e döner.



\---



\### 4.3 LinaVoiceService



ElevenLabs ses üretiminden sorumludur.



Görevleri:



\* Sesli yanıt iznini kontrol eder.

\* Sessiz saatleri kontrol eder.

\* KVKK filtresinden geçmiş metni alır.

\* ElevenLabs API ile ses üretir.

\* Ses dosyasını güvenli şekilde döner.

\* Ses üretim hatalarını yönetir.



\---



\### 4.4 LinaAccessService



Yetki kontrolünden sorumludur.



Görevleri:



\* Kullanıcı giriş kontrolü

\* Rol kontrolü

\* Veri sahipliği kontrolü

\* Modül bazlı yetki kontrolü

\* Admin / SüperAdmin ayrımı

\* Yetkisiz istekleri engelleme



\---



\### 4.5 LinaKvkkService



KVKK filtresinden sorumludur.



Görevleri:



\* Telefon maskeleme

\* E-posta maskeleme

\* Açık adres risk kontrolü

\* TC / IBAN / tapu bilgisi kontrolü

\* Özel müşteri notu risk kontrolü

\* Sesli yanıtta ekstra güvenlik filtresi



\---



\### 4.6 LinaMemoryService



Kullanıcı tercih hafızasını yönetir.



Görevleri:



\* Ses tercihi

\* Sessiz saat

\* Dashboard özet tercihi

\* CRM hatırlatma tercihi

\* Bildirim tercihleri

\* Kullanıcı “unut” komutları

\* Hassas veriyi hafızaya almama



\---



\### 4.7 LinaAuditService



Loglama ve denetimden sorumludur.



Görevleri:



\* Lina isteğini loglama

\* Yetkisiz erişim girişimlerini loglama

\* KVKK filtresi sonuçlarını loglama

\* Sesli yanıt üretimini loglama

\* Kritik olayları işaretleme



\---



\### 4.8 LinaNotificationService



Bildirim ilişkisini yönetir.



Görevleri:



\* CRM hatırlatmaları

\* Dashboard özet bildirimleri

\* Network bildirimleri

\* Portföy bildirimleri

\* Sesli bildirim ilişkisi

\* Push notification entegrasyonu



\---



\## 5. Endpoint Tasarımı



Önerilen endpointler:



\### 5.1 Yazılı Lina Mesajı



```text

POST /lina/chat

```



Amaç:



Kullanıcının yazılı mesajını alır ve Lina’nın Türkçe yazılı yanıtını döner.



\---



\### 5.2 Sesli Yanıt Üretme



```text

POST /lina/voice

```



Amaç:



Güvenli metinden ElevenLabs ile Türkçe sesli yanıt üretir.



\---



\### 5.3 Dashboard Özeti



```text

GET /lina/dashboard-summary

```



Amaç:



Giriş yapan kullanıcının dashboard özetini üretir.



\---



\### 5.4 CRM Özeti



```text

GET /lina/crm-summary

```



Amaç:



Kullanıcının kendi CRM görev ve takip özetini üretir.



\---



\### 5.5 Network / Forum Özeti



```text

GET /lina/network-summary

```



Amaç:



Kullanıcının yetkili olduğu network ve forum hareketlerini özetler.



\---



\### 5.6 Portföy / Havuz Özeti



```text

GET /lina/pool-summary

```



Amaç:



Kullanıcının portföy ve havuz özetini üretir.



\---



\### 5.7 Lina Tercihleri



```text

GET /lina/preferences

PATCH /lina/preferences

```



Amaç:



Kullanıcının Lina tercihlerini okur ve günceller.



\---



\### 5.8 Lina Hafızasını Sıfırlama



```text

DELETE /lina/memory

```



Amaç:



Kullanıcının Lina tercih hafızasını sıfırlar.



\---



\## 6. Veritabanı Tablo Önerileri



\### 6.1 LinaPreference



Kullanıcının Lina tercihlerini tutar.



Alanlar:



\* id

\* userId

\* voiceEnabled

\* dashboardVoiceSummaryEnabled

\* crmVoiceReminderEnabled

\* networkVoiceSummaryEnabled

\* poolVoiceSummaryEnabled

\* quietHoursEnabled

\* quietHoursStart

\* quietHoursEnd

\* urgentVoiceEnabled

\* summaryStyle

\* createdAt

\* updatedAt



\---



\### 6.2 LinaMemory



Kullanıcı tercih hafızasını tutar.



Alanlar:



\* id

\* userId

\* key

\* value

\* type

\* expiresAt

\* createdAt

\* updatedAt



Not:



Hassas müşteri verisi bu tabloda tutulmaz.



\---



\### 6.3 LinaAuditLog



Lina güvenlik ve kullanım kayıtlarını tutar.



Alanlar:



\* id

\* userId

\* role

\* module

\* action

\* riskLevel

\* result

\* kvkkFiltered

\* voiceGenerated

\* blockedReason

\* createdAt



Not:



Telefon, e-posta, özel müşteri notu ve mesaj içeriği loglanmaz.



\---



\### 6.4 LinaVoiceLog



Sesli yanıt kayıtlarını tutar.



Alanlar:



\* id

\* userId

\* sourceModule

\* voiceProvider

\* textLength

\* generated

\* played

\* failedReason

\* createdAt



Ses metninin tamamı saklanmamalıdır.



\---



\### 6.5 LinaNotificationRule



Lina bildirim kurallarını yönetir.



Alanlar:



\* id

\* userId

\* module

\* notificationType

\* enabled

\* voiceEnabled

\* priorityLevel

\* createdAt

\* updatedAt



\---



\## 7. AI Model Kullanım Mantığı



Lina v1’de iki AI sağlayıcı desteklenebilir:



\* OpenAI

\* Claude



Önerilen kullanım:



\### OpenAI



\* Hızlı yanıtlar

\* Dashboard özetleri

\* CRM kısa özetleri

\* Bildirim metinleri

\* Kısa forum yanıt taslakları



\### Claude



\* Daha uzun analizler

\* Doküman yorumlama

\* Geniş stratejik özetler

\* Karmaşık talep analizleri

\* Uzun forum / havuz değerlendirmeleri



Varsayılan model seçimi sistem ayarından yönetilebilir.



\---



\## 8. ElevenLabs Kullanım Mantığı



ElevenLabs yalnızca güvenli ve KVKK filtresinden geçmiş metinler için kullanılmalıdır.



Ses üretim sırası:



1\. Lina yazılı metni üretir.

2\. KVKK filtresi uygulanır.

3\. Sesli yanıt izni kontrol edilir.

4\. Sessiz saat kontrol edilir.

5\. Metin uzunluğu kontrol edilir.

6\. ElevenLabs API’ye gönderilir.

7\. Ses dosyası üretilir.

8\. Kullanıcıya döndürülür.

9\. Audit ve voice log oluşturulur.



\---



\## 9. KVKK Filtresi Teknik Mantığı



KVKK filtresi iki aşamalı çalışmalıdır.



\### 9.1 Yazılı Yanıt Filtresi



Kontrol edilecek alanlar:



\* Telefon

\* E-posta

\* TC kimlik

\* IBAN

\* Açık adres

\* Şifre

\* Token

\* API key

\* Özel müşteri notları



\---



\### 9.2 Sesli Yanıt Filtresi



Sesli yanıtta daha sıkı filtre uygulanır.



Sesli yanıtta engellenecekler:



\* Telefon

\* E-posta

\* Açık adres

\* Finansal pazarlık detayı

\* Özel mesaj içeriği

\* CRM özel notu

\* Yetkisiz portföy bilgisi



\---



\## 10. Prompt Yükleme Mantığı



Lina yanıt üretirken şu prompt kaynakları kullanılmalıdır:



1\. Lina\_Core\_Prompt.md

2\. Kullanıcı rolüne uygun role prompt

3\. İstek modülüne uygun task dokümanı

4\. Dil politikası

5\. KVKK politikası

6\. Kullanıcı tercihleri



Örnek:



Emlakçı CRM sorusu sorarsa:



\* Lina\_Core\_Prompt.md

\* Lina\_Prompt\_Emlakci.md

\* Lina\_Task\_CRM.md

\* Lina\_Task\_AccessControl.md

\* Lina\_Task\_Audit.md



bağlam olarak kullanılır.



\---



\## 11. Yanıt Üretme Akışı



Lina yazılı yanıt akışı:



1\. Kullanıcı isteği gelir.

2\. Auth kontrolü yapılır.

3\. Rol tespit edilir.

4\. İstek modülü belirlenir.

5\. Yetki kontrolü yapılır.

6\. İlgili veri güvenli şekilde alınır.

7\. Prompt seti hazırlanır.

8\. AI yanıtı üretilir.

9\. KVKK filtresi uygulanır.

10\. Audit log oluşturulur.

11\. Yanıt kullanıcıya döner.



\---



\## 12. Sesli Yanıt Akışı



1\. Yazılı yanıt üretilir.

2\. Sesli yanıt tercihi kontrol edilir.

3\. Sessiz saat kontrol edilir.

4\. KVKK ses filtresi uygulanır.

5\. Metin kısa sesli formata dönüştürülür.

6\. ElevenLabs ile ses üretilir.

7\. Ses yanıtı kullanıcıya döner.

8\. LinaVoiceLog oluşturulur.



\---



\## 13. Kullanıcı Tercihleri



Lina v1’de kullanıcı şu tercihleri yönetebilmelidir:



\* Sesli yanıt açık / kapalı

\* Dashboard sesli özeti açık / kapalı

\* CRM sesli hatırlatma açık / kapalı

\* Network sesli özeti açık / kapalı

\* Portföy sesli özeti açık / kapalı

\* Sessiz saat başlangıcı

\* Sessiz saat bitişi

\* Acil sesli bildirim açık / kapalı

\* Yanıt stili kısa / normal / detaylı



\---



\## 14. Sessiz Saat Mantığı



Varsayılan:



22:00 - 08:00



Sessiz saatlerde:



\* Otomatik sesli yanıt yok

\* Dashboard sesli özeti yok

\* Network sesli özeti yok

\* Portföy sesli özeti yok



İzin verilebilecek durumlar:



\* Kullanıcı manuel olarak “sesli oku” derse

\* Acil bildirim izni açıksa ve bildirim kritikse



\---



\## 15. Dil Politikası



Lina v1 yalnızca Türkçe çalışır.



Lina:



\* İngilizce yanıt üretmez

\* Rusça yanıt üretmez

\* Arapça yanıt üretmez

\* Yabancı dilde ses üretmez

\* Yabancı dilde ilan açıklaması yazmaz



Kullanıcı farklı dil isterse yanıt:



“Şu anda Lina yalnızca Türkçe dilinde hizmet vermektedir. Farklı dil desteği talebinizi platform yönetimine iletmeniz halinde isteğiniz değerlendirilecektir.”



\---



\## 16. Güvenlik Kuralları



Lina teknik olarak şu bilgilere asla erişmemeli veya yanıt olarak vermemelidir:



\* Şifre

\* Token

\* API key

\* Veritabanı bağlantısı

\* Sunucu erişim bilgisi

\* Başka kullanıcının CRM verisi

\* Başka kullanıcının mesajları

\* Yetkisiz portföy özel notları

\* Müşteri özel bilgileri

\* Özel mesaj içerikleri



\---



\## 17. Hata Yönetimi



Lina hata durumlarında kullanıcıya teknik detay vermez.



Örnek:



“Şu anda bu bilgiye güvenli şekilde erişemiyorum. Daha sonra tekrar deneyebilirsiniz.”



AI sağlayıcı hatası:



“Lina şu anda yanıt oluşturmakta zorlanıyor. Lütfen biraz sonra tekrar deneyin.”



Ses üretim hatası:



“Sesli yanıt şu anda oluşturulamadı. Yazılı yanıtı görüntüleyebilirsiniz.”



\---



\## 18. Frontend Entegrasyon Noktaları



Frontend tarafında Lina için önerilen alanlar:



\* Dashboard Lina kartı

\* CRM Lina asistan paneli

\* Network Lina öneri alanı

\* Portföy Lina analiz butonu

\* Bildirim ayarlarında Lina ses tercihleri

\* Lina mikrofon butonu

\* Lina yazılı sohbet alanı

\* Sesli yanıt oynatıcı

\* “Sesi Etkinleştir” butonu



\---



\## 19. Mobil / PWA Notları



EPH kullanıcılarının büyük kısmı mobil ve PWA üzerinden kullanacağı için:



\* Ses oynatma kullanıcı etkileşimi gerektirebilir.

\* iPhone Safari otomatik sesi engelleyebilir.

\* “Sesi Etkinleştir” akışı gereklidir.

\* Sesli yanıt başarısız olursa yazılı yanıt gösterilmelidir.

\* Push notification ve sesli bildirim ayrı yönetilmelidir.



\---



\## 20. MVP Kapsamı



Lina v1 MVP kapsamı:



1\. Yazılı Lina chat

2\. Dashboard kısa özeti

3\. CRM görev özeti

4\. Bildirim tercihleri

5\. Sesli yanıt üretimi

6\. KVKK filtresi

7\. Yetki kontrolü

8\. Audit log

9\. Türkçe dil zorunluluğu

10\. Kullanıcı ses tercihleri



\---



\## 21. MVP Dışı Gelecek Özellikler



İleride değerlendirilecek özellikler:



\* WhatsApp entegrasyonu

\* SMS entegrasyonu

\* E-posta gönderimi

\* Çok dilli destek

\* Otomatik forum yanıtı

\* Gelişmiş portföy performans analizi

\* Bölgesel piyasa analizi

\* Kullanıcı davranış modeli

\* Gelişmiş eşleştirme motoru

\* Lina mobil konuşma modu



\---



\## 22. Teknik Uygulama Sırası



Önerilen kodlama sırası:



1\. LinaModule oluştur

2\. LinaController oluştur

3\. LinaService oluştur

4\. DTO dosyalarını oluştur

5\. LinaAccessService oluştur

6\. LinaKvkkService oluştur

7\. LinaAiService oluştur

8\. LinaVoiceService oluştur

9\. LinaPreference tablo/model hazırlığı

10\. Chat endpoint

11\. Voice endpoint

12\. Dashboard summary endpoint

13\. CRM summary endpoint

14\. Audit log yapısı

15\. Frontend Lina kartı

16\. Bildirim ayarlarına Lina ses tercihleri



\---



\## 23. Sonuç



Lina v1 teknik mimarisi, EPH Platform’un yapay zekâ omurgasının ilk gerçek uygulama planıdır.



Bu mimariyle Lina:



\* Türkçe çalışır

\* Yetki kontrolü yapar

\* KVKK sınırlarını korur

\* Yazılı yanıt verir

\* Sesli yanıt üretir

\* Dashboard, CRM, Forum, Havuz ve Bildirim sistemlerine güvenli şekilde bağlanır

\* Denetlenebilir ve geliştirilebilir bir yapıda ilerler



Temel prensip:



“Önce güvenlik, sonra zekâ, sonra otomasyon.”



