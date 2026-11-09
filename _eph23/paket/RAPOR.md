# EPH-23 — Premium Müşteri Sunumu

Tarih: 01.11.2026. Yerel uygulama tamamlandı. Deploy, PM2 işlemi, migration, canlı DB bağlantısı ve ücretli AI çağrısı yapılmadı.

## Değişen dosyalar

1. `D:\Projects\SM\backend\src\project-sales\project-sales-launch.service.ts`
   - Premium sunum verileri, tip bazlı stok/alan/fiyat aralıkları, donatı ve sosyal alanlar, fotoğraf galerisi, konum ve inşaat durumu.
   - İmzalı yeni bağlantıda paylaşan kullanıcı kimliği; herkese açık yanıtta yalnız bu kişinin iletişim kartı.
   - AI üretimi, veri özetiyle önbellek ve güvenli şablon dönüşü.
   - Kapı/kat bilgisinin bölüm başlığından ve özel bilgi içerebilen yayın hazırlık uyarılarının public yanıttan çıkarılması. Yetkili mobil son kontrol ekranının uyarıları korunur.
2. `D:\Projects\SM\backend\src\lina\lina.module.ts`
   - Mevcut `LinaOpenAiClientService` dışa aktarıldı; ProjectSalesModule zaten LinaModule import ediyor. Yeni sağlayıcı veya API anahtarı yok.
3. `D:\Projects\SM\frontend\src\app\proje-sunum\[token]\page.tsx`
   - Açık zemin, lacivert/mavi, ortalı başlıklar; sistem fontu, en az 12.5pt yazı, en az 44px etkileşim alanları.
   - Kapak, konum/proje metinleri, Haritada Aç, daire/bölüm tablosu, ikonlu donatılar, tembel yüklenen galeri, tam ekran dialog, kişi/ofis kartı, Ara/WhatsApp.
   - Dar ekranda tablo kendi alanında yatay kaydırılır. Galeri 2 sütun, geniş ekranda 3 sütun; sayaçlar dar ekranda 2×2.
   - Dialog Escape ile kapanır; odak yönetimi native dialog ile sağlanır. Fotoğraflar dışında yeni kütüphane/harita servisi yüklenmez.
4. `D:\Projects\SM\frontend\src\components\EPHMobileShell.tsx`
   - Yalnız `/proje-sunum/` rotası oturum gerektiren web kabuğundan ayrıldı. Mevcut kabuk bu rotayı girişe yönlendiriyordu.
5. `D:\Projects\eph-mobile-final\src\app\project-sales\[id]\launch.tsx`
   - Yalnız sunum bağlantısı POST isteğine 150000ms bekleme süresi verildi. Mevcut genel 25000ms sınır ilk AI üretiminden önce isteği kesebilirdi. Diğer isteklerin süreleri değişmedi.

Yeni uygulama kaynak dosyası eklenmedi. Prisma şeması değişmedi; migration/SQL gerekmiyor.

EPH-19/20/22 başlangıç değişiklikleri korunmuştur. `project-sales.module.ts`, `project-media-single.service.ts`, `project-media-single.controller.ts` değiştirilmedi. Mobil launch dosyasındaki önceki EPH-22 değişiklikleri de korunmuştur. Yamalar Git HEAD'e değil, görev öncesindeki güncel çalışma kopyasının yedeklerine göre üretildi.

## Yedek ve teslim dosyaları

Her mevcut dosya düzenlenmeden önce aşağıdaki köke, göreli dizin yapısıyla `.bak` olarak kopyalandı:

`D:\Projects\SM\_eph23\yedek\`

- `backend\src\project-sales\project-sales-launch.service.ts.bak`
- `backend\src\lina\lina.module.ts.bak`
- `frontend\src\app\proje-sunum\[token]\page.tsx.bak`
- `frontend\src\components\EPHMobileShell.tsx.bak`
- `mobile\src\app\project-sales\[id]\launch.tsx.bak`

Paket: `D:\Projects\SM\_eph23\paket\`

- `eph23.patch`: backend/src köküne göre; `lina/…` ve `project-sales/…` yolları.
- `eph23-frontend.patch`: frontend köküne göre; `src/…` yolları.
- `eph23-mobile.patch`: mobil köküne göre; yalnız istek bekleme süresi değişikliği.
- `manifest.json`: düzenlenen dosyaların görev öncesi ve son SHA256 değerleri.
- `tests.txt`: yerel mock doğrulama çıktısı.
- `presentation-fixture.json`: sentetik proje ile üretilmiş örnek sunum yanıtı. Gerçek kullanıcı/proje verisi değildir.
- `RAPOR.md`: bu rapor.

Ek yerel yardımcılar: `_eph23\verify.cjs`, `_eph23\visual-check.cjs`, `_eph23\make-patches.py`. Bunlar deploy kaynakları değildir. `_eph23\check\` yalnız yama doğrulama kopyalarıdır.

## AI metni ve önbellek

Mevcut Lina Responses istemcisi ve onun mevcut model ayarları kullanılır. AI yalnız yetkili `createPresentationShareLink()` akışında, ilgili veri sürümü için önbellek yoksa çağrılır. `getLaunchCenter()` ve public `getPresentationByToken()` AI çağırmaz.

Uydurma bilgiyi yalnız prompt'a bırakmamak için metin üretimi kontrollüdür: backend, il/ilçe/mahalle, proje adı, gerçek blok/kat seviyeleri, tip/adet/net-brüt alan, kayıtlı donatılar, müşteri görünür sosyal alanlar, teslim ve inşaat durumundan doğrulanmış Türkçe cümleler hazırlar. Lina bu cümleleri 2–3 paragrafa düzenler; serbest yeni iddia yazamaz. Modelden yalnız cümle indeksleri alınır ve tüm indekslerin geçerli, tekrarsız ve eksiksiz olduğu doğrulanır. Metne mesafe, ulaşım avantajı, değer artışı, yakın tesis veya getiri garantisi eklenemez. Konum metni genel değerlendirme dili kullanır; dış kaynaklardan doğrulanmamış bölge özelliği söylemez.

Kalıcı kayıt: `SystemSetting.key = EPH23_PRESENTATION_<projectId>`; `valueJson` içinde `fingerprint`, `location`, `project`, `source` bulunur. `source` başarılı AI düzenlemesinde `lina`, hata/eksik sağlayıcı/geçersiz yanıtta `template` olur. Şablon dönüşü de kaydedilir; aynı veride tekrar paylaşmak yeni AI çağrısı oluşturmaz. Aynı servis örneğindeki eşzamanlı üretimler tek Promise üzerinden birleştirilir.

Fingerprint, sunum metnine giren izinli veriler ve metin sürümünden SHA256 ile üretilir. Bu veriler değişince eski metin gösterilmez: public açılış güncel veriden şablon gösterir; sonraki yetkili “Müşteri Sunumu Oluştur / Paylaş” işlemi yeni AI sürümünü üretip aynı anahtarı günceller. Fiyat gibi metne girmeyen bilgiler tabloda her zaman güncel sorgudan gelir; gereksiz AI üretimine yol açmaz. DB önbellek okuma/yazma hatası da metin açısından şablona döner.

## Gizlilik ve eski bağlantılar

- AI girdisine ve public JSON'a tapu sahibi, açık adres, ada/parsel, kapı/kat etiketi veya proje yetkilisinin özel iletişimi aktarılmaz.
- Yayın hazırlık kontrolü private son kontrol akışında kalır; public yanıta gönderilmez.
- Yeni HMAC imzası paylaşan kullanıcı kimliğini de kapsar. Kart için kullanıcıdan yalnız ad/soyad/telefon/fotoğraf ve aktif ofis ilişkisi okunur. Ofis logosu mevcut `EPH_OFFICE_PROFILE_<officeId>` kaydından alınır; ofisin özel iletişimi kişininkinin yerine konmaz.
- Ofissiz kullanıcıda yalnız kişi kartı vardır. Aktif ofis sahibi ilişkisi de desteklenir.
- Eski dört parçalı token kabul edilir; paylaşan kimliği bilinmediği için kişi kartı gösterilmez. Kart için yeni bağlantı oluşturulmalıdır; proje sahibinin iletişimi tahmin edilmez.
- Mevcut hedefli stok filtresi korunur. Hiç genel sunuma açık bölüm yoksa bağlantı mevcut davranış gibi 404 döner.
- Galeri yalnız proje genel, konut tip ve ticari tip paketlerinden gelir; OTHER paketler dahil edilmez. Bilinen video MIME türleri galeri fotoğraf sorgusuna dahil edilmez.

## Örnek ekran açıklaması

Bu açıklama kaynak kodu ve sentetik `presentation-fixture.json` verisine dayanır; tarayıcı ekran görüntüsü değildir.

Üstte geniş proje genel fotoğrafı; altında ortalı “Örnek Yaşam Projesi”, “Denizli / Merkezefendi / Örnek Mahallesi” ve “%65 tamamlandı · Teslim Haziran 2027” bulunur. Dört stok sayacından sonra iki paragraflı “Yaşamın konumu” ve Haritada Aç bağlantısı gelir. Ardından gerçek proje verilerinden oluşturulan tanıtım paragrafları yer alır.

Tabloda örnek 2+1 tipinin 3 adedi, net 90–100m², brüt 110–120m² ve satışta 2 adedi görünür. TRY ve USD fiyatları ayrı gösterilir; fiyat girilmeyen bölüm için “Fiyat için arayın” yazılır. Otopark/havuz ikonlu rozetleri ve dokunularak tam ekran açılan fotoğraflar gelir. Son kartta “Paylaşan Danışman”, “Örnek Ofis”, varsa fotoğraf/logo, kişinin telefonu ve Ara/WhatsApp bulunur. Telefon ve WhatsApp bağlantıları yalnız kullanıcı dokununca açılır; testte gerçek arama veya mesaj gönderilmedi.

## Doğrulama çıktıları

1. 🟦POWERSHELL — `D:\Projects\SM\backend`: `npm run build` — **Exit code 0** (son backend değişikliğinden sonra).

```text
> backend@0.0.1 build
> prisma generate && nest build
Loaded Prisma config from prisma.config.ts.
Prisma config detected, skipping environment variable loading.
Prisma schema loaded from prisma
Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client
[komut tamamlandı: exit_code 0]
```

2. 🟦POWERSHELL — `D:\Projects\SM\frontend`: `npm run build` — **Exit code 0** (son font düzeltmesinden sonra).

```text
> frontend@0.1.0 build
> next build --webpack
Next.js 16.3.0 (webpack)
Compiled successfully in 5.8s
Finished TypeScript in 2.6s
Generating static pages using 11 workers (53/53)
Generating static pages ... in 1279ms
Finalizing page optimization ...
Collecting build traces ...
ƒ /proje-sunum/[token]
[komut tamamlandı: exit_code 0]
```

Mevcut uyarı: birden fazla lockfile nedeniyle Next.js çalışma kökünü SM olarak çıkarıyor. Yapılandırma kapsam dışında bırakıldı. İlk build, 06.08.2026 tarihli `.next/dev/types/validator.ts` dosyasının artık bulunmayan `notifications/page.js` referansı nedeniyle Exit 1 verdi. Yalnız üretilmiş `.next/dev/types` klasörü `_eph23\yedek\generated-dev-types` altına taşındı; tsconfig veya notifications kaynağı değiştirilmedi. Sonraki iki frontend build Exit 0 verdi.

3. 🟦POWERSHELL — `D:\Projects\eph-mobile-final`: `npm run typecheck` — **Exit code 0** (istek süresi değişikliğinden sonra).

```text
> eph-mobile@1.0.24 typecheck
> tsc --noEmit
[komut tamamlandı: exit_code 0; hata çıktısı yok]
```

4. 🟦POWERSHELL — `node D:\Projects\SM\_eph23\verify.cjs` — **Exit code 0; 11/11 PASS**. Ayrıntılı çıktı `tests.txt` içinde. Testler derlenmiş gerçek servisi sentetik Prisma/AI/audience bağımlılıklarıyla çalıştırır. Önizlemede/public açılışta AI yok; paylaşım önbelleği; özel bilgi sızıntısı; çoklu para birimi; değişen veride yenileme; AI hatası; eski token; değiştirilmiş/süresi dolmuş token; ofissiz kullanıcı; hedefli stok filtresi; DB önbellek hatası kontrol edildi. Yalnız sentetik imza anahtarı kullanıldı; gerçek token/oturum üretilmedi.

5. 🟦POWERSHELL — `git diff --check` (değişen kaynak dosyaları): **Exit code 0**. Satır sonu dönüşümü uyarıları hata değildir.

6. 🟦POWERSHELL — üç yama için başlangıç yedeklerine karşı `git apply --check --ignore-whitespace`: **Exit code 0**. Kontrol kopyaları ayrıca CRLF'ye çevrilip üçü tekrar doğrulandı: **Exit code 0**. Son çalışma dosyalarında ters yama kontrolü de üçü için **Exit code 0**.

7. 🟦POWERSHELL — Impeccable mekanik dedektör: `[]`, **Exit code 0** (arayüzün ilk tamamlanan sürümünde). Bu sonuç görsel/cihaz kabulü değildir.

## Yapılamayan doğrulama ve sınırlar

Chrome otomasyonunda `browserType.launch: spawn EPERM` alındı. Alternatif tarayıcı aracında “The browser access host is unavailable” alındı. Bu nedenle mobil/geniş ekran görüntüsü, gerçek tarayıcı taşma ve klavye etkileşimi kabulü verilmedi. `_eph23\visual-check.cjs` bu kontroller için hazırlanmıştır; çalıştırılamadığı için PASS sayılmadı. Canlı AI yanıtı, canlı DB/API, sunucu, gerçek cihaz, gerçek arama ve WhatsApp gönderimi doğrulanmadı.

AI düzenlemesi serbest reklam metni icat etmez; doğrulanmış cümle havuzunu kullanır. Bu, doğruluk sınırını bilinçli olarak korur. Süreç içi eşzamanlı istekler birleşir; farklı backend süreçlerinin aynı anda ilk üretimi istemesi için dağıtık kilit eklenmedi.

## Deploy önerisi — yalnız kullanıcı/operatör için, çalıştırılmadı

Yöntem kaynağı: `D:\Projects\eph-mobile-final\.agents\skills\eph-backend-deploy\SKILL.md`. Sunucu yolları bu yerel runbook'tandır; bu görevde sunucuya bağlanılarak doğrulanmadı. Frontend'in gerçek sunucu dizini ve süreç adı ayrıca operatörce doğrulanmalıdır. Aşağıdaki adımlar canlı deploy onayı yerine geçmez.

1. 🟦POWERSHELL — Yama ve raporları kendi belirlediğiniz sunucu hazırlık dizinine aktarın. Backend yaması `backend/src`, frontend yaması `frontend`, mobil yaması mobil repo köküne göredir. Yamalar **EPH-19/20/22 bulunan güncel başlangıç hali** içindir; `git pull` veya eski HEAD'e reset yapılmamalıdır.
2. 🖥️SUNUCU — `/var/www/eph/backend` kaynağını, daha önce var olmayan `/var/www/eph/EPH23_BUILD` gibi ayrı bir build kopyasına alın. Frontend'i de gerçek çalışma dizininden ayrı build kopyasına alın. Çalışan kaynaklar ve mevcut `dist`/`.next` çıktıları için zaman damgalı geri dönüş yedeği hazırlayın.
3. 🖥️SUNUCU — Önce yalnız build kopyalarında yamaları `--check --ignore-whitespace` ile kontrol edin; bir dosya başlangıç haliyle uyuşmazsa durun. Backend/src kökünde `eph23.patch`, frontend kökünde `eph23-frontend.patch` uygulanmalıdır. Git kökü farklıysa göreli `--directory` önekini doğru köke göre ayarlayın. CRLF kontrolü yerelde yapıldı; sunucu kopyasında da dry-run zorunludur.
4. 🖥️SUNUCU — Backend build kopyasında `npm run build`, frontend build kopyasında `npm run build` çalıştırın. İkisi Exit 0 olmadan canlı dosya değiştirmeyin. Şema/migration veya yeni API anahtarı işlemi yoktur. Var olan Lina model/anahtar ayarları kullanılır; sırları çıktıya yazdırmayın.
5. 🖥️SUNUCU — Operatörün canlıya alma onayından sonra doğrulanmış backend kaynaklarını ve build kopyasının `dist/` çıktısını mevcut runbook yöntemiyle yayınlayın. Frontend kaynakları ve eşleşen `.next` çıktısını mevcut frontend dağıtım yöntemiyle yayınlayın; çalışan frontend'in süreç yöneticisi bu görevde doğrulanmadı. Frontend'in istemci JS'i ve sunucu çıktısı aynı build'den olmalıdır.
6. 🖥️SUNUCU — Yalnız operatörün canlıya alma onayıyla backend `eph-backend` sürecini, frontend'i kendi doğrulanmış süreç adıyla yeniden başlatın. Logları inceleyin. İlk AI isteği uzun sürebileceği için ters proxy isteği mevcut Lina timeout'u boyunca taşımalıdır. Sunucu timeout yapılandırması bu görevde değiştirilmedi.
7. 🟦POWERSHELL / MOBİL — `eph23-mobile.patch` yalnız sunum isteği süresini uzatır. Mevcut mobil dağıtım sürecinizle sonraki uygun güncellemede yayınlanmalıdır. Bu görevde commit, AAB, OTA veya mağaza işlemi yapılmadı. Eski mobilde 25sn sınırı devam edeceğinden ilk AI üretimi uzun sürerse istemci timeout riski vardır; önbellek oluştuğunda sonraki paylaşım AI beklemez.
8. 🖥️SUNUCU / TARAYICI — Kullanıcının sağladığı yetkili test hesabıyla yeni bağlantı oluşturun. Oturumsuz pencerede kapak, konum/harita, metinler, tip/adet/alan/fiyat, donatılar, galeri, kişi/ofis kartı ve Türkçe karakterleri inceleyin. Ağ yanıtında özel alanların bulunmadığını; tekrar açılışın AI çağırmadığını; proje verisi değişikliğinden sonra yeni paylaşımın güncel metni verdiğini kontrol edin. Eski token'da kişi kartı olmaması beklenir.
9. 🖥️SUNUCU — Geri alma gerekirse birlikte yedeklenen backend kaynakları+`dist`, frontend kaynakları+`.next` sürümünü geri yükleyin; operatör onayıyla ilgili süreçleri yeniden başlatıp logları kontrol edin. Ters yama da yerelde doğrulanmıştır ancak sunucuda daha sonra yapılmış değişiklik varsa önce tekrar dry-run gerekir. Şema geri alma işlemi yoktur.
