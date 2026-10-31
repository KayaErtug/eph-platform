import { visibleAuthor } from '../content-safety/block-policy';
import type { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, UnitStatus } from '@prisma/client';

export const ACTIVE_MATCH_UNIT: Prisma.UnitWhereInput = {
  isOffMarket: false,
  status: { notIn: [UnitStatus.PASIF, UnitStatus.SATILDI, UnitStatus.KIRALANDII] },
  project: { isActive: true },
};

export function visiblePaidUnits(user: { id: string; role: Role }): Prisma.UnitWhereInput {
  if (user.role === Role.SUPER_ADMIN) return {};
  const blockScope: Prisma.UnitWhereInput = { project: { owner: visibleAuthor(user.id, user.role) } };
  return { AND: [blockScope, { OR: [{ project: { ownerId: user.id } }, { isPoolVisible: true, OR: [
    { poolAudience: { is: null } }, { poolAudience: { is: { mode: 'PUBLIC' } } },
    { poolAudience: { is: { roles: { has: user.role } } } },
    { poolAudience: { is: { groups: { some: { group: { members: { some: { userId: user.id } } } } } } } },
  ] }] }] };
}

export type PaidMatchItem = {
  unitId: string; customerId?: string; customerName?: string; interestId?: string;
  title?: string; projectName?: string | null; isOwnPortfolio?: boolean; isPoolVisible?: boolean;
  matchScore: number; matchReasons: string[]; [key: string]: unknown;
};

export async function readablePaidMatches(prisma: PrismaService, saved: PaidMatchItem[], user: { id: string; role: Role }): Promise<PaidMatchItem[]> {
  if (!saved.length) return [];
  const units = await prisma.unit.findMany({
    where: { ...ACTIVE_MATCH_UNIT,
      id: { in: [...new Set(saved.map(item => item.unitId).filter(Boolean))] },
      AND: [visiblePaidUnits(user)],
    },
    select: { id: true, isPoolVisible: true, project: { select: { ownerId: true, neighborhood: true } } },
  });
  const unitMap = new Map(units.map(unit => [unit.id, unit]));
  const customerIds = [...new Set(saved.map(item => item.customerId).filter(Boolean))] as string[];
  const customers = customerIds.length ? await prisma.customer.findMany({
    where: { id: { in: customerIds }, ...(user.role === Role.SUPER_ADMIN ? {} : { ownerId: user.id }) },
    select: { id: true, firstName: true, lastName: true },
  }) : [];
  const customerMap = new Map(customers.map(customer => [customer.id, customer]));
  return saved.flatMap(item => {
    const unit = unitMap.get(item.unitId);
    if (!unit || (item.customerId && !customerMap.has(item.customerId))) return [];
    const customer = item.customerId ? customerMap.get(item.customerId) : undefined;
    return [{ ...item, isOwnPortfolio: unit.project.ownerId === user.id, isPoolVisible: unit.isPoolVisible,
      neighborhood: item.neighborhood && item.neighborhood === unit.project.neighborhood ? item.neighborhood : null,
      ...(customer ? { customerName: [customer.firstName, customer.lastName].filter(Boolean).join(' ') } : {}),
    }];
  });
}
