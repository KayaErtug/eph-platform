# OFIS-1 — Backend dashboard sözleşmesi

Tarih: 2026-10-30. Kaynak: RAPOR_OFIS_DENETIM.md Bulgu 2 ve 3.

## Değişen dosyalar

Bu oturumda değiştirilen/oluşturulan dosyalar (SM köküne göre):

- `backend/src/office/office-management.service.ts`: sahip yanıtında eksik kalan `hierarchy` eklendi; mevcut `members` satırlarına `canScan`, `canAutoSpend`, `teams` eklendi. Mevcut üye listesi, kimlik, onay/doğrulama, bakiye ve diğer alanlar korunur. `allMembers` ad/soyad alanları mobilin string tipiyle uyumludur.
- `backend/src/office/office-dashboard.spec.ts`: 5 yeni regresyon testi; sahip sözleşmesi, aktif takım/üyelik sorgusu, lider, danışman listesi, yetkiler, hiyerarşi, sıfır/dinamik kota, EPH-24A kapasite yedeği ve danışman erişim sınırı.
- `docs/ai/RAPOR_OFIS1.md`: bu rapor.

Başlangıç durumunda `69b4f664` commit'i zaten vardı (`fix(OFIS-1): office dashboard teams/maxTeams/allMembers/hierarchy/permissions, 17 test mock'u`). Bu oturum commit oluşturmadı; git index/commit işlemi yapılmadı. Önceden mevcut aşağıdaki dosyalardaki mock düzeltmeleri yeniden yazılmadı, mevcut testlerle doğrulandı:

- `backend/src/office/office-management.spec.ts`: sahibin `capabilities: [{ capability: 'OFFICE_OWNER' }]`, diğer mock kullanıcıların `capabilities: []` alanları mevcut.
- `backend/src/office/office-profile.spec.ts`: sahip yeteneği ve boş takım mock'u mevcut. Eski `.bak-ofis1` ile karşılaştırmada önceden eklenmiş Windows/Linux dosya yolu regex uyarlaması da görüldü; bu oturum değiştirmedi.
- `backend/src/office/grup5_6-verification.spec.ts`: görev oluşturma sahibinde `OFFICE_OWNER` mock'u mevcut.

## Okunan mobil sözleşme

Kaynak: `D:/Projects/eph-mobile-final/src/components/OfficeWorkspace.tsx`, satır 30–81. Mobil dosyaya yazılmadı.

- `teams?: OfficeTeam[]`: `id: string`, `name: string`, `leaderId: string | null`, `leaderName: string | null`, `memberCount: number`, `members: { id: string; firstName: string; lastName: string }[]`.
- `maxTeams?: number`: mevcut `maxTeamsFor` → `resolveMaxTeams` (`office-team-quota.ts`, EPH-24A). `OFFICE_SUBSCRIPTION_<id>` üzerinden paket kodu, `OFFICE_MEMBERSHIP_PACKAGES` üzerinden paket kotası okunur; mevcut kapasite yedeği korunur. Yeni sabit kota eklenmedi; yapılandırılmış 0 geçerlidir.
- `allMembers?: Member[]`: ofisin EMLAKCI danışmanları, sahip hariç. `Member`: zorunlu `id/firstName/lastName: string`; isteğe bağlı `phone: string | null`, `isApproved/isVerified/canScan/canAutoSpend/hasSharedPoolAccess: boolean`, `roleTitle: string`, `teams: { id: string; name: string }[]`.
- `hierarchy?: { officeName: string; roleTitle: string; fullName: string; userId?: string | null }[]`: sahip ve danışmanlar; hem sahip hem ofise bağlı danışman yanıtında.
- `permissions?`: `scanPermissions/autoSpendPermissions?: Record<string, boolean>`, `allowedSharedPoolUserIds/allowedSharedPoolTeamIds?: string[]`.

Takım, kota, tüm danışmanlar ve izin haritaları mevcut sahip erişim sınırında kalır. Takımlar ofise ait ve aktif; takım üyelikleri aktif filtrelenir. `canScan` ve `canAutoSpend`, mevcut politikanın `!== false` davranışını yansıtır; veri yokken mobilin varsayımına bırakılmaz. İzin ve ortak havuz erişimi mevcut `EPH_OFFICE_SPENDING_<id>` verisinden hesaplanır.

## Yeni alanların örnek JSON'u

Aşağıdaki örnek temsili test verisidir; canlı API yanıtı değildir. `offices[0]` alanlarının ilgili bölümü gösterilmiştir; diğer mevcut alanlar yanıtta korunur.

```json
{
  "actorId": "owner",
  "requiresOffice": false,
  "canCreate": false,
  "offices": [
    {
      "id": "office",
      "name": "Test Ofisi",
      "isOwner": true,
      "maxTeams": 4,
      "teams": [
        {
          "id": "team",
          "name": "Takım",
          "leaderId": "advisor",
          "leaderName": "Test Danışman",
          "memberCount": 1,
          "members": [{ "id": "advisor", "firstName": "Test", "lastName": "Danışman" }]
        }
      ],
      "allMembers": [
        {
          "id": "advisor",
          "firstName": "Test",
          "lastName": "Danışman",
          "phone": null,
          "isApproved": true,
          "isVerified": true,
          "roleTitle": "Emlak Danışmanı",
          "canScan": false,
          "canAutoSpend": false,
          "hasSharedPoolAccess": true,
          "teams": [{ "id": "team", "name": "Takım" }]
        }
      ],
      "hierarchy": [
        { "officeName": "Test Ofisi", "roleTitle": "Ofis Sahibi", "fullName": "Ofis Sahibi", "userId": "owner" },
        { "officeName": "Test Ofisi", "roleTitle": "Emlak Danışmanı", "fullName": "Test Danışman", "userId": "advisor" }
      ],
      "permissions": {
        "scanPermissions": { "advisor": false },
        "autoSpendPermissions": { "advisor": false },
        "allowedSharedPoolUserIds": [],
        "allowedSharedPoolTeamIds": ["team"]
      }
    }
  ]
}
```

Mevcut `members` satırları da danışman için `canScan: false`, `canAutoSpend: false`, `teams: [{ id: "team", name: "Takım" }]` alanlarını içerir.

## Yedek

Değişiklik öncesi alınan yeni yedek:

`backend/src/office/office-management.service.ts.ofis1-20261030-010852.bak`

Önceden bulunan dört `.bak-ofis1` yedeği korunmuştur; üzerine yazılmamıştır. Yeni oluşturulan test dosyasının önceki sürümü yoktur. Mevcut rapor bu oturumun doğrulanmış sonuçlarıyla güncellenmiştir.

## Doğrulanan

Çalışma dizini: `D:/Projects/SM/backend`.

- `npm run build` → **Exit 0**. `prisma generate && nest build`; Prisma Client v6.19.3 üretildi, derleme hatasız tamamlandı.
- İstenen yalın `npx jest src/office` → **Exit 1**, testler başlamadan ortamın worker process başlatma kısıtı: `Error: spawn EPERM`.
- Aynı kapsam `npx jest src/office --runInBand` → **Exit 0**:

```text
Test Suites: 5 passed, 5 total
Tests:       98 passed, 98 total
Snapshots:   0 total
Time:        8.245 s
Ran all test suites matching src/office.
```

- Yeni testlerden önce mevcut ofis kapsamı da 4 paket / 93 test ile Exit 0 verdi. Denetimde bildirilen mock kaynaklı kırık testler mevcut koşuda geçmektedir.
- `git diff --check` → hata yok. Git yalnız okuma/karşılaştırma için kullanıldı.
- Mobil `OfficeWorkspace.tsx` değişiklik öncesi/sonrası aynı SHA256: `3949CF9642A776510A0C8963C74E36A954F1FC6B331C196D5EA987D74BD44B25`.

## Kalan

Yerel backend doğrulandı. Canlıya alma, canlı DB/API ve gerçek cihazda takım oluşturma bu görevin parçası olarak çalıştırılmadı. Bulgu 1 (süper admin yetkisi) bu görevde değiştirilmedi; mevcut test davranışları korundu.
