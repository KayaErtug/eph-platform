'use strict';
/**
 * PROVA-3 — prova_sorgu.mjs'in SAF (DB'siz) çekirdeği: canlı kilidi + salt okuma SQL taraması + çıktı maskeleme.
 * Jest testi: src/office/eph70-gecis-betikleri.spec.ts
 */
const CANLI_HOST_PARCASI = 'ep-morning-sound-al8p9dak';

/** true → CANLI veritabanı (çıkış kodu 2). env: { DATABASE_URL, DIRECT_URL } */
function canliMi(provaUrl, env) {
  let host = '';
  try { host = new URL(provaUrl.trim()).hostname; } catch { /* geçersiz adres ayrıca elenir */ }
  if (host.includes(CANLI_HOST_PARCASI) || String(provaUrl).includes(CANLI_HOST_PARCASI)) return true;
  const norm = (u) => { try { const x = new URL(u); return `${x.hostname}|${x.pathname}`.toLowerCase(); } catch { return null; } };
  const benim = norm(provaUrl.trim());
  for (const k of ['DATABASE_URL', 'DIRECT_URL']) {
    const v = env && env[k];
    if (v && (v.trim() === provaUrl.trim() || (benim && norm(v) === benim))) return true;
  }
  return false;
}
function poolerMi(provaUrl) {
  let host = '';
  try { host = new URL(provaUrl.trim()).hostname; } catch { /* yoksay */ }
  return /-pooler(\.|$)/i.test(host) || /pgbouncer=true/i.test(provaUrl);
}

/** Yorumları ve tırnaklı metinleri (' ', " ", $$ $$, E'..') boşlukla değiştirir; kalan metin yalnız SQL iskeletidir. */
function iskelet(sql) {
  let s = String(sql);
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/--[^\r\n]*/g, ' ');
  s = s.replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, ' ');
  s = s.replace(/'(?:[^']|'')*'/g, "''");
  s = s.replace(/"(?:[^"]|"")*"/g, '""');
  return s;
}

const YASAK = [
  [/\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COMMENT|REINDEX|VACUUM|CLUSTER|REFRESH|LOCK|COPY|CALL|DO|PREPARE|EXECUTE|LISTEN|NOTIFY|DISCARD|SECURITY|IMPORT|SAVEPOINT|RELEASE|COMMIT|END|ABORT)\b/i, 'yazma/DDL/işlem komutu'],
  [/\bFOR\s+(NO\s+KEY\s+)?(UPDATE|SHARE)\b/i, 'satır kilidi (FOR UPDATE/SHARE)'],
  [/\bREAD\s+WRITE\b/i, 'READ WRITE'],
  [/\bSELECT\b[^;]*\bINTO\b/i, 'SELECT ... INTO'],
  [/\bdefault_transaction_read_only\b|\btransaction_read_only\b/i, 'salt okuma ayarına dokunma'],
  [/\b(set_config|nextval|setval|pg_advisory\w*|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|lo_\w+|dblink\w*|pg_sleep\w*|txid_\w+|pg_read_\w+|pg_ls_\w+|pg_stat_reset\w*)\s*\(/i, 'yan etkili/sistem işlevi'],
];

/**
 * Salt okuma taraması. Dönen: { ok: boolean, nedenler: string[] }. İzinli üst düzey ifadeler: SELECT/WITH/VALUES/TABLE/EXPLAIN(analyze'sız)/SHOW,
 * ve dosyanın kendi BEGIN [READ ONLY] / ROLLBACK / SET (yalnız statement_timeout, lock_timeout, search_path, application_name, TimeZone) satırları.
 */
function sqlTarama(sql) {
  const nedenler = [];
  const s = iskelet(sql);
  if (!s.trim()) return { ok: false, nedenler: ['boş SQL'] };
  const ifadeler = s.split(';').map((x) => x.trim()).filter(Boolean);
  for (const f of ifadeler) {
    const ilk = (f.match(/^[A-Za-z]+/) || [''])[0].toUpperCase();
    if (/^(SELECT|WITH|VALUES|TABLE|SHOW|ROLLBACK)$/.test(ilk)) { /* izinli */ }
    else if (ilk === 'BEGIN' || ilk === 'START') { if (!/^(BEGIN|START\s+TRANSACTION)(\s+(READ\s+ONLY|ISOLATION\s+LEVEL\s+\w+(\s+\w+)?|DEFERRABLE|NOT\s+DEFERRABLE|TRANSACTION|WORK|,))*\s*$/i.test(f)) nedenler.push('BEGIN biçimi tanınmadı'); }
    else if (ilk === 'SET') { if (!/^SET\s+(LOCAL\s+|SESSION\s+)?(statement_timeout|lock_timeout|search_path|application_name|TimeZone|idle_in_transaction_session_timeout)\b/i.test(f)) nedenler.push('izin verilmeyen SET'); }
    else if (ilk === 'EXPLAIN') { if (/\bANALYZE\b/i.test(f)) nedenler.push('EXPLAIN ANALYZE yürütür'); }
    else nedenler.push(`izin verilmeyen ifade: ${ilk || '?'}`);
  }
  for (const [yi, [re, ad]] of YASAK.entries()) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of s.matchAll(g)) {
      // CASE ... END ifadesinin END'i yasak komut değildir (yalnız CASE varsa muaf); diğer tüm eşleşmeler REDDEDİLİR (yanlış alarm güvenli taraftadır).
      if (yi === 0 && /^END$/i.test(m[1]) && /\bCASE\b/i.test(s)) continue;
      nedenler.push(ad);
    }
  }
  return { ok: nedenler.length === 0, nedenler: [...new Set(nedenler)] };
}

/** Çalıştırmadan önce dosyanın kendi BEGIN/ROLLBACK satırlarını çıkarır (dış sarmalayıcı BEGIN READ ONLY ... ROLLBACK'i biz yönetiriz). */
function sarmalayicilariKaldir(sql) {
  return String(sql)
    .replace(/^[ \t]*(BEGIN|START\s+TRANSACTION)\b[^;\r\n]*;[ \t]*(--[^\r\n]*)?$/gim, '')
    .replace(/^[ \t]*ROLLBACK\s*;[ \t]*(--[^\r\n]*)?$/gim, '');
}

const GIZLI_ALAN = /(kullanici|user|mail|eposta|telefon|phone|adsoyad|isim|token|secret|password|parola|sifre|hash|iban|tckn|adres)/i;
/** Sütun adı hassas görünüyorsa değeri maskeler (kısa kimlik sütunları "...Kisa" son ekiyle serbest). */
function hucreMaskele(alan, deger) {
  if (deger === null || deger === undefined) return deger;
  if (/kisa$/i.test(alan)) return deger;
  return GIZLI_ALAN.test(alan) ? '[gizli]' : deger;
}

module.exports = { CANLI_HOST_PARCASI, canliMi, poolerMi, iskelet, sqlTarama, sarmalayicilariKaldir, hucreMaskele, GIZLI_ALAN };
