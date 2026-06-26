import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PresenceStatus = 'online' | 'away' | 'offline';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async logVisit(data: {
    userId?: string;
    page: string;
    ip?: string;
    userAgent?: string;
  }) {
    const requestedUserId = data.userId?.trim() || null;

    let safeUserId: string | null = null;

    if (requestedUserId) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: requestedUserId,
        },
        select: {
          id: true,
        },
      });

      safeUserId = user?.id || null;
    }

    return this.prisma.userVisit.create({
      data: {
        userId: safeUserId,
        page: data.page,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  async getVisits(page?: string, userId?: string) {
    return this.prisma.userVisit.findMany({
      where: {
        ...(page ? { page } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });
  }

  private calculatePresence(lastSeenAt: Date | null) {
    const now = Date.now();

    const diffMinutes = lastSeenAt
      ? Math.floor((now - new Date(lastSeenAt).getTime()) / 60000)
      : null;

    let status: PresenceStatus = 'offline';

    if (diffMinutes !== null && diffMinutes <= 5) {
      status = 'online';
    } else if (diffMinutes !== null && diffMinutes <= 20) {
      status = 'away';
    }

    return {
      status,
      minutesAgo: diffMinutes,
    };
  }

  async getPresence(currentUserId?: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        visits: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            page: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result: Record<PresenceStatus, any[]> = {
      online: [],
      away: [],
      offline: [],
    };

    let currentUser: any = null;

    for (const user of users) {
      const lastVisit = user.visits[0] || null;
      const lastSeenAt = lastVisit?.createdAt || null;

      const presence = this.calculatePresence(lastSeenAt);

      const payload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.email,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        status: presence.status,
        lastSeenAt,
        lastPage: lastVisit?.page || null,
        minutesAgo: presence.minutesAgo,
      };

      result[presence.status].push(payload);

      if (currentUserId && user.id === currentUserId) {
        currentUser = payload;
      }
    }

    return {
      currentUser,
      online: result.online,
      away: result.away,
      offline: result.offline,
    };
  }
}
