import { Prisma } from '@prisma/client';

// Ticari değerler veridir, kod değildir (EPH_KURALLARI §0-B): kaynak SystemSetting.
// Buradaki değerler yalnızca ayar yoksa kullanılan yedek değerlerdir.
export const COST_DEFAULTS = {
  COST_HAVUZ_PORTFOY_YAYIN: 25,
  COST_PROJE_HAVUZ: 100,
  COST_OZEL_BILGI: 25,
  COST_TALEP_YAYIN: 25,
  COST_TALEP_ACIL_EK: 10,
  COST_YETKI_MEKTUBU_ASIM: 5,
} as const;

export type CostKey = keyof typeof COST_DEFAULTS;

// Yedek değeri OLMAYAN yönetilen ücret anahtarları (§0-B): ayar yoksa işlem güvenli hatayla durur.
// COST_ESLESME_TARAMA: ücretli eşleşme taraması genel tarifesi; 0 = ücretsiz tarama.
export const COST_NO_DEFAULT_KEYS = ['COST_ESLESME_TARAMA'] as const;

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
  LIMIT_ADMIN_HEDIYE_GUNLUK_PK: 5000,
  LIMIT_ALICI_ADMIN_HEDIYE_ADET: 2,
  LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK: 1000,
  LIMIT_TAKIM_DANISMAN: 10,
} as const;

// Dizi değerli LIMIT_* ayarları ({ value: number[] }); tek sayı olmadıkları için LIMIT_DEFAULTS'a girmez.
export const LIMIT_LIST_DEFAULTS = {
  LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI: [100, 250, 500],
} as const;

export type LimitListKey = keyof typeof LIMIT_LIST_DEFAULTS;

// Süper admin ayar ekranında kaydı olmasa da açıklamalı görünen limitler.
export const LIMIT_DESCRIPTIONS: Record<string, string> = {
  LIMIT_ADMIN_HEDIYE_PK_SECENEKLERI: 'ADMIN rolünün tek seferde gönderebileceği hediye PK tutarları (liste, ör. 100, 250, 500).',
  LIMIT_ADMIN_HEDIYE_GUNLUK_PK: 'Bir ADMIN hesabının günde gönderebileceği toplam hediye PK.',
  LIMIT_ALICI_ADMIN_HEDIYE_ADET: 'Bir kullanıcının ADMIN hesaplarından alabileceği en fazla hediye PK işlemi sayısı.',
  LIMIT_ALICI_ADMIN_HEDIYE_TOPLAM_PK: 'Bir kullanıcının ADMIN hesaplarından alabileceği toplam hediye PK.',
  LIMIT_TAKIM_DANISMAN: 'Bir takımdaki en fazla aktif danışman sayısı.',
  LIMIT_PK_DUSUK_UYARI: 'PK bakiyesi bu eşiğin altına düştüğünde bildirim gönderilir. Değer veritabanından yönetilir.',
};

export type LimitKey = keyof typeof LIMIT_DEFAULTS;

export const LIMIT_PREFIX = 'LIMIT_';

export const isManagedCommercialKey = (key: string) =>
  key === 'LIMIT_PK_DUSUK_UYARI' ||
  Object.prototype.hasOwnProperty.call(COST_DEFAULTS, key) ||
  (COST_NO_DEFAULT_KEYS as readonly string[]).includes(key) ||
  Object.prototype.hasOwnProperty.call(LIMIT_DEFAULTS, key) ||
  Object.prototype.hasOwnProperty.call(LIMIT_LIST_DEFAULTS, key);

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

export function parseLimitList(raw: unknown): number[] | null {
  const candidate = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as { value?: unknown }).value
    : raw;
  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  return candidate.every((item) => typeof item === 'number' && Number.isSafeInteger(item) && item > 0) ? candidate as number[] : null;
}

// Sıra: LIMIT_* liste ayarı, yoksa/geçersizse yedek liste.
export async function readLimitList(db: CostDb, key: LimitListKey): Promise<number[]> {
  const row = await db.systemSetting.findUnique({ where: { key }, select: { valueJson: true } });
  return (row ? parseLimitList(row.valueJson) : null) ?? [...LIMIT_LIST_DEFAULTS[key]];
}
