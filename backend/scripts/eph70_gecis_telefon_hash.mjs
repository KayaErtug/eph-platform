#!/usr/bin/env node
/**
 * EPH-70 / PROVA-3 — GEÇİŞ KAYITLARINA TELEFON HASH'İ YAZAR (eph70_gecis.sql'den SONRA). AJAN ÇALIŞTIRMAZ.
 * Mustafa abi sunucuda, bakım modunda çalıştırır (anahtar yalnız ortam değişkenlerinde; HİÇBİR ÇIKTIYA YAZILMAZ):
 *   $env:DATABASE_URL = "<canlı adres>"; $env:TELEFON_HASH_ANAHTARI = "<uygulamadakiyle AYNI anahtar>"
 *   node scripts/eph70_gecis_telefon_hash.mjs            # KURU ÇALIŞTIRMA (varsayılan): hesaplar, yazar, sonunda ROLLBACK; yalnız sayılar
 *   node scripts/eph70_gecis_telefon_hash.mjs --uygula   # COMMIT
 *
 * Ne yapar: OfisDenemeKaydi'nde kaynak='GECIS' ve telefonHash IS NULL olan kayıtların sahibinin (User.phone) telefonunu, uygulamadaki hashPhone ile AYNI
 *   algoritmayla (normalize + HMAC-SHA256) hash'ler ve yazar. Telefon geçersizse ya da aynı hash başka kayıtta varsa (UNIQUE) o kayıt NULL kalır ve
 *   OfisGecisDefteri'ne ('EPH70_DENEME_HASH:<officeId>', 'ATLANDI', neden) onay satırı yazılır; sql'deki bayrak koşulu bu satırı "bilinçli kabul" sayar.
 *   İdempotent (yalnız hash'i NULL olanlara dokunur). PK/lot/bakiye/ayar DEĞİŞTİRMEZ.
 * Çıktı: yalnız sayılar. Telefon, hash, anahtar, adres, kullanıcı/ofis kimliği YAZILMAZ.
 * Çıkış kodları: 0 tamam · 1 hata · 3 ortam hatası (adres/anahtar yok, pg yok).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TELEFON_HASH_ENV, hashPhoneSafe } = require('./eph70_gecis_hash_cekirdek.cjs');
const UYGULA = process.argv.includes('--uygula');

const url = (process.env.GECIS_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const anahtar = process.env[TELEFON_HASH_ENV];
if (!url) { console.error('HATA: GECIS_DATABASE_URL veya DATABASE_URL tanımlı değil.'); process.exit(3); }
if (!anahtar || anahtar.length < 16) { console.error(`HATA: ${TELEFON_HASH_ENV} tanımlı değil veya çok kısa (en az 16 karakter).`); process.exit(3); }
let Client;
try { ({ Client } = require('pg')); } catch { console.error("HATA: 'pg' paketi bulunamadı (backend dizininde npm ci)."); process.exit(3); }

const c = new Client({ connectionString: url, connectionTimeoutMillis: 30000 });
let bagli = false;
try {
  await c.connect(); bagli = true;
  await c.query("SET application_name='eph70_gecis_hash'");
  await c.query('BEGIN');
  await c.query("SET LOCAL lock_timeout='5s'");
  const hedef = (await c.query(`SELECT d.id, d."officeId" AS ofis, u.phone AS tel
      FROM "OfisDenemeKaydi" d JOIN "User" u ON u.id = d."ownerUserId"
      WHERE d."kaynak" = 'GECIS' AND d."telefonHash" IS NULL
      ORDER BY d."baslangicTarihi", d.id FOR UPDATE OF d`)).rows;
  const mevcut = new Set((await c.query('SELECT "telefonHash" AS h FROM "OfisDenemeKaydi" WHERE "telefonHash" IS NOT NULL')).rows.map((r) => r.h));
  let yazildi = 0, gecersiz = 0, yinelenen = 0;
  for (const r of hedef) {
    const s = hashPhoneSafe(r.tel, anahtar);
    let neden = null;
    if (s.hata === 'TELEFON') neden = 'TELEFON_GECERSIZ';
    else if (s.hata) throw new Error('anahtar geçersiz'); // yukarıda zaten denetlendi
    else if (mevcut.has(s.hash)) neden = 'TELEFON_YINELENEN';
    if (neden) {
      if (neden === 'TELEFON_GECERSIZ') gecersiz++; else yinelenen++;
      await c.query(`INSERT INTO "OfisGecisDefteri" ("id","kaynakAnahtar","officeId","kullaniciId","eskiKod","hedefKod","durum","neden")
        VALUES (gen_random_uuid()::text, $1, $2, NULL, 'OFIS_DENEME_PAKETI', 'OfisDenemeKaydi(GECIS)', 'ATLANDI', $3) ON CONFLICT ("kaynakAnahtar") DO NOTHING`, ['EPH70_DENEME_HASH:' + r.ofis, r.ofis, neden]);
      continue;
    }
    mevcut.add(s.hash);
    const u = await c.query('UPDATE "OfisDenemeKaydi" SET "telefonHash" = $1 WHERE "id" = $2 AND "telefonHash" IS NULL', [s.hash, r.id]);
    yazildi += u.rowCount || 0;
  }
  const kalan = (await c.query(`SELECT count(*)::int AS n FROM "OfisDenemeKaydi" k WHERE k."kaynak" = 'GECIS' AND k."telefonHash" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar" = 'EPH70_DENEME_HASH:' || k."officeId" AND d."durum" = 'ATLANDI')`)).rows[0].n;
  await c.query(UYGULA ? 'COMMIT' : 'ROLLBACK');
  console.log(`${UYGULA ? 'UYGULANDI (COMMIT)' : 'KURU ÇALIŞTIRMA (ROLLBACK — kalıcı değişiklik yok)'}`);
  console.log(`işlenecek kayıt: ${hedef.length} · hash yazıldı: ${yazildi} · telefon geçersiz (onay satırı): ${gecersiz} · yinelenen hash (onay satırı): ${yinelenen}`);
  console.log(`hâlâ hash'siz ve onaysız GECIS kaydı: ${UYGULA ? kalan : '(kuru çalıştırmada sayı geçerlidir: ' + kalan + ')'} — bayrak için 0 olmalı`);
  process.exitCode = 0;
} catch (e) {
  if (bagli) { try { await c.query('ROLLBACK'); } catch { /* yoksay */ } }
  // Hata metni adres/anahtar içerebilir: yalnız kod yazılır.
  console.error(`HATA: işlem geri alındı (kod: ${e && e.code ? String(e.code).slice(0, 12) : 'bilinmiyor'}).`);
  process.exitCode = 1;
} finally {
  if (bagli) await c.end().catch(() => {});
}
