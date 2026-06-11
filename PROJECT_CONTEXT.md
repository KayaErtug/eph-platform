# PROJECT_CONTEXT.md

# EPH PLATFORM — Emlak Portföy Havuzu

Son Güncelleme: 10 Haziran 2026  
Proje Sahibi / Geliştirici: Mustafa Ertuğ Kaya  
Domain: https://emlakportfoyhavuzu.com  
GitHub Repo: https://github.com/KayaErtug/eph-platform

---

## 1. PROJECT OVERVIEW

EPH Platform, emlakçılar, müteahhitler ve inşaat firmaları arasında güvenli, kapalı devre ve B2B iş birliği oluşturmak amacıyla geliştirilen gayrimenkul platformudur.

Platformun ana hedefi:

- Emlakçıların kendi portföylerini güvenli şekilde yönetmesi
- Yetki belgesi olan portföylerin kontrollü şekilde havuzda yayınlanması
- Müteahhit / inşaat firması / emlakçı arasında talep ve portföy eşleşmesi
- Forum üzerinden sektör içi talep paylaşımı
- CRM ile müşteri takibi
- Lina AI ile platform içi akıllı destek
- Admin V2 ile güvenli, sade ve mobil öncelikli yönetim

EPH Platform genel kullanıcı deneyiminde beyaz CRM teması kullanır. Admin paneli daha premium ve koyu lacivert temaya sahip olabilir.

---

## 2. TECHNOLOGY STACK

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- PWA
- Axios
- Mobile-first tasarım

### Backend

- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Role Based Access Control

### Database

- Neon PostgreSQL
- Prisma Client

### Storage

- Supabase Storage

Aktif bucketlar:

- `portfolio-images`
- `portfolio-documents`
- `documents`

### Server

- Ubuntu 20.04
- PM2
- Nginx
- Node.js

### PM2 Processes

- `eph-frontend`
- `eph-backend`

---

## 3. FOLDER STRUCTURE

Proje kökü:

```text
SM/
├─ PROJECT_CONTEXT.md
├─ backend/
├─ frontend/
├─ README.md
├─ .gitignore
└─ package / config dosyaları
```

### Frontend Structure

```text
frontend/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ dashboard/
│  │  ├─ stok/
│  │  │  ├─ page.tsx
│  │  │  └─ [id]/page.tsx
│  │  ├─ admin/
│  │  │  ├─ page.tsx
│  │  │  ├─ portfolio-approvals/
│  │  │  ├─ katilim-talepleri/
│  │  │  ├─ referrals/
│  │  │  └─ system-messages/
│  │  ├─ crm/
│  │  ├─ network/
│  │  ├─ messages/
│  │  ├─ havuz/
│  │  ├─ notification-settings/
│  │  └─ lina/
│  ├─ components/
│  ├─ lib/
│  ├─ store/
│  ├─ hooks/
│  └─ types/
├─ public/
└─ package.json
```

### Backend Structure

```text
backend/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ app.module.ts
│  ├─ auth/
│  ├─ admin/
│  ├─ users/
│  ├─ profile/
│  ├─ projects/
│  ├─ units/
│  ├─ portfolio-images/
│  ├─ portfolio-documents/
│  ├─ system-messages/
│  ├─ network/
│  ├─ messages/
│  ├─ visits/
│  ├─ push/
│  ├─ lina/
│  ├─ crm/
│  ├─ trust/
│  ├─ supabase/
│  └─ prisma/
└─ package.json
```

Yeni modüller mevcut yapıya uygun açılmalıdır. Gereksiz klasör veya teknoloji eklenmemelidir.

---

## 4. DATABASE SCHEMA

Veritabanı Prisma üzerinden yönetilir.

Ana dosya:

```text
backend/prisma/schema.prisma
```

### User

Kullanıcı hesabı.

Önemli alanlar:

- `id`
- `email`
- `phone`
- `passwordHash`
- `firstName`
- `lastName`
- `role`
- `isVerified`
- `isApproved`
- `memberCode`
- `trustScore`
- `riskLevel`
- `city`
- `district`

İlişkiler:

- `projects`
- `documents`
- `customers`
- `tasks`
- `messages`
- `applications`
- `visits`
- `pushSubscriptions`
- `linaPreference`

### Project

Portföylerin bağlı olduğu proje / ana kayıt.

Önemli alanlar:

- `id`
- `name`
- `description`
- `city`
- `district`
- `address`
- `ownerId`

İlişkiler:

- `owner`
- `units`

### Unit

Ana portföy / gayrimenkul kaydı.

Önemli alanlar:

- `id`
- `projectId`
- `type`
- `floor`
- `floorLabel`
- `totalFloors`
- `number`
- `roomCount`
- `area`
- `price`
- `priceCurrency`
- `status`
- `description`
- `isVerified`
- `photoVerified`
- `tapuVerified`
- `yetkiVerified`
- `approvalStatus`
- `submittedForApprovalAt`
- `approvedAt`
- `rejectedAt`
- `approvalNote`
- `isPoolVisible`
- `poolPublishedAt`
- `poolRemovedAt`

İlişkiler:

- `project`
- `images`
- `authorityDocuments`

### UnitImage

Portföy fotoğrafları.

Bucket:

```text
portfolio-images
```

Önemli alanlar:

- `unitId`
- `url`
- `supabaseUrl`
- `path`
- `bucket`
- `originalName`
- `mimetype`
- `size`
- `isCover`
- `sortOrder`

### PortfolioAuthorityDocument

Portföy doğrulama belgeleri.

Bucket:

```text
portfolio-documents
```

Belge tipleri:

- `YETKI_BELGESI`
- `TAPU`
- `KAT_KARSILIGI_SOZLESMESI`
- `DIGER_DOGRULAMA_EVRAKI`

Önemli alanlar:

- `unitId`
- `authorityType`
- `fileUrl`
- `fileName`
- `mimeType`
- `sizeBytes`
- `approved`
- `approvedById`
- `approvedAt`
- `rejectReason`

### Diğer Temel Modeller

- `Document`: kullanıcı profil belgeleri
- `Customer`: CRM müşteri kaydı
- `Task`: CRM görev kaydı
- `NetworkPost`: Forum / network talep paylaşımı
- `Conversation`: mesajlaşma konuşması
- `Message`: mesaj kaydı
- `SystemMessage`: admin sistem mesajları
- `Application`: katılım başvuruları
- `Invitation`: davet kodları
- `ReferralCandidate`: referans adayları
- `AuditLog`: güvenlik ve işlem logları
- `LinaPreference`: Lina AI kullanıcı tercihleri
- `LinaPortfolioSession`: Lina destekli portföy oluşturma oturumları

---

## 5. DATABASE ENUMS

### Role

```text
EMLAKCI
MUTEAHHIT
INSAAT_FIRMASI
MODERATOR
ADMIN
SUPER_ADMIN
```

### PortfolioApprovalStatus

```text
TASLAK
BELGE_BEKLENIYOR
INCELEMEYE_GONDERILDI
INCELEMEDE
EKSIK_BILGI_BEKLENIYOR
ONAYLANDI
HAVUZDA
REDDEDILDI
```

### PortfolioAuthorityType

```text
YETKI_BELGESI
TAPU
KAT_KARSILIGI_SOZLESMESI
DIGER_DOGRULAMA_EVRAKI
```

### UnitStatus

Örnekler:

```text
SATILIK
KIRALIK
GUNLUK_KIRALIK
DEVREN_SATILIK
DEVREN_KIRALIK
ON_SATIS
PROJE_ASAMASI
KAT_KARSILIGI
SATILDI
PASIF
```

### UnitType

Örnekler:

```text
DAIRE
VILLA
ARSA
TARLA
DUKKAN_MAGAZA
OFIS_BURO
OTEL
KONUT_PROJESI
TICARI_PROJE
```

---

## 6. API DOCUMENTATION

API base URL frontend tarafında `frontend/src/lib/api.ts` içinde tanımlıdır.

Varsayılan:

```text
https://emlakportfoyhavuzu.com/api
```

JWT token, `auth-storage` içinden otomatik alınır ve Authorization header içine eklenir.

### Units / Portfolio API

Controller:

```text
backend/src/units/units.controller.ts
```

Ana endpointler:

```text
GET    /units
GET    /units/:id
POST   /units/project/:projectId
PATCH  /units/:id
DELETE /units/:id
PATCH  /units/:id/status
```

Approval endpointleri:

```text
POST /units/:id/submit-approval
POST /units/:id/mark-reviewing
POST /units/:id/request-missing-info
POST /units/:id/approve
POST /units/:id/reject
POST /units/:id/send-to-pool
POST /units/:id/remove-from-pool
```

Admin approval listesi:

```text
GET /units/admin/portfolio-approvals?status=ALL
```

### Portfolio Images API

```text
GET    /portfolio-images/:portfolioId
POST   /portfolio-images/upload
PUT    /portfolio-images/:imageId/cover
PUT    /portfolio-images/reorder/:portfolioId
DELETE /portfolio-images/:imageId
```

Dosya kuralları:

- JPG
- PNG
- WEBP
- Maksimum 15 MB

### Portfolio Documents API

```text
GET    /portfolio-documents/:portfolioId
POST   /portfolio-documents/upload
DELETE /portfolio-documents/:documentId
```

Upload body:

```text
portfolioId
authorityType
file
```

Desteklenen dosyalar:

- PDF
- JPG
- PNG
- WEBP

Maksimum dosya boyutu:

```text
15 MB
```

Yetki:

- Portföy sahibi yükleyebilir.
- SUPER_ADMIN yükleyebilir.
- MODERATOR / ADMIN görüntüleyebilir.
- Silme: portföy sahibi veya SUPER_ADMIN.

### Admin API

Genel endpoint örnekleri:

```text
GET   /admin/stats
GET   /admin/users?filter=all
GET   /admin/documents?filter=all
GET   /admin/applications?status=all
PATCH /admin/users/:id/approve
PATCH /admin/users/:id/role
PATCH /admin/users/:id/member-code
PATCH /admin/users/:id/suspend
DELETE /admin/users/:id/reject
```

### Lina API

```text
GET   /lina/status
POST  /lina/chat
POST  /lina/voice
GET   /lina/preferences
PATCH /lina/preferences
POST  /lina/reset-memory
```

Lina sadece Türkçe çalışır.

---

## 7. AUTHORIZATION RULES

Rol bazlı erişim sistemi projenin temel güvenlik omurgasıdır.

### SUPER_ADMIN

- Tüm sisteme erişebilir.
- Tüm portföyleri görebilir.
- Kullanıcı silebilir.
- Admin yönetebilir.
- Tema yönetebilir.
- Kritik sistem ayarlarını yapabilir.

### ADMIN

- Kullanıcı onaylayabilir.
- Katılım başvurularını inceleyebilir.
- Portföy onay kuyruğunu görebilir.
- Sistem mesajı gönderebilir.
- Trafik ve raporları görebilir.
- Normal kullanıcıların özel portföylerini doğrudan göremez.
- Admin hiçbir şekilde portföy sahibinin özel portföy mahremiyetini ihlal etmemelidir.

### MODERATOR

- Ön inceleme yapabilir.
- Katılım taleplerini kontrol edebilir.
- Portföy onay sürecinde inceleme yapabilir.
- Normal kullanıcıların özel portföylerini doğrudan göremez.

### EMLAKCI

- Kendi portföyünü oluşturabilir.
- Kendi portföyünü görebilir.
- Belge yükleyebilir.
- Forum kullanabilir.
- CRM kullanabilir.
- Yetkili portföyünü havuza gönderebilir.

### MUTEAHHIT

- Talep oluşturabilir.
- Forum kullanabilir.
- Havuzdaki yetkili portföyleri görebilir.
- Kendi kayıtlarını yönetebilir.

### INSAAT_FIRMASI

- Proje ve portföy yönetebilir.
- Forum kullanabilir.
- Havuzdaki yetkili portföyleri görebilir.

---

## 8. BUSINESS RULES

### Portföy Gizlilik Kuralı

ÇOK KRİTİK.

Normal portföyler sadece portföy sahibi tarafından görülebilir.

Admin göremez.  
Moderator göremez.  
Diğer kullanıcılar göremez.  
Sadece SUPER_ADMIN erişebilir.

Bu kural güvenlik omurgasıdır ve ihlal edilemez.

### Havuz Kuralı

Havuzda yalnızca:

- Yetki belgesi bulunan
- Gerekli belgeleri yüklenmiş
- Admin / yetkili ekip tarafından onaylanmış
- `approvalStatus = HAVUZDA`
- `isPoolVisible = true`

olan portföyler görünür.

Yetkisiz portföyler havuza düşemez.

### Portföy Approval Workflow

```text
TASLAK
↓
BELGE_BEKLENIYOR
↓
INCELEMEYE_GONDERILDI
↓
INCELEMEDE
↓
ONAYLANDI
↓
HAVUZDA
```

Alternatif akışlar:

```text
REDDEDILDI
EKSIK_BILGI_BEKLENIYOR
```

### Belge Yönetimi

Portföy sahibi yükleyebilir:

- Yetki Belgesi
- Tapu

Belge yüklendiğinde portföy `BELGE_BEKLENIYOR` durumuna geçebilir.

İncelemeye gönderildiğinde:

```text
INCELEMEYE_GONDERILDI
```

durumuna geçmelidir.

---

## 9. UI / UX RULES

### Genel Stil

- Beyaz CRM teması
- Sade
- Kurumsal
- Profesyonel
- Sektör odaklı
- AI template gibi görünmeyen doğal tasarım

### Mobil Öncelik

Kullanıcıların yaklaşık %95’i mobil PWA kullanacaktır.

Bu yüzden:

- Tüm sayfalar mobil-first düşünülmelidir.
- Mobilde taşma olmamalıdır.
- Başlıklar mobilde ortalı olmalıdır.
- Kartlar tek ekranda mümkün olduğunca fazla bilgi göstermelidir.
- Gereksiz büyük boşluklardan kaçınılmalıdır.

### Admin V2

Admin paneli daha premium olabilir.

Admin V2 hedefleri:

- Koyu lacivert / premium yönetici görünümü
- Mobil öncelikli
- Hızlı erişim kartları
- Karmaşık tab yapısından uzak
- Portföy Onayları
- Katılım Talepleri
- Sistem Mesajları
- Trafik Merkezi
- Lina Merkezi
- Sistem Ayarları

---

## 10. TURAN THEME RULES

Turan Theme sadece SUPER_ADMIN tarafından yönetilebilir.

Nihai banner kararı:

- Türk Bayrağı arka plan
- Tek söz görünür
- Aynı anda birden fazla söz görünmez
- Söz random seçilir
- Her 60 saniyede değişir
- Desktop yükseklik: 40px
- Mobil yükseklik: 20px
- Bayrak görseli aynı oranda kompakt olmalıdır

Kullanılacak 5 söz dışında başka söz kullanılmaz.

1.

```text
Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!
```

2.

```text
VATAN ne Türkiyedir Türklere, ne Türkistan,
VATAN Büyük ve Müebbet bir ülkedir.
TÜRKLERE TURAN
```

3.

```text
Bugünden sonra divanda, dergahta, bargahta, mecliste ve meydanda Türkçeden başka dil kullanılmayacaktır.
```

4.

```text
Har içinde biten gonca güle minnet eylemem,
Arabi, Farisi bilmem; dile minnet eylemem.
Sırat-ı Müstakim üzre gözetirim Rahim'i,
İblisin talim ettiği yola minnet eylemem.
```

5.

```text
Yufka yüreklilerle çetin yollar aşılmaz;
Çünkü bu yol kutludur, gider Tanrı Dağı'na.
```

---

## 11. CODING STANDARDS

### Genel Kod Kalitesi

Tercihler:

- Basit
- Okunabilir
- Sürdürülebilir
- Mobil öncelikli
- Az kod ile yüksek etki

Kaçınılacaklar:

- Gereksiz abstraction
- Gereksiz generic yapı
- Gereksiz helper dosyaları
- Gereksiz refactor
- Çalışan sistemi sebepsiz bozmak
- Büyük mimari değişiklikleri ihtiyaç olmadan yapmak

### TypeScript

- Tipler açık olmalı.
- `any` sadece zorunlu durumlarda kullanılmalı.
- Backend Prisma tipleriyle uyumlu olmalı.
- Frontend API response tipleri sade tutulmalı.

### React / Next.js

- Client component gerekiyorsa `"use client"` kullanılmalı.
- Mobil kullanım önceliklenmeli.
- API çağrılarında `frontend/src/lib/api.ts` kullanılmalı.
- Kullanıcı dostu hata mesajı gösterilmeli.
- Büyük componentler mümkün olduğunca yönetilebilir tutulmalı ancak gereksiz refactor yapılmamalı.

### Backend / NestJS

- Controller sadece endpoint yönetmeli.
- Service iş kuralını taşımalı.
- Yetki kontrolü service katmanında da korunmalı.
- Guard tek başına yeterli görülmemeli.
- Kritik işlemlerde rol ve sahiplik kontrolü yapılmalı.

### Prisma

- Schema değişikliği gerekmedikçe yapılmamalı.
- Var olan model kullanılabiliyorsa yeni tablo açılmamalı.
- Migration riski düşünülmeli.
- `npx prisma generate` ayrı komut olarak çalıştırılmalı.

---

## 12. AI DEVELOPMENT RULES

Bu projede AI araçları aşağıdaki rollerde düşünmelidir:

1. CTO
   - Mimari kararlar
   - Risk analizi
   - Modül planlama

2. Senior Backend Developer
   - NestJS
   - Prisma
   - PostgreSQL
   - Güvenlik

3. Senior Frontend Developer
   - Next.js
   - React
   - TypeScript
   - PWA
   - Mobil UX

4. QA Tester
   - Hata analizi
   - Test senaryoları
   - Güvenlik kontrolleri

### AI Kod Yazma Sırası

AI kod yazmadan önce:

1. Problemi analiz eder.
2. Mevcut mimariyi değerlendirir.
3. İlgili dosyaları belirler.
4. Riskleri listeler.
5. En az değişiklikle çözülebilecek yöntemi seçer.
6. Daha sonra kod üretir.

Asla doğrudan kod yazmaya atlamaz.

### Standart Cevap Sırası

Özellikle kodlama görevlerinde tercih edilen sıra:

1. Durum Analizi
2. Etkilenecek Dosyalar
3. Uygulama Planı
4. Riskler
5. Kodlama
6. Test
7. Deploy

Küçük ve net görevlerde bu sıra sadeleştirilebilir ama mantık korunmalıdır.

---

## 13. AI FILE HANDLING RULES

### Dosya İsteme Kuralı

AI, kullanıcıdan uzun dosya içeriğini sohbet içinde yapıştırmasını istememelidir.

Tercih edilen yöntem:

Dosya, Windows komutu ile kullanıcının masaüstündeki `gonder` klasörüne kopyalanır. Kullanıcı daha sonra sohbet içindeki `+` tuşu ile dosyayı yükler.

Tercih edilen klasör:

```text
C:\Users\ertug\Desktop\gonder
```

Örnek:

```powershell
copy src\app\stok\page.tsx C:\Users\ertug\Desktop\gonder\stok-page.tsx.txt
```

PowerShell için daha güvenli yöntem:

```powershell
Copy-Item "C:\Users\ertug\Desktop\mustafa_desktop\SM\frontend\src\app\stok\page.tsx" "C:\Users\ertug\Desktop\gonder\stok-page.tsx.txt"
```

Köşeli parantezli klasörlerde `-LiteralPath` kullanılabilir:

```powershell
Copy-Item -LiteralPath "C:\Users\ertug\Desktop\mustafa_desktop\SM\frontend\src\app\stok\[id]\page.tsx" "C:\Users\ertug\Desktop\gonder\stok-detail-page.tsx.txt"
```

### Notepad Kuralı

AI dosya düzenletirken daima tam Windows yolu ile Notepad komutu vermelidir.

Örnek:

```powershell
notepad "C:\Users\ertug\Desktop\mustafa_desktop\SM\frontend\src\app\stok\[id]\page.tsx"
```

Sadece dosya yolu verilmemelidir.  
Daima Notepad komutu verilmelidir.

### Tam Dosya Kuralı

AI hiçbir zaman şu tarz yönlendirme yapmamalıdır:

- Find / Replace
- Şu satırı değiştir
- Bu kodu şuraya ekle
- Şu bloğu bul, altına yapıştır

Kullanıcının kesin tercihi:

```text
TAM DOSYA
```

Kod değişikliği gerekiyorsa AI tam dosya içeriğini vermelidir.

### Büyük Dosya Kuralı

Bir dosya büyükse:

- Dosya önce kullanıcıdan istenir.
- AI dosyayı incelemeden tahmin yürütmez.
- Eksik bilgiyle kod üretmez.
- Mümkünse dosya kullanıcı tarafından `gonder` klasöründen yüklenir.

### Çok Dosyalı Değişiklik Kuralı

Bir özellik birden fazla dosyayı etkiliyorsa önce dosya listesi çıkarılır.

Örnek:

```text
frontend/src/app/admin/page.tsx
frontend/src/app/admin/portfolio-approvals/page.tsx
backend/src/units/units.service.ts
backend/prisma/schema.prisma
```

Sonra uygulama planı yapılır.

### Kopyalama Önceliği

AI bir dosya istediğinde tercih sırası:

1. `Copy-Item`
2. `copy`
3. `notepad`

---

## 14. DEVELOPER WORKFLOW

### Lokal Proje Kökü

```text
C:\Users\ertug\Desktop\mustafa_desktop\SM
```

### Frontend Klasörü

```text
C:\Users\ertug\Desktop\mustafa_desktop\SM\frontend
```

### Backend Klasörü

```text
C:\Users\ertug\Desktop\mustafa_desktop\SM\backend
```

### Gonder Klasörü

```text
C:\Users\ertug\Desktop\gonder
```

### Local Frontend Dev

Gerekirse:

```powershell
npm run dev -- --webpack
```

Ancak kullanıcının tercihi artık çoğunlukla canlı testtir.

### GitHub Workflow

```powershell
cd C:\Users\ertug\Desktop\mustafa_desktop\SM
```

```powershell
git status
```

```powershell
git add .
```

```powershell
git commit -m "Meaningful commit message"
```

```powershell
git push origin main
```

### Backend Deploy

PuTTY:

```bash
cd /var/www/eph
```

```bash
git pull origin main
```

```bash
cd /var/www/eph/backend
```

```bash
npx prisma generate
```

```bash
npm run build
```

```bash
pm2 restart eph-backend
```

Önemli:

`npx prisma generate` ve `npm run build` aynı komut bloğunda zincirlenmemelidir.

### Frontend Deploy

PuTTY:

```bash
cd /var/www/eph
```

```bash
git pull origin main
```

```bash
cd /var/www/eph/frontend
```

```bash
npm run build
```

```bash
pm2 restart eph-frontend
```

Önemli:

PM2 restart komutları ayrı satırda verilmelidir.

---

## 15. AI MEMORY

Bu bölüm, EPH projesinde AI araçlarının mutlaka hatırlaması gereken çalışma tercihlerini içerir.

- Kullanıcı tam dosya ister.
- Parça kod, find/replace, satır değiştir yöntemi kullanılmaz.
- Notepad yöntemi tercih edilir.
- Dosya açtırırken tam Windows yolu verilir.
- Dosya isterken `Copy-Item` ile `C:\Users\ertug\Desktop\gonder` klasörüne kopyalama yöntemi tercih edilir.
- Kullanıcı dosyayı sohbet içindeki `+` tuşuyla yükler.
- Komutlar numaralı adımlar halinde verilmelidir.
- Her adımda platform belirtilmelidir: PowerShell, PuTTY, Notepad, VS Code vb.
- En fazla 3-4 işlem verilmeli, sonra kullanıcıdan sonuç beklenmelidir.
- “Kaplumbağa hızı” tercih edilir.
- PM2 restart komutları ayrı satırda verilmelidir.
- `npx prisma generate` ayrı satırda verilmelidir.
- `npm run build` ayrı satırda verilmelidir.
- Canlı test önceliklidir.
- Local test yalnızca gerekli olduğunda önerilir.
- Mobil kullanıcı oranı %95 kabul edilmelidir.
- Mobil tasarım her zaman önceliklidir.
- Başlıklar mobilde ortalanmalıdır.
- Simetri kalite algısıdır.
- Beyaz CRM teması genel sistemde korunmalıdır.
- Admin paneli premium / koyu lacivert olabilir.
- EPH Classic bildirim sesi varsayılan kabul edilir.
- Kullanıcı sade, profesyonel, sektör odaklı metin ister.
- AI kokan tasarım ve pazarlama dili istenmez.

---

## 16. TEST USERS

```text
emlak@test.com / 112233
muteahhit@test.com / 112233
insaat@test.com / 112233
admin@test.com / 112233
```

QA personası:

```text
Tamer Gündüz
```

---

## 17. CURRENT STATUS — 10 HAZİRAN 2026

### Tamamlananlar

- Portföy V5.2A
- Portföy Onay Merkezi
- Admin Portfolio Approvals sayfası
- Backend approval endpointleri
- Portfolio document upload backend modülü
- Supabase `portfolio-documents` bucket kurulumu
- Portföy detay sayfasına Belge Yükleme Merkezi
- Yetki Belgesi yükleme
- Tapu yükleme
- Belge görüntüleme
- Belge silme
- Frontend / backend deploy
- PWA build

### Devam Edenler

- Admin V2 sadeleştirme
- Admin belge görüntüleme
- Approval Workflow görsel iyileştirme
- İncelemeye Gönder başarı mesajı
- Admin `/admin/portfolio-approvals` belge detay görüntüleme

### Bilinen Eksikler

- Admin ana panel çok karmaşık.
- Admin V2 yeniden düzenlenmeli.
- `/admin/portfolio-approvals` içinde belge görüntüleme butonları geliştirilmeli.
- Turan Theme final banner hâlâ tüm admin yapısına nihai şekilde uygulanmalı.
- İncelemeye Gönder aksiyonu kullanıcıya daha net başarı mesajı vermeli.
- Büyük dosya yüklemede 413 limiti için nginx / server limitleri ayrıca kontrol edilmeli.

---

## 18. ROADMAP

### Faz 1 — Admin V2

- Admin ana panel sadeleşecek.
- Mobil öncelikli premium yönetim merkezi kurulacak.
- Ana kartlar:
  - Portföy Onayları
  - Katılım Talepleri
  - Sistem Mesajları
  - Trafik Merkezi
  - Lina Merkezi
  - Sistem Ayarları

### Faz 2 — Admin Belge İnceleme

- Yetki Belgesi Gör
- Tapu Gör
- Tam Ekran Aç
- Belge durum bilgisi
- Eksik bilgi isteme

### Faz 3 — Full Approval Workflow

- Belge Bekleniyor
- İncelemeye Gönderildi
- İncelemede
- Onaylandı
- Havuza Alındı
- Reddedildi
- Eksik Bilgi Bekleniyor

### Faz 4 — Theme Management

SUPER_ADMIN panelinden:

- Tema ekle
- Görsel yükle
- Söz gir
- Kaydet
- Anında aktif et

GitHub / build / deploy gerekmeden yönetim panelinden çalışmalıdır.

### Faz 5 — Kontör Sistemi

- Forum talep açma
- Acil etiketi
- Lina içerik üretimi
- Portföy kartı
- Premium özellikler

### Faz 6 — Lina Premium AI

- CRM önerileri
- Forum talep eşleştirme
- Havuz tarama
- Portföy puanlama
- Sesli yanıtlar
- Proaktif bildirimler

---

## 19. CRITICAL SECURITY NOTES

- Portföy mahremiyeti ihlal edilemez.
- Admin normal portföyleri doğrudan görememelidir.
- CRM kayıtları kullanıcıya özeldir.
- Profil özel bilgileri korunmalıdır.
- Admin işlemleri audit log ile izlenmelidir.
- SUPER_ADMIN dışındaki roller sınırlı erişimle çalışmalıdır.
- Belge yükleme sadece portföy sahibi veya SUPER_ADMIN tarafından yapılmalıdır.
- Admin / Moderator belgeyi inceleyebilir ama portföy sahibinin belgesini değiştirememelidir.

---

## 20. PROJECT PRINCIPLES

EPH Platform geliştirilirken temel prensipler:

1. Güven
2. Mahremiyet
3. Mobil öncelik
4. Sadelik
5. Simetri
6. Profesyonel görünüm
7. Az kod, yüksek sürdürülebilirlik
8. Yetkili portföy kalitesi
9. Kontrollü havuz sistemi
10. AI destekli ama AI kokmayan kullanıcı deneyimi
