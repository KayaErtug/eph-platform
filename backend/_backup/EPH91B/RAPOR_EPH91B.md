# EPH-91B — ek düzeltme

## A — Mobil ses kaydı / yükleme

Kök neden: Yerel Expo `node_modules/expo/src/winter/runtime.native.ts` varsayılan olarak global fetch'i Expo fetch ile kuruyor. `winter/fetch/convertFormData.ts:77` URI tabanlı RN dosya nesnesini desteklemediğinde cihazdaki **Unsupported FormDataPart implementation** hatasını üretiyor. EPH-91 öncesi yedekle karşılaştırıldı: transcribe zaten URI nesnesi/FormData kullanıyordu; mevcut api.post da FormData'yı JSON'a çevirmiyordu. Sorun Expo fetch'in URI parçasını dönüştürmesi. Gerçek cihazdaki runtime ayrıca incelenmedi; hata metni ile yerel kaynak eşleşmesi esas alındı.

- `src/lib/nativeMultipart.ts:4` (yeni): native FormData, RN XMLHttpRequest üzerinden gönderilir; Expo/global fetch dönüştürücüsüne girmez. URI nesnesi korunur; Blob/File/ArrayBuffer oluşturulmaz. Başarı/hata/iptal ortak API'ye döner.
- `src/lib/api.ts:67,72,87,140`: header biçimleri normalize edilir; FormData gövdesinde Content-Type bütün harf varyantlarıyla silinir. RN boundary'yi oluşturur. FormData bütün yazma metotlarında JSON.stringify dışındadır. Native multipart yolu ortak auth/rıza ve aynı 25 sn AbortController bütçesi içindedir; diğer istekler mevcut fetch yolundadır.
- `src/lib/linaRecording.ts:3` (yeni): gerçek URI uzantısına uygun `{ uri, name, type }`; HIGH_QUALITY Android/iOS m4a kaydı `kayit.m4a` / `audio/m4a`. Uzantısız content URI için bilinen kayıt preset'i m4a esas alınır.
- `src/components/LinaVoiceRecorder.tsx:34,345`: kayıt URI'si ile dosya adı/MIME nesnesi callback'e birlikte geçer.
- `src/app/lina.tsx:220,430` ve `src/app/crm.tsx:3091,3096,3493`: backend controller'ın beklediği **file** alanına RN dosya nesnesi eklenir. Recorder'ın CRM'deki gerçek tüketicisi de düzeltildi. CRM transcribe timeout'u boş metne çevrilmez; mevcut güvenli Lina hata mesajıyla gösterilir.
- EPH-91 aşamalı onay, confirmationId/sourceModule, metnin hemen gösterilmesi, bağımsız ses yükleme, güvenli cevap doğrulama ve tekrar deneme korunur.

Mobil yedekler: `_backup/EPH91/src/{app/lina.tsx,app/crm.tsx,components/LinaVoiceRecorder.tsx,lib/api.ts}.bak-eph91b`. Önceki .bak-eph91 dosyaları korundu. Yeni iki helper'ın önceki sürümü yok.

Mobil doğrulama:

- `npm run typecheck` → **MOBILE_TYPECHECK_EXIT=0**.
- `npm run rc:check` → **EPH RC STATIK KONTROL: OK (252 src dosyası)**; **MOBILE_RC_EXIT=0**.
- `node _backup/EPH91/check-eph91b.cjs` → **40 kontrol geçti, Exit 0**. Önceki 31 kontrol + recorder dosya metadata'sı, gerçek component transcribe payload'u, ortak API/native multipart gövdesi, auth/rıza, farklı Content-Type header biçimlerinin kaldırılması, 25 sn iptal ve HTTP hata davranışı. Fetch kullanılmaması mock ile denetlendi; gerçek ağ çağrısı yok.
- `git diff --check` → **MOBILE_DIFF_CHECK_EXIT=0**.

## B — Silmede üçüncü onay

Kök neden: Genel gate'in atomik tüketimden sonra döndürdüğü özgün silme komutu action engine'e onay bağlamı olmadan geçiyordu. Motor bunu yeni silme isteği sanıp MOTOR_AKSIYON taslağı ve üçüncü onay üretiyordu.

- `src/lina/actions/lina-confirmation-gate.service.ts:32,231`: yalnız atomik olarak tüketilmiş **DELETE / FINAL** planı için sunucu içi `confirmedDelete={planId,userId,sourceModule,command}` üretir.
- `src/lina/lina.controller.ts:161,189,204`: bu bağlam yalnız gate sonucundan alınır, motora beşinci parametreyle iletilir. HTTP DTO'suna bayrak eklenmedi; istemcinin gönderdiği sahte confirmedDelete kullanılmaz.
- `src/lina/actions/lina-action-engine.service.ts:144,960,979,1232`: plan kimliği dolu ve kullanıcı/modül/komut eşleşiyorsa mevcut CRM çözümleme/erişim yoluyla siler; yeni onay oluşturmaz. Gate bağlamı olmayan eski çağrılar kendi onaylarını istemeye devam eder.
- Yeni test: `src/lina/actions/lina-delete-confirmation.spec.ts`; mevcut `src/lina/lina-scope.service.spec.ts` mock beklentisi yeni isteğe bağlı parametreye uyarlandı. Önceden mevcut diğer test değişiklikleri korundu.

Backend yedekleri: `D:/Projects/SM/backend/_backup/EPH91B/<özgün-göreli-yol>.bak-eph91b` (3 kaynak + mevcut scope spec). office-management.service.ts başlangıç/son hash'i aynı.

Backend doğrulama:

- `npx tsc --noEmit` → **BACKEND_TSC_EXIT=0**.
- `npx jest --runInBand --runTestsByPath src/lina/actions/lina-delete-confirmation.spec.ts src/lina/actions/lina-action-engine-network.spec.ts src/lina/eph90.spec.ts src/lina/lina-scope.service.spec.ts` → **4 suite / 73 test geçti, Exit 0**.
- Ana ekran/general ve CRM için Onayla → Kesin Onayla → tek silme; üçüncü onay/MOTOR_AKSIYON yok. Paralel son onayda tek silme, replay, yanlış kimlik/modül, sahte HTTP bayrağı ve eski motor yolunun onayı kapsandı.
- `git diff --check` → **BACKEND_DIFF_CHECK_EXIT=0**.

## Backend paketi

`D:/Projects/SM/backend/_backup/EPH91B/EPH91B_DEPLOY.tgz` — 3 dosya. Arşiv üyeleri çalışma dosyalarıyla bayt bazında doğrulandı; spec/md/bak yok. Migration/şema değişikliği yok.

```text
src/lina/lina.controller.ts
src/lina/actions/lina-confirmation-gate.service.ts
src/lina/actions/lina-action-engine.service.ts
```

Liste ve hash: aynı klasörde `EPH91B_DEPLOY_FILES.txt`, `EPH91B_DEPLOY.sha256`.

## Kalan cihaz kabulü

Android/iOS'ta gerçek mikrofon kaydı → transcribe → Lina yanıtı; m4a MIME/boundary, rıza reddi, yavaş bağlantıda 25 sn hata, metin-ses sırası ve CRM silmede iki onay kontrol edilmeli. Yerel harness/Jest gerçek cihaz, canlı API veya canlı CRM silme kanıtı değildir.

Sunucuya bağlanılmadı; sır okunmadı; commit, deploy, canlı veri yazımı ve migration yapılmadı.
