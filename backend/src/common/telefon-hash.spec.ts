import { hashPhone, normalizePhone } from './telefon-hash';

describe('telefon-hash (EPH-70B1F / karar 18h)', () => {
  const key = 'test-anahtar-0123456789';
  it('farklı yazımlar aynı HMAC-SHA256 hex çıktısını verir', () => {
    const a = hashPhone('+90 532 123 45 67', key);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPhone('05321234567', key)).toBe(a);
    expect(hashPhone('0090 (532) 123-45-67', key)).toBe(a);
  });
  it('farklı numara / farklı anahtar farklı hash üretir; ham telefon içermez', () => {
    const a = hashPhone('05321234567', key);
    expect(hashPhone('05321234568', key)).not.toBe(a);
    expect(hashPhone('05321234567', key + 'x')).not.toBe(a);
    expect(a).not.toContain('5321234567');
  });
  it('anahtar yoksa/kısaysa sessiz fallback yok, hata verir', () => {
    expect(() => hashPhone('05321234567', '')).toThrow(/TELEFON_HASH_ANAHTARI/);
    expect(() => hashPhone('05321234567', 'kisa')).toThrow();
  });
  it('geçersiz numara reddedilir; normalleştirme', () => {
    expect(() => hashPhone('123', key)).toThrow(/geçersiz/);
    expect(normalizePhone('0532 123 45 67')).toBe('905321234567');
  });
});
