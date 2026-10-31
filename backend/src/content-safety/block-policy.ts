import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Database = PrismaService | Prisma.TransactionClient;

export async function blockedPeerIds(db: Database, userId?: string | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await db.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map(row => row.blockerId === userId ? row.blockedId : row.blockerId))];
}

export async function assertNoBlockedInteraction(db: Database, userId: string, peerIds: string[]) {
  const peers = [...new Set(peerIds.filter(id => id && id !== userId))];
  if (!peers.length) return;
  const blocked = await db.userBlock.findFirst({
    where: { OR: [
      { blockerId: userId, blockedId: { in: peers } },
      { blockedId: userId, blockerId: { in: peers } },
    ] }, select: { id: true },
  });
  if (blocked) throw new ForbiddenException({ code: 'USER_BLOCKED', message: 'Engelleme nedeniyle bu kullanıcıyla etkileşim kurulamıyor.' });
}

// §0: SUPER_ADMIN için engelleme filtresi uygulanmaz.
export function visibleAuthor(userId: string, role?: string | null): Prisma.UserWhereInput {
  if (role === 'SUPER_ADMIN') return {};
  return { usersBlocked: { none: { blockedId: userId } }, blockedByUsers: { none: { blockerId: userId } } };
}
