import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Capability, PortfolioApprovalStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type TeamLeaderCrmActor = {
  id?: string;
  role?: Role | string;
  email?: string;
};

@Injectable()
export class TeamLeaderCrmService {
  constructor(private readonly prisma: PrismaService) {}

  private getActorId(actor?: TeamLeaderCrmActor): string {
    const actorId = actor?.id;

    if (!actorId) {
      throw new ForbiddenException('Kullanıcı kimliği doğrulanamadı.');
    }

    return actorId;
  }

  private async ensureCanViewTeamLeaderDashboard(actor?: TeamLeaderCrmActor) {
    const actorId = this.getActorId(actor);
    const role = actor?.role;

    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
      return actorId;
    }

    const capability = await this.prisma.userCapability.findUnique({
      where: {
        userId_capability: {
          userId: actorId,
          capability: Capability.TEAM_LEADER,
        },
      },
      select: { id: true },
    });

    if (!capability) {
      throw new ForbiddenException('Bu ekran için Takım Lideri yetkisi gereklidir.');
    }

    return actorId;
  }

  private calculatePerformanceScore(input: {
    memberCount: number;
    portfolioCount: number;
    authorizedPortfolioCount: number;
    poolPortfolioCount: number;
  }) {
    const memberScore = Math.min(input.memberCount / 10, 1) * 20;
    const authorizedScore = input.portfolioCount
      ? Math.min(input.authorizedPortfolioCount / input.portfolioCount, 1) * 40
      : 0;
    const poolScore = input.portfolioCount
      ? Math.min(input.poolPortfolioCount / input.portfolioCount, 1) * 30
      : 0;
    const activityScore = input.portfolioCount > 0 ? 10 : 0;

    return Math.max(0, Math.min(100, Math.round(memberScore + authorizedScore + poolScore + activityScore)));
  }

  async getMyDashboard(actor?: TeamLeaderCrmActor) {
    const actorId = await this.ensureCanViewTeamLeaderDashboard(actor);

    const team = await this.prisma.team.findFirst({
      where: {
        leaderId: actorId,
        isActive: true,
      },
      include: {
        office: { select: { id: true, name: true, city: true, district: true } },
        leader: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        members: {
          where: { isActive: true },
          select: {
            id: true,
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                officeId: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Aktif liderlik yaptığınız takım bulunamadı.');
    }

    const memberUserIds = team.members.map((member) => member.userId);
    const portfolioWhere = {
      project: {
        ownerId: { in: memberUserIds },
      },
    };

    const [
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
      missingPhotoCount,
      missingDocumentCount,
      missingLocationCount,
    ] = await Promise.all([
      this.prisma.unit.count({ where: portfolioWhere }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          approvalStatus: {
            in: [PortfolioApprovalStatus.ONAYLANDI, PortfolioApprovalStatus.HAVUZDA],
          },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          isPoolVisible: true,
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          images: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          authorityDocuments: { none: {} },
        },
      }),
      this.prisma.unit.count({
        where: {
          ...portfolioWhere,
          project: {
            ownerId: { in: memberUserIds },
            OR: [{ latitude: null }, { longitude: null }],
          },
        },
      }),
    ]);

    const memberCount = team.members.length;
    const performanceScore = this.calculatePerformanceScore({
      memberCount,
      portfolioCount,
      authorizedPortfolioCount,
      poolPortfolioCount,
    });

    return {
      team: {
        id: team.id,
        name: team.name,
        office: team.office,
        leader: team.leader,
      },
      kpi: {
        memberCount,
        portfolioCount,
        authorizedPortfolioCount,
        poolPortfolioCount,
        kontorUsageCount: 0,
        performanceScore,
      },
      quality: {
        missingPhotoCount,
        missingDocumentCount,
        missingLocationCount,
        unauthorizedPortfolioCount: Math.max(0, portfolioCount - authorizedPortfolioCount),
      },
      members: team.members.map((member) => ({
        id: member.id,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
    };
  }
}
