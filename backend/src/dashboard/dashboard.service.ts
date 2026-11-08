import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, userRole: Role) {
    const isSuper = userRole === Role.SUPER_ADMIN || (userRole as string) === 'SUPER_ADMIN';

    const ownCustomerWhere = isSuper ? {} : { ownerId: userId };
    const ownTaskWhere = isSuper ? { status: 'BEKLIYOR' as const } : { userId, status: 'BEKLIYOR' as const };
    const ownActivityWhere = isSuper ? {} : { userId };
    const ownUnitWhere = isSuper ? {} : { project: { ownerId: userId } };
    const ownProjectWhere = isSuper ? {} : { ownerId: userId };
    const ownVisitWhere = isSuper ? {} : { userId };

    const [
      totalUnits,
      totalCustomers,
      totalVisits,
      totalProjects,
      latestUnits,
      latestCustomers,
      latestActivities,
      pendingTasks,
      pendingTaskCount,
    ] = await Promise.all([
      this.prisma.unit.count({
        where: ownUnitWhere,
      }),

      this.prisma.customer.count({
        where: ownCustomerWhere,
      }),

      this.prisma.userVisit.count({
        where: ownVisitWhere,
      }),

      this.prisma.project.count({
        where: ownProjectWhere,
      }),

      this.prisma.unit.findMany({
        where: ownUnitWhere,
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

      this.prisma.task.count({
        where: ownTaskWhere,
      }),
    ]);

    return {
      stats: {
        totalUnits,
        totalCustomers,
        totalVisits,
        totalProjects,
        pendingTasks: pendingTaskCount,
      },
      latestUnits,
      latestCustomers,
      latestActivities,
      pendingTasks,
      securityScope: {
        userId,
        role: userRole,
        mode: isSuper ? 'SUPER_ADMIN_PLATFORM_DASHBOARD' : 'PRIVATE_USER_DASHBOARD',
      },
    };
  }
}
