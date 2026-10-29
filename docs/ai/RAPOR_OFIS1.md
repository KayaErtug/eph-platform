# RAPOR OFIS-1 — GET /office/dashboard sözleşmesi + kırık testler

Kapsam: yerel backend (`D:\Projects\SM\backend`). Canlıya **deploy edilmedi**.

## Yapılan
**Dashboard (`office-management.service.ts`)** — mevcut alanlar aynen duruyor, yalnız ekleme yapıldı:

| Alan | Kime | Kaynak |
|---|---|---|
| `hierarchy[]` `{officeName, roleTitle, fullName, userId}` | ofis sahibi + danışmanlar | ofis sahibi ("Ofis Sahibi") + ofisteki aktif EMLAKCI'lar ("Emlak Danışmanı") |
| `allMembers[]` (Member: id, firstName, lastName, phone, isApproved, isVerified, roleTitle, canScan, canAutoSpend, hasSharedPoolAccess, teams[]) | yalnız ofis sahibi | ofis danışmanları (sahip hariç) |
| `teams[]` `{id, name, leaderId, leaderName, memberCount, members[{id,firstName,lastName}]}` | yalnız ofis sahibi | aktif takımlar + aktif üyeler + lider |
| `maxTeams` | yalnız ofis sahibi | `resolveMaxTeams` (EPH-24A), yeni `maxTeamsFor()` yardımcısı; `createTeam` da aynı yardımcıyı kullanıyor (iki yerde kopya kalmadı) |
| `permissions` `{scanPermissions, autoSpendPermissions, allowedSharedPoolUserIds, allowedSharedPoolTeamIds}` | yalnız ofis sahibi | `EPH_OFFICE_SPENDING_<id>` |

Kararlar:
- `canScan` = `scanPermissions[id] !== false`, `canAutoSpend` = `autoSpendPermissions[id] !== false` (backend `resolveOfficeWallet` / `ensureScanAuthorized` ile aynı: kayıt yoksa izinli). Mobildeki "undefined → false" varsayımı yerine gerçek davranış gösterilir.
- `hasSharedPoolAccess`: kısıt listesi boşsa herkes true; doluysa kullanıcı listesi veya takım üyeliğine göre.
- Telefon, takım, yetki gibi veriler ofis sahibi olmayan danışmana **gönderilmez** (yalnız `hierarchy`: ad + unvan).
- `dashboard()` / `owned()` mantığı, §0 ve diğer davranışlar değişmedi (§0 düzeltmesi ayrı iş).

**Testler (17 → 0 kırık)** — yalnız mock'lar; test beklentileri değişmedi:
- `office-management.spec.ts`: tüm mock kullanıcılara `capabilities: []`, sahibe `OFFICE_OWNER`.
- `office-profile.spec.ts`: sahip mock'una `OFFICE_OWNER`; fixture'a `db.team.findMany` (yeni sorgu için); logo yolu regex'i Windows'ta da geçsin diye `[\\/]` (platform bağımsızlık, davranış aynı).
- `grup5_6-verification.spec.ts`: Task 20 testine sahip kullanıcı + `OFFICE_OWNER`.
- **Not:** `office-profile.spec.ts:27` ("super başka sahibin ofisini düzenleyemez") hâlâ §0'ın tersini kilitliyor; Bulgu 1 işinde güncellenecek.

## Doğrulanan
- `npm run build` (D:\Projects\SM\backend) → Exit code 0
- `npx jest src/office` → Test Suites 4 passed / Tests 93 passed, Exit code 0
- `npx jest` (tam) → Test Suites 97 passed / Tests 1116 passed

## Değişen dosyalar (commit)
- `backend/src/office/office-management.service.ts`
- `backend/src/office/office-management.spec.ts`
- `backend/src/office/office-profile.spec.ts`
- `backend/src/office/grup5_6-verification.spec.ts`
- Yedekler (commit dışı): `*.bak-ofis1`

## Deploy dosya listesi (sunucuya gidecek)
Yalnız derlenmiş çıktı gerekir; kaynak: `backend/src/office/office-management.service.ts` → `dist/office/office-management.service.js` (+ `.d.ts`, `.js.map`). Spec dosyaları deploy edilmez. Şema/migration yok. Deploy ve PM2 restart Mustafa abinin onayına bağlı (§7).

## Kalan
- Canlı sunucudaki `office-management.service` sürümü kontrol edilmedi; canlıda dashboard zaten bu alanları dönüyorsa üzerine yazmadan önce karşılaştırın.
- Mobil tarafta değişiklik yapılmadı; gerçek cihazda Takım/Yetki akordeonları denenmedi.
