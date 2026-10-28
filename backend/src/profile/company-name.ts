import { BadRequestException } from '@nestjs/common';

export function requiresCompanyName(role?: string) {
  return ['EMLAKCI', 'MUTEAHHIT', 'INSAAT_FIRMASI', 'OFIS_SAHIBI', 'TAKIM_LIDERI'].includes(String(role || ''));
}

export function companyName(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Çalıştığınız ofis / firma adı zorunludur.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/.test(value) || !/\p{L}/u.test(name)) {
    throw new BadRequestException('Ofis / firma adı 2–120 karakter olmalı ve harf içermelidir.');
  }
  return name;
}
