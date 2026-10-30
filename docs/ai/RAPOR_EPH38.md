# EPH-38 backend — Bildirim ve Aksiyon Merkezi / EPH-02

Tarih: 2026-10-30. Kapsam: yalnız yerel backend kodu ve bu rapor.
Canlı DB/sunucu erişimi, migration çalıştırma, deploy, gerçek Expo isteği ve commit yapılmadı. Jest Expo yanıtları mock'tur.

## 1. Mevcut altyapı ve EPH-02 teşhisi

| Alan | Okunan mevcut uygulama |
|---|---|
| Kullanıcı bildirimi | `prisma/schema.prisma: NetworkNotification`: userId, postId, title, message, isRead, createdAt. Kullanıcıya bağlı; mevcut Network bildirimleri korunuyor. |
| Diğer kaynaklar | `SystemMessage`: admin mesajı/hedef kitlesi, fakat toplu mesajda tek isRead alanı; `PlatformAnnouncement`: aktiflik, hedef kitle ve yayın tarihleri. Yeni merkez bunlardan kullanıcı başına bildirim üretir. |
| Expo token kaydı | `src/push/native-push.controller.ts`: JWT ile `POST /push/native/subscribe`. `NativePushService.subscribe` token SHA256 özetiyle `SystemSetting.key = EPH_NATIVE_PUSH_<hash>` upsert eder. JSON: userId, token, platform, sound, preferences. Kullanıcı başına 20 cihaz sınırı; unsubscribe sahiplik filtreli. |
| Browser aboneliği | `PushSubscription`: userId, endpoint, p256dh, auth; Expo kaydı değildir. |
| Gönderim | `PushService.sendToUser` önce NativePushService, ardından web-push çağırır. Native servis Expo `/push/send` biletini işler; makbuz kimliğini `EPH_PUSH_RECEIPT_<id>` altında saklar. |
| Cihaz ayarları | Mobil `src/lib/push.ts`, `src/lib/notificationPreferences.ts`, `src/app/notification-settings.tsx` salt okunur incelendi. Tercihler cihazda tutulup subscribe gövdesiyle sunucuya senkronlanır. Önceden ayrı backend `notification-settings` controller'ı yoktu. |

### Kanıtlanmış kod bulguları

1. Token kaydeden kod var. Ancak ilgili gerçek cihazın kaydı DB'de var mı, son kaydı doğru kullanıcıya mı ait: **canlı veri okunmadığı için bilinmiyor**.
2. Önceden yeni mesaj, Network takip güncellemesi, bazı ofis görevleri ve test uçları push çağırıyordu. İstenen olayların çoğunda ortak bildirim/push bağlantısı yoktu. Dolayısıyla desteklenmeyen olayda push beklemek için kod bağlantısı eksikti.
3. `NativePushService` Expo biletindeki hataların çoğunu yalnız failCount'a indiriyordu; ağ/JSON hataları ayrıntısız yakalanıyordu. Bu yüzden eski kaynak tek başına gerçek Expo yanıtını kanıtlamıyor. Yeni loglar HTTP durumu, bilet kimliği, Expo hata kodu ve cihaz sayısı/atlanan cihaz sayısını tokenı yazmadan gösterir.
4. `collectReceipts()` üzerinde Cron dekoratörü vardı; `ScheduleModule.forRoot()` yalnız hiçbir modülün import etmediği `TaskRemindersModule` içindeydi. Uygulama modül ağında makbuz zamanlaması bağlı değildi. Bu, teslim hatalarının düzenli takip edilmemesi için somut kod nedenidir; ilk push'un gelmemesinin tek başına kanıtı değildir.
5. Mobil test ekranı uzak `/push/native/test` başarısızlığını yakalayıp görmezden geliyor, sonra `scheduleNotificationAsync` ile **yerel** bildirim gösterip başarı yazıyor. Yerel bildirim görülmesi, Expo → FCM/APNs → cihaz teslimini kanıtlamaz. Mobil dosyalar bu backend görevinde değiştirilmedi.

**EPH-02 durumu:** eksik olay bağlantıları, teslim takibi ve log boşlukları yerelde giderildi. Gerçek cihazın kesin kök sebebi henüz kanıtlanmadı. Tokenın varlığı, send çağrısı, Expo bileti ve makbuzu aşağıdaki komutlarla aynı kullanıcı/zaman için eşleştirilmelidir. `SENT`, gönderim servisinin kabulüdür; cihazda görüntülenme kanıtı değildir.

## 2. Ortak notify ve teslim davranışı

`src/notifications/notifications.service.ts`:

```ts
notify(userId, { type, priority: 'ACIL' | 'ONEMLI' | 'BILGI', title, body, actionUrl, eventKey? })
```

Mevcut `NetworkNotification` kullanılır; dış sözleşmede body, mevcut tabloda message alanına yazılır. actionUrl uygulama içi `/...` yoludur; dış URL, çift slash, ters slash ve satır sonu reddedilir. eventKey olay+kullanıcı tekilleştirmesidir.

Transaction içindeki olay bağlayıcıları aynı fonksiyonun opsiyonel üçüncü `Prisma.TransactionClient` parametresini kullanır. Bildirim iş işlemiyle birlikte kaydolur/geri alınır; commit öncesi ağ isteği yapılmaz. Bağımsız notify önce kaydeder, sonra push dener. Push hatası kaydedilmiş bildirimi kaybettirmez.

Kuyruk durumları: `PENDING`, `SENDING`, `SENT`, `RETRY`, `FAILED`, `DISABLED`, `NO_SUBSCRIPTION`; eski kayıtlarda `NONE`. Atomik updateMany ile iş sahiplenilir; paralel worker aynı denemeyi sahiplenemez. En fazla 3 deneme, tekrar için en az 60 saniye; yarıda kalan SENDING 5 dakika sonra geri alınır. Son denemede kesilen işler FAILED'e alınır. Expo kabulünden sonra DB güncellemesi kaybolursa tekrar push ihtimali vardır; uzaktaki teslim için exactly-once iddiası yoktur.

`NotificationScheduler` mevcut `cron@4.4.0` bağımlılığını açık bağımlılık olarak kullanır; dört işi başlatıp kapanışta durdurur:

- Olay toplama: dakikada bir, kaynak başına en fazla 100 yeni kayıt.
- Push kuyruğu/tekrar: dakikada bir, en fazla 100 uygun kayıt.
- Expo makbuzları: iki dakikada bir.
- Üyelik/deneme bitişi: her gün 09:00, Europe/Istanbul; 3 takvim günü sonraki bitişler. Bireysel ve ofis paketleri, 100'lük sayfalarla tüm alıcılar işlenir.

Genel Cron keşfi açılmadı: mevcut kapsam dışı hesap silme ve piyasa görevleri bu değişiklikle etkinleştirilmez. Yeni olay toplayıcı migration'ın `EPH38_NOTIFICATIONS_SINCE` başlangıç zamanını kullanır; eski mesaj/harcama/rol geçmişine toplu push üretmez. Cursor yerine benzersiz eventKey kontrolü kullanıldığı için geç commit edilen bir kayıt cursor arkasında kalmaz. Okuyucular SELECT yapar; ücretli tarama, ödeme veya ücretli API başlatmaz.

## 3. Olay listesi

| Olay | Alıcı / öncelik | Kaynak ve bağlama |
|---|---|---|
| Ofis başvurusu geldi | Ofis sahibi / ACIL | `OfficeManagementService.requestJoin`, aynı transaction + kaynak kayıt üzerinden tamamlayıcı toplama. `/office` |
| Ofis başvurusu onay/red | Başvuran / ONEMLI | `decide`, aynı transaction; karara göre ayrı metin. `/office` |
| İletişime Geç ile ilan/proje bölümü açıldı | İlan/proje sahibi / BILGI | UNIT için tamamlanmış HAVUZ_OZEL_BILGI harcaması; hareket başına tek bildirim. Kendi ilanına ücretsiz bakış ve yazılım ekibi yönetim erişimi müşteri açılışı sayılmaz. `/portfoy/:id` |
| Talep iletişimi açıldı | Talep sahibi / BILGI | Network'teki mevcut transaction bildirimi aynı kuyruğa type/priority/actionUrl/eventKey/PENDING ile dahil edildi; ikinci bildirim üretilmez. `/network/:id` |
| Yeni mesaj | Diğer katılımcılar / ONEMLI | `MessagesService.sendMessage` → notify; Message kaydı üzerinden yeniden toplama ve diğer mesaj oluşturma yolları. Gönderen hariç; yazılım ekibi görünür adı korunur. `/messages/:conversationId` |
| Talep eşleşmesi | Taramayı yapan / ONEMLI | COMPLETED, REQUEST türünde, matches dolu ücretli tarama kaydı. Sıfır sonuç/başarısız/tekrar kayıt için yeni bildirim yok; yeni ücretli tarama başlatılmaz. `/network/:sourceId` |
| PK düşük | Bakiyesi düşen gerçek cüzdan sahibi / ONEMLI | KontorHareketi.oncekiBakiye >= LIMIT_PK_DUSUK_UYARI ve sonrakiBakiye < eşik. Aynı eşik altında devam eden harcamalarda tekrar yok. Ofis ortak cüzdanında alıcı gerçek borçlandırılan kullanıcıdır. `/kontor` |
| Üyelik/deneme bitişine 3 gün | Üye / ofis sahibi / ONEMLI | Günlük cron; KullaniciUyelikPaketi + UyelikPaketi ve OFFICE_SUBSCRIPTION_* kayıtları. Üyelik kimliği+bitiş tarihi ile tekilleştirme. `/uyelik` veya `/office` |
| Rol/yetki değişti | Etkilenen kullanıcı / ONEMLI | AdminActionLog USER_ROLE_CHANGED/USER_CAPABILITIES_UPDATED; AuditLog UPDATE_USER_PERMISSION/UPDATE_USER_ROLE. Ofis scan/autoSpend/paylaşılan havuz erişimi değişen üyeye aynı transaction'da bildirim; etkin değer değişmediyse bildirim yok. `/profile` veya `/office` |
| Proje havuz kabulü | Proje sahibi / ONEMLI | ProjectSalesLaunchService.publishToPool: ilk yeni havuz yayını transaction'ında, yayınlanan bölüm varsa. Zaten havuzdaki projeyi yenilemede tekrar yok. Mevcut akışta ayrıca admin kabul adımı yok; gerçek HAVUZDA geçişi esas alındı. `/project-sales/:id` |
| Admin duyurusu | Gerçek hedef kitlesindeki onaylı/görünür kullanıcılar / BILGI | Aktif, yayın zamanı gelmiş PlatformAnnouncement; SystemMessage tek kullanıcı/rol/şehir/şehir+rol hedefleri. Duyuru+kullanıcı başına tek kayıt; içerik düzenleme tekrar push üretmez. `/dashboard` veya `/notifications` |

## 4. Uç sözleşmesi

Tüm uçlar JWT korumalıdır; sahiplik JWT user.id üzerinden belirlenir. Body/query ile başka kullanıcı adına işlem yapılamaz. Normal kullanıcı başka kullanıcının bildirimini okuyamaz veya okundu yapamaz. SUPER_ADMIN hesabının kendi bildirimleri de aynı uçları kullanır; mevcut yönetim yetkileri değiştirilmedi.

| Uç | Yanıt / davranış |
|---|---|
| `GET /notifications?page=1&limit=20` | `{ items, page, limit, total, totalPages }`; limit 1..100, page 1..1000000; geçersiz sayı 400. createdAt DESC, id DESC; tutarlı snapshot. |
| `GET /notifications/summary` | `{ unreadCount, urgentCount, pendingActions: [{ type, count, title, actionUrl }] }`; urgentCount = okunmamış ACIL. |
| `PATCH /notifications/:id/read` | `{ ok: true }`; idempotent. Olmayan veya başkasına ait id için 404. |
| `POST /notifications/read-all` | `{ ok: true, updatedCount }`; yalnız JWT kullanıcısının okunmamış kayıtları. |
| `GET /notification-settings` | `{ enabled, messages, forum, pool, announcements, lina }`; kayıt yoksa alanlar true. |
| `PATCH /notification-settings` | Aynı ayarlardan boolean kısmi gövde; bilinmeyen alan/boolean olmayan değer 400; kilit altında birleştirme. |

Örnek item:

```json
{"id":"notification-id","userId":"user-id","postId":null,"type":"OFFICE_JOIN_REQUEST","priority":"ACIL","level":"ACIL","title":"Yeni ofis başvurusu","body":"Ofisinize katılım başvurusu geldi.","message":"Ofisinize katılım başvurusu geldi.","actionUrl":"/office","isRead":false,"createdAt":"2026-10-30T00:00:00.000Z"}
```

eventKey ve iç teslim alanları liste/notify yanıtında dışarı açılmaz. Mevcut mobil `src/lib/notifications.ts` ve `src/app/notifications.tsx` message/level beklediği için message=body ve level=priority uyumluluk alanları birlikte döner. Eski Network kayıtları varsayılan NETWORK/BILGI ve actionUrl=null olarak listelenir.

Mevcut `/network/notifications` liste/sayaç/toplu okundu işlemleri NETWORK tipi veya postId içeren kayıtlara sınırlandı. Network ekranından toplu okundu yapmak genel mesaj/ofis/üyelik bildirimlerini temizlemez; genel merkez ise bütün tipleri listeler.

`pendingActions`: Ofis başvurusu gerçek PENDING durumundan sayılır; bildirim okunsa bile karar verilene kadar kalır, karar verilince listeden çıkar. Diğer tipler okunmamış ve actionUrl içeren kayıtların type+actionUrl gruplarıdır; bunlar ayrı bir iş tamamlama tablosu değildir. read-all bu grupları temizler.

Yeni sunucu ayarları kullanıcı hesabı düzeyindedir: `EPH_NOTIFICATION_SETTINGS_<userId>`. Eski sendToUser çağrıları da bunlara uyar. Native cihazdaki kategori tercihi ayrıca uygulanır; hesap veya cihaz kategorisi kapalıysa push gönderilmez, merkez kaydı kalır. Mobilin mevcut cihaz ayarı senkronu korunmuştur; yeni sunucu ayarı uçlarına mobil ekran bağlantısı bu görevin kapsamında değiştirilmedi.

## 5. Migration ve ticari eşik

Migration: `backend/prisma/migrations/20261030090000_eph38_notification_center/migration.sql` — **YAZILDI, ÇALIŞTIRILMADI**.

- Mevcut NetworkNotification'a type, priority, actionUrl, eventKey, pushStatus, pushAttempts, pushAttemptedAt ekler. Eski satırlar silinmez/değiştirilmez.
- eventKey benzersiz indeksi, priority kontrolü, kuyruk/sayaç indeksleri; olay sorguları için Message/AuditLog tarih ve MatchScanAttempt durum+kaynak+tarih indeksleri ekler.
- EPH38_NOTIFICATIONS_SINCE başlangıç kaydı ekler; var olan kaydı ezmez.
- LIMIT_PK_DUSUK_UYARI yoksa `{ "value": null }` ekler. Onaysız ticari sayısal değer uydurulmadı. Süper admin mevcut audit'li `PATCH /admin/system-settings/LIMIT_PK_DUSUK_UYARI` üzerinden pozitif tam sayı tanımlamalıdır. Tanımsızken LOW_PK gönderilmez ve açık log yazılır. Anahtar ticari ayar yönetimine eklendi; mevcut DB değeri varsa korunur.

Yeni backend'in çalışması için bu ek alanların DB'de bulunması gerekir. Uygulama/migration canlıya alınmadı. Migration SQL'i PostgreSQL üzerinde çalıştırılmadı; ham olay SQL'inin gerçek DB çalışması ve cihaz kabul testi henüz doğrulanmadı.

## 6. Çalıştırılmamış SELECT ve log komutları

Aşağıdakiler rapor için hazırlanmıştır; bu görevde çalıştırılmadı. Kimlik veya bağlantı sırrını rapora yazmadan mevcut yetkili psql oturumunda kullanılmalıdır.

### 1 — SUNUCU / PostgreSQL, mevcut altyapı

psql oturumunda `user_id` değişkenine incelenecek gerçek kullanıcının UUID'si verilmiş olmalıdır (`\set user_id ...`). Bu değişken JWT kullanıcısıyla aynı olmalıdır.

```sql
BEGIN TRANSACTION READ ONLY;

-- Tokenın kendisini çıkarmadan kayıt, sahiplik, platform ve cihaz tercihi.
SELECT "key", "valueJson"->>'userId' AS "userId",
       "valueJson"->>'platform' AS platform,
       "valueJson"->>'sound' AS sound,
       "valueJson"->'preferences' AS preferences, "createdAt", "updatedAt"
FROM "SystemSetting"
WHERE "key" LIKE 'EPH_NATIVE_PUSH_%'
  AND "valueJson"->>'userId' = :'user_id'
ORDER BY "updatedAt" DESC;

-- Makbuz var mı? JSON'un tamamı token içerir: SELECT valueJson yapmayın.
SELECT "key", "createdAt", "valueJson"->>'userId' AS "userId"
FROM "SystemSetting"
WHERE "key" LIKE 'EPH_PUSH_RECEIPT_%'
  AND "valueJson"->>'userId' = :'user_id'
ORDER BY "createdAt" DESC LIMIT 100;

SELECT "key", "valueJson", "updatedAt"
FROM "SystemSetting"
WHERE "key" IN ('EPH_NOTIFICATION_SETTINGS_' || :'user_id',
                'LIMIT_PK_DUSUK_UYARI', 'EPH38_NOTIFICATIONS_SINCE');

-- Tarayıcı aboneliği sayısı Expo token sayısı değildir.
SELECT count(*) AS browser_subscriptions FROM "PushSubscription" WHERE "userId" = :'user_id';

-- Olay gerçekten kaydolmuş mu? Mesaj gövdesini çıkarmadan son mesajlar.
SELECT m.id, m."conversationId", m."senderId", m."createdAt"
FROM "Message" m JOIN "ConversationParticipant" cp ON cp."conversationId" = m."conversationId"
WHERE cp."userId" = :'user_id' AND m."senderId" <> :'user_id'
ORDER BY m."createdAt" DESC LIMIT 20;

SELECT "id", "oncekiBakiye", "sonrakiBakiye", "islemTuru", "olusturulmaTarihi"
FROM "KontorHareketi" WHERE "kullaniciId" = :'user_id'
ORDER BY "olusturulmaTarihi" DESC LIMIT 20;

ROLLBACK;
```

### 2 — SUNUCU / PostgreSQL, yalnız migration uygulanmış şemada

```sql
BEGIN TRANSACTION READ ONLY;
SELECT "id", "type", "priority", "isRead", "actionUrl", "eventKey",
       "pushStatus", "pushAttempts", "pushAttemptedAt", "createdAt"
FROM "NetworkNotification" WHERE "userId" = :'user_id'
ORDER BY "createdAt" DESC LIMIT 100;

SELECT "pushStatus", count(*) FROM "NetworkNotification"
WHERE "userId" = :'user_id' GROUP BY "pushStatus";
ROLLBACK;
```

### 3 — SUNUCU / loglar, restart yok

```bash
pm2 list
pm2 logs --lines 1000 --nostream | grep -A20 -B2 -E 'EPH_PUSH|EPH_NOTIFICATION'
```

Canlı PM2 process listesi bu görevde okunmadı; komut uygulama adına dair varsayım yapmadan bildirim loglarını süzer. Yeni kodun loglarını ancak bu sürüm ayrıca yayınlandıktan sonra gösterebilir.

Teşhis sırası:

1. Token SELECT'i boşsa gerçek cihaz için subscribe kaydı kanıtlanamamıştır. Mobil izin, aktif oturum, subscribe yanıtı ve uygulama yeniden kaydı incelenir. Otomatik kayıt hatalarının mobilde yutulduğu unutulmamalıdır.
2. Kayıt var ama cihaz kategorisi/hesap ayarı false ise atlama beklenir. Test ucu cihaz tercihini bilerek atlayabilir; normal olay testi de gerekir.
3. `phase=send` satırında deviceCount=0 ise kullanıcıya bağlı kayıt bulunmamıştır. skippedCount>0 cihaz tercihine bağlı atlamayı gösterir. Olaydan sonra hiç send yoksa kaynak olay/kuyruk durumu ve EPH_NOTIFICATION_EVENT/JOB logu incelenir.
4. `phase=ticket`: httpStatus, status, code, ticketId alınır. HTTP başarılı olsa bile Expo data.status=error başarısızdır. DeviceNotRegistered geldiğinde yalnız ilgili kullanıcıya ait cihaz kaydı silinir.
5. `phase=receipt`: bilet kimliğiyle eşleştirilir. Bilet kabulü ile makbuz sonucu ayrıdır. Makbuz hatası yokken cihazda görünmüyorsa işletim sistemi izni, Android kanal ayarı ve cihaz davranışı ayrıca yakalanır; backend build/Jest bunları kanıtlamaz.

## 7. Değişen dosyalar ve yedekler

- `backend/src/notifications/`: servis, controller'lar, ayar eşlemesi, olay toplayıcı, sınırlı cron başlatıcısı, modül ve 2 Jest dosyası — yeni.
- `backend/prisma/schema.prisma` ve yukarıdaki yeni migration.
- `backend/src/app.module.ts`.
- `backend/src/push/{native-push.service.ts,push.service.ts,push.module.ts}`.
- `backend/src/messages/{messages.service.ts,messages.module.ts}`.
- `backend/src/network/network.service.ts`.
- `backend/src/office/{office-management.service.ts,office.module.ts,grup5_6-verification.spec.ts}`.
- `backend/src/project-sales/{project-sales-launch.service.ts,project-sales.module.ts}`.
- `backend/src/pricing/commercial-costs.ts`.
- `backend/src/auth/super-admin-access.spec.ts`.
- `backend/package.json`, `backend/package-lock.json`: zaten kurulu cron 4.4.0 açık bağımlılık yapıldı; lock güncellemesi offline/ignore-scripts ile yapıldı.
- `docs/ai/RAPOR_EPH38.md` — açıkça istenen rapor.

Değiştirilen mevcut dosyaların tamamının yanında `.bak-eph38` yedeği var. EPH-37'nin ofis servisindeki başlangıç değişiklikleri yedeğe dahil edilip korundu; kullanıcı çakışma sorusuna “Evet, bitti; mevcut değişiklikleri koruyarak ilerle” yanıtı verdi. `office-dashboard.spec.ts` görev öncesinden değişikti; bu görevde değiştirilmedi. Mobil kaynak değiştirilmedi. Commit atılmadı.

## 8. Doğrulanan

1. **POWERSHELL — D:\Projects\SM\backend**

   `npm run build` → **Exit 0**. `prisma generate` başarıyla tamamlandı (Prisma Client 6.19.3); `nest build` TypeScript hatası olmadan bitti. Bu komut migration çalıştırmaz.

2. **POWERSHELL — D:\Projects\SM\backend**

   ```powershell
   npm test -- --runInBand notifications auth/super-admin-access.spec.ts content-safety.service.spec.ts messages-network-access.spec.ts office-management.spec.ts office-dashboard.spec.ts office-profile.spec.ts grup5_6-verification.spec.ts network-contact-access.spec.ts project-sales-release.spec.ts project-sales-revision.spec.ts commercial-costs.spec.ts pricing.service.spec.ts
   ```

   **Exit 0**:

   ```text
   Test Suites: 14 passed, 14 total
   Tests:       304 passed, 304 total
   Snapshots:   0 total
   ```

   Bildirim kaydı/ayar kapalıyken kayıt korunması, dış URL reddi, atomik sahiplenme, 3. denemede sonlandırma, sahiplik filtreleri, sayfalama, gerçek bekleyen ofis aksiyonu, transaction bildirimleri, başvuru onay/red, hata halinde rollback, değişmeyen ofis yetkisine tekrar bildirim üretmeme, ilk proje havuz yayını/tekrar yayını, 100'den fazla üyelik alıcısı, İstanbul gün sınırı, dört sınırlı cron'un DI başlatılması/kapanışı, Expo HTTP hata kodu/token gizleme ve mevcut mesaj/mahremiyet/ticari davranışlar kapsandı. Testte bilerek üretilen offline/başarısız kaynak WARN/ERROR logları beklenen senaryolardır.

3. **POWERSHELL — D:\Projects\SM\backend**

   `git -c core.safecrlf=false diff --check` → **Exit 0**.

4. **POWERSHELL — D:\Projects\SM\backend**

   `npx --no-install prisma validate` → **Exit 0**, `The schema at prisma is valid`.
   Mevcut 17 değiştirilen dosyanın `.bak-eph38` varlık kontrolü → **Exit 0**, `EPH38_BACKUPS_OK: 17/17`.

## 9. Kalan

Canlı DB/sunucu ve cihaz kabulü yapılmadı; EPH-02'nin gerçek token/bilet/makbuz zinciri henüz yok. Migration uygulanmadı; LOW_PK için süper adminin DB eşiği tanımlaması gerekir. Mobil test ekranındaki yerel bildirimin uzak push başarısı gibi sunulması bu backend kapsamı dışında kaldı.
