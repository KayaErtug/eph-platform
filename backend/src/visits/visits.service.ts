import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async logVisit(data: { userId?: string; page: string; ip?: string; userAgent?: string }) {
    return this.prisma.userVisit.create({ data });
  }

  async getVisits(page?: string, userId?: string) {
    return this.prisma.userVisit.findMany({
      where: {
        ...(page ? { page } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
