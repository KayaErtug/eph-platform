# EPH Platform İşlem Teyit Anayasası — V1

**Durum:** Bağlayıcı platform standardı  
**Kapsam:** EPH platformunun tamamı  
**Yürürlük:** 18 Ağustos 2026  

## Ana İlke

Lina veya EPH içindeki herhangi bir yapay zekâ, otomasyon, akıllı asistan ya da kullanıcı adına işlem yapan katman; kullanıcı adına veri değiştiren, oluşturan, gönderen, yayımlayan, silen, para/kontör hareketi doğuran, yetki değiştiren veya geri dönüşü olan hiçbir işlemi kullanıcının açık teyidi olmadan gerçekleştiremez.

Bu kural CRM, Portföy, Havuz, Talep Merkezi, Forum, Network, Proje Satış Merkezi, mesajlaşma, bildirim, kontör, üyelik, yönetim ve gelecekte eklenecek tüm modüller için geçerlidir.

## 1. Okuma İşlemleri — Teyit Gerekmez

Bilgi okumaya, listelemeye, aramaya, eşleştirmeye veya özetlemeye yönelik salt-okunur işlemler kullanıcı teyidi olmadan yapılabilir.

Örnekler:
- “Ahmet’in telefonunu göster.”
- “Denizli’deki satılık portföylerimi listele.”
- “Bugünkü görevlerimi göster.”
- “Bu müşteriye uygun havuz ilanlarını bul.”

Bu işlemler veritabanında veya platform durumunda değişiklik oluşturamaz.

## 2. Yazma İşlemleri — Teyit Zorunludur

Kullanıcı adına veri oluşturan veya değiştiren her işlemde Lina önce işlem taslağını hazırlar ve kullanıcıya açıkça gösterir.

Örnek kapsam:
- CRM müşterisi ekleme veya güncelleme
- Görev oluşturma
- Not veya aktivite ekleme
- Müşteri durumu değiştirme
- İlgi/talep oluşturma
- Portföy oluşturma veya güncelleme
- Portföyü havuza gönderme veya havuzdan çekme
- Talep yayımlama
- Talebe yanıt verme
- Mesaj gönderme
- Proje verisi değiştirme
- Kullanıcı/üyelik ayarı değiştirme
- Gelecekte eklenecek tüm yazma işlemleri

Örnek teyit ekranı:

> **İşlem Onayı**  
> Müşteri: Acun Ilıcalı  
> İşlem: Arama görevi oluştur  
> Tarih: 20 Ağustos 2026  
> Saat: 09:00  
>  
> **ONAYLA · DÜZELT · İPTAL**

Kullanıcı `ONAYLA` demeden gerçek işlem uygulanamaz.

## 3. Kritik İşlemler — Güçlendirilmiş / Çift Teyit

Aşağıdaki yüksek etkili işlemler güçlendirilmiş veya çift teyit gerektirir:
- Silme
- Para/kontör hareketi
- Üyelik/rol/yetki değişikliği
- Portföyü yayından kaldırma
- Toplu işlemler
- Çok sayıda kaydı etkileyen işlemler
- Geri alınması zor veya mümkün olmayan işlemler

Akış:
1. İşlem özeti gösterilir.
2. Risk veya etki açıkça belirtilir.
3. Kullanıcıdan kesin onay alınır.

Örnek:

> “Bu işlem 24 CRM kaydını silecek. İşlem geri alınamayabilir.”  
> **KESİN OLARAK SİL · VAZGEÇ**

## 4. Belirsizlikte İşlem Yapılmaz

Lina hiçbir zaman tahmin ederek işlem yapamaz.

Müşteri, portföy, tarih, saat, tutar, konum, işlem türü veya hedef kayıt konusunda belirsizlik varsa işlem durdurulur ve kullanıcıdan açıklama istenir.

Örnekler:
- “Hangi Ahmet Yılmaz?”
- “Satılık mı kiralık mı?”
- “Cuma derken 21 Ağustos Cuma gününü mü kastediyorsunuz?”

**Belirsizlik = İşlem durur.**

## 5. Sesli Komutlarda Daha Sıkı Teyit

Ses tanıma hatası ihtimali nedeniyle sesli komutlarda doğrudan veri yazma yapılamaz.

Zorunlu akış:

**Ses → Yazıya çevir → Anlamlandır → İşlem özeti → Kullanıcı teyidi → Uygula**

Kullanıcı, Lina’nın ne anladığını görmeden sesli komut sonucu gerçek işlem uygulanamaz.

## 6. Çoklu Komutlarda Tüm İşlemler Görünür Olmalıdır

Tek cümlede birden fazla işlem istenirse Lina bütün işlemleri ayrı maddeler halinde kullanıcıya göstermelidir.

Örnek kullanıcı komutu:

> “Ahmet’e toplantı notu ekle, cuma 14:00’te ara ve uygun portföyleri WhatsApp’tan gönder.”

Lina özeti:

> **3 işlem hazırladım:**  
> 1. CRM notu eklenecek.  
> 2. Cuma 14:00 arama görevi oluşturulacak.  
> 3. Seçilecek portföyler WhatsApp üzerinden gönderilecek.  
>  
> **TÜMÜNÜ ONAYLA · TEK TEK DÜZENLE · İPTAL**

Kullanıcının görmediği veya teyit etmediği ek bir işlem yapılamaz.

## 7. Değişiklik Sonrası Eski Onay Geçersizdir

Kullanıcı teyit ekranındaki herhangi bir alanı değiştirirse önceki onay geçersiz hale gelir.

Örnek:

> “Saat 09:00 değil, 15:30 olsun.”

Lina yeni taslağı göstermeli ve tekrar teyit istemelidir.

## 8. Onay Belirli Bir İşlem Taslağına Bağlıdır

“Tamam”, “evet”, “onayla” gibi ifadeler yalnızca o anda bekleyen tek ve açıkça tanımlanmış işlem taslağı için geçerli olabilir.

Onay:
- Eski bir konuşmadaki işlemi kapsamaz.
- Başka bir modüldeki işlemi kapsamaz.
- Değiştirilmiş bir taslağı kapsamaz.
- Süresi dolmuş bir taslağı kapsamaz.

Bekleyen teyitlerin zaman aşımı olmalıdır.

## 9. İşlem Sonucu Açıkça Bildirilir

Onay sonrası Lina işlemin başarıyla tamamlandığını veya başarısız olduğunu açıkça bildirmelidir.

Başarılı örnek:

> **Tamamlandı**  
> Acun Ilıcalı için “Müşteriyi ara” görevi oluşturuldu.  
> 20 Ağustos 2026 · 09:00

Başarısız örnek:

> **İşlem gerçekleştirilemedi. Veritabanına herhangi bir değişiklik yapılmadı.**

Başarısız işlem başarılıymış gibi gösterilemez.

## 10. Audit Log Zorunludur

Lina ve diğer otomasyon katmanları tarafından hazırlanan ve/veya uygulanan işlemler audit log’a kaydedilmelidir.

Asgari kayıt alanları:
- Gerçek kullanıcı
- Kullanıcının ham komutu
- Lina’nın yorumladığı işlem
- Gösterilen işlem taslağı
- Kullanıcının verdiği onay/iptal/düzeltme
- Uygulanan gerçek işlem
- Hedef modül ve hedef kayıt
- Tarih/saat
- Sonuç

Amaç: “Lina ne yaptı?” sorusunun her zaman kesin ve denetlenebilir cevabı bulunmalıdır.

## 11. Platform-Geneli Teknik Kural

EPH için değişmez teknik standart:

> **READ işlemleri doğrudan yapılabilir. WRITE işlemleri kullanıcı teyidi olmadan yapılamaz. DELETE / FINANCIAL / AUTHORITY / BULK işlemleri güçlendirilmiş veya çift teyit gerektirir.**

Ve temel güven prensibi:

> **Lina’nın doğru anladığını varsaymayacağız; kullanıcıya doğru anladığını göstereceğiz.**

## 12. Kapsamın Geleceğe Taşınması

Bu anayasa yalnızca mevcut modüller için değil, gelecekte EPH’ye eklenecek tüm modüller, yapay zekâ ajanları, otomasyonlar, entegrasyonlar ve kullanıcı adına işlem yapan servisler için de bağlayıcıdır.

Yeni bir özellik geliştirilirken işlem türü önce şu sınıflardan birine atanmalıdır:

- `READ`
- `WRITE`
- `DELETE`
- `FINANCIAL`
- `AUTHORITY`
- `BULK`

Teyit seviyesi bu sınıflandırmaya göre belirlenmeden özellik canlıya alınamaz.
