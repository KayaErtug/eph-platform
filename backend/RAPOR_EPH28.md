# RAPOR EPH-28 — Piyasa şeridi

## EPH-28B: elle geçersiz kılma (backend)
**Değişen:** `src/market/market-ticker.service.ts`, `src/market/market-ticker.service.spec.ts`, `src/admin/admin.service.ts`, `src/admin/admin.controller.ts`, `scripts/eph28b_piyasa_manuel.sql` (yeni). Yedekler: `*.bak-eph28b`.

- `MARKET_MANUAL_<KOD>` (USD, EUR, GBP, GRAM_ALTIN, CEYREK_ALTIN, BIST100) varsa kalem değeri odur: `source: "Yönetici"`, `changePct: null`, `updatedAt` = ayarın `updatedAt`'i. Yoksa otomatik kaynak.
- Kredi: `MARKET_KONUT_FAIZ_AYLIK` + `MARKET_KONUT_FAIZ_KAYNAK`; `loan.source` = kaynak metni, boş/yoksa "Yönetici".
- Süper admin ayar ekranı: `GET /admin/system-settings` MARKET_* anahtarlarını açıklamalıdır, kaydı olmayanlar da `value: null` ile listelenir. `PATCH /admin/system-settings/:key` MARKET_* için ondalık sayı (> 0) / metin (≤ 80) kabul eder, kayıt yoksa oluşturur. Değişiklik `AuditLog` (UPDATE_SYSTEM_SETTING; actor, zaman, previousValue, newValue) ile tutulur.
- SQL (ÇALIŞTIRILMADI): `scripts/eph28b_piyasa_manuel.sql` — 2.74, "Akbank İlk Evim", 10425; `ON CONFLICT ("key") DO UPDATE`.

**Doğrulanan:**
- `npx nest build` → Exit 0 (`prisma generate` dahil `npm run build` hatasız).
- `npx jest src/market` → 5/5 geçti. `npx jest src/admin src/auth/guards` → 194/194 geçti.

**Kalan:**
- Mobil admin ekranı sayısal tam sayı girişi varsayabilir; ondalık/metin alanı için mobil tarafta düzenleme gerekir (bu görevde yapılmadı).
- SQL canlıda henüz çalıştırılmadı, deploy yapılmadı.
