import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type OfficeDb = PrismaService | Prisma.TransactionClient;
export type OfficeWalletSelection = { walletSource?: string; walletOfficeId?: string | null };
export type OfficeSpendingMode = 'ALLOCATED' | 'SHARED';
export const officePolicyKey = (id: string) => `EPH_OFFICE_SPENDING_${id}`;
export const actorPaidWhere = (id: string): Prisma.KontorHareketiWhereInput => ({
  OR: [{ olusturanId: id }, { kullaniciId: id, olusturanId: null }],
});
export async function officeLock(db: OfficeDb, key: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
export async function officeMembershipEnforced(db: OfficeDb) {
  const row = await db.systemSetting.findUnique({ where: { key: 'EPH_OFFICE_MEMBERSHIP_ENFORCED' } });
  return row?.valueJson === true;
}
export async function spendingMode(db: OfficeDb, officeId: string): Promise<OfficeSpendingMode> {
  const row = await db.systemSetting.findUnique({ where: { key: officePolicyKey(officeId) } });
  const value = row?.valueJson as Prisma.JsonObject | undefined;
  if (value?.mode === 'SHARED' || value?.mode === 'ALLOCATED') return value.mode;
  // Preserve existing clients during migration. After activation, sharing requires owner consent.
  return await officeMembershipEnforced(db) ? 'ALLOCATED' : 'SHARED';
}
export async function resolveOfficeWallet(db: OfficeDb, actorId: string, input: OfficeWalletSelection = {}, lock = false) {
  if (!actorId) throw new ForbiddenException('Oturum doğrulanamadı.');
  if (input.walletSource && !['PERSONAL', 'OFFICE'].includes(input.walletSource)) throw new BadRequestException('Geçersiz PK kaynağı.');
  if (input.walletOfficeId && input.walletSource !== 'OFFICE') throw new BadRequestException('Geçersiz ofis seçimi.');
  if (input.walletSource === 'OFFICE' && !input.walletOfficeId) throw new BadRequestException('PK kaynağı için ofis seçin.');
  if (lock) {
    await officeLock(db, `office-user:${actorId}`);
    await db.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${actorId} FOR UPDATE`;
  }
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, officeId: true } });
  if (!actor) throw new ForbiddenException('Kullanıcı bulunamadı.');
  let office = input.walletOfficeId
    ? await db.office.findUnique({ where: { id: input.walletOfficeId } })
    : actor.officeId ? await db.office.findUnique({ where: { id: actor.officeId } })
    : await db.office.findFirst({ where: { ownerUserId: actorId, isActive: true }, orderBy: { id: 'asc' } });
  if (!input.walletOfficeId && !office?.isActive) office = await db.office.findFirst({ where: { ownerUserId: actorId, isActive: true }, orderBy: { id: 'asc' } });
  if (input.walletSource === 'PERSONAL' && actor.role !== Role.EMLAKCI) office = null;
  if (office && lock) {
    await officeLock(db, `office-policy:${office.id}`);
    await db.$queryRaw`SELECT "id" FROM "Office" WHERE "id" = ${office.id} FOR UPDATE`;
    office = await db.office.findUnique({ where: { id: office.id } });
  }
  const affiliated = Boolean(office?.isActive && (office.ownerUserId === actorId || actor.officeId === office.id || (actor.role === Role.SUPER_ADMIN && input.walletSource === 'OFFICE')));
  if (actor.role === Role.EMLAKCI && !affiliated && await officeMembershipEnforced(db)) throw new ForbiddenException({ code: 'OFFICE_MEMBERSHIP_REQUIRED', message: 'Danışman hesabınızı aktif bir ofise bağlayın.', officeRoute: '/office' });
  if (input.walletSource === 'OFFICE' && (!office?.isActive || !office.ownerUserId || !affiliated)) throw new ForbiddenException('Bu ofisin PK hesabını kullanamazsınız.');
  const mode = affiliated && office ? await spendingMode(db, office.id) : 'ALLOCATED';
  const configuredPolicy = office ? await db.systemSetting.findUnique({ where: { key: officePolicyKey(office.id) } }) : null;
  const configuredMode = (configuredPolicy?.valueJson as Prisma.JsonObject | undefined)?.mode;
  const confirmedSharing = configuredMode === 'SHARED' || await officeMembershipEnforced(db);
  const sharedMember = Boolean(affiliated && office?.ownerUserId && office.ownerUserId !== actorId && mode === 'SHARED');
  if (input.walletSource === 'PERSONAL' && sharedMember && confirmedSharing) throw new ForbiddenException('Ofisiniz ortak PK modunda. Güncel harcama hesabını seçin.');
  if (input.walletSource === 'OFFICE' && office?.ownerUserId !== actorId && mode !== 'SHARED') throw new ForbiddenException('Ofisiniz dağıtım modunda. Size aktarılan PK bakiyesini kullanın.');
  const shared = input.walletSource === 'OFFICE' || (!input.walletSource && sharedMember);
  if (shared && office && office.ownerUserId !== actorId) {
    const policyJson = configuredPolicy?.valueJson as any;
    if (policyJson) {
      const allowedUsers: string[] | undefined = policyJson.allowedSharedPoolUserIds;
      const allowedTeams: string[] | undefined = policyJson.allowedSharedPoolTeamIds;
      const hasRestrictions = (Array.isArray(allowedUsers) && allowedUsers.length > 0) || (Array.isArray(allowedTeams) && allowedTeams.length > 0);
      if (hasRestrictions) {
        let authorized = false;
        if (Array.isArray(allowedUsers) && allowedUsers.includes(actorId)) {
          authorized = true;
        } else if (Array.isArray(allowedTeams) && allowedTeams.length > 0) {
          const teamCount = await db.teamMember.count({
            where: { userId: actorId, isActive: true, teamId: { in: allowedTeams } },
          });
          if (teamCount > 0) authorized = true;
        }
        if (!authorized) {
          throw new ForbiddenException('Ofis ortak kontör havuzuna erişim yetkiniz bulunmamaktadır.');
        }
      }

      if (policyJson.autoSpendPermissions && policyJson.autoSpendPermissions[actorId] === false) {
        throw new ForbiddenException('Ortak havuzdan harcama yetkiniz bulunmamaktadır. Ofis yöneticinizden yetki isteyin.');
      }
    }
  }
  const chargeUserId = shared && office?.ownerUserId ? office.ownerUserId : actorId;
  return { chargeUserId, walletSource: shared ? 'OFFICE' as const : 'PERSONAL' as const,
    walletOfficeId: shared && office ? office.id : null, mode,
    label: shared && office ? `${office.name} · Ortak PK` : actor.role === Role.EMLAKCI ? 'Danışman PK bakiyem' : 'PK bakiyem' };
}
