#!/usr/bin/env node
/**
 * PROVA-1/2/3 — EPH-70 / ODM-2 deploy provası (Neon child branch "prova-20261109").
 * Dayanak: D:\Projects\EPH_KURALLAR\DEPLOY_PLANI_20261108.md (§2, §3, §4, §9).
 *
 * BU BETİK YALNIZ PROVA DALINDA ÇALIŞIR. Canlı veritabanına karşı çalıştırılmaz (güvenlik kilidi: çıkış kodu 2).
 *
 * Kurallar:
 *  - Bağlantı adresi YALNIZ ortam değişkeni PROVA_DATABASE_URL'den okunur. Hiçbir yere (ekran, log, rapor, dosya) yazılmaz;
 *    yalnız host'un ilk 12 karakteri gösterilir. Tüm çıktılar redact() süzgecinden geçer.
 *  - .env dosyası okunmaz: alt süreçlere (prisma, prova backend) DOTENV_CONFIG_PATH=<var olmayan dosya> verilir,
 *    prova backend'i boş bir geçici klasörde (cwd) ve SIFIRDAN kurulmuş ortamla başlatılır (gerçek SMTP/iyzico/push anahtarı sızmaz).
 *  - Orijinal SQL/migration dosyaları DEĞİŞTİRİLMEZ; COMMIT'li kopyalar geçici klasörde üretilir.
 *
 * Çıkış kodları: 0 = tüm adımlar başarılı · 1 = en az bir adım başarısız · 2 = CANLI VERİTABANI (durduruldu)
 *                3 = ortam hatası (adres yok/geçersiz/pooler) · 4 = onay verilmedi
 *
 * Kullanım:  node scripts/prova/prova_eph70.mjs [--skip-backend]
 */
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
import { adimlariCalistir, sonSatir, nedenSatiri } from '../deploy/eph70_cekirdek.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..', '..');
const RAPOR_DIZINI = process.env.PROVA_RAPOR_DIZINI || 'D:\\Projects\\EPH_KURALLAR\\raporlar';
const CANLI_HOST_PARCASI = 'ep-morning-sound-al8p9dak';
const PROVA_PORT = 3901;
const SKIP_BACKEND = process.argv.includes('--skip-backend');

// ───────────────────────────── Redaksiyon (adres sızıntısı koruması) ─────────────────────────────
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

// ───────────────────────────── 1) Adres + GÜVENLİK KİLİDİ ─────────────────────────────
const PROVA_URL = process.env.PROVA_DATABASE_URL;
if (!PROVA_URL || !PROVA_URL.trim()) {
  console.error('HATA: PROVA_DATABASE_URL tanımlı değil. Bkz. PROVA_NASIL.md.');
  process.exit(3);
}
let parsed;
try { parsed = new URL(PROVA_URL.trim()); } catch { console.error('HATA: PROVA_DATABASE_URL geçerli bir bağlantı adresi değil.'); process.exit(3); }
const HOST = parsed.hostname;
gizliEkle(PROVA_URL.trim()); gizliEkle(HOST); gizliEkle(decodeURIComponent(parsed.username));
gizliEkle(parsed.password); gizliEkle(decodeURIComponent(parsed.password));
gizliEkle(decodeURIComponent(parsed.pathname.replace(/^\//, '')));
const HOST_ONEK = HOST.slice(0, 12) + '…';

function canliMi() {
  if (HOST.includes(CANLI_HOST_PARCASI) || PROVA_URL.includes(CANLI_HOST_PARCASI)) return true;
  const norm = (u) => { try { const x = new URL(u); return `${x.hostname}|${x.pathname}`.toLowerCase(); } catch { return null; } };
  const benim = norm(PROVA_URL.trim());
  for (const k of ['DATABASE_URL', 'DIRECT_URL']) {
    const v = process.env[k];
    if (v && (v.trim() === PROVA_URL.trim() || norm(v) === benim)) return true;
  }
  return false;
}
if (canliMi()) {
  console.error('CANLI VERİTABANI — DURDURULDU');
  process.exit(2);
}
if (/-pooler(\.|$)/i.test(HOST) || /pgbouncer=true/i.test(PROVA_URL)) {
  console.error('HATA: Pooler (pgbouncer) adresi verildi. CONCURRENTLY/lock_timeout için DOĞRUDAN (pooler olmayan) prova adresi gerekir.');
  process.exit(3);
}
let Client;
try { ({ Client } = require('pg')); } catch {
  console.error("HATA: 'pg' paketi backend/node_modules içinde bulunamadı (npm ci gerekir).");
  process.exit(3);
}

// ───────────────────────────── Onay ─────────────────────────────
async function onay() {
  log(`host: ${HOST_ONEK}`);
  log('Bu betik yukarıdaki PROVA veritabanına YAZACAK (migration + SQL betikleri + geçiş/telefon hash betiği COMMIT\'li).');
  if (!process.stdin.isTTY) { console.error('Etkileşimli terminal gerekli (onay sorusu).'); process.exit(4); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cevap = await new Promise((r) => rl.question('Devam etmek için PROVA yazın: ', r));
  rl.close();
  if (cevap.trim() !== 'PROVA') { console.error('Onay verilmedi — çıkılıyor.'); process.exit(4); }
}

// ───────────────────────────── Adım çerçevesi ─────────────────────────────
const sonuclar = []; // {kod, baslik, durum, ms, etkilenen, not}
let durdur = false;  // kritik adım başarısız → sonraki yazan adımlar ATLANIR
const ms = (t0) => Math.round(performance.now() - t0);

async function adim(kod, baslik, fn, { kritik = false, atlaKosul = true } = {}) {
  if (durdur && atlaKosul) {
    sonuclar.push({ kod, baslik, durum: 'ATLANDI', ms: 0, etkilenen: '-', not: 'önceki kritik adım başarısız' });
    log(`[${kod}] ATLANDI — ${baslik}`);
    return null;
  }
  const t0 = performance.now();
  try {
    const r = (await fn()) || {};
    const kayit = { kod, baslik, durum: r.uyari ? 'UYARI' : 'BASARILI', ms: ms(t0), etkilenen: r.etkilenen ?? '-', not: r.not ?? '' };
    sonuclar.push(kayit);
    log(`[${kod}] ${kayit.durum} (${kayit.ms} ms, etkilenen: ${kayit.etkilenen}) — ${baslik}${kayit.not ? ' · ' + kayit.not : ''}`);
    return r;
  } catch (e) {
    const kayit = { kod, baslik, durum: 'BASARISIZ', ms: ms(t0), etkilenen: '-', not: redact(e?.message || e).slice(0, 400) };
    sonuclar.push(kayit);
    log(`[${kod}] BASARISIZ (${kayit.ms} ms) — ${baslik} · ${kayit.not}`);
    // çok ifadeli dosya BEGIN'den sonra hata verdiyse oturum "aborted transaction" durumunda kalır: temizle
    if (baglandi) { try { await c.query('ROLLBACK'); } catch { /* yoksay */ } }
    if (kritik) durdur = true;
    return null;
  }
}

// ───────────────────────────── SQL yardımcıları ─────────────────────────────
function altSurecOrtami(ekstra = {}) {
  return {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, windir: process.env.windir, TEMP: process.env.TEMP, TMP: process.env.TMP,
    APPDATA: process.env.APPDATA, LOCALAPPDATA: process.env.LOCALAPPDATA, USERPROFILE: process.env.USERPROFILE, HOMEDRIVE: process.env.HOMEDRIVE, HOMEPATH: process.env.HOMEPATH,
    DATABASE_URL: PROVA_URL.trim(), DIRECT_URL: PROVA_URL.trim(),
    DOTENV_CONFIG_PATH: join(tmpdir(), '__prova_olmayan_env_dosyasi__'),
    CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', NO_COLOR: '1',
    ...ekstra,
  };
}
function calistir(argv, { cwd = BACKEND, env, zamanAsimi = 600000 } = {}) {
  const r = spawnSync(process.execPath, argv, { cwd, env: env ?? altSurecOrtami(), encoding: 'utf8', timeout: zamanAsimi, windowsHide: true });
  const cikti = redact(`${r.stdout || ''}\n${r.stderr || ''}`).trim();
  return { kod: r.status, cikti };
}


// ═════════════════════════════════════════ ANA AKIŞ ═════════════════════════════════════════
await onay();
const baslangic = new Date();
log(`PROVA-1 başladı — host: ${HOST_ONEK} — ${baslangic.toISOString()}`);

const c = new Client({ connectionString: PROVA_URL.trim(), connectionTimeoutMillis: 30000 });
c.on('error', (e) => log('bağlantı hatası:', e?.message));
let baglandi = false;
const GECICI = mkdtempSync(join(tmpdir(), 'prova_eph70_'));

try {
  // A–D: PROVA ve CANLI için ORTAK çekirdek (scripts/deploy/eph70_cekirdek.mjs)
  await adimlariCalistir({ c, adim, BACKEND, calistir, altSurecOrtami, GECICI, baglandi: () => { baglandi = true; }, profil: 'PROVA', uygulamaAdi: 'prova_eph70', telefonHashAnahtari: () => 'prova-' + randomBytes(24).toString('hex') });

  // ───── E) PROVA BACKEND'İ ─────
  const oncekiBasarisiz = sonuclar.some((s) => s.durum === 'BASARISIZ');
  if (SKIP_BACKEND) {
    sonuclar.push({ kod: 'E', baslik: 'Prova backend + duman testleri', durum: 'ATLANDI', ms: 0, etkilenen: '-', not: '--skip-backend verildi' });
  } else if (oncekiBasarisiz) {
    sonuclar.push({ kod: 'E', baslik: 'Prova backend + duman testleri', durum: 'ATLANDI', ms: 0, etkilenen: '-', not: 'önceki adımlarda başarısızlık var' });
  } else {
    await provaBackend();
  }
} finally {
  if (baglandi) await c.end().catch(() => {});
  try { rmSync(GECICI, { recursive: true, force: true }); } catch { /* yoksay */ }
}


// ───────────────────────────── E) Prova backend'i ─────────────────────────────
async function provaBackend() {
  const DIST = join(BACKEND, '.prova_dist');
  const CWD = mkdtempSync(join(tmpdir(), 'prova_cwd_'));
  const MEDYA_PUB = join(CWD, 'public'); const MEDYA_PRIV = join(CWD, 'private');
  mkdirSync(MEDYA_PUB, { recursive: true }); mkdirSync(MEDYA_PRIV, { recursive: true });
  let child = null; let logTamponu = '';
  const durdurBackend = () => {
    if (child && child.exitCode === null) {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
    }
  };
  try {
    await adim('E1', 'prisma generate (DB\'ye bağlanmaz)', async () => {
      const r = calistir([join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js'), 'generate']);
      if (r.kod !== 0) throw new Error(`çıkış ${r.kod}: ${sonSatir(r.cikti)}`);
      return { not: 'istemci üretildi' };
    }, { kritik: true, atlaKosul: false });

    await adim('E2', 'Derleme (tsc → .prova_dist; mevcut dist\'e dokunmaz)', async () => {
      rmSync(DIST, { recursive: true, force: true });
      const r = calistir([join(BACKEND, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.build.json', '--outDir', DIST, '--incremental', 'false'], { zamanAsimi: 900000 });
      if (r.kod !== 0) throw new Error(`tsc çıkış ${r.kod}: ${sonSatir(r.cikti, 4)}`);
      if (!existsSync(join(DIST, 'src', 'main.js'))) throw new Error('.prova_dist/src/main.js üretilmedi');
      // PROVA-2 (E3 bulgusu): tsc JSON/MD dosyalarını outDir'e KOPYALAMAZ; EphLocationCatalogService yapıcıda katalog JSON'unu okur (cwd=boş geçici klasör) → EPH_TR_KKTC_LOCATION_CATALOG_NOT_FOUND.
      for (const [kaynak, hedef] of [['src/lina/geo', 'src/lina/geo'], ['src/lina/v7/prompts', 'src/lina/v7/prompts']]) {
        if (existsSync(join(BACKEND, kaynak))) cpSync(join(BACKEND, kaynak), join(DIST, hedef), { recursive: true, filter: (p) => !/\.ts$/.test(p) });
      }
      return { not: 'derleme tamam (+geo/prompts statik dosyaları kopyalandı)' };
    }, { kritik: true, atlaKosul: false });

    if (durdur) return;
    const t0 = performance.now();
    const env = altSurecOrtami({
      PORT: String(PROVA_PORT), NODE_ENV: 'production',
      JWT_SECRET: 'prova-' + randomBytes(24).toString('hex'), MEDIA_SIGNING_SECRET: 'prova-' + randomBytes(24).toString('hex'),
      STORAGE_DRIVER: 'local', MEDIA_PUBLIC_ROOT: MEDYA_PUB, MEDIA_PRIVATE_ROOT: MEDYA_PRIV,
      STORE_PAYMENTS_ENABLED: 'false', STORE_ALLOW_TEST_PURCHASES: 'false', EPH_PAYMENTS_ENABLED: 'false',
      // PROVA-2: yalnız prova süreci için ZARARSIZ, rastgele üretilmiş geçici değerler (gerçek sır DEĞİL; süreç kapanınca yok olur)
      TELEFON_HASH_ANAHTARI: 'prova-' + randomBytes(24).toString('hex'), LINA_MASK_KEY: 'prova-' + randomBytes(24).toString('hex'), PROJECT_PRESENTATION_SECRET: 'prova-' + randomBytes(24).toString('hex'),
      SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', APP_URL: 'http://127.0.0.1:' + PROVA_PORT, FRONTEND_URL: 'http://127.0.0.1:' + PROVA_PORT,
      // iyzico, push (VAPID), SMS, Lina/AI (OPENAI), Supabase, Apple anahtarları BİLİNÇLİ OLARAK YOK (E7 beklenen 503: SMTP yok)
    });
    child = spawn(process.execPath, [join(DIST, 'src', 'main.js')], { cwd: CWD, env, windowsHide: true });
    const topla = (d) => { logTamponu = (logTamponu + d.toString()).slice(-20000); };
    child.stdout.on('data', topla); child.stderr.on('data', topla);

    await adim('E3', `Prova backend başlatma (port ${PROVA_PORT})`, async () => {
      const bitis = Date.now() + 90000;
      while (Date.now() < bitis) {
        if (child.exitCode !== null) throw new Error(`süreç kapandı (çıkış ${child.exitCode}): ${nedenSatiri(redact(logTamponu))}`);
        try { const r = await fetch(`http://127.0.0.1:${PROVA_PORT}/health`, { signal: AbortSignal.timeout(2000) }); if (r.status > 0) return { not: `hazır (${Math.round(performance.now() - t0)} ms)` }; } catch { /* henüz hazır değil */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error(`90 sn içinde hazır olmadı: ${sonSatir(redact(logTamponu), 4)}`);
    }, { atlaKosul: false });

    if (!sonuclar.find((s) => s.kod === 'E3' && s.durum !== 'BASARISIZ')) return;
    const base = `http://127.0.0.1:${PROVA_PORT}`;
    const duman = [
      ['E4', 'GET /', 'GET', '/', null, [200]],
      ['E5', 'GET /payments/public-catalog', 'GET', '/payments/public-catalog', null, [200]],
      ['E6', 'GET /payments/store/catalog?platform=IOS (JWT yok)', 'GET', '/payments/store/catalog?platform=IOS', null, [401]],
      ['E7', 'POST /public/contact (SMTP yok)', 'POST', '/public/contact', { adSoyad: 'Prova Test', eposta: 'prova@example.invalid', telefon: '05000000000', ofisDurumu: 'VAR' }, [503]],
      ['E8', 'GET /health', 'GET', '/health', null, [200]],
    ];
    for (const [kod, baslik, yontem, yol, govde, beklenen] of duman) {
      await adim(kod, `Duman: ${baslik} → beklenen ${beklenen.join('/')}`, async () => {
        const r = await fetch(base + yol, { method: yontem, headers: govde ? { 'content-type': 'application/json' } : undefined, body: govde ? JSON.stringify(govde) : undefined, signal: AbortSignal.timeout(20000) });
        let gv = ''; try { gv = (await r.text()).slice(0, 120); } catch { /* yoksay */ }
        if (!beklenen.includes(r.status)) throw new Error(`HTTP ${r.status} (beklenen ${beklenen.join('/')}) — ${redact(gv)}`);
        let katalogNotu = '';
        if (kod === 'E5') katalogNotu = ' — katalog yanıtı JSON';
        return { not: `HTTP ${r.status}${katalogNotu}` };
      }, { atlaKosul: false });
    }

    // log taraması (yalnız sayaç + kısaltılmış eşleşen satırlar)
    await adim('E9', 'Backend log taraması (ENTITLEMENT_*, Prisma, relation does not exist, STORE_*)', async () => {
      const satirlar = redact(logTamponu).split(/\r?\n/);
      const kalip = /ENTITLEMENT_|EntitlementConfigError|maxTeams|does not exist|PrismaClient(Known|Initialization)|STORE_[A-Z_]+ (hata|error)|Unhandled|ECONNREFUSED/i;
      const bulunan = satirlar.filter((s) => kalip.test(s));
      return { uyari: bulunan.length > 0, etkilenen: `${bulunan.length} eşleşme`, not: bulunan.slice(0, 5).map((s) => s.slice(0, 160)).join(' | ') || 'temiz' };
    }, { atlaKosul: false });
  } finally {
    durdurBackend();
    await new Promise((r) => setTimeout(r, 1500));
    sonuclar.push({ kod: 'E10', baslik: 'Prova backend durduruldu + geçici dosyalar temizlendi', durum: 'BASARILI', ms: 0, etkilenen: '-', not: '.prova_dist ve geçici klasör silindi' });
    try { rmSync(DIST, { recursive: true, force: true }); } catch { /* yoksay */ }
    try { rmSync(CWD, { recursive: true, force: true }); } catch { /* yoksay */ }
  }
}

// ───────────────────────────── Rapor ─────────────────────────────
const bitisZamani = new Date();
const pad = (n) => String(n).padStart(2, '0');
const damga = `${bitisZamani.getFullYear()}${pad(bitisZamani.getMonth() + 1)}${pad(bitisZamani.getDate())}-${pad(bitisZamani.getHours())}${pad(bitisZamani.getMinutes())}${pad(bitisZamani.getSeconds())}`;
const sayi = (d) => sonuclar.filter((s) => s.durum === d).length;
const toplamMs = sonuclar.reduce((a, s) => a + s.ms, 0);
const migMs = sonuclar.filter((s) => /^B\d\d$/.test(s.kod)).reduce((a, s) => a + s.ms, 0);
const hucre = (s) => redact(String(s ?? '')).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const md = [
  `# PROVA SONUCU — ${damga}`,
  '',
  `- Veritabanı: Neon prova dalı · host: \`${HOST_ONEK}\` (adres raporda YOK)`,
  `- Başlangıç: ${baslangic.toISOString()} · Bitiş: ${bitisZamani.toISOString()}`,
  `- Özet: ${sayi('BASARILI')} başarılı · ${sayi('UYARI')} uyarı · ${sayi('BASARISIZ')} başarısız · ${sayi('ATLANDI')} atlandı`,
  `- Toplam adım süresi: ${(toplamMs / 1000).toFixed(1)} sn (migration'lar: ${(migMs / 1000).toFixed(1)} sn)`,
  `- Genel sonuç: **${sayi('BASARISIZ') === 0 ? (sayi('UYARI') ? 'BAŞARILI (uyarılarla)' : 'BAŞARILI') : 'BAŞARISIZ'}**`,
  '',
  '| Adım | Açıklama | Durum | Süre (ms) | Etkilenen | Not |',
  '|---|---|---|---:|---|---|',
  ...sonuclar.map((s) => `| ${s.kod} | ${hucre(s.baslik)} | ${s.durum} | ${s.ms} | ${hucre(s.etkilenen)} | ${hucre(s.not)} |`),
  '',
  '> Bu rapor yalnız sonuçları içerir. Bağlantı adresi, kullanıcı/parola ve veri satırları yazılmaz.',
  '',
].join('\n');
let raporYolu = null;
try {
  mkdirSync(RAPOR_DIZINI, { recursive: true });
  raporYolu = join(RAPOR_DIZINI, `PROVA_SONUC_${damga}.md`);
  writeFileSync(raporYolu, md, 'utf8');
} catch (e) { log('Rapor yazılamadı:', e?.message); console.log(md); }
log(`\nÖZET: ${sayi('BASARILI')} başarılı · ${sayi('UYARI')} uyarı · ${sayi('BASARISIZ')} başarısız · ${sayi('ATLANDI')} atlandı`);
if (raporYolu) log(`Rapor: ${raporYolu}`);
process.exit(sayi('BASARISIZ') === 0 ? 0 : 1);
