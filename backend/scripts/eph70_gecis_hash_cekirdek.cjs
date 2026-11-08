'use strict';
/**
 * EPH-70 / PROVA-3 — telefon hash çekirdeği (eph70_gecis_telefon_hash.mjs kullanır).
 * src/common/telefon-hash.ts ile AYNI algoritma (normalizePhone + HMAC-SHA256 hex). Eşitliği jest testi (eph70-gecis-betikleri.spec.ts) doğrular.
 * Anahtar YALNIZ çağıranın verdiği değerdir (ortam değişkeni); bu dosya hiçbir şey okumaz/yazdırmaz.
 */
const { createHmac } = require('crypto');

const TELEFON_HASH_ENV = 'TELEFON_HASH_ANAHTARI';

function normalizePhone(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D+/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `90${d}`;
  return d;
}

/** Geçersiz anahtar/telefon için { hata: 'ANAHTAR' | 'TELEFON' } döner (mesajda değer YOKTUR); aksi halde { hash }. */
function hashPhoneSafe(raw, key) {
  if (!key || key.length < 16) return { hata: 'ANAHTAR' };
  const n = normalizePhone(raw);
  if (n.length < 10 || n.length > 15) return { hata: 'TELEFON' };
  return { hash: createHmac('sha256', key).update(n).digest('hex') };
}

module.exports = { TELEFON_HASH_ENV, normalizePhone, hashPhoneSafe };
