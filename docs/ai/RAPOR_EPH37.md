# RAPOR EPH-37 – Ofis sahibi panelinde başvurular görünmüyor

## 1) Bulgu
- Başvuru yazımı: `POST /office/join` → `requestJoin` → tablo `SystemSetting`, key `EPH_OFFICE_JOIN_{officeId}_{userId}`, valueJson `{ officeId, userId, status:'PENDING', requestedAt }`.
- Okuma: `GET /office/dashboard` → `dashboard()` aynı key önekini (`EPH_OFFICE_JOIN_{officeId}_`) okuyor. **Yazma/okuma anahtarı eşleşiyor**; kod seviyesinde kesin bir anahtar uyuşmazlığı yok.
- Başvuranın ekranındaki "onayı bekleniyor" yazısı POST yanıtının mesajıdır (kalıcı durum değil); kaydın DB'ye yazıldığını tek başına kanıtlamaz.
- Eski okuma, başvuruyu sessizce eleyen iki koşul taşıyordu:
  1. Prisma JSON-path filtresi (`valueJson.path['status'] = 'PENDING'`),
  2. `User.officeId = null` koşulu (başvuran başka/eski bir ofise bağlıysa liste boş dönüyordu, sebep gösterilmiyordu).
  Canlı veride hangisinin devrede olduğunu bu ortamdan göremiyorum (aşağıdaki SELECT'ler gerekli).
- Kapasite dolu sayımı başvuruyu gizlemiyordu; kapasite yalnız `decide` (onay) anında kontrol ediliyordu (limit: paket `agents` → abonelik `agents` → yoksa 5). Yani dolu kapasite "gizleme" sebebi değil; ama onaylarken hata veriyordu.
- Mobil liste/butonlar (`OfficeWorkspace.tsx`, "Bekleyen Danışman Başvuruları") zaten vardı; `memberId`/`approve` sözleşmesi backend ile uyumlu.

## 2) Düzeltme
- `office-management.service.ts`
  - Bekleyen başvurular önek ile çekilip JS'te `status==='PENDING'` filtreleniyor (JSON-path bağımlılığı kalktı).
  - `officeId` koşulu kaldırıldı: başvuran başka ofise bağlıysa bile görünür, `blockedReason: "Danışman başka bir ofise bağlı."` ile Onayla pasif.
  - Kapasite doluysa başvuru görünür, `capacityFull:true`, `blockedReason: "Kapasite dolu: paketinizde X danışman hakkı var."`.
  - Yeni `agentCapacity()` yardımcısı dashboard ve `decide` için tek kaynak; `decide` hata metni aynı cümleyi kullanıyor.
  - Yanıta `agentCapacity: { used, total, packageName }` (sahip hariç) eklendi; `memberCount` değişmedi. Başvuran `phone` alanı da döner.
- `OfficeWorkspace.tsx`: "Danışman: kullanılan / toplam (paket adı, ofis sahibi hariç)" satırı; `blockedReason` metni; blockedReason varsa Kabul Et pasif (Reddet açık).
- Test: `office-dashboard.spec.ts` içine "kapasite doluyken başvuru görünür" testi eklendi.

## 3) Doğrulama
- `npx jest src/office` → 5 suite, 99 test geçti.
- `npm run build` (backend) → exit 0.
- Mobil `npm run typecheck` → Exit code 0.
- Kapsam: yalnız yerel değişiklik; deploy/telefon testi yapılmadı. Commit atılmadı.
- Yedekler: `office-management.service.ts.bak-eph37`, `office-dashboard.spec.ts.bak-eph37`, `OfficeWorkspace.tsx.bak-eph37`.

## 4) Canlı veri için SELECT'ler (sen çalıştır)
```sql
-- Volarant Denizli ofis kimliği, sahibi
SELECT o.id, o.name, o."ownerUserId", u."firstName", u."lastName"
FROM "Office" o LEFT JOIN "User" u ON u.id = o."ownerUserId"
WHERE o.name ILIKE '%Volarant%';

-- Bu ofise yazılmış tüm başvurular (<OFFICE_ID> yerine yukarıdaki id)
SELECT key, "valueJson", "updatedAt" FROM "SystemSetting"
WHERE key LIKE 'EPH_OFFICE_JOIN_<OFFICE_ID>\_%' ESCAPE '\';

-- Son başvurular (ofis id bilinmiyorsa)
SELECT key, "valueJson", "updatedAt" FROM "SystemSetting"
WHERE key LIKE 'EPH_OFFICE_JOIN_%' ORDER BY "updatedAt" DESC LIMIT 20;

-- Başvuranın durumu (officeId dolu mu, rolü)
SELECT id, "firstName", "lastName", role, "officeId", "isApproved"
FROM "User" WHERE id IN (SELECT "valueJson"->>'userId' FROM "SystemSetting"
WHERE key LIKE 'EPH_OFFICE_JOIN_<OFFICE_ID>\_%' ESCAPE '\');

-- Abonelik ve paket kapasitesi
SELECT key, "valueJson" FROM "SystemSetting"
WHERE key = 'OFFICE_SUBSCRIPTION_<OFFICE_ID>' OR key = 'OFFICE_MEMBERSHIP_PACKAGES';

-- Ofisteki danışman sayısı (sahip hariç)
SELECT count(*) FROM "User"
WHERE "officeId" = '<OFFICE_ID>' AND role = 'EMLAKCI' AND id <> (SELECT "ownerUserId" FROM "Office" WHERE id = '<OFFICE_ID>');
```

## 5) Veri düzeltmesi (HAZIR, ÇALIŞTIRILMADI)
Yalnız, başvuru kaydı hiç yoksa ya da başka durumdaysa (ör. REJECTED/APPROVED) ve başvuran hâlâ ofissizse, kaydı yeniden PENDING yapmak için (id'leri doldur):
```sql
UPDATE "SystemSetting"
SET "valueJson" = jsonb_set("valueJson", '{status}', '"PENDING"')
WHERE key = 'EPH_OFFICE_JOIN_<OFFICE_ID>_<APPLICANT_USER_ID>';
```
Başvuran `officeId` başka ofise bağlıysa bu veri düzeltmesi onayı çözmez; önce o bağlantı ayrı değerlendirilmeli.

## 6) Kalan
- Kök neden canlı veri okunmadan kesinleşmedi (yukarıdaki iki eleme koşulundan biri olası). SELECT çıktıları gelince doğrulanır.
- Paket adı alanı paket kaydında `name`/`title` olarak aranıyor; yoksa abonelik `packageName`/`packageCode`, o da yoksa "Paket" yazar. Canlı paket JSON'unda gerçek alan adı SELECT ile teyit edilmeli.
- Backend deploy edilmeden mobil değişiklik tek başına etkisiz (yeni alanlar sunucudan gelir).
