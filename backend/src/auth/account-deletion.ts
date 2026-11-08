import type { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export const ACCOUNT_DELETION_PREFIX = 'EPH_ACCOUNT_DELETED_';
export const accountDeletionKey = (userId: string) => ACCOUNT_DELETION_PREFIX + userId;
type SettingsDb = Pick<PrismaService | Prisma.TransactionClient, 'systemSetting'>;
export type AccountDeletion = { deleted: true; deletedAt: string; deletedById: string; reason: string };

export async function isAccountDeleted(db: SettingsDb, userId: string): Promise<boolean> {
  if (!db?.systemSetting?.findUnique) return false;
  const row = await db.systemSetting.findUnique({ where: { key: accountDeletionKey(userId) }, select: { valueJson: true } });
  return (row?.valueJson as Prisma.JsonObject | null)?.deleted === true;
}

export async function deletedAccounts(db: SettingsDb): Promise<Map<string, AccountDeletion>> {
  const rows = await db.systemSetting.findMany({ where: { key: { startsWith: ACCOUNT_DELETION_PREFIX } }, select: { key: true, valueJson: true } });
  const records = new Map<string, AccountDeletion>();
  for (const row of rows) {
    const value = row.valueJson as Prisma.JsonObject | null;
    if (value?.deleted === true && typeof value.deletedAt === 'string') {
      records.set(row.key.slice(ACCOUNT_DELETION_PREFIX.length), {
        deleted: true, deletedAt: value.deletedAt,
        deletedById: typeof value.deletedById === 'string' ? value.deletedById : '',
        reason: typeof value.reason === 'string' ? value.reason : '',
      });
    }
  }
  return records;
}
