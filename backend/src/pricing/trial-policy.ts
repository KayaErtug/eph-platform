import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseCostValue } from './commercial-costs';

// Deneme politikası tek yerden okunur (EPH_KURALLARI §0-B). Kaynak SystemSetting; değerler yalnız kayıt yoksa yedektir.
export const TRIAL_DEFAULTS = {
  TRIAL_INITIAL_DAYS: 14,
  TRIAL_EXTENSION_DAYS: 14,
  TRIAL_MAX_EXTENSIONS: 1,
} as const;

type TrialDb = Pick<Prisma.TransactionClient, 'systemSetting'>;

export type TrialPolicy = {
  initialDays: number;
  extensionDays: number;
  maxExtensions: number;
  maxTotalDays: number;
};

async function readTrialSetting(db: TrialDb, key: keyof typeof TRIAL_DEFAULTS): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key }, select: { valueJson: true } });
  const value = row ? parseCostValue(row.valueJson) : null;
  return value !== null ? value : TRIAL_DEFAULTS[key];
}

export async function readTrialPolicy(db: TrialDb): Promise<TrialPolicy> {
  const initialDays = await readTrialSetting(db, 'TRIAL_INITIAL_DAYS');
  const extensionDays = await readTrialSetting(db, 'TRIAL_EXTENSION_DAYS');
  const maxExtensions = await readTrialSetting(db, 'TRIAL_MAX_EXTENSIONS');
  if (initialDays <= 0 || extensionDays <= 0) {
    throw new BadRequestException('Deneme politikası sistem ayarları geçersiz.');
  }
  return { initialDays, extensionDays, maxExtensions, maxTotalDays: initialDays + extensionDays * maxExtensions };
}

// İlk deneme günü: önce paketin denemeGunSayisi alanı, yoksa TRIAL_INITIAL_DAYS.
export function resolveInitialTrialDays(paket: { denemeGunSayisi?: number | null } | null | undefined, policy: TrialPolicy): number {
  const days = paket?.denemeGunSayisi;
  return typeof days === 'number' && Number.isInteger(days) && days > 0 ? days : policy.initialDays;
}
