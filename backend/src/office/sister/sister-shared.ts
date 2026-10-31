import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

export const SISTER_PACKAGES_KEY = 'KARDES_OFIS_PAKETLER';
const logger = new Logger('SisterNetwork');

export const SALE_STATUSES: UnitStatus[] = [UnitStatus.SATILIK, UnitStatus.DEVREN_SATILIK];
export const RENT_STATUSES: UnitStatus[] = [UnitStatus.KIRALIK, UnitStatus.GUNLUK_KIRALIK];

export type Actor = { id: string; isSuper: boolean; officeId: string | null };
export type OfficeAccess = { office: { id: string; name: string; ownerUserId: string | null; isActive: boolean; code: string | null }; actor: Actor; isOwner: boolean };

export const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();

// Ofis kapsamı: ofis sahibinin kendi portföyleri + ofise bağlı kullanıcıların portföyleri (office-pool ile aynı kural).
export function officeUnitScope(officeId: string, ownerUserId: string | null): Prisma.UnitWhereInput {
  return { project: { isActive: true, OR: [{ owner: { officeId } }, ...(ownerUserId ? [{ ownerId: ownerUserId }] : [])] } };
}

// Ofis sahibi veya üye ya da süper admin. Ofis dışı kullanıcı 403.
export async function resolveOfficeAccess(prisma: PrismaService, userId: string, officeId: string, opts: { ownerOnly?: boolean } = {}): Promise<OfficeAccess> {
  const [office, user] = await Promise.all([
    prisma.office.findUnique({ where: { id: officeId }, select: { id: true, name: true, ownerUserId: true, isActive: true, code: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, officeId: true } }),
  ]);
  if (!office) throw new NotFoundException('Ofis bulunamadı.');
  if (!user) throw new ForbiddenException('Kullanıcı doğrulanamadı.');
  const isSuper = user.role === Role.SUPER_ADMIN;
  const isOwner = isSuper || office.ownerUserId === userId;
  const isMember = isOwner || user.officeId === officeId;
  if (!isMember) throw new ForbiddenException('Bu ofisin kardeş ofis ağına erişim yetkiniz yok.');
  if (opts.ownerOnly && !isOwner) throw new ForbiddenException('Bu işlem yalnız ofis sahibine açıktır.');
  return { office, actor: { id: user.id, isSuper, officeId: user.officeId }, isOwner };
}

export const sortedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export async function allowedPackageCodes(prisma: PrismaService): Promise<string[]> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SISTER_PACKAGES_KEY }, select: { valueJson: true } });
  const raw = row?.valueJson;
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && !!c.trim()).map(c => c.trim().toUpperCase()) : [];
}

// "Uygun" = aktif ofis + abonelik paketi izinli listede (süresi dolmamış). Her istekte hesaplanır, saklanmaz.
export async function eligibilityMap(prisma: PrismaService, officeIds: string[]): Promise<Map<string, boolean>> {
  const ids = [...new Set(officeIds)];
  const result = new Map<string, boolean>(ids.map(id => [id, false]));
  if (!ids.length) return result;
  const [allowed, offices, subs] = await Promise.all([
    allowedPackageCodes(prisma),
    prisma.office.findMany({ where: { id: { in: ids } }, select: { id: true, isActive: true } }),
    prisma.systemSetting.findMany({ where: { key: { in: ids.map(id => `OFFICE_SUBSCRIPTION_${id}`) } }, select: { key: true, valueJson: true } }),
  ]);
  const subById = new Map(subs.map(s => [s.key.replace('OFFICE_SUBSCRIPTION_', ''), s.valueJson as any]));
  for (const o of offices) {
    const sub = subById.get(o.id);
    const code = typeof sub?.packageCode === 'string' ? sub.packageCode.trim().toUpperCase() : '';
    const expires = sub?.expiresAt ? Date.parse(sub.expiresAt) : NaN;
    const expired = Number.isFinite(expires) && expires <= Date.now();
    result.set(o.id, o.isActive && !!code && allowed.includes(code) && !expired);
  }
  return result;
}

// Bildirim hataları iş akışını bozmaz.
export async function safeNotify(
  notifications: NotificationsService | undefined,
  userId: string | null | undefined,
  input: { type: string; title: string; body: string; actionUrl: string; eventKey: string; priority?: 'ACIL' | 'ONEMLI' | 'BILGI' },
) {
  if (!notifications || !userId) return;
  try {
    await notifications.notify(userId, { priority: 'ONEMLI', ...input });
  } catch (error) {
    logger.warn(`Bildirim gönderilemedi (${input.type}): ${(error as Error)?.message ?? error}`);
  }
}
