import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, userRole: Role) {
    const ownCustomerWhere = { ownerId: userId };
    const ownTaskWhere = { userId, status: 'BEKLIYOR' as const };
    const ownActivityWhere = { userId };

    const [
      totalUnits,
      totalCustomers,
      totalVisits,
      totalProjects,
      latestUnits,
      latestCustomers,
      latestActivities,
      pendingTasks,
    ] = await Promise.all([
      this.prisma.unit.count({
        where: {
          project: {
            ownerId: userId,
          },
        },
      }),

      this.prisma.customer.count({
        where: ownCustomerWhere,
      }),

      this.prisma.userVisit.count({
        where: { userId },
      }),

      this.prisma.project.count({
        where: { ownerId: userId },
      }),

      this.prisma.unit.findMany({
        where: {
          project: {
            ownerId: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          project: true,
        },
      }),

      this.prisma.customer.findMany({
        where: ownCustomerWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      this.prisma.activity.findMany({
        where: ownActivityWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: true,
          user: true,
        },
      }),

      this.prisma.task.findMany({
        where: ownTaskWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: true,
        },
      }),
    ]);

    return {
      stats: {
        totalUnits,
        totalCustomers,
        totalVisits,
        totalProjects,
      },
      latestUnits,
      latestCustomers,
      latestActivities,
      pendingTasks,
      securityScope: {
        userId,
        role: userRole,
        mode: 'PRIVATE_USER_DASHBOARD',
      },
    };
  }
}