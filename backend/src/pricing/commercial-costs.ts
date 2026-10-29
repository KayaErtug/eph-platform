import { Prisma } from '@prisma/client';

// Ticari değerler veridir, kod değildir (EPH_KURALLARI §0-B): kaynak SystemSetting.
// Buradaki değerler yalnızca ayar yoksa kullanılan yedek değerlerdir.
export const COST_DEFAULTS = {
  COST_HAVUZ_PORTFOY_YAYIN: 25,
  COST_PROJE_HAVUZ: 100,
  COST_OZEL_BILGI: 25,
  COST_TALEP_YAYIN: 25,
  COST_TALEP_ACIL_EK: 10,
  COST_ESLESME_TARAMA: 25,
  COST_YETKI_MEKTUBU_ASIM: 5,
} as const;

export type CostKey = keyof typeof COST_DEFAULTS;

export const COST_PREFIX = 'COST_';

// Ücret olmayan ticari sınırlar: portföy fotoğraf sayısı ve talep geçerlilik süreleri (gün).
export const LIMIT_DEFAULTS = {
  LIMIT_PORTFOY_FOTOGRAF: 15,
  LIMIT_TALEP_SURE_1_GUN: 3,
  LIMIT_TALEP_SURE_2_GUN: 7,
  LIMIT_TALEP_SURE_3_GUN: 14,
  LIMIT_TALEP_SURE_4_GUN: 30,
  LIMIT_YETKI_MEKTUBU_CARPAN: 2,
  LIMIT_YETKI_MEKTUBU_SABIT: 20,
} as const;

export type LimitKey = keyof typeof LIMIT_DEFAULTS;

export const LIMIT_PREFIX = 'LIMIT_';

export const isManagedCommercialKey = (key: string) =>
  Object.prototype.hasOwnProperty.call(COST_DEFAULTS, key) || Object.prototype.hasOwnProperty.call(LIMIT_DEFAULTS, key);

type CostDb = Pick<Prisma.TransactionClient, 'systemSetting'>;

export function parseCostValue(raw: unknown): number | null {
  const candidate = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as { value?: unknown }).value
    : raw;
  const value = typeof candidate === 'string' && candidate.trim() !== '' ? Number(candidate) : candidate;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// Sıra: COST_* ayarı, varsa eski anahtarlar, yoksa yedek değer.
export async function readCost(db: CostDb, key: CostKey, legacyKeys: string[] = []): Promise<number> {
  for (const candidate of [key, ...legacyKeys]) {
    const row = await db.systemSetting.findUnique({ where: { key: candidate }, select: { valueJson: true } });
    const value = row ? parseCostValue(row.valueJson) : null;
    if (value !== null) return value;
  }
  return COST_DEFAULTS[key];
}

// Sıra: LIMIT_* ayarı, yoksa yedek değer.
export async function readLimit(db: CostDb, key: LimitKey): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key }, select: { valueJson: true } });
  const value = row ? parseCostValue(row.valueJson) : null;
  return value !== null ? value : LIMIT_DEFAULTS[key];
}
