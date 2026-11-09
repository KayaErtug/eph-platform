/**
 * EPH-70 deploy ÇEKİRDEĞİ — A (ön kontrol) · B (migration) · C (SQL betikleri + bayraklar) · D (son kontrol).
 * PROVA (scripts/prova/prova_eph70.mjs) ve CANLI (scripts/deploy/canli_eph70.mjs) AYNI adım kodunu çalıştırır; kopya yoktur.
 * Bu modül kendi başına bir şey çalıştırmaz: bağlantı, adım çerçevesi (adim), alt süreç çalıştırıcı vb. çağıran taraftan gelir.
 *
 * profil: 'PROVA' | 'CANLI'. Fark yalnız: A5'te bekleyen ödeme/uzun işlem CANLI'da sert durdurur,
 * telefon hash anahtarı kaynağı (ctx.telefonHashAnahtari), uygulama adı. Kaynak: PROVA-1/2/3 + DEPLOY-2 + RELEASE-1.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const MIGRATIONLAR = [
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
export const YENI_TABLOLAR = ['StoreProduct', 'StoreSubscription', 'StoreEntitlementGrant', 'PortfolioCreditLotTuketim', 'OfisAbonelik', 'OfisEklenti', 'OfisHakDonemi', 'OfisDenemeKaydi', 'OfisGecisDefteri', 'PotentialUnit'];
export const AYAR_ANAHTARLARI = ['OFFICE_ADDON_CONFIG', 'OFFICE_TRIAL_CONFIG', 'OFFICE_FREE_LIMITS', 'KARDES_OFIS_PAKETLER', 'OFFICE_ENTITLEMENT_SOURCE'];
// RELEASE-1: uygulamanın açılışta / "İletişime Geç" (getWalletQuote) / talep / ödeme kataloğu / ofis hak çözümünde ZORUNLU okuduğu SystemSetting anahtarları
// (kod taraması: office.service getWalletQuote, network.service getRequestValidityDays, office-entitlement.service loadOfficeSettings,
//  payments payment.rules PAYMENT_SETTINGS_KEY, office-legacy OFFICE_ENTITLEMENT_SOURCE). Eksik anahtar = BASARISIZ.
//  tur: 'sayi' → parseCostValue (güvenli tamsayı, kural: min); 'var' → yalnız satır var.
export const ZORUNLU_AYARLAR_ONCEDEN = [ // deploy'dan ÖNCE canlıda mevcut olmalı (hiçbir betik üretmez)
  { key: 'COST_OZEL_BILGI', tur: 'sayi', min: 1, not: 'İletişime Geç / özel bilgi ücreti (office.service getWalletQuote)' },
  { key: 'TALEP_GECERLILIK_GUN', tur: 'sayi', min: 1, not: 'talep geçerlilik günü (network.service getRequestValidityDays)' },
  { key: 'OFFICE_MEMBERSHIP_PACKAGES', tur: 'var', not: 'ofis paket kataloğu' },
  { key: 'KARDES_OFIS_PAKETLER', tur: 'var', not: 'kardeş ofis paketleri' },
  { key: 'EPH_PAYMENT_SETTINGS_V1', tur: 'var', not: 'ödeme ayarları (public katalog)' },
];
export const ZORUNLU_AYARLAR_SONRADAN = [ // migration + eph70b2_ayarlar.sql sonrası mevcut olmalı
  { key: 'OFFICE_ADDON_CONFIG', tur: 'var', not: 'eph70b2_ayarlar.sql üretir' },
  { key: 'OFFICE_TRIAL_CONFIG', tur: 'var', not: 'eph70b2_ayarlar.sql üretir' },
  { key: 'OFFICE_FREE_LIMITS', tur: 'var', not: 'eph70b2_ayarlar.sql üretir' },
  { key: 'OFFICE_ENTITLEMENT_SOURCE', tur: 'var', not: 'eph70b2_ayarlar.sql üretir (legacy)' },
];
export async function zorunluAyarKontrol(c, liste) {
  const rows = (await c.query('SELECT "key", "valueJson"::text AS v FROM "SystemSetting" WHERE "key" = ANY($1)', [liste.map((x) => x.key)])).rows;
  const by = new Map(rows.map((r) => [r.key, r.v]));
  const eksik = [];
  for (const a of liste) {
    if (!by.has(a.key)) { eksik.push(`${a.key} (yok)`); continue; }
    if (a.tur === 'sayi') {
      let j; try { j = JSON.parse(by.get(a.key)); } catch { j = null; }
      const cand = j && typeof j === 'object' && !Array.isArray(j) ? j.value : j;
      const n = typeof cand === 'string' && cand.trim() !== '' ? Number(cand) : cand;
      if (!(typeof n === 'number' && Number.isSafeInteger(n) && n >= (a.min ?? 0))) eksik.push(`${a.key} (geçerli sayı değil, en az ${a.min ?? 0} olmalı)`);
    }
  }
  return eksik;
}

export const GIZLI_ALAN = /(kullanici|user|mail|eposta|telefon|phone|adsoyad|isim|token|secret|password|hash)/i;

// ───────────────────────────── SQL yardımcıları ─────────────────────────────
export function ozet(res) {
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
export async function q(c, text, params) { return params ? c.query(text, params) : c.query(text); }
export async function tek(c, text, params) { const r = await q(c, text, params); return r.rows[0] || {}; }
export function dosya(yol) { return readFileSync(yol, 'utf8'); }
export function ustSeviyeRollbackCommit(sql, ad) {
  const eslesme = sql.match(/^ROLLBACK;.*$/gm) || [];
  if (eslesme.length !== 1) throw new Error(`${ad}: tam 1 adet satır başı "ROLLBACK;" beklenirdi, ${eslesme.length} bulundu — kopya üretilmedi`);
  return sql.replace(/^ROLLBACK;.*$/m, 'COMMIT;  -- PROVA kopyası (orijinal dosya değişmedi)');
}
export const nedenSatiri = (s) => { const k = s.split(/\r?\n/).filter((l) => /Error|tanımlı|NOT_FOUND|missing|Nest can't|yapılandırılmamış/i.test(l) && !/^\s+at /.test(l)); return (k.length ? 'NEDEN: ' + k.slice(0, 3).join(' | ') + ' || ' : '') + sonSatir(s, 3); };
export const sonSatir = (s, n = 3) => s.split(/\r?\n/).filter(Boolean).slice(-n).join(' | ').slice(0, 300);

export function yorumluInsertler(sql, beklenen = 2) {
  const satirlar = sql.split(/\r?\n/);
  const basla = satirlar.findIndex((s) => /AYRI ADIM/.test(s));
  const bitis = satirlar.findIndex((s, i) => i > basla && /GERİ ALMA \(commit sonrası/.test(s));
  if (basla < 0 || bitis < 0) throw new Error('dosyada "AYRI ADIM"/"GERİ ALMA" işaretleri bulunamadı');
  const bolge = satirlar.slice(basla, bitis).filter((s) => /^--\s?/.test(s)).map((s) => s.replace(/^--\s?/, ''));
  const out = []; let akim = null;
  for (const s of bolge) {
    if (!akim && /^INSERT INTO "SystemSetting"/.test(s.trim())) akim = [];
    if (akim) { akim.push(s); if (/;\s*$/.test(s.trim())) { out.push(akim.join('\n')); akim = null; } }
  }
  if (out.length !== beklenen) throw new Error(`dosyada ${beklenen} yorumlu INSERT beklenirdi, ${out.length} bulundu`);
  return out;
}

/**
 * ctx: { c (bağlı pg Client), adim (adım çerçevesi), BACKEND, calistir, altSurecOrtami,
 *        profil: 'PROVA'|'CANLI', uygulamaAdi, telefonHashAnahtari: () => string, geciciDizin }
 */
export async function adimlariCalistir(ctx) {
  const { c, adim, BACKEND, calistir, altSurecOrtami, profil, uygulamaAdi, telefonHashAnahtari, GECICI } = ctx;
  const MIG_DIZIN = join(BACKEND, 'prisma', 'migrations');
  const SCRIPTS = join(BACKEND, 'scripts');
  // ───── A) ÖN KONTROLLER (salt okuma) ─────
  await adim('A1', 'Bağlantı + sürüm', async () => {
    await c.connect(); ctx.baglandi?.();
    await c.query(`SET application_name='${uygulamaAdi}'`);
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

  await adim('A3', 'eph70_okuma.sql (salt okuma, 5 sorgu)', async () => {
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
    const uzun = (await q(c, `SELECT count(*)::int AS n FROM pg_stat_activity WHERE xact_start IS NOT NULL AND now()-xact_start > interval '1 minute' AND pid <> pg_backend_pid() AND application_name <> $1 AND backend_type='client backend'`, [uygulamaAdi])).rows[0].n;
    if (uzun > 0) sorunlar.push(`1 dk'dan uzun açık işlem: ${uzun}`);
    const bekleyen = (await q(c, `SELECT durum::text, count(*)::int AS n FROM "PaymentOrder" WHERE durum::text IN ('CREATED','PENDING') AND "olusturulmaTarihi" > now() - interval '30 minutes' GROUP BY 1`)).rows;
    if (profil === 'CANLI' && bekleyen.length) sorunlar.push(`son 30 dk'da bekleyen ödeme siparişi var (${bekleyen.map((x) => x.durum + '=' + x.n).join(', ')}) — bekle, sonra yeniden çalıştır (plan §1.3)`);
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
    const bek = bekleyen;
    const boy = await tek(c, `SELECT (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='Role' AND e.enumlabel='OFIS_BOY')::int AS rol, to_regclass('public."PotentialUnit"')::text AS tablo`);
    if (sorunlar.length) throw new Error(sorunlar.join('; '));
    return { not: `temiz; OFIS_BOY enum=${boy.rol ? 'var' : 'yok'}, PotentialUnit=${boy.tablo ?? 'yok'}; son 30dk bekleyen sipariş grubu=${bek.length} ${profil === 'CANLI' ? '' : '(kopyada anlamsız)'}` };
  }, { kritik: true });

  await adim('A6', 'Ayar yedeği içeriği kaydı (§2.7) — yalnız anahtar sayısı', async () => {
    const r = await q(c, `SELECT "key" FROM "SystemSetting" WHERE "key" IN ('OFFICE_MEMBERSHIP_PACKAGES','OFFICE_ADDON_CONFIG','OFFICE_TRIAL_CONFIG','OFFICE_FREE_LIMITS','KARDES_OFIS_PAKETLER','OFFICE_ENTITLEMENT_SOURCE','EPH_PAYMENT_SETTINGS_V1','EPH70_LOT_UZLASTIRMA_TAMAM','EPH70_YENI_DENEME_BASLANGICI','EPH70_DENEME_GERIDOLDURMA_TAMAM') ORDER BY 1`);
    return { etkilenen: `${r.rowCount} anahtar`, not: `mevcut: ${r.rows.map((x) => x.key).join(', ') || '(yok)'}` };
  });

  await adim('A7', 'Zorunlu SystemSetting anahtarları (COST_OZEL_BILGI + açılış/İletişime Geç ayarları) — salt okuma', async () => {
    const eksik = await zorunluAyarKontrol(c, ZORUNLU_AYARLAR_ONCEDEN);
    if (eksik.length) throw new Error(`eksik/geçersiz ayar: ${eksik.join('; ')} — uygulama bu anahtarlar olmadan hata verir (DUR)`);
    return { etkilenen: `${ZORUNLU_AYARLAR_ONCEDEN.length} anahtar`, not: ZORUNLU_AYARLAR_ONCEDEN.map((x) => x.key).join(', ') + ' mevcut' };
  }, { kritik: true });

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

  // ───── DEPLOY-2: C4c — 7 INCELEME cüzdanının çözümü (scripts/eph70_inceleme_cozum.sql, COMMIT'li prova kopyası) ─────
  let cozumHazir = false;
  await adim('C4c', '4.4c eph70_inceleme_cozum.sql — COMMIT\'li prova kopyası (INCELEME → 0; Σbakiye değişmez; negatif lot 0)', async () => {
    if (!lotDefterHazir) throw new Error('lot uzlaştırma işlenmedi (C4b)');
    const SNAP = `SELECT (SELECT COALESCE(sum("bakiye"),0) FROM "KontorCuzdani")::text AS b, (SELECT count(*) FROM "_eph70_lot_cuzdan" WHERE "durum"='INCELEME')::int AS inc`;
    const once = await tek(c, SNAP);
    const cozumDosya = dosya(join(SCRIPTS, 'eph70_inceleme_cozum.sql'));
    const kopya = ustSeviyeRollbackCommit(cozumDosya, 'eph70_inceleme_cozum.sql');
    writeFileSync(join(GECICI, 'eph70_inceleme_cozum.prova.sql'), kopya);
    const s = ozet(await c.query(kopya)); // beklenmeyen durumda SQL RAISE EXCEPTION eder → adım BASARISIZ
    const sonra = await tek(c, SNAP);
    if (once.b !== sonra.b) throw new Error(`Σbakiye DEĞİŞTİ (önce=${once.b} sonra=${sonra.b}) — 18b ihlali`);
    if (sonra.inc !== 0) throw new Error(`INCELEME hâlâ ${sonra.inc} (0 olmalı)`);
    const cz = await tek(c, `SELECT (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kaynakKayitTuru"='EPH70_INCELEME_COZUM')::int AS lot,
        (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0)::int AS negatif`);
    if (cz.negatif !== 0) throw new Error(`negatif lot: ${cz.negatif}`);
    const kar = (await q(c, `SELECT "durum", count(*)::int AS adet FROM "_eph70_lot_cuzdan" GROUP BY 1 ORDER BY 1`)).rows;
    lotKarar = Object.fromEntries(kar.map((x) => [x.durum, x.adet]));
    cozumHazir = true;
    return { etkilenen: `${cz.lot} çözüm lotu; DML toplamı ${s.dml}`, not: `INCELEME ${once.inc}→0; Σbakiye değişmedi; cüzdan kararı: ${JSON.stringify(lotKarar)}` };
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
    // DEPLOY-2: 7 INCELEME cüzdanı C4c ile çözüldü → bayrak 2 artık YAZILMALI; yazılmazsa adım BASARISIZ
    if (!cozumHazir) throw new Error('INCELEME çözümü işlenmedi (C4c)');
    if (r.rowCount === 0) throw new Error(`BAYRAK 2 YAZILMADI (koşul sağlanmıyor; cüzdan kararı ${JSON.stringify(lotKarar)})`);
    return { etkilenen: `${r.rowCount} satır` };
  });
  // ───── PROVA-3: 4.7 deneme geri doldurma (eph70_gecis.sql) — C4 sonrası; kuru çalıştırma → COMMIT'li kopya → telefon hash (Node) → bayrak 3 ─────
  const gecisDosya = dosya(join(SCRIPTS, 'eph70_gecis.sql'));
  let gecisHazir = false;
  await adim('C7a', '4.7 eph70_gecis.sql — KURU ÇALIŞTIRMA (orijinal, ROLLBACK)', async () => {
    const s = ozet(await c.query(gecisDosya));
    const skalerler = s.cikti.filter((x) => x.komut === 'SELECT' && x.rows && x.rows.length === 1 && x.alanlar.length === 1).map((x) => `${x.alanlar[0]}=${x.rows[0][x.alanlar[0]]}`);
    return { etkilenen: 'ROLLBACK (kalıcı değişiklik yok)', not: skalerler.join('; ') };
  });

  await adim('C7b', '4.7 eph70_gecis.sql — COMMIT\'li prova kopyası (+ bakiye/lot değişmedi, her eski deneme defterlendi)', async () => {
    const SNAP = `SELECT (SELECT COALESCE(sum("bakiye"),0) FROM "KontorCuzdani")::text AS b, (SELECT count(*) FROM "PortfolioCreditLot")::text AS l, (SELECT COALESCE(sum("kalanMiktar"),0) FROM "PortfolioCreditLot")::text AS k`;
    const once = await tek(c, SNAP);
    const kopya = ustSeviyeRollbackCommit(gecisDosya, 'eph70_gecis.sql');
    writeFileSync(join(GECICI, 'eph70_gecis.prova.sql'), kopya);
    const s = ozet(await c.query(kopya));
    const sonra = await tek(c, SNAP);
    if (once.b !== sonra.b || once.l !== sonra.l || once.k !== sonra.k) throw new Error('geçiş betiği bakiye/lot toplamını DEĞİŞTİRDİ (18b ihlali)');
    const d = await tek(c, `SELECT (SELECT count(*) FROM "OfisDenemeKaydi" WHERE "kaynak"='GECIS')::int AS kayit,
        (SELECT count(*) FROM "OfisDenemeKaydi" WHERE "kaynak"='GECIS' AND "telefonHash" IS NULL)::int AS hashsiz,
        (SELECT count(*) FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\\_DENEME:%' ESCAPE '\\' AND "durum"='ESLENDI')::int AS eslendi,
        (SELECT count(*) FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\\_DENEME:%' ESCAPE '\\' AND "durum"='ATLANDI')::int AS atlandi,
        (SELECT count(*) FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\\_DENEME:%' ESCAPE '\\' AND "durum"='KARANTINA')::int AS karantina,
        (SELECT count(*) FROM (SELECT DISTINCT "kullaniciId" FROM "KontorHareketi" WHERE "aciklama" LIKE '%Ofis Deneme Paketi%' AND "miktar" > 0) x
           WHERE EXISTS (SELECT 1 FROM "User" u WHERE u.id = x."kullaniciId") AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" g WHERE g."kaynakAnahtar" = 'EPH70_DENEME:' || x."kullaniciId"))::int AS defterlenmemis`);
    if (d.defterlenmemis !== 0) throw new Error(`defterlenmemiş eski deneme kullanıcısı: ${d.defterlenmemis}`);
    gecisHazir = true;
    return { etkilenen: `${d.kayit} GECIS kaydı; DML toplamı ${s.dml}`, uyari: d.karantina > 0, not: `defter: eşlendi=${d.eslendi}, atlandı=${d.atlandi}, karantina=${d.karantina}; hash bekleyen=${d.hashsiz}; bakiye/lot toplamı değişmedi` };
  }, { kritik: true });

  await adim('C7c', '4.7 eph70_gecis_telefon_hash.mjs (kuru çalıştırma + --uygula; anahtar yalnız bu süreç için geçici)', async () => {
    if (!gecisHazir) throw new Error('geçiş kayıtları işlenmedi (C7b)');
    const yol = join(SCRIPTS, 'eph70_gecis_telefon_hash.mjs');
    const env = altSurecOrtami({ TELEFON_HASH_ANAHTARI: (() => { const k = telefonHashAnahtari(); if (!k) throw new Error('TELEFON_HASH_ANAHTARI yok — DUR (fail-closed)'); return k; })() });
    const kuru = calistir([yol], { env, zamanAsimi: 120000 });
    if (kuru.kod !== 0) throw new Error(`kuru çalıştırma çıkış ${kuru.kod}: ${sonSatir(kuru.cikti)}`);
    const uygula = calistir([yol, '--uygula'], { env, zamanAsimi: 120000 });
    if (uygula.kod !== 0) throw new Error(`--uygula çıkış ${uygula.kod}: ${sonSatir(uygula.cikti)}`);
    const k = await tek(c, `SELECT count(*) FILTER (WHERE "telefonHash" IS NULL)::int AS bos, count(*)::int AS toplam FROM "OfisDenemeKaydi" WHERE "kaynak"='GECIS'`);
    return { etkilenen: `${k.toplam - k.bos}/${k.toplam} kayıtta hash`, not: sonSatir(uygula.cikti, 2) };
  });

  await adim('C7d', '4.7 Bayrak 3: EPH70_DENEME_GERIDOLDURMA_TAMAM (dosyadaki yorumlu koşullu INSERT)', async () => {
    if (!gecisHazir) throw new Error('geçiş kayıtları işlenmedi (C7b)');
    const stmts = yorumluInsertler(gecisDosya, 1);
    const r = await q(c, stmts[0]);
    if (r.rowCount === 0) {
      const n = await tek(c, `SELECT (SELECT count(*) FROM "OfisGecisDefteri" WHERE "kaynakAnahtar" LIKE 'EPH70\\_DENEME:%' ESCAPE '\\' AND "durum"='KARANTINA')::int AS karantina,
        (SELECT count(*) FROM "OfisDenemeKaydi" k WHERE k."kaynak"='GECIS' AND k."telefonHash" IS NULL AND NOT EXISTS (SELECT 1 FROM "OfisGecisDefteri" d WHERE d."kaynakAnahtar"='EPH70_DENEME_HASH:'||k."officeId" AND d."durum"='ATLANDI'))::int AS onaysiz_hashsiz`);
      throw new Error(`BAYRAK 3 YAZILMADI (karantina=${n.karantina}, hash'siz+onaysız=${n.onaysiz_hashsiz}) — DEPLOY-2 kararı B: koşullar sağlanmalı`);
    }
    return { etkilenen: `${r.rowCount} satır` };
  });

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

  await adim('D4b', 'Zorunlu SystemSetting anahtarlarının TAMAMI (önceden + sonradan)', async () => {
    const hepsi = [...ZORUNLU_AYARLAR_ONCEDEN, ...ZORUNLU_AYARLAR_SONRADAN];
    const eksik = await zorunluAyarKontrol(c, hepsi);
    if (eksik.length) throw new Error(`eksik/geçersiz ayar: ${eksik.join('; ')}`);
    return { etkilenen: `${hepsi.length} anahtar`, not: 'hepsi mevcut' };
  }, { atlaKosul: false });

  await adim('D5', 'INCELEME cüzdan sayısı · negatif lot · uygulanmamış defter', async () => {
    if (!lotDefterHazir) throw new Error('lot defteri yok (C4b çalışmadı)');
    const r = await tek(c, `SELECT (SELECT count(*) FROM "_eph70_lot_cuzdan" WHERE "durum"='INCELEME')::int AS inceleme,
      (SELECT count(*) FROM "PortfolioCreditLot" WHERE "kalanMiktar" < 0)::int AS negatif,
      (SELECT count(*) FROM "_eph70_lot_defter" WHERE "geriAlindi" IS NULL AND "uygulananAt" IS NULL)::int AS uygulanmamis`);
    if (r.negatif !== 0) throw new Error(`negatif lot: ${r.negatif}`);
    if (r.uygulanmamis !== 0) throw new Error(`uygulanmamış defter satırı: ${r.uygulanmamis}`);
    if (r.inceleme !== 0) throw new Error(`INCELEME hâlâ ${r.inceleme} (DEPLOY-2: 0 olmalı)`);
    return { etkilenen: 'INCELEME=0', not: 'negatif lot=0, uygulanmamış defter=0' };
  }, { atlaKosul: false });

  await adim('D6', 'Bayrak durumu (DEPLOY-2: üç bayrak da YAZILI olmalı)', async () => {
    const r = (await q(c, `SELECT "key","valueJson"::text AS v FROM "SystemSetting" WHERE "key" IN ('EPH70_LOT_UZLASTIRMA_TAMAM','EPH70_YENI_DENEME_BASLANGICI','EPH70_DENEME_GERIDOLDURMA_TAMAM')`)).rows;
    const m = Object.fromEntries(r.map((x) => [x.key, x.v]));
    const eksik = ['EPH70_LOT_UZLASTIRMA_TAMAM', 'EPH70_YENI_DENEME_BASLANGICI', 'EPH70_DENEME_GERIDOLDURMA_TAMAM'].filter((k) => m[k] === undefined);
    if (eksik.length) throw new Error(`YAZILMAYAN bayrak(lar): ${eksik.join(', ')}`);
    if (m.EPH70_LOT_UZLASTIRMA_TAMAM !== 'true') throw new Error(`LOT_UZLASTIRMA_TAMAM beklenmeyen değer: ${m.EPH70_LOT_UZLASTIRMA_TAMAM}`);
    if (m.EPH70_DENEME_GERIDOLDURMA_TAMAM !== 'true') throw new Error(`GERIDOLDURMA_TAMAM beklenmeyen değer: ${m.EPH70_DENEME_GERIDOLDURMA_TAMAM}`);
    if (Number.isNaN(Date.parse(JSON.parse(m.EPH70_YENI_DENEME_BASLANGICI)))) throw new Error('YENI_DENEME_BASLANGICI geçerli tarih değil');
    return { etkilenen: '3 bayrak', not: `TAMAM=${m.EPH70_LOT_UZLASTIRMA_TAMAM}; YENI_DENEME_BASLANGICI=${m.EPH70_YENI_DENEME_BASLANGICI}; GERIDOLDURMA_TAMAM=${m.EPH70_DENEME_GERIDOLDURMA_TAMAM}` };
  }, { atlaKosul: false });
}
