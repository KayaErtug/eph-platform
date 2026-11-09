import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// RELEASE-1: canlı çalıştırıcı + ortak çekirdek. Hiçbir test veritabanına bağlanmaz (kilitler bağlantıdan ÖNCE çalışır; çekirdek sahte istemciyle denenir).
const SCRIPTS = join(__dirname, '..', '..', 'scripts');
const oku = (...p: string[]) => readFileSync(join(SCRIPTS, ...p), 'utf8');
const CANLI = join(SCRIPTS, 'deploy', 'canli_eph70.mjs');
const CEKIRDEK = join(SCRIPTS, 'deploy', 'eph70_cekirdek.mjs');
const CANLI_HOST = 'ep-morning-sound-al8p9dak.test.invalid';
const KEY = 'x'.repeat(40);

function calistir(env: Record<string, string>) {
  const r = spawnSync(process.execPath, [CANLI], {
    env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', CANLI_RAPOR_DIZINI: join(SCRIPTS, '__yok_rapor__'), ...env },
    encoding: 'utf8', input: '', timeout: 30000,
  });
  return { kod: r.status, cikti: `${r.stdout}\n${r.stderr}` };
}

describe('canli_eph70.mjs güvenlik kilitleri (bağlantı öncesi çıkışlar)', () => {
  it('CANLI_DATABASE_URL yoksa 3', () => {
    expect(calistir({ TELEFON_HASH_ANAHTARI: KEY }).kod).toBe(3);
  });
  it('geçersiz adres → 3', () => {
    expect(calistir({ CANLI_DATABASE_URL: 'bu-bir-adres-degil', TELEFON_HASH_ANAHTARI: KEY }).kod).toBe(3);
  });
  it('TERS KİLİT: canlı host içermeyen (prova) adres → 2 ve adres yazdırılmaz', () => {
    const url = 'postgresql://kul:GizliParola123@ep-young-cloud-prova.test.invalid/neondb?sslmode=require';
    const r = calistir({ CANLI_DATABASE_URL: url, TELEFON_HASH_ANAHTARI: KEY });
    expect(r.kod).toBe(2);
    expect(r.cikti).not.toContain('GizliParola123');
    expect(r.cikti).not.toContain('ep-young-cloud-prova');
  });
  it('pooler adresi reddedilir → 3', () => {
    const url = `postgresql://kul:GizliParola123@${CANLI_HOST.replace('al8p9dak', 'al8p9dak-pooler')}/neondb`;
    expect(calistir({ CANLI_DATABASE_URL: url, TELEFON_HASH_ANAHTARI: KEY }).kod).toBe(3);
    expect(calistir({ CANLI_DATABASE_URL: `postgresql://k:p@${CANLI_HOST}/neondb?pgbouncer=true`, TELEFON_HASH_ANAHTARI: KEY }).kod).toBe(3);
  });
  it('TELEFON_HASH_ANAHTARI yok/kısa → 3 (başlamadan durur)', () => {
    const url = `postgresql://kul:GizliParola123@${CANLI_HOST}/neondb`;
    expect(calistir({ CANLI_DATABASE_URL: url }).kod).toBe(3);
    const r = calistir({ CANLI_DATABASE_URL: url, TELEFON_HASH_ANAHTARI: 'kisa' });
    expect(r.kod).toBe(3);
    expect(r.cikti).not.toContain('GizliParola123');
  });
  it('tüm kilitler geçse de etkileşimli terminal yoksa 4 (onay sorulmadan yazma yok)', () => {
    const url = `postgresql://kul:GizliParola123@${CANLI_HOST}/neondb?sslmode=require`;
    const r = calistir({ CANLI_DATABASE_URL: url, TELEFON_HASH_ANAHTARI: KEY });
    expect(r.kod).toBe(4);
    expect(r.cikti).not.toContain('GizliParola123');
    expect(r.cikti).not.toContain(KEY);
  });
});

describe('canli_eph70.mjs yapı (statik)', () => {
  const canli = oku('deploy', 'canli_eph70.mjs');
  const prova = oku('prova', 'prova_eph70.mjs');
  it('ortak çekirdeği kullanır; prova da aynı çekirdeği kullanır (kopya yok)', () => {
    expect(canli).toMatch(/from '\.\/eph70_cekirdek\.mjs'/);
    expect(prova).toMatch(/from '\.\.\/deploy\/eph70_cekirdek\.mjs'/);
    expect(prova).not.toMatch(/adim\('B\d\d'|adim\('C4b'/);
  });
  it('E adımları (prova backend) yok; adres yalnız CANLI_DATABASE_URL; DATABASE_URL/PROVA_DATABASE_URL okunmaz', () => {
    expect(canli).not.toMatch(/provaBackend|adim\('E\d/);
    expect(canli).not.toMatch(/process\.env\.(PROVA_DATABASE_URL|DATABASE_URL|DIRECT_URL)/);
    expect(canli).toMatch(/process\.env\.CANLI_DATABASE_URL/);
  });
  it('üç onay sorusu + CANLI-<tarih>; ilk başarısızlıkta durur (atlaKosul yok sayılır); geri dönüş talimatı yazılır', () => {
    expect(canli).toMatch(/yedek-oncesi-<tarih>\) açtım mı\? EVET/);
    expect(canli).toMatch(/Sunucuda backend\/frontend durduruldu mu \(bakım\)\? EVET/);
    expect(canli).toMatch(/`CANLI-\$\{bugun\}`/);
    expect(canli).toMatch(/durdur = true;[\s\S]*raporYaz\(\)/);
    expect(canli).toMatch(/if \(durdur\) \{[\s\S]*ATLANDI/);
    expect(canli).toMatch(/GERİ DÖNÜŞ TALİMATI/);
    expect(canli).toMatch(/CANLI_SONUC_\$\{damga\}\.md/);
  });
  it('rapora host/adres yazılmaz; hash anahtarı gizliye eklenir ve değeri yazdırılmaz', () => {
    expect(canli).toMatch(/gizliEkle\(HASH_ANAHTARI\.trim\(\)\)/);
    expect(canli).not.toMatch(/HOST_ONEK/);
    expect(canli).not.toMatch(/log\([^)]*HASH_ANAHTARI(?!\.trim\(\)\.length)/);
  });
});

describe('eph70_cekirdek.mjs — zorunlu ayarlar (RELEASE-1) ve CANLI farkları', () => {
  const cekirdek = oku('deploy', 'eph70_cekirdek.mjs');
  it('A7 (ön) migration\'lardan ÖNCE, D4b (son) D5\'ten önce; COST_OZEL_BILGI listede', () => {
    const i = (k: string) => cekirdek.indexOf(`adim('${k}'`);
    expect(i('A7')).toBeGreaterThan(i('A6'));
    expect(i('A7')).toBeLessThan(cekirdek.indexOf('// ───── B) MIGRATION'));
    expect(i('D4b')).toBeGreaterThan(i('D4'));
    expect(i('D4b')).toBeLessThan(i('D5'));
    expect(cekirdek).toMatch(/key: 'COST_OZEL_BILGI'/);
    expect(cekirdek).toMatch(/key: 'TALEP_GECERLILIK_GUN'/);
  });
  it('CANLI profilinde bekleyen ödeme siparişi A5\'i durdurur', () => {
    expect(cekirdek).toMatch(/profil === 'CANLI' && bekleyen\.length/);
  });
  it('telefon hash anahtarı ctx\'ten gelir; yoksa C7c durur', () => {
    expect(cekirdek).toMatch(/telefonHashAnahtari\(\)/);
    expect(cekirdek).toMatch(/TELEFON_HASH_ANAHTARI yok — DUR/);
  });
  it('eph70_okuma.sql (e) sorgusu COST_OZEL_BILGI anahtarını listeler ve hâlâ salt okuma', () => {
    const sql = oku('eph70_okuma.sql');
    expect(sql).toMatch(/'COST_OZEL_BILGI', 'ONCEDEN'/);
    expect(sql.trim().endsWith('ROLLBACK;')).toBe(true);
    expect(sql).toMatch(/^BEGIN READ ONLY;/m);
  });

  function cekirdekCalistir(rows: Array<{ key: string; v: string }>, liste: 'ONCEDEN' | 'HEPSI') {
    const betik = `
      import { zorunluAyarKontrol, ZORUNLU_AYARLAR_ONCEDEN, ZORUNLU_AYARLAR_SONRADAN } from ${JSON.stringify(pathToFileURL(CEKIRDEK).href)};
      const rows = ${JSON.stringify(rows)};
      const c = { query: async (_s, p) => ({ rows: rows.filter((r) => p[0].includes(r.key)) }) };
      const l = ${liste === 'ONCEDEN' ? 'ZORUNLU_AYARLAR_ONCEDEN' : '[...ZORUNLU_AYARLAR_ONCEDEN, ...ZORUNLU_AYARLAR_SONRADAN]'};
      console.log(JSON.stringify(await zorunluAyarKontrol(c, l)));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', betik], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(0);
    return JSON.parse(r.stdout.trim());
  }
  const tam = [
    { key: 'COST_OZEL_BILGI', v: '25' }, { key: 'TALEP_GECERLILIK_GUN', v: '{"value": 30}' }, { key: 'OFFICE_MEMBERSHIP_PACKAGES', v: '[]' },
    { key: 'KARDES_OFIS_PAKETLER', v: '[]' }, { key: 'EPH_PAYMENT_SETTINGS_V1', v: '{}' },
  ];
  it('zorunluAyarKontrol: hepsi varken boş; eksik anahtar listelenir', () => {
    expect(cekirdekCalistir(tam, 'ONCEDEN')).toEqual([]);
    const eksik = cekirdekCalistir(tam.filter((x) => x.key !== 'COST_OZEL_BILGI'), 'ONCEDEN');
    expect(eksik).toHaveLength(1);
    expect(eksik[0]).toMatch(/COST_OZEL_BILGI \(yok\)/);
  });
  it('zorunluAyarKontrol: COST_OZEL_BILGI geçersiz (0, metin, null) → eksik sayılır; metin sayı "25" kabul', () => {
    for (const v of ['0', '"abc"', 'null', '-5', '2.5']) {
      const r = cekirdekCalistir(tam.map((x) => (x.key === 'COST_OZEL_BILGI' ? { ...x, v } : x)), 'ONCEDEN');
      expect(r.join()).toMatch(/COST_OZEL_BILGI \(geçerli sayı değil/);
    }
    expect(cekirdekCalistir(tam.map((x) => (x.key === 'COST_OZEL_BILGI' ? { ...x, v: '"25"' } : x)), 'ONCEDEN')).toEqual([]);
  });
  it('zorunluAyarKontrol: sonradan listesi deploy öncesi YOK; tüm liste için eksikler görünür', () => {
    expect(cekirdekCalistir(tam, 'HEPSI')).toHaveLength(4);
  });
});
