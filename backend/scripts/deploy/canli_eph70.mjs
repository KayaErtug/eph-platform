#!/usr/bin/env node
/**
 * RELEASE-1 — EPH-70 / ODM-2 CANLI geçiş çalıştırıcısı (Neon canlı veritabanı).
 * Dayanak: D:\Projects\EPH_KURALLAR\DEPLOY_PLANI_20261108.md (§1–§4, §8, §10.0), PROVA_SONUC_20261109-032548.md (53 başarılı, 0 hata).
 *
 * A–D adımları prova_eph70.mjs ile AYNI çekirdek koddur (scripts/deploy/eph70_cekirdek.mjs). E adımları (prova backend'i) YOKTUR.
 *
 * BU BETİK YALNIZ CANLI VERİTABANINDA ÇALIŞIR ve ona YAZAR. Prova dalına karşı çalışmaz (TERS KİLİT: host canlı değilse çıkış kodu 2).
 *
 * Kurallar:
 *  - Bağlantı adresi YALNIZ ortam değişkeni CANLI_DATABASE_URL'den okunur (PowerShell: Read-Host -AsSecureString; bkz. DEPLOY_GUNU_KOMUTLAR.md).
 *    Hiçbir yere (ekran, log, rapor, dosya) yazılmaz; tüm çıktılar redact() süzgecinden geçer. Rapora adres YAZILMAZ.
 *  - Adres 'ep-morning-sound-al8p9dak' İÇERMİYORSA durur (ters kilit). Pooler (-pooler / pgbouncer) reddedilir.
 *  - TELEFON_HASH_ANAHTARI ortam değişkeninden alınır (değeri yazdırılmaz); yoksa/kısaysa başlamadan durur.
 *  - Başlamadan üç onay: yedek dal, bakım, CANLI-<YYYYMMDD>.
 *  - Bir adım BASARISIZ olursa DURUR; kalan adımların HİÇBİRİ çalıştırılmaz (D dahil) ve geri dönüş talimatı yazılır.
 *  - Her adımdan sonra rapor dosyası yeniden yazılır (süreç ölse bile son durum diskte).
 *  - .env okunmaz: alt süreçlere DOTENV_CONFIG_PATH=<var olmayan dosya> verilir.
 *
 * Çıkış kodları: 0 = tüm adımlar başarılı · 1 = en az bir adım başarısız (DURULDU) · 2 = CANLI DEĞİL (ters kilit)
 *                3 = ortam hatası (adres/anahtar yok/geçersiz/pooler) · 4 = onay verilmedi
 *
 * Kullanım (backend klasöründen, donmuş release kaynağıyla):  node scripts/deploy/canli_eph70.mjs
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { adimlariCalistir, sonSatir } from './eph70_cekirdek.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..', '..');
const RAPOR_DIZINI = process.env.CANLI_RAPOR_DIZINI || 'D:\\Projects\\EPH_KURALLAR\\raporlar';
const CANLI_HOST_PARCASI = 'ep-morning-sound-al8p9dak';
const UYGULAMA_ADI = 'canli_eph70';

// ───────────────────────────── Redaksiyon (adres/anahtar sızıntısı koruması) ─────────────────────────────
const gizliler = new Set();
function gizliEkle(v) { if (typeof v === 'string' && v.length >= 3) gizliler.add(v); }
function redact(s) {
  let t = String(s ?? '');
  for (const g of gizliler) t = t.split(g).join('[gizli]');
  t = t.replace(/postgres(?:ql)?:\/\/[^\s'"`<>]+/gi, '[url]');
  t = t.replace(/\bep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/gi, '[host]');
  return t;
}
const log = (...a) => console.log(redact(a.join(' ')));

// ───────────────────────────── 1) Adres + TERS KİLİT ─────────────────────────────
const CANLI_URL = process.env.CANLI_DATABASE_URL;
if (!CANLI_URL || !CANLI_URL.trim()) {
  console.error('HATA: CANLI_DATABASE_URL tanımlı değil. Bkz. DEPLOY_GUNU_KOMUTLAR.md (Read-Host ile girilir).');
  process.exit(3);
}
let parsed;
try { parsed = new URL(CANLI_URL.trim()); } catch { console.error('HATA: CANLI_DATABASE_URL geçerli bir bağlantı adresi değil.'); process.exit(3); }
const HOST = parsed.hostname;
gizliEkle(CANLI_URL.trim()); gizliEkle(HOST); gizliEkle(decodeURIComponent(parsed.username));
gizliEkle(parsed.password); gizliEkle(decodeURIComponent(parsed.password));
gizliEkle(decodeURIComponent(parsed.pathname.replace(/^\//, '')));

if (!HOST.includes(CANLI_HOST_PARCASI)) {
  console.error('CANLI VERİTABANI DEĞİL (host beklenen canlı uç değil) — DURDURULDU');
  process.exit(2);
}
if (/-pooler(\.|$)/i.test(HOST) || /pgbouncer=true/i.test(CANLI_URL)) {
  console.error('HATA: Pooler (pgbouncer) adresi verildi. CONCURRENTLY/lock_timeout için DOĞRUDAN (pooler olmayan) canlı adres gerekir.');
  process.exit(3);
}
const HASH_ANAHTARI = process.env.TELEFON_HASH_ANAHTARI;
if (!HASH_ANAHTARI || HASH_ANAHTARI.trim().length < 24) {
  console.error('HATA: TELEFON_HASH_ANAHTARI ortam değişkeni yok veya çok kısa (en az 24 karakter). Değer yazdırılmaz. Bkz. DEPLOY_GUNU_KOMUTLAR.md.');
  process.exit(3);
}
gizliEkle(HASH_ANAHTARI.trim());
let Client;
try { ({ Client } = require('pg')); } catch {
  console.error("HATA: 'pg' paketi backend/node_modules içinde bulunamadı (npm ci gerekir).");
  process.exit(3);
}

// ───────────────────────────── 2) Üç onay ─────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const bugun = (() => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; })();
async function onay() {
  log('Bu betik CANLI veritabanına YAZACAK (18 migration + SQL betikleri + lot uzlaştırma + geçiş/telefon hash + 3 bayrak, COMMIT\'li).');
  if (!process.stdin.isTTY) { console.error('Etkileşimli terminal gerekli (onay soruları).'); process.exit(4); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const sor = (s) => new Promise((r) => rl.question(s, r));
  const k1 = (await sor("1/3 Neon'da yedek dal (yedek-oncesi-<tarih>) açtım mı? EVET yazın: ")).trim();
  const k2 = (await sor('2/3 Sunucuda backend/frontend durduruldu mu (bakım)? EVET yazın: ')).trim();
  const k3 = (await sor(`3/3 Son onay — CANLI-${bugun} yazın: `)).trim();
  rl.close();
  if (k1 !== 'EVET' || k2 !== 'EVET' || k3 !== `CANLI-${bugun}`) { console.error('Onay verilmedi (soru 1/2 için tam "EVET", 3 için tam "CANLI-' + bugun + '") — çıkılıyor. Hiçbir şey yapılmadı.'); process.exit(4); }
}

// ───────────────────────────── 3) Adım çerçevesi (ilk BASARISIZ = DUR) ─────────────────────────────
const sonuclar = [];
let durdur = false;
let baglandi = false;
const baslangic = new Date();
const damga = `${baslangic.getFullYear()}${pad(baslangic.getMonth() + 1)}${pad(baslangic.getDate())}-${pad(baslangic.getHours())}${pad(baslangic.getMinutes())}${pad(baslangic.getSeconds())}`;
const raporYolu = join(RAPOR_DIZINI, `CANLI_SONUC_${damga}.md`);
const ms = (t0) => Math.round(performance.now() - t0);
const sayi = (d) => sonuclar.filter((s) => s.durum === d).length;
const hucre = (s) => redact(String(s ?? '')).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
let c;

// Hangi aşamada durulduysa ne yapılacağı (plan §8.2) — yalnız talimat; betik hiçbir geri alma çalıştırmaz.
function geriDonusTalimati(kod) {
  const on = String(kod || '');
  const ortak = [
    'ORTAK: Hata sebebi çözülmeden devam EDİLMEZ; backend/frontend başlatılmaz (bakım sürüyor). Bu betiğin raporu + hata notu Claude Code/Codex ile incelenir.',
    "SON ÇARE: Neon'da 'yedek-oncesi-<tarih>' dalına geri dön (Neon Console → Branches → o dal → Restore / veya o dalın bağlantısını kullan) — pencere sonrası yazım kaybı olur, yalnız felakette (plan §8.3).",
  ];
  let ozel;
  if (/^A/.test(on)) ozel = ['Veritabanında HİÇBİR DEĞİŞİKLİK yapılmadı (A adımları salt okuma). Nedeni çöz, bakım içinde betiği yeniden çalıştır. Vazgeçersen: sunucuda `pm2 start eph-backend eph-frontend` ile ESKİ kod açılır (kod değişmedi).'];
  else if (/^B/.test(on)) ozel = [
    'Transaction\'lı migration: hata = o dosya otomatik geri alındı; önceki migration\'lar kalıcıdır (yeni şema eski koda İLERİ UYUMLU). CONCURRENTLY indeks INVALID ise: `DROP INDEX CONCURRENTLY IF EXISTS "<ad>"` → betiği yeniden çalıştır (B01..B18 uygulananlar `_prisma_migrations` ile algılanır; yeniden başlatmadan önce A2 "bu dal daha önce kullanılmış" uyarısı verir → kalan migration\'ları psql + `prisma migrate resolve --applied` ile elle tamamla, DEPLOY_PLANI §3).',
    'Migration yarım/failed işaretliyse: ilgili rollback.sql Prosedür B → `npx prisma migrate resolve --rolled-back <ad>` → düzelt.',
    'Vazgeçersen: ESKİ kodla başlat (şema ileri uyumlu): `pm2 start eph-backend eph-frontend`.']; // eslint-disable-line
  else if (/^C[0-3]/.test(on)) ozel = ['Ayar SQL\'leri: `_deploy1_ayar_yedek` tablosundan geri yükle (UPDATE/INSERT … ON CONFLICT; yeni anahtarlar DELETE) — DEPLOY_PLANI §8.0. Ürün SQL\'i: `DELETE FROM "StoreProduct"` (mağaza işlemi yokken). Migration\'lar kalır (ileri uyumlu). ESKİ kod açılabilir.'];
  else if (/^C4|^C5|^C6/.test(on)) ozel = ['Lot uzlaştırma: dosyanın sonundaki yorumlu GERİ ALMA bloğu (bayrağı false yapar, lotları koşullu geri yazar; backend DURUKEN) — plan §4.4/§8.2. Bayraklar yazılmadan backend AÇILMAZ (F7). Bakiye hiçbir adımda değişmez.'];
  else if (/^C7/.test(on)) ozel = ['Geçiş/telefon hash: bayrak 3 YAZILMADI → yeni ofis denemesi kapalı kalır; deploy GO verilmez. Karantina/hash\'siz kayıt sebebini çöz (eph70_gecis.sql raporu), telefon hash betiğini aynı anahtarla yeniden çalıştır (idempotent), bayrak 3 INSERT\'ini yeniden dene. Bakiye/lot toplamı değişmemiş olmalı.'];
  else ozel = ['Son kontrollerden biri başarısız: veriler yazıldı ama doğrulama tutmadı. Backend\'i BAŞLATMA; hata notundaki kalemi çöz (eksik tablo/indeks/ayar/bayrak), gerekirse ilgili adımı elle tamamla ve DEPLOY_PLANI §4 sırasını kontrol et.'];
  return [...ozel, ...ortak];
}

function raporYaz(bitti = false) {
  const bitis = new Date();
  const basarisiz = sayi('BASARISIZ');
  const ilkHata = sonuclar.find((s) => s.durum === 'BASARISIZ');
  const toplamMs = sonuclar.reduce((a, s) => a + s.ms, 0);
  const migMs = sonuclar.filter((s) => /^B\d\d$/.test(s.kod)).reduce((a, s) => a + s.ms, 0);
  const genel = !bitti ? 'DEVAM EDİYOR / YARIDA KALDI (rapor adım adım yazılır)' : basarisiz === 0 ? (sayi('UYARI') ? 'BAŞARILI (uyarılarla)' : 'BAŞARILI') : 'BAŞARISIZ — DURULDU';
  const md = [
    `# CANLI SONUCU — ${damga}`,
    '',
    '- Veritabanı: Neon CANLI (ters kilit geçti; adres/host raporda YOK)',
    `- Başlangıç: ${baslangic.toISOString()} · Son güncelleme: ${bitis.toISOString()}`,
    `- Özet: ${sayi('BASARILI')} başarılı · ${sayi('UYARI')} uyarı · ${basarisiz} başarısız · ${sayi('ATLANDI')} atlandı`,
    `- Toplam adım süresi: ${(toplamMs / 1000).toFixed(1)} sn (migration'lar: ${(migMs / 1000).toFixed(1)} sn)`,
    `- Genel sonuç: **${genel}**`,
    '',
    '| Adım | Açıklama | Durum | Süre (ms) | Etkilenen | Not |',
    '|---|---|---|---:|---|---|',
    ...sonuclar.map((s) => `| ${s.kod} | ${hucre(s.baslik)} | ${s.durum} | ${s.ms} | ${hucre(s.etkilenen)} | ${hucre(s.not)} |`),
    '',
  ];
  if (ilkHata) {
    md.push(`## GERİ DÖNÜŞ TALİMATI (durulan adım: ${ilkHata.kod})`, '', ...geriDonusTalimati(ilkHata.kod).map((t) => `- ${t}`), '');
  } else if (bitti) {
    md.push('## Sonraki adım', '', '- Tüm DB adımları tamam. Sırayla: backend başlat → kontroller → frontend build + başlat → duman testi (DEPLOY_GUNU_KOMUTLAR.md, f bölümü).', '');
  }
  md.push('> Bu rapor yalnız sonuçları içerir. Bağlantı adresi, kullanıcı/parola, telefon hash anahtarı ve veri satırları yazılmaz.', '');
  try { mkdirSync(RAPOR_DIZINI, { recursive: true }); writeFileSync(raporYolu, md.join('\n'), 'utf8'); } catch (e) { log('Rapor yazılamadı:', e?.message); }
  return md.join('\n');
}

// Çekirdeğin verdiği {kritik, atlaKosul} seçenekleri CANLI'da yok sayılır: HER başarısızlık = DUR.
async function adim(kod, baslik, fn) {
  if (durdur) {
    sonuclar.push({ kod, baslik, durum: 'ATLANDI', ms: 0, etkilenen: '-', not: 'önceki adım BASARISIZ — çalıştırılmadı' });
    log(`[${kod}] ATLANDI — ${baslik}`);
    raporYaz();
    return null;
  }
  const t0 = performance.now();
  try {
    const r = (await fn()) || {};
    sonuclar.push({ kod, baslik, durum: r.uyari ? 'UYARI' : 'BASARILI', ms: ms(t0), etkilenen: r.etkilenen ?? '-', not: r.not ?? '' });
    const k = sonuclar[sonuclar.length - 1];
    log(`[${kod}] ${k.durum} (${k.ms} ms, etkilenen: ${k.etkilenen}) — ${baslik}${k.not ? ' · ' + k.not : ''}`);
    raporYaz();
    return r;
  } catch (e) {
    const k = { kod, baslik, durum: 'BASARISIZ', ms: ms(t0), etkilenen: '-', not: redact(e?.message || e).slice(0, 500) };
    sonuclar.push(k);
    log(`[${kod}] BASARISIZ (${k.ms} ms) — ${baslik} · ${k.not}`);
    if (baglandi) { try { await c.query('ROLLBACK'); } catch { /* yoksay */ } }
    durdur = true;
    raporYaz();
    return null;
  }
}

function altSurecOrtami(ekstra = {}) {
  return {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, windir: process.env.windir, TEMP: process.env.TEMP, TMP: process.env.TMP,
    APPDATA: process.env.APPDATA, LOCALAPPDATA: process.env.LOCALAPPDATA, USERPROFILE: process.env.USERPROFILE, HOMEDRIVE: process.env.HOMEDRIVE, HOMEPATH: process.env.HOMEPATH,
    DATABASE_URL: CANLI_URL.trim(), DIRECT_URL: CANLI_URL.trim(),
    DOTENV_CONFIG_PATH: join(tmpdir(), '__canli_olmayan_env_dosyasi__'),
    CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', NO_COLOR: '1',
    ...ekstra,
  };
}
function calistir(argv, { cwd = BACKEND, env, zamanAsimi = 600000 } = {}) {
  const r = spawnSync(process.execPath, argv, { cwd, env: env ?? altSurecOrtami(), encoding: 'utf8', timeout: zamanAsimi, windowsHide: true });
  return { kod: r.status, cikti: redact(`${r.stdout || ''}\n${r.stderr || ''}`).trim() };
}

// ═════════════════════════════════════════ ANA AKIŞ ═════════════════════════════════════════
  await onay();
  log(`CANLI başladı — ${baslangic.toISOString()} (adres gösterilmez)`);
  c = new Client({ connectionString: CANLI_URL.trim(), connectionTimeoutMillis: 30000 });
  c.on('error', (e) => log('bağlantı hatası:', e?.message));
  const GECICI = mkdtempSync(join(tmpdir(), 'canli_eph70_'));
  try {
    await adimlariCalistir({
      c, adim, BACKEND, calistir, altSurecOrtami, GECICI, baglandi: () => { baglandi = true; },
      profil: 'CANLI', uygulamaAdi: UYGULAMA_ADI, telefonHashAnahtari: () => HASH_ANAHTARI.trim(),
    });
  } finally {
    if (baglandi) await c.end().catch(() => {});
    try { rmSync(GECICI, { recursive: true, force: true }); } catch { /* yoksay */ }
  }
  const md = raporYaz(true);
  log(`\nÖZET: ${sayi('BASARILI')} başarılı · ${sayi('UYARI')} uyarı · ${sayi('BASARISIZ')} başarısız · ${sayi('ATLANDI')} atlandı`);
  log(`Rapor: ${raporYolu}`);
  if (sayi('BASARISIZ') > 0) { const ilk = sonuclar.find((x) => x.durum === 'BASARISIZ'); log(`
DURULDU (${ilk.kod}). GERİ DÖNÜŞ TALİMATI:`); for (const t of geriDonusTalimati(ilk.kod)) log(' - ' + t); }
  process.exit(sayi('BASARISIZ') === 0 ? 0 : 1);
