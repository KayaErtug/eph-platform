import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const officeProfileKey = (id: string) => `EPH_OFFICE_PROFILE_${id}`;
export const OFFICE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export type OfficeProfile = { address: string; phone: string; logoUrl: string | null };
export function officeProfile(value: Prisma.JsonValue | undefined): OfficeProfile {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    address: typeof data.address === 'string' ? data.address : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    logoUrl: typeof data.logoUrl === 'string' && /^\/api\/profile\/avatar-file\/office_[a-f0-9-]+\.(png|jpg|webp)$/.test(data.logoUrl) ? data.logoUrl : null,
  };
}
export function officeProfileInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Ofis bilgilerini kontrol edin.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some(key => !['name', 'address', 'phone', 'city', 'district', 'neighborhood'].includes(key))) throw new BadRequestException('Geçersiz ofis alanı.');
  function text(key: string, max: number) {
    if (typeof data[key] !== 'string') throw new BadRequestException('Tüm ofis alanlarını kontrol edin.');
    const clean = (data[key] as string).trim();
    if (clean.length > max || /[\u0000-\u001f\u007f]/.test(clean)) throw new BadRequestException('Ofis bilgileri geçersiz karakter veya fazla uzun metin içeriyor.');
    return clean;
  }
  const name = text('name', 120), address = text('address', 400), phone = text('phone', 30);
  if (name.length < 2) throw new BadRequestException('Ofis adı en az 2 karakter olmalı.');
  if (phone && (!/^[+\d ()-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')) || (phone.includes('+') && !/^\+[^+]*$/.test(phone)))) throw new BadRequestException('Geçerli bir ofis telefon numarası girin.');
  return { name, address, phone, city: text('city', 80), district: text('district', 80), neighborhood: text('neighborhood', 100) };
}
export function officeLogoExtension(file: Express.Multer.File) {
  if (!file?.buffer?.length) throw new BadRequestException('Ofis logosu seçin.');
  if (file.buffer.length > OFFICE_LOGO_MAX_BYTES) throw new BadRequestException('Logo en fazla 2 MB olabilir.');
  const b = file.buffer;
  if (file.mimetype === 'image/png' && b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && b.toString('ascii', 12, 16) === 'IHDR' && b.readUInt32BE(16) > 0 && b.readUInt32BE(16) <= 8192 && b.readUInt32BE(20) > 0 && b.readUInt32BE(20) <= 8192) return 'png';
  if (file.mimetype === 'image/jpeg' && b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpg';
  if (file.mimetype === 'image/webp' && b.length >= 20 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(b.toString('ascii', 12, 16))) return 'webp';
  throw new BadRequestException('Geçerli bir JPG, PNG veya WEBP logo yükleyin.');
}
