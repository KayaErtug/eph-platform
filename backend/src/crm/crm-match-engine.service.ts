import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LinaDistanceService } from '../lina/geo/lina-distance.service';
import { readablePaidMatches } from '../matching/paid-match-report';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyCriteriaService } from '../property-criteria/property-criteria.service';
import { CrmService } from './crm.service';

@Injectable()
export class CrmMatchEngineService extends CrmService {
  constructor(private readonly matchPrisma: PrismaService, distance: LinaDistanceService,
    criteria: PropertyCriteriaService) { super(matchPrisma, distance, criteria); }

  override async getCustomerInterestMatches(interestId: string, userId: string, _userRole: Role) {
    const actor = await this.matchPrisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!actor) throw new NotFoundException('Kullanıcı bulunamadı.');
    const userRole = actor.role;
    const interest = await this.matchPrisma.customerInterest.findUnique({
      where: { id: interestId }, include: { customer: { select: { ownerId: true } } },
    });
    if (!interest || !interest.isActive) throw new NotFoundException('Aktif CRM talebi bulunamadı.');
    if (userRole !== Role.SUPER_ADMIN && interest.customer.ownerId !== userId) {
      throw new ForbiddenException('Bu CRM talebine erişim yetkiniz yok.');
    }
    const row = await this.matchPrisma.matchScanAttempt.findFirst({
      where: { sourceType: 'CRM_CUSTOMER', sourceId: interestId, status: 'COMPLETED',
        ...(userRole === Role.SUPER_ADMIN ? {} : { userId }) },
      orderBy: { startedAt: 'desc' }, select: { resultJson: true },
    });
    const result = row?.resultJson as { matches?: any[] } | null;
    const saved = await readablePaidMatches(this.matchPrisma, result?.matches || [], { id: userId, role: userRole });
    return saved.map(item => {
      const distance = item.distance as { decisionReady?: boolean; drivingDistanceKm?: number; durationMinutes?: number; straightLineDistanceKm?: number } | null;
      return { ...item, distance: { decisionReady: distance?.decisionReady === true,
        drivingDistanceKm: distance?.drivingDistanceKm ?? null, durationMinutes: distance?.durationMinutes ?? null,
        straightLineDistanceKm: distance?.straightLineDistanceKm ?? null,
        staticDurationMinutes: null, detourFactor: null, roadNetworkBarrierSignal: false, errorCode: null, message: null } };
    }) as unknown as Awaited<ReturnType<CrmService['getCustomerInterestMatches']>>;
  }
}
