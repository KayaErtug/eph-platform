# EPH-84 — Lina ve tarama/eşleşme sistemi kaynak denetimi

Tarih: 31.10.2026. Kapsam: YALNIZ OKU + RAPOR. Backend kökü `D:/Projects/SM/backend`; mobil kökü `D:/Projects/eph-mobile-final`. Aşağıdaki `B:` ve `M:` önekleri sırasıyla bu köklere göredir. Satırlar bu denetimdeki yerel dosyalara aittir.

Bağlayıcı kaynak: `D:/Projects/eph-mobile-final/docs/ai/EPH_KURALLARI.md`. SM altında aynı isimli dosya yok; SM `AGENTS.md` bu mobil dosyaya yönlendiriyor. §0 süper adminin tüm verileri görme/inceleme/güncelleme yetkisi ve §0-B ticari değerlerin DB'den yönetilmesi esas alındı.

Kanıt sınırı: Kaynak ve Prisma şeması okundu. Sunucu, canlı DB, sağlayıcı API, cihaz ve uygulama oturumu kullanılmadı; sır dosyaları açılmadı. Test/build çalıştırılmadı. Aşağıdaki davranışlar kaynak kanıtıdır; canlıda aynı sürümün bulunduğu veya olayın gerçekten yaşandığı iddiası değildir. Mevcut kirli çalışma ağacındaki diğer değişiklikler korunmuştur.

## Özet — önem sırasıyla (10 madde)

1. **KRİTİK — §0 ihlalleri:** Lina araçlarında sahiplik filtresi, genel cevapta rol ayırmayan redaksiyon; eşleşmede süper admin için de engelleme ve bazı özel portföy filtreleri var. Ayrıntı F01.
2. **KRİTİK — Lina ücretli yayın onayı eksik:** Talep Merkezi'ne kayıt gerçekten PK kesiyor; Lina onayı tutar/cüzdan/tarife sürümü içermiyor. Onaylanan metin ayrıca yayın anında AI ile tekrar çıkarılıyor. F02.
3. **ÖNEMLİ — Tarama yetkisi atlanıyor:** `ensureScanAuthorized` yalnız eski config yolunda; mobilin kullandığı yeni quote/scan yollarında çağrılmıyor. F03.
4. **ÖNEMLİ — Bildirim teslimi kopuk:** yeni talep/CRM callback'leri eşleşme yapmıyor, yalnız `LinaBildirim` oluşturuyor; mobil merkez `NetworkNotification` okuyor. Aynı kayıt güncellendikçe tekrar bildirim de oluşabiliyor. F04–F05.
5. **ÖNEMLİ — Onay akışı tam güvenilir değil:** ana Lina ekranında son onay butonu yok; DB planlarında atomik sahiplenme yok; CRM kayıt ve taslak kapatma ayrı işlemler. F06–F07.
6. **ÖNEMLİ — Süreler uyumsuz:** mobil 20/25 saniye, Responses 45, transkripsiyon 60 saniye; sınıflandırıcı ve araç turları süreyi büyütüyor. Fallback ve TTS'de uygulama seviyesinde timeout yok. F08.
7. **ÖNEMLİ — Tarife kuralları tutarsız:** tarama DB'den okunuyor ama kodda 25 PK yedeği var; türe özel ayar genel ayarı gölgeliyor; yönetim 0 kabul ederken tarama 0 reddediyor. F09.
8. **ÖNEMLİ — Eksik/yanlış eşleşme aday aşamasında başlayabiliyor:** DB ilçe filtresi motor normalizasyonundan önce çalışıyor; kat karşılığında da pozitif fiyat aranıyor; m² tek sayıya indirgeniyor. F10–F11.
9. **ÖNEMLİ — Ofis/kardeş havuzları ayrı eşleşme kapsamı değil:** yalnız ofiste/kardeşte görünen, genel havuzda olmayan ekip portföyleri mevcut aday sorgusuna girmiyor. F12.
10. **İYİLEŞTİRME — Tamamlanmamış parçalar:** CRM owner action servisi güncel kaynakta yok; portföy onayı yalnız oturumu CREATED yapıyor; araç onayının devam yolu yok; rıza yalnız cihazda; kullanım hesabı ve hata sınıflandırması eksik. F13–F17. Ücretli taramada aynı requestId, transaction ve kayıtlı rapor koruması olumlu; canlı finansal bütünlük ayrıca doğrulanmalı.

## A. Lina akış haritası

| Aşama | Aktif kaynak yolu ve kanıt |
|---|---|
| Ana ekran gönderimi | `M:src/app/lina.tsx:150` → `requireLinaDataConsent` (:154) → `api.post('/lina/chat')` (:173), `sourceModule: general`, history gönderir. |
| Ortak API/rıza | `M:src/lib/api.ts:34` tokenlı istek, dört Lina POST yoluna rıza kontrolü (:40), 25 sn abort (:38–51). `M:src/lib/linaDataConsent.ts:84` yol listesi. |
| CRM sesli giriş bileşeni | `M:src/components/LinaVoiceRecorder.tsx:436` rıza → doğrudan fetch `/lina/chat` (:449), `sourceModule: crm`, history boş (:461–462); timeout sabiti :31 = 20 sn. Ana ekranla aynı transport değil. |
| Backend giriş | `B:src/lina/lina.controller.ts:107` JWT → `/lina/chat`; geçici pasif bayrağı :73 = false. :127–129 kapsam; :134 kalıcı CRM taslak akışı; :156 genel confirmation gate; :188 action engine; :217 genel AI cevabı. |
| CRM taslağı | `B:src/lina/draft/lina-draft-flow.service.ts:134` maskeleme → :141 şemalı çıkarım (`lina-crm-extraction.service.ts`) → konum doğrulama :157 → DB taslağı :170. “Onayla” :128 → :176 confirm → CrmService :229/:266. |
| Genel AI | `B:src/lina/lina.service.ts:149` giriş filtresi → :162 askOpenAi → :497 live gateway. `B:src/lina/openai-tools/lina-openai-live-gateway.service.ts:57` runtime → `lina-openai-orchestrator.service.ts:85` client → `lina-openai-client.service.ts:86` OpenAI `/v1/responses` (:22). Araç sonuçları modele geri girer (orchestrator :183). |
| Yedek AI | Runtime tamamlanamazsa gateway :101 → :147 OpenAI `/v1/chat/completions`. Anahtar yoksa :125 yerel cevap. Başka bir AI sağlayıcısı bu sohbet/ses zincirinde görülmedi. Model DB seçimi ana client'ta :55–58; fallback ayrı env/default model kullanır (gateway :140). Sır değerleri okunmadı. |
| Yanıt | `B:src/lina/lina.service.ts:174` çıkış filtresi → :185 konuşma kaydı → :205 `{success,message,provider,...}`. Ana ekranda `M:src/app/lina.tsx:178` boş mesaj yedeği; :191 mesaj listesine ekleme; :201 onay durumu; :207 izinli route yönlendirmesi. |
| Sesli komut | `M:src/app/lina.tsx:229` FormData → `/lina/transcribe` :240 → `B:src/lina/lina.controller.ts:221` → `LinaTranscriptionService.transcribe` :238 → OpenAI audio/transcriptions (`lina-transcription.service.ts:57`, :81). Dönen metin ana ekranda :243–246 yeniden chat'e gider. |
| Sesli yanıt | Ana ekran :182 `/lina/voice` → controller :242/:253 → `LinaService.createVoice` :350 → tercihler/sessiz saatler :382–411 → :419 TTS → :585 OpenAI `/v1/audio/speech`; base64 :436 → mobil mesajın audio alanı :197. |
| Talep taslağı | `/lina/network/request-draft`: controller :100–104 kapsam → `LinaNetworkRequestDraftService.create`; bu uç tek başına yayın yapmaz. Lina action engine'in yayın yolu ayrıca aşağıda incelendi. |
| Ofis Lina yardımcısı | `M:src/components/office/LinaHelper.tsx:9` statik TIPS ve :80 yerel cevap gösterimi. AI çağrısı veya eşleşme motoru değildir. Bu dosya önceden değiştirilmiş durumdaydı; dokunulmadı. |

### Aksiyonların güncel durumu (EPH-52 sonrası yerel kaynak)

| Parça | Durum / onay değerlendirmesi |
|---|---|
| CRM müşteri + talep oluşturma | **Aktif.** DraftFlow controller'da action engine'den önce çalışır. Eksik alan/konum ve `ONAY_BEKLIYOR` kontrolü vardır (:180–189). Yalnız DB'deki taslak kaydedilir. Yeni müşteri ve mevcut müşteriye talep ekleme yolları var (:195–199). Atomiklik/idempotency açığı F07. |
| CRM listele/bul/güncelle/durum/görev/aktivite/sil | **Aktif.** `lina-action-engine.service.ts:184–209`; yazma işlemlerinin önünde metin tabanlı genel gate var. Silme ayrıca motorun kendi bekleyen onayını kullanır (:890–938, :1155). Aynı komut için genel gate ve motor onayı art arda gelebilir. |
| Genel confirmation gate | **Aktif, kısmen doğru.** DB `LinaTaslak/tur=ONAY_PLAN`, süre 5 dakika; normal WRITE tek, DELETE/FINANCIAL/AUTHORITY/BULK iki onay (:51, :141–197, :246–289). Süre/cancel/revise var. Plan kimliği ve modül istemciden doğrulanmıyor; atomik tüketim yok. |
| CRM owner action | **Mevcut aktif uygulamada yok.** `src/lina/actions/lina-crm-owner-action.service.ts` yok; yalnız `.bak-eph52` adlı yedek dosyanın varlığı görüldü, içeriği okunmadı. Controller ve module güncel enjeksiyonlarında da yok (`lina.controller.ts:59–69`, `lina.module.ts:66–108`). Geçmişteki durumdan hareketle aktif kabul edilemez. |
| Talep Merkezi'ne yayın | **Aktif ve ücretli.** Action engine :339 hazırlık, :436 yayın, :486 `NetworkService.create`. Taslak API'den farklı olarak DB ve PK hareketi oluşturur. F02. |
| Portföy oluşturma | **Yarım.** `lina-portfolio-engine.service.ts:89–115` doğrulama/onay yapar; `lina-portfolio-session.service.ts:341–377` yalnız `LinaPortfolioSession` kaydını CREATED/APPROVED yapar; bu yol Unit/Project oluşturmaz. “Oturum CREATED” gerçek portföy kaydı kanıtı değildir. |
| OpenAI araç yazma/onayı | **Devam yolu yarım.** `lina-openai-orchestrator.service.ts:161–180` pendingApproval üretir; `lina.service.ts:513–534` bunu `LINA_TOOL_APPROVAL_REQUIRED` hatasına çevirir; genel catch :277 kullanıcıya genel hata verir. Controller normal gate'i bu tool input'una bağlı bir devam protokolü olarak kullanmıyor. Şu an kayıtlı araç sağlayıcıları okuma odaklı; bu yüzden her sohbetin bozuk olduğu iddia edilmez. |
| Eşleşme okuma | **Aktif, kayıtlı rapor.** `lina-coordination-read-tool-provider.service.ts:116–128` CRM sonuçlarını çağırır; `crm.module.ts:17` CrmService yerine CrmMatchEngineService enjekte edilir; `crm-match-engine.service.ts:25–31` yalnız son tamamlanmış ücretli raporu okur. Lina yeni taramayı kendisi çalıştırmıyor. |

### Bulgular — Lina ve ortak riskler

**F01 — KRİTİK — §0: süper adminin kapsamı eksik.**

- Belirti: süper admin Lina'dan tüm CRM/talep/havuz verilerini göremez; telefon/e-posta gibi alanlar genel cevap/seste gizlenir; bazı eşleşmeler engelleme filtresine takılır.
- Kök neden: `B:src/lina/openai-tools/lina-coordination-read-tool-provider.service.ts:43–49`, :141–145, :179–185 rol istisnasız `ownerId/userId=context.userId` uygular. `B:src/lina/lina.service.ts:149`, :174, :414 filtreyi rol ayırmadan çağırır; `lina-kvkk.service.ts:11` rol parametresi dahi yoktur. `B:src/matching/paid-match-report.ts:12–13` SUPER_ADMIN'e de `visibleAuthor(user.id)` döndürür; `content-safety/block-policy.ts:28–29` iki yönlü engel filtresidir. `commercial-match-scan.service.ts:363` kaynak erişiminde de rol ayırmadan engelleme kontrolü; :303 genel havuz dışı portföyü yalnız kendi sales inventory'siyle sınırlar. `coordination-recalculation.service.ts:63–69`, :87 rapor başlangıcını yalnız kendi kullanıcı ID'sine bağlar.
- Önerilen düzeltme: süper admin için açık küresel okuma/inceleme/güncelleme kapsamı oluştur; sorgu ve kullanıcıya sunum redaksiyonlarında §0 istisnasını uygula. Sağlayıcıya veri aktarımı politikası ayrıca ele alınmalı; adminin veriye erişimi kısıtlanmamalı. Gerçek mesaj gönderme gibi etkileşimlerle salt veri inceleme ayrılmalı.
- Kapsam: **backend**, ilgili mobil admin görünümü gerekirse **ikisi**.

**F02 — KRİTİK — Lina yayınında tutarı belli finansal onay yok.**

- Belirti: “Talebi kaydet/Onayla” PK harcayabilir; kullanıcı kaç PK ve hangi cüzdan olduğunu bu Lina onayından öğrenemez; AI yeniden çıkarımı onaylanan kriterleri değiştirebilir.
- Kök neden: `B:src/lina/actions/lina-action-engine.service.ts:377–398` yalnız sourceText ve süre saklar; ücret/cüzdan/çıkarılmış nihai payload yok. :456 taslak **onaydan sonra yeniden** üretilir, :486–504 `NetworkService.create` çağrılır. `B:src/network/network.service.ts:2340–2354` `COST_TALEP_YAYIN` + acilse `COST_TALEP_ACIL_EK` okuyup `FORUM_TALEP_OLUSTURMA` keser. Bu create yolunda beklenen tarife doğrulaması/idempotent yayın anahtarı kullanılmıyor. Gate risk sınıflandırması komutta “ücret/PK” geçmesini garanti etmez (`lina-confirmation-gate.service.ts:254`); onay metni ücret içermez. :402–433 istemcinin gönderdiği assistant history'sinden de yayın onayı çıkarabiliyor; mutlaka DB'deki gözden geçirilmiş plana bağlı değil.
- Önerilen düzeltme: nihai payload + güncel DB ücreti + cüzdan + kaynak/tarife sürümünü kalıcı plana bağla; tutarlı finansal onay ve aynı işlem kimliğiyle tek yayın; onay sonrasında AI ile yeniden yorumlama yapma. Ofise bağlı danışman için kuraldaki ortak cüzdan korunmalı.
- Kapsam: **ikisi**.

**F06 — ÖNEMLİ — Ana Lina ekranında kritik son onay butonu eksik.**

- Belirti: kritik işlemde “Onayla”ya tekrar dokunmak ilerletmez; kullanıcı elle “Kesin Onayla” yazmak zorunda kalır.
- Kök neden: backend FINAL aşamasında özel sözcüğü zorunlu tutar (`B:src/lina/actions/lina-confirmation-gate.service.ts:178–185`); `M:src/app/lina.tsx:201–205` yalnız boolean saklar, :517 her aşamada `ask('Onayla')` yollar. `data.confirmation.stage/confirmLabel` kullanılmıyor. CRM recorder'da aşamaya göre “Kesin Onayla” zaten vardır (`M:src/components/LinaVoiceRecorder.tsx:716–748`); ekranlar tutarsız.
- Önerilen düzeltme: ana ekran da backend'in confirmation metadata'sını kullanmalı; plan kimliği ve aşamasıyla onay vermeli.
- Kapsam: **ikisi** (görünür aksaklık mobil).

**F07 — ÖNEMLİ — Onayın tek kez tüketilmesi ve kayıt/taslak atomikliği eksik.**

- Belirti: iki paralel onay aynı aksiyonu çalıştırabilir; kayıt başarılı ama taslak kapatma başarısızsa kullanıcı hata görüp tekrar kayıt/talep ekleyebilir. Başka ekrandaki bekleyen plan yanlış “Onayla” ile tüketilebilir.
- Kök neden: genel gate `loadPlan` :59 → `dropPlan` :190 → execute :195; kilit/koşullu tek kazanan tüketim yok. Yalnız userId aranır, sourceModule/plan ID eşlenmez. `B:src/lina/draft/lina-draft-flow.service.ts:193–199` müşteri/talep kaydı ve finish ayrı; :213–216 hata halinde “Taslağınız korunuyor” döner. Aynı müşteri tekrar bulunursa :266 yine talep eklenebilir. `schema.prisma:4356–4370` aktif taslak/işlem tekliği için unique kısıtı yok. Action engine :1094 bekleyen network planını kayıt çağrısından önce kapatır; hata halinde taslak kaybolabilir. Motorun pending okuması `tryExecute` içindeki catch'ten de önce (:149, :159) çalışır.
- Önerilen düzeltme: immutable plan ID + atomik sahiplenme/tüketim, idempotency anahtarı; DB yazımı ve taslak sonuçlandırmasını aynı transaction'a al. Genel gate, CRM taslağı ve motor planının onay önceliğini tek protokolde belirle.
- Kapsam: **backend**, plan ID taşıması için **ikisi**.

**F08 — ÖNEMLİ — Zaman aşımı katmanları uyumsuz; yanıt oluşsa bile mobil kopabilir.**

- Belirti: “Sunucu yanıt vermedi”, geç gelen/kaybolan yanıt, uzun süre bekleme; mutasyon tamamlandığı hâlde yeniden deneme riski.
- Kök neden: ortak mobil 25 sn (`M:src/lib/api.ts:38`), recorder 20 sn (:31); Responses varsayılan 45 sn (`B:src/lina/openai-tools/lina-openai-client.service.ts:148–161`), transkripsiyon 60 sn (`lina-transcription.service.ts:209–222`). Kapsam filtresi :61–66 parçaları sıralı sınıflandırır, :71 ayrıca model çağırır; orchestrator :21 en fazla 6 tur yapar. Gateway fallback fetch :147–177 ve TTS fetch (`lina.service.ts:585–605`) abort signal kullanmaz. Ana ekran metni ses isteği bitince listeye ekler (`M:src/app/lina.tsx:178–191`), TTS metnin görünmesini de geciktirir.
- Önerilen düzeltme: toplam istek süre bütçesi, tüm sağlayıcı çağrılarında abort; mobil süreleri bu bütçeyle uyumlu yap; metni hemen göster, sesi bağımsız yükle. Mutasyonlarda aynı işlem kimliğini koru.
- Kapsam: **ikisi**.

**F13 — İYİLEŞTİRME — Hata sınıflandırması ve boş cevap yönetimi parçalı.**

- Belirti: 401/403 sağlayıcı erişimi, 429 kota/rate-limit, 5xx, timeout kullanıcı açısından aynı genel Lina hatasına dönüşür; bazı CRM/aksiyon hataları ham teknik mesaj olarak görünebilir.
- Kök neden: Responses client :114–142 HTTP ve uzak mesajı hata metnine koyar; gateway başarısız runtime'dan sonra başka OpenAI çağrısına gider (:101). Kullanıcıya genel chat catch'i (`lina.service.ts:277–283`) ve transcribe catch'i (:149) güvenli metin döndürür; bunlarda ham sağlayıcı kodunun kullanıcıya doğrudan yansıdığı kanıtlanmadı. Ancak `lina-action-engine.service.ts:213–223` ve `lina-draft-flow.service.ts:213–216` `error.message` döndürür. Mobil `api.ts:151–153` hata metnini genel olarak gösterir; `API request failed` ifadesi :102'de yalnız __DEV__ konsol etiketi, doğrudan kullanıcı mesajı değildir. Boş Responses sonucu orchestrator :108, boş fallback gateway :205, boş transcription :114 tarafından yakalanır. Ana ekran null/bozuk JSON HTTP 200 sonucunu tip doğrulaması yapmadan okur (:178); success=false sonucu da normal assistant mesajı gibi gösterilir.
- Önerilen düzeltme: güvenli hata kodu + Türkçe kullanıcı metni + correlation ID; 429 quota/rate ve retryable 5xx ayrımı; aynı sağlayıcıdaki anlamsız fallback tekrarını azalt. Mobil yanıt şemasını doğrula. Teknik/raw mesajı kullanıcıya veya geniş loglara taşıma.
- Kapsam: **ikisi**.

**F14 — İYİLEŞTİRME — Rıza cihazda doğru kapılanıyor; sunucuda kalıcı rıza kontrolü yok.**

- Belirti: mobilde izin verilmeden dört AI uç noktasına gönderim engellenir; başka istemci aynı JWT ile sunucu tarafında bu rıza kaydını ispatlamadan çağrı yapabilir. İzin geri çekme cihaz kapsamındadır.
- Kök neden: `M:src/lib/linaDataConsent.ts:4–12`, :46–55 kullanıcı/sürüm/tarih SecureStore; :90–125 kimlik değişimi ve eşzamanlı rıza koruması; :128–150 geri çekme. Merkezi API :40 ve recorder :436 rızayı uygular. Backend controller :99–109/:220–245 JWT kullanır, rıza sürümü/kaydı kontrolü yapmaz. Ana Responses payload'ı `store:false` (:66); fallback chat payload'ında :157–175 bu alan yok. Desen maskeleme tam anonimleştirme değildir. Belge AI yolu, bu dört yol listesinde yer almıyor.
- Önerilen düzeltme: kullanıcı/sürüm bazlı backend rıza kaydı ve tüm ilgili AI yollarına ortak kontrol; iptal kapsamını açık belirt; aktarım gerektirmeyen yerel işlemlerde rıza bağımlılığını ayrıca değerlendir. Belge aktarımını aynı envantere dahil et. `store:false` desteği ve uygulanması her uygun sağlayıcı yolunda ayrı doğrulanmalı.
- Kapsam: **ikisi**. Bu, kaynak denetimi bulgusudur; hukuki uygunluk kararı değildir.

**F15 — İYİLEŞTİRME — Lina PK/kota ve kullanım hesabı.**

- Belirti: Lina sohbet/ilan açıklaması/ses tüketimi PK bakiyesine yansımayabilir; kullanım metriği gerçeğin altında kalabilir.
- Kök neden: `schema.prisma:3821–3823` içindeki `LINA_ILAN_ACIKLAMASI`, `LINA_ILAN_DUZENLEME`, `LINA_SESTEN_ILAN` için aktif kaynak aramasında enum dışındaki tek kullanım `kontor.service.ts:152–159` kategori eşlemesidir; gerçek harcama çağrısı bulunmadı. Bu üç işlem türü **PASİF/kullanılmıyor**; “Lina bütünüyle pasif” anlamına gelmez. Chat/transcribe/voice controller yollarında DB ticari kota/PK kontrolü görülmedi. Model token/iterasyon sınırları teknik sınırlardır, kullanıcı kotası değildir. Gateway Responses başarılı sonucunda input/output tokenları 0 döner (:79–80); Lina bunları konuşma kaydına yollar (`lina.service.ts:191–192`). Lina üzerinden Talep Merkezi yayını ise farklı işlem türüyle PK keser (F02).
- Önerilen düzeltme: ürün politikasına göre ücretsiz/ücretli işlemleri açıkça tanımla; ücret/kotalar gerekiyorsa DB ve yönetim ekranı kullan; Responses usage değerlerini uçtan uca taşı. Var olmayan ücreti aktifmiş gibi göstermeme.
- Kapsam: **backend**, fiyat/kota gösterilecekse **ikisi**.

**F16 — İYİLEŞTİRME — Portföy ve araç onaylarında tamamlanma semantiği eksik.**

- Belirti: onaylanmış portföy oturumu gerçek ilan sanılabilir; model tool onayı genel hata gibi görünür.
- Kök neden: portföy oturumunda `markApproved` yalnız session update yapar (`lina-portfolio-session.service.ts:359–374`); gateway tool approval sonucu `lina.service.ts:532` throw ile genel hataya dönüşür. CRM owner action'ın güncel kaynağı/enjeksiyonu yok (yukarıdaki aksiyon tablosu).
- Önerilen düzeltme: gerçek Unit/Project kaydı oluşmadıkça “taslak onaylandı” de; kayıt aksiyonunu yetki, onay ve idempotency ile tamamla. Tool approval için saklanmış input'a bağlı açık resume akışı kur; owner action ihtiyacını güncel CRM taslak akışına göre yeniden belirle.
- Kapsam: **ikisi**.

**F17 — İYİLEŞTİRME — Kapsam sağlayıcısı hatasında filtre açık kalıyor.**

- Belirti: kapsam sınıflandırıcısı hata/boş etiket verdiğinde kurallarla yakalanmayan kapsam dışı mesaj genel AI'ya geçebilir; ek çağrı ve süre oluşur.
- Kök neden: `lina-scope.service.ts:104–107`, :118–120 chat için hata/etiket bozukluğunda `EPH_SCOPE`; request-draft için :109–116 kontrollü 503 vardır.
- Önerilen düzeltme: chat kapsam hatasında açık, kontrollü hata veya güvenilir yerel sınıflandırma; sağlayıcı arızasını izinli kapsam kararı gibi kullanmama.
- Kapsam: **backend**.

## B. Tarama / eşleşme

### Algoritma ve veri kaynakları

Ana ücretli yol: `M:src/components/CommercialMatchPanel.tsx:51` → `GET /coordination/commercial-scans/:type/:sourceId/quote`, geçmiş/rapor GET'leri, onaylı POST (:111–129) → `B:src/coordination/commercial-match-scan.controller.ts:20–56` → `CommercialMatchScanService.scan` → `EphMatchEngineService`.

| Kriter | Güncel davranış / kaynak |
|---|---|
| Kaynak | `CRM` = tek CustomerInterest ID; `REQUEST` = aktif, süresi dolmamış NetworkPost; `PRIVATE_PORTFOLIO`/`POOL_PROPERTY` = Unit. `commercial-match-scan.service.ts:339–370`. |
| Ön şart | İl, propertyTypes, işlem amacı/status, normal taleplerde pozitif maksimum bütçe ve tamamlanmış MUST alanları (:379–385). Kat karşılığında bütçe zorunluluğu yok. REQUEST yalnız iki talep türünde (:349), en fazla 20 bölge (:353). |
| İl/ilçe/mahalle | Aday DB sorgusu il/ilçede case-insensitive tam eşitlik (:319–328). Motor il, normalize ilçe ve mahalleyi zorunlu tutar (`eph-match-engine.service.ts:239–246`, :254). Mahalle boşsa istenmez; ilanda mahalle yoksa mapAddress/address token eşleşmesi denenir. |
| Gayrimenkul/işlem tipi | propertyTypes ve statuses/intent hard filter (motor :258–263, :1057–1107). REQUEST kiralık/satılık, `Talep Türü:` etiketiyle çıkarılır; kat karşılığı ayrı (:350–355). Etiket yoksa SATILIK seçilir. |
| Fiyat/para birimi | Ücretli taramada min/max kesin, tolerans 0; TRY/TL normalize edilir; döviz dönüşümü yapılmaz (motor :232–238, :267–280; aday sorgusu :320–327). Pozitif ilan fiyatı gerekir. |
| Oda | paidScan'de priority PREFERENCE/ANY değilse zorunlu; tek oda değeri ORDERED_MINIMUM, çoklu alternatif EXACT_OR_ANY (motor :226–230). Tek `2+1`, yalnız birebir `2+1` demek değildir. |
| m² | `unit.area → grossArea → netArea` ilk pozitif değer kullanılır (:248); min/max normalde hard; PREFERENCE yumuşatır, ANY aralığı kaldırır (:221–250). Kart profilinde grossArea önceliği netArea'dan önce okunur. |
| Kart özellikleri | MUST uyumsuzluğu veya ücretli taramada zorunlu bilginin bilinmemesi eler; PREFERENCE puan, ANY atlama (`eph-match-engine.service.ts:981–1049`). Genel feature listesi uyum oranıyla puanlanır (:906–924). |
| Puan | Fiyat en çok 50 (`:708`, `:749`), konum en çok 30 (:474/:505/:616), ikincil toplam 20. Konut alan/oda/özellik 10/5/5; arsa 12/0/8; sanayi 8/0/12; ticari 10/0/10; turizm/proje 8/2/10 (:1153–1162). İstenmeyen kriterler de ilgili puanı alabilir. |
| Eşik | 75+ GUCLU, 40+ UYGUN, altı ZAYIF (:1200–1203). Motor :332–385 uygun sonucu döndürür; ayrı minimum puan kesme filtresi yoktur. Yani 40 sonuç kabul eşiği değil sınıflandırma eşiğidir. |
| Mesafe | Ücretli servis `useDistance:false`, strictBudget/strictLocation/paidScan true (:283–284); bu yolda 5 km yakınlık algoritması çalışmaz. Eski motor seçeneklerinde 5 km sabiti (:109), %30/35/40 tolerans (:1139–1150) bulunur; ücretli taramaya uygulanmış gibi sunulmamalı. |
| Aday/sonuç limitleri | Kodda 2000 aday, 100 sonuç (:24–25); 2001 adayda daraltma hatası ve kesinti yok (:397). 100 en iyi sonuç kaydedilir (:148). Bunlar DB ayarı değil. Teknik iş yükü sınırı olarak ayrılmalı; satılabilir hak/kota olarak kullanılırsa §0-B gereği DB'ye taşınmalı. |
| Ücret | Tür anahtarı → `COST_ESLESME_TARAMA` → `MATCH_SCAN_COST_PK` → kodda 25 (:20–22, :400–404). Puan/ağırlık/mesafe eşikleri kaynak kodda; ücret SystemSetting'de, eksikse sabit yedekte. Algoritmik eşik, tek başına ticari fiyat/kota değildir. |

### Tetikleme, modül bağlantısı ve teslim

- Yeni/güncellenen **talep**: `network.service.ts:368–374`, :2186/:2399 callback; `coordination-recalculation.service.ts:17–20` handler'ı kaydeder. **Eşleşme hesaplamaz**, ücretli tarama hatırlatması yazar (:28–34).
- Yeni/güncellenen **CRM talebi**: `crm.service.ts:30–40`, :885/:907 callback; coordination :21–25 aynı hatırlatma. `CrmModule` provider alias'ı CrmMatchEngineService olduğundan güncel sonuç okuma snapshot'tır.
- **Yeni portföy / havuza gönderme**: units ve yayın yollarında bu ücretli servisi otomatik çağıran ters tarama hook'u görülmedi. Yeni ilan, eski ücretli raporu yeniden hesaplamaz. “Portföy eklendi, talebe eşleşme gelmedi” bu sürümde tek başına cron arızası kanıtı değildir.
- **Elle tarama**: CommercialMatchPanel; CRM `M:src/app/crm.tsx:3587`, talep detayı `src/app/network/[id].tsx:794`, kendi havuz ilanı `src/app/havuz/[id].tsx:307`, portföy detayı `src/app/portfoy/[id].tsx:1886`. Her yeni requestId yeni ücretli tarama; aynı requestId tekrarında rapor okunur.
- **Cron**: coordination/network/units/matching içinde eşleşme taraması yapan @Cron veya ayrı job bulunmadı. `CoordinationModule` provider'ları :34–39, `AppModule` import :107 bağlantılıdır; “eşleşme cron'u yazılmış ama modüle eklenmemiş” örneği mevcut kaynakta yok. Süresi geçmiş PROCESSING düzeltmesi cron değil, aynı requestId replay edildiğinde :227–243 çalışır.
- **EPH-38 karşılaştırması**: güncel `NotificationsModule:18` NotificationScheduler'ı sağlar, AppModule :92 import eder. Scheduler :24–53 doğrudan `CronJob.from(start:true)` ile event collection, push retry, Expo receipt, üyelik süresi işleri çalıştırır. ScheduleModule.forRoot yalnız köke bağlanmamış TaskRemindersModule içinde bulunuyor; @Cron dekoratörüne tek başına bakıp aktif demek yanlış. Ancak mevcut bildirim scheduler'ı bu global keşfe ihtiyaç duymaz. Hiçbir işi LinaBildirim eşleşme kuyruğunu okumaz. Bunlar yerel bağlantı kanıtıdır; canlı job çalışması kanıtı değildir.
- **Sonuç teslimi**: kesinti+snapshot tek transaction (:120–169); yanıt readable filtresiyle :170/:274–279; mobil :135 ekrana alır, :151–159 ücretsiz geçmiş raporu açar. Tamamlanmış taramada push/LinaBildirim oluşturma çağrısı yok. Lina aracı CRM snapshot'ını okuyabilir. `/coordination/lina-opportunities` ve `/coordination/alerts` backend'de vardır (`coordination-recalculation.controller.ts:40–49`), mobil src içinde doğrudan tüketicisi bulunmadı. F04.
- **OfficeMatchScanLog**: güncel `backend/src/**/*.ts` ve `prisma/schema.prisma` içinde model/kullanım yok. Güncel kalıcı model `MatchScanAttempt` (:1755). Canlıda eski tablo var mı C01 ile ayrıca kontrol edilmeli; eski tabloya doğrudan varsayımsal SELECT verilmedi.

### Bulgular — tarama/eşleşme

**F03 — ÖNEMLİ — Ofis tarama yetkisi yeni uç noktalarda uygulanmıyor.**

- Belirti: ofis yöneticisinin scanPermissions=false verdiği danışman yeni mobil tarama yolundan işlem başlatabilir.
- Kök neden: `commercial-match-scan.service.ts:38` tek `ensureScanAuthorized` çağrısı, yalnız config'te. quote :69 ve scan :81'de çağrı yok. Mobil yeni commercial-scans yolunu kullanır. `office-wallet.rules.ts:59–82` genel cüzdan izinlerini kontrol eder; **scanPermissions** kontrol etmez. Genel cüzdan izni ile tarama özel izni aynı değildir.
- Önerilen düzeltme: gerçek scan'de ve transaction içindeki son kontrolde tarama yetkisini doğrula; quote tutarlı uygunluk dönsün. SUPER_ADMIN istisnası korunmalı.
- Kapsam: **backend**.

**F04 — ÖNEMLİ — Tarama hatırlatması mobil bildirim merkezine ulaşmıyor.**

- Belirti: talep kaydedilir ama “eşleşme/tarama” bildirimi görünmez; Lina fırsat ekranı beklentisi karşılanmaz.
- Kök neden: coordination :29–34 yalnız `linaBildirim.create`; aktif backend TS aramasında bunun dışında LinaBildirim okuyucu/dağıtıcı yok. `notifications.service.ts:160–185` NetworkNotification listeler; :34–96 bildirim/push altyapısı bu model üzerindedir. Mobil `src/lib/notifications.ts:64` ve notifications ekranı bu API'yi tüketir. `lina-notification.service.ts:26–36` yalnız bellekte `created:true` nesnesi üretir, kalıcılık/teslim sağlamaz. Backend opportunities/alerts uçlarının mobil tüketimi de bulunmadı.
- Önerilen düzeltme: tek bildirim sistemi üzerinden kayıt/teslim ve ilgili kayıt detayına navigasyon; mevcut LinaBildirim satırları için kontrollü geçiş; kaydın kendisiyle tarama sonucunu farklı olaylar olarak tanımla.
- Kapsam: **ikisi**.

**F05 — ÖNEMLİ — Tekrar bildirim ve eski raporun güncel sanılması.**

- Belirti: aynı talep için tekrar hatırlatma; aynı ilan farklı kaynak/raporlarda tekrar görünür; yeni portföyler eski rapora eklenmez.
- Kök neden: coordination :28–34 her callback'te create, eventKey/dedupe yok. Fırsatlar :90–94 yalnız kaynak başına son raporu seçer; :115–121 farklı kaynakların aynı unitId'sini tekilleştirmez veya puana göre küresel sıralamaz. `readablePaidMatches` :29–49 yalnız görünür/aktif Unit ve CRM erişimi doğrular, kriterleri yeniden hesaplamaz. Rapor `stale` :277 yalnız kaynak hash'iyle karşılaştırılır; karşı ilanın fiyatı/kriteri değişince işaretlenmeyebilir. CRM matcher :30–37 snapshot tarihi/stale uyarısını ayrıca taşımaz. coordination alerts :78 yalnız talebin güncelleme tarihini izler.
- Önerilen düzeltme: olay+kayıt+sürüm bazlı idempotent bildirim; rapor tarihini ve snapshot niteliğini her kanalda göster; karşı taraf sürümü/değişim uyarısı ekle. Yeni otomatik ücretli tarama başlatma; kullanıcı onayı korunmalı. Fırsatlarda kaynak bilgisi kaybolmadan unit/customer bazlı grupla.
- Kapsam: **ikisi**.

**F09 — ÖNEMLİ — §0-B: ücret yedeği, öncelik ve 0 tutarı uyumsuz.**

- Ek ticari limit: Lina yayın yolunda talebin varsayılan geçerlilik süresi de kodda 30 gündür (`B:src/network/network.service.ts:2321–2323`); §0-B gereği DB'den yönetilmelidir.
- Belirti: yönetimde genel ücret değişir ama bazı taramalar aynı kalır; tarama ücretsiz yapılamaz; ayar yoksa yine 25 kesilebilir.
- Kök neden: commercial scan :400–404 tür ayarı genel ayarı ezer; iç içe fallback 25. `pricing/commercial-costs.ts:11`, :72–78 ayrıca 25 yedeği. Admin :3530–3544 COST/MATCH_SCAN anahtarlarında 0 kabul eder; scan :403 ve mobil panel :114 `<=0` reddeder. Tip anahtarları yoksa admin :3558–3559 bunları genel COST anahtarı gibi ilk kez oluşturmaz. İyi taraf: admin güncellemesi :3554–3584 transaction ile eski/yeni/actor/zaman audit kaydı tutar. Tarama tarife kontrolü :94–97 transaction'dan önce, son transaction'da yeniden ücret okunmaz (:137–145).
- Önerilen düzeltme: gerekli tarifeler DB'de zorunlu; eksikte güvenli hata. Genel/tür tarifesinin yönetim davranışı açık olsun; 0 politikasını uçtan uca tutarlı yap. Tarife sürümü/son kontrolüyle onaylanan ücretin değişme durumunu tanımla. PK değerlerini mobilde sabitleme.
- Kapsam: **ikisi**.

**F10 — ÖNEMLİ — Aday ön filtresi uygun kaydı motora ulaştırmayabilir.**

- Belirti: aynı ilçe farklı yazılmışsa veya kat karşılığında fiyat girilmemişse eşleşme yok; oda/alan öncelikleri nedeniyle beklenti farklı çıkar.
- Kök neden: DB candidateWhere :322–325 ilçe eşitliği motorun normalizeDistrict (:1239–1258) öncesinde çalışır. “Denizli Merkezefendi” ile “Merkezefendi” motorca normalize edilebilse bile SQL adayında elenir. Kat karşılığı demandReady bütçesiz geçer (:381–385), ama candidateWhere :325 ve motor :234 pozitif fiyat ister. REQUEST tags yoksa :351 satılık varsayımı; hatalı/eski etiket yanlış işlem türü seçebilir.
- Önerilen düzeltme: kalıcı kanonik konum kimlikleri ve aynı normalizasyon; kat karşılığı fiyat zorunluluğunu iş kuralına göre ayrı tanımla; işlem amacını güvenilir şemalı alandan al ve eksikte kullanıcıya doğrulat.
- Kapsam: **backend**, veri tamamlama gerekiyorsa **ikisi**.

**F11 — ÖNEMLİ — m² ve oda kriterinin anlamı kullanıcı beklentisiyle ayrışabilir.**

- Belirti: net alan istendiği hâlde brüt alanla uygun görünme; tek 2+1 seçiminde daha büyük odalı ilanlar; yüksek puanın bütün tercihler birebir tutuyor sanılması.
- Kök neden: motor :223 net/brüt priority'yi tek alana indirger; :248 ve :299 ilk pozitif `area/grossArea/netArea` kullanır. :229 tek oda minimumdur. :859–860 boş oda filtresine de tam puan verir; :981–985 belirtilmeyen kart priority'si PREFERENCE. Sonuç puanı zorunlu filtreleri geçen kayıtlar içindeki sıralamadır; bağımsız doğruluk yüzdesi değildir.
- Önerilen düzeltme: net ve brüt alanı ayrı alan/operatörle değerlendir; oda için “tam/en az/alternatif” semantiğini UI'da açık göster; puan ve teyit nedenlerini raporda koru. Algoritma eşiğini fiyat/kota ile karıştırma.
- Kapsam: **ikisi**.

**F12 — ÖNEMLİ — Ofis/kardeş havuzu eşleşmeye ayrı kapsam olarak dahil değil.**

- Belirti: ofis ekranında görünen ekip/kardeş ilanı talep/CRM taramasında görünmez.
- Kök neden: `office-pool.service.ts:23–28` office sahipliği+hiddenFromOffice kuralı; `sister/sister-pool.service.ts:32–44` aktif partner+sharedWithSisters+hiddenFromOffice kuralı kullanır. Ücretli adaylar yalnız `visiblePaidUnits` ve :303 genel havuz/kendi özel sales inventory OR'u; aynı ofis, kardeş linki veya sharedWithSisters kriteri yok. Aynı Unit ayrıca genel havuzda uygunsa **o nedenle** eşleşebilir; tamamen ayrı veri kopyası değildir. SisterRequestsService özel bilgi isteği/onayıdır, gayrimenkul talep eşleştirmesi değildir. Mobil ofis/kardeş ekranlarında CommercialMatchPanel entegrasyonu yok; LinaHelper statik yardım.
- Önerilen düzeltme (kod yazılmadı): `GENEL_HAVUZ / OFIS / KARDES_OFIS` kapsam seçimini açık ürün kararıyla tanımla; sunucuda ortak görünürlük çözümleyicisiyle aday ve rapor tekrar okumalarını aynı yetkiye bağla. Kardeş bağlantı/paket askısı/paylaşım kaldırma ve hiddenFromOffice kuralları tekrar okumada da uygulansın. Süper admin tümüne erişsin. Yeni kapsamın ücret/limitleri varsa DB'den yönetilsin; malik özel bilgi onayı eşleşme sonucu yüzünden otomatik açılmasın.
- Kapsam: **ikisi**.

### Bilinen belirtiler için kök neden özeti

| Belirti | Önce kontrol edilecek neden / kanıt |
|---|---|
| Eşleşme gelmiyor | Otomatik motor yerine yalnız hatırlatma (coordination :17–34); hatırlatma yanlış bildirim modelinde (F04); ücretli rapor henüz yok; hard konum/fiyat/status/para birimi/MUST filtreleri; aday sınırı; ofis/kardeş kapsamı yok (F10–12). |
| Aynı eşleşme tekrar geliyor | Aynı requestId replay'i tasarımla aynı raporu verir, yeniden ücret kesmez (:218–245). Farklı requestId yeni taramadır. Kaynaklar arasında unit dedupe yok ve her update yeni LinaBildirim yaratır (F05). Canlı eski bildirimleri kaynak incelemesiyle teşhis etmek mümkün değil. |
| Yanlış eşleşme | Snapshot karşı ilanın güncel kriterlerini yeniden hesaplamaz; yanlış/stale tag, net/brüt ve minimum oda semantiği; MUST yerine PREFERENCE (F05/F10/F11). |
| PK kesildi, sonuç yok | Ana transaction kesinti+raporu birlikte kaydeder (:142–166), bu olumlu. Commit sonrası `readable` ayrı DB çağrısı (:170) veya mobil timeout/şema-cüzdan doğrulaması (:128–132) sonucu gizleyebilir; aynı requestId ile tekrar kontrol/geçmiş raporu kullanılmalı. Snapshot görünürlük kontrolü sonucu sıfıra indirebilir (:274–279). Tamamlanmış **sıfır eşleşme** taraması ücretlidir ve mobil onayda açıklanır (:119). Teknik hata/bağlantı kaybı ile sıfır sonuç ayrılmalı. PROCESSING kurtarma cron'u yok; replay :227 sonrası 120 saniyede hareket kontrolü yapar. Gerçek kesinti/rapor tutarlılığı C04–C06 ile kanıtlanır; kesin para kaybı iddia edilmez. |

## C. Canlı doğrulama komutları — BU DENETİMDE ÇALIŞTIRILMADI

Mustafa abi için **🖥️ SUNUCU** komutları. DB sorguları mevcut, onaylı SQL oturumunda **ayrı ayrı** çalıştırılmalı. Burada bağlantı komutu, adres, kullanıcı/şifre, ortam değişkeni veya credential okuma yoktur. SELECT'ler ad, telefon, mesaj içeriği, JSON'un tamamı, token ve şifre alanı döndürmez. C01'de tablo yoksa o tabloya ait sonraki SELECT çalıştırılmamalı; bu sürüm farkı kanıtıdır. Finansal tutarsızlık sayıları doğrudan düzeltme/silme talimatı değildir.

### 1 — C01: Şema/sürüm uyumu ve eski OfficeMatchScanLog varlığı

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('OfficeMatchScanLog', 'MatchScanAttempt', 'LinaTaslak',
                     'LinaBildirim', 'NetworkNotification', 'KontorHareketi')
ORDER BY table_name;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('OfficeMatchScanLog', 'MatchScanAttempt')
ORDER BY table_name, ordinal_position;
```

Ne doğrular: yerel model ile canlı model uyumu. OfficeMatchScanLog varsa önce yalnız kolon listesi alınır; içeriği veya eski kolonlar varsayılmaz.

### 2 — C02: Tarife ayarları ve gerçek öncelik

```sql
WITH wanted(key) AS (VALUES
 ('COST_ESLESME_TARAMA'), ('MATCH_SCAN_COST_PK'),
 ('MATCH_SCAN_COST_REQUEST_PK'), ('MATCH_SCAN_COST_CRM_PK'),
 ('MATCH_SCAN_COST_PRIVATE_PORTFOLIO_PK'), ('MATCH_SCAN_COST_POOL_PROPERTY_PK'),
 ('COST_TALEP_YAYIN'), ('COST_TALEP_ACIL_EK'))
SELECT w.key, s.id IS NOT NULL AS mevcut,
 CASE WHEN jsonb_typeof(s."valueJson"::jsonb) = 'number'
        THEN (s."valueJson"::jsonb)::text
      WHEN jsonb_typeof(s."valueJson"::jsonb->'value') = 'number'
        THEN (s."valueJson"::jsonb->'value')::text
      WHEN (s."valueJson"::jsonb->>'value') ~ '^[0-9]+$'
        THEN s."valueJson"::jsonb->>'value'
      ELSE NULL END AS sayisal_deger,
 s."updatedAt"
FROM wanted w LEFT JOIN "SystemSetting" s ON s.key = w.key
ORDER BY w.key;
```

Ne doğrular: eksik/0 tarife, tür ayarının genel ayarı gölgelemesi. NULL, ham JSON'u açma gerekçesi değildir; kontrollü yönetim ekranından düzeltilir.

### 3 — C03: Tarife değişikliklerinin audit izi

```sql
SELECT "createdAt", "actorId" IS NOT NULL AS actor_kayitli,
 metadata->>'key' AS ayar,
 CASE WHEN (metadata->>'previousValue') ~ '^[0-9]+$'
      THEN metadata->>'previousValue' END AS eski_deger,
 CASE WHEN (metadata->>'newValue') ~ '^[0-9]+$'
      THEN metadata->>'newValue' END AS yeni_deger
FROM "AuditLog"
WHERE "entityType" = 'SystemSetting'
 AND metadata->>'key' IN ('COST_ESLESME_TARAMA','MATCH_SCAN_COST_PK',
 'MATCH_SCAN_COST_REQUEST_PK','MATCH_SCAN_COST_CRM_PK',
 'MATCH_SCAN_COST_PRIVATE_PORTFOLIO_PK','MATCH_SCAN_COST_POOL_PROPERTY_PK',
 'COST_TALEP_YAYIN','COST_TALEP_ACIL_EK')
ORDER BY "createdAt" DESC LIMIT 100;
```

Ne doğrular: kim bilgisi mevcut mu, ne zaman/eski/yeni tutuluyor mu. Actor kimliği ve IP/adres çıktılanmaz.

### 4 — C04: Tarama durumları, bekleyenler ve sıfır sonuç

```sql
SELECT "sourceType", status, count(*) AS adet,
 count(*) FILTER (WHERE status::text='PROCESSING'
   AND "startedAt" < now()-interval '2 minutes') AS eski_processing,
 count(*) FILTER (WHERE status::text='COMPLETED' AND "movementId" IS NULL) AS hareket_yok,
 count(*) FILTER (WHERE status::text='COMPLETED' AND "resultJson" IS NULL) AS rapor_yok
FROM "MatchScanAttempt"
WHERE "startedAt" >= now()-interval '30 days'
GROUP BY "sourceType", status ORDER BY "sourceType", status;

SELECT "sourceType", count(*) AS tamamlanan,
 count(*) FILTER (WHERE jsonb_typeof("resultJson"::jsonb->'matches')='array'
   AND "resultJson"::jsonb->'matches'='[]'::jsonb) AS sifir_sonuc,
 count(*) FILTER (WHERE cost=0) AS sifir_ucretli
FROM "MatchScanAttempt"
WHERE status::text='COMPLETED' AND "startedAt">=now()-interval '30 days'
GROUP BY "sourceType";
```

Ne doğrular: takılı işlem ve eksik rapor/hareket; sıfır sonuçlu ücretli tamamlanma ile teknik hatayı ayırır. Sayıların 0 olması beklenen sağlıklı durum için ilk göstergedir, tek başına bütünlük kanıtı değildir.

### 5 — C05: Kesinti–rapor bütünlüğü

```sql
SELECT
 count(*) AS tamamlanan,
 count(*) FILTER (WHERE h.id IS NULL) AS hareket_bulunamadi,
 count(*) FILTER (WHERE h.id IS NOT NULL AND
   (h."hareketTuru"::text<>'HARCAMA' OR h."islemTuru"::text<>'ESLESME_TARAMASI'
    OR h.miktar<>a.cost OR h."ilgiliKayitId" IS DISTINCT FROM a."requestId")) AS uyumsuz_hareket
FROM "MatchScanAttempt" a LEFT JOIN "KontorHareketi" h ON h.id=a."movementId"
WHERE a.status::text='COMPLETED' AND a."startedAt">=now()-interval '30 days';

SELECT count(*) AS raporu_tamamlanmamis_kesinti
FROM "KontorHareketi" h
WHERE h."islemTuru"::text='ESLESME_TARAMASI' AND h."hareketTuru"::text='HARCAMA'
 AND h."olusturulmaTarihi">=now()-interval '30 days'
 AND NOT EXISTS (SELECT 1 FROM "MatchScanAttempt" a
   WHERE a."requestId"=h."ilgiliKayitId" AND a.status::text='COMPLETED');
```

Ne doğrular: “PK kesilip rapor dönmedi” iddiasının finansal ayağı. Ofis cüzdanında kesinti kullanıcısı aktörden farklı olabildiği için userId=kullaniciId eşitliği varsayılmaz.

### 6 — C06: Aynı işlem için çoklu kesinti ve sık yeni tarama

```sql
SELECT count(*) AS birden_fazla_kesinti_anahtari
FROM (SELECT "ilgiliKayitId" FROM "KontorHareketi"
 WHERE "islemTuru"::text='ESLESME_TARAMASI' AND "hareketTuru"::text='HARCAMA'
  AND "ilgiliKayitId" IS NOT NULL
  AND "olusturulmaTarihi">=now()-interval '30 days'
 GROUP BY "ilgiliKayitId" HAVING count(*)>1) q;

SELECT count(*) AS ayni_gun_tekrar_taranan_kaynak
FROM (SELECT "userId","sourceType","sourceId",date_trunc('day',"startedAt")
 FROM "MatchScanAttempt" WHERE status::text='COMPLETED'
  AND "startedAt">=now()-interval '30 days'
 GROUP BY "userId","sourceType","sourceId",date_trunc('day',"startedAt")
 HAVING count(*)>1) q;
```

Ne doğrular: aynı anahtarla çift kesinti ile kullanıcının farklı requestId'lerle yeniden taramasını ayırır. İkinci sorgunun pozitif olması tek başına hata değildir; aynı gün sınırı DB oturum saat dilimine bağlıdır.

### 7 — C07: Bildirim modeli kopukluğu ve tekrarlar

```sql
SELECT "bildirimTuru","gonderildiMi","okunduMu",count(*) AS adet
FROM "LinaBildirim"
WHERE "bildirimTuru"='PAID_MATCH_SCAN_REQUIRED'
 AND "olusturulmaTarihi">=now()-interval '30 days'
GROUP BY "bildirimTuru","gonderildiMi","okunduMu";

SELECT count(*) AS tekrar_hatirlatma_grubu
FROM (SELECT "kullaniciId","ilgiliKayitId" FROM "LinaBildirim"
 WHERE "bildirimTuru"='PAID_MATCH_SCAN_REQUIRED'
  AND "olusturulmaTarihi">=now()-interval '30 days'
 GROUP BY "kullaniciId","ilgiliKayitId" HAVING count(*)>1) q;

SELECT type,"pushStatus",count(*) AS adet
FROM "NetworkNotification"
WHERE "createdAt">=now()-interval '30 days'
 AND (type LIKE '%MATCH%' OR type LIKE '%SCAN%' OR type LIKE '%ESLESME%')
GROUP BY type,"pushStatus";
```

Ne doğrular: hatırlatma Lina tablosunda birikiyor mu, mobilin okuduğu tabloda karşılığı var mı. Son sorgunun boş olması, farklı isimli olası canlı olayları dışlamaz; kaynak sürümüyle birlikte değerlendirilir.

### 8 — C08: Süresi dolmuş/çakışan onay taslakları

```sql
SELECT tur,durum,count(*) AS adet,
 count(*) FILTER (WHERE "gecerlilikTarihi"<now()) AS suresi_dolan
FROM "LinaTaslak"
WHERE tur IN ('ONAY_PLAN','MOTOR_AKSIYON','MOTOR_TALEP_MERKEZI','CRM_MUSTERI')
GROUP BY tur,durum ORDER BY tur,durum;

SELECT count(*) AS coklu_aktif_plan_grubu
FROM (SELECT "kullaniciId",tur FROM "LinaTaslak"
 WHERE durum IN ('AKTIF','ONAY_BEKLIYOR') AND "gecerlilikTarihi">now()
 GROUP BY "kullaniciId",tur HAVING count(*)>1) q;
```

Ne doğrular: taslak yaşam döngüsü ve olası paralel planlar; `alanlar/maskeEsleme` okunmaz. Sıfır sonuç yarış koşulunun imkânsız olduğunu kanıtlamaz.

### 9 — C09: Pasif LINA işlem türlerinde gerçekten harcama var mı

```sql
SELECT "islemTuru","hareketTuru",count(*) AS adet,sum(miktar) AS toplam_pk
FROM "KontorHareketi"
WHERE "islemTuru"::text IN ('LINA_ILAN_ACIKLAMASI','LINA_ILAN_DUZENLEME',
 'LINA_SESTEN_ILAN','FORUM_TALEP_OLUSTURMA')
 AND "olusturulmaTarihi">=now()-interval '30 days'
GROUP BY "islemTuru","hareketTuru";
```

Ne doğrular: eski LINA enumları canlıda başka sürüm/yol tarafından kullanılıyor mu. FORUM_TALEP_OLUSTURMA sayısı tek başına Lina kaynaklı harcamayı ayırmaz; normal mobil yayınları da kapsar.

### 10 — C10: Ofis/kardeş havuzunda olup genel havuz dışında kalan aday miktarı

```sql
SELECT count(*) AS aktif_birim,
 count(*) FILTER (WHERE NOT u."isPoolVisible" AND NOT u."hiddenFromOffice"
   AND (a."officeId" IS NOT NULL OR EXISTS
     (SELECT 1 FROM "Office" o WHERE o."ownerUserId"=p."ownerId" AND o."isActive")))
   AS ofis_icin_olasi_havuz_disi,
 count(*) FILTER (WHERE NOT u."isPoolVisible" AND u."sharedWithSisters"
   AND NOT u."hiddenFromOffice") AS kardes_paylasimli_havuz_disi,
 count(*) FILTER (WHERE u.price IS NULL OR u.price<=0) AS fiyat_eksik
FROM "Unit" u JOIN "Project" p ON p.id=u."projectId"
 JOIN "User" a ON a.id=p."ownerId"
WHERE p."isActive" AND NOT u."isOffMarket"
 AND u.status::text NOT IN ('PASIF','SATILDI','KIRALANDII');
```

Ne doğrular: mevcut tarama kapsamının dışında kalabilecek görünürlük gruplarının büyüklüğü. Aktif kardeş bağlantı/paket uygunluğu ve tek kullanıcının erişimi bu toplamdan çıkarılamaz.

### 11 — C11: Adres/şifre içermeyen Lina hata işaretleri

```bash
pm2 logs eph-backend --nostream --lines 3000 2>&1 \
 | grep -E 'OPENAI_RESPONSES_HTTP_|OPENAI_RESPONSES_TIMEOUT|OPENAI_EMPTY_RESPONSE|OPENAI_TRANSCRIPTION_HTTP_|OPENAI_TRANSCRIPTION_INVALID_JSON|LINA_SCOPE_CLASSIFIER_UNAVAILABLE|LINA_REQUEST_DRAFT_SCOPE_UNAVAILABLE|LINA_CRM_EXTRACTION_FAILED|LINA_CRM_COMMIT_FAILED|LINA_TURN_LOG_FAILED|LINA_OPENAI_TTS_BACKEND_ERROR' \
 | grep -Eiv 'password|passwd|secret|authorization|bearer|api[_-]?key|sk-|token|postgres(ql)?://|https?://|@|([0-9]{1,3}\.){3}[0-9]{1,3}' \
 | grep -Eo 'OPENAI_RESPONSES_HTTP_[0-9]{3}|OPENAI_RESPONSES_TIMEOUT:[0-9]+|OPENAI_EMPTY_RESPONSE|OPENAI_TRANSCRIPTION_HTTP_[0-9]{3}|OPENAI_TRANSCRIPTION_INVALID_JSON:[0-9]{3}|LINA_SCOPE_CLASSIFIER_UNAVAILABLE|LINA_REQUEST_DRAFT_SCOPE_UNAVAILABLE|LINA_CRM_EXTRACTION_FAILED|LINA_CRM_COMMIT_FAILED|LINA_TURN_LOG_FAILED|LINA_OPENAI_TTS_BACKEND_ERROR' \
 | sort | uniq -c
```

Ne doğrular: yalnız izinli işaretlerin sayısı; 401/403/429/5xx dağılımı, timeout ve çıkarım/kayıt sorunları. `grep -v` sır/adres olabilecek satırları eler; son `grep -o` yalnız işaretleri gösterir, hata detayını veya müşteri içeriğini göstermez. Bu nedenle filtrelenmiş/rotasyona uğramış logda boş çıktı “hata yok” demek değildir. Sağlayıcı kotası ile rate-limit'in kesin ayrımı bu maskeli çıktıdan yapılamaz.

### 12 — C12: Tetikleyici ve bildirim işlerinin hata işaretleri

```bash
pm2 logs eph-backend --nostream --lines 5000 2>&1 \
 | grep -E 'otomatik eşleştirme tamamlanamadı|Matching handler unavailable|EPH_NOTIFICATION_JOB|JOB_FAILED|DELIVERY_DEFERRED|EPH_NATIVE_PUSH_|EPH_PUSH_RECEIPT_' \
 | grep -Eiv 'password|passwd|secret|authorization|bearer|api[_-]?key|sk-|token|postgres(ql)?://|https?://|@|([0-9]{1,3}\.){3}[0-9]{1,3}' \
 | grep -Eo 'otomatik eşleştirme tamamlanamadı|Matching handler unavailable|EPH_NOTIFICATION_JOB|JOB_FAILED|DELIVERY_DEFERRED|EPH_NATIVE_PUSH_[A-Z_]+|EPH_PUSH_RECEIPT_[A-Z_]+' \
 | sort | uniq -c
```

Ne doğrular: callback/bildirim scheduler/push hata ipuçları. Başarı heartbeat'i yoksa “job çalıştı” sonucu üretmez. Kaynak bağlantısı ile canlı çalışmış olma ayrı kanıtlardır. Tüm komutlar yerel mevcut PM2 log tamponunu okur; restart, deploy veya ağ çağrısı yapma talimatı değildir.

## D. Teslim ve doğrulama sınırı

- Değişen: yalnız `D:/Projects/SM/docs/ai/RAPOR_EPH84.md`.
- Ek kontrol: her iki repoda `git diff --check` exit 0; mevcut dosyalar için LF/CRLF uyarıları alındı. Untracked rapor bu komutun kapsamına girmediğinden ayrıca referans/biçim kontrolünden geçirildi: 17 bulgu, 12 komut grubu; açık B:/M: dosya referanslarında bulunamayan dosya/satır yok.
- Yapılan: bağlayıcı kural ve AGENTS okuma; kapsamlı ama kaynak dizinleriyle sınırlı `rg -n` aramaları; satır numaralı kaynak/Prisma okumaları; dosya yolları ve referans kontrolü. `.bak` dosyalarının içeriği ve sır dosyaları okunmadı.
- Yapılmayan: kod değişikliği, commit/push, test/build, canlı sunucu/DB bağlantısı, API/AI çağrısı, cihaz testi, C komutlarının çalıştırılması. Bu rapor canlı doğrulama/PASS belgesi değildir.
- Öncelikli düzeltme sırası: §0 kapsamı → Lina ücretli yayın onayı → tarama özel yetkisi → bildirim teslimi → atomik onay/idempotency → süreler/tarife → kriter/kapsam ve tamamlanmamış akışlar.
