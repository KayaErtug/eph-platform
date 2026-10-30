# RAPOR – OFİS-DENETİM (yalnız okuma)

Tarih: 2026-10-30 · Kapsam: `D:\Projects\SM\backend` + `D:\Projects\eph-mobile-final` · Kod değiştirilmedi; tek yazılan dosya bu rapordur.

**Güven etiketleri:** ✅ = kodda satır satır okundu / komutla çalıştırıldı · ⚠️ = tahmin, canlı sunucuda veya okunmayan dosyada doğrulanmadı.

**Okunmayan / yüzeysel bakılan alanlar (rapor bunları iddia etmez):** `organization.service.ts` KPI gövdeleri, `office-owner-crm.service.ts` 140. satırdan sonrası, `team-leader-crm.service.ts` 90. satırdan sonrası, `crm.service.ts` ofis kapsamı, `units.service.ts` ofis/takım görünürlüğü, kayıt akışında (`registration-v2`) ofis sahibi yeteneğinin verilişi, `invitations/`, `katilim-talepleri/`, `nominations/`, `referral/`. Canlı sunucu kodu ve canlı DB'ye bakılmadı.

---

## 0. Yönetici özeti (en kritik 8 bulgu)

| # | Bulgu | Etiket | Önem |
|---|---|---|---|
| 1 | **§0 ihlali:** `OfficeManagementService.owned()` süper admini de "ofis sahibi" sayar ama `office.ownerUserId === userId` şartı koşar. Süper admin başka ofisin profil, takım, PK dağıtımı, görev, tarama logu uçlarına giremez; mobil Ofisim ekranı da süper admine çalışma alanını hiç açmaz. | ✅ | Yüksek |
| 2 | **Mobil ↔ backend uyumsuzluğu:** `GET /office/dashboard` yanıtında `teams`, `maxTeams`, `allMembers`, `members[].teams`, `hierarchy`, `permissions`, `canScan`, `canAutoSpend` **yok**. Mobil bunları bekliyor. Sonuç: Takım ekranı hep boş, "Takım hakkı bilgisi alınamadı", takım kurulamaz, danışman yetki anahtarları hep varsayılan. | ✅ (yerel backend) · ⚠️ canlıda farklı olabilir (EPH-08 "canlıyla eşitlendi" notu var) | Yüksek |
| 3 | **17 kırık test** tek kök nedenden: `owned()`/`dashboard()` artık `OFFICE_OWNER` yeteneği arıyor, test mock'larında `capabilities` yok. Ek olarak bir test (`does not let super edit another owner office`) §0'ın tersini sözleşme olarak kilitliyor. | ✅ (jest çalıştırıldı) | Orta |
| 4 | `OfficeTask`, `OfficeTaskAssignee`, `ConsultantActivity`, `OfficeMatchScanLog` tabloları migration ile oluşturuluyor ama **hiçbir kod kullanmıyor**; görev/aktivite/tarama logu `SystemSetting` içinde tek JSON dizisi olarak tutuluyor. | ✅ | Yüksek (veri tutarlılığı) |
| 5 | Danışmanın ofisten **ayrılma** ve ofis sahibinin danışmanı **ofisten çıkarma** yolu yok (yalnız takımdan çıkarma var). | ✅ (src taramasında `officeId = null` yazan kod yok) | Yüksek |
| 6 | Mobil admin ekranı `DELETE /organization/offices/:id` ve `DELETE /organization/teams/:id` çağırıyor; backend'de bu rotalar **yok** (404). | ✅ | Orta |
| 7 | `POST :id/match-logs` istemcinin gönderdiği `spentPk`, `status`, `kontorHareketiId` değerlerini doğrulamadan kaydediyor; log sahteleştirilebilir. | ✅ | Orta |
| 8 | §0-B: kodda sabit ticari değerler var (`costPk=25` yedeği, `1500/150/5/3` kapasite yedekleri, `maxTeams` yedek tablosu, 7 gün davet süresi, 30 gün abonelik). | ✅ | Orta |

---

## 1. Veri modeli – hangi veri nerede

### 1.1 Prisma şemasındaki gerçek tablolar ✅

| Tablo | Alanlar (özet) | Not |
|---|---|---|
| `Office` | id, name, slug (unique), ownerUserId?, city, district, neighborhood, isActive | **Adres, telefon, logo, PK, paket yok.** Bunlar `SystemSetting`'te. |
| `Team` | id, officeId, name, leaderId?, isActive; unique(officeId,name) | Silme = `isActive=false` (soft). Pasif takım adı yeniden kullanılamaz (unique). |
| `TeamMember` | teamId, userId, joinedAt, leftAt, isActive; unique(teamId,userId) | Çoklu takım üyeliği serbest (kod yorumu "Task 18"). |
| `User.officeId` | tek ofis bağlantısı | Bir kullanıcı yalnız **tek ofise** bağlı; sahip ayrıca `Office.ownerUserId` ile bağlı. |
| `UserCapability` | `OFFICE_OWNER`, `TEAM_LEADER` | Yetkinin kaynağı; rol (`EMLAKCI`) ayrı. |
| `KontorCuzdani` / `KontorHareketi` | kullanıcı bazlı cüzdan | **Ofis cüzdanı diye ayrı tablo yok**; "ofis PK'sı" = ofis sahibinin kişisel cüzdanı. |
| `AdminActionLog` | denetim izi | Ofis işlemlerinin bir kısmı buraya yazıyor (bkz. 1.4). |

### 1.2 `SystemSetting` anahtar/değer olarak tutulan ofis verisi ✅

| Anahtar | İçerik | Yazan | Neden orada (tahmin ⚠️) |
|---|---|---|---|
| `EPH_OFFICE_PROFILE_<officeId>` | `{address, phone, logoUrl}` | `updateProfile`, `uploadLogo`, `removeLogo` | Şema değişikliği/migration yapmadan hızlı eklenmiş (`units.service.ts:916` yorumu bunu doğruluyor). |
| `EPH_OFFICE_SPENDING_<officeId>` | `{mode: SHARED/ALLOCATED, scanPermissions{uid:bool}, autoSpendPermissions{uid:bool}, allowedSharedPoolUserIds[], allowedSharedPoolTeamIds[], updatedAt, updatedBy}` | `create`, `mode`, `updatePermissions` | Harcama politikası + yetkiler tek JSON. |
| `EPH_OFFICE_MEMBERSHIP_ENFORCED` | boolean (genel) | `activate` (süper admin) | Geçiş dönemi bayrağı. |
| `EPH_OFFICE_INVITE_<officeId>` | `{hash, expiresAt}` (sha256) | `invite` | Ofis başına **tek** aktif kod. |
| `EPH_OFFICE_CODE_<hash>` | `{officeId, expiresAt}` | `invite` | Kodtan ofise ters arama. **Eski kod satırları silinmiyor** (yeni kod üretince biriken çöp). |
| `EPH_OFFICE_JOIN_<officeId>_<userId>` | `{status: PENDING/APPROVED/REJECTED, ...}` | `requestJoin`, `decide` | Katılma başvurusu. Ayrı tablo yok. |
| `EPH_OFFICE_TRANSFER_<ownerId>_<requestId>` | `{fingerprint, officeId, memberId, amount, ...}` | `transfer` | Aynı istek anahtarının tekrarını önleyen (idempotency) makbuz. |
| `OFFICE_SUBSCRIPTION_<officeId>` | `{packageCode, packageName, monthlyPk, agents, expiresAt, ...}` | `startOfficeTrial` (ve ölü `purchaseOfficePackage`) | Ofis aboneliği. |
| `OFFICE_MEMBERSHIP_PACKAGES` | paket dizisi: `code, name, price, monthlyPk, active, portfolioCapacity, crmCapacity, monthlyDemandLimit, monthlyPoolLimit, trialDays, agents, totalUsers, maxTeams, isCustomPrice` | Admin fiyat ekranı (`payment.service.ts:161-175`) | §0-B'ye uygun: ticari değerler DB'de, değişiklik loglu (`previousValue/newValue`). |
| `office-tasks:<officeId>` | **tüm görevlerin tek JSON dizisi** | `createOfficeTask`, `updateOfficeTask` | Bkz. 1.3. |
| `office-activities:<officeId>` | tüm danışman aktivitelerinin tek dizisi | `recordConsultantActivity` | Bkz. 1.3. |
| `office-match-logs:<officeId>` | tüm tarama loglarının tek dizisi | `recordOfficeMatchLog` | Bkz. 1.3. |

### 1.3 "Şemada olmayan ham SQL tabloları" – gerçek durum ✅

Migration `20261020220000_office_tasks_activities_and_logs` şu tabloları oluşturuyor: `OfficeTask`, `OfficeTaskAssignee`, `ConsultantActivity`, `OfficeMatchScanLog` (FK'lı, indeksli). **Ancak:**
- `schema.prisma`'da bu modeller yok → Prisma Client üretmez, kod erişemez.
- `office-management.service.ts` bu tabloları hiç kullanmıyor; aynı veriyi `SystemSetting` JSON dizilerine yazıyor.
- Sonuç: **iki paralel depo**. Tablolar boş kalır (⚠️ canlı DB'de satır sayısı sorgulanmadı), servis JSON'a yazar. Sonradan tabloya geçiş yapılırsa mevcut JSON verisi için taşıma gerekir.

JSON dizisinin sorunları (kodda doğrulandı):
1. **Sınırsız büyüme:** her kayıt eklemede tüm dizi okunup yeniden yazılıyor; büyük ofiste satır boyutu ve yazma maliyeti artar. Sayfalama/silme/arşiv yok.
2. **Kayıp güncelleme (race):** `recordConsultantActivity` ve `recordOfficeMatchLog` transaction/kilit kullanmıyor (`getTasks/create/update` ise `office-policy:<id>` advisory kilidi alıyor). İki danışman aynı anda kayıt eklerse biri silinir.
3. **Kilit çakışması:** görev işlemleri ile PK/politika işlemleri aynı `office-policy:<id>` kilidini paylaşır; görev yazımı PK dağıtımını bekletebilir.
4. **FK yok:** kullanıcı silinince görev/aktivite kayıtları sahipsiz kalır (JSON içinde `userId` metni).
5. **Sorgulanamaz:** raporlama (KPI, tarih aralığı) her seferinde tüm diziyi bellekte filtreler.

### 1.4 Denetim izi (audit) tutarsızlığı ✅

`AdminActionLog`'a yazılanlar: ofis oluşturma, profil/logo, harcama modu, katılma kararı, rollout. **Yazılmayanlar:** PK dağıtımı (`transfer` yalnız `KontorHareketi` + makbuz yazar, `AdminActionLog` yok), davet kodu üretme, takım kurma/silme/üye ekleme-çıkarma, `updatePermissions` (yetki değişikliği), görev oluşturma. Yetki ve takım değişiklikleri için "kim, ne zaman, eski/yeni değer" kaydı yok (§0-B ruhuyla çelişir; PK dağıtımında hareket kaydı var ama yönetim logu yok).

### 1.5 Diğer tutarsızlıklar ✅

| Konu | Detay |
|---|---|
| Çift "ofis oluşturma" yolu | Ofis sahibi: `POST /office/create` (slug `ofis-<uuid>`, politika `ALLOCATED`, log var). Admin: `POST /organization/offices` (ayrı kod). Aynı iş iki serviste. |
| Çift takım yönetimi | Ofis sahibi: `/office/:id/teams*` (yetkiyi `owned()` verir, kota `resolveMaxTeams`). Admin: `/organization/teams*` (kota `getMaxTeamsForOffice`). İki ayrı gövde; ikisi de `resolveMaxTeams`'i kullanıyor ama kapasite yedeği ikisinde de kopya (`?? 3`). |
| Takım lideri tutarlılığı | `createTeam`/`updateTeam` lideri `TEAM_LEADER` yapıyor; `updateTeam` liderliği değiştirince **eski liderin** yeteneği kaldırılmıyor (yalnız `removeTeamMember` kaldırıyor). Ayrıca `deleteTeam` lider yeteneğini temizlemiyor → eski lider "Takım Lideri CRM" menüsünü görmeye devam eder, ama takımı yok. |
| Takım lideri ofis dışı olabilir | Admin `createTeam`: `getUserOrThrow(leaderId)` ofis kontrolü yok (ofis sahibi yolunda var: `leader.officeId !== officeId`). |
| Çok ofis | `User.officeId` tek; ama `Office.ownerUserId` ile bir kullanıcı birden çok ofisin sahibi olabilir. `create` buna izin vermiyor, admin yolu veriyor mu ⚠️ doğrulanmadı. `resolveOfficeWallet` `findFirst(orderBy id)` ile ilkini seçer → belirsiz. |
| Deneme paketi tekrar kontrolü | `startOfficeTrial` "daha önce deneme kullanıldı mı" kontrolünü `KontorHareketi.aciklama contains 'Ofis Deneme Paketi'` metin araması ile yapıyor – açıklama metni değişirse kontrol kırılır. Deneme PK'sı ofis sahibinin **kişisel** cüzdanına `toplamHediye` olarak yazılıyor. |
| Ölü kod | `OfficeService.purchaseOfficePackage` (ödeme doğrulaması olmadan PK yükler) controller'da kapalı ama serviste duruyor; yanlışlıkla bağlanırsa ödemesiz PK üretir. `POST /office/packages/orders` her zaman 503 döner. |
| Ofis mesajlaşma | `startTeamConversation` mevcut sohbeti **başlık metniyle** arıyor (`title` + katılımcı). Aynı adlı iki takım/ofis aynı sohbete düşebilir. Süper admin istisnası yok. |

---

## 2. Roller ve yetkiler

### 2.1 Rol/yetenek kaynakları ✅
- Rol: `User.role` (`EMLAKCI`, `ADMIN`, `SUPER_ADMIN`, vb.). Mobilde ayrıca `OFIS_SAHIBI`, `TAKIM_LIDERI` normalize edilmiş rol adları var (`session.ts`) – backend `Role` enum'unda karşılığı ⚠️ doğrulanmadı.
- Yetenek: `UserCapability` → `OFFICE_OWNER` (yalnız `EMLAKCI` rolüne atanabilir, `admin.service.ts:1292-1296`), `TEAM_LEADER`.
- "Aday": ofis modülünde ayrı bir "aday" yetkisi **yok**. `ADAY` rolü `canAccessOffice` listesinde değil (mobil ekran "yalnızca danışmanlar ve emlak ofisleri" der). Aday bir kullanıcı davet kodu giremez (`requestJoin` `role === EMLAKCI` şart koşar).

### 2.2 Yetki matrisi (kodda doğrulanan)

| İşlem | Ofis sahibi (`OFFICE_OWNER` + `ownerUserId`) | Takım lideri | Danışman (ofise bağlı EMLAKCI) | Aday / ofissiz EMLAKCI | Admin | **Süper admin (§0)** |
|---|---|---|---|---|---|---|
| Ofis kur (`POST /office/create`) | ✅ (ofissiz ve aktif ofisi yoksa) | ❌ | ❌ | ❌ | ❌ (kendi yolu `/organization/offices`) | Organization yolundan ✅ |
| Dashboard (`GET /office/dashboard`) | ✅ | yalnız bağlı olduğu ofis | ✅ kendi ofisi | boş + `canCreate`/katıl ekranı | `hasOwnerCap` var ama filtre `ownerUserId=self` → boş | ❌ **filtre yüzünden başkasının ofisini görmez** |
| Profil/logo/politika/davet/karar/PK dağıt/takım CRUD/yetkiler (`owned()`) | ✅ | ❌ | ❌ | ❌ | ❌ (sahip değilse) | ❌ **`ownerUserId !== userId` → 403** |
| Katılma başvurusu (`POST /office/join`) | ❌ | ❌ | ❌ (zaten ofiste) | ✅ (EMLAKCI + ofissiz) | ❌ | ❌ |
| Görev listesi | hepsi | kendine atananlar/oluşturduğu | kendine atananlar | ❌ | ❌ | ❌ (sahip/üye değil) |
| Görev oluştur | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Görev durum güncelle | ✅ | atanmışsa | atanmışsa | ❌ | ❌ | ❌ |
| Aktivite listesi | hepsi (filtreli) | yalnız kendisi | yalnız kendisi | boş döner | boş döner | ❌ kendi (boş) |
| Aktivite kaydı | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tarama logu oku | ✅ (`owned()`) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tarama logu yaz | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ofis CRM (`GET /office-owner-crm/dashboard`) | ✅ | – | – | – | `findFirst(ilk aktif ofis)` yedek | ✅ `?officeId=` ile her ofis |
| Takım Lideri CRM | – | ✅ | – | – | ✅ | ✅ `?teamId=` ile |
| `/organization/*` (ofis/takım CRUD, KPI) | ❌ | ❌ | ❌ | ❌ | ✅ (`ORGANIZATION_VIEW/MANAGE` izni) | ✅ |
| Rollout aç/kapa | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Takıma toplu mesaj (`/conversations/team`) | ✅ | ✅ (kendi takımı) | ❌ | ❌ | ❌ | ❌ |
| Paket listesi (`GET /office/packages`) | **kimlik doğrulamasız (JwtAuthGuard yok)** – herkese açık | | | | | |

### 2.3 §0 süper admin değerlendirmesi

| Yüzey | Durum |
|---|---|
| `/organization/*`, `/office-owner-crm`, `/team-leader-crm`, `/office/mine`, `/office/trial/start`, `/office/wallet-options`, `/office/rollout` | ✅ süper admin dahil |
| `/office/dashboard`, `/office/:id/profile|logo|spending-mode|invite|join-decision|transfer|teams*|permissions|tasks*|activities*|match-logs*` | ❌ **Dışarıda.** Süper admin ofis içindeki görev, aktivite, tarama logu, katılma başvurusu, yetki ayarı, profil bilgisini göremez/güncelleyemez (yalnız admin organizasyon ekranından ofis/takım düzeyi). |
| Ofis içi mesajlaşma (takım sohbeti) | ❌ süper admin istisnası yok; ofis mesajlarını görme/inceleme yolu ⚠️ `messages` modülünün tamamı okunmadı. |
| Mobil Ofisim ekranı | Süper admin için `SoftwareTeamOfficePanel` (yalnız liste, "Ofis CRM / Performans", "Ofis Denemesini Başlat"). Ofis çalışma alanı (cüzdan, kadro, görev, aktivite, tarama raporu) açılmıyor. |
| Test | `office-profile.spec.ts:27` `it.each(['member','stranger','super'])('does not let %s edit another owner office')` – §0'ın tersini doğrulayan test. Düzeltme yapılırken bu test de güncellenmeli. |

**Öneri (kod yazılmadı):** `owned()` içinde `role === SUPER_ADMIN` ise sahiplik kontrolünü atlamak; `dashboard()` ve görev/aktivite okuma uçlarında süper admine `officeId` ile tüm ofisleri açmak.

### 2.4 Diğer yetki gözlemleri ✅
- `POST /office/:id/permissions`: `scanPermissions` ve `autoSpendPermissions` anahtarları **doğrulanmıyor** (herhangi bir metin anahtar yazılabilir; kullanıcının o ofiste olduğu kontrol edilmiyor). `allowedSharedPoolUserIds/TeamIds` dizileri de doğrulanmadan kaydediliyor.
- `scanPermissions` yalnız `ensureScanAuthorized` içinde (EMLAKCI + ofise bağlı + sahip değil) uygulanıyor → çalışıyor. `autoSpendPermissions` yalnız **SHARED** modda uygulanıyor; ALLOCATED modda anlamsız (arayüzde "Onaysız Havuz Harcama" anahtarı her iki modda görünüyor ⚠️ görünürlük koşulu ekranda tam doğrulanmadı).
- `decide()` kapasite kontrolünde `limit` yedeği **5** (paket/abonelik yoksa), `createTeam` yedeği **3**, `getOfficeCapacity` yedeği **5** → üç yerde üç farklı yedek (§0-B ve tutarlılık).
- Ofis sahibi PK dağıtmak için **ofis sahibinin kendi cüzdanından** düşer; `source.aktifMi` ve `target.aktifMi` şart. Üye `isApproved && isVerified` olmalı.

---

## 3. Akışlar ve ekranlar (mobil)

Dokunma sayıları **ekran kodundan sayıldı** (✅ kod; gerçek cihazda ölçülmedi). Alt menüden "Ofisim"e ulaşım: `DashboardSideMenu` (menü aç → "Ofisim" = **2 dokunma**). `BottomNavBar`'da ofis kısayolu yok ⚠️ (yalnız yol eşleşmesi var).

### 3.1 Ofis kurma (ofis sahibi, `OFFICE_OWNER`)
1. Menü → Ofisim (2) → ekranda "Ofisinize Bağlanın" kartı (üstte) + "Kendi Emlak Ofisinizi Kurun" kartı (altta).
2. Ofis adı yaz → "Yeni Emlak Ofisi Oluştur" (1) → `POST /office/create`.
3. Ofis kurulur; **profil boş** (adres, telefon, logo yok). Profili doldurmak: "Ofis Kimliği & Profil Yönetimi" akordeonu aç (1) → "Ofis Bilgilerini Düzenle" (1) → alanlar → Kaydet (1).

Toplam: ~3 dokunma kuruluma, +3 profile. **Kafa karıştıran:** (a) ofis kurmayan danışman da aynı ekranda "Kendi Emlak Ofisinizi Kurun" kartını `canCreate` yalnızca `OFFICE_OWNER` olana gösterir – iyi; ancak (b) ofis sahibi önce "Ofisinize Bağlanın" (katıl) kartını görür – yanlış karta basma riski; (c) ofis kurulumu ilk anda `ALLOCATED` modda başlar, sahibe seçim sorulmaz, "modeConfigured" doğru görünür.

### 3.2 Danışman davet etme / katılma / ayrılma
**Davet (sahip):** Ofisim → "Ofis Kimliği & Profil Yönetimi" aç (1) → "Yeni Ofis Davet Kodu Oluştur" (1) → "Danışmanla Paylaş" (1) = **3 dokunma**. Kod: 12 hane hex, **7 gün**, ofis başına tek kod; yenisi eskisini geçersiz kılar.

**Katılma (danışman):** kodu al → Ofisim (2) → "Yapıştır" (1, isteğe bağlı) → "Katılma Başvurusu Gönder" (1) = **3-4 dokunma**. Başvuru `PENDING` kalır.

**Onay (sahip):** Ofisim → "Personel Hiyerarşisi & Kadro" aç (1) → "Kabul Et/Reddet" (1) = **2 dokunma**. Danışman kapasitesi dolu ise reddedilir (paket `agents`).

**Ayrılma / çıkarma: ❌ YOK.** Ne danışman ayrılabilir ne sahip çıkarabilir (✅ tarandı). Tek çıkış yolu manuel DB/admin müdahalesi ⚠️. Yanlış ofise kabul edilen danışman kalıcı bağlı kalır; `join()` zaten `user.officeId` doluysa reddeder → başka ofise geçemez.

**Kafa karıştıran noktalar:**
- Başvuru yapan danışmana **başvurusunun durumu** gösterilmiyor (sadece ilk mesaj); onay/red bildirimi de yok (`decide` push göndermiyor – ✅ kodda push yalnız görev akışında).
- Sahip, bekleyen başvuruyu bildirim olarak almıyor; "Personel Hiyerarşisi" akordeonunu açıp kendisi bakmak zorunda.
- Kod uzunluğu: ekranda "12 haneli", yapıştırma alanı `maxLength=25`, backend eski biçimi (`<officeId>.<kod>`) de kabul ediyor – iki biçim.
- Dil: "davet kodu", "katılım kodu", "DANIŞMAN KATILIM KODU" aynı şey için üç ad.

### 3.3 Takım kurma
Ofisim → "Takım Yönetimi & Branşlar" aç (1) → takım adı yaz → "Takım Oluştur" (1) → takım kartında "Eklenecek Danışman" seç (1-2) → ekle (1) = **4-5 dokunma**. Takım lideri atama için ekranda ayrı bir adım **görünmüyor** (mobil `createTeam` yalnız `name` gönderiyor; `leaderId` uca verilebiliyor ama arayüzde alan yok ✅) → ofis sahibi mobilden lider atayamaz, yalnız admin organizasyon ekranından atanır.
**Kırık:** bkz. Bulgu 2 – `teams`/`maxTeams` dashboard'dan gelmediği için kota kontrolü istemcide "bilgi alınamadı" der ve `handleCreateTeam` **takım kurmayı engeller**.
**Kafa karıştıran:** takım yönetimi iki yerden (Ofisim ve Yönetim → Organizasyon) yapılır; kurallar (lider, kota) iki ayrı kodda.

### 3.4 PK dağıtma
Ofisim → "Danışman Yetkileri & Kontör Dağıtımı" aç (1) → danışman seç (1) → miktar yaz → "PK Dağıtımını Onayla" (1) → uyarı penceresi "PK Aktar" (1) = **4 dokunma**. İstek anahtarı cihazda saklanıyor; ağ kesilirse "Aynı İşlemi Tamamla" ile tekrarlanıyor (idempotent, makbuz doğrulaması var) – **iyi tasarım**.
Ön koşul: harcama modu `ALLOCATED` (Ofis Cüzdanı akordeonunda "Danışmana Dağıt"). Mod değiştirme ayrı akordeonda (Cüzdan) – dağıtım ekranında "mod uygun değil" hatası alıp başka bölüme gitmek gerekir.
**Kafa karıştıran:** "kontör" / "PK" / "Ortak PK" / "Ortak Havuz" / "ana kasa" aynı kavram için karışık. "Ortak Havuz" modunda sahibe "kişi başı limit yok" uyarısı veriliyor ama `allowedSharedPoolUserIds` ile kısıtlama arayüzde **yok** (yalnız API'de).
**Geri alma yok:** dağıtılan PK sahibe geri çekilemez (uyarı metni bunu söylüyor, doğru).

### 3.5 Ofis kimlik kartı
`OfficeIdentityCard`: ad, sahip adı, telefon (arama bağlantısı), adres, konum, mod, danışman sayısı, logo yükle/kaldır (JPG/PNG/WEBP ≤ 2 MB, sihirli bayt doğrulaması ✅). Düzenleme sahibe açık: akordeon (1) → "Ofis Bilgilerini Düzenle" (1) → Kaydet (1).
**Kafa karıştıran:** akordeon varsayılan **kapalı** (`identity: false`) ama yorum "ilk sekme açık" diyor; sahip kartı görmek için önce açmak zorunda. Ofis telefonu başka modüllerde (`pool-privacy.ts`, `units.service.ts`) kullanılıyor, güncel veri `SystemSetting`'ten okunuyor.

### 3.6 Ofis görevleri ve aktiviteleri
- **Görev (sahip):** Ofisim → "Görev Atama & Takip" aç (1) → form aç (1) → başlık, açıklama, son tarih (metin), takım/kişi seç (≥2) → "Görevi Ata ve Bildir" (1) = **≥5 dokunma**. Son tarih serbest metin girişi (tarih seçici yok ✅ `taskDueDate` TextInput). Push: atananlara gider.
- **Görev (danışman):** "Bana Atanan Görevler" → durum değiştir (1-2 dokunma). Durum değeri istemciden **doğrulamasız** (`status: any metin`) kaydedilir ✅.
- **Aktivite:** "Danışman Aktiviteleri & Performans" aç (1) → form aç (1) → tür, müşteri adı, portföy (serbest metin), sonuç, not → "Aktiviteyi Kaydet" (1) = **≥4 dokunma**. Müşteri ve portföy **serbest metin**; CRM müşteri/portföy kaydına bağlanmıyor (`customerId/portfolioId` alanları var ama arayüz göndermiyor ⚠️ ekran kısmen okundu). Yani aktivite CRM'deki gerçek yer gösterme/ziyaret kayıtlarıyla **ikinci kez elle girilen** veri.
- **Aynı işin iki yerden yapılması:** CRM modülünde hatırlatıcı/yer gösterme var (proje kuralları §3 modül listesi); ofis "aktivite" formu aynı olayları ayrıca tutuyor. Görevler de kişisel "hatırlatıcı" ile örtüşür.

### 3.7 KPI / performans
- **Ofis CRM / Performans** (`/office-owner-crm`): Ofisim ekranında **iki ayrı düğme** (üstte "Ofis CRM / Performans" + akordeon içinde "Ofis CRM & Performans Panelini Aç") aynı sayfaya gider → yinelenen yol.
- Puan hesabı (`office-owner-crm.service.ts:30-44`): danışman/40, takım/6, portföy/200, yetkili portföy/120, havuz/80 oranlarıyla **sabit hedefler kodda** → §0-B'ye göre "ticari/limit" sayılmasa da yönetimden ayarlanamaz. Takım lideri puanı farklı formül (üye/10, oranlar) – iki ayrı skor mantığı, karşılaştırılamaz.
- Aktivite sayıları (ziyaret/yer gösterimi/telefon/diğer) ofis ekranında, **KPI puanına dahil değil** ✅ (puan portföy/havuz sayılarından; aktivite JSON'u KPI'ya bağlı değil).
- Takım lideri paneli: Menü → Takım Lideri CRM (2).

### 3.8 Ofis paketleri ve deneme
- Katalog: `GET /office/packages` (JWT yok). Mobilde sahibe "Ofis Paketleri & Kapasite" akordeonu: **yalnız liste**; "satın al / yükselt" düğmesi **yok** (§2 mobilde satın alma yolu yok kuralıyla uyumlu ✅). Metin "Paket yükselterek daha fazla takım kurabilirsiniz" yönlendirme vermiyor ve web'e de yönlendiremez (kural) – kullanıcı ne yapacağını bilemez.
- Deneme: ofis sahibi için **mobilde başlatma düğmesi yok**; yalnız süper admin `SoftwareTeamOfficePanel`'den "Ofis Denemesini Başlat" ile başlatabilir. Ofis sahibi API'yi doğrudan çağırabilir (`POST /office/trial/start`, sahip kontrolü var). Kullanıcı deneme paketine ofis akışından ulaşamaz; belge onayında otomatik "Deneme paketi" (kişisel üyelik) başka yol – ofis denemesi ile **karıştırılır** ("Deneme" iki farklı kavram: üyelik denemesi, ofis denemesi).
- Abonelik süresi dolunca ne olur: `getOfficeCapacity` süresi geçmiş aboneliğe bakmıyor (yalnız `valueJson` var mı) ⚠️ süre dolumu kapasiteyi kısmıyor görünüyor (`expiresAt` yalnız deneme çakışması kontrolünde).

### 3.9 Gizli / dağınık menüler (özet)

| Sorun | Yer |
|---|---|
| Tüm sahip işleri **tek ekranda 10 akordeon**; hepsi varsayılan kapalı | `OfficeWorkspace.tsx` |
| "Ofis CRM / Performans" 2 kez | Ofisim üst düğme + akordeon |
| Ofis oluşturma 2 yerde (Ofisim ekranı ve Admin → Organizasyon) | – |
| Takım yönetimi 2 yerde | Ofisim ve Admin → Organizasyon |
| Ofis "Cüzdan" ve "PK Dağıtımı" ayrı akordeonlarda ama birbirine bağımlı | – |
| Aynı kavram için 3-4 ad: kontör / PK / Ortak PK / ana kasa; davet / katılım kodu | metinler |
| Süper admin için ayrı, kısıtlı ekran + ayrı "Ofis Üyeliği Geçiş Durumu" düğmesi | `office.tsx:107` |

---

## 4. Backend uçları

Önek: `Authorization: Bearer` (JwtAuthGuard). "owned()" = aktif ofisin sahibi + `OFFICE_OWNER` yeteneği (süper admin istisnası **yok**, bkz. §2.3). ✅ kod okundu.

### 4.1 `/office` (OfficeController – `office.controller.ts`)
| Yöntem | Yol | Yetki |
|---|---|---|
| GET | `/office/packages` | **Yok (herkese açık)** |
| GET | `/office/mine` | JWT; süper admin tüm aktif ofisler, diğerleri kendi/sahip olduğu |
| POST | `/office/trial/start` | JWT; ofis sahibi veya SUPER_ADMIN; tek seferlik |
| POST | `/office/packages/purchase` | JWT → her zaman 403 (kapalı) |
| POST | `/office/packages/orders` | JWT → her zaman 503 |
| GET | `/office/wallet-quote?action&walletSource&walletOfficeId` | JWT |

### 4.2 `/office` (OfficeManagementController – `office-management.controller.ts`)
| Yöntem | Yol | Yetki |
|---|---|---|
| GET/POST | `/office/rollout` | SUPER_ADMIN (RolesGuard) |
| GET | `/office/dashboard` | JWT; sahip/üye (süper admin görmez) |
| GET | `/office/wallet-options` | JWT; süper admin tümü |
| POST | `/office/create` | EMLAKCI + `OFFICE_OWNER`, aktif ofisi/bağı yok |
| POST | `/office/join` | EMLAKCI, ofissiz; davet kodu |
| PATCH | `/office/:id/profile` | owned() |
| POST/DELETE | `/office/:id/logo` | owned() |
| POST | `/office/:id/spending-mode` | owned() |
| POST | `/office/:id/invite` | owned() |
| POST | `/office/:id/join-decision` | owned() |
| POST | `/office/:id/transfer` | owned() |
| POST | `/office/:id/teams` | owned() + paket kotası |
| PATCH/DELETE | `/office/:id/teams/:teamId` | owned() |
| POST | `/office/:id/teams/:teamId/members` | owned() |
| DELETE | `/office/:id/teams/:teamId/members/:memberId` | owned() |
| PATCH | `/office/:id/permissions` | owned() |
| GET | `/office/:id/tasks` | sahip veya ofis üyesi |
| POST | `/office/:id/tasks` | owned() |
| PATCH | `/office/:id/tasks/:taskId` | sahip veya atanan |
| GET | `/office/:id/activities` | sahip (hepsi) / üye (yalnız kendisi) – **üyelik doğrulaması yok**, üye değilse boş döner |
| POST | `/office/:id/activities` | ofis üyesi veya sahip |
| GET | `/office/:id/match-logs` | owned() |
| POST | `/office/:id/match-logs` | ofis üyesi veya sahip |

⚠️ İki controller de `@Controller('office')` – rota çakışması yok (statik `packages/mine/...` yolları ile `:id/...` ayrı derinlik). `GET /office/:id` benzeri bir tekil uç yok.

### 4.3 Ofisle ilgili diğer uçlar
| Yöntem | Yol | Yetki |
|---|---|---|
| GET | `/office-owner-crm/dashboard?officeId` | JWT; sahip; `officeId` yalnız SUPER_ADMIN; **ADMIN** için ilk aktif ofis yedeği |
| GET | `/team-leader-crm/dashboard?teamId` | EMLAKCI/ADMIN/SUPER_ADMIN + `TEAM_LEADER` (ADMIN/SA hariç); `teamId` yalnız SA |
| GET | `/organization/summary`, `/users`, `/offices`, `/offices/:id/kpi`, `/teams`, `/teams/:id/kpi` | ADMIN/SUPER_ADMIN + `ORGANIZATION_VIEW` |
| POST/PATCH | `/organization/offices`, `/offices/:id`, `/teams`, `/teams/:id`, `/teams/:id/leader`, `/teams/:id/members`; DELETE `/teams/:id/members/:userId` | ADMIN/SA + `ORGANIZATION_MANAGE` |
| POST | `/conversations/team` | JWT; ofis sahibi veya takım lideri |

**Yok ama mobil çağırıyor (404):** `DELETE /organization/offices/:id`, `DELETE /organization/teams/:id` (`admin/organization.tsx:426, 534`).
**Hiç olmayan uçlar:** danışmanı ofisten çıkar / ofisten ayrıl; ofis sahipliği devri; ofis pasifleştirme (sahip için); davet kodunu iptal; görev silme; aktivite/log silme; başvuru geri çekme.

---

## 5. Hatalar ve riskler

### 5.1 Kırık 17 test – sebep ✅ (jest tam koşu: 3 suite başarısız, 94 başarılı; 17 başarısız / 1099 başarılı / 1116 toplam)

| Suite | Başarısız | Kök neden |
|---|---|---|
| `office/office-management.spec.ts` | 11 | `owned()` ve `dashboard()` `include: { capabilities: true }` ile okuyup `user.capabilities.some(...)` çağırıyor; testin `db.user.findUnique` mock'u kullanıcılarda **`capabilities` dizisi döndürmüyor** → `Cannot read properties of undefined (reading 'some')` (davet/başvuru/karar/kapasite testleri) veya sahip `OFFICE_OWNER` yeteneği olmadığı için `ForbiddenException` (transfer testleri: "Received constructor: TypeError"). |
| `office/office-profile.spec.ts` | 5 | Aynı kök neden: sahip mock'unda `OFFICE_OWNER` yeteneği yok → `updateProfile/uploadLogo/removeLogo` 403. Ek: `dashboard` testi eski sorguyu bekliyor (`OR:[{ownerUserId},{id}]`), kod artık yeteneğe göre filtre kuruyor. |
| `office/grup5_6-verification.spec.ts` | 1 | Aynı kök neden (görev oluşturma `owned()` → 403). |

Bu davranış değişikliği (`OFFICE_OWNER` yeteneği şartı) kodun **kasıtlı** güvenlik sıkılaştırması gibi görünüyor ⚠️ (git geçmişi: son değişiklik `e497090c feat(EPH-24A)`; testlerin güncellenmediği anlaşılıyor). Çözüm testlerde: mock kullanıcılara `capabilities: [{capability:'OFFICE_OWNER'}]` eklemek ve §0 testini düzeltmek. **Kod yazılmadı.**

### 5.2 Yetki açıkları ve risk tablosu

| # | Risk | Etiket | Önem |
|---|---|---|---|
| R1 | §0 – süper admin ofis içi uçlardan dışarıda (bkz. §2.3) | ✅ | Yüksek |
| R2 | `match-logs` POST: `spentPk`, `status`, `kontorHareketiId`, `resultCount` istemciden alınıp kaydediliyor; "PK tüketim şeffaflığı" raporu **sahteleştirilebilir** ve gerçek `KontorHareketi` ile eşleşmiyor. | ✅ | Orta |
| R3 | `permissions` PATCH girdi doğrulaması yok (anahtar/değer tipi/ofis üyeliği) | ✅ | Orta |
| R4 | Görev `status` serbest metin; JSON dizisine yazılan tüm alanlar (`title` uzunluğu, `description`, `note`) için **uzunluk sınırı yok** → büyük payload ile `SystemSetting` satırı şişirilebilir | ✅ | Orta |
| R5 | `GET /office/packages` kimlik doğrulamasız (ticari katalog herkese açık; kasıtlı olabilir) | ✅ ⚠️ | Düşük |
| R6 | `recordConsultantActivity`/`recordOfficeMatchLog` kilitsiz okuma-yazma → kayıp güncelleme | ✅ | Orta |
| R7 | Davet kodu 48 bit entropi, SHA-256 özet, 7 gün; brute-force hız sınırı (rate limit) bu controller'da görünmüyor ⚠️ (global throttler olup olmadığı okunmadı). Kod yanlış girilen denemeler sayılmıyor. | ⚠️ | Orta |
| R8 | `invite()` her çağrıda yeni `EPH_OFFICE_CODE_<hash>` satırı yaratır, eskiyi silmez → süresiz çöp birikir | ✅ | Düşük |
| R9 | `purchaseOfficePackage` ölü kod, ödeme doğrulaması olmadan PK yükler | ✅ | Düşük (kapalı) – ama yanlışlıkla açılırsa yüksek |
| R10 | Deneme "tek sefer" kontrolü metin aramasına bağlı (`aciklama contains`) | ✅ | Düşük-Orta |
| R11 | Takım lideri yeteneği tutarsız temizleniyor (`updateTeam`, `deleteTeam`) → eski lider hâlâ "Takım Lideri CRM"e girer (boş sonuçla) | ✅ | Düşük |
| R12 | `startTeamConversation` mevcut sohbeti **yalnız başlık + katılımcı** ile arıyor; aynı adlı takımlarda yanlış sohbete düşebilir | ✅ | Düşük |
| R13 | Ofis aboneliği süresi dolunca kapasite/kota **otomatik düşmüyor** (süre kontrolü yok) | ⚠️ (kod okundu, canlı davranış test edilmedi) | Orta |
| R14 | `getConsultantActivities`: sahip olmayan **ve üye olmayan** kullanıcı da çağırabiliyor (kendi kayıtlarını filtreler → boş; bilgi sızmaz ama hata da vermez) | ✅ | Düşük |
| R15 | `dashboard()`: ADMIN rolü `hasOwnerCap` alır ama sorguda `ownerUserId=self` → ADMIN'e anlamsız boş sonuç | ✅ | Düşük |

### 5.3 Çalışmayan / yarım özellikler

| Özellik | Durum |
|---|---|
| Takım yönetimi arayüzü (liste, kota, üye etiketi) | **Backend dashboard veri döndürmüyor** → fiilen çalışmıyor (yerel backend) |
| Danışman yetki anahtarları (Tarama / Onaysız Harcama) başlangıç durumu | Dashboard `canScan/canAutoSpend` döndürmüyor → anahtarlar hep aynı varsayılandan başlar ⚠️ ekran varsayılanı okunmadı |
| Hiyerarşi (`hierarchy`) | Backend döndürmüyor; mobil `members` listesinden yedek çizim yapıyor olabilir ⚠️ |
| Ofisten ayrılma/çıkarma | Yok |
| Ofis sahibi için deneme başlatma | Mobilde yok (yalnız süper admin) |
| Paket yükseltme/satın alma | Mobilde yok (kurala uygun), ancak yönlendirme metni yok |
| Admin → ofis/takım silme | Mobil var, backend yok (404) |
| `OfficeTask*`, `ConsultantActivity`, `OfficeMatchScanLog` tabloları | Oluşturulmuş ama kullanılmıyor |
| `autoSpendPermissions` | Yalnız SHARED modda etkili |
| `allowedSharedPoolUserIds/TeamIds` | Backend uygular, mobil arayüzü yok |
| Aktivite → KPI bağlantısı | Yok |
| Rollout ekranı | Çalışıyor (süper admin) |

### 5.4 §0-B kodda sabit değerler ✅
`office.service.ts`: `costPk = 25` yedeği (`COST_OZEL_BILGI` yoksa), `crmCapacity ?? 1500`, `portfolioCapacity ?? 150`, `agents ?? 5`; `office-management.service.ts`: `decide` kapasite yedeği `5`, `createTeam` `?? 3`; `office-team-quota.ts` kapasiteden takım sayısı tablosu (25→5, 15→3, 7→2, 1→1); `invite()` 7 gün; `purchaseOfficePackage` 30 gün; `office-owner-crm.service.ts` KPI hedefleri (40/6/200/120/80). Paket değerleri (fiyat, PK, limitler) **DB'de** ve değişiklik logu var – §0-B'nin ana şartı karşılanmış; yedekler ise paket/ayar eksik olduğunda sessizce devreye girer.

---

## 6. Sektördeki profesyonel emlak ofisi yazılımlarında olup EPH'te bulunmayanlar

> Bu liste **genel sektör bilgisine** dayanır (⚠️ tahmin / karşılaştırma; belirli bir ürünün sürüm özelliği doğrulanmadı, internet taraması yapılmadı). EPH'te "yok" denilen maddeler kodda arandı ve ofis modülünde bulunamadı.

| Alan | Sektörde yaygın özellik | EPH ofis modülünde |
|---|---|---|
| Organizasyon | Şube/çok ofis hiyerarşisi (merkez–şube–takım), ofis sahipliği devri, danışmanı çıkarma/askıya alma, danışman devir/ayrılış akışı (portföy ve müşteri devri) | Tek düz ofis; ayrılma/çıkarma/devir yok |
| Roller | Özel rol ve izin matrisi (asistan, muhasebe, yönetici asistanı, salt okunur), ofis içi izin şablonları | Yalnız sahip / takım lideri / danışman |
| Portföy | Ofis içi portföy paylaşımı kuralları (iç havuz, kilit, ortak çalışma), portföy atama/devir, yetkilendirme belgesi takibi ofis düzeyinde | Havuz var; ofis içi atama/devir ekranı ofis modülünde yok ⚠️ |
| CRM | Satış hunisi aşamaları ve hedef, lead dağıtım kuralları (round-robin, bölgeye göre), lead kaynak ROI | Ofis CRM paneli sayısal özet; otomatik lead dağıtımı yok |
| Hedef / KPI | Danışman ve takım için aylık hedef belirleme, hedef–gerçekleşen, liderlik tablosu, komisyon hedefi | Hedef atama yok; puan sabit formül |
| Komisyon / Finans | Komisyon sözleşmesi, pay oranları (ofis/danışman), hakediş, fatura/tahsilat, gelir-gider, vergi raporu | Yok (kapsam dışı olabilir) |
| Sözleşme | Yetki belgesi (satış/kiralama) şablon ve e-imza, hatırlatma | `eph-authority-letters` modülü var ama ofis modülüne bağlı değil ⚠️ |
| Görev/İş akışı | Görev şablonu, tekrar eden görev, alt görev, öncelik, dosya ekleme, takvim görünümü, hatırlatma/gecikme uyarısı, görev silme | Basit görev: başlık/açıklama/tarih metni/durum; silme ve takvim yok |
| Aktivite | Takvim entegrasyonu, ziyaret/yer gösterme kaydının CRM'e otomatik bağlanması, GPS doğrulamalı ziyaret, çağrı kaydı entegrasyonu | Elle form; CRM'e bağlı değil |
| Raporlama | Tarih aralığı filtreli, dışa aktarma (PDF/Excel), danışman karşılaştırma, aktivite–satış korelasyonu, otomatik haftalık rapor | Yok / ekranda ham liste |
| İletişim | Ofis duyurusu (toplu bildirim), ofis içi kanal/grup, danışman işe alım/oryantasyon | Takım sohbeti var; duyuru yok |
| Bildirim | Başvuru onay/red bildirimi, görev gecikme uyarısı, kota dolum uyarısı | Yalnız görev push'u |
| Marka | Ofis web sitesi/vitrin, ofis sayfası, danışman kartvizit/QR, markalı paylaşım şablonları | Ofis kimlik kartı (logo/adres/telefon) |
| Güvenlik/Denetim | Ofis içi işlem günlüğü ekranı (kim, ne, ne zaman, eski/yeni), IP/cihaz oturum yönetimi | Kısmi `AdminActionLog`, ofis sahibine görünür log ekranı yok |
| Eğitim/Onboarding | Yeni danışman rehberi, işe alım adayı havuzu (aday takibi), deneme dönemi | "Aday" ofis akışında yok |
| Veri | Veri dışa aktarma/yedek, danışman ayrılınca verinin ofiste kalması kuralları | Yok |
| Faturalama | Ofis paket faturası, yenileme/iptal, ek koltuk satın alma | Mobilde yok (kural gereği), web akışı ofis aboneliği ile bağlı mı ⚠️ doğrulanmadı |

---

## 7. Önceliklendirilmiş öneri listesi (uygulama yapılmadı)

1. **§0 düzeltmesi:** `owned()`/`dashboard()`/görev-aktivite okuma uçlarında süper admini örtük dahil et; mobil süper admin için ofis çalışma alanını (salt görüntüle + güncelle) aç; ilgili testi güncelle.
2. **Dashboard sözleşmesi:** `teams`, `maxTeams`, `allMembers`, `members[].teams/canScan/canAutoSpend`, `hierarchy`, `permissions` alanlarını backend'den döndür veya mobil beklentiyi değiştir; önce canlı sunucudaki sürümü kontrol et.
3. **Testleri onar:** mock'lara `capabilities` ekle (17 testin tek kök nedeni).
4. **Depo birliği:** `SystemSetting` JSON dizileri mi, ham tablolar mı? Birini seç; tabloları şemaya al ve JSON'dan taşı, ya da kullanılmayan tabloları kaldır.
5. **Ofisten ayrılma/çıkarma** uçları + onay/red bildirimi.
6. **404 uçlar:** `DELETE /organization/offices/:id` ve `/teams/:id` ekle veya mobil düğmeleri kaldır.
7. `match-logs` istemci yazımını kaldır; logu sunucuda gerçek `KontorHareketi` ile üret.
8. Yedek sabitleri (§5.4) tek yerde, DB ayarından okunur hale getir.
9. Ofis yönetim loglarına PK dağıtımı, takım, yetki değişikliklerini ekle (kim/ne zaman/eski/yeni).
10. Menü sadeleştirme: tek "Ofis CRM" girişi, tek takım yönetimi yeri, terim birliği (PK / davet kodu).

---

## 8. Doğrulama kanıtı

- `npx jest --silent` (D:\Projects\SM\backend, tam koşu): `Test Suites: 3 failed, 94 passed, 97 total · Tests: 17 failed, 1099 passed, 1116 total`. Başarısız suite'ler: `src/office/office-management.spec.ts`, `src/office/office-profile.spec.ts`, `src/office/grup5_6-verification.spec.ts`.
- Mobil tarafta `npm run typecheck` **çalıştırılmadı** (kod değişmedi; kural §6 yalnız değişiklik sonrası geçerli).
- Canlı sunucu, canlı DB, gerçek cihaz kontrolü **yapılmadı**.
