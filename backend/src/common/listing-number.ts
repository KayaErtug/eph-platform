import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';

export const REQUEST_LISTING_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const REQUEST_LISTING_NUMBER_REGEX = /^(?=.*[A-Z])(?=.*[0-9])[0-9A-Z]{7}$/;

/**
 * Havuz ilan numarası doğrulayıcısı (Geriye dönük uyumluluk için değiştirilmeden korunur).
 */
export function listingNumber(value: unknown): string {
  const id = typeof value === 'string' ? value.trim().replace(/^#/, '').toLowerCase() : '';
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestException('İlan numarasının tamamını girin.');
  }
  return id;
}

/**
 * Talep Merkezi için normalize edilmiş kısa ilan numarası (küçük/büyük harf ve # toleranslı).
 */
export function normalizeRequestListingNumber(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^#/, '').toUpperCase() : '';
}

/**
 * 7 karakter alfanümerik (en az 1 harf ve 1 rakam) kontrolü.
 */
export function isValidRequestListingNumber(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeRequestListingNumber(value);
  return REQUEST_LISTING_NUMBER_REGEX.test(normalized);
}

/**
 * Talep Merkezi veya genel arama için girdi UUID mi yoksa 7 haneli kısa kod mu ayrıştırır.
 */
export function parseListingNumberOrId(value: unknown): { type: 'LISTING_NUMBER' | 'UUID'; value: string } {
  if (typeof value !== 'string') {
    throw new BadRequestException('İlan numarasının tamamını girin.');
  }
  const clean = value.trim().replace(/^#/, '');
  if (UUID_REGEX.test(clean)) {
    return { type: 'UUID', value: clean.toLowerCase() };
  }
  const upper = clean.toUpperCase();
  if (REQUEST_LISTING_NUMBER_REGEX.test(upper)) {
    return { type: 'LISTING_NUMBER', value: upper };
  }
  throw new BadRequestException('İlan numarasının tamamını girin.');
}

/**
 * Talep Merkezi için 7 karakterli kriptografik rastgele benzersiz kısa ilan numarası üretir.
 * Her numara tam 7 karakterdir, en az bir harf ve bir rakam içerir.
 */
export function generateRequestListingNumber(): string {
  while (true) {
    let code = '';
    for (let i = 0; i < 7; i++) {
      const idx = randomInt(0, REQUEST_LISTING_CHARS.length);
      code += REQUEST_LISTING_CHARS[idx];
    }
    if (REQUEST_LISTING_NUMBER_REGEX.test(code)) {
      return code;
    }
  }
}
