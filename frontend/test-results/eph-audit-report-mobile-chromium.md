# EPH Otomatik Genel Denetim Raporu V4 — mobile-chromium

Tarih: 24.06.2026 06:40:59
Login Durumu: ENV_LOGIN_YOK

## Dashboard

✅ OK: 6  ⚠️ UYARI: 2  🔴 KRİTİK: 33

- Toplam route: 41
- Geri tuşu eksik görünen: 20
- Kritik rotalar: /, /admin, /admin/announcements, /admin/audit-log, /admin/help-center, /admin/onay-sayfasi, /admin/organization, /admin/portfolio-approvals, /admin/referrals, /admin/reports
- Uyarılı rotalar: /crm, /network

## Route Denetimi

| Durum | Route | HTTP | Final URL | Buton | Aktif | Disabled | Link | Geri | Screenshot | Notlar |
|---|---|---:|---|---:|---:|---:|---:|---|---|---|
| KRITIK | / | 200 | http://localhost:3000/ | 3 | 3 | 0 | 15 | GEREKMEZ | test-results\screenshots\mobile-chromium\root.png | PAGE_ERROR |
| KRITIK | /admin | 200 | http://localhost:3000/admin | 5 | 6 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/announcements | 200 | http://localhost:3000/admin/announcements | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_announcements.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /admin/audit-log | 200 | http://localhost:3000/admin/audit-log | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_audit-log.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /admin/help-center | 200 | http://localhost:3000/admin/help-center | 15 | 12 | 3 | 15 | VAR | test-results\screenshots\mobile-chromium\admin_help-center.png | PAGE_ERROR |
| OK | /admin/katilim-talepleri | 200 | http://localhost:3000/admin/katilim-talepleri | 8 | 8 | 0 | 1 | VAR | - | - |
| KRITIK | /admin/onay-sayfasi | 200 | http://localhost:3000/admin/onay-sayfasi | 12 | 12 | 0 | 1 | VAR | test-results\screenshots\mobile-chromium\admin_onay-sayfasi.png | PAGE_ERROR, CONSOLE_ERROR |
| KRITIK | /admin/organization | 200 | http://localhost:3000/admin/organization | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_organization.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /admin/portfolio-approvals | 200 | http://localhost:3000/admin/portfolio-approvals | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_portfolio-approvals.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /admin/referrals | 200 | http://localhost:3000/admin/referrals | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_referrals.png | BOS_SAYFA_RISKI, PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/reports | 200 | http://localhost:3000/admin/reports | 6 | 6 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_reports.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/settings | 200 | http://localhost:3000/admin/settings | 6 | 6 | 0 | 11 | VAR | test-results\screenshots\mobile-chromium\admin_settings.png | PAGE_ERROR |
| KRITIK | /admin/system-messages | 200 | http://localhost:3000/admin/system-messages | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_system-messages.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/turan | 200 | http://localhost:3000/admin/turan | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_turan.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /admin/users | 200 | http://localhost:3000/admin/users | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\admin_users.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /cerez-politikasi | 200 | http://localhost:3000/cerez-politikasi | 1 | 1 | 0 | 1 | YOK | test-results\screenshots\mobile-chromium\cerez-politikasi.png | PAGE_ERROR, GERI_TUSU_YOK |
| UYARI | /crm | 200 | http://localhost:3000/crm | 5 | 5 | 0 | 5 | VAR | test-results\screenshots\mobile-chromium\crm.png | CONSOLE_ERROR |
| OK | /crm/office-owner | 200 | http://localhost:3000/crm/office-owner | 5 | 5 | 0 | 5 | VAR | - | - |
| OK | /crm/team-leader | 200 | http://localhost:3000/crm/team-leader | 4 | 4 | 0 | 5 | VAR | - | - |
| OK | /dashboard | 200 | http://localhost:3000/dashboard | 5 | 5 | 0 | 5 | VAR | - | - |
| KRITIK | /forum-v3 | 200 | http://localhost:3000/forum-v3 | 12 | 12 | 0 | 21 | VAR | test-results\screenshots\mobile-chromium\forum-v3.png | PAGE_ERROR, FAILED_REQUEST |
| KRITIK | /giris | 200 | http://localhost:3000/giris | 2 | 2 | 0 | 1 | GEREKMEZ | test-results\screenshots\mobile-chromium\giris.png | PAGE_ERROR, CONSOLE_ERROR, FAILED_REQUEST |
| KRITIK | /gizlilik-politikasi | 200 | http://localhost:3000/gizlilik-politikasi | 2 | 2 | 0 | 1 | YOK | test-results\screenshots\mobile-chromium\gizlilik-politikasi.png | PAGE_ERROR, GERI_TUSU_YOK |
| KRITIK | /havuz | 200 | http://localhost:3000/havuz | 6 | 6 | 0 | 5 | VAR | test-results\screenshots\mobile-chromium\havuz.png | PAGE_ERROR |
| KRITIK | /help-center | 200 | http://localhost:3000/help-center | 6 | 6 | 0 | 10 | VAR | test-results\screenshots\mobile-chromium\help-center.png | PAGE_ERROR, CONSOLE_ERROR |
| KRITIK | /kayit | 200 | http://localhost:3000/kayit | 3 | 3 | 0 | 1 | GEREKMEZ | test-results\screenshots\mobile-chromium\kayit.png | PAGE_ERROR, CONSOLE_ERROR |
| KRITIK | /kontor | 200 | http://localhost:3000/kontor | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\kontor.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /kullanici-sozlesmesi | 200 | http://localhost:3000/kullanici-sozlesmesi | 2 | 2 | 0 | 1 | YOK | test-results\screenshots\mobile-chromium\kullanici-sozlesmesi.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /kvkk | 200 | http://localhost:3000/kvkk | 2 | 2 | 0 | 1 | YOK | test-results\screenshots\mobile-chromium\kvkk.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /lina | 200 | http://localhost:3000/lina | 17 | 16 | 1 | 0 | VAR | test-results\screenshots\mobile-chromium\lina.png | PAGE_ERROR, CONSOLE_ERROR |
| KRITIK | /market | 200 | http://localhost:3000/market | 15 | 15 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\market.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /messages | 200 | http://localhost:3000/messages | 4 | 4 | 0 | 5 | VAR | test-results\screenshots\mobile-chromium\messages.png | PAGE_ERROR, FAILED_REQUEST |
| UYARI | /network | 200 | http://localhost:3000/network | 34 | 34 | 0 | 5 | VAR | test-results\screenshots\mobile-chromium\network.png | CONSOLE_ERROR |
| KRITIK | /notification-settings | 200 | http://localhost:3000/notification-settings | 5 | 5 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\notification-settings.png | PAGE_ERROR, CONSOLE_ERROR, GERI_TUSU_YOK |
| KRITIK | /platform-anayasasi | 200 | http://localhost:3000/platform-anayasasi | 0 | 0 | 0 | 1 | YOK | test-results\screenshots\mobile-chromium\platform-anayasasi.png | PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| OK | /portfoy | 200 | http://localhost:3000/portfoy | 5 | 5 | 0 | 5 | VAR | - | - |
| KRITIK | /portfoy/quality | 200 | http://localhost:3000/portfoy/quality | 5 | 5 | 0 | 5 | VAR | test-results\screenshots\mobile-chromium\portfoy_quality.png | PAGE_ERROR |
| KRITIK | /profil | 200 | http://localhost:3000/profil | 4 | 4 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\profil.png | BOS_SAYFA_RISKI, PAGE_ERROR, CONSOLE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| OK | /stok | 200 | http://localhost:3000/portfoy | 5 | 5 | 0 | 5 | VAR | - | - |
| KRITIK | /ucretlendirme | 200 | http://localhost:3000/ucretlendirme | 13 | 13 | 0 | 0 | YOK | test-results\screenshots\mobile-chromium\ucretlendirme.png | 500_METNI, PAGE_ERROR, FAILED_REQUEST, GERI_TUSU_YOK |
| KRITIK | /uyelik | 200 | http://localhost:3000/uyelik | 4 | 4 | 0 | 7 | VAR | test-results\screenshots\mobile-chromium\uyelik.png | 500_METNI, PAGE_ERROR, FAILED_REQUEST |

## Hata Detayları

### /
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /admin
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /admin/announcements
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/d1e068cc9ce143be.webpack.hot-update.json / net::ERR_ABORTED http://localhost:3000/giris?_rsc=Yubvwfy9f-RtVnpR / net::ERR_ABORTED http://localhost:3000/_next/static/chunks/app/giris/page.js

### /admin/audit-log
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization. / Unexpected end of input
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.abae574bcd80920b.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.abae574bcd80920b.hot-update.js

### /admin/help-center
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /admin/onay-sayfasi
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /admin/organization
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Internal Next.js error: Router action dispatched before initialization. / Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/giris?_rsc=pn6KDUEgksmMWucH / net::ERR_ABORTED http://localhost:3000/__nextjs_original-stack-frames / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.2406fb10c1fbc4b1.hot-update.js

### /admin/portfolio-approvals
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Internal Next.js error: Router action dispatched before initialization. / Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/giris?_rsc=zhCs4S_XExb_uwqB / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.5492ef8724e0bc5a.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.5492ef8724e0bc5a.hot-update.js

### /admin/referrals
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /admin/reports
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /admin/settings
- PageError: Internal Next.js error: Router action dispatched before initialization.

### /admin/system-messages
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.

### /admin/turan
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.

### /admin/users
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /cerez-politikasi
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /crm
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th

### /forum-v3
- Console: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used: - A
- PageError: Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.0fe9d58e3c736bc8.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.0fe9d58e3c736bc8.hot-update.js

### /giris
- Console: Failed to load resource: the server responded with a status of 500 (Internal Server Error) / Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Unexpected end of JSON input / Unexpected end of input / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.f2b9e1caed5c1fbe.hot-update.js / net::ERR_ABORTED http://localhost:3000/__nextjs_original-stack-frames / net::ERR_ABORTED http://localhost:3000/giris

### /gizlilik-politikasi
- PageError: Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/css/app/layout.css?v=1782272387249 / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/518c666be2990a34.webpack.hot-update.json

### /havuz
- PageError: Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/css/app/layout.css?v=1782272387227 / net::ERR_ABORTED http://localhost:3001/crm/customers / net::ERR_ABORTED http://localhost:3001/units/pool

### /help-center
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /kayit
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization.

### /kontor
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.

### /kullanici-sozlesmesi
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /kvkk
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /lina
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /market
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /messages
- Console: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used: - A
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/__nextjs_original-stack-frames / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.e4c6964bc18042db.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.e4c6964bc18042db.hot-update.js

### /network
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th / A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used: - A

### /notification-settings
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token

### /platform-anayasasi
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.9d276cbfd72da7c3.hot-update.js / net::ERR_ABORTED http://localhost:3000/__nextjs_original-stack-frames / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.9d276cbfd72da7c3.hot-update.js

### /portfoy/quality
- PageError: Invalid or unexpected token

### /profil
- Console: Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update th
- PageError: Invalid or unexpected token / Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.bc72a503e5915761.hot-update.js / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.bc72a503e5915761.hot-update.js

### /ucretlendirme
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/webpack/app/layout.bc72a503e5915761.hot-update.js / net::ERR_ABORTED http://localhost:3000/ucretlendirme?_rsc=dBtYSgQuk65wYo_U / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/webpack.bc72a503e5915761.hot-update.js

### /uyelik
- PageError: Internal Next.js error: Router action dispatched before initialization. / Internal Next.js error: Router action dispatched before initialization.
- FailedRequest: net::ERR_ABORTED http://localhost:3000/_next/static/css/app/layout.css?v=1782272426276 / net::ERR_ABORTED http://localhost:3000/_next/static/css/app/layout.css?v=1782272426631 / net::ERR_ABORTED http://localhost:3000/_next/static/webpack/8cacbc4fd73db502.webpack.hot-update.json

## Güvenli Buton Denetimi

| Route | # | Buton | Sonuç | Not |
|---|---:|---|---|---|
| / | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /giris | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /dashboard | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /crm | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /portfoy | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /havuz | 1 | Show 8 ignore-listed frame(s) | ATLANDI | Buton görünür/aktif değil. |
| /messages | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /kontor | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |
| /lina | 1 | Geri dön | OK | Aynı sayfada kaldı. |
| /profil | 0 | - | BILGI | Güvenli test edilecek buton bulunamadı. |

## Robot Kuralı

- Sil / Onayla / Reddet / Havuza Gönder / Kontör harcayan işlemler güvenli modda tıklanmaz.
- Auth gereken sayfalar login ENV yoksa AUTH_REDIRECT olarak raporlanır.
- Robot otomatik kod onarımı yapmaz; rapor sonrası tam dosya yöntemiyle güvenli düzeltme yapılır.