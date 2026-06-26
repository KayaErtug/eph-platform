# EPH Otomatik Genel Denetim Raporu V4 — desktop-chromium

Tarih: 24.06.2026 06:42:42
Login Durumu: ENV_LOGIN_YOK

## Dashboard

✅ OK: 4  ⚠️ UYARI: 8  🔴 KRİTİK: 29

- Toplam route: 41
- Geri tuşu eksik görünen: 19
- Kritik rotalar: /, /admin/audit-log, /admin/help-center, /admin/katilim-talepleri, /admin/onay-sayfasi, /admin/referrals, /admin/reports, /admin/settings, /admin/system-messages, /admin/turan
- Uyarılı rotalar: /admin, /admin/announcements, /admin/organization, /admin/portfolio-approvals, /admin/users, /kontor, /kvkk, /platform-anayasasi

## Route Denetimi

| Durum | Route | HTTP | Final URL | Buton | Aktif | Disabled | Link | Geri | Screenshot | Notlar |
|---|---|---:|---|---:|---:|---:|---:|---|---|---|
| KRITIK | / | 200 | http://localhost:3000/ | 2 | 2 | 0 | 15 | GEREKMEZ | test-results\screenshots\desktop-chromium\root.png | PAGE_ERROR |
| UYARI | /admin | 200 | http://localhost:3000/admin | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin.png | GERI_TUSU_YOK |
| UYARI | /admin/announcements | 200 | http://localhost:3000/admin/announcements | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_announcements.png | GERI_TUSU_YOK |
| KRITIK | /admin/audit-log | 200 | http://localhost:3000/admin/audit-log | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_audit-log.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/help-center | 200 | http://localhost:3000/admin/help-center | 4 | 4 | 0 | 13 | VAR | test-results\screenshots\desktop-chromium\admin_help-center.png | PAGE_ERROR, FAILED_REQUEST |
| KRITIK | /admin/katilim-talepleri | 200 | http://localhost:3000/admin/katilim-talepleri | 7 | 7 | 0 | 1 | VAR | test-results\screenshots\desktop-chromium\admin_katilim-talepleri.png | PAGE_ERROR, FAILED_REQUEST |
| KRITIK | /admin/onay-sayfasi | 200 | http://localhost:3000/admin/onay-sayfasi | 12 | 12 | 0 | 1 | VAR | test-results\screenshots\desktop-chromium\admin_onay-sayfasi.png | PAGE_ERROR, CONSOLE_ERROR |
| UYARI | /admin/organization | 200 | http://localhost:3000/admin/organization | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_organization.png | GERI_TUSU_YOK |
| UYARI | /admin/portfolio-approvals | 200 | http://localhost:3000/admin/portfolio-approvals | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_portfolio-approvals.png | GERI_TUSU_YOK |
| KRITIK | /admin/referrals | 200 | http://localhost:3000/admin/referrals | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_referrals.png | BOS_SAYFA_RISKI, GERI_TUSU_YOK |
| KRITIK | /admin/reports | 200 | http://localhost:3000/admin/reports | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_reports.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/settings | 200 | http://localhost:3000/admin/settings | 6 | 6 | 0 | 11 | VAR | test-results\screenshots\desktop-chromium\admin_settings.png | PAGE_ERROR |
| KRITIK | /admin/system-messages | 200 | http://localhost:3000/admin/system-messages | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_system-messages.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /admin/turan | 200 | http://localhost:3000/admin/turan | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_turan.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| UYARI | /admin/users | 200 | http://localhost:3000/admin/users | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\admin_users.png | GERI_TUSU_YOK |
| KRITIK | /cerez-politikasi | 200 | http://localhost:3000/cerez-politikasi | 10 | 7 | 3 | 3 | YOK | test-results\screenshots\desktop-chromium\cerez-politikasi.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /crm | 200 | http://localhost:3000/crm | 15 | 12 | 3 | 7 | VAR | test-results\screenshots\desktop-chromium\crm.png | PAGE_ERROR |
| OK | /crm/office-owner | 200 | http://localhost:3000/crm/office-owner | 5 | 5 | 0 | 5 | VAR | - | - |
| KRITIK | /crm/team-leader | 200 | http://localhost:3000/crm/team-leader | 5 | 5 | 0 | 5 | VAR | test-results\screenshots\desktop-chromium\crm_team-leader.png | PAGE_ERROR |
| KRITIK | /dashboard | 200 | http://localhost:3000/dashboard | 14 | 11 | 3 | 7 | VAR | test-results\screenshots\desktop-chromium\dashboard.png | PAGE_ERROR |
| KRITIK | /forum-v3 | 200 | http://localhost:3000/forum-v3 | 12 | 12 | 0 | 21 | VAR | test-results\screenshots\desktop-chromium\forum-v3.png | PAGE_ERROR, FAILED_REQUEST |
| KRITIK | /giris | 200 | http://localhost:3000/giris | 2 | 2 | 0 | 1 | GEREKMEZ | test-results\screenshots\desktop-chromium\giris.png | PAGE_ERROR |
| KRITIK | /gizlilik-politikasi | 200 | http://localhost:3000/gizlilik-politikasi | 0 | 0 | 0 | 1 | YOK | test-results\screenshots\desktop-chromium\gizlilik-politikasi.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /havuz | 200 | http://localhost:3000/havuz | 5 | 5 | 0 | 5 | VAR | test-results\screenshots\desktop-chromium\havuz.png | PAGE_ERROR, CONSOLE_ERROR |
| KRITIK | /help-center | 200 | http://localhost:3000/help-center | 6 | 6 | 0 | 10 | VAR | test-results\screenshots\desktop-chromium\help-center.png | PAGE_ERROR |
| KRITIK | /kayit | 200 | http://localhost:3000/kayit | 3 | 3 | 0 | 1 | GEREKMEZ | test-results\screenshots\desktop-chromium\kayit.png | PAGE_ERROR, CONSOLE_ERROR |
| UYARI | /kontor | 200 | http://localhost:3000/kontor | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\kontor.png | GERI_TUSU_YOK |
| KRITIK | /kullanici-sozlesmesi | 200 | http://localhost:3000/kullanici-sozlesmesi | 11 | 8 | 0 | 3 | YOK | test-results\screenshots\desktop-chromium\kullanici-sozlesmesi.png | PAGE_ERROR, GERI_TUSU_YOK |
| UYARI | /kvkk | 200 | http://localhost:3000/kvkk | 0 | 0 | 0 | 1 | YOK | test-results\screenshots\desktop-chromium\kvkk.png | GERI_TUSU_YOK |
| KRITIK | /lina | 200 | http://localhost:3000/lina | 17 | 16 | 1 | 0 | VAR | test-results\screenshots\desktop-chromium\lina.png | PAGE_ERROR, CONSOLE_ERROR, FAILED_REQUEST |
| KRITIK | /market | 200 | http://localhost:3000/market | 23 | 20 | 3 | 2 | YOK | test-results\screenshots\desktop-chromium\market.png | PAGE_ERROR, GERI_TUSU_YOK |
| OK | /messages | 200 | http://localhost:3000/messages | 5 | 5 | 0 | 5 | VAR | - | - |
| KRITIK | /network | 200 | http://localhost:3000/network | 34 | 34 | 0 | 5 | VAR | test-results\screenshots\desktop-chromium\network.png | PAGE_ERROR, CONSOLE_ERROR |
| OK | /notification-settings | 200 | http://localhost:3000/notification-settings | 20 | 20 | 0 | 2 | VAR | - | - |
| UYARI | /platform-anayasasi | 200 | http://localhost:3000/platform-anayasasi | 2 | 2 | 0 | 1 | YOK | test-results\screenshots\desktop-chromium\platform-anayasasi.png | GERI_TUSU_YOK |
| KRITIK | /portfoy | 200 | http://localhost:3000/portfoy | 4 | 4 | 0 | 5 | VAR | test-results\screenshots\desktop-chromium\portfoy.png | PAGE_ERROR |
| KRITIK | /portfoy/quality | 200 | http://localhost:3000/portfoy/quality | 4 | 4 | 0 | 5 | VAR | test-results\screenshots\desktop-chromium\portfoy_quality.png | PAGE_ERROR, FAILED_REQUEST |
| KRITIK | /profil | 200 | http://localhost:3000/profil | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\profil.png | BOS_SAYFA_RISKI, PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| OK | /stok | 200 | http://localhost:3000/portfoy | 6 | 6 | 0 | 5 | VAR | - | - |
| KRITIK | /ucretlendirme | 200 | http://localhost:3000/ucretlendirme | 15 | 15 | 0 | 0 | YOK | test-results\screenshots\desktop-chromium\ucretlendirme.png | 500_METNI, GERI_TUSU_YOK |
| KRITIK | /uyelik | 200 | http://localhost:3000/uyelik | 5 | 5 | 0 | 7 | VAR | test-results\screenshots\desktop-chromium\uyelik.png | 500_METNI, PAGE_ERROR |

## Hata Detayları

### /
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /admin/audit-log
- PageError: Invalid or unexpected token

### /admin/help-center
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/chunks/app/giris/page.js

### /admin/katilim-talepleri
- Console: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used: - A
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/2155d6170c428a7d.webpack.hot-update.json / net::ERR_ABORTED http://localhost:3001/admin/katilim-talepleri?status=all

### /admin/onay-sayfasi
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /admin/reports
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /admin/settings
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /admin/system-messages
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.ad7b354664c12ca2.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.ad7b354664c12ca2.hot-update.js

### /admin/turan
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.b109b4e461ddef27.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.b109b4e461ddef27.hot-update.js

### /cerez-politikasi
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /crm
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /crm/team-leader
- PageError: Invalid or unexpected token

### /dashboard
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /forum-v3
- PageError: Internal Next.js error: Router action dispatched before initialization. / Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/81dee10d4e675a7d.webpack.hot-update.json

### /giris
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /gizlilik-politikasi
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.68aba89b53c8cd47.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.68aba89b53c8cd47.hot-update.js

### /havuz
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /help-center
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /kayit
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /kullanici-sozlesmesi
- PageError: Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.6bee3c7d69b0cd44.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.6bee3c7d69b0cd44.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/css/app/layout.css?v=1782272509653

### /kvkk
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.6bee3c7d69b0cd44.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.6bee3c7d69b0cd44.hot-update.js / net::ERR_ABORTED http://localhost:3000/kvkk?_rsc=AjjGGrZCAD9y2oge

### /lina
- Console: Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- PageError: Unexpected end of JSON input
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.cbb6eea1898b0f7d.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/38583ae11ddf0e41.webpack.hot-update.json / net::ERR_ABORTED http://localhost:3000/lina?_rsc=vy54cyhb-ObH4P4p

### /market
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /network
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /portfoy
- PageError: Invalid or unexpected token

### /portfoy/quality
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.462e8868a8205c3a.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/chunks/app/giris/page.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.462e8868a8205c3a.hot-update.js

### /profil
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.462e8868a8205c3a.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.462e8868a8205c3a.hot-update.js

### /uyelik
- PageError: Invalid or unexpected token

## Güvenli Buton Denetimi

| Route | # | Buton | Sonuç | Not |
|---|---:|---|---|---|
| / | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /giris | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /dashboard | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /crm | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /portfoy | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /havuz | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /messages | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /kontor | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /lina | 1 | Geri dön | OK | Aynı sayfada kaldı. |
| /profil | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |

## Robot Kuralı

- Sil / Onayla / Reddet / Havuza Gönder / Kontör harcayan işlemler güvenli modda tıklanmaz.
- Auth gereken sayfalar login ENV yoksa AUTH_REDIRECT olarak raporlanır.
- Robot otomatik kod onarımı yapmaz; rapor sonrası tam dosya yöntemiyle güvenli düzeltme yapılır.