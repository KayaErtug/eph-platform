import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
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
      this.prisma.unit.count(),
      this.prisma.customer.count(),
      this.prisma.userVisit.count(),
      this.prisma.project.count(),

      this.prisma.unit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          project: true,
        },
      }),

      this.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      this.prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: true,
          user: true,
        },
      }),

      this.prisma.task.findMany({
        where: {
          status: 'BEKLIYOR',
        },
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
    };
  }
}