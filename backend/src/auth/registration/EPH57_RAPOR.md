# EPH-57 — Kayıt belgelerinin kalıcılığı

Tarih: 2026-10-30. Canlı DB yalnız SELECT ile incelendi; transaction `READ ONLY` idi ve ROLLBACK ile kapandı. Supabase'de yalnız listeleme yapıldı. Testler repository/storage double'larıyla çalıştı. Mobil, Lina, şema, paket ve canlı veriler değiştirilmedi. Commit/deploy yok.

## Son hesap için kanıt ve teşhis sınırı

Önceki raporda “07:55 UTC” denilen en son EMLAKCI hesabı yeniden bulundu. Zaman düzeltmesi: PostgreSQL kolonu `timestamp without time zone`, bağlantı timezone'u GMT, ham `createdAt` **2026-10-30 10:55:29.720**. Önceki pg/Windows Date dönüşümü bunu 3 saat geriye taşıdı; önceki UTC etiketi güvenilir değildi. Aşağıdaki tarihler timezone dönüşümü yapılmadan ham DB değeri olarak verildi.

- Kullanıcı maskesi `*** ***` (ad/soyad boş), EMLAKCI, `REVIEW_REQUIRED`, `profileCompleted=false`.
- Document satırı: **0**.
- Eşleşen PendingRegistration: ADAY, COMPLETED; `professionalDocumentUrl` boş. Oluşma 2026-10-30 10:54:41.816, tamamlanma 10:55:29.811.
- Supabase `documents/<userId>/` ve `documents/pending-registration/<pendingId>/` listeleri: **0 dosya**. Listeleme backend service-role ile, sayfalama kullanılarak yapıldı; anahtar ve dosya adları rapora yazılmadı.
- Aynı bucket'ın tüm alt klasörleri de listelendi: **23 dosya, 16 klasör; storage created_at değeri 2026-10-30 olan dosya sayısı 0**. Silinmiş bir eski PendingRegistration id'sinin bu hesaba ait olduğu kanıtlanamaz; bilinen kullanıcı/oturum klasörleri boş.

**Bu son kullanıcı için dosyanın sunucuya başarıyla yüklendiği, ardından kaybolduğu kanıtlanmadı.** Mevcut mobilde yalnız dosya seçmek HTTP yüklemesi değildir. İstek/log veya cihaz kanıtı olmadığından “kesin olarak şu tıklamada kayboldu” denemez. Bu görev, aşağıda kaynakta saptanan ve izole testte doğrulanan gerçek backend kayıp yollarını düzeltti; mevcut olmayan dosyayı veya DB satırını üretmedi.

## Uçtan uca mevcut akış

| Adım | Mobil | Backend / kalıcı sonuç |
|---|---|---|
| Kayıt başlangıcı | `src/app/register.tsx:76-83`, yalnız email+phone ile POST `/auth/register` | `RegistrationV2Service.start`, şifresiz akışta ADAY PendingRegistration oluşturur; belge gönderilmez |
| Telefon/e-posta sonrası hesap | `src/components/RegistrationOtp.tsx:244-260`, POST `/auth/complete-registration` ve session kaydı | `registration-v2.service.ts:362` PROFILE_ONBOARDING hesabını oluşturur; meslek henüz bilinmez |
| Meslek/profil kurulumu | `src/app/profile.tsx:545-557`, POST `/profile/onboarding` | `ProfileService.completeInitialProfile`, seçilen meslek ve bilgiler kaydedilir |
| Dosya seçimi | `src/app/profile.tsx:800-832`, DocumentPicker; `setSelectedDocuments` | Yalnız cihaz belleği/cache, HTTP yok |
| Gerçek yükleme | `src/app/profile.tsx:842-862`, önce PATCH `/profile` ile companyName, sonra multipart POST `/profile/documents`, alanlar `type` ve `file` | `src/profile/profile.controller.ts:147-160`, Multer memoryStorage, max 5 MB; `ProfileService.uploadDocument` |
| Storage + DB | — | `profile.service.ts` içinde uploadFile(`documents`, `<userId>/<type>_<time>.<ext>`), ardından transaction'da Document create/update ve PENDING durumu; DB başarısızlığı istemciye hata döner |
| Başarı | `src/app/profile.tsx:863-869`, seçim ancak POST başarıyla bitince temizlenir; profil yeniden okunur | Document satırı admin listesinde görünür |

`src/lib/api.ts:30-31,62-63,122` FormData'yı JSON'a çevirmeden gönderir ve multipart Content-Type sınırını fetch'e bırakır. Güncel `register.tsx`/RegistrationOtp kayıt belgesi ucunu çağırmaz.

Eski/uyumlu kayıt yolu ayrıca vardır: POST `/auth/register/professional-document`, `src/auth/auth.controller.ts:51-65`. `RegistrationV2Service.uploadProfessionalDocument` dosyayı Supabase `documents/pending-registration/<id>/...` yoluna yükler ve PendingRegistration URL/name/mime alanlarını yazar. LEGACY tamamlamada gerçek Document satırı oluşturulur; yeni akışta belge türü ancak Profil meslek seçimiyle belirlenir.

## Testle doğrulanan backend kök nedenleri ve düzeltmeler

1. **Yeniden kayıt oturumu dosya referansını siliyordu.** `PendingRegistrationService.createOrReplace` önce eşleşen kayıtları `deleteMany`, sonra boş belge alanlarıyla `create` yapıyordu. Storage nesnesi kalsa bile tek DB referansı siliniyordu. Artık değiştirme transaction içinde; aynı email+phone ve aynı meslek türünde URL/name/mime korunur, OTP doğrulamaları yeni oturumda sıfırlanır. Farklı kimlik eşleşmesi veya belge varken meslek değişimi eski dosyayı silmek yerine açık hata verir. INSERT hatası eski oturumu geri alır.
2. **PROFILE_ONBOARDING kayıt belgesini Document'a aktarmıyordu.** Bu akış ADAY hesabını oluşturur; meslek bilinmediğinden kayıt anında tür uydurulmaması doğruydu. Fakat `ProfileService.completeInitialProfile` meslek belli olduğunda bile PendingRegistration belgesini okumuyordu. Artık aynı email+phone'a ait, telefon/e-postası doğrulanmış ve tamamlanmış oturum belgesi profil transaction'ında Document'a aktarılır. Danışman MYK, ofis YETKI, müteahhit/firma YAMBIS olur. Aynı storage referansı için ikinci Document oluşturulmaz. Belge INSERT hatasında rol/şifre yazımı geri alınır, dosya referansı tekrar denemeye kalır. Belgesi olmayan akışta sahte Document üretilmez.
3. **LEGACY User ve Document ayrı yazılıyordu.** Document INSERT hatasında User tek başına kalabiliyor, tekrar tamamlamada duplicate kullanıcı hatası çıkabiliyordu. `completeRegistration` artık PendingRegistration satır kilidiyle tek transaction'da User, Document, capability/referral ve tamamlanma durumunu yazar. Hata halinde hepsi geri alınır; ikinci başarılı tamamlama mükerrer kayıt oluşturmaz.
4. LEGACY danışman için belge türü her zaman YETKI seçiliyordu. Meslek/ofis ayrımına göre MYK/YETKI eşlemesi düzeltildi.

Kritik üretim dosyalarının değişiklikten önce `.bak-eph57` yedeği alındı. Mevcut `profile-company.spec.ts` transaction double'ına yeni pending belge okuması eklendi; test beklentileri gevşetilmedi.

## Son 10 kayıt — Document bulunan hesap oranı %50

Tarihler ham DB değeridir; Document sayısı mevcut snapshot'ı gösterir. Eski/manuel hesaplarda Document olmaması otomatik olarak hata değildir.

| # | Maskeli ad | Rol | Kayıt tarihi | Mesleki durum | Document |
|---|---|---|---|---|---:|
| 1 | *** *** | EMLAKCI | 2026-10-30 10:55:29 | REVIEW_REQUIRED | 0 |
| 2 | M*** D*** | EMLAKCI | 2026-10-30 07:52:35 | null | 0 |
| 3 | S*** K*** | EMLAKCI | 2026-10-29 06:19:19 | VERIFIED | 1 |
| 4 | S*** Ö*** | MUTEAHHIT | 2026-10-25 12:51:15 | VERIFIED | 2 |
| 5 | F*** Ç*** | EMLAKCI | 2026-10-21 08:45:56 | PENDING | 0 |
| 6 | S*** Ö*** | EMLAKCI | 2026-10-17 20:23:31 | PENDING | 0 |
| 7 | M*** M*** | EMLAKCI | 2026-10-01 13:06:14 | VERIFIED | 2 |
| 8 | U*** K*** | MUTEAHHIT | 2026-10-01 12:55:17 | VERIFIED | 2 |
| 9 | K*** K*** | EMLAKCI | 2026-09-30 17:27:14 | VERIFIED | 1 |
| 10 | O*** Ö*** | EMLAKCI | 2026-09-21 17:50:00 | null | 0 |

- Son 10: **5 hesapta Document var / 5 hesapta yok**.
- Tüm profesyonel roller: 14 hesap; VERIFIED 6 hesabın hepsinde Document var. null mesleki durumdaki 5 hesabın hiç birinde yok. PENDING 2 + REVIEW_REQUIRED 1 hesabın da Document kaydı yok.
- **İncelenecek doğrulama bekleyen aday: 3 hesap. Kanıtlanmış başarılı-yükleme-sonrası kayıp kullanıcı sayısı: belirlenemedi.** Bu üç hesabın bekleme nedeninin dosya kaybı olduğu iddia edilmez.
- En erken belgeli olmayan PENDING hesap **2026-10-17 20:23:31**; bu, mevcut veride gözlenen en erken yeni-doğrulama aday tarihidir. null durumlu eski belgelenmemiş hesaplar 2026-09-14'e kadar gidiyor ve aynı hata grubuna sayılmadı.
- PROFILE_ONBOARDING kodu/ilk profil akışı Git geçmişinde 2026-10-28 tarihli `953bf0e3` canlıdan eşitleme commit'inde görünüyor. Bu bir üretime ilk çıkış tarihi değildir. Sorunun kesin başladığı tarih log/deploy geçmişi olmadan saptanamaz.

## Değişen / yeni dosyalar

- `src/auth/registration/pending-registration.service.ts`
- `src/auth/registration/registration-v2.service.ts`
- `src/profile/profile.service.ts`
- `src/profile/profile-company.spec.ts`
- `src/auth/registration/registration-documents.spec.ts` (yeni)
- `src/auth/registration/EPH57_RAPOR.md` (yeni)
- Düzenlenen dört dosyanın `.bak-eph57` yedekleri.

## Doğrulama

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/auth/registration/registration-documents.spec.ts src/profile/profile-company.spec.ts src/profile/profile.service.spec.ts src/profile/profile.controller.spec.ts src/auth/auth.controller.spec.ts
```

Sonuç: **5 suite / 46 test PASS, Exit 0**. Gerçek DB/storage/OTP/LLM çağrısı yapılmadı. Yeni testler dosya koruma, kimlik çakışması, meslek değişimi, storage hatası, profile belge aktarımı, doğru belge tipi, idempotency ve transaction rollback senaryolarını içerir. Bu mock transaction kanıtıdır; gerçek DB concurrency veya cihaz kabulü değildir.

`npm run build`: EPH-56 karşılaştırma dosyaları `D:\Downloads\deploy_eph56` dışına taşındıktan sonra tekrar çalıştırıldı. Prisma Client oluşturuldu, Nest build tamamlandı; **Exit 0**. `tsconfig` değişmedi.

## EPH-56 canlı karşılaştırma paketi

`D:\Downloads\deploy_eph56\` altında kullanıcı tarafından taşınmış EPH-56 karşılaştırma paketi:

- `admin.controller.ts`
- `admin.service.ts`
- `jwt-auth.guard.ts`

Üç kopya kaynak son halleriyle SHA256 eşleşti. İçerikleri değiştirilmedi; canlı dosyalarla karşılaştırma ve deploy yapılmadı. Build öncesinde klasör backend dışına taşındı.

## Gereken mobil değişiklikler — yalnız dosya listesi

- `src/app/profile.tsx`

## Kalan doğrulama

Son kullanıcıda gerçek POST `/profile/documents` isteğinin HTTP yanıtı/cihaz kaydı olmadan o hesaba özgü olayın tam kayıp adımı kanıtlanamaz. Storage'da bulunmayan dosyaya canlı Document/backfill yazılmadı. Backend `.env` ile erişilen DB ve storage incelendi; Natro'nun aynı bağlantıları kullandığı canlı sunucudan doğrulanmadı.

Salt okunur listeleme yöntemi [Supabase Storage list belgeleri](https://supabase.com/docs/reference/javascript/storage-from-list) ile kontrol edildi; listeleme mutasyon içermez.
