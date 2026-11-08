/**
 * PROVA-3 — deneme geri doldurma betikleri + salt okuma sorgu aracı: DB'ye BAĞLANMADAN statik/saf testler.
 * (Betikler çalıştırılmaz; yalnız dosya metni ve saf yardımcılar sınanır.)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { hashPhone, normalizePhone } from '../common/telefon-hash';

const SCRIPTS = join(__dirname, '..', '..', 'scripts');
const oku = (...p: string[]) => readFileSync(join(SCRIPTS, ...p), 'utf8');
/* eslint-disable @typescript-eslint/no-require-imports */
const hashCekirdek = require(join(SCRIPTS, 'eph70_gecis_hash_cekirdek.cjs'));
const sorguCekirdek = require(join(SCRIPTS, 'prova', 'prova_sorgu_cekirdek.cjs'));
/* eslint-enable @typescript-eslint/no-require-imports */

const yorumsuz = (sql: string) => sql.split(/\r?\n/).filter((l) => !/^\s*--/.test(l)).join('\n');

describe('eph70_gecis.sql (statik)', () => {
  const sql = oku('eph70_gecis.sql');
  const govde = yorumsuz(sql);

  it('tek BEGIN, tek üst düzey ROLLBACK; yorumsuz COMMIT yok (varsayılan ROLLBACK)', () => {
    expect(govde.match(/^BEGIN;/gm)).toHaveLength(1);
    expect(sql.match(/^ROLLBACK;.*$/gm)).toHaveLength(1);
    expect(govde).not.toMatch(/^\s*COMMIT\s*;/m);
  });

  it('yalnız OfisDenemeKaydi ve OfisGecisDefteri tablolarına yazar; lot/cüzdan/ayar/kullanıcıya YAZMAZ (18b)', () => {
    const yazimlar = [...govde.matchAll(/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE|DROP\s+TABLE)\s+("?[A-Za-z_]+"?)/gi)].map((m) => m[2].replace(/"/g, ''));
    expect(yazimlar.length).toBeGreaterThan(0);
    for (const t of yazimlar) expect(['OfisDenemeKaydi', 'OfisGecisDefteri']).toContain(t);
    expect(govde).not.toMatch(/\b(KontorCuzdani|PortfolioCreditLot|SystemSetting)\b[^;]*\b(SET|VALUES)\b/i.test('') ? /$^/ : /INSERT\s+INTO\s+"(SystemSetting|KontorCuzdani|PortfolioCreditLot|KontorHareketi)"/i);
  });

  it('telefon hash SQL içinde üretilmez (anahtar SQL/komut geçmişine girmez); kayıtlar telefonHash=NULL ile açılır', () => {
    expect(govde).not.toMatch(/hmac\s*\(|digest\s*\(|pgcrypto|TELEFON_HASH_ANAHTARI/i);
    expect(govde).toMatch(/'GECIS', p\.baslangic, p\.bitis, GREATEST\(p\.pk, 0\), NULL, NULL/);
    expect(govde).toMatch(/INSERT INTO "OfisDenemeKaydi"[\s\S]*?VALUES|INSERT INTO "OfisDenemeKaydi"[\s\S]*?SELECT gen_random_uuid\(\)::text, p\.ofis_id, p\.uid, NULL, 'GECIS'/);
  });

  it('idempotent: iki INSERT de ON CONFLICT DO NOTHING; sayım SELECT\'i yazımlardan önce', () => {
    expect(govde.match(/ON CONFLICT \("officeId"\) DO NOTHING/g)).toHaveLength(1);
    expect(govde.match(/ON CONFLICT \("kaynakAnahtar"\) DO NOTHING/g)).toHaveLength(1);
    expect(sql.indexOf('FROM "KontorHareketi" h')).toBeLessThan(sql.indexOf('INSERT INTO "OfisDenemeKaydi"'));
  });

  it('bayrak INSERT\'i YORUMLU ve ayrı adımda; "AYRI ADIM" ile "GERİ ALMA" arasında tam 1 yorumlu INSERT (prova çıkarımı)', () => {
    const satirlar = sql.split(/\r?\n/);
    const basla = satirlar.findIndex((s) => /AYRI ADIM/.test(s));
    const bitis = satirlar.findIndex((s, i) => i > basla && /GERİ ALMA \(commit sonrası/.test(s));
    expect(basla).toBeGreaterThan(0);
    expect(bitis).toBeGreaterThan(basla);
    const bolge = satirlar.slice(basla, bitis).filter((s) => /^--\s?/.test(s)).map((s) => s.replace(/^--\s?/, ''));
    const out: string[] = []; let akim: string[] | null = null;
    for (const s of bolge) {
      if (!akim && /^INSERT INTO "SystemSetting"/.test(s.trim())) akim = [];
      if (akim) { akim.push(s); if (/;\s*$/.test(s.trim())) { out.push(akim.join('\n')); akim = null; } }
    }
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("'EPH70_DENEME_GERIDOLDURMA_TAMAM'");
    expect(out[0]).toMatch(/KARANTINA/);
    expect(out[0]).toMatch(/"telefonHash" IS NULL/);
    expect(govde).not.toContain('EPH70_DENEME_GERIDOLDURMA_TAMAM'); // yorumsuz kısımda bayrak yazılmaz
  });

  it('kişisel veri çıktısı yok: phone/e-posta/ad sütunu seçilmez', () => {
    expect(govde).not.toMatch(/\b(u\.phone|"phone"|"email"|"firstName"|"lastName")\b/);
  });
});

describe('eph70_gecis_telefon_hash.mjs (statik) + çekirdek', () => {
  const kod = oku('eph70_gecis_telefon_hash.mjs');

  it('çekirdek, uygulamadaki hashPhone/normalizePhone ile AYNI sonucu üretir', () => {
    const anahtar = 'test-anahtar-0123456789-abcdef';
    for (const t of ['0532 123 45 67', '+90 (532) 123-45-67', '5321234567', '00905321234567', '+49 151 23456789']) {
      expect(hashCekirdek.normalizePhone(t)).toBe(normalizePhone(t));
      expect(hashCekirdek.hashPhoneSafe(t, anahtar)).toEqual({ hash: hashPhone(t, anahtar) });
    }
  });

  it('geçersiz anahtar/telefon değer sızdırmadan hata kodu döner', () => {
    expect(hashCekirdek.hashPhoneSafe('5321234567', 'kisa')).toEqual({ hata: 'ANAHTAR' });
    expect(hashCekirdek.hashPhoneSafe('123', 'test-anahtar-0123456789-abcdef')).toEqual({ hata: 'TELEFON' });
    expect(hashCekirdek.hashPhoneSafe('', 'test-anahtar-0123456789-abcdef')).toEqual({ hata: 'TELEFON' });
  });

  it('varsayılan KURU ÇALIŞTIRMA (ROLLBACK); COMMIT yalnız --uygula ile', () => {
    expect(kod).toMatch(/UYGULA \? 'COMMIT' : 'ROLLBACK'/);
    expect(kod).toMatch(/process\.argv\.includes\('--uygula'\)/);
  });

  it('anahtar, telefon, hash, adres ekrana yazılmaz (yalnız sayılar); hata çıktısı yalnız kod', () => {
    const cikti = kod.split(/\r?\n/).filter((l) => /console\.(log|error|warn)/.test(l)).join('\n');
    // yalnız DEĞER enterpolasyonları yasak (hata metinlerinde değişken ADI geçebilir: "DATABASE_URL tanımlı değil")
    expect(cikti).not.toMatch(/\$\{\s*(url|anahtar|s\.hash|r\.tel|r\.ofis|r\.id)\s*\}|process\.env\[|e\.message|e\?\.message/);
    expect(cikti).toMatch(/e\.code/);
  });

  it('yalnız GECIS + telefonHash NULL kayıtlara dokunur; lot/cüzdan/ayar tablosuna yazmaz', () => {
    expect(kod).toMatch(/"kaynak" = 'GECIS' AND d\."telefonHash" IS NULL/);
    expect(kod).toMatch(/"telefonHash" IS NULL', \[s\.hash, r\.id\]|"telefonHash" IS NULL'/);
    expect(kod).not.toMatch(/(INSERT INTO|UPDATE|DELETE FROM)\s+"(PortfolioCreditLot|KontorCuzdani|KontorHareketi|SystemSetting|User)"/);
  });
});

describe('prova_sorgu çekirdeği: canlı kilidi', () => {
  it('canlı host parçası → true; pooler → true/false doğru; farklı host → false', () => {
    expect(sorguCekirdek.canliMi('postgresql://u:p@ep-morning-sound-al8p9dak.eu-central-1.aws.neon.tech/db', {})).toBe(true);
    expect(sorguCekirdek.canliMi('postgresql://u:p@ep-prova-1234.eu-central-1.aws.neon.tech/db', {})).toBe(false);
  });
  it('DATABASE_URL/DIRECT_URL ile aynı host+veritabanı → canlı sayılır', () => {
    const prova = 'postgresql://u:p@ep-baska-1.neon.tech/neondb?sslmode=require';
    expect(sorguCekirdek.canliMi(prova, { DATABASE_URL: 'postgresql://x:y@ep-baska-1.neon.tech/neondb' })).toBe(true);
    expect(sorguCekirdek.canliMi(prova, { DIRECT_URL: prova })).toBe(true);
    expect(sorguCekirdek.canliMi(prova, { DATABASE_URL: 'postgresql://x:y@ep-baska-2.neon.tech/neondb' })).toBe(false);
  });
  it('pooler adresi reddedilir', () => {
    expect(sorguCekirdek.poolerMi('postgresql://u:p@ep-abc-pooler.eu-central-1.aws.neon.tech/db')).toBe(true);
    expect(sorguCekirdek.poolerMi('postgresql://u:p@ep-abc.neon.tech/db?pgbouncer=true')).toBe(true);
    expect(sorguCekirdek.poolerMi('postgresql://u:p@ep-abc.neon.tech/db')).toBe(false);
  });
});

describe('prova_sorgu çekirdeği: salt okuma SQL taraması', () => {
  const tara = (s: string) => sorguCekirdek.sqlTarama(s);

  it('ilk hedef eph70_inceleme_listesi.sql taramadan GEÇER', () => {
    expect(tara(oku('eph70_inceleme_listesi.sql'))).toEqual({ ok: true, nedenler: [] });
  });
  it('eph70_okuma.sql taramadan geçer', () => {
    expect(tara(oku('eph70_okuma.sql')).ok).toBe(true);
  });
  it.each([
    ['UPDATE "A" SET x = 1'], ['INSERT INTO "A" VALUES (1)'], ['DELETE FROM "A"'], ['TRUNCATE "A"'], ['DROP TABLE "A"'], ['CREATE TABLE a (i int)'],
    ['SELECT 1; COMMIT;'], ['SELECT * FROM "A" FOR UPDATE'], ['SELECT 1; SET TRANSACTION READ WRITE'], ["SELECT set_config('default_transaction_read_only','off',false)"],
    ['SELECT * INTO yeni FROM "A"'], ['WITH x AS (DELETE FROM "A" RETURNING *) SELECT * FROM x'], ['DO $$ BEGIN PERFORM 1; END $$'], ['EXPLAIN ANALYZE SELECT 1'],
    ["SELECT pg_advisory_lock(1)"], ["SELECT nextval('s')"], ['SET default_transaction_read_only = off; SELECT 1'], ['CALL p()'],
  ])('REDDEDER: %s', (s) => {
    expect(tara(s).ok).toBe(false);
  });
  it.each([
    ['SELECT 1'], ['BEGIN READ ONLY; SELECT 1; ROLLBACK;'], ["SELECT 'UPDATE x' AS a, \"insert\" FROM t -- DELETE FROM x"], ['/* DROP TABLE a */ SELECT CASE WHEN 1=1 THEN 1 ELSE 0 END'],
    ["SET LOCAL statement_timeout = '5s'; SELECT 1"], ['EXPLAIN SELECT 1'], ['WITH a AS (SELECT 1) SELECT * FROM a'],
  ])('KABUL EDER: %s', (s) => {
    expect(tara(s).ok).toBe(true);
  });
  it('yorum/metin içindeki yasak sözcükler yanlış alarm vermez; iskelet temizler', () => {
    expect(sorguCekirdek.iskelet("SELECT 'DROP' -- UPDATE\n, \"DELETE\"")).not.toMatch(/DROP|UPDATE|DELETE/);
  });
  it('dosyanın kendi BEGIN/ROLLBACK satırları çıkarılır (sarmalayıcıyı araç yönetir)', () => {
    const k = sorguCekirdek.sarmalayicilariKaldir('BEGIN READ ONLY;\nSELECT 1;\nROLLBACK;   -- bitti\n');
    expect(k).not.toMatch(/BEGIN|ROLLBACK/);
    expect(k).toContain('SELECT 1;');
  });
  it('hassas sütun adlarının değeri maskelenir; "...Kisa" kısa kimlik sütunu açık kalır', () => {
    expect(sorguCekirdek.hucreMaskele('telefon', '0532')).toBe('[gizli]');
    expect(sorguCekirdek.hucreMaskele('telefonHash', 'abc')).toBe('[gizli]');
    expect(sorguCekirdek.hucreMaskele('kullaniciEposta', 'a@b.c')).toBe('[gizli]');
    expect(sorguCekirdek.hucreMaskele('cuzdanKisa', 'ab12cd34')).toBe('ab12cd34');
    expect(sorguCekirdek.hucreMaskele('bakiye', 5)).toBe(5);
    expect(sorguCekirdek.hucreMaskele('telefon', null)).toBeNull();
  });
});

describe('prova_sorgu.mjs ve prova_eph70.mjs (statik)', () => {
  const sorgu = oku('prova', 'prova_sorgu.mjs');
  const prova = oku('prova', 'prova_eph70.mjs');

  it('prova_sorgu: yalnız PROVA_DATABASE_URL\'den bağlanır, canlı kilidi + salt okuma oturumu + rapor adresi içermez', () => {
    expect(sorgu).toMatch(/process\.env\.PROVA_DATABASE_URL/);
    expect(sorgu).toMatch(/new Client\(\{ connectionString: PROVA_URL\.trim\(\)/);
    expect(sorgu).not.toMatch(/connectionString:\s*process\.env\.(DATABASE_URL|DIRECT_URL)/);
    expect(sorgu).toMatch(/process\.exit\(2\)/);
    expect(sorgu).toMatch(/default_transaction_read_only = on/);
    expect(sorgu).toMatch(/BEGIN READ ONLY/);
    expect(sorgu).toMatch(/PROVA_SORGU_\$\{damga\}\.md/);
    expect(sorgu.indexOf('sqlTarama(sqlHam)')).toBeLessThan(sorgu.indexOf('c.connect()')); // tarama bağlantıdan ÖNCE
    expect(sorgu).not.toMatch(/\.env['"`]|readFileSync\([^)]*\.env/);
  });
  it('prova_eph70: geçiş betiği C4 sonrasında (C4b < C7a < C7b < C7c < C7d) ve D6 bayrak yazıldı mı bakar', () => {
    const i = (k: string) => prova.indexOf(`adim('${k}'`);
    expect(i('C4b')).toBeGreaterThan(0);
    expect(i('C7a')).toBeGreaterThan(i('C4b'));
    expect(i('C7b')).toBeGreaterThan(i('C7a'));
    expect(i('C7c')).toBeGreaterThan(i('C7b'));
    expect(i('C7d')).toBeGreaterThan(i('C7c'));
    expect(i('D6')).toBeGreaterThan(i('C7d'));
    expect(prova).toMatch(/ustSeviyeRollbackCommit\(gecisDosya, 'eph70_gecis\.sql'\)/);
    expect(prova).toMatch(/GERIDOLDURMA_TAMAM=\$\{gd \?\? '\(YAZILMADI\)'\}/);
    expect(prova).not.toMatch(/GERIDOLDURMA bayrağı yazılmış olmamalıydı/);
  });
});
