#!/usr/bin/env node
/**
 * PROVA-1/2 — EPH-70 / ODM-2 deploy provası (Neon child branch "prova-20261109").
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
  log('Bu betik yukarıdaki PROVA veritabanına YAZACAK (migration + SQL betikleri COMMIT\'li).');
  if (!process.stdin.isTTY) { console.error('Etkileşimli terminal gerekli (onay sorusu).'); process.exit(4); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cevap = await new Promise((r) => rl.question('Devam etmek için PROVA yazın: ', r));
  rl.close();
  if (cevap.trim() !== 'PROVA') { console.error('Onay verilmedi — çıkılıyor.'); process.exit(4); }
}

// ───────────────────────────── Sabitler (plan §3.1 — dosya adı sırası) ─────────────────────────────
const MIGRATIONLAR = [
  { ad: '20261103_add_ofis_boy_and_potential_units.sql', duz: true },
  { ad: '20261108120000_odm2_store_payments' },
  { ad: '20261108120100_odm2_idx_paymentorder_kanal' },
  { ad: '20261108120110_odm2_idx_paymentorder_ortam' },
  { ad: '20261108120120_odm2_idx_user_storeaccounttoken' },
  { ad: '20261108120130_odm2_idx_paymenttransaction_providerid' },
  { ad: '20261108130000_eph70b1f_lot_tuketim' },
  { ad: '20261109000000_eph70b2_a_enum' },
  { ad: '20261109000100_eph70b2_b_ofis_paket_modeli' },
  { ad: '20261109000200_eph70b2_idx_ofisabonelik_office_aktif' },
  { ad: '20261109000210_eph70b2_idx_ofiseklenti_office_tur_aktif' },
  { ad: '20261109000220_eph70b2_idx_ofiseklenti_abonelik' },
  { ad: '20261109000230_eph70b2_idx_ofishakdonemi_office' },
  { ad: '20261109000240_eph70b2_idx_ofisabonelik_office' },
  { ad: '20261109000250_eph70b2_idx_ofisabonelik_store' },
  { ad: '20261109000260_eph70b2_idx_ofisabonelik_order' },
  { ad: '20261109000270_eph70b2_idx_paymentorder_hedefoffice' },
  { ad: '20261109000280_eph70b2_uniq_ofisabonelik_kaynak', cokKayitKontrolu: true },
];
const MIG_DIZIN = join(BACKEND, 'prisma', 'migrations');
const SCRIPTS = join(BACKEND, 'scripts');
const YENI_TABLOLAR = ['StoreProduct', 'StoreSubscription', 'StoreEntitlementGrant', 'PortfolioCreditLotTuketim', 'OfisAbonelik', 'OfisEklenti', 'OfisHakDonemi', 'OfisDenemeKaydi', 'OfisGecisDefteri', 'PotentialUnit'];
const AYAR_ANAHTARLARI = ['OFFICE_ADDON_CONFIG', 'OFFICE_TRIAL_CONFIG', 'OFFICE_FREE_LIMITS', 'KARDES_OFIS_PAKETLER', 'OFFICE_ENTITLEMENT_SOURCE'];
const GIZLI_ALAN = /(kullanici|user|mail|eposta|telefon|phone|adsoyad|isim|token|secret|password|hash)/i;

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
function ozet(res) {
  const list = Array.isArray(res) ? res : [res];
  let dml = 0;
  const cikti = list.map((r) => {
    if (['INSERT', 'UPDATE', 'DELETE'].includes(r.command)) dml += r.rowCount || 0;
    const alanlar = (r.fields || []).map((f) => f.name);
    const goster = r.command === 'SELECT' && alanlar.length > 0 && alanlar.length <= 6 && (r.rows?.length ?? 0) <= 12 && !alanlar.some((a) => GIZLI_ALAN.test(a));
    return { komut: r.command, satir: r.rowCount ?? 0, alanlar, rows: goster ? r.rows : null };
  });
  return { dml, cikti };
}
async function q(c, text, params) { return params ? c.query(text, params) : c.query(text); }
async function tek(c, text, params) { const r = await q(c, text, params); return r.rows[0] || {}; }
function dosya(yol) { return readFileSync(yol, 'utf8'); }
function ustSeviyeRollbackCommit(sql, ad) {
  const eslesme = sql.match(/^ROLLBACK;.*$/gm) || [];
  if (eslesme.length !== 1) throw new Error(`${ad}: tam 1 adet satır başı "ROLLBACK;" beklenirdi, ${eslesme.length} bulundu — kopya üretilmedi`);
  return sql.replace(/^ROLLBACK;.*$/m, 'COMMIT;  -- PROVA kopyası (orijinal dosya değişmedi)');
}
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
// PROVA-2: yığın izinin ALTINDAKİ asıl hata satırını (Error:/tanımlı değil/NOT_FOUND/Nest can't resolve) öne çıkarır
const nedenSatiri = (s) => { const k = s.split(/\r?\n/).filter((l) => /Error|tanımlı|NOT_FOUND|missing|Nest can't|yapılandırılmamış/i.test(l) && !/^\s+at /.test(l)); return (k.length ? 'NEDEN: ' + k.slice(0, 3).join(' | ') + ' || ' : '') + sonSatir(s, 3); };
const sonSatir = (s, n = 3) => s.split(/\r?\n/).filter(Boolean).slice(-n).join(' | ').slice(0, 300);

// ═════════════════════════════════════════ ANA AKIŞ ═════════════════════════════════════════
await onay();
const baslangic = new Date();
log(`PROVA-1 başladı — host: ${HOST_ONEK} — ${baslangic.toISOString()}`);

const c = new Client({ connectionString: PROVA_URL.trim(), connectionTimeoutMillis: 30000 });
c.on('error', (e) => log('bağlantı hatası:', e?.message));
let baglandi = false;
const GECICI = mkdtempSync(join(tmpdir(), 'prova_eph70_'));

try {
  // ───── A) ÖN KONTROLLER (salt okuma) ─────
  await adim('A1', 'Bağlantı + sürüm', async () => {
    await c.connect(); baglandi = true;
    await c.query("SET application_name='prova_eph70'");
    const r = await tek(c, "SELECT current_setting('server_version') AS v, current_setting('server_version_num')::int AS n");
    if (r.n < 130000) throw new Error(`PostgreSQL >= 13 beklenirdi (bulunan ${r.v})`);
    return { not: `PostgreSQL ${r.v}` };
  }, { kritik: true });

  await adim('A2', '_prisma_migrations durumu + klasör farkı', async () => {
    const d = await tek(c, `SELECT count(*)::int AS kayit,
        count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS tamamlanan,
        count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS yarim_kalan,
        count(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS geri_alinmis FROM "_prisma_migrations"`);
    const dbAdlar = new Set((await q(c, 'SELECT migration_name FROM "_prisma_migrations"')).rows.map((r) => r.migration_name));
    const klasorler = readdirSync(MIG_DIZIN, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const beklenenYeni = new Set(MIGRATIONLAR.filter((m) => !m.duz).map((m) => m.ad));
    const dbdeYok = klasorler.filter((k) => !dbAdlar.has(k));
    const beklenmeyen = dbdeYok.filter((k) => !beklenenYeni.has(k));
    const hazirdaVar = [...beklenenYeni].filter((k) => dbAdlar.has(k));
    const eksikKlasor = MIGRATIONLAR.filter((m) => !existsSync(join(MIG_DIZIN, m.ad))).map((m) => m.ad);
    const notlar = [`kayıt=${d.kayit} tamam=${d.tamamlanan} yarım=${d.yarim_kalan} geriAlınmış=${d.geri_alinmis}`, `DB'de olmayan klasör=${dbdeYok.length} (beklenen yeni 17)`];
    if (d.geri_alinmis > 0) {
      // PROVA-2: geri alınmış kayıtların ADLARI (kişisel veri değil) + aynı adın tamamlanmış ikizi var mı + repoda klasörü var mı
      const ga = (await q(c, `SELECT m.migration_name AS ad, to_char(m.rolled_back_at, 'YYYY-MM-DD') AS gun,
          EXISTS (SELECT 1 FROM "_prisma_migrations" t WHERE t.migration_name = m.migration_name AND t.finished_at IS NOT NULL AND t.rolled_back_at IS NULL) AS tamamlanmis_ikiz
        FROM "_prisma_migrations" m WHERE m.rolled_back_at IS NOT NULL ORDER BY m.migration_name`)).rows;
      notlar.push('geriAlınmışlar: ' + ga.map((r) => `${r.ad} (geri alma ${r.gun}; tamamlanmış ikiz=${r.tamamlanmis_ikiz ? 'VAR' : 'YOK'}; repoda klasör=${klasorler.includes(r.ad) ? 'VAR' : 'YOK'})`).join(' | '));
    }
    if (d.yarim_kalan > 0) throw new Error(`yarım kalan migration var (${d.yarim_kalan}) — DUR. ${notlar.join('; ')}`);
    if (eksikKlasor.length) throw new Error(`repoda eksik migration girdisi: ${eksikKlasor.join(', ')}`);
    if (hazirdaVar.length) throw new Error(`bu dal daha önce kullanılmış (${hazirdaVar.length} migration zaten kayıtlı) — yeni dal açın. ${notlar.join('; ')}`);
    if (beklenmeyen.length) throw new Error(`DB'de kaydı olmayan BEKLENMEYEN klasör(ler): ${beklenmeyen.join(', ')} — migrate deploy yolu güvenli değil, DUR (plan §2.3). ${notlar.join('; ')}`);
    return { not: notlar.join('; ') };
  }, { kritik: true });

  await adim('A3', 'eph70_okuma.sql (salt okuma, 4 sorgu)', async () => {
    const s = ozet(await c.query(dosya(join(SCRIPTS, 'eph70_okuma.sql'))));
    const sonuc = s.cikti.filter((x) => x.komut === 'SELECT').map((x) => x.satir);
    return { not: `sorgu satır sayıları: ${sonuc.join(', ')}` };
  });

  await adim('A4', 'maxTeams kontrolü (§2.2)', async () => {
    const r = await q(c, `SELECT e->>'code' AS kod, e->>'active' AS aktif, jsonb_typeof(e->'maxTeams') AS tip
      FROM "SystemSetting" s, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s."valueJson"::jsonb)='array' THEN s."valueJson"::jsonb ELSE '[]'::jsonb END) e
      WHERE s.key = 'OFFICE_MEMBERSHIP_PACKAGES' ORDER BY 1`);
    const eksik = r.rows.filter((x) => x.aktif !== 'false' && x.tip !== 'number').map((x) => x.kod);
    return { etkilenen: `${r.rowCount} paket`, uyari: eksik.length > 0, not: eksik.length ? `maxTeams sayı değil/eksik: ${eksik.join(', ')} (PROVA-2 kararı: takım kotası ESKİ kurala göre danışman kapasitesinden türetilir — uyarı bilgidir)` : 'tüm aktif paketlerde maxTeams sayı' };
  });

  await adim('A5', 'ODM-2 öncesi veri durumu (§2.6) + OFIS_BOY (§2.4)', async () => {
    const sorunlar = [];
    const uzun = (await q(c, `SELECT count(*)::int AS n FROM pg_stat_activity WHERE xact_start IS NOT NULL AND now()-xact_start > interval '1 minute' AND pid <> pg_backend_pid() AND application_name <> 'prova_eph70' AND backend_type='client backend'`)).rows[0].n;
    if (uzun > 0) sorunlar.push(`1 dk'dan uzun açık işlem: ${uzun}`);
    const o = await tek(c, `SELECT to_regclass('public."StoreProduct"') p, to_regclass('public."StoreSubscription"') s, to_regclass('public."StoreEntitlementGrant"') g, to_regclass('public."PortfolioCreditLotTuketim"') t`);
    if (o.p || o.s || o.g || o.t) sorunlar.push('ODM-2/70B1F tabloları zaten var (kalıntı)');
    const kol = (await q(c, `SELECT table_name||'.'||column_name AS k FROM information_schema.columns WHERE (table_name,column_name) IN (('User','storeAccountToken'),('KullaniciUyelikPaketi','kaynakKanal'),('PaymentOrder','kanal'),('PaymentOrder','ortam'),('PaymentOrder','hedefOfficeId'))`)).rows;
    if (kol.length) sorunlar.push(`ODM-2 sütunları zaten var: ${kol.map((x) => x.k).join(',')}`);
    const tip = (await q(c, `SELECT typname FROM pg_type WHERE typname IN ('PaymentChannel','PaymentEnvironment','StorePlatform','StoreProductKind','StoreProductSegment','StoreSubscriptionStatus','OfisAbonelikDurumu','OfisEklentiTuru','OfisSureTuru')`)).rows;
    if (tip.length) sorunlar.push(`ODM-2 enum tipleri zaten var: ${tip.map((x) => x.typname).join(',')}`);
    const cift = (await q(c, `SELECT 1 FROM "PaymentTransaction" WHERE "providerTransactionId" IS NOT NULL GROUP BY "providerId","providerTransactionId","islemTuru" HAVING count(*) > 1`)).rowCount;
    if (cift) sorunlar.push(`çift PaymentTransaction grubu: ${cift} (ODM-2 migration RAISE EXCEPTION ile durur)`);
    const inv = (await q(c, `SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE NOT i.indisvalid`)).rows;
    if (inv.length) sorunlar.push(`INVALID indeks: ${inv.map((x) => x.relname).join(',')}`);
    const bek = (await q(c, `SELECT durum::text, count(*)::int AS n FROM "PaymentOrder" WHERE durum::text IN ('CREATED','PENDING') AND "olusturulmaTarihi" > now() - interval '30 minutes' GROUP BY 1`)).rows;
    const boy = await tek(c, `SELECT (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='Role' AND e.enumlabel='OFIS_BOY')::int AS rol, to_regclass('public."PotentialUnit"')::text AS tablo`);
    if (sorunlar.length) throw new Error(sorunlar.join('; '));
    return { not: `temiz; OFIS_BOY enum=${boy.rol ? 'var' : 'yok'}, PotentialUnit=${boy.tablo ?? 'yok'}; son 30dk bekleyen sipariş grubu=${bek.length} (kopyada anlamsız)` };
  }, { kritik: true });

  await adim('A6', 'Ayar yedeği içeriği kaydı (§2.7) — yalnız anahtar sayısı', async () => {
    const r = await q(c, `SELECT "key" FROM "SystemSetting" WHERE "key" IN ('OFFICE_MEMBERSHIP_PACKAGES','OFFICE_ADDON_CONFIG','OFFICE_TRIAL_CONFIG','OFFICE_FREE_LIMITS','KARDES_OFIS_PAKETLER','OFFICE_ENTITLEMENT_SOURCE','EPH_PAYMENT_SETTINGS_V1','EPH70_LOT_UZLASTIRMA_TAMAM','EPH70_YENI_DENEME_BASLANGICI','EPH70_DENEME_GERIDOLDURMA_TAMAM') ORDER BY 1`);
    return { etkilenen: `${r.rowCount} anahtar`, not: `mevcut: ${r.rows.map((x) => x.key).join(', ') || '(yok)'}` };
  });

  // ───── B) MIGRATION'LAR ─────
  for (const [i, m] of MIGRATIONLAR.entries()) {
    const kod = `B${String(i + 1).padStart(2, '0')}`;
    await adim(kod, `Migration: ${m.ad}`, async () => {
      if (m.cokKayitKontrolu) {
        const cift = (await q(c, `SELECT "kaynakKanal","kaynakAbonelikAnahtari",count(*) FROM "OfisAbonelik" WHERE "kaynakAbonelikAnahtari" IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1`)).rowCount;
        if (cift > 0) throw new Error(`000280 öncesi çift kayıt kontrolü BOŞ değil (${cift} grup) — INVALID indeks olurdu, uygulanmadı`);
      }
      const yol = m.duz ? join(MIG_DIZIN, m.ad) : join(MIG_DIZIN, m.ad, 'migration.sql');
      const sql = dosya(yol);
      const eszamansiz = /CONCURRENTLY/i.test(sql);
      const kendiTx = /^\s*(BEGIN|COMMIT|START TRANSACTION)\s*;/mi.test(sql);
      let mod;
      if (eszamansiz) {
        mod = 'autocommit (CONCURRENTLY)';
        await c.query("SET lock_timeout='5s'");
        try { await c.query(sql); } finally { await c.query('RESET lock_timeout'); }
      } else if (kendiTx) {
        mod = 'dosyanın kendi BEGIN/COMMIT\'i';
        await c.query("SET lock_timeout='5s'");
        try { await c.query(sql); } finally { await c.query('RESET lock_timeout').catch(() => {}); }
      } else {
        mod = 'tek transaction';
        await c.query('BEGIN');
        try {
          await c.query("SET LOCAL lock_timeout='5s'");
          await c.query(sql);
          await c.query('COMMIT');
        } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
      }
      let resolveNotu = 'düz dosya: Prisma defterine işlenmez';
      if (!m.duz) {
        const r = calistir([join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'resolve', '--applied', m.ad]);
        if (r.kod !== 0) throw new Error(`SQL uygulandı (${mod}) ama "prisma migrate resolve --applied" başarısız (çıkış ${r.kod}): ${sonSatir(r.cikti)}`);
        const k = await tek(c, 'SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL', [m.ad]);
        if (k.n !== 1) throw new Error('resolve çıkış kodu 0 ama defterde tamamlanmış kayıt görünmüyor');
        resolveNotu = 'resolve --applied ✔';
      }
      return { not: `${mod}; ${resolveNotu}` };
    }, { kritik: true });
  }

  await adim('B19', 'Migration sonrası: defter + INVALID indeks', async () => {
    const ad = MIGRATIONLAR.filter((m) => !m.duz).map((m) => m.ad);
    const n = (await tek(c, 'SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE migration_name = ANY($1) AND finished_at IS NOT NULL AND rolled_back_at IS NULL', [ad])).n;
    const inv = (await q(c, 'SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE NOT i.indisvalid')).rows;
    if (n !== ad.length) throw new Error(`defterde ${n}/${ad.length} migration tamamlanmış`);
    if (inv.length) throw new Error(`INVALID indeks: ${inv.map((x) => x.relname).join(', ')}`);
    return { etkilenen: `${n} defter kaydı`, not: 'INVALID indeks yok' };
  }, { kritik: true });

  // ───── C) SQL BETİKLERİ (planın sırası: ayar yedeği → ayarlar → ürünler → okuma → lot uzlaştırma → bayraklar) ─────
  await adim('C0', '4.0 Ayar yedek tablosu (_deploy1_ayar_yedek)', async () => {
    const r = await q(c, `CREATE TABLE "_deploy1_ayar_yedek" AS SELECT * FROM "SystemSetting" WHERE "key" IN ('OFFICE_MEMBERSHIP_PACKAGES','OFFICE_ADDON_CONFIG','OFFICE_TRIAL_CONFIG','OFFICE_FREE_LIMITS','KARDES_OFIS_PAKETLER','OFFICE_ENTITLEMENT_SOURCE')`);
    return { etkilenen: `${r.rowCount} satır` };
  }, { kritik: true });

  await adim('C1', '4.1 eph70b2_ayarlar.sql (COMMIT\'li prova kopyası)', async () => {
    const kopya = ustSeviyeRollbackCommit(dosya(join(SCRIPTS, 'eph70b2_ayarlar.sql')), 'eph70b2_ayarlar.sql');
    writeFileSync(join(GECICI, 'eph70b2_ayarlar.prova.sql'), kopya);
    const s = ozet(await c.query(kopya));
    const dogrulama = s.cikti.filter((x) => x.komut === 'SELECT');
    return { etkilenen: `${s.dml} satır yazıldı`, not: `doğrulama sorguları: ${dogrulama.map((x) => x.satir).join(', ')} satır` };
  }, { kritik: true });

  await adim('C2', '4.2 odm2_store_products.sql (prova kopyası)', async () => {
    let sql = dosya(join(SCRIPTS, 'odm2_store_products.sql'));
    // dosya kendi sonunda COMMIT içerir; üst düzey ROLLBACK varsa COMMIT'e çevrilir
    if (/^ROLLBACK;.*$/m.test(sql)) sql = ustSeviyeRollbackCommit(sql, 'odm2_store_products.sql');
    writeFileSync(join(GECICI, 'odm2_store_products.prova.sql'), sql);
    const notices = [];
    const onNotice = (n) => notices.push(String(n.message || '').slice(0, 160));
    c.on('notice', onNotice);
    let s;
    try { s = ozet(await c.query(sql)); } finally { c.off('notice', onNotice); }
    const uyarilar = notices.filter((x) => /UYARI/i.test(x));
    return { etkilenen: `${s.dml} satır eklendi`, uyari: uyarilar.length > 0, not: uyarilar.length ? `${uyarilar.length} adet NOTICE UYARI (aktifMi=false ürün): ${uyarilar.slice(0, 3).join(' | ')}` : 'NOTICE UYARI yok' };
  }, { kritik: true });

  await adim('C3', '4.3 eph70_okuma.sql (yeniden — SOLO eklenmiş olmalı)', async () => {
    const r = await q(c, `SELECT count(*)::int AS n FROM "SystemSetting" s, LATERAL jsonb_array_elements(s."valueJson"::jsonb) e WHERE s.key='OFFICE_MEMBERSHIP_PACKAGES' AND e->>'code'='SOLO'`);
    ozet(await c.query(dosya(join(SCRIPTS, 'eph70_okuma.sql'))));
    if (r.rows[0].n !== 1) throw new Error('OFFICE_MEMBERSHIP_PACKAGES içinde SOLO yok');
    return { not: 'SOLO katalogda' };
  });

  const lotDosya = dosya(join(SCRIPTS, 'eph70_lot_uzlastirma.sql'));
  let lotDefterHazir = false;
  await adim('C4a', '4.4 eph70_lot_uzlastirma.sql — KURU ÇALIŞTIRMA (orijinal, ROLLBACK)', async () => {
    const s = ozet(await c.query(lotDosya));
    const skalerler = s.cikti.filter((x) => x.komut === 'SELECT' && x.rows && x.rows.length === 1 && x.alanlar.length === 1).map((x) => `${x.alanlar[0]}=${x.rows[0][x.alanlar[0]]}`);
    return { etkilenen: 'ROLLBACK (kalıcı değişiklik yok)', not: skalerler.join('; ') };
  });

  let lotKarar = null;
  await adim('C4b', '4.4 eph70_lot_uzlastirma.sql — COMMIT\'li prova kopyası', async () => {
    const kopya = ustSeviyeRollbackCommit(lotDosya, 'eph70_lot_uzlastirma.sql');
    writeFileSync(join(GECICI, 'eph70_lot_uzlastirma.prova.sql'), kopya);
    const s = ozet(await c.query(kopya));
    lotDefterHazir = true;
    const kar = (await q(c, `SELECT "durum", count(*)::int AS adet FROM "_eph70_lot_cuzdan" GROUP BY 1 ORDER BY 1`)).rows;
    lotKarar = Object.fromEntries(kar.map((x) => [x.durum, x.adet]));
    const skalerler = s.cikti.filter((x) => x.komut === 'SELECT' && x.rows && x.rows.length === 1 && x.alanlar.length === 1).map((x) => `${x.alanlar[0]}=${x.rows[0][x.alanlar[0]]}`);
    const lotSatir = (await tek(c, `SELECT count(*) FILTER (WHERE "uygulananAt" IS NOT NULL)::int AS uygulanan FROM "_eph70_lot_defter"`)).uygulanan;
    return { etkilenen: `${lotSatir} lot satırı düşüldü; DML toplamı ${s.dml}`, not: `cüzdan kararı: ${JSON.stringify(lotKarar)}; ${skalerler.join('; ')}` };
  }, { kritik: true });

  await adim('C5', '4.5 Bayrak 1: EPH70_YENI_DENEME_BASLANGICI (dosyadaki yorumlu INSERT, tarih = şimdi UTC)', async () => {
    if (!lotDefterHazir) throw new Error('lot uzlaştırma işlenmedi');
    const stmts = yorumluInsertler(lotDosya);
    // NOT: TAMAM INSERT'inin koşulları da bu anahtar adını içerir; bu yüzden TAMAM olmayan ifade seçilir.
    const deneme = stmts.find((x) => !x.includes("'EPH70_LOT_UZLASTIRMA_TAMAM'") && x.includes("'EPH70_YENI_DENEME_BASLANGICI'"));
    if (!deneme) throw new Error('dosyada EPH70_YENI_DENEME_BASLANGICI INSERT\'i bulunamadı (dosya biçimi değişmiş)');
    const simdi = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const sql = deneme.replace('2026-11-09T00:00:00Z', simdi);
    if (sql === deneme) throw new Error('örnek tarih yer tutucusu bulunamadı — tarih değiştirilemedi');
    const r = await q(c, sql);
    return { etkilenen: `${r.rowCount} satır`, not: `değer ${simdi}` };
  });

  await adim('C6', '4.6 Bayrak 2: EPH70_LOT_UZLASTIRMA_TAMAM (koşullu INSERT)', async () => {
    const stmts = yorumluInsertler(lotDosya);
    const tamam = stmts.find((x) => x.includes("'EPH70_LOT_UZLASTIRMA_TAMAM'"));
    if (!tamam) throw new Error('dosyada EPH70_LOT_UZLASTIRMA_TAMAM INSERT\'i bulunamadı');
    const r = await q(c, tamam);
    if (r.rowCount === 0) return { uyari: true, etkilenen: '0 satır', not: `BAYRAK YAZILMADI (koşul sağlanmıyor; cüzdan kararı ${JSON.stringify(lotKarar)}) — INCELEME>0 ise beklenen sonuç` };
    return { etkilenen: `${r.rowCount} satır` };
  });
  sonuclar.push({ kod: 'C7', baslik: '4.7 Bayrak 3: EPH70_DENEME_GERIDOLDURMA_TAMAM', durum: 'ATLANDI', ms: 0, etkilenen: '-', not: 'plan gereği YAZILMAZ (geri doldurma betiği yok)' });

  // ───── D) SON KONTROLLER ─────
  await adim('D1', 'Tablolar var mı', async () => {
    const eksik = [];
    for (const t of YENI_TABLOLAR) if (!(await tek(c, 'SELECT to_regclass($1)::text AS r', [`public."${t}"`])).r) eksik.push(t);
    if (eksik.length) throw new Error(`eksik tablo: ${eksik.join(', ')}`);
    return { etkilenen: `${YENI_TABLOLAR.length} tablo` };
  }, { atlaKosul: false });

  await adim('D2', 'İndeksler var + geçerli', async () => {
    const adlar = [];
    for (const m of MIGRATIONLAR.filter((x) => !x.duz)) {
      const sql = dosya(join(MIG_DIZIN, m.ad, 'migration.sql'));
      for (const e of sql.matchAll(/INDEX\s+CONCURRENTLY\s+IF NOT EXISTS\s+"([^"]+)"/gi)) adlar.push(e[1].slice(0, 63));
    }
    const mevcut = (await q(c, `SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname = ANY($1)`, [adlar])).rows;
    const eksik = adlar.filter((a) => !mevcut.some((m) => m.relname === a));
    const gecersiz = mevcut.filter((m) => !m.indisvalid).map((m) => m.relname);
    const genelInvalid = (await q(c, 'SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE NOT i.indisvalid')).rowCount;
    if (eksik.length || gecersiz.length || genelInvalid) throw new Error(`eksik: [${eksik.join(', ')}] geçersiz: [${gecersiz.join(', ')}] genel INVALID: ${genelInvalid}`);
    return { etkilenen: `${adlar.length} indeks` };
  }, { atlaKosul: false });

  await adim('D3', 'StoreProduct = 40 satır', async () => {
    const r = await tek(c, `SELECT count(*)::int AS toplam, count(*) FILTER (WHERE "aktifMi")::int AS aktif, count(*) FILTER (WHERE NOT "aktifMi")::int AS pasif FROM "StoreProduct"`);
    if (r.toplam !== 40) throw new Error(`40 beklenirdi, ${r.toplam} bulundu`);
    return { etkilenen: '40 satır', uyari: r.pasif > 0, not: `aktif=${r.aktif}, pasif(aktifMi=false)=${r.pasif}` };
  }, { atlaKosul: false });

  await adim('D4', 'Ayar anahtarları + SOLO + kaynak=legacy', async () => {
    const var_ = (await q(c, 'SELECT "key" FROM "SystemSetting" WHERE "key" = ANY($1)', [AYAR_ANAHTARLARI])).rows.map((x) => x.key);
    const eksik = AYAR_ANAHTARLARI.filter((k) => !var_.includes(k));
    const kaynak = (await tek(c, `SELECT "valueJson"::text AS v FROM "SystemSetting" WHERE "key"='OFFICE_ENTITLEMENT_SOURCE'`)).v;
    const platin = (await tek(c, `SELECT count(*)::int AS n FROM "SystemSetting" s, LATERAL jsonb_array_elements(s."valueJson"::jsonb) e WHERE s.key='OFFICE_MEMBERSHIP_PACKAGES' AND e->>'code'='PLATINUM' AND e->>'ofisBoyDahil'='2' AND e->>'kardesOfis'='true'`)).n;
    const hatalar = [];
    if (eksik.length) hatalar.push(`eksik anahtar: ${eksik.join(', ')}`);
    if (kaynak !== '"legacy"') hatalar.push(`OFFICE_ENTITLEMENT_SOURCE=${kaynak} ("legacy" beklenirdi)`);
    if (hatalar.length) throw new Error(hatalar.join('; '));
    return { etkilenen: `${var_.length} anahtar`, uyari: platin !== 1, not: platin === 1 ? 'Platinum: ofisBoyDahil=2, kardesOfis=true ✔' : 'Platinum satırı kilitli değerlerle (ofisBoyDahil=2, kardesOfis=true) eşleşmiyor' };
  }, { atlaKosul: false });

  await adim('D5', 'INCELEME cüzdan sayısı · negatif lot · uygulanmamış defter', async () => {
    if (!lotDefterHazir) throw new Error('lot defteri yok (C4b çalışmadı)');
    const r = await tek(c, `SELECT (SELECT count(*) FROM "_eph70_lot_cuzdan" WHERE "durum"='INCELEME')::int AS inceleme,
      (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0)::int AS negatif,
      (SELECT count(*) FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL)::int AS uygulanmamis`);
    if (r.negatif !== 0) throw new Error(`negatif lot: ${r.negatif}`);
    if (r.uygulanmamis !== 0) throw new Error(`uygulanmamış defter satırı: ${r.uygulanmamis}`);
    return { etkilenen: `INCELEME=${r.inceleme}`, uyari: r.inceleme > 0, not: `negatif lot=0, uygulanmamış defter=0${r.inceleme > 0 ? '; INCELEME>0 → bayrak 2 yazılmaz, canlıda elle çözüm gerekir (§4.4)' : ''}` };
  }, { atlaKosul: false });

  await adim('D6', 'Bayrak durumu', async () => {
    const r = (await q(c, `SELECT "key","valueJson"::text AS v FROM "SystemSetting" WHERE "key" IN ('EPH70_LOT_UZLASTIRMA_TAMAM','EPH70_YENI_DENEME_BASLANGICI','EPH70_DENEME_GERIDOLDURMA_TAMAM')`)).rows;
    const m = Object.fromEntries(r.map((x) => [x.key, x.v]));
    if (m.EPH70_DENEME_GERIDOLDURMA_TAMAM !== undefined) throw new Error('GERIDOLDURMA bayrağı yazılmış olmamalıydı');
    const ozetMetin = `TAMAM=${m.EPH70_LOT_UZLASTIRMA_TAMAM ?? '(yok)'}; YENI_DENEME_BASLANGICI=${m.EPH70_YENI_DENEME_BASLANGICI ?? '(yok)'}; GERIDOLDURMA_TAMAM=(yok, beklenen)`;
    return { etkilenen: '3 bayrak', uyari: m.EPH70_LOT_UZLASTIRMA_TAMAM === undefined, not: ozetMetin };
  }, { atlaKosul: false });

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

// ───────────────────────────── Yorumlu INSERT çıkarımı (lot uzlaştırma dosyasının sonu) ─────────────────────────────
function yorumluInsertler(sql) {
  const satirlar = sql.split(/\r?\n/);
  const basla = satirlar.findIndex((s) => /AYRI ADIM/.test(s));
  const bitis = satirlar.findIndex((s, i) => i > basla && /GERİ ALMA \(commit sonrası/.test(s));
  if (basla < 0 || bitis < 0) throw new Error('lot dosyasında "AYRI ADIM"/"GERİ ALMA" işaretleri bulunamadı');
  const bolge = satirlar.slice(basla, bitis).filter((s) => /^--\s?/.test(s)).map((s) => s.replace(/^--\s?/, ''));
  const out = []; let akim = null;
  for (const s of bolge) {
    if (!akim && /^INSERT INTO "SystemSetting"/.test(s.trim())) akim = [];
    if (akim) { akim.push(s); if (/;\s*$/.test(s.trim())) { out.push(akim.join('\n')); akim = null; } }
  }
  if (out.length !== 2) throw new Error(`lot dosyasında 2 yorumlu INSERT beklenirdi, ${out.length} bulundu`);
  return out;
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
