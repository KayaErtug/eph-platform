#!/usr/bin/env node
/**
 * PROVA-3 — SALT OKUMA SORGU ARACI (Neon prova dalı). Verilen .sql dosyasını çalıştırır, sonucu tablo olarak ekrana ve
 * raporlar\PROVA_SORGU_<tarih>.md dosyasına yazar. Bağlantı adresi HİÇBİR YERE yazılmaz.
 *
 * Kullanım:  node scripts/prova/prova_sorgu.mjs scripts/eph70_inceleme_listesi.sql [--maks-satir=200]
 *
 * Güvenceler (üst üste):
 *  1) Canlı kilidi: PROVA_DATABASE_URL canlıya (ep-morning-sound…) ya da DATABASE_URL/DIRECT_URL'ye işaret ederse DURUR (çıkış 2). Pooler adresi reddedilir (3).
 *  2) SQL önceden taranır: yalnız SELECT/WITH/VALUES/TABLE/SHOW/EXPLAIN (analyze'sız) ve dosyanın kendi BEGIN/ROLLBACK/SET timeout satırları; INSERT/UPDATE/DELETE/DDL/COMMIT/
 *     FOR UPDATE/READ WRITE/yan etkili işlev varsa HİÇ ÇALIŞTIRILMAZ (çıkış 5).
 *  3) Oturum salt okuma: SET default_transaction_read_only = on + BEGIN READ ONLY ... ROLLBACK (dosyanın kendi BEGIN/ROLLBACK satırları çıkarılır; sarmalayıcıyı bu araç yönetir).
 *  4) Hassas görünen sütun adlarının (telefon, e-posta, token, hash, kullanıcı …) değerleri ekrana/rapora [gizli] yazılır; tüm çıktı adres süzgecinden geçer.
 * .env okunmaz.
 *
 * Çıkış kodları: 0 tamam · 1 sorgu hatası · 2 CANLI VERİTABANI (durduruldu) · 3 ortam/argüman hatası (adres/dosya yok, pooler, pg yok) · 5 SQL salt okuma taramasından geçmedi
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..', '..');
const RAPOR_DIZINI = process.env.PROVA_RAPOR_DIZINI || 'D:\\Projects\\EPH_KURALLAR\\raporlar';
const { canliMi, poolerMi, sqlTarama, sarmalayicilariKaldir, hucreMaskele } = require('./prova_sorgu_cekirdek.cjs');

const argv = process.argv.slice(2);
const MAKS = Math.max(1, Math.min(5000, Number((argv.find((a) => a.startsWith('--maks-satir=')) || '').split('=')[1]) || 200));
const dosyaArg = argv.find((a) => !a.startsWith('--'));

// ── Adres + gizli süzgeç ──
const PROVA_URL = process.env.PROVA_DATABASE_URL;
if (!PROVA_URL || !PROVA_URL.trim()) { console.error('HATA: PROVA_DATABASE_URL tanımlı değil. Bkz. PROVA_NASIL.md.'); process.exit(3); }
let parsed;
try { parsed = new URL(PROVA_URL.trim()); } catch { console.error('HATA: PROVA_DATABASE_URL geçerli bir bağlantı adresi değil.'); process.exit(3); }
const HOST = parsed.hostname;
const gizliler = new Set();
const gizliEkle = (v) => { if (typeof v === 'string' && v.length >= 3) gizliler.add(v); };
gizliEkle(PROVA_URL.trim()); gizliEkle(HOST); gizliEkle(decodeURIComponent(parsed.username)); gizliEkle(parsed.password); gizliEkle(decodeURIComponent(parsed.password));
gizliEkle(decodeURIComponent(parsed.pathname.replace(/^\//, '')));
function redact(s) {
  let t = String(s ?? '');
  for (const g of gizliler) t = t.split(g).join('[gizli]');
  t = t.replace(/postgres(?:ql)?:\/\/[^\s'"`<>]+/gi, '[url]');
  t = t.replace(/\bep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/gi, '[host]');
  return t;
}
const log = (...a) => console.log(redact(a.join(' ')));
const HOST_ONEK = HOST.slice(0, 12) + '…';

// ── 1) Canlı kilidi (prova_eph70.mjs ile aynı: kod 2) + pooler reddi ──
if (canliMi(PROVA_URL, process.env)) { console.error('CANLI VERİTABANI — DURDURULDU'); process.exit(2); }
if (poolerMi(PROVA_URL)) { console.error('HATA: Pooler (pgbouncer) adresi verildi. Doğrudan (pooler olmayan) prova adresi gerekir.'); process.exit(3); }

// ── Dosya + 2) salt okuma taraması ──
if (!dosyaArg) { console.error('Kullanım: node scripts/prova/prova_sorgu.mjs <dosya.sql> [--maks-satir=200]'); process.exit(3); }
const dosyaYolu = resolve(process.cwd(), dosyaArg);
const dosyaYolu2 = existsSync(dosyaYolu) ? dosyaYolu : resolve(BACKEND, dosyaArg);
if (!existsSync(dosyaYolu2)) { console.error('HATA: SQL dosyası bulunamadı.'); process.exit(3); }
const sqlHam = readFileSync(dosyaYolu2, 'utf8');
const tarama = sqlTarama(sqlHam);
if (!tarama.ok) { console.error(`REDDEDİLDİ — SQL salt okuma taramasından geçmedi, ÇALIŞTIRILMADI: ${tarama.nedenler.join('; ')}`); process.exit(5); }
const sql = sarmalayicilariKaldir(sqlHam);

let Client;
try { ({ Client } = require('pg')); } catch { console.error("HATA: 'pg' paketi backend/node_modules içinde bulunamadı (npm ci gerekir)."); process.exit(3); }

// ── 3) Çalıştır (salt okuma oturumu) ──
const t0 = Date.now();
const c = new Client({ connectionString: PROVA_URL.trim(), connectionTimeoutMillis: 30000 });
c.on('error', (e) => log('bağlantı hatası:', e?.message));
let baglandi = false; let sonuclar = []; let hata = null;
try {
  await c.connect(); baglandi = true;
  await c.query("SET application_name='prova_sorgu'");
  await c.query('SET default_transaction_read_only = on');
  await c.query("SET statement_timeout = '120s'");
  await c.query("SET lock_timeout = '5s'");
  await c.query('BEGIN READ ONLY');
  const r = await c.query(sql);
  sonuclar = (Array.isArray(r) ? r : [r]).filter((x) => x.command === 'SELECT' || (x.fields && x.fields.length));
} catch (e) {
  hata = redact(e?.message || e).slice(0, 400);
} finally {
  if (baglandi) { try { await c.query('ROLLBACK'); } catch { /* yoksay */ } await c.end().catch(() => {}); }
}

// ── Çıktı (tablo) ──
const hucre = (v) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v));
const mdHucre = (s) => redact(hucre(s)).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
function metinTablo(alanlar, satirlar) {
  const g = alanlar.map((a, i) => Math.min(60, Math.max(a.length, ...satirlar.map((r) => redact(hucre(r[i])).length))));
  const kes = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
  const cizgi = '+' + g.map((n) => '-'.repeat(n + 2)).join('+') + '+';
  return [cizgi, '| ' + alanlar.map((a, i) => kes(a, g[i])).join(' | ') + ' |', cizgi,
    ...satirlar.map((r) => '| ' + r.map((v, i) => kes(redact(hucre(v)), g[i])).join(' | ') + ' |'), cizgi].join('\n');
}
const bitis = new Date();
const pad = (n) => String(n).padStart(2, '0');
const damga = `${bitis.getFullYear()}${pad(bitis.getMonth() + 1)}${pad(bitis.getDate())}-${pad(bitis.getHours())}${pad(bitis.getMinutes())}${pad(bitis.getSeconds())}`;
const md = [`# PROVA SORGU — ${damga}`, '', `- Dosya: \`${basename(dosyaYolu2)}\` · Veritabanı: prova dalı, host \`${HOST_ONEK}\` (adres raporda YOK)`,
  `- Oturum: salt okuma (BEGIN READ ONLY … ROLLBACK) · süre: ${Date.now() - t0} ms · satır sınırı: ${MAKS}`, ''];
if (hata) {
  console.error(`HATA (sorgu çalışmadı/yarıda kaldı, ROLLBACK): ${hata}`);
  md.push(`**HATA:** ${mdHucre(hata)}`, '');
}
sonuclar.forEach((s, i) => {
  const alanlar = s.fields.map((f) => f.name);
  const gizli = alanlar.filter((a) => hucreMaskele(a, 'x') === '[gizli]');
  const satirlar = s.rows.map((r) => alanlar.map((a) => hucreMaskele(a, r[a]))).slice(0, MAKS);
  const baslik = `Sonuç ${i + 1}: ${s.rowCount ?? s.rows.length} satır${s.rows.length > MAKS ? ` (ilk ${MAKS} gösterildi)` : ''}${gizli.length ? ` · maskelenen sütun: ${gizli.join(', ')}` : ''}`;
  console.log(`\n${baslik}`);
  console.log(redact(metinTablo(alanlar, satirlar)));
  md.push(`## ${baslik}`, '', '| ' + alanlar.map(mdHucre).join(' | ') + ' |', '|' + alanlar.map(() => '---').join('|') + '|',
    ...satirlar.map((r) => '| ' + r.map(mdHucre).join(' | ') + ' |'), '');
});
if (!hata && sonuclar.length === 0) { console.log('(sonuç kümesi yok)'); md.push('_Sonuç kümesi yok._', ''); }
md.push('> Bu rapor yalnız sorgu çıktısıdır. Bağlantı adresi/kullanıcı/parola yazılmaz; hassas görünen sütunlar maskelenir.', '');
try {
  mkdirSync(RAPOR_DIZINI, { recursive: true });
  const raporYolu = join(RAPOR_DIZINI, `PROVA_SORGU_${damga}.md`);
  writeFileSync(raporYolu, md.join('\n'), 'utf8');
  log(`\nRapor: ${raporYolu}`);
} catch (e) { log('Rapor yazılamadı:', e?.message); }
process.exit(hata ? 1 : 0);
