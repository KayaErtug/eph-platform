import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { accountDeletionKey, isAccountDeleted } from '../auth/account-deletion';

export type DeletionContext = { reason?: unknown; ipAddress?: string; userAgent?: string };

export async function deleteUserAccount(prisma: PrismaService, actorId: string, userId: string, context: DeletionContext = {}) {
  if (typeof actorId !== 'string' || !actorId || typeof userId !== 'string' || !userId.trim() || userId.length > 128) throw new BadRequestException('Kullanıcı seçimi geçersiz.');
  if (context.reason !== undefined && typeof context.reason !== 'string') throw new BadRequestException('Silme gerekçesi metin olmalıdır.');
  const reason = typeof context.reason === 'string' ? context.reason.trim() : '';
  if (reason.length > 1000) throw new BadRequestException('Silme gerekçesi en fazla 1000 karakter olabilir.');
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        for (const id of [...new Set([actorId, userId])].sort()) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`office-user:${id}`}))`;
          await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
        }
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isApproved: true, isVerified: true } });
        if (actor?.role !== Role.SUPER_ADMIN || !actor.isApproved || !actor.isVerified || await isAccountDeleted(tx, actorId)) throw new ForbiddenException('Kullanıcıyı yalnız aktif süper admin silebilir.');
        const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, officeId: true } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
        if (await isAccountDeleted(tx, userId)) return { ok: true, userId, deleted: true, recordsPreserved: true, alreadyDeleted: true };
        const now = new Date();
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`native-push:${userId}`}))`;
        await tx.user.update({ where: { id: userId }, data: {
          isApproved: false, isVerified: false, officeId: null, passwordHash: null,
          emailVerificationCodeHash: null, emailVerificationExpiresAt: null,
          passwordResetCodeHash: null, passwordResetExpiresAt: null,
          passwordResetVersion: { increment: 1 },
        } });
        await tx.teamMember.updateMany({ where: { userId, isActive: true }, data: { isActive: false, leftAt: now } });
        await tx.team.updateMany({ where: { leaderId: userId }, data: { leaderId: null } });
        await tx.kontorCuzdani.updateMany({ where: { kullaniciId: userId }, data: { aktifMi: false } });
        await tx.pushSubscription.deleteMany({ where: { userId } });
        await tx.systemSetting.deleteMany({ where: { key: { startsWith: 'EPH_NATIVE_PUSH_' }, valueJson: { path: ['userId'], equals: userId } } });
        const applications = await tx.systemSetting.findMany({ where: { key: { startsWith: 'EPH_OFFICE_JOIN_', endsWith: `_${userId}` } }, select: { key: true, valueJson: true } });
        for (const application of applications) {
          const value = application.valueJson as Prisma.JsonObject | null;
          if (value?.status === 'PENDING') await tx.systemSetting.update({ where: { key: application.key }, data: { valueJson: { ...value, status: 'REMOVED', removedBy: actorId, removedAt: now.toISOString() } } });
        }
        const key = accountDeletionKey(userId);
        const valueJson = { deleted: true, deletedAt: now.toISOString(), deletedById: actorId, reason };
        await tx.systemSetting.create({ data: { key, valueJson } });
        await tx.adminActionLog.create({ data: {
          actorId, targetUserId: userId, action: 'USER_DELETED', entityType: 'User', entityId: userId,
          description: 'Kullanıcı hesabı silindi; portföy, CRM, mesaj ve finansal geçmiş korundu.',
          metadata: { ...valueJson, originalRole: user.role, previousOfficeId: user.officeId, recordsPreserved: true },
          ipAddress: context.ipAddress || null, userAgent: context.userAgent || null,
        } });
        return { ok: true, userId, deleted: true, recordsPreserved: true, alreadyDeleted: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}
