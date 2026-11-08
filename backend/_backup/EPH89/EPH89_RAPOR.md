EPH-89 — yerel backend sonucu

Erişim: kişisel geçerli üyelik öncelikli; aksi halde aktif sahip/üye ofisinin OFFICE_SUBSCRIPTION_<officeId> aboneliği ve OFFICE_MEMBERSHIP_PACKAGES aktif paket kaydı ile OFFICE_PACKAGE. SUPER_ADMIN her zaman izinli. Ofis paketi uygun değilse önceki kişisel üyelik mesajı korunur.

Ortak yardımcıyı kullanan yollar:
- GET /units/pool/wallet -> membershipAccess
- POST /units/pool/:id/private-info (mevcut sahip/SUPER_ADMIN ücretsiz istisnaları korunur)
- POST /units/pool/:id/location ve /contact/:channel (özel bilgi erişimi de gereklidir)
- POST /units/pool/:id/share
- GET /units/:id/publication-quote
- POST /units/:id/submit-approval
- POST /portfolio-documents/:portfolioId/submit-review

Bu üyelik kapısını mevcut kodda kullanmayan yollar: GET /units/pool/:id/contact-quote; /network/posts/:id/contact-quote, /private-info, /contact/:channel, /message; /coordination/commercial-scans/* (quote/config/scan). Mevcut cüzdan/erişim/scanPermissions kuralları korunmuştur; ek üyelik yasağı eklenmedi.
Kota yardımcı kullanımı: POST /network/posts (TALEP) ve havuza yayın (HAVUZ); CRM'den talep oluşturma da NetworkService.create üzerinden geçer.

Değişen uygulama dosyaları / paket listesi:
src/membership/pool-access.ts (yeni)
src/membership/membership-quota.rules.ts
src/units/units.service.ts
src/units/pool-publication.service.ts
src/portfolio-documents/portfolio-documents.service.ts
Test: src/membership/pool-access.spec.ts (yeni), src/units/pool-publication.service.spec.ts (fixture güncellemesi).

Kota: OFFICE_PACKAGE girişinde yalnız ofis paketinin monthlyDemandLimit/monthlyPoolLimit alanı; tanımsız veya <=0 ise mevcut sınırsız davranış korunur, kişisel kota kullanılmaz. Pozitif limit ofis sahibinin aylık ortak sayacından tüketilir. Yayında kota için aktör kimliği kullanılır; ücretlendirme/cüzdan seçim kuralları değişmedi. Geçerli kişisel üyelikte mevcut kota davranışı korunur.

Doğrulama:
npx tsc --noEmit --incremental false: Exit 0.
npx jest --runInBand --runTestsByPath src/membership/pool-access.spec.ts src/units/pool-publication.service.spec.ts src/units/pool-publication.routes.spec.ts src/portfolio-documents/portfolio-documents.service.spec.ts src/network/network-contact-access.spec.ts src/coordination/commercial-match-scan.service.spec.ts src/coordination/automatic-matching.spec.ts src/units/units.controller.spec.ts src/units/project-authorized-contact.spec.ts src/project-sales/project-sales-release.spec.ts src/content-safety/content-safety.service.spec.ts
Jest: 11 suite, 248 test PASS, Exit 0. API/DB/native mocked; canlı sistem kanıtı değildir.
git diff --check: Exit 0.
Başlangıçtaki 5 kapsam dışı dosyanın hash'i aynı; office-management.service.ts değişmedi.

Temizlik: src/units.bak-direct-publish-20260820/ çalışma ağacında ve Git'te yok. src altında başka *.bak* klasörü de yok; git rm uygulanacak kayıt/silinen klasör yok. Sunucuda da silinmeli: src/units.bak-direct-publish-20260820/ mevcutsa (sunucuya bağlanılmadı).

Yedekler: _backup/EPH89/src altında 5 değiştirilen mevcut dosyanın .bak-eph89 kopyası.
Paket: _backup/EPH89/EPH89_DEPLOY.tgz, yalnız yukarıdaki 5 uygulama kaynağı; spec/md/bak/klasör silmeleri yok. D:\EPH_PAKET\EPH89_DEPLOY.tgz kopyası erişim reddi nedeniyle oluşmadı.
Commit: feat(EPH-89): havuz islemlerinde ofis paketi yeterli — oluşturulamadı; git add, D:/Projects/SM/.git/index.lock: Permission denied ile durdu. Index değiştirilmedi.
EPH89.patch: 7 kaynak/test dosyası için backend köküne göre uygulanabilir diff.
Sunucu bağlantısı, sır okuma, deploy, canlı DB işlemi yapılmadı.
