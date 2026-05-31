import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PresenceStatus = 'online' | 'away' | 'offline';

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

  async getPresence() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            page: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    const result: Record<PresenceStatus, any[]> = {
      online: [],
      away: [],
      offline: [],
    };

    for (const user of users) {
      const lastVisit = user.visits[0] || null;
      const lastSeenAt = lastVisit?.createdAt || null;
      const diffMinutes = lastSeenAt ? Math.floor((now - new Date(lastSeenAt).getTime()) / 60000) : null;

      let status: PresenceStatus = 'offline';

      if (diffMinutes !== null && diffMinutes <= 5) {
        status = 'online';
      } else if (diffMinutes !== null && diffMinutes > 5 && diffMinutes <= 20) {
        status = 'away';
      }

      result[status].push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        status,
        lastSeenAt,
        lastPage: lastVisit?.page || null,
        minutesAgo: diffMinutes,
      });
    }

    return result;
  }
}