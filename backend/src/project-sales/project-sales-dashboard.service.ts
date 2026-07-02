import { Injectable } from '@nestjs/common';
import {
  CustomerRole,
  CustomerStatus,
  PortfolioApprovalStatus,
  UnitStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AVAILABLE_STATUSES: UnitStatus[] = [
  UnitStatus.SATILIK,
  UnitStatus.ON_SATIS,
  UnitStatus.YAKINDA_SATISTA,
  UnitStatus.INSAAT_PROJESI,
  UnitStatus.PROJE_ASAMASI,
  UnitStatus.INSAAT_HALINDE,
  UnitStatus.TESLIME_HAZIR,
  UnitStatus.HEMEN_TESLIM,
];

const RESERVED_STATUSES: UnitStatus[] = [
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
];

const CLOSED_CUSTOMER_STATUSES: CustomerStatus[] = [
  CustomerStatus.KAPANDI,
  CustomerStatus.KAYBEDILDI,
];

type ProjectSummary = {
  id: string;
  code: string | null;
  name: string;
  city: string;
  district: string;
  completionPercent: number | null;
  defaultDeliveryDate: Date | null;
  isActive: boolean;
  totalUnitCount: number;
  availableUnitCount: number;
  reservedUnitCount: number;
  soldUnitCount: number;
  passiveUnitCount: number;
  remainingStockCount: number;
  poolVisibleUnitCount: number;
  salesReadyUnitCount: number;
  totalInventoryValue: number;
  remainingInventoryValue: number;
  soldInventoryValue: number;
};

@Injectable()
export class ProjectSalesDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [projects, unitGroups, customerGroups] = await Promise.all([
      this.prisma.project.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          district: true,
          completionPercent: true,
          defaultDeliveryDate: true,
          isActive: true,
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.unit.groupBy({
        by: ['projectId', 'status', 'isPoolVisible', 'approvalStatus'],
        where: {
          project: {
            ownerId: userId,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          price: true,
        },
      }),
      this.prisma.customer.groupBy({
        by: ['status'],
        where: {
          ownerId: userId,
          roles: {
            has: CustomerRole.ALICI,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          budget: true,
        },
      }),
    ]);

    const projectMap = new Map<string, ProjectSummary>(
      projects.map((project) => [
        project.id,
        {
          ...project,
          totalUnitCount: 0,
          availableUnitCount: 0,
          reservedUnitCount: 0,
          soldUnitCount: 0,
          passiveUnitCount: 0,
          remainingStockCount: 0,
          poolVisibleUnitCount: 0,
          salesReadyUnitCount: 0,
          totalInventoryValue: 0,
          remainingInventoryValue: 0,
          soldInventoryValue: 0,
        },
      ]),
    );

    const summary = {
      totalProjectCount: projects.length,
      activeProjectCount: projects.filter((project) => project.isActive).length,
      totalUnitCount: 0,
      availableUnitCount: 0,
      reservedUnitCount: 0,
      soldUnitCount: 0,
      passiveUnitCount: 0,
      remainingStockCount: 0,
      poolVisibleUnitCount: 0,
      salesReadyUnitCount: 0,
      totalInventoryValue: 0,
      remainingInventoryValue: 0,
      soldInventoryValue: 0,
      activeBuyerCount: 0,
      closedBuyerCount: 0,
      lostBuyerCount: 0,
      potentialBuyerBudget: 0,
    };

    for (const group of unitGroups) {
      const count = group._count._all;
      const value = Number(group._sum.price || 0);
      const project = projectMap.get(group.projectId);
      const isAvailable = AVAILABLE_STATUSES.includes(group.status);
      const isReserved = RESERVED_STATUSES.includes(group.status);
      const isSold = group.status === UnitStatus.SATILDI;
      const isPassive = group.status === UnitStatus.PASIF;
      const isRemaining = !isSold && !isPassive;
      const isSalesReady =
        isAvailable &&
        (group.approvalStatus === PortfolioApprovalStatus.ONAYLANDI ||
          group.approvalStatus === PortfolioApprovalStatus.HAVUZDA);

      summary.totalUnitCount += count;
      summary.totalInventoryValue += value;

      if (isAvailable) {
        summary.availableUnitCount += count;
      }

      if (isReserved) {
        summary.reservedUnitCount += count;
      }

      if (isSold) {
        summary.soldUnitCount += count;
        summary.soldInventoryValue += value;
      }

      if (isPassive) {
        summary.passiveUnitCount += count;
      }

      if (isRemaining) {
        summary.remainingStockCount += count;
        summary.remainingInventoryValue += value;
      }

      if (group.isPoolVisible) {
        summary.poolVisibleUnitCount += count;
      }

      if (isSalesReady) {
        summary.salesReadyUnitCount += count;
      }

      if (!project) {
        continue;
      }

      project.totalUnitCount += count;
      project.totalInventoryValue += value;

      if (isAvailable) {
        project.availableUnitCount += count;
      }

      if (isReserved) {
        project.reservedUnitCount += count;
      }

      if (isSold) {
        project.soldUnitCount += count;
        project.soldInventoryValue += value;
      }

      if (isPassive) {
        project.passiveUnitCount += count;
      }

      if (isRemaining) {
        project.remainingStockCount += count;
        project.remainingInventoryValue += value;
      }

      if (group.isPoolVisible) {
        project.poolVisibleUnitCount += count;
      }

      if (isSalesReady) {
        project.salesReadyUnitCount += count;
      }
    }

    const crmPipeline = Object.values(CustomerStatus).reduce(
      (result, status) => {
        result[status] = {
          count: 0,
          budget: 0,
        };
        return result;
      },
      {} as Record<CustomerStatus, { count: number; budget: number }>,
    );

    for (const group of customerGroups) {
      const count = group._count._all;
      const budget = Number(group._sum.budget || 0);

      crmPipeline[group.status] = {
        count,
        budget,
      };

      if (group.status === CustomerStatus.KAPANDI) {
        summary.closedBuyerCount += count;
        continue;
      }

      if (group.status === CustomerStatus.KAYBEDILDI) {
        summary.lostBuyerCount += count;
        continue;
      }

      if (!CLOSED_CUSTOMER_STATUSES.includes(group.status)) {
        summary.activeBuyerCount += count;
        summary.potentialBuyerBudget += budget;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      summary,
      crmPipeline,
      projects: Array.from(projectMap.values()),
    };
  }
}
