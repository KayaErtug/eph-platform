import { createHmac } from 'crypto';

/**
 * EPH-70B1F (karar 18h): deneme tekilliği için telefon numarası HMAC-SHA256 ile hash'lenerek saklanır (ham telefon değil).
 * Anahtar ortam değişkeni TELEFON_HASH_ANAHTARI'dır (değeri sunucuda tanımlanır; koda/depoya girmez). Anahtar yoksa HATA verir —
 * anahtarsız düz SHA-256 telefon uzayında (≈10^10) kolayca kırılır, bu yüzden sessiz fallback YOKTUR.
 */
export const TELEFON_HASH_ENV = 'TELEFON_HASH_ANAHTARI';

/** TR odaklı normalleştirme: yalnız rakamlar; 00/+ önekleri ve baştaki 0 atılır, 10 haneli ulusal numaraya 90 eklenir. */
export function normalizePhone(raw: string): string {
  let d = String(raw ?? '').replace(/\D+/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `90${d}`;
  return d;
}

export function hashPhone(raw: string, key: string | undefined = process.env[TELEFON_HASH_ENV]): string {
  if (!key || key.length < 16) throw new Error(`${TELEFON_HASH_ENV} tanımlı değil veya çok kısa (en az 16 karakter).`);
  const normalized = normalizePhone(raw);
  if (normalized.length < 10 || normalized.length > 15) throw new Error('Telefon numarası geçersiz.');
  return createHmac('sha256', key).update(normalized).digest('hex');
}
